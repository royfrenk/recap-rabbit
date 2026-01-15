"""
Authentication router for user signup, login, and Google OAuth.
"""
import os
import uuid
import bcrypt
import jwt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.db.database import get_db

router = APIRouter()
security = HTTPBearer(auto_error=False)

# JWT settings
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 1 week

# Admin email
ADMIN_EMAIL = "royfrenk@gmail.com"


# Request/Response models
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token


class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str]
    role: str


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Optional[dict]:
    """Get current user from JWT token. Returns None if no token."""
    if not credentials:
        return None

    payload = decode_token(credentials.credentials)
    return {
        "id": payload["sub"],
        "email": payload["email"],
        "role": payload["role"]
    }


async def require_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Require authenticated user. Raises 401 if not authenticated."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")

    return decode_token(credentials.credentials)


async def require_admin(user: dict = Depends(require_user)) -> dict:
    """Require admin role. Raises 403 if not admin."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# Endpoints
@router.post("/signup", response_model=AuthResponse)
async def signup(request: SignupRequest):
    """Create a new user account with email and password."""
    async with get_db() as db:
        # Check if email already exists
        async with db.execute(
            "SELECT id FROM users WHERE email = ?",
            (request.email,)
        ) as cursor:
            if await cursor.fetchone():
                raise HTTPException(status_code=400, detail="Email already registered")

        # Create user
        user_id = str(uuid.uuid4())
        password_hash = hash_password(request.password)
        role = "admin" if request.email == ADMIN_EMAIL else "user"

        await db.execute("""
            INSERT INTO users (id, email, password_hash, name, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (user_id, request.email, password_hash, request.name, role, datetime.utcnow().isoformat()))
        await db.commit()

        token = create_token(user_id, request.email, role)

        return AuthResponse(
            token=token,
            user=UserResponse(
                id=user_id,
                email=request.email,
                name=request.name,
                role=role
            )
        )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """Login with email and password."""
    async with get_db() as db:
        async with db.execute(
            "SELECT id, email, password_hash, name, role FROM users WHERE email = ?",
            (request.email,)
        ) as cursor:
            user = await cursor.fetchone()

        if not user or not user["password_hash"]:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if not verify_password(request.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Update last login
        await db.execute(
            "UPDATE users SET last_login = ? WHERE id = ?",
            (datetime.utcnow().isoformat(), user["id"])
        )
        await db.commit()

        token = create_token(user["id"], user["email"], user["role"])

        return AuthResponse(
            token=token,
            user=UserResponse(
                id=user["id"],
                email=user["email"],
                name=user["name"],
                role=user["role"]
            )
        )


@router.post("/google", response_model=AuthResponse)
async def google_auth(request: GoogleAuthRequest):
    """Authenticate with Google OAuth."""
    try:
        # Verify Google token
        google_client_id = os.getenv("GOOGLE_CLIENT_ID")
        if not google_client_id:
            raise HTTPException(status_code=500, detail="Google OAuth not configured")

        idinfo = id_token.verify_oauth2_token(
            request.credential,
            google_requests.Request(),
            google_client_id
        )

        google_id = idinfo["sub"]
        email = idinfo["email"]
        name = idinfo.get("name")

    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {e}")

    async with get_db() as db:
        # Check if user exists by google_id or email
        async with db.execute(
            "SELECT id, email, name, role FROM users WHERE google_id = ? OR email = ?",
            (google_id, email)
        ) as cursor:
            user = await cursor.fetchone()

        if user:
            # Update google_id if not set (email existed from password signup)
            await db.execute(
                "UPDATE users SET google_id = ?, last_login = ?, name = COALESCE(name, ?) WHERE id = ?",
                (google_id, datetime.utcnow().isoformat(), name, user["id"])
            )
            await db.commit()

            user_id = user["id"]
            role = user["role"]
        else:
            # Create new user
            user_id = str(uuid.uuid4())
            role = "admin" if email == ADMIN_EMAIL else "user"

            await db.execute("""
                INSERT INTO users (id, email, google_id, name, role, created_at, last_login)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user_id, email, google_id, name, role,
                  datetime.utcnow().isoformat(), datetime.utcnow().isoformat()))
            await db.commit()

        token = create_token(user_id, email, role)

        return AuthResponse(
            token=token,
            user=UserResponse(
                id=user_id,
                email=email,
                name=name,
                role=role
            )
        )


@router.get("/me", response_model=UserResponse)
async def get_me(user: dict = Depends(require_user)):
    """Get current user info."""
    async with get_db() as db:
        async with db.execute(
            "SELECT id, email, name, role FROM users WHERE id = ?",
            (user["sub"],)
        ) as cursor:
            db_user = await cursor.fetchone()

        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")

        return UserResponse(
            id=db_user["id"],
            email=db_user["email"],
            name=db_user["name"],
            role=db_user["role"]
        )
