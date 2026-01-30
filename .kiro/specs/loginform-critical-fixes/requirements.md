# Requirements Document

## Introduction

This document specifies the requirements for fixing critical bugs in the LoginForm authentication component. The LoginForm currently has several issues that prevent proper authentication flow, including improper state management, outdated validation patterns, unsafe DOM manipulation, inconsistent 2FA handling, and missing keyboard accessibility features.

## Glossary

- **LoginForm**: The React component responsible for user authentication via email or phone
- **AuthContext**: The global authentication state management context that provides sign-in methods and manages user state
- **2FA**: Two-Factor Authentication - additional security verification step
- **OTP**: One-Time Password - temporary code used for verification
- **JWT**: JSON Web Token - authentication token stored in localStorage
- **Identifier**: User's email address or phone number used for authentication

## Requirements

### Requirement 1: AuthContext Integration

**User Story:** As a developer, I want the LoginForm to use AuthContext methods for all authentication operations, so that the application state remains consistent and users are properly authenticated.

#### Acceptance Criteria

1. WHEN a user successfully logs in with email, THE LoginForm SHALL use AuthContext methods to update the global authentication state
2. WHEN a user successfully logs in with phone, THE LoginForm SHALL use AuthContext methods to update the global authentication state
3. WHEN authentication state is updated, THE LoginForm SHALL NOT manually manipulate localStorage for user data
4. WHEN storing JWT tokens, THE LoginForm SHALL use the 'jwt_token' key instead of 'access_token'
5. WHEN a login operation completes, THE AuthContext SHALL automatically handle token storage and user state updates

### Requirement 2: Phone Number Validation

**User Story:** As a user with an Ethiopian phone number, I want to be able to log in using numbers with both 07 and 09 prefixes, so that I can access the system regardless of my mobile carrier.

#### Acceptance Criteria

1. WHEN a user enters a phone number starting with +25179, THE LoginForm SHALL accept it as valid
2. WHEN a user enters a phone number starting with +25109, THE LoginForm SHALL accept it as valid
3. WHEN a user enters a phone number starting with 079, THE LoginForm SHALL accept it as valid
4. WHEN a user enters a phone number starting with 099, THE LoginForm SHALL accept it as valid
5. WHEN a user enters a phone number with an invalid prefix (not 07 or 09), THE LoginForm SHALL reject it with a clear error message

### Requirement 3: Safe OTP Input Navigation

**User Story:** As a user entering an OTP code, I want the focus to automatically move to the next input field, so that I can quickly complete the verification process without manual navigation.

#### Acceptance Criteria

1. WHEN a user enters a digit in an OTP input field, THE LoginForm SHALL move focus to the next input element using safe DOM methods
2. WHEN navigating between OTP inputs, THE LoginForm SHALL NOT use nextSibling property
3. WHEN navigating between OTP inputs, THE LoginForm SHALL use either index-based navigation or nextElementSibling
4. WHEN the last OTP digit is entered, THE LoginForm SHALL NOT attempt to focus a non-existent element
5. WHEN an OTP input receives a non-numeric character, THE LoginForm SHALL reject the input and maintain current focus

### Requirement 4: Consistent 2FA Handling

**User Story:** As a user, I want a consistent authentication experience regardless of whether I use email or phone login, so that the system behavior is predictable and reliable.

#### Acceptance Criteria

1. WHEN a user logs in with email and 2FA is required, THE LoginForm SHALL use the same authentication flow pattern as phone login
2. WHEN a user logs in with phone and 2FA is required, THE LoginForm SHALL use the same authentication flow pattern as email login
3. WHEN checking for 2FA requirements, THE LoginForm SHALL use AuthContext methods instead of direct API calls
4. WHEN 2FA is not required, THE LoginForm SHALL complete authentication using AuthContext methods
5. WHEN 2FA verification completes, THE LoginForm SHALL use AuthContext's signInWith2FA method to finalize authentication

### Requirement 5: Keyboard Accessibility for OTP

**User Story:** As a user entering an OTP code, I want to press Enter to submit the verification, so that I can complete authentication efficiently using only the keyboard.

#### Acceptance Criteria

1. WHEN OTP inputs are displayed in TWO_FACTOR mode, THE LoginForm SHALL wrap them in a form element
2. WHEN OTP inputs are displayed in FORGOT_VERIFY mode, THE LoginForm SHALL wrap them in a form element
3. WHEN a user presses Enter in an OTP input field, THE LoginForm SHALL trigger the verification handler
4. WHEN the form is submitted via Enter key, THE LoginForm SHALL prevent default form submission behavior
5. WHEN all OTP digits are entered and Enter is pressed, THE LoginForm SHALL call the appropriate verification function

### Requirement 6: Error Handling Consistency

**User Story:** As a user encountering authentication errors, I want clear and consistent error messages, so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN an authentication error occurs in email login, THE LoginForm SHALL display a user-friendly error message
2. WHEN an authentication error occurs in phone login, THE LoginForm SHALL display a user-friendly error message with the same format as email errors
3. WHEN a network error occurs during authentication, THE LoginForm SHALL distinguish it from validation errors
4. WHEN AuthContext methods throw errors, THE LoginForm SHALL catch and display them appropriately
5. WHEN 2FA verification fails, THE LoginForm SHALL display a specific error message indicating verification failure

### Requirement 7: Token Storage Standardization

**User Story:** As a system administrator, I want consistent token storage across all authentication methods, so that the application can reliably verify user sessions.

#### Acceptance Criteria

1. WHEN any authentication method succeeds, THE AuthContext SHALL store the JWT token using the 'jwt_token' localStorage key
2. WHEN the LoginForm completes authentication, THE LoginForm SHALL NOT directly access localStorage for token storage
3. WHEN checking authentication status, THE application SHALL read from the 'jwt_token' localStorage key
4. WHEN a user logs out, THE AuthContext SHALL remove the token from the 'jwt_token' localStorage key
5. WHEN migrating from old token storage, THE system SHALL handle both 'access_token' and 'jwt_token' keys gracefully during a transition period

### Requirement 8: Phone Login Flow Correction

**User Story:** As a user logging in with a phone number, I want the authentication to work correctly without premature 2FA checks, so that I can successfully access my account.

#### Acceptance Criteria

1. WHEN a user submits phone credentials, THE LoginForm SHALL use AuthContext's signInWithPhone method
2. WHEN signInWithPhone returns requires2FA as true, THE LoginForm SHALL transition to TWO_FACTOR mode
3. WHEN signInWithPhone returns a user object without requires2FA, THE LoginForm SHALL complete authentication immediately
4. WHEN in TWO_FACTOR mode with phone login, THE LoginForm SHALL use AuthContext's signInWith2FA method for verification
5. WHEN phone login does not require 2FA, THE LoginForm SHALL NOT call any separate 2FA check endpoints
