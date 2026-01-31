#!/bin/bash

# DeliveryHub Netlify Deployment Script
# This script automates the deployment process to Netlify

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
echo "🚀 DeliveryHub Netlify Deployment"
echo "=================================="
echo -e "${NC}"

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo -e "${YELLOW}Installing Netlify CLI...${NC}"
    npm install -g netlify-cli
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}Initializing Git repository...${NC}"
    git init
    git add .
    git commit -m "Initial commit: DeliveryHub SaaS Platform for Netlify"
fi

# Build frontend
echo -e "${BLUE}[1/5]${NC} Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Install Netlify Functions dependencies
echo -e "${BLUE}[2/5]${NC} Installing Netlify Functions dependencies..."
cd netlify/functions
npm install
cd ../..

# Deploy to Netlify
echo -e "${BLUE}[3/5]${NC} Deploying to Netlify..."
netlify deploy --prod --dir=frontend/dist --functions=netlify/functions

# Get deployment URL
SITE_URL=$(netlify status --json | grep -o '"url":"[^"]*' | cut -d'"' -f4)

echo -e "${BLUE}[4/5]${NC} Testing deployment..."
sleep 10

# Test health endpoint
if curl -f "${SITE_URL}/.netlify/functions/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API is healthy${NC}"
else
    echo -e "${RED}❌ API health check failed${NC}"
fi

# Test frontend
if curl -f "${SITE_URL}" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is accessible${NC}"
else
    echo -e "${RED}❌ Frontend is not accessible${NC}"
fi

echo -e "${BLUE}[5/5]${NC} Deployment complete!"
echo
echo -e "${GREEN}🎉 DeliveryHub is now live on Netlify!${NC}"
echo
echo -e "${BLUE}📋 Access Information:${NC}"
echo "• Frontend: ${SITE_URL}"
echo "• API: ${SITE_URL}/.netlify/functions/api"
echo "• Health: ${SITE_URL}/.netlify/functions/api/health"
echo "• System Info: ${SITE_URL}/.netlify/functions/api/v1/system/info"
echo
echo -e "${BLUE}🔑 Test Credentials:${NC}"
echo "• Email: admin@test.com"
echo "• Password: Admin123!"
echo
echo -e "${BLUE}📚 Netlify Dashboard:${NC}"
echo "• https://app.netlify.com"
echo
echo -e "${GREEN}Happy shipping with Netlify! 📦${NC}"