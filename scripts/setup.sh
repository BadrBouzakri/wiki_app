#!/bin/bash

# Wiki App Setup Script
# This script sets up the development environment for Wiki App

set -e  # Exit on any error

echo "🚀 Setting up Wiki App development environment..."

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

# Check if required tools are installed
check_requirements() {
    print_status "Checking requirements..."
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18 or later."
        exit 1
    fi
    
    # Check Node.js version
    node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt "18" ]; then
        print_error "Node.js version 18 or later is required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check for npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed."
        exit 1
    fi
    
    # Check for Docker (optional)
    if command -v docker &> /dev/null; then
        print_success "Docker found: $(docker --version)"
    else
        print_warning "Docker not found. You can still run the app manually."
    fi
    
    # Check for Docker Compose (optional)
    if command -v docker-compose &> /dev/null; then
        print_success "Docker Compose found: $(docker-compose --version)"
    else
        print_warning "Docker Compose not found. You can still run the app manually."
    fi
    
    print_success "All requirements satisfied!"
}

# Create necessary directories
setup_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p logs
    mkdir -p data/postgres
    mkdir -p data/elasticsearch
    mkdir -p data/redis
    
    print_success "Directories created successfully!"
}

# Install backend dependencies
install_backend_deps() {
    print_status "Installing backend dependencies..."
    
    if [ -f "package.json" ]; then
        npm install
        print_success "Backend dependencies installed!"
    else
        print_error "package.json not found in root directory"
        exit 1
    fi
}

# Install frontend dependencies
install_frontend_deps() {
    print_status "Installing frontend dependencies..."
    
    if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
        cd frontend
        npm install
        cd ..
        print_success "Frontend dependencies installed!"
    else
        print_error "Frontend directory or package.json not found"
        exit 1
    fi
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment files..."
    
    # Backend environment
    if [ ! -f ".env" ]; then
        cp .env.example .env
        print_success "Backend .env file created from .env.example"
        print_warning "Please review and update the .env file with your configuration"
    else
        print_warning ".env file already exists, skipping..."
    fi
    
    # Frontend environment
    if [ -d "frontend" ] && [ ! -f "frontend/.env" ]; then
        cat > frontend/.env << EOF
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:3000
EOF
        print_success "Frontend .env file created"
    fi
}

# Make scripts executable
setup_scripts() {
    print_status "Setting up scripts..."
    
    if [ -d "scripts" ]; then
        chmod +x scripts/*.sh
        print_success "Scripts made executable"
    fi
}

# Generate SSL certificates for development
setup_ssl() {
    print_status "Setting up SSL certificates for development..."
    
    if [ ! -d "nginx/ssl" ]; then
        mkdir -p nginx/ssl
        
        # Generate self-signed certificate
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/key.pem \
            -out nginx/ssl/cert.pem \
            -subj "/C=FR/ST=Nord/L=Lille/O=WikiApp/CN=localhost" \
            2>/dev/null || print_warning "OpenSSL not available, skipping SSL setup"
        
        if [ -f "nginx/ssl/cert.pem" ]; then
            print_success "Self-signed SSL certificate generated"
        fi
    else
        print_warning "SSL certificates already exist, skipping..."
    fi
}

# Create nginx configuration
setup_nginx() {
    print_status "Setting up Nginx configuration..."
    
    if [ ! -f "nginx/nginx.conf" ]; then
        mkdir -p nginx
        cat > nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:3000;
    }
    
    upstream frontend {
        server frontend:80;
    }
    
    server {
        listen 80;
        server_name localhost;
        
        location /api/ {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
        
        location /socket.io/ {
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
        }
        
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF
        print_success "Nginx configuration created"
    fi
}

# Main setup function
main() {
    echo "================================================"
    echo "         Wiki App Development Setup"
    echo "================================================"
    echo ""
    
    check_requirements
    setup_directories
    install_backend_deps
    install_frontend_deps
    setup_environment
    setup_scripts
    setup_ssl
    setup_nginx
    
    echo ""
    echo "================================================"
    print_success "Setup completed successfully! 🎉"
    echo "================================================"
    echo ""
    echo "Next steps:"
    echo "1. Review and update the .env file with your configuration"
    echo "2. Start the services:"
    echo "   - With Docker: docker-compose up -d"
    echo "   - Manual: npm run dev (backend) + npm start (frontend)"
    echo "3. Visit http://localhost:3001 to access the application"
    echo "4. Login with demo credentials: demo@wikiapp.com / demo123"
    echo ""
    echo "For more information, see the README.md file."
}

# Run main function
main "$@"