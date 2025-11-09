#!/bin/bash

# Script to enable Cloud Functions API and deploy functions

set -e

echo "🔧 Enabling Cloud Functions API..."

# Load environment variables
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    exit 1
fi

source .env

# Create temp service account file
TEMP_SA_FILE="/tmp/firebase-sa-$(date +%s).json"
echo "$FIREBASE_SERVICE_ACCOUNT" > "$TEMP_SA_FILE"

export GOOGLE_APPLICATION_CREDENTIALS="$TEMP_SA_FILE"

# Activate service account
echo "🔐 Activating service account..."
gcloud auth activate-service-account --key-file="$TEMP_SA_FILE"

# Set project
echo "📦 Setting project: $FIREBASE_PROJECT_ID"
gcloud config set project "$FIREBASE_PROJECT_ID"

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Deploy functions
echo "⚡ Deploying Cloud Functions..."
npx firebase deploy --only functions --project "$FIREBASE_PROJECT_ID"

# Cleanup
rm -f "$TEMP_SA_FILE"

echo "✅ Cloud Functions deployment complete!"
echo "🌐 Function URL: https://us-central1-$FIREBASE_PROJECT_ID.cloudfunctions.net/openaiVisionProxy"
