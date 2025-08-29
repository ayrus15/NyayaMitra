#!/bin/bash

# Production Deployment Script for NyayaMitra

set -e

echo "🚀 Starting NyayaMitra PRODUCTION deployment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if production environment file exists
if [ ! -f .env.production ]; then
    echo "❌ .env.production file not found!"
    echo "💡 Copy .env.production.example to .env.production and configure it first."
    exit 1
fi

# Confirm production deployment
echo "⚠️  This will deploy to PRODUCTION environment!"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Load production environment
export $(cat .env.production | xargs)

# Create necessary directories
echo "📁 Creating production directories..."
mkdir -p logs uploads docker/nginx/ssl

# Pull latest changes (optional)
read -p "Pull latest changes from git? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Pulling latest changes..."
    git pull origin main
fi

# Build and deploy
echo "🏗️  Building production images..."
docker-compose -f docker-compose.prod.yml down --remove-orphans
docker-compose -f docker-compose.prod.yml build --no-cache

echo "🚀 Starting production services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 45

# Check services
echo "🔍 Checking production health..."
for i in {1..60}; do
    if curl -f http://localhost/health > /dev/null 2>&1; then
        echo "✅ Production deployment is healthy!"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "❌ Production deployment failed. Check logs:"
        echo "   docker-compose -f docker-compose.prod.yml logs"
        exit 1
    fi
    sleep 3
done

echo ""
echo "🎉 PRODUCTION deployment completed successfully!"
echo ""
echo "📊 Production Services:"
echo "   Application: http://localhost (or your domain)"
echo "   Health:      http://localhost/health"
echo ""
echo "🔧 Management Commands:"
echo "   View logs:   docker-compose -f docker-compose.prod.yml logs -f"
echo "   Stop all:    docker-compose -f docker-compose.prod.yml down"
echo "   Restart:     docker-compose -f docker-compose.prod.yml restart"
echo ""
echo "⚠️  Remember to:"
echo "   1. Configure SSL certificates for HTTPS"
echo "   2. Set up backup for database and uploads"
echo "   3. Monitor logs and performance"
echo "   4. Configure firewall and security settings"
echo ""