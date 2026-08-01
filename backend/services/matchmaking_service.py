import asyncio
from typing import Dict, List, Optional, Set
from datetime import datetime, timedelta
from collections import defaultdict
from backend.models.schemas import (
    Player, Team, GameState, GameFormat, GameStatus,
    PlayerType, PlayerRole, MatchmakingRequest, MatchmakingResponse,
    LobbyInfo
)
from backend.services.ai_player_service import AIPlayerService
from backend.utils.logger import LoggerFactory

logger = LoggerFactory.get_logger(__name__)

class MatchmakingService:
    """
    Manages player matchmaking, lobby creation, and AI player filling.
    Implements a queue-based matchmaking system with timeout and AI fallback.
    """
    
    def __init__(self):
        self.waiting_players: List[Dict] = []
        self.active_games: Dict[str, GameState] = {}
        self.lobbies: Dict[str, GameState] = {}
        self.player_game_map: Dict[str, str] = {}  # player_id -> game_id
        self.ai_service = AIPlayerService()
        self.team_names = [
            "Mumbai Indians", "Chennai Super Kings", "Royal Challengers",
            "Kolkata Knight Riders", "Delhi Capitals", "Rajasthan Royals",
            "Sunrisers Hyderabad", "Punjab Kings", "Lucknow Super Giants",
            "Gujarat Titans"
        ]
        self.used_team_names: Set[str] = set()
        self.matchmaking_lock = asyncio.Lock()
        
    def _get_unique_team_name(self) -> str:
        """Generate unique team name."""
        available = [n for n in self.team_names if n not in self.used_team_names]
        if not available:
            # Reset if all used
            self.used_team_names.clear()
            available = self.team_names
        
        name = available[0]
        self.used_team_names.add(name)
        return name
    
    async def add_player_to_queue(self, request: MatchmakingRequest) -> MatchmakingResponse:
        """Add a player to the matchmaking queue."""
        async with self.matchmaking_lock:
            # Check if player is already in a game
            if request.session_id and request.session_id in self.player_game_map:
                game_id = self.player_game_map[request.session_id]
                return MatchmakingResponse(
                    status="already_in_game",
                    game_id=game_id,
                    message="You are already in a game"
                )
            
            # Create player object
            player = Player(
                name=request.player_name,
                role=request.preferred_role or PlayerRole.BATSMAN,
                session_id=request.session_id,
                is_ready=True
            )
            
            # Add to waiting queue with metadata
            self.waiting_players.append({
                "player": player,
                "joined_at": datetime.utcnow(),
                "preferred_team": request.team_preference
            })
            
            logger.info(f"Player {player.name} joined matchmaking queue")
            
            # Try to form a match immediately
            match_result = await self._try_form_match()
            
            if match_result:
                return match_result
            
            return MatchmakingResponse(
                status="waiting",
                message=f"Waiting for opponents. Position in queue: {len(self.waiting_players)}",
                wait_time=0
            )
    
    async def _try_form_match(self) -> Optional[MatchmakingResponse]:
        """Attempt to form a match from waiting players."""
        if len(self.waiting_players) < 2:
            return None
        
        # Sort by wait time (oldest first)
        self.waiting_players.sort(key=lambda x: x["joined_at"])
        
        # Take first two players for opposing teams
        player1_data = self.waiting_players.pop(0)
        player2_data = self.waiting_players.pop(0)
        
        player1 = player1_data["player"]
        player2 = player2_data["player"]
        
        # Create teams
        team1 = Team(
            name=self._get_unique_team_name(),
            players=[player1]
        )
        team2 = Team(
            name=self._get_unique_team_name(),
            players=[player2]
        )
        
        # Create game state
        game_state = GameState(
            format=GameFormat.T20,  # Default format
            status=GameStatus.WAITING_FOR_PLAYERS,
            team1=team1,
            team2=team2,
            max_overs=20
        )
        
        self.lobbies[game_state.game_id] = game_state
        self.player_game_map[player1.id] = game_state.game_id
        self.player_game_map[player2.id] = game_state.game_id
        
        # Schedule AI player filling after timeout
        asyncio.create_task(self._schedule_ai_fill(game_state.game_id))
        
        logger.info(f"Match formed: {team1.name} vs {team2.name} (Game ID: {game_state.game_id})")
        
        return MatchmakingResponse(
            status="matched",
            game_id=game_state.game_id,
            team_id=team1.id if player1.id == player1_data["player"].id else team2.id,
            player_id=player1.id,
            message="Match found! Waiting for more players to join..."
        )
    
    async def _schedule_ai_fill(self, game_id: str):
        """Schedule AI players to fill teams after a timeout."""
        await asyncio.sleep(30)  # Wait 30 seconds for more players
        
        if game_id in self.lobbies:
            game_state = self.lobbies[game_id]
            
            # Check if teams need AI fillers
            team1_needs = 11 - len(game_state.team1.players)
            team2_needs = 11 - len(game_state.team2.players)
            
            if team1_needs > 0:
                existing_roles = [p.role for p in game_state.team1.players]
                ai_players = self.ai_service.create_team_fillers(team1_needs, existing_roles)
                game_state.team1.players.extend(ai_players)
                logger.info(f"Added {len(ai_players)} AI players to {game_state.team1.name}")
            
            if team2_needs > 0:
                existing_roles = [p.role for p in game_state.team2.players]
                ai_players = self.ai_service.create_team_fillers(team2_needs, existing_roles)
                game_state.team2.players.extend(ai_players)
                logger.info(f"Added {len(ai_players)} AI players to {game_state.team2.name}")
            
            # If minimum players met, start the game
            if (game_state.team1.real_player_count >= 1 and 
                game_state.team2.real_player_count >= 1):
                await self.start_game(game_id)
    
    async def join_game(self, game_id: str, player: Player) -> MatchmakingResponse:
        """Join an existing game lobby."""
        if game_id not in self.lobbies:
            return MatchmakingResponse(
                status="error",
                message="Game not found"
            )
        
        game_state = self.lobbies[game_id]
        
        # Assign to team with fewer players
        target_team = game_state.team1 if len(game_state.team1.players) <= len(game_state.team2.players) else game_state.team2
        
        if len(target_team.players) >= 11:
            return MatchmakingResponse(
                status="error",
                message="Teams are full"
            )
        
        target_team.players.append(player)
        self.player_game_map[player.id] = game_id
        
        # Check if we have enough players to start
        if game_state.team1.real_player_count >= 1 and game_state.team2.real_player_count >= 1:
            if len(game_state.team1.players) == 11 and len(game_state.team2.players) == 11:
                await self.start_game(game_id)
        
        return MatchmakingResponse(
            status="joined",
            game_id=game_id,
            team_id=target_team.id,
            player_id=player.id,
            message=f"Joined {target_team.name}"
        )
    
    async def start_game(self, game_id: str) -> None:
        """Start a game and move it from lobby to active."""
        if game_id in self.lobbies:
            game_state = self.lobbies[game_id]
            game_state.status = GameStatus.IN_PROGRESS
            game_state.started_at = datetime.utcnow()
            self.active_games[game_id] = game_state
            del self.lobbies[game_id]
            logger.info(f"Game {game_id} started: {game_state.team1.name} vs {game_state.team2.name}")
    
    def get_lobby_info(self, game_id: str) -> Optional[LobbyInfo]:
        """Get information about a lobby."""
        if game_id in self.lobbies:
            game = self.lobbies[game_id]
            return LobbyInfo(
                game_id=game.id,
                team1_name=game.team1.name,
                team2_name=game.team2.name,
                team1_players=len(game.team1.players),
                team2_players=len(game.team2.players),
                team1_human_count=game.team1.real_player_count,
                team2_human_count=game.team2.real_player_count,
                status=game.status,
                players_needed=22 - len(game.team1.players) - len(game.team2.players),
                ai_players_added=game.team1.ai_player_count + game.team2.ai_player_count
            )
        return None
    
    def get_game_state(self, game_id: str) -> Optional[GameState]:
        """Get active game state."""
        return self.active_games.get(game_id) or self.lobbies.get(game_id)

# Create singleton instance
matchmaking_service = MatchmakingService()