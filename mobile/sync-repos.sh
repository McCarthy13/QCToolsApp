#!/bin/bash
# Automated Repository Sync Script
# This script ensures changes are synchronized across GitHub, Vibecode, and Firebase

set -e  # Exit on error

echo "🔄 Starting repository synchronization..."

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if there are uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  Warning: Uncommitted changes detected${NC}"
    echo "Please commit your changes first or use: git add . && git commit -m 'your message'"
    exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}Current branch: ${CURRENT_BRANCH}${NC}"

# Verify .env is not being tracked
if git ls-files --error-unmatch .env 2>/dev/null; then
    echo -e "${YELLOW}⚠️  WARNING: .env file is tracked by git!${NC}"
    echo "Removing .env from git tracking..."
    git rm --cached .env
    git commit -m "chore: remove .env from git tracking"
fi

# Push to GitHub (origin)
echo -e "${BLUE}📤 Pushing to GitHub...${NC}"
if git push origin "$CURRENT_BRANCH"; then
    echo -e "${GREEN}✅ Successfully pushed to GitHub${NC}"
else
    echo -e "${YELLOW}⚠️  Failed to push to GitHub${NC}"
    exit 1
fi

# Push to Vibecode
echo -e "${BLUE}📤 Pushing to Vibecode sandbox...${NC}"
if git remote get-url vibecode >/dev/null 2>&1; then
    if git push vibecode "$CURRENT_BRANCH" 2>/dev/null; then
        echo -e "${GREEN}✅ Successfully pushed to Vibecode${NC}"
    else
        echo -e "${YELLOW}⚠️  Failed to push to Vibecode (this is optional)${NC}"
    fi
else
    echo -e "${YELLOW}ℹ️  Vibecode remote not configured, skipping${NC}"
fi

# Deploy to Firebase (if deploy.js exists)
if [ -f "deploy.js" ]; then
    echo -e "${BLUE}🚀 Deploying to Firebase...${NC}"
    if node deploy.js; then
        echo -e "${GREEN}✅ Successfully deployed to Firebase${NC}"
    else
        echo -e "${YELLOW}⚠️  Failed to deploy to Firebase${NC}"
    fi
else
    echo -e "${YELLOW}ℹ️  deploy.js not found, skipping Firebase deployment${NC}"
fi

echo -e "${GREEN}✅ Repository synchronization complete!${NC}"
