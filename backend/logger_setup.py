import logging
import logging.handlers
import sys
import os
from pathlib import Path

def setup_logger(name):
    # Base directory calculation
    BASE_DIR = Path(__file__).resolve().parent.parent
    LOG_DIR = BASE_DIR / "data" / "logs"
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    LOG_FILE = LOG_DIR / "production.log"

    # Define the format
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # Rotating File Handler: Keep 5 back-ups of 5MB each
    file_handler = logging.handlers.RotatingFileHandler(
        LOG_FILE, maxBytes=5*1024*1024, backupCount=5, encoding='utf-8'
    )
    file_handler.setFormatter(logging.Formatter(log_format))
    
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(logging.Formatter(log_format))

    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    # Avoid adding handlers multiple times if the setup is called again
    if not logger.handlers:
        logger.addHandler(file_handler)
        logger.addHandler(stream_handler)
        
    return logger
