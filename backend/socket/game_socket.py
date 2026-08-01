from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Any
import asyncio
import json
from datetime import datetime

from backend.socket.connection_manager import connection_manager
from backend.services.matchmaking_service import matchmaking_service
from backend.services.game_service import GameService
from backend.agents.captain_agent import CaptainAgent
from backend.agents.commentator_agent import CommentatorAgent
from backend.utils.logger import setup_logger

logger = setup_logger(__name__)

class GameSocketHandler:
    """
    Handles WebSocket events for real-time game interactions.
    """
    
    def __init__(self):
        self.game_services: Dict[str, GameService] = {}
        self.captain_agent = CaptainAgent()
        self.commentator_agent = CommentatorAgent()
    
    async def handle_connection(self, websocket: WebSocket, player_id: str, game_id: str):
        """Handle a new WebSocket connection for a game."""
        await connection_manager.connect(websocket, player_id, game_id)
        
        # Initialize game service if not exists
        if game_id not in self.game_services:
            game_state = matchmaking_service.get_game_state(game_id)
            if game_state:
                self.game_services[game_id] = GameService()
                self.game_services[game_id].initialize_from_state(game_state)
        
        try:
            while True:
                data = await websocket.receive_json()
                await self.handle_message(player_id, game_id, data)
        except WebSocketDisconnect:
            logger.info(f"Player {player_id} websocket disconnected")
            await connection_manager.disconnect(player_id)
        except Exception as e:
            logger.error(f"Error in websocket for player {player_id}: {e}")
            await connection_manager.disconnect(player_id)
    
    async def handle_message(self, player_id: str, game_id: str, message: Dict[str, Any]):
        """Process incoming WebSocket messages."""
        event_type = message.get("type")
        
        if event_type == "command":
            await self.handle_command(player_id, game_id, message)
        elif event_type == "chat":
            await self.handle_chat(player_id, game_id, message)
        elif event_type == "ready":
            await self.handle_ready(player_id, game_id)
        elif event_type == "simulate_over":
            await self.handle_simulate_over(player_id, game_id, message)
        elif event_type == "get_state":
            await self.send_game_state(player_id, game_id)
    
    async def handle_command(self, player_id: str, game_id: str, message: Dict[str, Any]):
        """Handle tactical command from player."""
        if game_id not in self.game_services:
            return
        
        game_service = self.game_services[game_id]
        command = message.get("command", "")
        
        # Get captain's decision
        game_context = game_service.get_game_context()
        decision = self.captain_agent.decide_tactics(game_context, command)
        
        # Apply decision to game
        game_service.apply_tactical_decision(decision)
        
        # Broadcast decision to all players
        await connection_manager.broadcast_to_game(game_id, {
            "type": "tactical_update",
            "player_id": player_id,
            "decision": decision.model_dump(),
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def handle_chat(self, player_id: str, game_id: str, message: Dict[str, Any]):
        """Handle chat messages between players."""
        chat_message = {
            "type": "chat",
            "sender_id": player_id,
            "message": message.get("message", ""),
            "timestamp": datetime.utcnow().isoformat()
        }
        await connection_manager.broadcast_to_game(game_id, chat_message)
    
    async def handle_ready(self, player_id: str, game_id: str):
        """Handle player ready status."""
        await connection_manager.broadcast_to_game(game_id, {
            "type": "player_ready",
            "player_id": player_id,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def handle_simulate_over(self, player_id: str, game_id: str, message: Dict[str, Any]):
        """Simulate an over and broadcast results."""
        if game_id not in self.game_services:
            return
        
        game_service = self.game_services[game_id]
        
        # Simulate the over
        over_result = game_service.simulate_over()
        
        # Generate enhanced commentary
        for event in over_result.over_events:
            enhanced = self.commentator_agent.generate_commentary(
                game_service.get_game_context(),
                event
            )
            event.commentary = enhanced
        
        # Broadcast each ball and the over summary
        for event in over_result.over_events:
            await connection_manager.broadcast_to_game(game_id, {
                "type": "ball_update",
                "event": event.model_dump(),
                "game_state": game_service.get_state().model_dump(),
                "timestamp": datetime.utcnow().isoformat()
            })
            await asyncio.sleep(0.5)  # Realistic delay
        
        # Send over summary
        await connection_manager.broadcast_to_game(game_id, {
            "type": "over_summary",
            "over_number": over_result.innings_score.overs,
            "runs": over_result.innings_score.runs,
            "wickets": over_result.innings_score.wickets,
            "game_state": over_result.game_state.model_dump() if over_result.game_state else None,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    async def send_game_state(self, player_id: str, game_id: str):
        """Send current game state to a specific player."""
        if game_id in self.game_services:
            state = self.game_services[game_id].get_state()
            if state:
                await connection_manager.send_to_player(player_id, {
                    "type": "game_state",
                    "state": state.model_dump(),
                    "timestamp": datetime.utcnow().isoformat()
                })

# Create singleton instance
game_socket_handler = GameSocketHandler()