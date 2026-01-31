# 🚀 DeliveryHub - Multi-Delivery Provider SaaS Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-%3E%3D20.0.0-blue)](https://www.docker.com/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-%3E%3D13.0-blue)](https://www.postgresql.org/)

A comprehensive SaaS platform for e-commerce businesses to manage orders across 25+ delivery providers in Morocco. Built with modern technologies and designed for scalability, multi-tenancy, and ease of use.

## 🌟 Features

### 🏢 **Multi-Tenant SaaS Architecture**
- Complete tenant isolation with row-level security
- Subscription-based billing with multiple plans
- Usage tracking and limits enforcement
- White-label customization options

### 📦 **Order Management**
- Unified order processing across all delivery providers
- Real-time order tracking and status updates
- Automated duplicate detection
- Bulk operations and batch processing
- Advanced filtering and search capabilities

### 🚚 **25+ Delivery Provider Integrations**
- **Coliix** - API-based integration
- **Cathedis** - Session-based authentication
- **Forcelog** - RESTful API
- **Sendit** - Token-based authentication
- **OzonExpress** - Real-time tracking
- **Speedaf** - Multi-city coverage
- **Ameex** - Advanced logistics
- **Vitex** - Stock management integration
- And 17+ more providers...

### 💬 **Communication Hub**
- **WhatsApp Business API** integration
- **SMS** notifications via Twilio
- **Email** campaigns and notifications
- Automated message templates
- Multi-language support (Arabic, French, English)

### 🤖 **Workflow Automation**
- Rule-based automation engine
- Trigger-based actions (order created, status changed, etc.)
- Conditional logic and complex workflows
- Integration with external webhooks
- Background job processing

### 📊 **Advanced Analytics & Reporting**
- Real-time dashboard with KPIs
- Revenue and performance analytics
- Delivery provider comparison
- Customer behavior insights
- Exportable reports (PDF, Excel, CSV)

### 👥 **User & Team Management**
- Role-based access control (Owner, Admin, Manager, Agent, Viewer)
- Team collaboration features
- Activity tracking and audit logs
- Session management

### 🔧 **Developer-Friendly**
- RESTful API with comprehensive documentation
- Webhook support for real-time integrations
- SDK and code examples
- Postman collections

## 🏗️ **Technology Stack**

### **Backend**
- **Node.js** with Express.js framework
- **PostgreSQL** database with advanced indexing
- **Redis** for caching and job queues
- **JWT** authentication with refresh tokens
- **Bull** for background job processing
- **Winston** for structured logging

### **Frontend**
- **React 18** with modern hooks
- **Vite** for fast development and building
- **Tailwind CSS** for responsive design
- **React Query** for state management
- **React Router** for navigation
- **Recharts** for data visualization

### **Infrastructure**
- **Docker** containerization
- **Nginx** reverse proxy
- **PostgreSQL** with replication support
- **Redis Cluster** for high availability
- **Prometheus & Grafana** for monitoring

## 🚀 **Quick Start**

### **Prerequisites**
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Git

### **1. Clone the Repository**
```bash
git clone https://github.com/deliveryhub/platform.git
cd platform
```

### **2. Run Setup Script**
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### **3. Start the Platform**
```bash
# Development environment
docker-compose up -d

# Production environment
docker-compose --profile production up -d

# With monitoring
docker-compose --profile production --profile monitoring up -d
```

### **4. Access the Application**
- **Frontend**: http://localhost:3001
- **API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api-docs
- **Grafana**: http://localhost:3003 (admin/admin123)

## 📋 **Configuration**

### **Environment Variables**
Copy `.env.example` to `.env` and configure:

```bash
# Database
DB_HOST=localhost
DB_NAME=deliveryhub
DB_USER=postgres
DB_PASSWORD=your-secure-password

# JWT Security
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ENCRYPTION_KEY=your-32-character-encryption-key!!

# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-access-token

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### **Delivery Provider Setup**
1. Navigate to **Settings > Delivery Providers**
2. Configure credentials for each provider
3. Test connections
4. Enable providers for your tenant

## 📖 **API Documentation**

### **Authentication**
```bash
# Register new tenant
POST /api/v1/auth/register
{
  "email": "admin@company.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "tenantName": "My Company"
}

# Login
POST /api/v1/auth/login
{
  "email": "admin@company.com",
  "password": "SecurePass123!"
}
```

### **Order Management**
```bash
# Create order
POST /api/v1/orders
{
  "customerName": "Ahmed Hassan",
  "customerPhone": "0612345678",
  "cityId": "uuid-city-id",
  "address": "123 Rue Mohammed V, Casablanca",
  "items": [
    {
      "productId": "uuid-product-id",
      "quantity": 2,
      "unitPrice": 199.00
    }
  ],
  "deliveryProviderId": "uuid-provider-id",
  "source": "facebook"
}

# Get orders with filters
GET /api/v1/orders?status=confirmed&page=1&limit=20
```

### **Delivery Provider Integration**
```bash
# Sync order with delivery provider
POST /api/v1/orders/{orderId}/sync

# Check delivery status
GET /api/v1/orders/{orderId}/status

# Bulk sync orders
POST /api/v1/orders/bulk/sync
{
  "filters": {
    "status": "confirmed",
    "deliveryProvider": "coliix"
  }
}
```

## 🔧 **Development**

### **Local Development Setup**
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev

# Database migrations
npm run migrate

# Seed data
npm run seed
```

### **Testing**
```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd frontend
npm test

# Integration tests
npm run test:integration
```

### **Code Quality**
```bash
# Linting
npm run lint
npm run lint:fix

# Type checking
npm run type-check

# Security audit
npm audit
```

## 📊 **Monitoring & Observability**

### **Metrics & Monitoring**
- **Prometheus** metrics collection
- **Grafana** dashboards for visualization
- **Health checks** for all services
- **Performance monitoring** with APM

### **Logging**
- Structured JSON logging with Winston
- Centralized log aggregation
- Error tracking with Sentry integration
- Audit trails for compliance

### **Alerting**
- Real-time alerts for system issues
- Performance threshold monitoring
- Business metric alerts (order failures, etc.)
- Integration with Slack/Discord/Email

## 🔒 **Security**

### **Authentication & Authorization**
- JWT tokens with refresh mechanism
- Role-based access control (RBAC)
- Multi-factor authentication (2FA)
- Session management and timeout

### **Data Protection**
- Encryption at rest and in transit
- PII data anonymization
- GDPR compliance features
- Regular security audits

### **Infrastructure Security**
- Container security scanning
- Network isolation
- SSL/TLS encryption
- Regular dependency updates

## 🌍 **Deployment**

### **Production Deployment**
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy with SSL
docker-compose -f docker-compose.prod.yml --profile production up -d

# Database backup
docker-compose --profile backup run backup
```

### **Cloud Deployment**
- **AWS ECS/EKS** deployment guides
- **Google Cloud Run** configuration
- **Azure Container Instances** setup
- **DigitalOcean App Platform** deployment

### **Scaling**
- Horizontal scaling with load balancers
- Database read replicas
- Redis clustering
- CDN integration for static assets

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### **Development Workflow**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### **Code Standards**
- ESLint configuration for JavaScript/React
- Prettier for code formatting
- Conventional commits for git messages
- Comprehensive test coverage

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 **Support**

### **Documentation**
- [API Documentation](https://docs.deliveryhub.ma)
- [User Guide](https://help.deliveryhub.ma)
- [Developer Resources](https://developers.deliveryhub.ma)

### **Community**
- [Discord Server](https://discord.gg/deliveryhub)
- [GitHub Discussions](https://github.com/deliveryhub/platform/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/deliveryhub)

### **Commercial Support**
- Email: support@deliveryhub.ma
- Enterprise support packages available
- Custom integration services

## 🗺️ **Roadmap**

### **Q1 2024**
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Multi-warehouse support
- [ ] API rate limiting improvements

### **Q2 2024**
- [ ] Machine learning for delivery optimization
- [ ] Advanced automation workflows
- [ ] International expansion (Tunisia, Algeria)
- [ ] White-label customization

### **Q3 2024**
- [ ] Marketplace integration (Shopify, WooCommerce)
- [ ] Advanced reporting and BI
- [ ] Customer portal
- [ ] Inventory management

## 📈 **Statistics**

- **25+** Delivery provider integrations
- **Multi-tenant** architecture supporting unlimited tenants
- **Real-time** order processing and tracking
- **99.9%** uptime SLA
- **Sub-second** API response times
- **Scalable** to millions of orders per month

---

**Built with ❤️ in Morocco for the global e-commerce community**

For more information, visit [deliveryhub.ma](https://deliveryhub.ma)