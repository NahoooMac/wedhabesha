"""
Security Utilities

Password hashing, JWT token management, and security functions.
"""

from datetime import datetime, timedelta
from typing import Optional, Union
import jwt
import bcrypt
import hashlib

from app.core.config import settings


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Args:
        password: Plain text password to hash
        
    Returns:
        Hashed password string
    """
    # Ensure password is not longer than 72 bytes for bcrypt
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        # Hash with SHA256 first if too long, then bcrypt the hash
        password_bytes = hashlib.sha256(password_bytes).hexdigest().encode('utf-8')
    
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    
    Args:
        plain_password: Plain text password to verify
        hashed_password: Hashed password to verify against
        
    Returns:
        True if password matches, False otherwise
    """
    try:
        # Ensure password is not longer than 72 bytes for bcrypt
        password_bytes = plain_password.encode('utf-8')
        if len(password_bytes) > 72:
            # Hash with SHA256 first if too long
            password_bytes = hashlib.sha256(password_bytes).hexdigest().encode('utf-8')
        
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False


def hash_pin(pin: str) -> str:
    """
    Hash a PIN using bcrypt.
    
    Args:
        pin: Plain text PIN to hash
        
    Returns:
        Hashed PIN string
    """
    return hash_password(pin)


def verify_pin(plain_pin: str, hashed_pin: str) -> bool:
    """
    Verify a PIN against its hash.
    
    Args:
        plain_pin: Plain text PIN to verify
        hashed_pin: Hashed PIN to verify against
        
    Returns:
        True if PIN matches, False otherwise
    """
    return verify_password(plain_pin, hashed_pin)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Data to encode in the token
        expires_delta: Token expiration time delta
        
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """
    Verify and decode a JWT token.
    
    Args:
        token: JWT token to verify
        
    Returns:
        Decoded token data if valid, None otherwise
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


def generate_wedding_code() -> str:
    """
    Generate a unique wedding code.
    
    Returns:
        4-character alphanumeric wedding code (e.g., AB92)
    """
    import random
    import string
    
    # Generate 2 uppercase letters followed by 2 digits
    letters = ''.join(random.choices(string.ascii_uppercase, k=2))
    digits = ''.join(random.choices(string.digits, k=2))
    return letters + digits


def generate_staff_pin() -> str:
    """
    Generate a 6-digit staff PIN.
    
    Returns:
        6-digit numeric PIN as string
    """
    import random
    return ''.join(random.choices('0123456789', k=6))


def generate_qr_code() -> str:
    """
    Generate a unique QR code identifier.
    
    Returns:
        Unique QR code string
    """
    import uuid
    return str(uuid.uuid4())