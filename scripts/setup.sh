#!/bin/bash

# DeliveryHub SaaS Platform Setup Script
# This script sets up the development environment

set -e

echo "🚀 Setting up DeliveryHub SaaS Platform..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if Node.js is installed (for local development)
check_nodejs() {
    if ! command -v node &> /dev/null; then
        print_warning "Node.js is not installed. You'll need it for local development."
        print_warning "You can still use Docker for development."
    else
        NODE_VERSION=$(node --version)
        print_success "Node.js is installed: $NODE_VERSION"
    fi
}

# Create environment file
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        cp .env.example .env
        print_success "Created .env file from .env.example"
        print_warning "Please update the .env file with your configuration"
    else
        print_warning ".env file already exists, skipping..."
    fi
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p backend/uploads
    mkdir -p backend/logs
    mkdir -p backups
    mkdir -p nginx/ssl
    mkdir -p monitoring/grafana/dashboards
    mkdir -p monitoring/grafana/datasources
    
    print_success "Directories created"
}

# Generate SSL certificates for development
generate_ssl_certs() {
    print_status "Generating SSL certificates for development..."
    
    if [ ! -f nginx/ssl/cert.pem ]; then
        openssl req -x509 -newkey rsa:4096 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem -days 365 -nodes \
            -subj "/C=MA/ST=Casablanca/L=Casablanca/O=DeliveryHub/CN=localhost"
        print_success "SSL certificates generated"
    else
        print_warning "SSL certificates already exist, skipping..."
    fi
}

# Setup database initialization
setup_database() {
    print_status "Setting up database initialization..."
    
    mkdir -p database/init
    
    # Copy database schema
    if [ -f database-schema.sql ]; then
        cp database-schema.sql database/init/01-schema.sql
        print_success "Database schema copied to init directory"
    fi
}

# Install dependencies for local development
install_dependencies() {
    read -p "Do you want to install Node.js dependencies for local development? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Installing backend dependencies..."
        cd backend && npm install && cd ..
        print_success "Backend dependencies installed"
        
        print_status "Installing frontend dependencies..."
        cd frontend && npm install && cd ..
        print_success "Frontend dependencies installed"
    fi
}

# Setup Docker containers
setup_docker() {
    print_status "Setting up Docker containers..."
    
    # Build images
    docker-compose build
    print_success "Docker images built"
    
    # Start services
    print_status "Starting services..."
    docker-compose up -d postgres redis
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    sleep 10
    
    # Run database migrations
    print_status "Running database migrations..."
    docker-compose run --rm api npm run migrate
    
    print_success "Database setup completed"
}

# Create initial admin user
create_admin_user() {
    read -p "Do you want to create an initial admin user? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Creating admin user..."
        
        read -p "Enter admin email: " ADMIN_EMAIL
        read -s -p "Enter admin password: " ADMIN_PASSWORD
        echo
        read -p "Enter company name: " COMPANY_NAME
        
        # Create admin user via API (you'll need to implement this endpoint)
        docker-compose run --rm api node scripts/create-admin.js \
            --email="$ADMIN_EMAIL" \
            --password="$ADMIN_PASSWORD" \
            --company="$COMPANY_NAME"
        
        print_success "Admin user created"
    fi
}

# Display final instructions
show_instructions() {
    print_success "🎉 DeliveryHub setup completed!"
    echo
    print_status "Next steps:"
    echo "1. Update the .env file with your configuration"
    echo "2. Start the development environment:"
    echo "   docker-compose up -d"
    echo
    print_status "Access the application:"
    echo "• Frontend: http://localhost:3001"
    echo "• API: http://localhost:3000"
    echo "• API Documentation: http://localhost:3000/api-docs"
    echo "• Database: localhost:5432"
    echo "• Redis: localhost:6379"
    echo
    print_status "Optional monitoring (with --profile monitoring):"
    echo "• Prometheus: http://localhost:9090"
    echo "• Grafana: http://localhost:3003 (admin/admin123)"
    echo
    print_status "Useful commands:"
    echo "• View logs: docker-compose logs -f [service]"
    echo "• Stop services: docker-compose down"
    echo "• Rebuild: docker-compose build --no-cache"
    echo "• Database backup: docker-compose --profile backup run backup"
    echo
    print_warning "Don't forget to:"
    echo "• Update .env with production values before deploying"
    echo "• Configure your delivery provider credentials"
    echo "• Set up WhatsApp Business API tokens"
    echo "• Configure email SMTP settings"
}

# Main execution
main() {
    echo "🏗️  DeliveryHub SaaS Platform Setup"
    echo "=================================="
    echo
    
    check_docker
    check_nodejs
    setup_environment
    create_directories
    generate_ssl_certs
    setup_database
    install_dependencies
    setup_docker
    create_admin_user
    show_instructions
}

# Run main function
main "$@"