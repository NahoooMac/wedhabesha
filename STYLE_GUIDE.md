# Wedding Platform Style Guide

## Overview

This document outlines the coding standards and style guidelines for the Wedding Platform project. Following these guidelines ensures consistency, maintainability, and readability across the codebase.

## General Principles

1. **Consistency**: Follow established patterns within the codebase
2. **Readability**: Write code that is easy to understand and maintain
3. **Documentation**: Document complex logic and public APIs
4. **Testing**: Write comprehensive tests for all features
5. **Performance**: Consider performance implications of code changes

## TypeScript/JavaScript Guidelines

### File Organization

```typescript
// 1. External imports (libraries)
import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Search, CheckCircle2 } from 'lucide-react';

// 2. Internal imports (components, services, types)
import { MessageThread } from './MessageThread';
import { MessageInput } from './MessageInput';
import { Message, MessageType, UserType } from '../../types/messaging';
import { useMessagingErrorHandler } from '../../hooks/useMessagingErrorHandler';

// 3. Type definitions
interface ComponentProps {
  // ...
}

// 4. Component implementation
```

### Naming Conventions

- **Components**: PascalCase (`CoupleMessaging`, `MessageInput`)
- **Files**: PascalCase for components (`CoupleMessaging.tsx`), camelCase for utilities (`messageUtils.ts`)
- **Variables/Functions**: camelCase (`sendMessage`, `isLoading`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`, `API_ENDPOINTS`)
- **Types/Interfaces**: PascalCase (`MessageType`, `UserProfile`)
- **Enums**: PascalCase with UPPER_CASE values (`MessageType.TEXT`)

### Function Definitions

```typescript
// Prefer arrow functions for components
const CoupleMessaging: React.FC<CoupleMessagingProps> = ({ userId, onThreadOpened }) => {
  // Component logic
};

// Use useCallback for event handlers and functions passed as props
const handleSendMessage = useCallback(async (content: string) => {
  // Implementation
}, [dependencies]);

// Regular functions for utilities
function formatDate(date: Date): string {
  return date.toLocaleDateString();
}
```

### Error Handling

```typescript
// Always handle errors gracefully
try {
  const result = await apiCall();
  setData(result);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  setError(errorMessage);
  handleError(error, 'apiCall');
}

// Use specific error types when possible
if (error.code === 'NETWORK_ERROR') {
  // Handle network errors
} else if (error.code === 'VALIDATION_ERROR') {
  // Handle validation errors
}
```

### State Management

```typescript
// Use descriptive state names
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [messages, setMessages] = useState<Message[]>([]);

// Group related state when appropriate
const [state, setState] = useState({
  isLoading: false,
  error: null,
  data: []
});
```

## Documentation Standards

### JSDoc Comments

All public functions, components, and complex logic should have JSDoc comments:

```typescript
/**
 * @fileoverview Brief description of the file's purpose
 * 
 * Detailed description of what this file contains and its role in the system.
 * Include information about key features, requirements satisfied, and usage patterns.
 * 
 * @author Wedding Platform Team
 * @version 1.0.0
 * @since 2024-01-27
 * 
 * Features:
 * - Feature 1 description
 * - Feature 2 description
 * 
 * Requirements satisfied:
 * - 1.1: Requirement description
 * - 2.3: Another requirement
 */

/**
 * Component description explaining its purpose and functionality
 * 
 * @component
 * @param {ComponentProps} props - Component props
 * @returns {JSX.Element} Rendered component
 * 
 * @example
 * ```tsx
 * <Component 
 *   prop1="value1"
 *   prop2={value2}
 *   onEvent={() => console.log('Event triggered')}
 * />
 * ```
 * 
 * @satisfies Requirements 1.1, 2.3, 3.5
 */

/**
 * Function description explaining what it does
 * 
 * @param {string} param1 - Description of parameter
 * @param {number} [param2] - Optional parameter description
 * @returns {Promise<Result>} Description of return value
 * 
 * @throws {Error} When validation fails
 * 
 * @example
 * ```typescript
 * const result = await functionName('input', 42);
 * ```
 */
```

### Interface Documentation

```typescript
/**
 * Interface description explaining its purpose
 * 
 * @interface InterfaceName
 * @property {string} id - Unique identifier
 * @property {string} name - Display name
 * @property {boolean} [isActive] - Optional active status
 */
interface InterfaceName {
  id: string;
  name: string;
  isActive?: boolean;
}
```

## React Component Guidelines

### Component Structure

```typescript
/**
 * Component JSDoc here
 */
const ComponentName: React.FC<ComponentProps> = ({ prop1, prop2, onEvent }) => {
  // 1. State declarations
  const [state, setState] = useState(initialValue);
  
  // 2. Refs
  const elementRef = useRef<HTMLElement>(null);
  
  // 3. Custom hooks
  const { data, loading, error } = useCustomHook();
  
  // 4. Callbacks and event handlers
  const handleEvent = useCallback(() => {
    // Implementation
  }, [dependencies]);
  
  // 5. Effects
  useEffect(() => {
    // Effect logic
  }, [dependencies]);
  
  // 6. Early returns for loading/error states
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;
  
  // 7. Render
  return (
    <div className="component-container">
      {/* JSX content */}
    </div>
  );
};

export default ComponentName;
export { ComponentName };
```

### Props Interface

```typescript
/**
 * Props interface with clear documentation
 */
interface ComponentProps {
  /** Required prop description */
  requiredProp: string;
  
  /** Optional prop description */
  optionalProp?: number;
  
  /** Callback prop description */
  onEvent?: (data: EventData) => void;
  
  /** Children prop when needed */
  children?: React.ReactNode;
}
```

### Conditional Rendering

```typescript
// Use logical AND for simple conditions
{isVisible && <Component />}

// Use ternary for if/else
{isLoading ? <LoadingSpinner /> : <Content />}

// Use early returns for complex conditions
if (!data) {
  return <EmptyState />;
}

return <DataDisplay data={data} />;
```

## CSS/Styling Guidelines

### Tailwind CSS Classes

```typescript
// Group classes logically
<div className="
  flex items-center justify-between
  p-4 mb-4
  bg-white border border-gray-200 rounded-lg
  hover:bg-gray-50 transition-colors
">
```

### Responsive Design

```typescript
// Mobile-first approach
<div className="
  w-full p-2
  md:w-1/2 md:p-4
  lg:w-1/3 lg:p-6
">
```

### Component-Specific Styles

```typescript
// Use descriptive class names for custom styles
<div className="message-thread-container">
  <div className="message-bubble message-bubble--sent">
    Content
  </div>
</div>
```

## Backend Guidelines (Node.js)

### File Structure

```javascript
/**
 * Service description
 */

// 1. Imports
const express = require('express');
const { query } = require('../config/database');

// 2. Class definition
class ServiceName {
  constructor() {
    // Initialization
  }
  
  /**
   * Method description
   */
  async methodName(param1, param2) {
    try {
      // Implementation
      return result;
    } catch (error) {
      throw new Error(`Operation failed: ${error.message}`);
    }
  }
}

// 3. Export
module.exports = ServiceName;
```

### Error Handling

```javascript
// Always use try-catch for async operations
try {
  const result = await databaseOperation();
  return { success: true, data: result };
} catch (error) {
  console.error('Operation failed:', error);
  return { success: false, error: error.message };
}

// Use specific error types
if (error.code === 'SQLITE_CONSTRAINT') {
  throw new Error('Duplicate entry');
}
```

### Database Queries

```javascript
// Use parameterized queries
const query = `
  SELECT id, name, email 
  FROM users 
  WHERE user_type = ? AND created_at > ?
`;
const result = await db.query(query, [userType, startDate]);

// Format multi-line queries for readability
const complexQuery = `
  SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(m.id) as message_count
  FROM users u
  LEFT JOIN messages m ON u.id = m.sender_id
  WHERE u.user_type = ?
  GROUP BY u.id
  ORDER BY message_count DESC
  LIMIT ?
`;
```

## Testing Guidelines

### Test Structure

```typescript
describe('ComponentName', () => {
  // Setup
  const defaultProps = {
    prop1: 'value1',
    prop2: 42,
    onEvent: jest.fn()
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('rendering', () => {
    it('should render with default props', () => {
      render(<ComponentName {...defaultProps} />);
      expect(screen.getByText('Expected Text')).toBeInTheDocument();
    });
  });
  
  describe('interactions', () => {
    it('should call onEvent when button is clicked', async () => {
      render(<ComponentName {...defaultProps} />);
      
      const button = screen.getByRole('button', { name: 'Click Me' });
      await user.click(button);
      
      expect(defaultProps.onEvent).toHaveBeenCalledWith(expectedData);
    });
  });
});
```

### Property-Based Tests

```typescript
import fc from 'fast-check';

describe('messageSearch property tests', () => {
  it('should always return messages that match the search query', () => {
    fc.assert(fc.property(
      fc.array(messageArbitrary),
      fc.string(),
      (messages, query) => {
        const results = searchMessages(messages, query);
        
        if (query.trim() === '') {
          expect(results).toEqual(messages);
        } else {
          results.forEach(message => {
            expect(message.content.toLowerCase()).toContain(query.toLowerCase());
          });
        }
      }
    ));
  });
});
```

## Performance Guidelines

### React Performance

```typescript
// Use React.memo for expensive components
const ExpensiveComponent = React.memo<Props>(({ data }) => {
  return <ComplexVisualization data={data} />;
});

// Use useMemo for expensive calculations
const expensiveValue = useMemo(() => {
  return complexCalculation(data);
}, [data]);

// Use useCallback for functions passed to children
const handleClick = useCallback((id: string) => {
  onItemClick(id);
}, [onItemClick]);
```

### Database Performance

```javascript
// Use indexes for frequently queried columns
CREATE INDEX idx_messages_thread_created ON messages(thread_id, created_at);

// Limit query results
const messages = await query(
  'SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at DESC LIMIT ?',
  [threadId, limit]
);

// Use connection pooling
const pool = new Pool({
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000
});
```

## Security Guidelines

### Input Validation

```typescript
// Validate all inputs
const validateMessage = (content: string): boolean => {
  if (!content || content.trim().length === 0) {
    throw new Error('Message content is required');
  }
  
  if (content.length > MAX_MESSAGE_LENGTH) {
    throw new Error('Message too long');
  }
  
  return true;
};

// Sanitize user inputs
const sanitizedContent = DOMPurify.sanitize(userInput);
```

### Authentication

```javascript
// Always verify JWT tokens
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Check user permissions
const hasAccess = await checkUserAccess(userId, resourceId, 'read');
if (!hasAccess) {
  throw new Error('Access denied');
}
```

## Git Commit Guidelines

### Commit Message Format

```
type(scope): brief description

Detailed description of changes made and why.

- List specific changes
- Include any breaking changes
- Reference issue numbers if applicable

Closes #123
```

### Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(messaging): add real-time typing indicators

Implement typing indicators for couple-vendor messaging:
- Add WebSocket events for typing start/stop
- Update MessageInput component with typing detection
- Add typing indicator display in message threads
- Include 3-second timeout for typing status

Satisfies requirements 2.2 and 5.1

Closes #456
```

## Code Review Guidelines

### What to Look For

1. **Functionality**: Does the code work as intended?
2. **Style**: Does it follow the style guide?
3. **Performance**: Are there any performance concerns?
4. **Security**: Are there any security vulnerabilities?
5. **Testing**: Are there adequate tests?
6. **Documentation**: Is the code properly documented?

### Review Checklist

- [ ] Code follows naming conventions
- [ ] Functions are properly documented
- [ ] Error handling is comprehensive
- [ ] Tests cover new functionality
- [ ] No console.log statements in production code
- [ ] TypeScript types are properly defined
- [ ] Security best practices are followed
- [ ] Performance considerations are addressed

## Tools and Configuration

### ESLint Configuration

```json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "react-hooks/recommended"
  ],
  "rules": {
    "no-console": "warn",
    "prefer-const": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

---

**Last Updated:** January 28, 2025  
**Version:** 1.0.0  
**Maintainer:** Wedding Platform Team