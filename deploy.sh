#!/bin/bash

# NyayaMitra Deployment Script

set -e

echo "🚀 Starting NyayaMitra deployment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    echo "❌ Docker Compose is not installed. Please install it and try again."
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs uploads docker/postgres docker/nginx

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please update .env file with your configuration before running again."
    echo "💡 Run 'deploy.sh' after updating your environment variables."
    exit 0
fi

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check if API is responding
echo "🔍 Checking API health..."
for i in {1..30}; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ API is healthy!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ API failed to start. Check logs: docker-compose logs api"
        exit 1
    fi
    sleep 2
done

# Check if Frontend is responding
echo "🔍 Checking Frontend..."
for i in {1..20}; do
    if curl -f http://localhost > /dev/null 2>&1; then
        echo "✅ Frontend is healthy!"
        break
    fi
    if [ $i -eq 20 ]; then
        echo "❌ Frontend failed to start. Check logs: docker-compose logs frontend"
        exit 1
    fi
    sleep 2
done

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Services:"
echo "   Frontend: http://localhost"
echo "   API:      http://localhost:3000"
echo "   Health:   http://localhost:3000/health"
echo ""
echo "🔧 Management:"
echo "   View logs:    docker-compose logs -f"
echo "   Stop all:     docker-compose down"
echo "   Restart:      docker-compose restart"
echo ""
echo "📈 Development tools (if enabled):"
echo "   PgAdmin:     http://localhost:8082 (admin@nyayamitra.com / admin)"
echo "   Redis Admin: http://localhost:8001"
echo ""
echo "💡 To enable dev tools: docker-compose --profile development up -d"
echo ""