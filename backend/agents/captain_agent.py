from crewai import Agent, Task
from backend.services.openrouter_service import openrouter_service
from backend.models.schemas import TacticalDecision
from backend.utils.logger import LoggerFactory

logger = LoggerFactory.get_logger(__name__)

class CaptainAgent:
    """
    The AI Captain agent. Uses CrewAI's Agent class to process user commands
    and produce tactical decisions.
    """
    def __init__(self):
        self.agent = Agent(
            role="Cricket Captain",
            goal="Interpret the coach's/user's strategic instruction and decide the best tactical approach for the current ball or over, considering the match situation.",
            backstory=(
                "You are an experienced cricket captain with a deep understanding of the game. "
                "You analyse the match context—runs required, wickets left, balls remaining—and "
                "translate high-level commands like 'play aggressively' into concrete field settings, "
                "bowling changes, and batting intent. Your decisions always come with a short message to the user."
            ),
            verbose=True,
            allow_delegation=False,
            # In newer CrewAI versions, you might need to set `llm` here, but we'll use the default OpenAI-compatible.
            # We'll override the task execution to use our OpenRouter service.
        )

    def decide_tactics(self, game_state: dict, user_command: str) -> TacticalDecision:
        """
        Given the current match situation and a user command, return a TacticalDecision.
        """
        # Build a prompt with full game context
        system_prompt = (
            "You are an AI cricket captain. Your task is to output a JSON object strictly "
            "following the provided schema. Do not include any extra text."
        )
        user_prompt = f"""
Current match situation:
- Batting team: {game_state['batting_team']['name']}
- Bowling team: {game_state['bowling_team']['name']}
- Target: {game_state['target']} runs needed
- Runs scored: {game_state['runs']}
- Wickets lost: {game_state['wickets']}
- Balls bowled: {game_state['balls_bowled']} out of {game_state['max_balls']}
- Current aggression level: {game_state['aggression_level']}
- Field placement: {game_state['field_placement']}
- Current batsmen: {', '.join(game_state['current_batsmen'])}
- Current bowler: {game_state['current_bowler']}

User's instruction: "{user_command}"

Decide the tactical adjustments for the next delivery (or the over). Your decision must include:
- aggression_level: integer 0-100
- field_placement: one of "attacking", "defensive", "balanced"
- bowling_type: string if the bowling team is making a plan (e.g., "yorker", "bouncer", "slower ball"), otherwise null
- batting_shot_type: string if the batting team is making a plan (e.g., "slog", "defensive push"), otherwise null
- message_to_user: a short natural language confirmation of your plan.

Respond ONLY with the JSON object, no other text.
"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        decision = openrouter_service.chat_with_json(
            messages=messages,
            output_schema=TacticalDecision,
            system_prompt=system_prompt,
            temperature=0.4
        )
        logger.info(f"Captain decision: {decision}")
        return decision