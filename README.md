# NyayaMitra - Digital Legal Companion 🏛️

A comprehensive full-stack web application providing accessible legal services including case tracking, emergency assistance, AI-powered legal chat, and corruption reporting for Indian citizens.

![NyayaMitra Homepage](https://github.com/user-attachments/assets/fdd8d560-3cee-42c7-868d-8d54a4b7dec9)

## 🌟 Features

### 🏛️ **Legal Case Tracking**
- Search and track legal cases across courts
- Follow case updates and hearing schedules
- Real-time case status notifications
- Court calendar integration

### 🚨 **SOS Emergency System**
- One-click emergency assistance
- Location-based emergency services
- Real-time incident tracking
- Priority-based dispatch system

### 🤖 **AI Legal Assistant**
- 24/7 intelligent legal guidance
- Natural language query processing
- Legal document analysis
- Multi-language support

### 📋 **Corruption Reporting**
- Anonymous complaint submission
- Secure evidence upload
- Automated case triaging
- Status tracking and updates

### 🔐 **Security & Authentication**
- JWT-based secure authentication
- Role-based access control (Citizen, Advocate, Admin, Moderator)
- Data encryption and privacy protection
- Multi-factor authentication support

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI) v5
- **State Management**: Redux Toolkit
- **Routing**: React Router v6
- **API Integration**: Axios
- **Build Tool**: Create React App

### Backend
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
- **Containerization**: Docker & Docker Compose
- **Process Manager**: PM2 (production)
- **Reverse Proxy**: Nginx
- **Logging**: Winston with structured logging

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Docker** and Docker Compose
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/ayrus15/NyayaMitra.git
cd NyayaMitra
```

### 2. Environment Setup

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# Update database credentials, JWT secrets, AWS keys, etc.
```

### 3. Quick Deploy with Docker

```bash
# Make deployment script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

This will:
- Start PostgreSQL and Redis containers
- Build and run the backend API
- Build and run the React frontend
- Set up Nginx reverse proxy
- Perform health checks

### 4. Access the Application

- **Frontend**: http://localhost
- **API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

## 🐳 Docker Deployment

### Development Environment

```bash
# Start all services with development tools
docker-compose --profile development up -d

# Access development tools:
# - PgAdmin: http://localhost:8082 (admin@nyayamitra.com / admin)
# - Redis Insight: http://localhost:8001
```

### Production Environment

```bash
# Setup production environment
cp .env.production.example .env.production
# Edit .env.production with production values

# Deploy to production
./deploy-prod.sh
```

## 🏗️ Manual Setup

### Backend Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Build the application
npm run build

# Start the API server
npm start

# Start background workers (in separate terminal)
npm run worker
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## 📊 Application Structure

```
NyayaMitra/
├── frontend/                 # React frontend application
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── store/           # Redux store and slices
│   │   ├── services/        # API services
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   ├── Dockerfile           # Frontend container configuration
│   └── nginx.conf           # Nginx configuration for frontend
├── src/                     # Backend source code
│   ├── routes/              # API route handlers
│   ├── services/            # Business logic services
│   ├── middleware/          # Express middleware
│   ├── jobs/                # Background job processors
│   ├── config/              # Configuration files
│   ├── types/               # TypeScript definitions
│   └── utils/               # Utility functions
├── prisma/                  # Database schema and migrations
├── docker/                  # Docker configuration files
├── logs/                    # Application logs
├── uploads/                 # File uploads (development)
├── docker-compose.yml       # Development setup
├── docker-compose.prod.yml  # Production setup
├── deploy.sh                # Development deployment script
└── deploy-prod.sh           # Production deployment script
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/nyayamitra

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# AWS S3
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
S3_BUCKET_NAME=nyayamitra-uploads

# External APIs
PICKLEAXE_API_URL=https://api.pickleaxe.com/v1
PICKLEAXE_API_KEY=your-pickleaxe-key

# Security
CORS_ORIGIN=http://localhost:3000,http://localhost
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_APP_NAME=NyayaMitra
REACT_APP_VERSION=1.0.0
```

## 📱 Screenshots

### Homepage
![Homepage](https://github.com/user-attachments/assets/fdd8d560-3cee-42c7-868d-8d54a4b7dec9)

### Registration
![Registration](https://github.com/user-attachments/assets/e3d8a2e1-ec01-4a21-a223-a55aa581cd3d)

### Login
![Login](https://github.com/user-attachments/assets/3e31379f-eeec-4f52-a8a9-2fd26c340a74)

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
GET /api/cases/search?query=case_number&status=ONGOING
Authorization: Bearer <jwt_token>
```

#### Follow Case
```http
POST /api/cases/follow
Authorization: Bearer <jwt_token>

{
  "caseId": "case_id_here"
}
```

### SOS Emergency Endpoints

#### Create Emergency
```http
POST /api/sos/create
Authorization: Bearer <jwt_token>

{
  "location": {
    "lat": 28.6139,
    "lng": 77.2090
  },
  "description": "Emergency description",
  "priority": "HIGH"
}
```

### Chat Endpoints

#### Create Chat Session
```http
POST /api/chat/sessions
Authorization: Bearer <jwt_token>

{
  "title": "Legal Query Session"
}
```

#### Send Message
```http
POST /api/chat/sessions/:sessionId/messages
Authorization: Bearer <jwt_token>

{
  "content": "What are my rights in this situation?",
  "role": "USER"
}
```

### Report Endpoints

#### Submit Report
```http
POST /api/reports
Authorization: Bearer <jwt_token>

{
  "title": "Corruption Report",
  "description": "Description of the incident",
  "category": "BRIBERY",
  "location": "Location details",
  "incidentDate": "2024-01-15T10:00:00Z",
  "isAnonymous": false
}
```

## 🔍 Health Monitoring

### Health Check Endpoint
```http
GET /health

Response:
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00Z",
  "uptime": "3600s",
  "environment": "development",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### Monitoring Commands

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api
docker-compose logs -f frontend
docker-compose logs -f postgres

# Check service status
docker-compose ps

# Monitor resource usage
docker stats
```

## 🛡️ Security Features

- **Rate Limiting**: 100 requests per 15 minutes by default
- **CORS Protection**: Configurable origin validation
- **Security Headers**: Comprehensive security headers via Helmet
- **Input Validation**: Zod schema validation for all inputs
- **SQL Injection Prevention**: Prisma ORM with parameterized queries
- **XSS Protection**: Content Security Policy headers
- **Authentication**: JWT with refresh token rotation
- **Password Security**: bcrypt hashing with salt rounds
- **File Upload Security**: Virus scanning and type validation
- **HTTPS Support**: SSL/TLS configuration for production

## 🚀 Production Deployment

### Server Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 50GB minimum SSD
- **CPU**: 2 cores minimum, 4 cores recommended
- **Network**: Static IP with domain name

### SSL/HTTPS Setup

1. **Obtain SSL certificates** (Let's Encrypt recommended):
   ```bash
   # Install Certbot
   sudo apt install certbot python3-certbot-nginx
   
   # Obtain certificate
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

2. **Update nginx configuration** in `docker/nginx/prod.conf`

3. **Configure automatic renewal**:
   ```bash
   # Add to crontab
   0 12 * * * /usr/bin/certbot renew --quiet
   ```

### Backup Strategy

#### Database Backup
```bash
# Create backup script
#!/bin/bash
docker exec nyayamitra-postgres-prod pg_dump -U nyayamitra_user nyayamitra > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### File Uploads Backup
```bash
# Sync uploads to S3
aws s3 sync ./uploads s3://your-backup-bucket/uploads/
```

### Performance Optimization

1. **Database indexing**: Ensure proper indexes on frequently queried fields
2. **Redis caching**: Implement caching for frequently accessed data
3. **CDN setup**: Use CloudFront or similar for static assets
4. **Load balancing**: Scale horizontally with multiple API instances
5. **Database connection pooling**: Configure appropriate pool sizes

## 🧪 Testing

```bash
# Run backend tests
npm test

# Run frontend tests
cd frontend && npm test

# Run integration tests
npm run test:integration

# Check code coverage
npm run test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- **Code Style**: ESLint + Prettier configuration provided
- **Commit Messages**: Use conventional commits
- **Type Safety**: Full TypeScript coverage required
- **Testing**: Write tests for new functionality
- **Documentation**: Update README and API docs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Contact

- **Documentation**: This README and inline code comments
- **Issues**: [GitHub Issues](https://github.com/ayrus15/NyayaMitra/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ayrus15/NyayaMitra/discussions)

## 🙏 Acknowledgments

- Material-UI team for the excellent UI components
- Prisma team for the amazing ORM
- Redis team for the reliable caching solution
- All contributors who helped build this project

---

**NyayaMitra** - Empowering citizens with accessible digital legal services. 🏛️⚖️