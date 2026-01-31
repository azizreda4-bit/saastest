#!/bin/bash

# DeliveryHub Vercel Deployment Script
# This script automates the deployment process to Vercel

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
echo "🚀 DeliveryHub Vercel Deployment"
echo "================================="
echo -e "${NC}"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Installing Vercel CLI...${NC}"
    npm install -g vercel
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}Initializing Git repository...${NC}"
    git init
    git add .
    git commit -m "Initial commit: DeliveryHub SaaS Platform"
fi

# Build frontend
echo -e "${BLUE}[1/5]${NC} Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Prepare backend for serverless
echo -e "${BLUE}[2/5]${NC} Preparing backend..."
cd backend
npm install
cd ..

# Deploy to Vercel
echo -e "${BLUE}[3/5]${NC} Deploying to Vercel..."
vercel --prod

# Get deployment URL
DEPLOYMENT_URL=$(vercel ls | grep "deliveryhub" | head -1 | awk '{print $2}')

echo -e "${BLUE}[4/5]${NC} Testing deployment..."
sleep 10

# Test health endpoint
if curl -f "https://${DEPLOYMENT_URL}/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API is healthy${NC}"
else
    echo -e "${RED}❌ API health check failed${NC}"
fi

# Test frontend
if curl -f "https://${DEPLOYMENT_URL}" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
else
    echo -e "${RED}❌ Frontend is not accessible${NC}"
fi

echo -e "${BLUE}[5/5]${NC} Deployment complete!"
echo
echo -e "${GREEN}🎉 DeliveryHub is now live!${NC}"
echo
echo -e "${BLUE}📋 Access Information:${NC}"
echo "• Frontend: https://${DEPLOYMENT_URL}"
echo "• API: https://${DEPLOYMENT_URL}/api"
echo "• API Docs: https://${DEPLOYMENT_URL}/api/api-docs"
echo "• Health: https://${DEPLOYMENT_URL}/api/health"
echo
echo -e "${BLUE}🔑 Test Credentials:${NC}"
echo "• Email: admin@test.com"
echo "• Password: Admin123!"
echo
echo -e "${GREEN}Happy shipping! 📦${NC}"