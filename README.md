# cricket-ai
Cricket Manager &amp; Simulator using CrewAI, OpenRouter free models, and Agentic AI. The project uses FastAPI for the backend, a simple HTML/JS frontend, and follows SOLID principles with appropriate design patterns. multiplayer online cricket game with real-time capabilities, AI opponent system, and dynamic player filling. This will use WebSockets for real-time communication and include a robust matchmaking system.

<img width="1024" height="559" alt="image" src="https://github.com/user-attachments/assets/7825dbc6-1dbd-4413-8999-a92ba1f59fe3" />

<<<<<<< HEAD
<img width="1024" height="559" alt="image" src="https://github.com/user-attachments/assets/f228245c-0c1e-4dfc-8b02-317cfdb11c8d" />



How to Run
Clone the repository and navigate to the project folder.

Create a virtual environment and activate it:

bash
python -m venv venv
source venv/bin/activate   # Linux/Mac
venv\Scripts\activate      # Windows
Install dependencies:

bash
pip install -r requirements.txt
pip install uvicorn fastapi
pip install crewai

Set up your .env file (copy from .env.example) and add your OpenRouter API key.

Start the server:

bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

OR

python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

Open your browser at http://localhost:8000.

Enter a scenario and click Start Game.

Type a command like “Play aggressively this over” and watch the AI captain respond and simulate the over ball by ball.

The entire stack is now fully functional – from development to production. The AI captain uses OpenRouter’s free models with strict JSON validation, CrewAI orchestration, and a realistic cricket simulation engine. All SOLID principles, design patterns, and error handling are applied throughout.

=======
>>>>>>> 56ab7278df02549b3143363a779c7f97298090fb
