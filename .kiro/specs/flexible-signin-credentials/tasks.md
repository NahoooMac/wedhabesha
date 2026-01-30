# Implementation Plan: Flexible Signin Credentials

## Overview

This implementation plan converts the flexible signin credentials design into discrete coding tasks. The approach focuses on enhancing the existing authentication system to support both email and phone number signin through a unified input field, while maintaining backward compatibility and integrating with existing 2FA flows.

## Tasks

- [ ] 1. Create credential detection utility
  - Create `src/utils/credentialDetector.ts` with detection and validation logic
  - Implement email format validation using standard regex patterns
  - Implement phone number format validation supporting international formats
  - Add input normalization functions for phone numbers
  - _Requirements: 1.2, 4.1, 4.2, 4.4, 4.5_

  - [ ]* 1.1 Write property tests for credential detection
    - **Property 1: Credential Detection Accuracy**
    - **Validates: Requirements 1.2, 4.1, 4.2, 4.5**

  - [ ]* 1.2 Write unit tests for credential detection edge cases
    - Test specific email and phone formats
    - Test international phone number variations
    - _Requirements: 4.4, 4.5_

- [ ] 2. Enhance backend authentication endpoint
  - Modify `backend-node/routes/auth.js` to support unified credential input
  - Update login validation to handle both email and phone inputs
  - Implement credential type detection in backend
  - Add database lookup logic for both email and phone credentials
  - _Requirements: 2.1, 3.1, 2.2, 3.2_

  - [ ]* 2.1 Write property tests for authentication routing
    - **Property 3: Authentication Routing**
    - **Validates: Requirements 2.1, 3.1**

  - [ ]* 2.2 Write property tests for input validation consistency
    - **Property 2: Input Validation Consistency**
    - **Validates: Requirements 1.1, 2.2, 3.2**

- [ ] 3. Update frontend LoginForm component
  - Modify `frontend/src/components/auth/LoginForm.tsx` to use unified credential input
  - Replace separate phone field with unified credential field
  - Add real-time credential type detection and visual feedback
  - Update form validation schema to handle both credential types
  - _Requirements: 1.1, 1.4, 6.1_

  - [ ]* 3.1 Write property tests for UI state management
    - **Property 7: UI State Management**
    - **Validates: Requirements 1.4, 6.1, 6.2, 6.5**

  - [ ]* 3.2 Write unit tests for form component behavior
    - Test credential type switching
    - Test visual feedback display
    - _Requirements: 1.4, 6.1_

- [ ] 4. Update authentication context
  - Modify `frontend/src/contexts/AuthContext.tsx` to support unified signin
  - Update `signInWithPhone` method to handle both email and phone credentials
  - Maintain backward compatibility with existing method signatures
  - _Requirements: 2.4_

  - [ ]* 4.1 Write property tests for backward compatibility
    - **Property 6: Backward Compatibility**
    - **Validates: Requirements 2.4**

- [ ] 5. Enhance error handling and messaging
  - Update error message handling in both frontend and backend
  - Ensure consistent error messages across credential types
  - Add specific validation messages for invalid credential formats
  - _Requirements: 1.3, 2.3, 3.4, 6.3_

  - [ ]* 5.1 Write property tests for error handling consistency
    - **Property 4: Error Handling Consistency**
    - **Validates: Requirements 2.3, 3.4, 6.3**

  - [ ]* 5.2 Write property tests for invalid input handling
    - **Property 10: Invalid Input Handling**
    - **Validates: Requirements 1.3, 4.3**

- [ ] 6. Checkpoint - Test basic authentication flows
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Integrate with 2FA system
  - Update 2FA flow to work with both email and phone signin credentials
  - Ensure SMS 2FA triggers for phone signin and email 2FA for email signin
  - Maintain credential type context throughout 2FA flow
  - Test integration with existing `TwoFactorVerificationModal`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 7.1 Write property tests for 2FA integration
    - **Property 5: 2FA Integration**
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [ ]* 7.2 Write unit tests for 2FA flow scenarios
    - Test 2FA method selection based on signin credential
    - Test 2FA error recovery flows
    - _Requirements: 5.4, 5.5_

- [ ] 8. Implement security enhancements
  - Add credential type logging to authentication attempts
  - Ensure rate limiting applies consistently across credential types
  - Implement input sanitization for phone number processing
  - Update security event logging with credential type information
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 8.1 Write property tests for security consistency
    - **Property 8: Security Consistency**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

  - [ ]* 8.2 Write unit tests for security logging
    - Test audit log entries contain credential type
    - Test rate limiting behavior
    - _Requirements: 7.3, 7.1_

- [ ] 9. Add international phone number support
  - Enhance phone number validation to support international formats
  - Add phone number normalization for database storage and lookup
  - Update UI to show international format examples
  - _Requirements: 3.5, 4.4_

  - [ ]* 9.1 Write property tests for international phone support
    - **Property 9: International Phone Support**
    - **Validates: Requirements 3.5, 4.4**

  - [ ]* 9.2 Write unit tests for specific international formats
    - Test common international phone formats
    - Test phone number normalization
    - _Requirements: 3.5_

- [ ] 10. Final integration and testing
  - Wire all components together
  - Test end-to-end authentication flows for both credential types
  - Verify backward compatibility with existing user accounts
  - Test 2FA integration with both signin methods
  - _Requirements: All requirements_

  - [ ]* 10.1 Write integration tests
    - Test complete signin flows for email and phone credentials
    - Test 2FA integration end-to-end
    - _Requirements: All requirements_

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The implementation maintains full backward compatibility with existing authentication flows
- All security measures from the existing system are preserved and extended