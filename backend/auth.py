# auth.py — JWT Authentication for Vocably
# Handles token creation, verification, and credential validation.

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

# ---------------------------------------------------------------------------
# Configuration — override via environment variables for production
# ---------------------------------------------------------------------------

# Secret key for signing JWTs.
# If not provided, a secure random key is generated per server session.
# For production, always set JWT_SECRET_KEY as an environment variable.
SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", secrets.token_hex(32))

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 8  # Token valid for one working day

# ---------------------------------------------------------------------------
# Hardcoded local credentials (for demo / local use only)
# Override via environment variables: VOCABLY_USERNAME, VOCABLY_PASSWORD
# ---------------------------------------------------------------------------
DEMO_USERNAME: str = os.environ.get("VOCABLY_USERNAME", "vocably")
DEMO_PASSWORD: str = os.environ.get("VOCABLY_PASSWORD", "vocably2026")

# ---------------------------------------------------------------------------
# Bearer token extractor
# ---------------------------------------------------------------------------
bearer_scheme = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Token creation
# ---------------------------------------------------------------------------
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT with an expiry timestamp."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ---------------------------------------------------------------------------
# Credential validation
# ---------------------------------------------------------------------------
def validate_credentials(username: str, password: str) -> bool:
    """
    Validate username and password against the configured credentials.
    Returns True if valid, False otherwise.

    Design note: In a production system this would query a database and
    compare against a bcrypt hash. For this local demo, we compare directly
    against the configured credentials. The JWT flow itself is production-grade.
    """
    return username == DEMO_USERNAME and password == DEMO_PASSWORD


# ---------------------------------------------------------------------------
# FastAPI dependency — protect endpoints with JWT verification
# ---------------------------------------------------------------------------
def verify_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    """
    FastAPI dependency that extracts and validates a Bearer JWT.

    Usage:
        @app.post("/api/tts")
        async def tts(request: TTSRequest, token_data: dict = Depends(verify_token)):
            ...

    Raises 401 if:
      - No Authorization header is present
      - Token is malformed or has an invalid signature
      - Token has expired
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        return {"username": username}
    except JWTError:
        raise credentials_exception
