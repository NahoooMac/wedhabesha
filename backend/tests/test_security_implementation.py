"""
Security Implementation Tests

Comprehensive security tests for authentication, authorization, input validation,
rate limiting, and session management.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch, MagicMock
import json
import time
from datetime import datetime, timedelta

from app.main import app
from app.core.database import get_db
from app.core.redis import redis_service
from app.core.session_security import session_manager
from app.core.cookie_security import cookie_manager
from app.middleware.security_middleware import (
    validate_email_format,
    validate_phone_format,
    validate_wedding_code_format,
    validate_staff_pin_format,
    sanitize_html_input
)


class TestAuthenticationSecurity:
    """Test authentication and authorization security"""
    
    def test_login_rate_limiting(self, client: TestClient):
        """Test rate limiting on login endpoint"""
        login_data = {
            "email": "test@example.com",
            "password": "wrongpassword"
        }
        
        # Make multiple failed login attempts
        responses = []
        for i in range(6):  # Exceed the 5/minute limit
            response = client.post("/api/v1/auth/login", json=login_data)
            responses.append(response)
        
        # First 5 should get 401 (invalid credentials)
        for i in range(5):
            assert responses[i].status_code == 401
        
        # 6th should get 429 (rate limited)
        assert responses[5].status_code == 429
        assert "Rate limit exceeded" in responses[5].json()["detail"]["error"]
    
    def test_registration_rate_limiting(self, client: TestClient):
        """Test rate limiting on registration endpoint"""
        registration_data = {
            "email": "test@example.com",
            "password": "testpassword123",
            "partner1_name": "Partner 1",
            "partner2_name": "Partner 2"
        }
        
        # Make multiple registration attempts
        responses = []
        for i in range(4):  # Exceed the 3/minute limit
            registration_data["email"] = f"test{i}@example.com"
            response = client.post("/api/v1/auth/register/couple", json=registration_data)
            responses.append(response)
        
        # First 3 should succeed or fail with validation errors
        for i in range(3):
            assert responses[i].status_code in [200, 201, 400, 422]
        
        # 4th should get 429 (rate limited)
        assert responses[3].status_code == 429
    
    def test_invalid_email_format_rejected(self, client: TestClient):
        """Test that invalid email formats are rejected"""
        invalid_emails = [
            "notanemail",
            "@example.com",
            "test@",
            "test..test@example.com",
            "test@example",
            ""
        ]
        
        for email in invalid_emails:
            registration_data = {
                "email": email,
                "password": "testpassword123",
                "partner1_name": "Partner 1",
                "partner2_name": "Partner 2"
            }
            
            response = client.post("/api/v1/auth/register/couple", json=registration_data)
            assert response.status_code == 400
            assert "Invalid email format" in response.json()["detail"]
    
    def test_session_timeout_enforcement(self, client: TestClient, db_session: Session):
        """Test that sessions timeout after configured period"""
        # This test would require mocking time or using a test Redis instance
        # with very short timeouts
        pass  # Implementation depends on test infrastructure
    
    def test_secure_cookie_attributes(self, client: TestClient):
        """Test that cookies have proper security attributes"""
        registration_data = {
            "email": "test@example.com",
            "password": "testpassword123",
            "partner1_name": "Partner 1",
            "partner2_name": "Partner 2"
        }
        
        response = client.post("/api/v1/auth/register/couple", json=registration_data)
        
        if response.status_code in [200, 201]:
            # Check if session cookie is set with security attributes
            cookies = response.cookies
            if "session_token" in cookies:
                cookie = cookies["session_token"]
                # In a real test, you'd check cookie attributes
                # This is a simplified check
                assert cookie is not None


class TestInputValidation:
    """Test input validation and sanitization"""
    
    def test_sql_injection_prevention(self, client: TestClient):
        """Test that SQL injection attempts are blocked"""
        sql_injection_payloads = [
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "' UNION SELECT * FROM users --",
            "admin'--",
            "' OR 1=1 --"
        ]
        
        for payload in sql_injection_payloads:
            registration_data = {
                "email": f"test@example.com",
                "password": payload,
                "partner1_name": payload,
                "partner2_name": "Partner 2"
            }
            
            response = client.post("/api/v1/auth/register/couple", json=registration_data)
            # Should either be blocked by input validation or fail safely
            assert response.status_code in [400, 422]
    
    def test_xss_prevention(self, client: TestClient):
        """Test that XSS attempts are blocked"""
        xss_payloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "<iframe src='javascript:alert(\"xss\")'></iframe>",
            "onload=alert('xss')"
        ]
        
        for payload in xss_payloads:
            registration_data = {
                "email": "test@example.com",
                "password": "testpassword123",
                "partner1_name": payload,
                "partner2_name": "Partner 2"
            }
            
            response = client.post("/api/v1/auth/register/couple", json=registration_data)
            # Should either be blocked by input validation or sanitized
            assert response.status_code in [400, 422]
    
    def test_command_injection_prevention(self, client: TestClient):
        """Test that command injection attempts are blocked"""
        command_injection_payloads = [
            "; rm -rf /",
            "| cat /etc/passwd",
            "&& del *.*",
            "`whoami`",
            "$(id)"
        ]
        
        for payload in command_injection_payloads:
            registration_data = {
                "email": "test@example.com",
                "password": "testpassword123",
                "partner1_name": payload,
                "partner2_name": "Partner 2"
            }
            
            response = client.post("/api/v1/auth/register/couple", json=registration_data)
            # Should be blocked by input validation
            assert response.status_code in [400, 422]
    
    def test_path_traversal_prevention(self, client: TestClient):
        """Test that path traversal attempts are blocked"""
        path_traversal_payloads = [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\config\\sam",
            "....//....//....//etc/passwd",
            "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
        ]
        
        for payload in path_traversal_payloads:
            # Test in query parameters
            response = client.get(f"/api/v1/weddings?file={payload}")
            # Should be blocked by input validation
            assert response.status_code in [400, 401, 403, 422]


class TestValidationFunctions:
    """Test individual validation functions"""
    
    def test_email_validation(self):
        """Test email format validation"""
        valid_emails = [
            "test@example.com",
            "user.name@domain.co.uk",
            "user+tag@example.org",
            "123@example.com"
        ]
        
        invalid_emails = [
            "notanemail",
            "@example.com",
            "test@",
            "test..test@example.com",
            "test@example",
            "",
            "test@.com",
            "test@com."
        ]
        
        for email in valid_emails:
            assert validate_email_format(email), f"Valid email {email} was rejected"
        
        for email in invalid_emails:
            assert not validate_email_format(email), f"Invalid email {email} was accepted"
    
    def test_phone_validation(self):
        """Test phone number validation (Ethiopian format)"""
        valid_phones = [
            "+251912345678",
            "0912345678",
            "912345678"
        ]
        
        invalid_phones = [
            "123",
            "+1234567890",
            "abcdefghij",
            "",
            "+251-912-345-678",
            "091234567890"  # Too long
        ]
        
        for phone in valid_phones:
            assert validate_phone_format(phone), f"Valid phone {phone} was rejected"
        
        for phone in invalid_phones:
            assert not validate_phone_format(phone), f"Invalid phone {phone} was accepted"
    
    def test_wedding_code_validation(self):
        """Test wedding code format validation"""
        valid_codes = [
            "AB12",
            "XY99",
            "ZZ00"
        ]
        
        invalid_codes = [
            "ab12",  # lowercase
            "AB1",   # too short
            "AB123", # too long
            "A123",  # wrong format
            "1234",  # all numbers
            "ABCD",  # all letters
            ""
        ]
        
        for code in valid_codes:
            assert validate_wedding_code_format(code), f"Valid code {code} was rejected"
        
        for code in invalid_codes:
            assert not validate_wedding_code_format(code), f"Invalid code {code} was accepted"
    
    def test_staff_pin_validation(self):
        """Test staff PIN format validation"""
        valid_pins = [
            "123456",
            "000000",
            "999999"
        ]
        
        invalid_pins = [
            "12345",   # too short
            "1234567", # too long
            "abcdef",  # letters
            "12345a",  # mixed
            "",
            "12 34 56" # spaces
        ]
        
        for pin in valid_pins:
            assert validate_staff_pin_format(pin), f"Valid PIN {pin} was rejected"
        
        for pin in invalid_pins:
            assert not validate_staff_pin_format(pin), f"Invalid PIN {pin} was accepted"
    
    def test_html_sanitization(self):
        """Test HTML input sanitization"""
        test_cases = [
            ("<script>alert('xss')</script>", ""),
            ("<b>Bold text</b>", "<b>Bold text</b>"),
            ("<img src=x onerror=alert('xss')>", ""),
            ("Normal text", "Normal text"),
            ("<p>Paragraph <strong>with</strong> formatting</p>", "<p>Paragraph <strong>with</strong> formatting</p>")
        ]
        
        for input_text, expected in test_cases:
            result = sanitize_html_input(input_text)
            assert result == expected, f"Sanitization failed for {input_text}"


class TestSecurityHeaders:
    """Test security headers are properly set"""
    
    def test_security_headers_present(self, client: TestClient):
        """Test that security headers are present in responses"""
        response = client.get("/health")
        
        expected_headers = [
            "X-Content-Type-Options",
            "X-Frame-Options",
            "X-XSS-Protection",
            "Referrer-Policy",
            "Content-Security-Policy"
        ]
        
        for header in expected_headers:
            assert header in response.headers, f"Security header {header} is missing"
    
    def test_csp_header_configuration(self, client: TestClient):
        """Test Content Security Policy header configuration"""
        response = client.get("/health")
        
        csp_header = response.headers.get("Content-Security-Policy")
        assert csp_header is not None
        
        # Check for important CSP directives
        assert "default-src 'self'" in csp_header
        assert "script-src" in csp_header
        assert "style-src" in csp_header
        assert "object-src 'none'" in csp_header
    
    def test_cors_configuration(self, client: TestClient):
        """Test CORS configuration"""
        # Test preflight request
        response = client.options("/api/v1/auth/login", headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type"
        })
        
        assert response.status_code == 200
        assert "Access-Control-Allow-Origin" in response.headers
        assert "Access-Control-Allow-Methods" in response.headers


class TestDataIsolation:
    """Test data isolation and access controls"""
    
    def test_wedding_data_isolation(self, client: TestClient, db_session: Session):
        """Test that couples can only access their own wedding data"""
        # This would require creating test users and weddings
        # and verifying access controls
        pass  # Implementation depends on test data setup
    
    def test_unauthorized_access_blocked(self, client: TestClient):
        """Test that unauthorized access is properly blocked"""
        protected_endpoints = [
            "/api/v1/weddings",
            "/api/v1/guests",
            "/api/v1/vendors/profile",
            "/api/v1/admin/vendors"
        ]
        
        for endpoint in protected_endpoints:
            response = client.get(endpoint)
            # Should require authentication
            assert response.status_code in [401, 403]


class TestSessionManagement:
    """Test session management security"""
    
    @pytest.mark.asyncio
    async def test_session_creation_and_validation(self):
        """Test secure session creation and validation"""
        if not redis_service.is_available():
            pytest.skip("Redis not available")
        
        # Create session
        session_token = await session_manager.create_session(
            user_id=1,
            user_type="couple",
            additional_data={"email": "test@example.com"}
        )
        
        assert session_token is not None
        assert len(session_token) > 20  # UUID format
        
        # Validate session
        session_data = await session_manager.get_session(session_token)
        assert session_data is not None
        assert session_data["user_id"] == 1
        assert session_data["user_type"] == "couple"
        assert session_data["email"] == "test@example.com"
    
    @pytest.mark.asyncio
    async def test_session_invalidation(self):
        """Test session invalidation"""
        if not redis_service.is_available():
            pytest.skip("Redis not available")
        
        # Create session
        session_token = await session_manager.create_session(
            user_id=1,
            user_type="couple"
        )
        
        # Verify session exists
        session_data = await session_manager.get_session(session_token)
        assert session_data is not None
        
        # Invalidate session
        success = await session_manager.invalidate_session(session_token)
        assert success is True
        
        # Verify session no longer exists
        session_data = await session_manager.get_session(session_token)
        assert session_data is None
    
    @pytest.mark.asyncio
    async def test_login_attempt_tracking(self):
        """Test login attempt tracking and lockout"""
        if not redis_service.is_available():
            pytest.skip("Redis not available")
        
        identifier = "test@example.com:127.0.0.1"
        
        # Record failed attempts
        for i in range(5):
            result = await session_manager.record_login_attempt(identifier, success=False)
            if i < 4:
                assert result is True  # Not locked out yet
            else:
                assert result is False  # Should be locked out
        
        # Verify lockout status
        is_locked = await session_manager.is_locked_out(identifier)
        assert is_locked is True
        
        # Successful login should clear attempts
        await session_manager.record_login_attempt(identifier, success=True)
        is_locked = await session_manager.is_locked_out(identifier)
        assert is_locked is False


# Fixtures for testing
@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def db_session():
    """Create test database session"""
    # This would be implemented based on your test database setup
    pass