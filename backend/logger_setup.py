import re
import logging
import logging.handlers
import sys
import os
from pathlib import Path


class SensitiveDataFilter(logging.Filter):
    """Redacts passwords, tokens, API keys, and phone numbers from log messages."""
    PATTERNS = [
        (re.compile(r'(password|passwd|pwd)\s*[=:]\s*\S+', re.IGNORECASE), r'\1=***REDACTED***'),
        (re.compile(r'(token|jwt|bearer|api_key|apikey|secret)\s*[=:]\s*\S+', re.IGNORECASE), r'\1=***REDACTED***'),
        (re.compile(r'Bearer\s+[A-Za-z0-9\-._~+/]+=*', re.IGNORECASE), 'Bearer ***REDACTED***'),
        (re.compile(r'AIzaSy[A-Za-z0-9_-]{33}'), '***API_KEY_REDACTED***'),
    ]

    def filter(self, record):
        if isinstance(record.msg, str):
            for pattern, replacement in self.PATTERNS:
                record.msg = pattern.sub(replacement, record.msg)
        return True


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
    file_handler.addFilter(SensitiveDataFilter())

    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(logging.Formatter(log_format))
    stream_handler.addFilter(SensitiveDataFilter())

    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    # Avoid adding handlers multiple times if the setup is called again
    if not logger.handlers:
        logger.addHandler(file_handler)
        logger.addHandler(stream_handler)

    return logger
