#!/bin/bash

# DeliveryHub Quick Start Script
# This script gets you up and running in under 5 minutes

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
echo "🚀 DeliveryHub SaaS Platform - Quick Start"
echo "=========================================="
echo -e "${NC}"

# Check prerequisites
echo -e "${BLUE}[1/6]${NC} Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Setup environment
echo -e "${BLUE}[2/6]${NC} Setting up environment..."

if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ Environment file created${NC}"
else
    echo -e "${YELLOW}⚠️ Environment file already exists${NC}"
fi

# Create directories
echo -e "${BLUE}[3/6]${NC} Creating directories..."
mkdir -p backend/uploads backend/logs backups nginx/ssl
echo -e "${GREEN}✅ Directories created${NC}"

# Start core services
echo -e "${BLUE}[4/6]${NC} Starting core services..."
docker-compose up -d postgres redis

echo "Waiting for database to be ready..."
sleep 15

# Run database migrations
echo -e "${BLUE}[5/6]${NC} Setting up database..."
docker-compose run --rm api npm run migrate || {
    echo -e "${RED}❌ Database migration failed${NC}"
    echo "Trying to create database first..."
    docker-compose exec postgres createdb -U postgres deliveryhub || true
    docker-compose run --rm api npm run migrate
}

echo -e "${GREEN}✅ Database setup completed${NC}"

# Start all services
echo -e "${BLUE}[6/6]${NC} Starting all services..."
docker-compose up -d

echo "Waiting for services to start..."
sleep 10

# Check service health
echo -e "${BLUE}Checking service health...${NC}"

# Check API health
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API is healthy${NC}"
else
    echo -e "${YELLOW}⚠️ API is starting up...${NC}"
fi

# Check frontend
if curl -f http://localhost:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "${YELLOW}⚠️ Frontend is starting up...${NC}"
fi

echo
echo -e "${GREEN}🎉 DeliveryHub is now running!${NC}"
echo
echo -e "${BLUE}📋 Access Information:${NC}"
echo "• Frontend: http://localhost:3001"
echo "• API: http://localhost:3000"
echo "• API Docs: http://localhost:3000/api-docs"
echo "• Database: localhost:5432 (postgres/postgres123)"
echo "• Redis: localhost:6379"
echo
echo -e "${BLUE}🔧 Next Steps:${NC}"
echo "1. Create an admin user:"
echo "   node scripts/create-admin.js --email=admin@yourcompany.com --password=SecurePass123! --company=\"Your Company\""
echo
echo "2. Login to the platform:"
echo "   Open http://localhost:3001/auth/login"
echo
echo "3. Configure delivery providers:"
echo "   Go to Settings > Delivery Providers"
echo
echo "4. Import your existing data:"
echo "   node scripts/export-sheets-data.js  # For instructions"
echo "   node scripts/migrate-from-sheets.js orders.csv <tenant-id>"
echo
echo -e "${BLUE}📚 Useful Commands:${NC}"
echo "• View logs: docker-compose logs -f [service]"
echo "• Stop services: docker-compose down"
echo "• Restart: docker-compose restart"
echo "• Update: docker-compose pull && docker-compose up -d"
echo
echo -e "${YELLOW}💡 Tip: Keep this terminal open to monitor the services${NC}"
echo
echo -e "${GREEN}Happy shipping! 📦${NC}"