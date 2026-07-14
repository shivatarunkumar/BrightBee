"""
Authentication routes
  POST /api/v1/auth/register
  POST /api/v1/auth/login
  POST /api/v1/auth/refresh
  POST /api/v1/auth/logout
  POST /api/v1/auth/forgot-password
  POST /api/v1/auth/reset-password
  GET  /api/v1/auth/me
"""
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError
from sqlalchemy import or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_password_reset_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.database import get_db
from app.models import RefreshToken, User
from app.schemas.auth import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    LogoutRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------
@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Check duplicate email or username
    existing = await db.execute(
        select(User).where(or_(User.email == body.email, User.username == body.username.lower()))
    )
    conflict = existing.scalar_one_or_none()
    if conflict:
        detail = (
            "This username is already taken"
            if conflict.username == body.username.lower()
            else "An account with this email already exists"
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)

    user = User(
        name=body.name,
        username=body.username.lower(),
        email=body.email,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return RegisterResponse(id=str(user.id), name=user.name, username=user.username, email=user.email)


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------
@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    identifier = body.identifier.strip()
    is_email = '@' in identifier
    result = await db.execute(
        select(User).where(User.email == identifier if is_email else User.username == identifier.lower())
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    raw_refresh, token_hash, expires_at = create_refresh_token()

    db.add(RefreshToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    ))
    await db.commit()

    return TokenResponse(
        access_token=create_access_token(user.id),
        refresh_token=raw_refresh,
    )


# ---------------------------------------------------------------------------
# Refresh access token
# ---------------------------------------------------------------------------
@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    token_hash = hash_refresh_token(body.refresh_token)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked.is_(False),
        )
    )
    stored = result.scalar_one_or_none()

    if not stored or stored.expires_at < datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    # Rotate: revoke old, issue new
    stored.revoked = True

    raw_new, new_hash, new_expires = create_refresh_token()
    db.add(RefreshToken(
        user_id=stored.user_id,
        token_hash=new_hash,
        expires_at=new_expires,
    ))
    await db.commit()

    return TokenResponse(
        access_token=create_access_token(stored.user_id),
        refresh_token=raw_new,
    )


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------
@router.post("/logout", response_model=MessageResponse)
async def logout(body: LogoutRequest, db: AsyncSession = Depends(get_db)):
    token_hash = hash_refresh_token(body.refresh_token)
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.token_hash == token_hash)
        .values(revoked=True)
    )
    await db.commit()
    return MessageResponse(message="Logged out successfully")


# ---------------------------------------------------------------------------
# Forgot password
# ---------------------------------------------------------------------------
@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    # Always return 200 to avoid email enumeration
    if not user:
        return ForgotPasswordResponse(
            message="If that email exists, a reset link has been sent"
        )

    reset_token = create_password_reset_token(body.email)

    # TODO: In production, send reset_token via email (e.g. SendGrid / SES).
    # For development we return it directly in the response.
    if settings.APP_ENV == "development":
        return ForgotPasswordResponse(
            message="Reset token generated (dev mode — send via email in production)",
            reset_token=reset_token,
        )

    return ForgotPasswordResponse(message="If that email exists, a reset link has been sent")


# ---------------------------------------------------------------------------
# Reset password
# ---------------------------------------------------------------------------
@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    try:
        email = decode_password_reset_token(body.reset_token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User not found")

    user.password_hash = hash_password(body.new_password)

    # Revoke all existing refresh tokens so all sessions are invalidated
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id)
        .values(revoked=True)
    )
    await db.commit()

    return MessageResponse(message="Password reset successfully. Please log in again.")


# ---------------------------------------------------------------------------
# Current user (me)
# ---------------------------------------------------------------------------
@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {
        "id": str(current_user.id),
        "name": current_user.name,
        "username": current_user.username,
        "email": current_user.email,
        "is_verified": current_user.is_verified,
        "created_at": current_user.created_at,
    }
