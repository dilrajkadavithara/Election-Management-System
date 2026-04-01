import jwt
import logging
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from backend.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from backend.django_bridge import get_user_info_async

logger = logging.getLogger("ElectionEngine")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/token")
pwd_context = CryptContext(schemes=["django_pbkdf2_sha256"], deprecated="auto")

async def verify_token_from_query(token: str) -> dict:
    """Verify a JWT token passed as a query parameter (for SSE/EventSource which can't send headers)."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(401, "Invalid token")
        user_info = await get_user_info_async(username)
        if user_info is None:
            raise HTTPException(401, "User not found")
        return user_info
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token has expired")
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid SSE token: {e}")
        raise HTTPException(401, "Invalid credentials")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"SSE Auth Error: {e}")
        raise HTTPException(401, "Authentication failed")


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(401, "Invalid token")
        
        user_info = await get_user_info_async(username)
        if user_info is None:
            raise HTTPException(401, "User not found")
        return user_info
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token has expired")
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid token: {e}")
        raise HTTPException(401, "Invalid credentials")
    except Exception as e:
        logger.error(f"Auth Error: {e}")
        raise HTTPException(401, "Authentication failed")
