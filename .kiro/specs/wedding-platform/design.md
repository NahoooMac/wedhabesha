# Design Document: Wedding Platform

## Overview

The Wedding Platform is a comprehensive web application built with React/TypeScript frontend and Python FastAPI backend. The platform serves multiple user types through distinct interfaces while maintaining data isolation and real-time capabilities. The architecture emphasizes scalability, security, and user experience across all touchpoints.

## Architecture

### System Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[React App] --> B[Public Pages]
        A --> C[Couple Dashboard]
        A --> D[Staff Check-in]
        A --> E[Vendor Portal]
        A --> F[Admin Panel]
    end
    
    subgraph "API Layer"
        G[FastAPI Backend]
        H[Authentication Service]
        I[Real-time WebSocket]
    end
    
    subgraph "Data Layer"
        J[PostgreSQL Database]
        K[Redis Cache]
        L[File Storage]
    end
    
    subgraph "External Services"
        M[WhatsApp API]
        N[SMS Gateway]
        O[QR Code Generator]
    end
    
    A --> G
    G --> J
    G --> K
    G --> M
    G --> N
    A --> I
    I --> K
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript for type safety
- Tailwind CSS for responsive design system
- React Query for server state management and caching
- Recharts for analytics visualization
- React Hook Form for form management
- QR scanner library for check-in functionality
- React Router for navigation
- Firebase SDK for Google Authentication

**Backend:**
- Python FastAPI for high-performance API
- SQLAlchemy/SQLModel for database ORM
- Alembic for database migrations
- bcrypt for secure password hashing (traditional auth)
- Firebase Admin SDK for ID token verification
- Pydantic for data validation
- JWT for internal session tokens

**Database & Caching:**
- PostgreSQL for primary data storage
- Redis for session management and real-time analytics
- Database connection pooling for performance

**External Integrations:**
- Firebase Authentication for Google Sign-In
  - Project ID: wedhabesha
  - API Key: AIzaSyC_RuwYwxuq4O9VTfluqFbV-2d6iK-nDuc
  - Auth Domain: wedhabesha.firebaseapp.com
  - Storage Bucket: wedhabesha.firebasestorage.app
  - Messaging Sender ID: 629085004020
  - App ID: 1:629085004020:web:e20090bed1f9267d0dbea1
  - Measurement ID: G-XW5RW6LRLS
- WhatsApp Business API for guest communication
- SMS gateway for backup communication
- QR code generation library
- Email service for notifications

## Components and Interfaces

### Frontend Components

#### Public Interface
- **Landing Page**: Marketing content with vendor showcase
- **Vendor Directory**: Public vendor browsing with filters
- **Registration Flow**: Multi-step account creation for couples and vendors

#### Couple Dashboard
- **Wedding Setup Wizard**: Initial configuration flow
- **Guest Management**: List management with QR code generation
- **Vendor Discovery**: Marketplace browsing and lead generation
- **Budget Planner**: Expense tracking with ETB currency support
- **Analytics Dashboard**: Real-time wedding metrics and guest tracking
- **Communication Center**: Guest invitation and update management

#### Staff Check-in Interface
- **Code Entry**: Wedding code and PIN authentication
- **QR Scanner**: Camera-based guest check-in
- **Guest List**: Manual check-in fallback
- **Live Stats**: Real-time arrival monitoring

#### Vendor Portal
- **Profile Management**: Business information and service listings
- **Lead Dashboard**: Inquiry management and communication
- **Analytics**: Performance metrics and conversion tracking
- **Review Management**: Response to customer feedback

#### Admin Panel
- **Vendor Approval**: Application review and verification
- **Content Moderation**: Review and profile oversight
- **Platform Analytics**: System-wide metrics and health monitoring
- **User Management**: Account administration and support

### Backend API Structure

#### Authentication Endpoints
```
POST /auth/register/couple
POST /auth/register/vendor
POST /auth/login
POST /auth/google-signin
POST /auth/refresh
POST /auth/logout
POST /auth/staff/verify
```

#### Wedding Management
```
POST /weddings
GET /weddings/{wedding_id}
PUT /weddings/{wedding_id}
GET /weddings/{wedding_id}/guests
POST /weddings/{wedding_id}/guests
PUT /weddings/{wedding_id}/guests/{guest_id}
```

#### Check-in System
```
POST /checkin/verify-code
POST /checkin/scan-qr
GET /checkin/{wedding_id}/stats
WebSocket /checkin/{wedding_id}/live
```

#### Vendor Marketplace
```
GET /vendors
GET /vendors/{vendor_id}
POST /vendors/{vendor_id}/contact
GET /vendors/categories
POST /vendors/reviews
```

#### Analytics and Reporting
```
GET /analytics/wedding/{wedding_id}
GET /analytics/vendor/{vendor_id}
GET /analytics/platform (admin only)
```

## Data Models

### Core Entities

#### User Management
```python
class User(SQLModel, table=True):
    id: int = Field(primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: Optional[str] = None  # None for Google Sign-In users
    firebase_uid: Optional[str] = Field(unique=True, index=True)  # Firebase UID
    user_type: UserType  # COUPLE, VENDOR, ADMIN
    auth_provider: AuthProvider  # GOOGLE, EMAIL
    created_at: datetime
    is_active: bool = True
    
class Couple(SQLModel, table=True):
    id: int = Field(primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    partner1_name: str
    partner2_name: str
    phone: Optional[str]
    
class Vendor(SQLModel, table=True):
    id: int = Field(primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    business_name: str
    category: VendorCategory
    location: str
    description: str
    is_verified: bool = False
    rating: Optional[float]
```

#### Wedding Management
```python
class Wedding(SQLModel, table=True):
    id: int = Field(primary_key=True)
    couple_id: int = Field(foreign_key="couple.id")
    wedding_code: str = Field(unique=True, index=True)
    staff_pin: str  # bcrypt hashed
    wedding_date: date
    venue_name: str
    venue_address: str
    expected_guests: int
    created_at: datetime
    
class Guest(SQLModel, table=True):
    id: int = Field(primary_key=True)
    wedding_id: int = Field(foreign_key="wedding.id")
    name: str
    email: Optional[str]
    phone: Optional[str]
    qr_code: str = Field(unique=True, index=True)
    table_number: Optional[int]
    dietary_restrictions: Optional[str]
    created_at: datetime
```

#### Check-in System
```python
class CheckIn(SQLModel, table=True):
    id: int = Field(primary_key=True)
    guest_id: int = Field(foreign_key="guest.id")
    wedding_id: int = Field(foreign_key="wedding.id")
    checked_in_at: datetime
    checked_in_by: str  # staff identifier
    method: CheckInMethod  # QR_SCAN, MANUAL
    
class CheckInSession(SQLModel, table=True):
    id: int = Field(primary_key=True)
    wedding_id: int = Field(foreign_key="wedding.id")
    session_token: str
    created_at: datetime
    expires_at: datetime
```

#### Vendor Marketplace
```python
class VendorLead(SQLModel, table=True):
    id: int = Field(primary_key=True)
    vendor_id: int = Field(foreign_key="vendor.id")
    couple_id: int = Field(foreign_key="couple.id")
    message: str
    budget_range: Optional[str]
    event_date: Optional[date]
    status: LeadStatus  # NEW, CONTACTED, CONVERTED, CLOSED
    created_at: datetime
    
class Review(SQLModel, table=True):
    id: int = Field(primary_key=True)
    vendor_id: int = Field(foreign_key="vendor.id")
    couple_id: int = Field(foreign_key="couple.id")
    rating: int = Field(ge=1, le=5)
    comment: str
    is_verified: bool = False
    created_at: datetime
```

#### Budget Management
```python
class Budget(SQLModel, table=True):
    id: int = Field(primary_key=True)
    wedding_id: int = Field(foreign_key="wedding.id")
    total_budget: Decimal
    currency: str = "ETB"
    created_at: datetime
    
class BudgetCategory(SQLModel, table=True):
    id: int = Field(primary_key=True)
    budget_id: int = Field(foreign_key="budget.id")
    category: str  # venue, catering, photography, etc.
    allocated_amount: Decimal
    spent_amount: Decimal = 0
    
class Expense(SQLModel, table=True):
    id: int = Field(primary_key=True)
    budget_category_id: int = Field(foreign_key="budgetcategory.id")
    vendor_id: Optional[int] = Field(foreign_key="vendor.id")
    description: str
    amount: Decimal
    date: date
    receipt_url: Optional[str]
```

### Database Relationships

- **One-to-One**: User ↔ Couple, User ↔ Vendor
- **One-to-Many**: Couple → Wedding, Wedding → Guest, Wedding → CheckIn
- **Many-to-Many**: Vendor ↔ Couple (through VendorLead), Vendor ↔ Review

### Data Isolation Strategy

Each wedding's data is isolated through:
- Wedding-scoped queries with proper filtering
- Row-level security policies in PostgreSQL
- API endpoint authorization checks
- Redis key namespacing for real-time data

## Error Handling

### API Error Responses
```python
class ErrorResponse(BaseModel):
    error_code: str
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime
```

### Error Categories
- **Authentication Errors**: Invalid credentials, expired tokens
- **Authorization Errors**: Insufficient permissions, data access violations
- **Validation Errors**: Invalid input data, constraint violations
- **Business Logic Errors**: Duplicate check-ins, invalid wedding codes
- **System Errors**: Database connectivity, external service failures

### Error Handling Strategy
- Structured error responses with consistent format
- Client-side error boundaries for graceful degradation
- Retry mechanisms for transient failures
- Comprehensive logging for debugging and monitoring
- User-friendly error messages with actionable guidance

## Testing Strategy

### Unit Testing
- **Backend**: pytest for API endpoints, business logic, and data models
- **Frontend**: Jest and React Testing Library for component testing
- **Database**: Test fixtures and transaction rollback for isolation
- **Mocking**: External services (WhatsApp, SMS) for reliable testing

### Property-Based Testing
Property-based tests will validate universal correctness properties using Hypothesis (Python) and fast-check (TypeScript). Each property test will run a minimum of 100 iterations to ensure comprehensive coverage.

**Test Configuration:**
- Python: Hypothesis with pytest integration
- TypeScript: fast-check with Jest
- Minimum 100 iterations per property test
- Each test tagged with: **Feature: wedding-platform, Property {number}: {property_text}**

### Integration Testing
- **API Integration**: Full request/response cycle testing
- **Database Integration**: Multi-table transaction testing
- **Real-time Features**: WebSocket connection and message testing
- **External Services**: Integration with WhatsApp/SMS APIs

### End-to-End Testing
- **User Flows**: Complete workflows from registration to check-in
- **Cross-browser**: Testing across different browsers and devices
- **Performance**: Load testing for concurrent check-ins
- **Security**: Authentication and authorization flow testing

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis and property reflection, the following properties ensure system correctness:

### Property 1: Account Creation and Code Generation
*For any* valid registration data submitted by a couple, the system should create a unique account and generate a unique Wedding_Code that has never been used before.
**Validates: Requirements 1.2, 2.2**

### Property 2: Authentication Behavior
*For any* valid credential pair (email/password, Google Sign-In, or wedding_code/staff_pin), the system should grant appropriate access, and for any invalid credential pair, the system should deny access with appropriate error messages.
**Validates: Requirements 1.3, 1.4, 4.1**

### Property 3: QR Code Generation and Validation
*For any* guest added to a wedding, the system should generate a unique QR code that, when scanned, correctly identifies that specific guest and wedding combination.
**Validates: Requirements 3.1, 3.3, 4.2**

### Property 4: QR Code Persistence
*For any* guest record update, the original QR code should remain unchanged to maintain consistency.
**Validates: Requirements 3.4**

### Property 5: Data Isolation
*For any* couple's data query, the results should only include data belonging to that specific couple and never include another couple's wedding information.
**Validates: Requirements 2.5, 11.1**

### Property 6: Check-in Idempotence
*For any* guest, attempting to check in multiple times should result in only one check-in record with the original timestamp preserved.
**Validates: Requirements 4.3**

### Property 7: Transaction Consistency
*For any* concurrent check-in operations on the same wedding, the system should maintain data consistency and prevent race conditions through proper transaction handling.
**Validates: Requirements 4.4, 11.2**

### Property 8: Real-time Analytics Updates
*For any* check-in event, the analytics dashboard should reflect the update immediately with accurate guest counts and arrival statistics.
**Validates: Requirements 4.5, 7.2**

### Property 9: Vendor Search Filtering
*For any* search filter combination (location, category, price range), all returned vendors should match the specified criteria.
**Validates: Requirements 5.2**

### Property 10: Lead Generation
*For any* couple-vendor contact interaction, the system should create a lead record and trigger vendor notification.
**Validates: Requirements 5.3, 8.2**

### Property 11: Budget Calculation Accuracy
*For any* budget with expenses, the system should accurately calculate remaining amounts and spending percentages across all categories.
**Validates: Requirements 6.2**

### Property 12: Budget Warning Thresholds
*For any* budget category approaching its limit (e.g., >90% spent), the system should display appropriate warnings to the couple.
**Validates: Requirements 6.3**

### Property 13: Currency Formatting Consistency
*For any* monetary amount in ETB, the system should format and display it consistently across all interfaces using proper Ethiopian Birr formatting.
**Validates: Requirements 6.4**

### Property 14: Review Verification
*For any* review submission, the system should only accept reviews from couples who have completed actual bookings with that vendor, and only verified reviews should be displayed publicly.
**Validates: Requirements 9.1, 9.2, 9.3**

### Property 15: Rating Calculation Accuracy
*For any* vendor with verified reviews, the displayed average rating should be calculated correctly from verified reviews only, excluding any unverified or flagged content.
**Validates: Requirements 9.5**

### Property 16: Content Moderation
*For any* review or profile content containing inappropriate material, the system should flag it for administrative review and exclude it from public display.
**Validates: Requirements 9.4**

### Property 17: Password Security
*For any* password or PIN stored in the system, it should be hashed using bcrypt with appropriate salt rounds and never stored in plain text. Google Sign-In users should have null password_hash and valid firebase_uid.
**Validates: Requirements 11.3**

### Property 18: Session Security
*For any* user session, it should expire after the configured timeout period and require re-authentication for continued access.
**Validates: Requirements 11.4**

### Property 19: Communication Integration
*For any* guest invitation or update, the system should successfully integrate with WhatsApp and SMS services, including proper error handling for delivery failures.
**Validates: Requirements 12.1, 12.4**

### Property 20: Message Content Completeness
*For any* QR code distribution or event update, the message should include all required information (wedding details, check-in instructions, or update content) formatted according to the specified templates.
**Validates: Requirements 12.2, 12.5**

### Property 21: Bulk Messaging Accuracy
*For any* bulk message operation to selected guest groups, all and only the selected guests should receive the message.
**Validates: Requirements 12.3**

### Property 22: Vendor Access Control
*For any* vendor subscription tier, the system should enforce appropriate feature access restrictions, allowing only tier-appropriate functionality.
**Validates: Requirements 8.5**

### Property 24: Firebase Integration
*For any* Google Sign-In authentication, the system should validate Firebase ID tokens on the backend and properly link Firebase UID with PostgreSQL user records.
**Validates: Requirements 11.6, 11.7**

## Security Considerations

### Authentication and Authorization
- **Firebase Authentication**: Google Sign-In with Firebase ID token validation
- **JWT Tokens**: Internal session tokens for traditional authentication
- **Role-Based Access**: Distinct permissions for couples, vendors, staff, and administrators
- **Password Security**: bcrypt hashing with salt rounds for traditional passwords and PINs
- **Session Management**: Secure session handling with Firebase tokens and timeout

### Data Protection
- **Data Isolation**: Wedding data strictly isolated per couple
- **Input Validation**: Comprehensive validation using Pydantic models
- **SQL Injection Prevention**: Parameterized queries through SQLAlchemy ORM
- **XSS Protection**: Input sanitization and output encoding

### API Security
- **Rate Limiting**: Prevent abuse of authentication and check-in endpoints
- **CORS Configuration**: Proper cross-origin resource sharing setup
- **HTTPS Enforcement**: All communications over secure connections
- **API Versioning**: Maintain backward compatibility and security updates

### Privacy Compliance
- **Data Minimization**: Collect only necessary guest and vendor information
- **Consent Management**: Clear consent for communication preferences
- **Data Retention**: Appropriate retention policies for wedding and guest data
- **Right to Deletion**: Support for data removal requests

## Performance Considerations

### Database Optimization
- **Indexing Strategy**: Proper indexes on frequently queried fields (wedding_code, qr_code, email)
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Optimized queries for analytics and reporting
- **Partitioning**: Consider partitioning for large-scale deployments

### Caching Strategy
- **Redis Caching**: Session data and frequently accessed wedding information
- **Query Caching**: Cache expensive analytics calculations
- **Static Asset Caching**: CDN for images and static resources
- **Real-time Data**: Efficient WebSocket connection management

### Scalability
- **Horizontal Scaling**: Stateless API design for load balancing
- **Database Scaling**: Read replicas for analytics queries
- **Microservices Ready**: Modular design for future service separation
- **Queue Management**: Background job processing for communications

### Real-time Performance
- **WebSocket Optimization**: Efficient real-time updates for check-ins
- **Event Streaming**: Optimized event handling for live analytics
- **Connection Management**: Proper WebSocket connection lifecycle
- **Data Synchronization**: Consistent state across multiple clients

## Deployment Architecture

### Infrastructure
- **Container Deployment**: Docker containers for consistent environments
- **Load Balancing**: Multiple API instances behind load balancer
- **Database**: PostgreSQL with backup and replication
- **Caching**: Redis cluster for session and real-time data

### Monitoring and Observability
- **Application Monitoring**: Performance metrics and error tracking
- **Database Monitoring**: Query performance and connection health
- **Real-time Monitoring**: WebSocket connection and check-in performance
- **Business Metrics**: Wedding creation, check-in rates, vendor engagement

### Backup and Recovery
- **Database Backups**: Regular automated backups with point-in-time recovery
- **File Storage**: Backup strategy for uploaded images and documents
- **Disaster Recovery**: Multi-region deployment considerations
- **Data Migration**: Tools for schema updates and data migrations