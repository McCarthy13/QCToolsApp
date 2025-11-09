#!/bin/bash

# Vibecode Firebase Deployment Script
# This script deploys the web app to Firebase Hosting using service account authentication

set -e  # Exit on any error

echo "🚀 Starting Firebase deployment..."

# Load environment variables from .env file
if [ -f ".env" ]; then
  echo "📝 Loading credentials from .env file..."
  export $(grep -v '^#' .env | xargs)
else
  echo "❌ Error: .env file not found"
  exit 1
fi

# Check if service account credentials exist
if [ -z "$FIREBASE_SERVICE_ACCOUNT" ]; then
  echo "❌ Error: FIREBASE_SERVICE_ACCOUNT not found in .env file"
  exit 1
fi

if [ -z "$FIREBASE_PROJECT_ID" ]; then
  echo "❌ Error: FIREBASE_PROJECT_ID not found in .env file"
  exit 1
fi

# Create temporary service account file
echo "📝 Creating temporary service account credentials..."
echo "$FIREBASE_SERVICE_ACCOUNT" > /tmp/firebase-service-account.json

# Set the Google Application Credentials environment variable
export GOOGLE_APPLICATION_CREDENTIALS="/tmp/firebase-service-account.json"

# Build the web app
echo "🔨 Building web app for production..."
bun run web --no-dev --minify

# Wait for build to complete
echo "⏳ Waiting for build to complete..."
sleep 5

# Check if web-build directory exists
if [ ! -d "web-build" ]; then
  echo "❌ Error: web-build directory not found. Build may have failed."
  exit 1
fi

echo "✅ Build completed successfully!"

# Deploy to Firebase Hosting
echo "🌐 Deploying to Firebase Hosting..."
bunx firebase deploy --only hosting --project "$FIREBASE_PROJECT_ID"

# Clean up temporary service account file
rm /tmp/firebase-service-account.json

echo "✨ Deployment completed successfully!"
echo "🌍 Your app is live at: https://${FIREBASE_PROJECT_ID}.web.app"
