#!/bin/bash

# DeliveryHub GitHub Setup Script
# This script helps set up the GitHub repository

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
echo "📚 DeliveryHub GitHub Setup"
echo "==========================="
echo -e "${NC}"

# Get repository information
read -p "Enter your GitHub username: " GITHUB_USERNAME
read -p "Enter repository name (default: deliveryhub-saas): " REPO_NAME
REPO_NAME=${REPO_NAME:-deliveryhub-saas}

echo -e "${BLUE}[1/4]${NC} Initializing Git repository..."

# Initialize git if not already done
if [ ! -d ".git" ]; then
    git init
    echo -e "${GREEN}✅ Git repository initialized${NC}"
else
    echo -e "${YELLOW}⚠️ Git repository already exists${NC}"
fi

# Add all files
git add .

# Create initial commit
if git diff --staged --quiet; then
    echo -e "${YELLOW}⚠️ No changes to commit${NC}"
else
    git commit -m "Initial commit: DeliveryHub SaaS Platform

Features:
- Multi-tenant SaaS architecture
- React frontend with modern UI
- Node.js/Express backend API
- PostgreSQL database schema
- JWT authentication
- Docker deployment ready
- Vercel deployment configuration
- 25+ delivery provider integrations (structure)
- WhatsApp Business API integration (structure)
- Analytics and reporting
- Multi-user management
- Order tracking and management

Tech Stack:
- Frontend: React, Vite, Tailwind CSS
- Backend: Node.js, Express, PostgreSQL
- Deployment: Docker, Vercel
- Authentication: JWT
- Database: PostgreSQL/SQLite"
    
    echo -e "${GREEN}✅ Initial commit created${NC}"
fi

echo -e "${BLUE}[2/4]${NC} Setting up remote repository..."

# Add remote origin
REPO_URL="https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"
git remote remove origin 2>/dev/null || true
git remote add origin $REPO_URL

echo -e "${GREEN}✅ Remote repository configured: ${REPO_URL}${NC}"

echo -e "${BLUE}[3/4]${NC} Setting up main branch..."

# Rename to main branch
git branch -M main

echo -e "${BLUE}[4/4]${NC} Ready to push to GitHub..."

echo
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Create the repository on GitHub:"
echo "   - Go to: https://github.com/new"
echo "   - Repository name: ${REPO_NAME}"
echo "   - Description: Multi-tenant SaaS platform for delivery management in Morocco"
echo "   - Make it Public (or Private)"
echo "   - DON'T initialize with README, .gitignore, or license"
echo
echo "2. Push your code:"
echo "   git push -u origin main"
echo
echo "3. Set up Vercel deployment:"
echo "   - Go to: https://vercel.com"
echo "   - Import your GitHub repository"
echo "   - Configure environment variables"
echo
echo -e "${GREEN}🎉 GitHub setup complete!${NC}"
echo
echo -e "${BLUE}Repository URL: ${REPO_URL}${NC}"