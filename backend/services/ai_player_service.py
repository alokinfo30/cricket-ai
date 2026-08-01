import random
from typing import List, Optional, Dict
from datetime import datetime
from backend.models.schemas import (
    AIPlayer, Player, PlayerRole, PlayerType, AIAgentConfig,
    BallOutcome, TacticalDecision
)
from backend.utils.logger import LoggerFactory

logger = LoggerFactory.get_logger(__name__)

class AIPlayerService:
    """
    Manages AI player creation, behavior, and decision-making.
    Implements different AI personalities and skill levels.
    """
    
    AI_NAMES = [
        "V. AI-Rat", "A. Botman", "R. Sharma-AI", "M. Dhoni-Bot", 
        "S. Tendulkar-AI", "B. Lara-Bot", "G. McGrath-AI", "W. Akram-Bot",
        "S. Warne-AI", "M. Murali-Bot", "J. Kallis-AI", "A. Gilchrist-Bot",
        "K. Sangakkara-AI", "R. Ponting-Bot", "A. de Villiers-AI"
    ]
    
    AI_SURNAMES = [
        "AI-Tendulkar", "Bot-Lara", "AI-Kohli", "Bot-Smith",
        "AI-Root", "Bot-Williamson", "AI-Buttler", "Bot-Stokes"
    ]
    
    def __init__(self):
        self.generated_names = set()
    
    def _generate_unique_name(self) -> str:
        """Generate a unique AI player name."""
        base_names = self.AI_NAMES + self.AI_SURNAMES
        available = [n for n in base_names if n not in self.generated_names]
        
        if not available:
            # Create numbered variant
            base = random.choice(base_names)
            counter = 1
            while f"{base}-{counter}" in self.generated_names:
                counter += 1
            name = f"{base}-{counter}"
        else:
            name = random.choice(available)
        
        self.generated_names.add(name)
        return name
    
    def create_ai_player(
        self,
        role: Optional[PlayerRole] = None,
        skill_level: Optional[int] = None
    ) -> AIPlayer:
        """
        Create an AI player with specified or random characteristics.
        """
        if role is None:
            role = random.choice(list(PlayerRole))
        
        if skill_level is None:
            # Weighted random skill level with normal distribution
            skill_level = min(100, max(0, int(random.gauss(60, 20))))
        
        name = self._generate_unique_name()
        
        # Generate AI-specific agent configuration
        agent_config = AIAgentConfig(
            aggression=random.randint(30, 70),
            skill_level=skill_level,
            risk_appetite=random.randint(30, 70),
            preferred_role=role
        )
        
        ai_player = AIPlayer(
            name=name,
            type=PlayerType.AI,
            role=role,
            agent_config=agent_config,
            is_ready=True  # AI players are always ready
        )
        
        logger.info(f"Created AI player: {name} ({role.value}) with skill level {skill_level}")
        return ai_player
    
    def create_team_fillers(
        self,
        required_count: int,
        existing_roles: List[PlayerRole]
    ) -> List[AIPlayer]:
        """
        Create AI players to fill a team to the required size.
        Ensures balanced team composition.
        """
        if required_count <= 0:
            return []
        
        # Define ideal team composition
        ideal_composition = {
            PlayerRole.BATSMAN: 5,
            PlayerRole.BOWLER: 4,
            PlayerRole.ALL_ROUNDER: 2,
            PlayerRole.WICKET_KEEPER: 1
        }
        
        # Count current roles
        current_counts = {role: 0 for role in PlayerRole}
        for role in [str(r) for r in existing_roles]:
            if role in current_counts:
                current_counts[role] += 1
        
        # Determine what's needed
        needed_roles = []
        total_players = sum(current_counts.values()) + required_count
        max_players = 11
        
        for role, ideal_count in ideal_composition.items():
            # Scale ideal count based on total players
            target = max(0, min(ideal_count, max_players - (total_players - (ideal_count - current_counts[role]))))
            deficit = max(0, ideal_count - current_counts[role])
            needed_roles.extend([role] * deficit)
        
        # Shuffle and take only what's needed
        random.shuffle(needed_roles)
        needed_roles = needed_roles[:required_count]
        
        # If we still need more, add random roles
        while len(needed_roles) < required_count:
            needed_roles.append(random.choice(list(PlayerRole)))
        
        # Create AI players
        ai_players = []
        for role in needed_roles:
            # Vary skill levels to make realistic team
            skill_level = random.randint(40, 85)
            ai_player = self.create_ai_player(role=role, skill_level=skill_level)
            ai_players.append(ai_player)
        
        logger.info(f"Created {len(ai_players)} AI filler players")
        return ai_players
    
    def make_ai_decision(
        self,
        ai_player: AIPlayer,
        game_context: Dict,
        available_actions: List[str]
    ) -> TacticalDecision:
        """
        AI player makes tactical decision based on game context and personality.
        """
        config = ai_player.agent_config
        aggression_base = config.aggression
        skill = config.skill_level / 100.0
        risk = config.risk_appetite / 100.0
        
        # Adjust aggression based on game situation
        runs_needed = game_context.get('runs_needed', 50)
        balls_remaining = game_context.get('balls_remaining', 120)
        wickets_lost = game_context.get('wickets_lost', 0)
        target = game_context.get('target', 0)
        
        # Calculate required run rate vs current run rate
        if balls_remaining > 0 and runs_needed > 0:
            required_rate = (runs_needed / balls_remaining) * 6
            if required_rate > 8:
                aggression_base = min(100, aggression_base + 20)
            elif required_rate < 4:
                aggression_base = max(0, aggression_base - 20)
        
        # AI skill affects decision randomness
        decision_noise = (1 - skill) * 20  # More noise for low skill
        
        final_aggression = min(100, max(0, 
            aggression_base + random.randint(-int(decision_noise), int(decision_noise))
        ))
        
        # Determine field placement
        if final_aggression > 70:
            field = "attacking"
        elif final_aggression < 30:
            field = "defensive"
        else:
            field = "balanced"
        
        # Generate appropriate message
        messages = {
            "attacking": [
                f"{ai_player.name}: Let's go aggressive! Putting pressure on!",
                f"{ai_player.name}: Time to attack! Moving fielders in!",
                f"{ai_player.name}: Going for the kill! All out attack!"
            ],
            "balanced": [
                f"{ai_player.name}: Maintaining balance. Smart cricket needed.",
                f"{ai_player.name}: Controlled aggression. Building pressure.",
                f"{ai_player.name}: Playing according to the situation."
            ],
            "defensive": [
                f"{ai_player.name}: Tightening up. Protecting boundaries.",
                f"{ai_player.name}: Defensive lines. Building dot ball pressure.",
                f"{ai_player.name}: Saving runs. Patience is key."
            ]
        }
        
        return TacticalDecision(
            aggression_level=final_aggression,
            field_placement=field,
            bowling_change=False,
            message_to_user=random.choice(messages[field]),
            confidence=skill
        )