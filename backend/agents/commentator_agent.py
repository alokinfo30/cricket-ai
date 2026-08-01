from backend.services.openrouter_service import openrouter_service
from backend.models.schemas import BallOutcome
from backend.utils.logger import LoggerFactory

logger = LoggerFactory.get_logger(__name__)

class CommentatorAgent:
    """
    Generates rich commentary for a ball outcome using LLM.
    (Optional – we already have a simple commentary in simulation; this can be used to enhance it.)
    """
    def generate_commentary(self, game_state: dict, ball_outcome: BallOutcome) -> str:
        prompt = f"""
Match context: {game_state['batting_team']['name']} vs {game_state['bowling_team']['name']}.
{game_state['runs']}/{game_state['wickets']} in {game_state['balls_bowled']} balls, need {game_state['target'] - game_state['runs']} from {game_state['max_balls'] - game_state['balls_bowled']} balls.

Ball result: {ball_outcome.runs} run(s), {ball_outcome.extras} extras, {'wicket!' if ball_outcome.wicket else 'no wicket'}.

Write a one-line exciting cricket commentary for this delivery.
"""
        messages = [
            {"role": "system", "content": "You are a passionate cricket commentator."},
            {"role": "user", "content": prompt}
        ]
        try:
            completion = openrouter_service.client.chat.completions.create(
                model="openrouter/free",
                messages=messages,
                temperature=0.8,
                max_tokens=60
            )
            return completion.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Commentary generation failed: {e}")
            return ball_outcome.commentary  # fallback to simple