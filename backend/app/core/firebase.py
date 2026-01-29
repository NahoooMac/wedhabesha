"""
Firebase Configuration and Authentication

Firebase Admin SDK setup and ID token verification.
"""

import json
from typing import Optional
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, status

from app.core.config import settings


class FirebaseService:
    """Firebase service for authentication and token verification"""
    
    def __init__(self):
        self._app = None
        self._initialize_firebase()
    
    def _initialize_firebase(self):
        """Initialize Firebase Admin SDK"""
        try:
            # Check if Firebase is already initialized
            if firebase_admin._apps:
                self._app = firebase_admin.get_app()
                return
            
            # For development, use default credentials if service account not configured
            if not settings.FIREBASE_PRIVATE_KEY or not settings.FIREBASE_CLIENT_EMAIL:
                print("Warning: Firebase service account not configured. Using default credentials for development.")
                # In production, you should configure proper service account credentials
                return
            
            # Create credentials from environment variables
            cred_dict = {
                "type": "service_account",
                "project_id": settings.FIREBASE_PROJECT_ID,
                "private_key_id": settings.FIREBASE_PRIVATE_KEY_ID,
                "private_key": settings.FIREBASE_PRIVATE_KEY.replace('\\n', '\n'),
                "client_email": settings.FIREBASE_CLIENT_EMAIL,
                "client_id": settings.FIREBASE_CLIENT_ID,
                "auth_uri": settings.FIREBASE_AUTH_URI,
                "token_uri": settings.FIREBASE_TOKEN_URI,
            }
            
            cred = credentials.Certificate(cred_dict)
            self._app = firebase_admin.initialize_app(cred)
            
        except Exception as e:
            print(f"Firebase initialization warning: {e}")
            # Continue without Firebase for development
    
    async def verify_id_token(self, id_token: str) -> Optional[dict]:
        """
        Verify Firebase ID token and return user info
        
        Args:
            id_token: Firebase ID token from client
            
        Returns:
            User info dict if token is valid, None otherwise
        """
        try:
            if not self._app:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Firebase service not available"
                )
            
            # Verify the ID token
            decoded_token = auth.verify_id_token(id_token)
            
            return {
                "uid": decoded_token["uid"],
                "email": decoded_token.get("email"),
                "name": decoded_token.get("name"),
                "picture": decoded_token.get("picture"),
                "email_verified": decoded_token.get("email_verified", False)
            }
            
        except auth.InvalidIdTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Firebase ID token"
            )
        except auth.ExpiredIdTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Expired Firebase ID token"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Firebase token verification failed: {str(e)}"
            )
    
    def is_available(self) -> bool:
        """Check if Firebase service is available"""
        return self._app is not None


# Global Firebase service instance
firebase_service = FirebaseService()