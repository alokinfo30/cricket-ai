"""
Advanced Logging System
Implements structured logging with multiple handlers
"""

import logging
import sys
import json
from pathlib import Path
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
from datetime import datetime
from typing import Optional, Dict, Any
import traceback

# Create logs directory
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(exist_ok=True)

class StructuredFormatter(logging.Formatter):
    """JSON structured formatter for production logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "message": record.getMessage(),
        }
        
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": traceback.format_exception(*record.exc_info)
            }
        
        if hasattr(record, "extra_data"):
            log_data["extra"] = record.extra_data
        
        return json.dumps(log_data, default=str)

class LoggerFactory:
    """Factory pattern for creating configured loggers"""
    
    _instances: Dict[str, logging.Logger] = {}
    
    @classmethod
    def get_logger(
        cls,
        name: str,
        level: int = logging.INFO,
        log_file: Optional[str] = None,
        structured: bool = False
    ) -> logging.Logger:
        """Get or create a logger instance"""
        
        if name in cls._instances:
            return cls._instances[name]
        
        logger = logging.getLogger(name)
        logger.setLevel(level)
        logger.propagate = False
        
        # Clear existing handlers
        logger.handlers.clear()
        
        # Console Handler (colored for development)
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(level)
        
        if structured:
            console_format = StructuredFormatter()
        else:
            console_format = logging.Formatter(
                '\033[36m%(asctime)s\033[0m '
                '\033[33m%(levelname)-8s\033[0m '
                '\033[35m%(name)s\033[0m '
                '\033[32m%(funcName)s:%(lineno)d\033[0m - '
                '%(message)s',
                datefmt='%H:%M:%S'
            )
        
        console_handler.setFormatter(console_format)
        logger.addHandler(console_handler)
        
        # File Handler (rotating)
        if log_file:
            file_path = LOGS_DIR / log_file
            
            file_handler = RotatingFileHandler(
                file_path,
                maxBytes=10 * 1024 * 1024,  # 10MB
                backupCount=10,
                encoding='utf-8'
            )
            file_handler.setLevel(level)
            
            if structured:
                file_format = StructuredFormatter()
            else:
                file_format = logging.Formatter(
                    '%(asctime)s - %(name)s - %(levelname)s - '
                    '%(filename)s:%(lineno)d - %(funcName)s - %(message)s'
                )
            
            file_handler.setFormatter(file_format)
            logger.addHandler(file_handler)
        
        # Error File Handler
        error_handler = RotatingFileHandler(
            LOGS_DIR / "error.log",
            maxBytes=10 * 1024 * 1024,
            backupCount=5,
            encoding='utf-8'
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(StructuredFormatter())
        logger.addHandler(error_handler)
        
        cls._instances[name] = logger
        return logger

    @classmethod
    def get_game_logger(cls, game_id: str) -> logging.Logger:
        """Create a game-specific logger"""
        log_file = f"games/{game_id}.log"
        return cls.get_logger(
            f"game.{game_id}",
            log_file=log_file,
            structured=True
        )

# Create default loggers
app_logger = LoggerFactory.get_logger("cricket3d", log_file="app.log")
game_logger = LoggerFactory.get_logger("game", log_file="game.log")
network_logger = LoggerFactory.get_logger("network", log_file="network.log")
ai_logger = LoggerFactory.get_logger("ai", log_file="ai.log")

def setup_logger(
    name: str,
    level: int = logging.INFO,
    log_file: Optional[str] = None,
    structured: bool = False
) -> logging.Logger:
    """Compatibility wrapper for modules that expect a simple setup_logger function."""
    return LoggerFactory.get_logger(
        name,
        level=level,
        log_file=log_file,
        structured=structured,
    )

def log_with_context(logger: logging.Logger, level: int, msg: str, **kwargs):
    """Log with extra context data"""
    record = logging.LogRecord(
        name=logger.name,
        level=level,
        pathname=__file__,
        lineno=0,
        msg=msg,
        args=(),
        exc_info=None
    )
    record.extra_data = kwargs
    logger.handle(record)