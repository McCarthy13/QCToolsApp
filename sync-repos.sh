#!/bin/bash
# Sync script to push changes to both GitHub and Vibecode repositories

set -e

echo "🔄 Starting repository sync..."

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
  echo "⚠️  Warning: You have uncommitted changes. Please commit them first."
  git status -s
  exit 1
fi

# Fetch latest from GitHub
echo "📥 Fetching from GitHub..."
git fetch origin

# Push to GitHub
echo "📤 Pushing to GitHub (origin)..."
git push origin main

# Push to Vibecode
echo "📤 Pushing to Vibecode..."
git push vibecode main

echo "✅ Sync complete! All repositories are up to date."
echo ""
echo "Repository status:"
git remote -v
