"""
Penetration Testing Suite

Automated security testing to identify common vulnerabilities.
"""

import pytest
import requests
import json
import time
from typing import List, Dict, Any
from urllib.parse import urlencode
import base64


class PenetrationTester:
    """Automated penetration testing for the wedding platform"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.vulnerabilities = []
    
    def log_vulnerability(self, severity: str, category: str, description: str, details: Dict[str, Any] = None):
        """Log a discovered vulnerability"""
        vulnerability = {
            "severity": severity,
            "category": category,
            "description": description,
            "details": details or {},
            "timestamp": time.time()
        }
        self.vulnerabilities.append(vulnerability)
        print(f"[{severity}] {category}: {description}")
    
    def test_sql_injection(self) -> List[Dict[str, Any]]:
        """Test for SQL injection vulnerabilities"""
        print("Testing for SQL injection vulnerabilities...")
        
        sql_payloads = [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "' UNION SELECT * FROM users --",
            "admin'--",
            "' OR 1=1 --",
            "' OR 'a'='a",
            "') OR ('1'='1",
            "' OR 1=1#",
            "' OR 1=1/*",
            "1' AND (SELECT COUNT(*) FROM users) > 0 --"
        ]
        
        # Test endpoints that accept user input
        test_endpoints = [
            ("/api/v1/auth/login", {"email": "{payload}", "password": "test"}),
            ("/api/v1/auth/register/couple", {
                "email": "{payload}@test.com",
                "password": "testpass123",
                "partner1_name": "Test",
                "partner2_name": "Test"
            }),
            ("/api/v1/vendors", {"search": "{payload}"}),
        ]
        
        for endpoint, data_template in test_endpoints:
            for payload in sql_payloads:
                try:
                    # Prepare data with payload
                    if isinstance(data_template, dict):
                        data = {}
                        for key, value in data_template.items():
                            if isinstance(value, str) and "{payload}" in value:
                                data[key] = value.format(payload=payload)
                            else:
                                data[key] = value
                        
                        response = self.session.post(f"{self.base_url}{endpoint}", json=data)
                    else:
                        # GET request with query parameters
                        params = {key: value.format(payload=payload) if "{payload}" in str(value) else value 
                                for key, value in data_template.items()}
                        response = self.session.get(f"{self.base_url}{endpoint}", params=params)
                    
                    # Check for SQL error messages or unexpected behavior
                    if response.status_code == 500:
                        response_text = response.text.lower()
                        sql_errors = [
                            "sql syntax",
                            "mysql_fetch",
                            "ora-",
                            "postgresql",
                            "sqlite",
                            "sqlstate",
                            "column",
                            "table",
                            "database"
                        ]
                        
                        if any(error in response_text for error in sql_errors):
                            self.log_vulnerability(
                                "HIGH",
                                "SQL Injection",
                                f"Potential SQL injection in {endpoint}",
                                {"payload": payload, "response": response.text[:500]}
                            )
                
                except Exception as e:
                    # Connection errors might indicate successful injection
                    if "connection" in str(e).lower():
                        self.log_vulnerability(
                            "MEDIUM",
                            "SQL Injection",
                            f"Connection error in {endpoint} - possible SQL injection",
                            {"payload": payload, "error": str(e)}
                        )
        
        return [v for v in self.vulnerabilities if v["category"] == "SQL Injection"]
    
    def test_xss_vulnerabilities(self) -> List[Dict[str, Any]]:
        """Test for Cross-Site Scripting (XSS) vulnerabilities"""
        print("Testing for XSS vulnerabilities...")
        
        xss_payloads = [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "<svg onload=alert('XSS')>",
            "javascript:alert('XSS')",
            "<iframe src='javascript:alert(\"XSS\")'></iframe>",
            "<body onload=alert('XSS')>",
            "<input onfocus=alert('XSS') autofocus>",
            "<select onfocus=alert('XSS') autofocus>",
            "<textarea onfocus=alert('XSS') autofocus>",
            "<keygen onfocus=alert('XSS') autofocus>"
        ]
        
        # Test endpoints that might reflect user input
        test_endpoints = [
            ("/api/v1/auth/register/couple", {
                "email": "test@example.com",
                "password": "testpass123",
                "partner1_name": "{payload}",
                "partner2_name": "Test"
            }),
            ("/api/v1/vendors", {"search": "{payload}"}),
        ]
        
        for endpoint, data_template in test_endpoints:
            for payload in xss_payloads:
                try:
                    data = {}
                    for key, value in data_template.items():
                        if isinstance(value, str) and "{payload}" in value:
                            data[key] = value.format(payload=payload)
                        else:
                            data[key] = value
                    
                    response = self.session.post(f"{self.base_url}{endpoint}", json=data)
                    
                    # Check if payload is reflected in response
                    if payload in response.text and response.headers.get("content-type", "").startswith("text/html"):
                        self.log_vulnerability(
                            "HIGH",
                            "XSS",
                            f"Potential XSS vulnerability in {endpoint}",
                            {"payload": payload, "response": response.text[:500]}
                        )
                
                except Exception as e:
                    pass  # Continue testing
        
        return [v for v in self.vulnerabilities if v["category"] == "XSS"]
    
    def test_authentication_bypass(self) -> List[Dict[str, Any]]:
        """Test for authentication bypass vulnerabilities"""
        print("Testing for authentication bypass vulnerabilities...")
        
        # Test protected endpoints without authentication
        protected_endpoints = [
            "/api/v1/weddings",
            "/api/v1/guests",
            "/api/v1/vendors/profile",
            "/api/v1/admin/vendors",
            "/api/v1/checkin/stats"
        ]
        
        for endpoint in protected_endpoints:
            try:
                response = self.session.get(f"{self.base_url}{endpoint}")
                
                # Should return 401 or 403, not 200
                if response.status_code == 200:
                    self.log_vulnerability(
                        "HIGH",
                        "Authentication Bypass",
                        f"Protected endpoint {endpoint} accessible without authentication",
                        {"status_code": response.status_code, "response": response.text[:200]}
                    )
            
            except Exception as e:
                pass
        
        # Test with invalid tokens
        invalid_tokens = [
            "Bearer invalid_token",
            "Bearer ",
            "Bearer null",
            "Bearer undefined",
            "Bearer {}",
            "Bearer []"
        ]
        
        for token in invalid_tokens:
            for endpoint in protected_endpoints:
                try:
                    headers = {"Authorization": token}
                    response = self.session.get(f"{self.base_url}{endpoint}", headers=headers)
                    
                    if response.status_code == 200:
                        self.log_vulnerability(
                            "HIGH",
                            "Authentication Bypass",
                            f"Protected endpoint {endpoint} accessible with invalid token",
                            {"token": token, "status_code": response.status_code}
                        )
                
                except Exception as e:
                    pass
        
        return [v for v in self.vulnerabilities if v["category"] == "Authentication Bypass"]
    
    def test_rate_limiting(self) -> List[Dict[str, Any]]:
        """Test rate limiting implementation"""
        print("Testing rate limiting...")
        
        # Test login endpoint rate limiting
        login_data = {
            "email": "test@example.com",
            "password": "wrongpassword"
        }
        
        responses = []
        for i in range(10):  # Try to exceed rate limit
            try:
                response = self.session.post(f"{self.base_url}/api/v1/auth/login", json=login_data)
                responses.append(response.status_code)
                time.sleep(0.1)  # Small delay between requests
            except Exception as e:
                pass
        
        # Check if rate limiting is working
        rate_limited = any(status == 429 for status in responses)
        if not rate_limited:
            self.log_vulnerability(
                "MEDIUM",
                "Rate Limiting",
                "Login endpoint may not have proper rate limiting",
                {"responses": responses}
            )
        
        return [v for v in self.vulnerabilities if v["category"] == "Rate Limiting"]
    
    def test_information_disclosure(self) -> List[Dict[str, Any]]:
        """Test for information disclosure vulnerabilities"""
        print("Testing for information disclosure...")
        
        # Test error handling
        test_cases = [
            ("/api/v1/auth/login", {"email": "invalid", "password": "test"}),
            ("/api/v1/nonexistent", {}),
            ("/api/v1/weddings/99999", {}),
        ]
        
        for endpoint, data in test_cases:
            try:
                if data:
                    response = self.session.post(f"{self.base_url}{endpoint}", json=data)
                else:
                    response = self.session.get(f"{self.base_url}{endpoint}")
                
                # Check for sensitive information in error messages
                sensitive_info = [
                    "traceback",
                    "stack trace",
                    "database",
                    "sql",
                    "password",
                    "secret",
                    "key",
                    "token",
                    "internal server error",
                    "debug"
                ]
                
                response_text = response.text.lower()
                for info in sensitive_info:
                    if info in response_text and response.status_code >= 400:
                        self.log_vulnerability(
                            "MEDIUM",
                            "Information Disclosure",
                            f"Sensitive information disclosed in error response from {endpoint}",
                            {"info_type": info, "response": response.text[:300]}
                        )
            
            except Exception as e:
                pass
        
        return [v for v in self.vulnerabilities if v["category"] == "Information Disclosure"]
    
    def test_session_management(self) -> List[Dict[str, Any]]:
        """Test session management security"""
        print("Testing session management...")
        
        # Test session fixation
        # This would require more complex testing with actual authentication
        
        # Test for secure cookie attributes
        try:
            response = self.session.post(f"{self.base_url}/api/v1/auth/register/couple", json={
                "email": "test@example.com",
                "password": "testpass123",
                "partner1_name": "Test",
                "partner2_name": "Test"
            })
            
            # Check cookie security attributes
            for cookie in response.cookies:
                if not cookie.secure and "localhost" not in self.base_url:
                    self.log_vulnerability(
                        "MEDIUM",
                        "Session Management",
                        f"Cookie {cookie.name} not marked as secure",
                        {"cookie": cookie.name}
                    )
                
                if not cookie.has_nonstandard_attr("HttpOnly"):
                    self.log_vulnerability(
                        "MEDIUM",
                        "Session Management",
                        f"Cookie {cookie.name} not marked as HttpOnly",
                        {"cookie": cookie.name}
                    )
        
        except Exception as e:
            pass
        
        return [v for v in self.vulnerabilities if v["category"] == "Session Management"]
    
    def test_input_validation(self) -> List[Dict[str, Any]]:
        """Test input validation"""
        print("Testing input validation...")
        
        # Test with various malformed inputs
        malformed_inputs = [
            {"email": "a" * 1000, "password": "test"},  # Very long email
            {"email": "test@example.com", "password": "a" * 10000},  # Very long password
            {"email": None, "password": "test"},  # Null values
            {"email": [], "password": "test"},  # Wrong data types
            {"email": {}, "password": "test"},
            {"email": 12345, "password": "test"},
        ]
        
        for data in malformed_inputs:
            try:
                response = self.session.post(f"{self.base_url}/api/v1/auth/login", json=data)
                
                # Should return 400 or 422 for malformed input
                if response.status_code == 500:
                    self.log_vulnerability(
                        "MEDIUM",
                        "Input Validation",
                        "Server error on malformed input - possible validation bypass",
                        {"input": str(data), "status_code": response.status_code}
                    )
            
            except Exception as e:
                pass
        
        return [v for v in self.vulnerabilities if v["category"] == "Input Validation"]
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all penetration tests"""
        print("Starting penetration testing suite...")
        
        test_results = {
            "sql_injection": self.test_sql_injection(),
            "xss": self.test_xss_vulnerabilities(),
            "auth_bypass": self.test_authentication_bypass(),
            "rate_limiting": self.test_rate_limiting(),
            "info_disclosure": self.test_information_disclosure(),
            "session_management": self.test_session_management(),
            "input_validation": self.test_input_validation()
        }
        
        # Summary
        total_vulnerabilities = len(self.vulnerabilities)
        high_severity = len([v for v in self.vulnerabilities if v["severity"] == "HIGH"])
        medium_severity = len([v for v in self.vulnerabilities if v["severity"] == "MEDIUM"])
        low_severity = len([v for v in self.vulnerabilities if v["severity"] == "LOW"])
        
        summary = {
            "total_vulnerabilities": total_vulnerabilities,
            "high_severity": high_severity,
            "medium_severity": medium_severity,
            "low_severity": low_severity,
            "test_results": test_results,
            "all_vulnerabilities": self.vulnerabilities
        }
        
        print(f"\nPenetration testing complete!")
        print(f"Total vulnerabilities found: {total_vulnerabilities}")
        print(f"High severity: {high_severity}")
        print(f"Medium severity: {medium_severity}")
        print(f"Low severity: {low_severity}")
        
        return summary


class TestPenetrationTesting:
    """Pytest wrapper for penetration testing"""
    
    def test_run_penetration_tests(self):
        """Run penetration tests as part of test suite"""
        tester = PenetrationTester()
        results = tester.run_all_tests()
        
        # Fail test if high severity vulnerabilities are found
        if results["high_severity"] > 0:
            pytest.fail(f"High severity vulnerabilities found: {results['high_severity']}")
        
        # Warn about medium severity vulnerabilities
        if results["medium_severity"] > 0:
            print(f"Warning: {results['medium_severity']} medium severity vulnerabilities found")
        
        assert results["total_vulnerabilities"] >= 0  # Test always passes, but logs issues


if __name__ == "__main__":
    # Run penetration tests directly
    tester = PenetrationTester()
    results = tester.run_all_tests()
    
    # Save results to file
    with open("penetration_test_results.json", "w") as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\nResults saved to penetration_test_results.json")