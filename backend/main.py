from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import json

from backend.config import settings
from backend.models.schemas import (
    MatchmakingRequest, MatchmakingResponse,
    GameResponse, CommandRequest, LobbyInfo
)
from backend.services.matchmaking_service import matchmaking_service
from backend.socket.game_socket import game_socket_handler
from backend.socket.connection_manager import connection_manager
from backend.utils.logger import LoggerFactory

logger = LoggerFactory.get_logger(__name__)

app = FastAPI(
    title="Cricket AI Multiplayer Manager",
    description="Multiplayer cricket game with AI opponents and real-time gameplay",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# ---------- REST API Endpoints ----------

@app.get("/")
async def root():
    """Serve the main game page."""
    return FileResponse("static/index.html")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "active_games": len(matchmaking_service.active_games),
        "waiting_players": len(matchmaking_service.waiting_players)
    }

@app.post("/matchmaking/join", response_model=MatchmakingResponse)
async def join_matchmaking(request: MatchmakingRequest):
    """Join the matchmaking queue to find a game."""
    try:
        response = await matchmaking_service.add_player_to_queue(request)
        return response
    except Exception as e:
        logger.error(f"Matchmaking error: {e}")
        raise HTTPException(status_code=500, detail="Matchmaking failed")

@app.get("/lobby/{game_id}", response_model=LobbyInfo)
async def get_lobby_info(game_id: str):
    """Get information about a game lobby."""
    lobby = matchmaking_service.get_lobby_info(game_id)
    if not lobby:
        raise HTTPException(status_code=404, detail="Lobby not found")
    return lobby

@app.get("/game/{game_id}/state")
async def get_game_state(game_id: str):
    """Get current state of a game."""
    game_state = matchmaking_service.get_game_state(game_id)
    if not game_state:
        raise HTTPException(status_code=404, detail="Game not found")
    return GameResponse(game_state=game_state, message="Current game state")

@app.post("/game/{game_id}/command")
async def send_game_command(game_id: str, request: CommandRequest):
    """Send a tactical command to the AI captain."""
    if game_id not in matchmaking_service.active_games:
        raise HTTPException(status_code=404, detail="Active game not found")
    
    # This would be processed through WebSocket in real implementation
    return {"status": "command_received", "message": "Command will be processed"}

# ---------- WebSocket Endpoints ----------

@app.websocket("/ws/{game_id}/{player_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str, player_id: str):
    """WebSocket endpoint for real-time game communication."""
    logger.info(f"WebSocket connection request: game={game_id}, player={player_id}")
    
    try:
        await game_socket_handler.handle_connection(websocket, player_id, game_id)
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: player={player_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close()
        except:
            pass

# ---------- API Exception Handlers ----------

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

# ---------- Startup/Shutdown Events ----------

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("Cricket AI Multiplayer server starting...")
    logger.info(f"Max players per team: {settings.MAX_PLAYERS_PER_TEAM}")
    logger.info(f"Min real players: {settings.MIN_REAL_PLAYERS}")
    logger.info(f"AI fill timeout: {settings.AI_FILL_TIMEOUT}s")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("Cricket AI Multiplayer server shutting down...")