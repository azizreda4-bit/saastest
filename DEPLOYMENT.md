# 🚀 DeliveryHub Deployment Guide

This guide will help you deploy DeliveryHub from your existing Google Apps Script system to a full SaaS platform.

## 📋 **Prerequisites**

- Docker & Docker Compose installed
- Your Google Sheets data exported as CSV
- Basic knowledge of command line
- 15-30 minutes of time

## 🎯 **Quick Start (5 Minutes)**

### **Step 1: Get the Code**
```bash
# Clone or download the DeliveryHub platform
git clone <your-repo-url>
cd deliveryhub-platform

# Or if you have the files locally, navigate to the directory
cd /path/to/deliveryhub-platform
```

### **Step 2: Quick Setup**
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Run the quick start script
./scripts/quick-start.sh
```

This script will:
- ✅ Check prerequisites
- ✅ Create environment files
- ✅ Start database and Redis
- ✅ Run database migrations
- ✅ Start all services

### **Step 3: Create Admin User**
```bash
node scripts/create-admin.js \
  --email=admin@yourcompany.com \
  --password=SecurePass123! \
  --company="Your Company Name"
```

**Save the Tenant ID** from the output - you'll need it for data migration!

### **Step 4: Access the Platform**
- **Frontend**: http://localhost:3001
- **Login**: Use the email/password from Step 3
- **API Docs**: http://localhost:3000/api-docs

## 📊 **Data Migration from Google Sheets**

### **Export Your Data**

#### **Option A: Manual Export (Recommended)**
1. Open your Google Sheet: "📦Géstion des Commandes"
2. File → Download → Comma Separated Values (.csv)
3. Save as `orders.csv`

#### **Option B: Google Apps Script Export**
Add this to your existing script:
```javascript
function exportToCSV() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('📦Géstion des Commandes');
  const data = sheet.getDataRange().getValues();
  
  const csv = data.map(row => 
    row.map(cell => 
      typeof cell === 'string' && cell.includes(',') 
        ? '"' + cell.replace(/"/g, '""') + '"' 
        : cell
    ).join(',')
  ).join('\n');
  
  const blob = Utilities.newBlob(csv, 'text/csv', 'orders.csv');
  DriveApp.createFile(blob);
}
```

### **Run Migration**
```bash
# Get migration instructions
node scripts/export-sheets-data.js

# Run the actual migration (use your tenant ID from Step 3)
node scripts/migrate-from-sheets.js orders.csv <your-tenant-id>
```

The migration will:
- ✅ Import all your orders
- ✅ Create customers automatically
- ✅ Create products automatically
- ✅ Map delivery providers
- ✅ Preserve all status information

## ⚙️ **Configure Delivery Providers**

### **1. Login to DeliveryHub**
- Go to http://localhost:3001/auth/login
- Use your admin credentials

### **2. Add Delivery Provider Credentials**
Navigate to **Settings → Delivery Providers** and configure:

#### **Coliix**
```
API Key: your-coliix-api-key
```

#### **Cathedis**
```
Username: your-cathedis-username
Password: your-cathedis-password
```

#### **Forcelog**
```
API Key: your-forcelog-api-key
```

#### **Sendit**
```
Access Token: your-sendit-access-token
```

### **3. Test Connections**
- Click "Test Connection" for each provider
- Enable providers that test successfully

## 📱 **WhatsApp Business API Setup**

### **1. Get WhatsApp Credentials**
- Go to [Facebook Developers](https://developers.facebook.com/)
- Create a WhatsApp Business API app
- Get your Phone Number ID and Access Token

### **2. Configure in DeliveryHub**
Navigate to **Settings → Communications → WhatsApp**:
```
Phone Number ID: your-phone-number-id
Access Token: your-whatsapp-access-token
```

### **3. Set Up Webhook (Optional)**
For receiving message status updates:
```
Webhook URL: https://your-domain.com/api/v1/webhooks/whatsapp
Verify Token: your-webhook-verify-token
```

## 🔧 **Production Deployment**

### **Environment Configuration**
Update your `.env` file for production:

```bash
# Production settings
NODE_ENV=production

# Secure database
DB_HOST=your-production-db-host
DB_PASSWORD=your-very-secure-password

# Secure JWT
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters-long
ENCRYPTION_KEY=your-secure-32-character-encryption-key

# Production URLs
FRONTEND_URL=https://app.yourcompany.com
ADMIN_URL=https://admin.yourcompany.com

# Email configuration
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### **Deploy to Production**
```bash
# Build production images
docker-compose -f docker-compose.yml --profile production build

# Start production services
docker-compose -f docker-compose.yml --profile production up -d

# With monitoring
docker-compose -f docker-compose.yml --profile production --profile monitoring up -d
```

## 🌐 **Cloud Deployment Options**

### **AWS ECS/Fargate**
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

docker build -t deliveryhub-api ./backend
docker tag deliveryhub-api:latest <account>.dkr.ecr.us-east-1.amazonaws.com/deliveryhub-api:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/deliveryhub-api:latest
```

### **Google Cloud Run**
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT-ID/deliveryhub-api ./backend
gcloud run deploy --image gcr.io/PROJECT-ID/deliveryhub-api --platform managed
```

### **DigitalOcean App Platform**
```yaml
# app.yaml
name: deliveryhub
services:
- name: api
  source_dir: /backend
  github:
    repo: your-username/deliveryhub
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
```

## 📊 **Monitoring & Maintenance**

### **Health Checks**
```bash
# Check service health
curl http://localhost:3000/health
curl http://localhost:3001/health

# View logs
docker-compose logs -f api
docker-compose logs -f frontend
```

### **Database Backup**
```bash
# Manual backup
docker-compose --profile backup run backup

# Automated backup (add to crontab)
0 2 * * * cd /path/to/deliveryhub && docker-compose --profile backup run backup
```

### **Monitoring Dashboard**
Access Grafana at http://localhost:3003 (admin/admin123) for:
- System metrics
- API performance
- Database statistics
- Business metrics

## 🔒 **Security Checklist**

### **Before Going Live:**
- [ ] Change all default passwords
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up regular backups
- [ ] Enable monitoring and alerting
- [ ] Review user permissions
- [ ] Test disaster recovery

### **SSL Certificate Setup**
```bash
# Using Let's Encrypt
certbot --nginx -d yourdomain.com -d api.yourdomain.com

# Or use your existing certificates
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem
```

## 🚀 **Go Live Checklist**

### **Pre-Launch (1 week before)**
- [ ] Complete data migration and verification
- [ ] Configure all delivery providers
- [ ] Set up WhatsApp Business API
- [ ] Train your team on the new interface
- [ ] Test all critical workflows
- [ ] Set up monitoring and alerts

### **Launch Day**
- [ ] Deploy to production
- [ ] Verify all services are running
- [ ] Test order creation and processing
- [ ] Verify delivery provider integrations
- [ ] Test WhatsApp messaging
- [ ] Monitor system performance

### **Post-Launch (1 week after)**
- [ ] Monitor system stability
- [ ] Gather user feedback
- [ ] Optimize performance if needed
- [ ] Set up automated backups
- [ ] Plan team training sessions

## 🆘 **Troubleshooting**

### **Common Issues**

#### **Database Connection Failed**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

#### **API Not Responding**
```bash
# Check API logs
docker-compose logs api

# Restart API
docker-compose restart api

# Check health
curl http://localhost:3000/health
```

#### **Migration Errors**
```bash
# Check migration logs
docker-compose logs api | grep migration

# Run migrations manually
docker-compose run --rm api npm run migrate

# Reset database (⚠️ DANGER: This deletes all data)
docker-compose run --rm api npm run migrate:rollback
docker-compose run --rm api npm run migrate
```

### **Performance Issues**
```bash
# Check resource usage
docker stats

# Scale services
docker-compose up -d --scale api=3

# Check database performance
docker-compose exec postgres psql -U postgres -d deliveryhub -c "SELECT * FROM pg_stat_activity;"
```

## 📞 **Support**

### **Getting Help**
- 📧 Email: support@deliveryhub.ma
- 💬 Discord: [Join our community](https://discord.gg/deliveryhub)
- 📚 Documentation: [docs.deliveryhub.ma](https://docs.deliveryhub.ma)
- 🐛 Issues: [GitHub Issues](https://github.com/deliveryhub/platform/issues)

### **Professional Services**
- Migration assistance
- Custom integrations
- Training and onboarding
- Dedicated support

---

## 🎉 **Congratulations!**

You've successfully transformed your Google Apps Script system into a modern, scalable SaaS platform! 

Your new DeliveryHub platform provides:
- ✅ Multi-tenant architecture
- ✅ 25+ delivery provider integrations
- ✅ Modern React dashboard
- ✅ WhatsApp Business API
- ✅ Automated workflows
- ✅ Real-time analytics
- ✅ Team collaboration
- ✅ API access for integrations

**Welcome to the future of e-commerce logistics! 🚀📦**