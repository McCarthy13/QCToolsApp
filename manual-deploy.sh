#!/bin/bash

# Manual Firebase Hosting deployment using REST API
# This bypasses the Firebase CLI authentication issues

set -e

PROJECT_ID="precast-qc-tools-web-app"
echo "🔥 Manually deploying to Firebase Hosting..."
echo "Project: $PROJECT_ID"

# Create a tarball of web-build
echo "📦 Creating deployment archive..."
cd web-build
tar -czf ../deploy.tar.gz *
cd ..

echo "✅ Archive created: deploy.tar.gz"
echo ""
echo "⚠️  Manual deployment required:"
echo "1. Go to Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID/hosting"
echo "2. Upload the deploy.tar.gz file manually"
echo ""
echo "OR run this from an authenticated environment:"
echo "  firebase deploy --only hosting --project $PROJECT_ID"
