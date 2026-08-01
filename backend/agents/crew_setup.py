from crewai import Crew
from backend.agents.captain_agent import CaptainAgent
from backend.agents.commentator_agent import CommentatorAgent

# We're not using Crew's hierarchical process; we'll directly call the agents.
# But we can optionally set up a crew for future multi-agent coordination.
def create_game_crew():
    captain = CaptainAgent()
    commentator = CommentatorAgent()
    # No tasks defined here; we use agents manually.
    return captain, commentator