"""
Authentication Endpoints

User authentication, registration, and session management with enhanced security.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Header, Response, Request
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.services.auth_service import AuthService
from app.models.auth import (
    CoupleRegistrationRequest,
    VendorRegistrationRequest,
    LoginRequest,
    GoogleSignInRequest,
    StaffVerificationRequest,
    TokenResponse,
    UserResponse,
    StaffSessionResponse,
    RefreshTokenRequest,
    MessageResponse
)
from app.core.config import settings
from app.core.session_security import session_manager
from app.core.cookie_security import cookie_manager
from app.middleware.security_middleware import validate_email_format

router = APIRouter()


@router.post("/register/couple", response_model=TokenResponse)
async def register_couple(
    request: CoupleRegistrationRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """Register a new couple account with secure session management"""
    # Validate email format
    if not validate_email_format(request.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
    
    auth_service = AuthService(db)
    
    user, couple, access_token = await auth_service.register_couple(
        email=request.email,
        password=request.password,
        firebase_id_token=request.firebase_id_token,
        partner1_name=request.partner1_name,
        partner2_name=request.partner2_name,
        phone=request.phone
    )
    
    # Create secure session
    session_token = await session_manager.create_session(
        user_id=user.id,
        user_type=user.user_type,
        additional_data={"email": user.email}
    )
    
    # Set secure session cookie
    cookie_manager.set_session_cookie(response, session_token)
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user.id,
        user_type=user.user_type,
        email=user.email
    )


@router.post("/register/vendor", response_model=TokenResponse)
async def register_vendor(
    request: VendorRegistrationRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """Register a new vendor account with secure session management"""
    # Validate email format
    if not validate_email_format(request.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
    
    auth_service = AuthService(db)
    
    user, vendor, access_token = await auth_service.register_vendor(
        email=request.email,
        password=request.password,
        firebase_id_token=request.firebase_id_token,
        business_name=request.business_name,
        category=request.category,
        location=request.location,
        description=request.description
    )
    
    # Create secure session
    session_token = await session_manager.create_session(
        user_id=user.id,
        user_type=user.user_type,
        additional_data={"email": user.email}
    )
    
    # Set secure session cookie
    cookie_manager.set_session_cookie(response, session_token)
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user.id,
        user_type=user.user_type,
        email=user.email
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    response: Response,
    req: Request,
    db: Session = Depends(get_db)
):
    """Traditional email/password login with security measures"""
    # Validate email format
    if not validate_email_format(request.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
    
    # Check if user is locked out
    client_ip = req.client.host if req.client else "unknown"
    identifier = f"{request.email}:{client_ip}"
    
    if await session_manager.is_locked_out(identifier):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Account temporarily locked due to too many failed login attempts"
        )
    
    auth_service = AuthService(db)
    
    try:
        user, access_token = await auth_service.login_with_email(
            email=request.email,
            password=request.password
        )
        
        # Record successful login
        await session_manager.record_login_attempt(identifier, success=True)
        
        # Create secure session
        session_token = await session_manager.create_session(
            user_id=user.id,
            user_type=user.user_type,
            additional_data={"email": user.email, "ip_address": client_ip}
        )
        
        # Set secure session cookie
        cookie_manager.set_session_cookie(response, session_token, request.remember_me)
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_id=user.id,
            user_type=user.user_type,
            email=user.email
        )
        
    except HTTPException as e:
        # Record failed login attempt
        await session_manager.record_login_attempt(identifier, success=False)
        raise e


@router.post("/google-signin", response_model=TokenResponse)
async def google_signin(
    request: GoogleSignInRequest,
    db: Session = Depends(get_db)
):
    """Google Sign-In authentication"""
    auth_service = AuthService(db)
    
    user, access_token = await auth_service.login_with_google(
        firebase_id_token=request.firebase_id_token
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user.id,
        user_type=user.user_type,
        email=user.email
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """Refresh access token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header"
        )
    
    current_token = authorization.split(" ")[1]
    auth_service = AuthService(db)
    
    new_token = await auth_service.refresh_token(current_token)
    
    if not new_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token refresh failed"
        )
    
    # Get user info for response
    user = auth_service.get_current_user_from_token(new_token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    return TokenResponse(
        access_token=new_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user.id,
        user_type=user.user_type,
        email=user.email
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    response: Response,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """User logout with secure session cleanup"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header"
        )
    
    token = authorization.split(" ")[1]
    auth_service = AuthService(db)
    
    # Invalidate session
    await session_manager.invalidate_session(token)
    
    # Clear secure cookies
    cookie_manager.clear_session_cookies(response)
    
    success = await auth_service.logout(token)
    
    if success:
        return MessageResponse(message="Successfully logged out")
    else:
        return MessageResponse(message="Logout completed")


@router.post("/staff/verify", response_model=StaffSessionResponse)
async def verify_staff(
    request: StaffVerificationRequest,
    db: Session = Depends(get_db)
):
    """Verify staff credentials for check-in"""
    auth_service = AuthService(db)
    
    wedding, session_token = await auth_service.verify_staff_credentials(
        wedding_code=request.wedding_code,
        staff_pin=request.staff_pin
    )
    
    return StaffSessionResponse(
        session_token=session_token,
        wedding_id=wedding.id,
        expires_in=240 * 60  # 4 hours in seconds
    )