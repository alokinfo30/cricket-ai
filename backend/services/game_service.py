"""
Core Game Service - Complete Cricket Simulation Engine
Implements realistic cricket mechanics, physics, and game logic
"""

import random
import math
from typing import Optional, Dict, List, Tuple, Any
from datetime import datetime, timedelta
from collections import defaultdict
import asyncio

from backend.models.schemas import (
    GameState, Team, Player, BallEvent, OverSummary, InningsScore,
    FieldSetup, MatchState3D, Vector3D, Transform3D, Quaternion,
    GameStatus, GameFormat, DeliveryType, ShotType, PlayerType,
    GameEvent
)
from backend.utils.logger import LoggerFactory

logger = LoggerFactory.get_logger("game_service")

class PhysicsEngine:
    """Advanced cricket ball physics engine"""
    
    GRAVITY = 9.81
    AIR_DENSITY = 1.225
    BALL_MASS = 0.1559  # kg
    BALL_RADIUS = 0.0359  # m
    DRAG_COEFFICIENT = 0.3
    MAGNUS_COEFFICIENT = 0.2
    
    @classmethod
    def calculate_trajectory(
        cls,
        initial_position: Vector3D,
        initial_velocity: Vector3D,
        angular_velocity: Vector3D,
        wind: Vector3D,
        time_step: float = 0.016,  # 60 FPS
        max_time: float = 5.0
    ) -> List[Vector3D]:
        """
        Calculate ball trajectory using physics simulation
        Includes gravity, drag, Magnus effect, and wind
        """
        trajectory = []
        position = initial_position
        velocity = initial_velocity
        time = 0.0
        
        while time < max_time:
            # Gravity
            gravity_force = Vector3D(x=0, y=-cls.GRAVITY * cls.BALL_MASS, z=0)
            
            # Air drag
            speed = velocity.magnitude()
            if speed > 0:
                drag_force_magnitude = 0.5 * cls.AIR_DENSITY * speed**2 * \
                                      cls.DRAG_COEFFICIENT * math.pi * cls.BALL_RADIUS**2
                drag_force = velocity.normalize()
                drag_force = Vector3D(
                    x=-drag_force.x * drag_force_magnitude,
                    y=-drag_force.y * drag_force_magnitude,
                    z=-drag_force.z * drag_force_magnitude
                )
            else:
                drag_force = Vector3D()
            
            # Magnus effect (spin)
            if angular_velocity.magnitude() > 0 and speed > 0:
                magnus_force_magnitude = cls.MAGNUS_COEFFICIENT * speed * \
                                        angular_velocity.magnitude() * cls.BALL_MASS
                # Cross product of spin and velocity
                magnus_direction = Vector3D(
                    x=angular_velocity.y * velocity.z - angular_velocity.z * velocity.y,
                    y=angular_velocity.z * velocity.x - angular_velocity.x * velocity.z,
                    z=angular_velocity.x * velocity.y - angular_velocity.y * velocity.x
                )
                if magnus_direction.magnitude() > 0:
                    magnus_direction = magnus_direction.normalize()
                    magnus_force = Vector3D(
                        x=magnus_direction.x * magnus_force_magnitude,
                        y=magnus_direction.y * magnus_force_magnitude,
                        z=magnus_direction.z * magnus_force_magnitude
                    )
                else:
                    magnus_force = Vector3D()
            else:
                magnus_force = Vector3D()
            
            # Wind force
            wind_force = Vector3D(
                x=wind.x * 0.1,
                y=wind.y * 0.1,
                z=wind.z * 0.1
            )
            
            # Net force and acceleration
            net_force = Vector3D(
                x=gravity_force.x + drag_force.x + magnus_force.x + wind_force.x,
                y=gravity_force.y + drag_force.y + magnus_force.y + wind_force.y,
                z=gravity_force.z + drag_force.z + magnus_force.z + wind_force.z
            )
            
            acceleration = Vector3D(
                x=net_force.x / cls.BALL_MASS,
                y=net_force.y / cls.BALL_MASS,
                z=net_force.z / cls.BALL_MASS
            )
            
            # Update velocity and position (Euler integration)
            velocity = Vector3D(
                x=velocity.x + acceleration.x * time_step,
                y=velocity.y + acceleration.y * time_step,
                z=velocity.z + acceleration.z * time_step
            )
            
            position = Vector3D(
                x=position.x + velocity.x * time_step,
                y=position.y + velocity.y * time_step,
                z=position.z + velocity.z * time_step
            )
            
            trajectory.append(position)
            
            # Ground collision
            if position.y <= 0:
                # Bounce physics
                position.y = 0
                velocity.y = -velocity.y * 0.5  # Coefficient of restitution
                velocity.x *= 0.8  # Friction
                velocity.z *= 0.8
                
                if abs(velocity.y) < 0.1:
                    break
            
            time += time_step
            
            # Stop if ball goes too far
            if position.magnitude() > 200:
                break        
        return trajectory

class BallSimulator:
    """Individual ball simulation"""
    
    def __init__(self):
        self.physics = PhysicsEngine()
    
    def simulate_delivery(
        self,
        delivery_type: DeliveryType,
        bowler_skill: int,
        pitch_condition: str,
        weather: str
    ) -> Tuple[Vector3D, Vector3D, Vector3D]:
        """
        Simulate a delivery and return initial conditions
        """
        # Base speed based on delivery type (km/h to m/s)
        speed_map = {
            DeliveryType.FAST: random.uniform(135, 155),
            DeliveryType.YORKER: random.uniform(130, 145),
            DeliveryType.BOUNCER: random.uniform(125, 140),
            DeliveryType.SLOWER: random.uniform(95, 115),
            DeliveryType.OFF_SPIN: random.uniform(75, 95),
            DeliveryType.LEG_SPIN: random.uniform(75, 95),
            DeliveryType.GOOGLY: random.uniform(75, 95),
            DeliveryType.DOOSRA: random.uniform(75, 95),
            DeliveryType.KNUCKLE: random.uniform(100, 120),
            DeliveryType.SLOWER_BOUNCER: random.uniform(100, 115),
        }
        
        speed_kmh = speed_map.get(delivery_type, 120)
        speed_ms = speed_kmh * (1000 / 3600)
        
        # Adjust for bowler skill
        speed_ms *= 0.8 + (bowler_skill / 100) * 0.4
        
        # Initial position (bowler's release point)
        position = Vector3D(x=random.uniform(-0.2, 0.2), y=2.0, z=20.0)
        
        # Velocity direction
        line = random.uniform(-1, 1)  # Off stump to leg stump
        length = random.uniform(0.1, 1.0)  # Yorker to short
        
        # Adjust for delivery type
        if delivery_type == DeliveryType.YORKER:
            length = 0.1
        elif delivery_type == DeliveryType.BOUNCER:
            length = 0.8
        
        # Calculate velocity components
        vz = -speed_ms * math.cos(math.radians(10))  # Forward (towards batsman)
        vx = speed_ms * line * 0.1  # Lateral movement
        vy = speed_ms * math.sin(math.radians(10)) * (1 - length)  # Vertical
        
        velocity = Vector3D(x=vx, y=vy, z=vz)
        
        # Spin (angular velocity)
        spin_map = {
            DeliveryType.OFF_SPIN: Vector3D(x=0, y=20, z=0),
            DeliveryType.LEG_SPIN: Vector3D(x=0, y=-20, z=0),
            DeliveryType.GOOGLY: Vector3D(x=0, y=-15, z=10),
            DeliveryType.DOOSRA: Vector3D(x=0, y=15, z=-10),
            DeliveryType.FAST: Vector3D(x=0, y=0, z=random.uniform(-5, 5)),
        }
        
        spin = spin_map.get(delivery_type, Vector3D())
        
        return position, velocity, spin
    
    def simulate_shot(
        self,
        shot_type: ShotType,
        batsman_skill: int,
        shot_power: float,
        ball_velocity: Vector3D,
        impact_point: Vector3D
    ) -> Vector3D:
        """
        Calculate ball velocity after bat impact
        """
        base_power = shot_power / 100.0
        
        # Shot direction multipliers
        direction_map = {
            ShotType.DEFEND: Vector3D(x=0, y=0.1, z=-0.3),
            ShotType.DRIVE: Vector3D(x=0.3, y=0.2, z=-1),
            ShotType.PULL: Vector3D(x=-0.8, y=0.3, z=-0.5),
            ShotType.CUT: Vector3D(x=0.8, y=0.1, z=-0.4),
            ShotType.SLOG: Vector3D(x=0, y=0.5, z=-0.7),
            ShotType.LOFT: Vector3D(x=0, y=0.6, z=-0.6),
            ShotType.SWEEP: Vector3D(x=-0.7, y=0.1, z=-0.6),
            ShotType.REVERSE: Vector3D(x=0.7, y=0.2, z=-0.5),
            ShotType.HOOK: Vector3D(x=-0.5, y=0.4, z=-0.6),
            ShotType.GLANCE: Vector3D(x=-0.3, y=0.1, z=-0.8),
        }
        
        direction = direction_map.get(shot_type, Vector3D(x=0, y=0.3, z=-0.7))
        
        # Power calculation
        speed = 25 * base_power * (0.7 + (batsman_skill / 100) * 0.6)
        
        # Add incoming ball speed (deflection)
        incoming_speed = ball_velocity.magnitude()
        speed += incoming_speed * 0.3
        
        # Calculate final velocity
        magnitude = math.sqrt(direction.x**2 + direction.y**2 + direction.z**2)
        if magnitude > 0:
            velocity = Vector3D(
                x=direction.x / magnitude * speed,
                y=direction.y / magnitude * speed,
                z=direction.z / magnitude * speed
            )
        else:
            velocity = Vector3D(x=0, y=speed * 0.5, z=-speed * 0.5)
        
        return velocity

class GameService:
    """Complete game service with physics and AI"""
    
    def __init__(self):
        self.games: Dict[str, GameState] = {}
        self.ball_simulator = BallSimulator()
        self.physics = PhysicsEngine()
        self.active_games: Dict[str, asyncio.Task] = {}
    
    async def create_game(
        self,
        team1: Team,
        team2: Team,
        format: GameFormat = GameFormat.T20
    ) -> GameState:
        """Create a new game"""
        game = GameState(
            format=format,
            team1=team1,
            team2=team2,
            status=GameStatus.LOBBY
        )
        
        # Set max overs based on format
        overs_map = {
            GameFormat.SUPER_OVER: 1,
            GameFormat.T10: 10,
            GameFormat.T20: 20,
            GameFormat.ODI: 50,
            GameFormat.TEST: 90,
        }
        
        self.games[game.game_id] = game
        logger.info(f"Game created: {game.game_id} - {team1.name} vs {team2.name}")
        
        return game
    
    async def start_game(self, game_id: str) -> GameState:
        """Start the game after toss"""
        game = self.games.get(game_id)
        if not game:
            raise ValueError(f"Game {game_id} not found")
        
        # Perform toss
        game.toss_winner = random.choice([game.team1.id, game.team2.id])
        game.toss_decision = random.choice(["bat", "bowl"])
        
        # Set batting/bowling teams
        if game.toss_winner == game.team1.id:
            game.batting_team_id = game.team1.id if game.toss_decision == "bat" else game.team2.id
        else:
            game.batting_team_id = game.team2.id if game.toss_decision == "bat" else game.team1.id
        
        game.bowling_team_id = game.team1.id if game.batting_team_id == game.team2.id else game.team2.id
        
        # Initialize innings
        game.current_innings = 1
        game.innings1 = InningsScore(innings_number=1)
        game.status = GameStatus.IN_PROGRESS
        game.started_at = datetime.utcnow()
        
        # Set opening batsmen
        batting_team = self._get_batting_team(game)
        if batting_team and len(batting_team.players) >= 2:
            game.current_batsmen = [batting_team.players[0].id, batting_team.players[1].id]
            game.current_non_striker_id = batting_team.players[1].id
        
        # Set opening bowler
        bowling_team = self._get_bowling_team(game)
        if bowling_team:
            bowlers = [p for p in bowling_team.players if p.role in [PlayerRole.BOWLER, PlayerRole.ALL_ROUNDER]]
            if bowlers:
                game.current_bowler_id = bowlers[0].id
                bowlers[0].is_bowling = True
        
        logger.info(f"Game {game_id} started - {batting_team.name if batting_team else 'Unknown'} batting first")
        return game
    
    async def process_ball(self, game_id: str, action: Any) -> BallEvent:
        """Process a single ball delivery"""
        game = self.games.get(game_id)
        if not game:
            raise ValueError("Game not found")
        
        innings = game.innings1 if game.current_innings == 1 else game.innings2
        if not innings:
            raise ValueError("Innings not initialized")
        
        # Get bowler and batsman
        bowler = self._get_player(game, game.current_bowler_id)
        batsman = self._get_player(game, game.current_batsmen[0])
        
        if not bowler or not batsman:
            raise ValueError("Bowler or batsman not found")
        
        # Simulate delivery
        if hasattr(action, 'delivery_type'):
            delivery_type = action.delivery_type
        else:
            delivery_type = random.choice(list(DeliveryType))
        
        bowler_skill = bowler.match_runs if bowler.type == PlayerType.HUMAN else getattr(bowler, 'skill_level', 50)
        
        position, velocity, spin = self.ball_simulator.simulate_delivery(
            delivery_type,
            bowler_skill,
            game.pitch_condition,
            game.weather
        )
        
        # Calculate trajectory
        wind = Vector3D(x=random.uniform(-1, 1), y=0, z=random.uniform(-1, 1))
        trajectory = self.physics.calculate_trajectory(position, velocity, spin, wind)
        
        # Determine where ball reaches batsman
        impact_point = trajectory[-1] if trajectory else Vector3D(x=0, y=1, z=0)
        
        # Batsman plays shot (or misses)
        if hasattr(action, 'shot_type') and action.shot_type:
            shot_type = action.shot_type
            shot_power = getattr(action, 'shot_power', 50)
            batsman_skill = batsman.match_runs if batsman.type == PlayerType.HUMAN else getattr(batsman, 'skill_level', 50)
            
            hit_velocity = self.ball_simulator.simulate_shot(
                shot_type,
                batsman_skill,
                shot_power,
                velocity,
                impact_point
            )
        else:
            # AI or missed shot
            hit_velocity = Vector3D(x=0, y=0, z=0)
        
        # Calculate result
        result = self._calculate_result(
            game, batsman, bowler, innings,
            delivery_type, hit_velocity, impact_point
        )
        
        # Create ball event
        ball_number = innings.balls_bowled + 1
        over_number = ball_number // 6 + (1 if ball_number % 6 != 0 else 0)
        
        event = BallEvent(
            ball_number=ball_number,
            over_number=over_number,
            innings=game.current_innings,
            batsman_id=batsman.id,
            bowler_id=bowler.id,
            delivery_type=delivery_type,
            shot_type=action.shot_type if hasattr(action, 'shot_type') else None,
            runs=result['runs'],
            extras=result.get('extras', 0),
            extras_type=result.get('extras_type'),
            wicket=result.get('wicket', False),
            wicket_type=result.get('wicket_type'),
            commentary=result['commentary'],
            ball_trajectory=trajectory,
            ball_speed=velocity.magnitude(),
            impact_point=impact_point
        )
        
        # Update game state
        await self._update_game_state(game, innings, event, result)
        
        game.events.append(event)
        game.updated_at = datetime.utcnow()
        
        return event
    
    def _calculate_result(
        self,
        game: GameState,
        batsman: Player,
        bowler: Player,
        innings: InningsScore,
        delivery_type: DeliveryType,
        hit_velocity: Vector3D,
        impact_point: Vector3D
    ) -> Dict[str, Any]:
        """Calculate the result of a delivery"""
        
        # Check for no-ball or wide
        if impact_point.x > 1.5 or impact_point.x < -1.5:
            return {
                'runs': 1,
                'extras': 1,
                'extras_type': 'wide',
                'wicket': False,
                'commentary': "Wide ball! Called by the umpire."
            }
        
        if impact_point.y > 1.5 and random.random() < 0.05:
            return {
                'runs': 1,
                'extras': 1,
                'extras_type': 'no_ball',
                'wicket': False,
                'commentary': "No ball! Overstepping!"
            }
        
        speed = hit_velocity.magnitude()
        
        # Determine runs
        if speed < 5:
            runs = 0
            commentary = "Played and missed! Dot ball."
        elif speed < 15:
            runs = 1
            commentary = "Pushed into the gap for a single."
        elif speed < 20:
            runs = 2
            commentary = "Excellent running between the wickets, two runs!"
        elif speed < 25:
            if hit_velocity.y > 0.4:
                runs = 6
                commentary = "SIX! That's gone all the way!"
            else:
                runs = 4
                commentary = "FOUR! Raced away to the boundary!"
        else:
            if hit_velocity.y > 0.5:
                runs = 6
                commentary = "MASSIVE SIX! Out of the stadium!"
            else:
                runs = 4
                commentary = "CRACKING SHOT! Four runs!"
        
        # Check for wicket
        wicket = False
        wicket_type = None
        
        # Edge probability
        edge_chance = 0.1 if speed > 20 else 0.02
        if random.random() < edge_chance:
            wicket = True
            wicket_type = random.choice(['caught', 'bowled', 'lbw', 'stumped'])
            
            if wicket_type == 'caught':
                commentary = f"EDGED AND TAKEN! {batsman.name} is caught!"
            elif wicket_type == 'bowled':
                commentary = f"BOWLED HIM! {batsman.name} is clean bowled!"
            elif wicket_type == 'lbw':
                commentary = f"LBW! {batsman.name} is trapped in front!"
            else:
                commentary = f"STUMPED! {batsman.name} is out of the crease!"
        
        return {
            'runs': runs,
            'extras': 0,
            'wicket': wicket,
            'wicket_type': wicket_type,
            'commentary': commentary
        }
    
    async def _update_game_state(
        self,
        game: GameState,
        innings: InningsScore,
        event: BallEvent,
        result: Dict[str, Any]
    ):
        """Update game state after each ball"""
        
        # Update innings score
        innings.balls_bowled += 1
        innings.runs += result['runs'] + result.get('extras', 0)
        innings.extras += result.get('extras', 0)
        
        if result['runs'] == 4:
            innings.fours += 1
        elif result['runs'] == 6:
            innings.sixes += 1
        
        # Calculate overs
        innings.overs = innings.balls_bowled // 6 + (innings.balls_bowled % 6) / 10
        
        # Update batsman stats
        batsman = self._get_player(game, event.batsman_id)
        if batsman:
            batsman.match_balls_faced += 1
            batsman.match_runs += result['runs']
        
        # Update bowler stats
        bowler = self._get_player(game, event.bowler_id)
        if bowler:
            bowler.match_runs_conceded += result['runs'] + result.get('extras', 0)
            if result['runs'] == 0 and not result.get('extras'):
                bowler.match_overs_bowled += 1/6  # Dot ball
        
        # Handle wicket
        if result.get('wicket'):
            innings.wickets += 1
            bowler.match_wickets += 1
            
            # Rotate batsmen
            if len(game.current_batsmen) > 0:
                game.current_batsmen.pop(0)
                
                # Bring in next batsman
                batting_team = self._get_batting_team(game)
                if batting_team:
                    next_batsman_idx = innings.wickets + 1  # +1 for opener
                    if next_batsman_idx < len(batting_team.players):
                        game.current_batsmen.append(batting_team.players[next_batsman_idx].id)
        
        # Rotate strike on odd runs
        elif result['runs'] % 2 == 1 and len(game.current_batsmen) >= 2:
            game.current_batsmen.reverse()
            game.current_non_striker_id = game.current_batsmen[1]
        
        # Change bowler after over
        if innings.balls_bowled % 6 == 0:
            await self._rotate_bowler(game)
        
        # Check innings complete
        max_balls = game.max_overs * 6 if hasattr(game, 'max_overs') else 120
        
        if innings.wickets >= 10 or innings.balls_bowled >= max_balls:
            if game.current_innings == 1:
                # End of first innings
                game.target = innings.runs + 1
                game.current_innings = 2
                game.innings2 = InningsScore(innings_number=2)
                game.status = GameStatus.INNINGS_BREAK
                
                # Swap batting/bowling
                game.batting_team_id, game.bowling_team_id = game.bowling_team_id, game.batting_team_id
            else:
                # End of match
                await self._end_match(game)
    
    async def _rotate_bowler(self, game: GameState):
        """Rotate bowler after completing an over"""
        bowling_team = self._get_bowling_team(game)
        if not bowling_team:
            return
        
        bowlers = [p for p in bowling_team.players if p.role in [PlayerRole.BOWLER, PlayerRole.ALL_ROUNDER]]
        
        if bowlers:
            current_idx = next((i for i, p in enumerate(bowlers) if p.id == game.current_bowler_id), 0)
            next_idx = (current_idx + 1) % len(bowlers)
            
            # Reset current bowler
            if game.current_bowler_id:
                old_bowler = self._get_player(game, game.current_bowler_id)
                if old_bowler:
                    old_bowler.is_bowling = False
            
            # Set new bowler
            game.current_bowler_id = bowlers[next_idx].id
            bowlers[next_idx].is_bowling = True
    
    async def _end_match(self, game: GameState):
        """End the match and determine result"""
        game.status = GameStatus.FINISHED
        
        if game.innings1 and game.innings2:
            if game.innings1.runs > game.innings2.runs:
                game.winner_id = game.team1.id if game.batting_team_id == game.team1.id else game.team2.id
            elif game.innings2.runs > game.innings1.runs:
                game.winner_id = game.team2.id if game.batting_team_id == game.team2.id else game.team1.id
            else:
                game.result_description = "Match Tied!"
        
        logger.info(f"Game {game.game_id} finished. Winner: {game.winner_id}")
    
    def _get_batting_team(self, game: GameState) -> Optional[Team]:
        """Get current batting team"""
        return game.team1 if game.batting_team_id == game.team1.id else game.team2
    
    def _get_bowling_team(self, game: GameState) -> Optional[Team]:
        """Get current bowling team"""
        return game.team1 if game.bowling_team_id == game.team1.id else game.team2
    
    def _get_player(self, game: GameState, player_id: str) -> Optional[Player]:
        """Get player by ID"""
        for player in game.team1.players + game.team2.players:
            if player.id == player_id:
                return player
        return None
    
    def get_game_state_3d(self, game_id: str) -> Optional[MatchState3D]:
        """Get current 3D state of the game"""
        game = self.games.get(game_id)
        if not game:
            return None
        
        # Generate current 3D positions
        state = MatchState3D(
            match_id=game_id,
            ball_position=Vector3D(x=0, y=0, z=0),
            ball_velocity=Vector3D(),
            batsman_transform=Transform3D(
                position=Vector3D(x=0, y=0, z=-15)
            ),
            bowler_transform=Transform3D(
                position=Vector3D(x=0, y=0, z=15)
            ),
        )
        
        return state

# Singleton instance
game_service = GameService()