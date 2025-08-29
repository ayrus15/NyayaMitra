# NyayaMitra Legal Systems Backend API

A comprehensive Express.js backend API for the NyayaMitra Legal Systems Web Application, providing legal assistance, case tracking, emergency SOS system, corruption reporting, and AI-powered legal chatbot services.

## 🚀 Features

- **User Authentication & Authorization** - JWT-based authentication with role-based access control
- **Legal Case Tracking** - Track court cases, follow cases for updates, and view case timelines
- **AI Legal Chatbot** - Pickleaxe-powered legal assistance chatbot
- **Emergency SOS System** - Location-based emergency reporting with media upload
- **Corruption Reporting** - Anonymous and public corruption reporting with evidence upload
- **Background Job Processing** - BullMQ-powered background jobs for notifications and data sync
- **Media Management** - AWS S3 integration for secure file uploads
- **Real-time Notifications** - Email and SMS notifications for important updates
- **Comprehensive Security** - Rate limiting, CORS, input validation, and security headers
- **Health Monitoring** - Built-in health checks and performance monitoring

## 📋 Table of Contents

- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Background Jobs](#background-jobs)
- [Docker Setup](#docker-setup)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │    │   Load Balancer │    │     API Server  │
│  (Web/Mobile)   │───▶│    (Nginx)      │───▶│   (Express.js)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
        ┌─────────────────┬─────────────────┬─────────────────┐
        │                 │                 │                 │
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   PostgreSQL    │ │      Redis      │ │   Job Workers   │ │     AWS S3      │
│   (Database)    │ │   (Cache/Jobs)  │ │   (BullMQ)      │ │ (File Storage)  │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

## 🛠️ Technology Stack

### Core
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Jobs**: Redis with BullMQ
- **Authentication**: JWT with refresh tokens

### Security & Validation
- **Validation**: Zod schemas
- **Security**: Helmet, CORS, express-rate-limit
- **Password Hashing**: bcryptjs
- **File Upload**: Multer with S3 integration

### External Services
- **File Storage**: AWS S3 with pre-signed URLs
- **AI Chatbot**: Pickleaxe API integration
- **Notifications**: Email (SMTP) & SMS (Twilio)

### Development & Deployment
- **Build Tool**: TypeScript Compiler
- **Process Manager**: PM2 (production)
- **Containerization**: Docker & Docker Compose
- **Logging**: Winston with structured logging

## 📚 Prerequisites

- **Node.js** 18.x or higher
- **PostgreSQL** 12.x or higher
- **Redis** 6.x or higher
- **Docker** & Docker Compose (optional)
- **AWS Account** (for S3 storage)

## 🔧 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/ayrus15/NyayaMitra.git
cd NyayaMitra
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Setup Database
```bash
# Start PostgreSQL and Redis (if running locally)
# Or use Docker Compose (see Docker Setup section)

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Seed database with sample data
npm run prisma:seed
```

### 5. Build the Application
```bash
npm run build
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/nyayamitra"

# Server Configuration
NODE_ENV="development"
PORT=3000

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# AWS S3 Configuration
AWS_REGION="us-west-2"
AWS_ACCESS_KEY_ID="your-aws-access-key-id"
AWS_SECRET_ACCESS_KEY="your-aws-secret-access-key"
S3_BUCKET_NAME="nyayamitra-uploads"

# External API Configuration
PICKLEAXE_API_URL="https://api.pickleaxe.com/v1"
PICKLEAXE_API_KEY="your-pickleaxe-api-key"

# Notification Configuration (Optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-email-password"

TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"
```

### Security Configuration

The application includes comprehensive security measures:
- Rate limiting (100 requests per 15 minutes by default)
- CORS protection
- Security headers via Helmet
- Input validation with Zod
- SQL injection prevention with Prisma
- XSS protection

## 🗄️ Database Setup

### Using Prisma

The application uses Prisma as the ORM. The schema includes:

- **Users** - Authentication and user management
- **Sessions** - JWT session management
- **Cases & CaseEvents** - Legal case tracking
- **SosIncidents** - Emergency reporting
- **CorruptionReports** - Corruption reporting system
- **MediaAssets** - File upload management
- **ChatSessions & ChatMessages** - AI chatbot conversations

### Migration Commands

```bash
# Generate Prisma client
npm run prisma:generate

# Create and apply migrations
npm run prisma:migrate

# View database in Prisma Studio
npm run prisma:studio

# Reset database (development only)
npx prisma migrate reset
```

## 🚀 Running the Application

### Development Mode
```bash
# Start API server with hot reload
npm run dev

# Start background job workers (in separate terminal)
npm run worker
```

### Production Mode
```bash
# Build the application
npm run build

# Start API server
npm start

# Start background job workers (in separate process)
npm run worker
```

### Using PM2 (Production)
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Monitor processes
pm2 status
pm2 logs
```

## 📖 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "role": "CITIZEN"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Get Profile
```http
GET /api/auth/me
Authorization: Bearer <jwt_token>
```

### Case Tracking Endpoints

#### Search Cases
```http
GET /api/cases/search?query=case&status=ONGOING&page=1&limit=10
```

#### Follow a Case
```http
POST /api/cases/follow
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "caseId": "case_id_here"
}
```

#### Get Followed Cases
```http
GET /api/cases/followed?page=1&limit=10
Authorization: Bearer <jwt_token>
```

### SOS Emergency Endpoints

#### Create SOS Incident
```http
POST /api/sos
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "location": {
    "lat": 28.6139,
    "lng": 77.2090,
    "address": "New Delhi, India"
  },
  "description": "Emergency situation description",
  "priority": "HIGH"
}
```

#### Upload Media to SOS
```http
POST /api/sos/:id/media/upload-urls
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "files": [
    {
      "filename": "evidence.jpg",
      "contentType": "image/jpeg",
      "size": 1024000
    }
  ]
}
```

### Chatbot Endpoints

#### Create Chat Session
```http
POST /api/chat/sessions
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "Legal Query Session"
}
```

#### Send Message
```http
POST /api/chat/sessions/:id/messages
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "content": "What are my rights in a property dispute?",
  "role": "USER"
}
```

## 🔄 Background Jobs

The application uses BullMQ for background job processing:

### Job Types

1. **SOS Dispatch Jobs** - Notify emergency services
2. **Notification Jobs** - Send email/SMS notifications
3. **Case Sync Jobs** - Sync case data from external APIs
4. **Report Triage Jobs** - Auto-assign corruption reports

### Job Monitoring

Access job monitoring at:
```
GET /api/admin/jobs/stats
Authorization: Bearer <admin_token>
```

## 🐳 Docker Setup

### Development with Docker Compose

```bash
# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down
```

### Services Included

- **API Server** - Main Express.js application
- **Worker** - Background job processor
- **PostgreSQL** - Database
- **Redis** - Cache and job queue
- **PgAdmin** - Database administration (development)
- **RedisInsight** - Redis monitoring (development)

### Production Docker Setup

```bash
# Build production image
docker build -t nyayamitra-api .

# Run with production profile
docker-compose --profile production up -d
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure

```
tests/
├── unit/          # Unit tests
├── integration/   # Integration tests
├── fixtures/      # Test data
└── helpers/       # Test utilities
```

## 🚀 Deployment

### Environment Setup

1. **Production Server Requirements**
   - Node.js 18+
   - PostgreSQL 12+
   - Redis 6+
   - Nginx (for load balancing)

2. **Environment Variables**
   - Set `NODE_ENV=production`
   - Use strong JWT secrets
   - Configure production database URLs
   - Set up AWS S3 credentials

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

### Using Docker

```bash
# Build production image
docker build -t nyayamitra-api:latest .

# Run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

### Health Checks

The application includes built-in health checks:
- **API Health**: `GET /health`
- **Database Health**: Included in health endpoint
- **Redis Health**: Included in health endpoint
- **Job System Health**: `GET /api/admin/jobs/health`

## 📊 Monitoring & Logging

### Logging

The application uses Winston for structured logging:
- **Log Levels**: error, warn, info, debug
- **Log Files**: `logs/app.log`, `logs/error.log`
- **Request Logging**: All API requests are logged
- **Security Events**: Authentication failures, authorization denials

### Monitoring

- **Health Endpoints**: Built-in health checks
- **Performance Metrics**: Request duration, memory usage
- **Job Monitoring**: Queue statistics and job success rates

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

### Code Style

- **ESLint**: Run `npm run lint`
- **Prettier**: Code formatting
- **TypeScript**: Strict type checking
- **Conventional Commits**: Use conventional commit messages

### Pull Request Process

1. Ensure tests pass: `npm test`
2. Update documentation if needed
3. Add changelog entry
4. Request code review

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs and feature requests on GitHub
- **Community**: Join our discussions for questions and support

## 🙏 Acknowledgments

- **Prisma** - Next-generation ORM
- **BullMQ** - Robust job queue system
- **Express.js** - Fast, minimalist web framework
- **TypeScript** - Typed JavaScript at scale
- **Zod** - Schema validation with static type inference

---

Built with ❤️ by the NyayaMitra Team