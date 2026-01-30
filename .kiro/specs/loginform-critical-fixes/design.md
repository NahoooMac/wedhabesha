# Design Document: LoginForm Critical Fixes

## Overview

This design addresses critical bugs in the LoginForm.tsx component that prevent proper authentication flow. The fixes focus on five main areas:

1. **AuthContext Integration**: Replace direct localStorage manipulation and API calls with proper AuthContext method usage
2. **Phone Validation Update**: Extend Ethiopian phone number regex to support both 07 and 09 prefixes
3. **Safe OTP Navigation**: Replace unsafe `nextSibling` DOM traversal with index-based or `nextElementSibling` navigation
4. **Consistent 2FA Flow**: Unify email and phone authentication to use the same AuthContext-based pattern
5. **Keyboard Accessibility**: Add form wrapper and Enter key support for OTP verification

The design maintains backward compatibility while ensuring all authentication flows properly update the global application state through AuthContext.

## Architecture

### Current Architecture Issues

The LoginForm currently has a fragmented architecture:
- **Direct API calls**: Bypasses AuthContext for login operations
- **Manual state management**: Directly manipulates localStorage instead of using AuthContext
- **Inconsistent flows**: Email and phone login use different patterns
- **Token key mismatch**: Uses 'access_token' while AuthContext expects 'jwt_token'

### Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        LoginForm                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  User Input (Email/Phone + Password)                   │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                    │
│                         ▼                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Validation Layer                                      │ │
│  │  - Phone regex: /^(\+251|0)[79][0-9]{8}$/            │ │
│  │  - Email validation                                    │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                    │
│                         ▼                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  AuthContext Method Calls                              │ │
│  │  - signInWithPhone(phone, password)                    │ │
│  │  - signInWith2FA(phone, password, token)               │ │
│  │  - (Email methods via AuthContext)                     │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                    │
│                         ▼                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Response Handling                                     │ │
│  │  - requires2FA? → Show OTP form                        │ │
│  │  - Success? → AuthContext updates state automatically  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     AuthContext                              │
│  - Manages user state                                        │
│  - Handles JWT token storage (jwt_token key)                 │
│  - Provides authentication methods                           │
│  - Updates global application state                          │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Changes

1. **Single Source of Truth**: AuthContext becomes the sole manager of authentication state
2. **Unified Flow**: Both email and phone login follow the same pattern through AuthContext
3. **Separation of Concerns**: LoginForm handles UI and validation, AuthContext handles state and API
4. **Consistent Token Management**: All authentication uses 'jwt_token' localStorage key

## Components and Interfaces

### Modified Components

#### LoginForm Component

**State Variables** (no changes to existing state structure):
- `identifier: string` - Email or phone number
- `password: string` - User password
- `otp: string[]` - Array of 6 OTP digits
- `mode: 'LOGIN' | 'REGISTER' | 'FORGOT' | 'FORGOT_VERIFY' | 'TWO_FACTOR'`
- `error: string | null`
- `identifierType: 'email' | 'phone' | null`

**Modified Functions**:

```typescript
// Updated phone validation regex
const phoneRegex = /^(\+251|0)[79][0-9]{8}$/;

// Modified login handler - uses AuthContext methods
const handleLogin = async () => {
  try {
    setError(null);
    
    if (identifierType === 'email') {
      // Use AuthContext for email login
      // If requires2FA, transition to TWO_FACTOR mode
      // Otherwise, authentication completes automatically via AuthContext
    } else if (identifierType === 'phone') {
      // Use AuthContext.signInWithPhone
      const result = await authContext.signInWithPhone(identifier, password);
      
      if (result.requires2FA) {
        setMode('TWO_FACTOR');
      }
      // If no requires2FA, AuthContext has already updated state
    }
  } catch (err) {
    setError(err.message);
  }
};

// Modified 2FA verification handler
const handle2FAVerification = async () => {
  try {
    setError(null);
    const otpCode = otp.join('');
    
    // Use AuthContext.signInWith2FA
    await authContext.signInWith2FA(identifier, password, otpCode);
    // AuthContext handles state update automatically
    
  } catch (err) {
    setError('2FA verification failed. Please check your code.');
  }
};

// Safe OTP input navigation using index-based approach
const handleOtpChange = (element: HTMLInputElement, index: number) => {
  if (isNaN(Number(element.value))) return false;
  
  setOtp([...otp.map((d, idx) => (idx === index ? element.value : d))]);
  
  // Safe navigation: use index to find next input
  if (element.value !== "" && index < 5) {
    const nextInput = document.getElementById(`otp-input-${index + 1}`);
    if (nextInput) {
      (nextInput as HTMLInputElement).focus();
    }
  }
};

// New: Form submit handler for OTP
const handleOtpSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  if (mode === 'TWO_FACTOR') {
    handle2FAVerification();
  } else if (mode === 'FORGOT_VERIFY') {
    handleForgotPasswordVerify();
  }
};
```

**Modified JSX Structure for OTP**:

```typescript
// Wrap OTP inputs in form element for Enter key support
{(mode === 'TWO_FACTOR' || mode === 'FORGOT_VERIFY') && (
  <form onSubmit={handleOtpSubmit}>
    <div className="otp-inputs">
      {otp.map((digit, index) => (
        <input
          key={index}
          id={`otp-input-${index}`}
          type="text"
          maxLength={1}
          value={digit}
          onChange={(e) => handleOtpChange(e.target, index)}
        />
      ))}
    </div>
    <button type="submit">Verify</button>
  </form>
)}
```

### AuthContext Interface (Reference)

The AuthContext provides these methods that LoginForm will use:

```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  
  // Phone authentication
  signInWithPhone(phone: string, password: string): Promise<{
    user?: User;
    requires2FA?: boolean;
  }>;
  
  // 2FA verification
  signInWith2FA(phone: string, password: string, token: string): Promise<User>;
  
  // Email authentication (existing)
  signInWithEmail?(email: string, password: string): Promise<{
    user?: User;
    requires2FA?: boolean;
  }>;
  
  // Other methods...
  signInWithGoogle(): Promise<void>;
  signUpWithEmail(email: string, password: string, userData: any): Promise<void>;
}
```

## Data Models

### Phone Number Format

**Valid Formats**:
- `+25179XXXXXXXX` (international format with 07 prefix)
- `+25109XXXXXXXX` (international format with 09 prefix)
- `079XXXXXXXX` (local format with 07 prefix)
- `099XXXXXXXX` (local format with 09 prefix)

**Regex Pattern**: `/^(\+251|0)[79][0-9]{8}$/`

**Validation Logic**:
1. Check if identifier matches phone regex
2. If match, set `identifierType = 'phone'`
3. If no match, check email format
4. If neither, show validation error

### OTP Data Structure

**Current Structure** (unchanged):
```typescript
otp: string[] = ['', '', '', '', '', '']
```

**Input Element IDs** (new):
```typescript
// Each input gets a unique ID for safe navigation
id={`otp-input-${index}`}  // otp-input-0, otp-input-1, ..., otp-input-5
```

### Authentication Response Models

**Login Response** (from AuthContext methods):
```typescript
{
  user?: {
    id: string;
    email?: string;
    phone?: string;
    name: string;
    // ... other user fields
  };
  requires2FA?: boolean;
}
```

**2FA Verification Response** (from AuthContext):
```typescript
{
  user: {
    id: string;
    email?: string;
    phone?: string;
    name: string;
    // ... other user fields
  }
}
```

### Token Storage

**localStorage Key**: `jwt_token` (not `access_token`)

**Storage Responsibility**: AuthContext (not LoginForm)

**Migration Strategy**:
- AuthContext should check for both `jwt_token` and `access_token` on initialization
- If `access_token` exists but `jwt_token` doesn't, copy it over
- Remove `access_token` after migration
- LoginForm should never directly access localStorage for tokens

## Correctness Properties


*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: AuthContext Integration for Email Login
*For any* valid email credentials, when login is successful, the LoginForm should call AuthContext methods to update authentication state and should not directly manipulate localStorage.
**Validates: Requirements 1.1, 1.3**

### Property 2: AuthContext Integration for Phone Login
*For any* valid phone credentials, when login is successful, the LoginForm should call AuthContext's signInWithPhone method and should not directly manipulate localStorage.
**Validates: Requirements 1.2, 1.3, 8.1**

### Property 3: Phone Number Validation with 07 and 09 Prefixes
*For any* phone number string, the validation should accept numbers matching the pattern `/^(\+251|0)[79][0-9]{8}$/` and reject all others.
**Validates: Requirements 2.5**

### Property 4: Safe OTP Input Navigation
*For any* OTP input field at index 0-4, when a valid digit is entered, focus should move to the input at index+1 using safe DOM methods (getElementById or nextElementSibling, not nextSibling).
**Validates: Requirements 3.1**

### Property 5: OTP Non-Numeric Input Rejection
*For any* OTP input field and any non-numeric character, the input should be rejected and the OTP state should remain unchanged.
**Validates: Requirements 3.5**

### Property 6: Consistent 2FA Flow Pattern
*For any* authentication method (email or phone), when the AuthContext method returns requires2FA as true, the LoginForm should transition to TWO_FACTOR mode.
**Validates: Requirements 4.1, 4.2, 8.2**

### Property 7: No Direct API Calls
*For any* authentication operation, the LoginForm should use AuthContext methods and should not make direct fetch or API calls for authentication.
**Validates: Requirements 4.3, 8.5**

### Property 8: 2FA Verification Method Usage
*For any* 2FA verification attempt, the LoginForm should call AuthContext's signInWith2FA method with the phone, password, and OTP token.
**Validates: Requirements 4.5, 8.4**

### Property 9: Enter Key Triggers Verification
*For any* OTP input field in TWO_FACTOR or FORGOT_VERIFY mode, when the Enter key is pressed, the form submission handler should be triggered and default form behavior should be prevented.
**Validates: Requirements 5.3, 5.4**

### Property 10: Error Message Display Consistency
*For any* authentication error (email or phone), the LoginForm should display an error message in a consistent format.
**Validates: Requirements 6.1, 6.2**

### Property 11: Error Type Distinction
*For any* error during authentication, the LoginForm should distinguish between network errors, validation errors, and authentication errors in the displayed message.
**Validates: Requirements 6.3**

### Property 12: AuthContext Error Handling
*For any* error thrown by AuthContext methods, the LoginForm should catch the error and display it to the user without crashing.
**Validates: Requirements 6.4**

## Error Handling

### Error Categories

1. **Validation Errors**
   - Invalid phone number format
   - Invalid email format
   - Empty required fields
   - Non-numeric OTP input
   - **Handling**: Display inline validation message, prevent submission

2. **Authentication Errors**
   - Invalid credentials
   - Account not found
   - Account locked/disabled
   - **Handling**: Display error message from AuthContext, clear password field

3. **2FA Errors**
   - Invalid OTP code
   - Expired OTP code
   - Too many attempts
   - **Handling**: Display specific 2FA error message, allow retry with cleared OTP

4. **Network Errors**
   - Connection timeout
   - Server unavailable
   - API endpoint errors
   - **Handling**: Display "Connection error, please try again" message, suggest checking internet connection

5. **AuthContext Errors**
   - Method not available
   - Unexpected response format
   - State update failures
   - **Handling**: Catch and log error, display generic error message, provide fallback

### Error Handling Strategy

```typescript
try {
  // Authentication operation
  const result = await authContext.signInWithPhone(phone, password);
  
  if (result.requires2FA) {
    setMode('TWO_FACTOR');
  }
  
} catch (err) {
  // Categorize and handle error
  if (err.message.includes('network') || err.message.includes('fetch')) {
    setError('Connection error. Please check your internet and try again.');
  } else if (err.message.includes('credentials') || err.message.includes('invalid')) {
    setError('Invalid credentials. Please check your email/phone and password.');
  } else if (err.message.includes('2FA') || err.message.includes('verification')) {
    setError('2FA verification failed. Please check your code and try again.');
  } else {
    setError('An error occurred. Please try again.');
    console.error('Authentication error:', err);
  }
}
```

### Error Recovery

- **Validation errors**: User can immediately correct input
- **Authentication errors**: Clear password field, allow retry
- **2FA errors**: Clear OTP inputs, allow retry (up to 3 attempts)
- **Network errors**: Show retry button, maintain form state
- **Critical errors**: Log error details, show contact support message

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all inputs

Both testing approaches are complementary and necessary. Unit tests catch concrete bugs in specific scenarios, while property tests verify general correctness across a wide range of inputs.

### Property-Based Testing

**Library Selection**: 
- For TypeScript/JavaScript: Use `fast-check` library
- Configuration: Minimum 100 iterations per property test

**Property Test Implementation**:

Each correctness property listed above must be implemented as a property-based test. Each test should:
1. Generate random valid inputs using fast-check arbitraries
2. Execute the operation being tested
3. Assert the property holds
4. Include a comment tag referencing the design property

**Tag Format**:
```typescript
// Feature: loginform-critical-fixes, Property 1: AuthContext Integration for Email Login
test('email login uses AuthContext methods', () => {
  fc.assert(
    fc.property(fc.emailAddress(), fc.string(), async (email, password) => {
      // Test implementation
    }),
    { numRuns: 100 }
  );
});
```

**Example Property Tests**:

```typescript
// Feature: loginform-critical-fixes, Property 3: Phone Number Validation with 07 and 09 Prefixes
test('phone validation accepts 07 and 09 prefixes', () => {
  fc.assert(
    fc.property(
      fc.oneof(
        fc.constant('+25179'),
        fc.constant('+25109'),
        fc.constant('079'),
        fc.constant('099')
      ),
      fc.array(fc.integer(0, 9), { minLength: 8, maxLength: 8 }),
      (prefix, digits) => {
        const phone = prefix + digits.join('');
        const phoneRegex = /^(\+251|0)[79][0-9]{8}$/;
        expect(phoneRegex.test(phone)).toBe(true);
      }
    ),
    { numRuns: 100 }
  );
});

// Feature: loginform-critical-fixes, Property 5: OTP Non-Numeric Input Rejection
test('OTP inputs reject non-numeric characters', () => {
  fc.assert(
    fc.property(
      fc.integer(0, 5), // OTP input index
      fc.char().filter(c => !/\d/.test(c)), // Non-numeric character
      (index, char) => {
        const initialOtp = ['', '', '', '', '', ''];
        const result = handleOtpInput(char, index, initialOtp);
        expect(result).toEqual(initialOtp); // State unchanged
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Testing

**Focus Areas**:
- Specific phone number format examples (e.g., +25179XXXXXXXX, 079XXXXXXXX)
- Edge cases (last OTP input, empty inputs, boundary conditions)
- Error scenarios (network failures, invalid credentials, expired OTP)
- UI interactions (form submission, Enter key, focus management)
- Integration points (AuthContext method calls, mode transitions)

**Example Unit Tests**:

```typescript
describe('LoginForm - Phone Validation', () => {
  test('accepts +25179XXXXXXXX format', () => {
    const phone = '+251791234567';
    expect(validatePhone(phone)).toBe(true);
  });
  
  test('accepts 079XXXXXXXX format', () => {
    const phone = '0791234567';
    expect(validatePhone(phone)).toBe(true);
  });
  
  test('rejects invalid prefix 08', () => {
    const phone = '0891234567';
    expect(validatePhone(phone)).toBe(false);
  });
});

describe('LoginForm - OTP Navigation', () => {
  test('last OTP input does not cause error', () => {
    const { getByTestId } = render(<LoginForm />);
    const lastInput = getByTestId('otp-input-5');
    
    fireEvent.change(lastInput, { target: { value: '9' } });
    
    // Should not throw error or attempt to focus non-existent element
    expect(document.activeElement).toBe(lastInput);
  });
});

describe('LoginForm - 2FA Error Handling', () => {
  test('displays specific error for failed 2FA verification', async () => {
    const mockAuthContext = {
      signInWith2FA: jest.fn().mockRejectedValue(new Error('Invalid 2FA code'))
    };
    
    const { getByText, getByRole } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <LoginForm />
      </AuthContext.Provider>
    );
    
    // Trigger 2FA verification
    fireEvent.click(getByRole('button', { name: /verify/i }));
    
    await waitFor(() => {
      expect(getByText(/2FA verification failed/i)).toBeInTheDocument();
    });
  });
});
```

### Testing Coverage Goals

- **Property tests**: Cover all 12 correctness properties
- **Unit tests**: Cover specific examples, edge cases, and error conditions
- **Integration tests**: Verify AuthContext integration and mode transitions
- **Accessibility tests**: Verify keyboard navigation and form submission
- **Code coverage**: Aim for 90%+ coverage of modified code

### Test Execution

- Run property tests with minimum 100 iterations each
- Run all tests before committing changes
- Include tests in CI/CD pipeline
- Monitor test execution time (property tests may be slower)
