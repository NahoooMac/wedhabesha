"""
User Service

Business logic for user management, authentication, and account creation.
"""

from typing import Optional, Tuple
from sqlalchemy.orm import Session
from datetime import datetime

from app.models.user import User, Couple, Vendor, UserType, AuthProvider, VendorCategory
from app.core.security import hash_password, verify_password, generate_wedding_code, generate_staff_pin, hash_pin


class UserService:
    """Service class for user management operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_couple_user(
        self, 
        email: str, 
        password: Optional[str] = None,
        firebase_uid: Optional[str] = None,
        partner1_name: str = "",
        partner2_name: str = "",
        phone: Optional[str] = None
    ) -> Tuple[User, Couple]:
        """
        Create a new couple user account.
        
        Args:
            email: User email address
            password: Plain text password (for email auth)
            firebase_uid: Firebase UID (for Google auth)
            partner1_name: First partner's name
            partner2_name: Second partner's name
            phone: Phone number
            
        Returns:
            Tuple of (User, Couple) objects
            
        Raises:
            ValueError: If validation fails
        """
        # Determine auth provider and validate
        if firebase_uid:
            auth_provider = AuthProvider.GOOGLE
            password_hash = None
        elif password:
            auth_provider = AuthProvider.EMAIL
            password_hash = hash_password(password)
            firebase_uid = None
        else:
            raise ValueError("Either password or firebase_uid must be provided")
        
        # Check if user already exists
        existing_user = self.db.query(User).filter(User.email == email).first()
        if existing_user:
            raise ValueError(f"User with email {email} already exists")
        
        # Check if Firebase UID already exists (for Google auth)
        if firebase_uid:
            existing_firebase_user = self.db.query(User).filter(User.firebase_uid == firebase_uid).first()
            if existing_firebase_user:
                raise ValueError(f"User with Firebase UID already exists")
        
        # Create user
        user = User(
            email=email,
            password_hash=password_hash,
            firebase_uid=firebase_uid,
            user_type=UserType.COUPLE,
            auth_provider=auth_provider,
            is_active=True
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        # Create couple profile
        couple = Couple(
            user_id=user.id,
            partner1_name=partner1_name,
            partner2_name=partner2_name,
            phone=phone
        )
        
        self.db.add(couple)
        self.db.commit()
        self.db.refresh(couple)
        
        return user, couple
    
    def create_vendor_user(
        self,
        email: str,
        password: Optional[str] = None,
        firebase_uid: Optional[str] = None,
        business_name: str = "",
        category: VendorCategory = VendorCategory.OTHER,
        location: str = "",
        description: str = ""
    ) -> Tuple[User, Vendor]:
        """
        Create a new vendor user account.
        
        Args:
            email: User email address
            password: Plain text password (for email auth)
            firebase_uid: Firebase UID (for Google auth)
            business_name: Business name
            category: Vendor category
            location: Business location
            description: Business description
            
        Returns:
            Tuple of (User, Vendor) objects
            
        Raises:
            ValueError: If validation fails
        """
        # Determine auth provider and validate
        if firebase_uid:
            auth_provider = AuthProvider.GOOGLE
            password_hash = None
        elif password:
            auth_provider = AuthProvider.EMAIL
            password_hash = hash_password(password)
            firebase_uid = None
        else:
            raise ValueError("Either password or firebase_uid must be provided")
        
        # Check if user already exists
        existing_user = self.db.query(User).filter(User.email == email).first()
        if existing_user:
            raise ValueError(f"User with email {email} already exists")
        
        # Check if Firebase UID already exists (for Google auth)
        if firebase_uid:
            existing_firebase_user = self.db.query(User).filter(User.firebase_uid == firebase_uid).first()
            if existing_firebase_user:
                raise ValueError(f"User with Firebase UID already exists")
        
        # Create user
        user = User(
            email=email,
            password_hash=password_hash,
            firebase_uid=firebase_uid,
            user_type=UserType.VENDOR,
            auth_provider=auth_provider,
            is_active=True
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        # Create vendor profile
        vendor = Vendor(
            user_id=user.id,
            business_name=business_name,
            category=category,
            location=location,
            description=description,
            is_verified=False
        )
        
        self.db.add(vendor)
        self.db.commit()
        self.db.refresh(vendor)
        
        return user, vendor
    
    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """
        Authenticate a user with email and password.
        
        Args:
            email: User email
            password: Plain text password
            
        Returns:
            User object if authentication successful, None otherwise
        """
        user = self.db.query(User).filter(User.email == email).first()
        
        if not user or not user.is_active:
            return None
        
        # Only authenticate email users with password
        if user.auth_provider != AuthProvider.EMAIL or not user.password_hash:
            return None
        
        if not verify_password(password, user.password_hash):
            return None
        
        return user
    
    def authenticate_firebase_user(self, firebase_uid: str) -> Optional[User]:
        """
        Authenticate a user with Firebase UID.
        
        Args:
            firebase_uid: Firebase UID
            
        Returns:
            User object if authentication successful, None otherwise
        """
        user = self.db.query(User).filter(User.firebase_uid == firebase_uid).first()
        
        if not user or not user.is_active:
            return None
        
        # Only authenticate Google users with Firebase UID
        if user.auth_provider != AuthProvider.GOOGLE:
            return None
        
        return user
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email address"""
        return self.db.query(User).filter(User.email == email).first()
    
    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()
    
    def get_user_by_firebase_uid(self, firebase_uid: str) -> Optional[User]:
        """Get user by Firebase UID"""
        return self.db.query(User).filter(User.firebase_uid == firebase_uid).first()
    
    def get_couple_by_user_id(self, user_id: int) -> Optional[Couple]:
        """Get couple profile by user ID"""
        return self.db.query(Couple).filter(Couple.user_id == user_id).first()