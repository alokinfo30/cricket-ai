"""
Complete Data Models for Cricket 3D Game
Implements Pydantic models with validation
"""

from pydantic import BaseModel, Field, validator, conint, confloat
from typing import List, Optional, Dict, Any, Literal, Union
from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4
import random

# ==================== Enums ====================

class PlayerType(str, Enum):
    HUMAN = "human"
    AI = "ai"
    SPECTATOR = "spectator"

class PlayerRole(str, Enum):
    BATSMAN = "batsman"
    BOWLER = "bowler"
    ALL_ROUNDER = "all-rounder"
    WICKET_KEEPER = "wicket-keeper"

class GameFormat(str, Enum):
    SUPER_OVER = "super_over"
    T10 = "t10"
    T20 = "t20"
    ODI = "odi"
    TEST = "test"

class GameStatus(str, Enum):
    LOBBY = "lobby"
    TOSS = "toss"
    IN_PROGRESS = "in_progress"
    INNINGS_BREAK = "innings_break"
    FINISHED = "finished"
    CANCELLED = "cancelled"

class DeliveryType(str, Enum):
    FAST = "fast"
    YORKER = "yorker"
    BOUNCER = "bouncer"
    SLOWER = "slower"
    OFF_SPIN = "off_spin"
    LEG_SPIN = "leg_spin"
    GOOGLY = "googly"
    DOOSRA = "doosra"
    KNUCKLE = "knuckle"
    SLOWER_BOUNCER = "slower_bouncer"

class ShotType(str, Enum):
    DEFEND = "defend"
    DRIVE = "drive"
    PULL = "pull"
    CUT = "cut"
    SLOG = "slog"
    LOFT = "loft"
    SWEEP = "sweep"
    REVERSE = "reverse"
    HOOK = "hook"
    GLANCE = "glance"

class FieldPosition(str, Enum):
    SLIP = "slip"
    GULLY = "gully"
    POINT = "point"
    COVER = "cover"
    MID_OFF = "mid_off"
    MID_ON = "mid_on"
    MID_WICKET = "mid_wicket"
    SQUARE_LEG = "square_leg"
    FINE_LEG = "fine_leg"
    THIRD_MAN = "third_man"
    LONG_OFF = "long_off"
    LONG_ON = "long_on"
    DEEP_COVER = "deep_cover"
    DEEP_MIDWICKET = "deep_midwicket"
    DEEP_SQUARE = "deep_square"
    DEEP_FINE = "deep_fine"

# ==================== 3D Related Models ====================

class Vector3D(BaseModel):
    """3D Vector for physics calculations"""
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    
    def to_dict(self) -> Dict[str, float]:
        return {"x": self.x, "y": self.y, "z": self.z}
    
    def magnitude(self) -> float:
        return (self.x**2 + self.y**2 + self.z**2) ** 0.5
    
    def normalize(self):
        mag = self.magnitude()
        if mag > 0:
            return Vector3D(x=self.x/mag, y=self.y/mag, z=self.z/mag)
        return self

class Quaternion(BaseModel):
    """Rotation in 3D space"""
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    w: float = 1.0

class Transform3D(BaseModel):
    """Position, Rotation, Scale for 3D objects"""
    position: Vector3D = Field(default_factory=Vector3D)
    rotation: Quaternion = Field(default_factory=Quaternion)
    scale: Vector3D = Field(default_factory=lambda: Vector3D(x=1, y=1, z=1))

# ==================== Player Models ====================

class PlayerStats(BaseModel):
    """Player statistics"""
    matches: int = 0
    innings: int = 0
    runs: int = 0
    balls_faced: int = 0
    fours: int = 0
    sixes: int = 0
    highest_score: int = 0
    average: float = 0.0
    strike_rate: float = 0.0
    
    wickets: int = 0
    balls_bowled: int = 0
    runs_conceded: int = 0
    best_bowling: str = "0/0"
    economy: float = 0.0
    bowling_average: float = 0.0
    
    catches: int = 0
    stumpings: int = 0

class PlayerAppearance(BaseModel):
    """Player 3D appearance customization"""
    skin_color: str = "#E0AC69"
    hair_style: str = "short"
    hair_color: str = "#000000"
    height: float = 1.8  # meters
    build: Literal["slim", "athletic", "heavy"] = "athletic"
    jersey_number: int = Field(default_factory=lambda: random.randint(1, 99))
    batting_gloves_color: str = "#FFFFFF"
    bat_type: str = "standard"

class Player(BaseModel):
    """Player model"""
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    type: PlayerType = PlayerType.HUMAN
    role: PlayerRole
    team_id: Optional[str] = None
    stats: PlayerStats = Field(default_factory=PlayerStats)
    appearance: PlayerAppearance = Field(default_factory=PlayerAppearance)
    transform: Transform3D = Field(default_factory=Transform3D)
    session_id: Optional[str] = None
    socket_id: Optional[str] = None
    is_ready: bool = False
    is_captain: bool = False
    is_batting: bool = False
    is_bowling: bool = False
    current_animation: str = "idle"
    
    # Live match stats
    match_runs: int = 0
    match_balls_faced: int = 0
    match_wickets: int = 0
    match_overs_bowled: float = 0.0
    match_runs_conceded: int = 0

class AIAgentConfig(BaseModel):
    """Configuration for an AI agent's behavior."""
    aggression: conint(ge=0, le=100) = 50
    skill_level: conint(ge=0, le=100) = 50
    risk_appetite: conint(ge=0, le=100) = 50
    preferred_role: PlayerRole

class AIPlayer(Player):
    """AI Player with behavior configuration"""
    type: PlayerType = PlayerType.AI
    agent_config: AIAgentConfig
    preferred_shots: List[ShotType] = Field(default_factory=lambda: [ShotType.DRIVE])
    preferred_deliveries: List[DeliveryType] = Field(default_factory=lambda: [DeliveryType.FAST])

# ==================== Team Models ====================

class Team(BaseModel):
    """Cricket team"""
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    short_name: str = ""
    players: List[Player] = Field(default_factory=list)
    captain_id: Optional[str] = None
    color_primary: str = "#1a237e"
    color_secondary: str = "#ffd700"
    logo_url: Optional[str] = None
    
    @property
    def human_players(self) -> List[Player]:
        return [p for p in self.players if p.type == PlayerType.HUMAN]
    
    @property
    def ai_players(self) -> List[Player]:
        return [p for p in self.players if p.type == PlayerType.AI]
    
    @property
    def real_player_count(self) -> int:
        return len(self.human_players)

    @property
    def ai_player_count(self) -> int:
        return len(self.ai_players)

    @property
    def playing_xi(self) -> List[Player]:
        return self.players[:11]

# ==================== Match Models ====================

class BallEvent(BaseModel):
    """Single ball event"""
    ball_number: int
    over_number: int
    innings: int
    batsman_id: str
    bowler_id: str
    delivery_type: DeliveryType
    shot_type: Optional[ShotType] = None
    runs: int = 0
    extras: int = 0
    extras_type: Optional[str] = None
    wicket: bool = False
    wicket_type: Optional[str] = None
    dismissed_player_id: Optional[str] = None
    commentary: str = ""
    
    # 3D data for replay
    ball_trajectory: List[Vector3D] = Field(default_factory=list)
    ball_speed: float = 0.0
    impact_point: Optional[Vector3D] = None
    
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class OverSummary(BaseModel):
    """Over summary"""
    over_number: int
    balls: List[BallEvent] = Field(default_factory=list)
    runs: int = 0
    wickets: int = 0
    extras: int = 0

class InningsScore(BaseModel):
    """Innings score"""
    innings_number: int
    runs: int = 0
    wickets: int = 0
    overs: float = 0.0
    balls_bowled: int = 0
    extras: int = 0
    byes: int = 0
    leg_byes: int = 0
    wides: int = 0
    no_balls: int = 0
    fours: int = 0
    sixes: int = 0
    overs_list: List[OverSummary] = Field(default_factory=list)
    fall_of_wickets: List[Dict[str, Any]] = Field(default_factory=list)
    batting_card: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    bowling_card: Dict[str, Dict[str, Any]] = Field(default_factory=dict)

class FieldSetup(BaseModel):
    """Field placements for 3D rendering"""
    positions: Dict[str, Vector3D] = Field(default_factory=dict)
    aggression: int = 50

class MatchState3D(BaseModel):
    """Complete 3D match state for synchronization"""
    match_id: str
    ball_position: Vector3D = Field(default_factory=Vector3D)
    ball_velocity: Vector3D = Field(default_factory=Vector3D)
    batsman_transform: Transform3D = Field(default_factory=Transform3D)
    bowler_transform: Transform3D = Field(default_factory=Transform3D)
    fielders_transforms: Dict[str, Transform3D] = Field(default_factory=dict)
    stumps_state: List[bool] = [True, True, True]  # All stumps up
    ball_in_play: bool = False
    current_animation: str = "idle"
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class GameState(BaseModel):
    """Complete game state"""
    game_id: str = Field(default_factory=lambda: str(uuid4()))
    format: GameFormat = GameFormat.T20
    status: GameStatus = GameStatus.LOBBY
    team1: Team
    team2: Team
    toss_winner: Optional[str] = None
    toss_decision: Optional[Literal["bat", "bowl"]] = None
    batting_team_id: Optional[str] = None
    bowling_team_id: Optional[str] = None
    current_innings: int = 0
    target: Optional[int] = None
    innings1: Optional[InningsScore] = None
    innings2: Optional[InningsScore] = None
    current_batsmen: List[str] = Field(default_factory=list)
    current_bowler_id: Optional[str] = None
    current_non_striker_id: Optional[str] = None
    field_setup: FieldSetup = Field(default_factory=FieldSetup)
    match_state_3d: MatchState3D = Field(default_factory=lambda: MatchState3D(match_id=""))
    events: List[BallEvent] = Field(default_factory=list)
    
    # Game settings
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    pitch_condition: Literal["dry", "green", "dusty", "hard", "damp"] = "hard"
    weather: Literal["sunny", "cloudy", "overcast", "rain"] = "sunny"
    
    # Timings
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    estimated_end: Optional[datetime] = None
    
    # Results
    winner_id: Optional[str] = None
    result_description: Optional[str] = None
    man_of_the_match: Optional[str] = None

# ==================== Request/Response Models ====================

class GameAction(BaseModel):
    """Player action in game"""
    player_id: str
    game_id: str
    action_type: Literal["bowl", "bat", "field_set", "declare", "appeal", "review"]
    
    # Bowling
    delivery_type: Optional[DeliveryType] = None
    delivery_speed: Optional[float] = None
    line_x: Optional[float] = None  # -1 to 1 (off to leg)
    line_y: Optional[float] = None  # 0 to 1 (length: yorker to short)
    
    # Batting
    shot_type: Optional[ShotType] = None
    shot_power: Optional[float] = None  # 0 to 100
    shot_direction: Optional[Vector3D] = None
    
    # Fielding
    field_changes: Optional[Dict[str, Vector3D]] = None

class GameEvent(BaseModel):
    """Game event for WebSocket broadcasting"""
    event_id: str = Field(default_factory=lambda: str(uuid4()))
    event_type: str
    game_id: str
    player_id: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class SyncMessage(BaseModel):
    """Network synchronization message"""
    message_id: str = Field(default_factory=lambda: str(uuid4()))
    game_id: str
    player_id: str
    sequence: int
    state: MatchState3D
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# ==================== API Response Models ====================

class MatchmakingRequest(BaseModel):
    player_name: str
    preferred_role: Optional[PlayerRole] = None
    team_preference: Optional[str] = None
    session_id: Optional[str] = None

class MatchmakingResponse(BaseModel):
    status: str
    message: str
    game_id: Optional[str] = None
    player_id: Optional[str] = None
    team_id: Optional[str] = None

class BallOutcome(BaseModel):
    """Simplified outcome of a ball for AI agents."""
    runs: int
    extras: int
    wicket: bool
    commentary: str

class TacticalDecision(BaseModel):
    """Decision made by an AI captain."""
    aggression_level: conint(ge=0, le=100)
    field_placement: Literal["attacking", "defensive", "balanced"]
    bowling_type: Optional[str] = None
    batting_shot_type: Optional[str] = None
    message_to_user: str
    confidence: Optional[confloat(ge=0, le=1)] = None

class LobbyInfo(BaseModel):
    """Information about a game lobby."""
    game_id: str
    team1_name: str
    team2_name: str
    team1_players: int
    team2_players: int
    team1_human_count: int
    team2_human_count: int
    status: GameStatus
    players_needed: int
    ai_players_added: int

class GameResponse(BaseModel):
    success: bool = True
    game: Optional[GameState] = None
    error: Optional[str] = None
    message: Optional[str] = None

class CommandRequest(BaseModel):
    """Request model for sending a command to the AI captain."""
    game_id: str
    command: str