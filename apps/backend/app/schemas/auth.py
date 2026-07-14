from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------
class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    username: str = Field(..., min_length=3, max_length=50, pattern=r'^[a-zA-Z0-9_]+$')
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class RegisterResponse(BaseModel):
    id: str
    name: str
    username: str
    email: str
    message: str = "Account created successfully"


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------
class LoginRequest(BaseModel):
    # Accept either email or username in this field
    identifier: str = Field(..., description="Email address or username")
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# ---------------------------------------------------------------------------
# Refresh
# ---------------------------------------------------------------------------
class RefreshRequest(BaseModel):
    refresh_token: str


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------
class LogoutRequest(BaseModel):
    refresh_token: str


# ---------------------------------------------------------------------------
# Forgot / Reset password
# ---------------------------------------------------------------------------
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str
    # In development the reset token is returned directly.
    # In production, remove this field and send it via email instead.
    reset_token: str | None = None


class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str = Field(..., min_length=8, max_length=128)


class MessageResponse(BaseModel):
    message: str
