#!/bin/bash

# Precast Quality Tools - Web Deployment Script
# This script builds and packages the web app for Firebase Hosting deployment

set -e  # Exit on any error

echo "=========================================="
echo "Precast Quality Tools - Web Deployment"
echo "=========================================="
echo ""

# Step 1: Build the web app
echo "[1/3] Building web app with Expo..."
npx expo export:web

echo ""
echo "[2/3] Creating deployment package..."

# Create a clean deployment package
cd web-build
zip -r ../precast-quality-tools-web.zip . -q

cd ..

echo ""
echo "[3/3] Deployment package created!"
echo ""
echo "=========================================="
echo "✅ Build Complete!"
echo "=========================================="
echo ""
echo "Your deployment package is ready:"
echo "  📦 precast-quality-tools-web.zip"
echo ""
echo "Next steps:"
echo "  1. Download via SSH:"
echo "     scp -P 2222 vibecode@0199bbde-61be-725f-8b7a-b6d873c51eff.vibecodeapp.io:/home/user/workspace/precast-quality-tools-web.zip ."
echo ""
echo "  2. On your local computer, extract the zip file"
echo ""
echo "  3. Deploy to Firebase:"
echo "     cd QCToolsApp"
echo "     firebase deploy --only hosting"
echo ""
echo "=========================================="
