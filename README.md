# Wedding Platform

A comprehensive wedding platform webapp that combines couple planning tools, vendor marketplace, real-time guest check-in system, and analytics dashboards.

## 🏗️ Project Structure

```
wedding-platform/
├── backend/                 # Python FastAPI backend
│   ├── app/                # Application code
│   │   ├── api/           # API endpoints
│   │   ├── core/          # Core configuration
│   │   └── models/        # Database models
│   ├── alembic/           # Database migrations
│   ├── tests/             # Backend tests
│   └── requirements.txt   # Python dependencies
├── frontend/              # React TypeScript frontend
│   ├── src/              # Source code
│   │   └── config/       # Configuration files
│   ├── public/           # Static assets
│   └── package.json      # Node.js dependencies
├── scripts/              # Utility scripts
├── docker-compose.yml    # Docker services
└── package.json         # Monorepo configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- Python 3.12+
- Docker and Docker Compose (for databases)

### Installation

1. **Clone and install dependencies:**
```bash
npm run install:all
```

2. **Start database services:**
```bash
docker-compose up -d postgres redis
```

3. **Run database migrations:**
```bash
cd backend
python -m alembic upgrade head
```

4. **Start development servers:**
```bash
# Terminal 1: Backend
cd backend
python -m uvicorn app.main:app --reload

# Terminal 2: Frontend  
cd frontend
npm start
```

## 🔧 Configuration

### Backend Configuration
- **Database:** PostgreSQL with SQLAlchemy/SQLModel
- **Cache:** Redis for sessions and real-time data
- **Authentication:** Firebase Auth + JWT tokens
- **API:** FastAPI with automatic OpenAPI docs

### Frontend Configuration
- **Framework:** React 18 with TypeScript
- **Styling:** Tailwind CSS v3
- **State Management:** React Query
- **Authentication:** Firebase SDK
- **Charts:** Recharts for analytics

### Firebase Setup
The project is configured with Firebase project `wedhabesha`:
- **Project ID:** wedhabesha
- **Auth Domain:** wedhabesha.firebaseapp.com
- **Storage:** wedhabesha.firebasestorage.app

## 💬 Messaging System

The platform includes a comprehensive real-time messaging system enabling direct communication between couples and vendors.

### Architecture
- **Backend:** Node.js/Express API with WebSocket support
- **Real-time:** Socket.io for instant message delivery
- **Database:** SQLite with optimized messaging schema
- **Frontend:** React components with TypeScript
- **Security:** JWT authentication and message encryption

### Key Features
- **Bidirectional Messaging:** Couples can initiate conversations with vendors
- **Real-time Delivery:** Instant message delivery via WebSocket
- **File Attachments:** Support for images (10MB) and PDFs (25MB)
- **Search & Filter:** Find conversations and messages quickly
- **Mobile Optimized:** Responsive design for mobile devices
- **Notifications:** Browser notifications and sound alerts
- **Read Receipts:** Message status tracking
- **Typing Indicators:** Real-time typing status
- **Thread Management:** Organized conversation history
- **Lead Integration:** Link messages to vendor leads

### API Endpoints
- `GET /api/v1/messaging/couple/threads` - Get couple's threads
- `POST /api/v1/messaging/couple/threads` - Create new thread
- `GET /api/v1/messaging/couple/threads/:id/messages` - Get messages
- `POST /api/v1/messaging/couple/messages` - Send message
- `PUT /api/v1/messaging/couple/messages/:id/read` - Mark as read

### WebSocket Events
- `couple:join` - Join messaging rooms
- `couple:message:send` - Send real-time message
- `couple:typing:start/stop` - Typing indicators
- `message:new` - Receive new messages
- `message:read` - Read receipt updates

### Security Features
- JWT token authentication
- Message encryption (AES-256-GCM)
- Rate limiting (60 requests/minute)
- File type validation
- Access control verification
- Audit logging

For detailed API documentation, see [backend-node/docs/API_DOCUMENTATION.md](backend-node/docs/API_DOCUMENTATION.md)

## 📊 Database Schema

The database includes tables for:
- **Users & Authentication:** User, Couple, Vendor profiles
- **Wedding Management:** Wedding, Guest, CheckIn records
- **Marketplace:** VendorLead, Review, Rating system
- **Budget Planning:** Budget, BudgetCategory, Expense tracking

## 🛠️ Development

### Available Scripts

**Root level:**
- `npm run dev` - Start both frontend and backend
- `npm run build` - Build both applications
- `npm run test` - Run all tests
- `npm run lint` - Lint all code

**Backend:**
- `python -m uvicorn app.main:app --reload` - Development server
- `python -m pytest` - Run tests
- `python -m alembic revision --autogenerate -m "message"` - Create migration

**Frontend:**
- `npm start` - Development server
- `npm run build` - Production build
- `npm test` - Run tests

### API Documentation
When the backend is running, visit:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **Messaging API Docs:** [backend-node/docs/API_DOCUMENTATION.md](backend-node/docs/API_DOCUMENTATION.md)

## 🔐 Security Features

- **Authentication:** Firebase Auth + bcrypt password hashing
- **Authorization:** Role-based access control (Couple, Vendor, Staff, Admin)
- **Data Isolation:** Wedding data strictly isolated per couple
- **Session Management:** Secure JWT tokens with Redis storage
- **Input Validation:** Comprehensive Pydantic validation

## 🎯 Key Features

### For Couples
- Wedding setup and configuration
- Guest management with QR code generation
- Real-time analytics dashboard
- Budget planning and expense tracking
- Vendor discovery and communication
- **Couple-to-Vendor Messaging**: Direct communication with vendors through real-time messaging interface
  - Initiate conversations from vendor profiles
  - Real-time message delivery via WebSocket
  - File attachment support (images, PDFs)
  - Search and filter conversations
  - Mobile-optimized messaging interface
  - Typing indicators and read receipts
  - Browser notifications for new messages

### For Vendors
- Business profile management
- Lead tracking and conversion
- Performance analytics
- Review and rating system
- **Vendor Messaging Dashboard**: Comprehensive messaging tools for vendor communication
  - Respond to couple inquiries in real-time
  - Thread management with lead integration
  - Messaging analytics and performance metrics
  - File sharing capabilities

### For Staff
- QR code scanning for guest check-in
- Real-time arrival monitoring
- Manual check-in fallback

### For Administrators
- Vendor approval workflow
- Content moderation
- Platform analytics and health monitoring

## 🧪 Testing

The project includes comprehensive testing:
- **Unit Tests:** pytest (backend), Jest (frontend)
- **Property-Based Tests:** Hypothesis (backend), fast-check (frontend)
- **Integration Tests:** Full API and database testing
- **End-to-End Tests:** Complete user workflow testing
- **Messaging Tests:** Comprehensive testing for couple-vendor messaging system
  - Backend API endpoint testing
  - WebSocket connection and real-time messaging tests
  - Frontend component and integration tests
  - Security and authorization testing
  - Performance and load testing

## 📈 Performance

- **Database:** Connection pooling and optimized queries
- **Caching:** Redis for frequently accessed data
- **Real-time:** WebSocket connections for live updates
- **Frontend:** React Query for efficient state management
- **Messaging Performance:**
  - Message delivery under 2 seconds
  - Mobile interface loads under 3 seconds
  - Efficient pagination (50 messages per load)
  - Thread list caching for improved responsiveness
  - Optimized WebSocket message compression

## 🚢 Deployment

The project is containerized and ready for deployment:
- **Backend:** FastAPI with Uvicorn
- **Frontend:** Nginx-served React build
- **Database:** PostgreSQL with automated backups
- **Cache:** Redis cluster for scalability

## 📋 Requirements Satisfied

This setup satisfies the following requirements:
- ✅ **11.1** - Data isolation and PostgreSQL setup
- ✅ **11.2** - Database transactions and connection pooling  
- ✅ **11.3** - Security configuration and password hashing
- ✅ **11.6** - Firebase integration setup

## 🤝 Contributing

1. Follow the established code style (Black for Python, Prettier for TypeScript)
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting PRs

## 📄 License

This project is proprietary software for the Wedding Platform application.

---

**Status:** ✅ Project Setup and Core Infrastructure - COMPLETED