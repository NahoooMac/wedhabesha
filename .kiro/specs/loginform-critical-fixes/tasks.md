# Implementation Plan: LoginForm Critical Fixes

## Overview

This implementation plan addresses five critical bugs in the LoginForm.tsx component through systematic fixes that ensure proper AuthContext integration, updated validation patterns, safe DOM manipulation, consistent authentication flows, and keyboard accessibility. Each task builds incrementally to maintain a working state throughout the implementation.

## Current Implementation Status

**Completed:**
- ✅ Phone validation regex updated to support 07 and 09 prefixes
- ✅ Property-based tests for phone validation (100+ iterations)
- ✅ Unit tests for phone validation examples
- ✅ OTP navigation uses safe DOM methods (getElementById with boundary checks)
- ✅ LoginForm imports useAuth hook from AuthContext

**In Progress / Needs Work:**
- ❌ OTP inputs NOT wrapped in form elements (no Enter key support)
- ❌ LoginForm still uses direct API calls instead of AuthContext methods
- ❌ LoginForm still uses 'access_token' localStorage key instead of 'jwt_token'
- ❌ Missing property tests for OTP navigation, 2FA flow, and error handling
- ❌ Missing unit tests for various edge cases
- ❌ AuthContext doesn't have signInWithEmail method (only signInWithPhone and signInWith2FA)

**Key Findings:**
- AuthContext already has `signInWithPhone` and `signInWith2FA` methods
- AuthContext uses 'jwt_token' localStorage key (correct)
- LoginForm currently bypasses AuthContext and uses direct API calls
- LoginForm uses 'access_token' key which conflicts with AuthContext's 'jwt_token'

## Tasks

- [x] 1. Update phone number validation regex
  - Modify the phoneRegex constant from `/^(\+251|0)[9][0-9]{8}$/` to `/^(\+251|0)[79][0-9]{8}$/`
  - Update any related validation logic to use the new regex
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 1.1 Write property test for phone validation
  - **Property 3: Phone Number Validation with 07 and 09 Prefixes**
  - **Validates: Requirements 2.5**

- [x] 1.2 Write unit tests for phone validation examples
  - Test specific formats: +25179XXXXXXXX, +25109XXXXXXXX, 079XXXXXXXX, 099XXXXXXXX
  - Test rejection of invalid prefixes (08, 06, etc.)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. Fix OTP input navigation to use safe DOM methods
  - Add unique IDs to each OTP input element: `id={otp-input-${index}}`
  - Modify handleOtpChange function to use getElementById instead of nextSibling
  - Add boundary check to prevent focusing non-existent element at index 5
  - _Requirements: 3.1, 3.4, 3.5_

- [x] 2.1 Write property test for OTP navigation
  - **Property 4: Safe OTP Input Navigation**
  - **Validates: Requirements 3.1**

- [x] 2.2 Write property test for OTP non-numeric rejection
  - **Property 5: OTP Non-Numeric Input Rejection**
  - **Validates: Requirements 3.5**

- [x] 2.3 Write unit test for last OTP input edge case
  - Test that entering a digit in the last OTP input (index 5) doesn't cause errors
  - _Requirements: 3.4_

- [x] 3. Add form wrapper and Enter key support for OTP inputs
  - Create handleOtpSubmit function that prevents default and calls appropriate verification handler
  - Wrap OTP inputs in TWO_FACTOR mode with `<form onSubmit={handleOtpSubmit}>`
  - Wrap OTP inputs in FORGOT_VERIFY mode with `<form onSubmit={handleOtpSubmit}>`
  - Ensure submit button has type="submit"
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 3.1 Write property test for Enter key verification trigger
  - **Property 9: Enter Key Triggers Verification**
  - **Validates: Requirements 5.3, 5.4**

- [x] 3.2 Write unit test for complete OTP + Enter submission
  - Test that with all 6 OTP digits entered, pressing Enter calls verification
  - _Requirements: 5.5_

- [x] 4. Checkpoint - Verify UI improvements
  - Ensure all tests pass for phone validation, OTP navigation, and keyboard accessibility
  - Manually test phone number input with 07 and 09 prefixes
  - Manually test OTP input navigation and Enter key submission
  - Ask the user if questions arise

- [x] 4.1 Add signInWithEmail method to AuthContext
  - Add signInWithEmail method to AuthContext interface
  - Implement signInWithEmail in AuthProvider (similar to signInWithPhone)
  - Method should check for 2FA requirement and return { user?, requires2FA? }
  - Store token using 'jwt_token' key (not 'access_token')
  - _Requirements: 1.1, 1.3, 4.1, 7.1_

- [x] 5. Refactor email login to use AuthContext methods
  - Replace direct API call in email login flow with AuthContext.signInWithEmail method (from task 4.1)
  - Remove localStorage.setItem('access_token', ...) from email login
  - Handle requires2FA response by transitioning to TWO_FACTOR mode
  - Update error handling to catch AuthContext errors
  - _Requirements: 1.1, 1.3, 4.1, 4.3, 6.1, 6.4_

- [x] 5.1 Write property test for email AuthContext integration
  - **Property 1: AuthContext Integration for Email Login**
  - **Validates: Requirements 1.1, 1.3**

- [x] 5.2 Write unit test for email authentication errors
  - Test error display for invalid credentials
  - Test error display for network failures
  - _Requirements: 6.1, 6.4_

- [x] 6. Refactor phone login to use AuthContext methods
  - Replace direct API call to /check-2fa with AuthContext.signInWithPhone (already exists in AuthContext)
  - Remove localStorage.setItem('access_token', ...) from phone login (AuthContext handles this)
  - Handle requires2FA response by transitioning to TWO_FACTOR mode
  - Handle successful login without 2FA (AuthContext updates state automatically)
  - Update error handling to catch AuthContext errors
  - _Requirements: 1.2, 1.3, 4.2, 4.3, 8.1, 8.2, 8.3, 8.5_

- [x] 6.1 Write property test for phone AuthContext integration
  - **Property 2: AuthContext Integration for Phone Login**
  - **Validates: Requirements 1.2, 1.3, 8.1**

- [x] 6.2 Write property test for consistent 2FA flow
  - **Property 6: Consistent 2FA Flow Pattern**
  - **Validates: Requirements 4.1, 4.2, 8.2**

- [x] 6.3 Write property test for no direct API calls
  - **Property 7: No Direct API Calls**
  - **Validates: Requirements 4.3, 8.5**

- [x] 6.4 Write unit test for phone authentication errors
  - Test error display for invalid credentials
  - Test error display for network failures
  - _Requirements: 6.2, 6.4_

- [x] 7. Update 2FA verification to use AuthContext.signInWith2FA
  - Modify handle2FAVerification function to call AuthContext.signInWith2FA (already exists in AuthContext)
  - Pass phone, password, and OTP token to signInWith2FA
  - Remove manual localStorage manipulation (AuthContext handles this with 'jwt_token')
  - Remove manual onSuccess callback (AuthContext handles state updates)
  - Update error handling for 2FA-specific errors
  - _Requirements: 4.5, 6.5, 8.4_

- [x] 7.1 Write property test for 2FA verification method
  - **Property 8: 2FA Verification Method Usage**
  - **Validates: Requirements 4.5, 8.4**

- [x] 7.2 Write unit test for 2FA verification error
  - Test specific error message for failed 2FA verification
  - _Requirements: 6.5_

- [x] 8. Standardize error handling across all authentication flows
  - Create error categorization logic (network, validation, authentication, 2FA)
  - Ensure consistent error message format for email and phone login
  - Add error type distinction in displayed messages
  - Ensure all AuthContext errors are caught and displayed
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 8.1 Write property test for error message consistency
  - **Property 10: Error Message Display Consistency**
  - **Validates: Requirements 6.1, 6.2**

- [x] 8.2 Write property test for error type distinction
  - **Property 11: Error Type Distinction**
  - **Validates: Requirements 6.3**

- [x] 8.3 Write property test for AuthContext error handling
  - **Property 12: AuthContext Error Handling**
  - **Validates: Requirements 6.4**

- [x] 9. Final checkpoint - Comprehensive testing
  - Run all unit tests and property tests
  - Verify all 12 correctness properties pass with 100+ iterations
  - Manually test complete authentication flows (email, phone, 2FA)
  - Verify no direct localStorage manipulation by LoginForm
  - Verify AuthContext properly updates global state
  - Test error scenarios (invalid credentials, network errors, 2FA failures)
  - Ask the user if questions arise

- [x] 10. Code cleanup and documentation
  - Remove any commented-out old code
  - Add JSDoc comments to modified functions
  - Update component documentation to reflect AuthContext usage
  - Verify no console.log statements remain
  - _Requirements: All_

## Notes

- Each task references specific requirements for traceability
- Property tests should run with minimum 100 iterations using fast-check library
- All authentication operations must go through AuthContext, never direct API calls
- LoginForm should never directly manipulate localStorage for tokens or user data
- The 'jwt_token' localStorage key is managed by AuthContext, not LoginForm
