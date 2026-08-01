from typing import Dict, Set, Any, Optional
from fastapi import WebSocket
from datetime import datetime
import json
import asyncio
from backend.utils.logger import setup_logger

logger = setup_logger(__name__)

class ConnectionManager:
    """
    Manages WebSocket connections for real-time game communication.
    Implements room-based messaging for game lobbies.
    """
    
    def __init__(self):
        # game_id -> {player_id: WebSocket}
        self.game_connections: Dict[str, Dict[str, WebSocket]] = {}
        # player_id -> WebSocket (for direct messaging)
        self.player_connections: Dict[str, WebSocket] = {}
        # player_id -> game_id mapping
        self.player_game_map: Dict[str, str] = {}
        
    async def connect(self, websocket: WebSocket, player_id: str, game_id: str) -> None:
        """Connect a player to a game room."""
        await websocket.accept()
        
        # Initialize game room if not exists
        if game_id not in self.game_connections:
            self.game_connections[game_id] = {}
        
        # Store connections
        self.game_connections[game_id][player_id] = websocket
        self.player_connections[player_id] = websocket
        self.player_game_map[player_id] = game_id
        
        logger.info(f"Player {player_id} connected to game {game_id}")
        
        # Notify others in the room
        await self.broadcast_to_game(
            game_id,
            {
                "event": "player_joined",
                "player_id": player_id,
                "timestamp": datetime.utcnow().isoformat()
            },
            exclude=player_id
        )
    
    async def disconnect(self, player_id: str) -> None:
        """Disconnect a player from their game."""
        game_id = self.player_game_map.get(player_id)
        
        if game_id and game_id in self.game_connections:
            if player_id in self.game_connections[game_id]:
                del self.game_connections[game_id][player_id]
                logger.info(f"Player {player_id} disconnected from game {game_id}")
                
                # Notify others
                await self.broadcast_to_game(
                    game_id,
                    {
                        "event": "player_left",
                        "player_id": player_id,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )
                
                # Clean up empty rooms
                if not self.game_connections[game_id]:
                    del self.game_connections[game_id]
        
        if player_id in self.player_connections:
            del self.player_connections[player_id]
        
        if player_id in self.player_game_map:
            del self.player_game_map[player_id]
    
    async def broadcast_to_game(
        self, 
        game_id: str, 
        message: Dict[str, Any], 
        exclude: Optional[str] = None
    ) -> None:
        """Broadcast a message to all players in a game."""
        if game_id not in self.game_connections:
            return
        
        disconnected = []
        for player_id, websocket in self.game_connections[game_id].items():
            if player_id == exclude:
                continue
            
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send message to player {player_id}: {e}")
                disconnected.append(player_id)
        
        # Clean up disconnected players
        for player_id in disconnected:
            await self.disconnect(player_id)
    
    async def send_to_player(self, player_id: str, message: Dict[str, Any]) -> bool:
        """Send a message to a specific player."""
        if player_id in self.player_connections:
            try:
                await self.player_connections[player_id].send_json(message)
                return True
            except Exception as e:
                logger.error(f"Failed to send message to player {player_id}: {e}")
                await self.disconnect(player_id)
        return False
    
    def get_connected_players(self, game_id: str) -> Set[str]:
        """Get set of connected player IDs for a game."""
        return set(self.game_connections.get(game_id, {}).keys())
    
    def get_player_count(self, game_id: str) -> int:
        """Get number of connected players in a game."""
        return len(self.game_connections.get(game_id, {}))

# Create singleton instance
connection_manager = ConnectionManager()