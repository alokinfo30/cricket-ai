"""
Application Configuration
Implements Singleton pattern for global settings
"""

import os
from typing import Optional
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from functools import lru_cache

load_dotenv()

class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # OpenRouter AI Configuration
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_BASE_URL: str = os.getenv(
        "OPENROUTER_BASE_URL", 
        "https://openrouter.ai/api/v1"
    )
    MODEL_NAME: str = os.getenv("MODEL_NAME", "openrouter/free")
    
    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-change-me")
    
    # Redis Configuration
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # Game Configuration
    MAX_PLAYERS_PER_TEAM: int = int(os.getenv("MAX_PLAYERS_PER_TEAM", "11"))
    MIN_REAL_PLAYERS: int = int(os.getenv("MIN_REAL_PLAYERS", "2"))
    AI_FILL_TIMEOUT: int = int(os.getenv("AI_FILL_TIMEOUT", "30"))
    MATCH_TIMEOUT: int = int(os.getenv("MATCH_TIMEOUT", "60"))
    MAX_OVERS: int = int(os.getenv("MAX_OVERS", "20"))
    
    # 3D Rendering Settings
    ENABLE_SHADOWS: bool = os.getenv("ENABLE_SHADOWS", "true").lower() == "true"
    ENABLE_PARTICLES: bool = os.getenv("ENABLE_PARTICLES", "true").lower() == "true"
    ENABLE_POST_PROCESSING: bool = os.getenv("ENABLE_POST_PROCESSING", "true").lower() == "true"
    SHADOW_QUALITY: str = os.getenv("SHADOW_QUALITY", "high")
    TEXTURE_QUALITY: str = os.getenv("TEXTURE_QUALITY", "high")
    
    # Audio Settings
    ENABLE_AUDIO: bool = os.getenv("ENABLE_AUDIO", "true").lower() == "true"
    AUDIO_VOLUME: float = float(os.getenv("AUDIO_VOLUME", "0.7"))
    CROWD_DENSITY: str = os.getenv("CROWD_DENSITY", "high")
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    settings = Settings()
    
    # Validate critical settings
    if not settings.OPENROUTER_API_KEY:
        raise ValueError(
            "OPENROUTER_API_KEY is required. "
            "Get one from https://openrouter.ai/keys"
        )
    
    return settings

# Global settings instance
settings = get_settings()