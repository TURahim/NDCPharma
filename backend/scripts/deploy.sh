#!/bin/bash

###############################################################################
# Deployment Script for NDC Calculator Backend
# Usage: ./deploy.sh [dev|staging|prod]
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if environment argument is provided
if [ -z "$1" ]; then
    print_error "Environment argument required: dev, staging, or prod"
    echo "Usage: ./deploy.sh [dev|staging|prod]"
    exit 1
fi

ENVIRONMENT=$1

# Validate environment
if [ "$ENVIRONMENT" != "dev" ] && [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "prod" ]; then
    print_error "Invalid environment: $ENVIRONMENT"
    echo "Must be one of: dev, staging, prod"
    exit 1
fi

print_info "Starting deployment to $ENVIRONMENT environment..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI not found. Please install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    print_error "Not logged in to Firebase. Please run: firebase login"
    exit 1
fi

# Navigate to functions directory
cd "$(dirname "$0")/../functions"

# Install dependencies
print_info "Installing dependencies..."
npm install

# Run linter
print_info "Running linter..."
npm run lint

# Run tests
print_info "Running tests..."
npm test

# Build TypeScript
print_info "Building TypeScript..."
npm run build

# Navigate back to backend root
cd ..

# Select Firebase project
print_info "Selecting Firebase project: $ENVIRONMENT"
firebase use $ENVIRONMENT

# Confirmation for production deployment
if [ "$ENVIRONMENT" = "prod" ]; then
    print_warn "You are about to deploy to PRODUCTION!"
    read -p "Are you sure you want to continue? (yes/no): " confirmation
    if [ "$confirmation" != "yes" ]; then
        print_info "Deployment cancelled"
        exit 0
    fi
fi

# Deploy Firestore rules
print_info "Deploying Firestore rules..."
firebase deploy --only firestore:rules

# Deploy Firestore indexes
print_info "Deploying Firestore indexes..."
firebase deploy --only firestore:indexes

# Deploy Cloud Functions
print_info "Deploying Cloud Functions..."
firebase deploy --only functions

# Deployment complete
print_info "✅ Deployment to $ENVIRONMENT completed successfully!"

# Run post-deployment health check
print_info "Running post-deployment health check..."
sleep 5  # Wait for deployment to propagate

# Get the function URL based on environment
if [ "$ENVIRONMENT" = "dev" ]; then
    PROJECT_ID="ndc-calculator-dev"
elif [ "$ENVIRONMENT" = "staging" ]; then
    PROJECT_ID="ndc-calculator-staging"
else
    PROJECT_ID="ndc-calculator-prod"
fi

FUNCTION_URL="https://us-central1-${PROJECT_ID}.cloudfunctions.net/api/health"

# Check health endpoint
if curl -f -s "$FUNCTION_URL" > /dev/null; then
    print_info "✅ Health check passed: $FUNCTION_URL"
else
    print_warn "⚠️  Health check failed or endpoint not responding yet"
    print_info "URL: $FUNCTION_URL"
fi

print_info "Deployment process complete!"

