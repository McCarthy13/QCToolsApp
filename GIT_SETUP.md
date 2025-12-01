# Git Repository Setup & Synchronization Guide

## Overview

This repository is configured with dual remotes to ensure seamless synchronization between GitHub, Vibecode Sandbox, and Firebase deployment.

## Remote Configuration

### Current Setup
```
origin   → GitHub: https://github.com/McCarthy13/QCToolsApp (PRIMARY)
vibecode → Vibecode Sandbox Repository (BACKUP)
```

### Branch Tracking
```
main → tracks origin/main (GitHub)
```

## Repository Synchronization

### Three Environments
1. **GitHub Repository** - Primary source of truth and version control
2. **Vibecode Sandbox** - Development environment with live reload
3. **Firebase Project** - Production deployment (`precast-qc-tools-web-app`)

### How Synchronization Works

#### Automatic (Current Setup)
- All commits are pushed to both GitHub and Vibecode
- Upstream tracking is set to GitHub (origin)
- Changes in sandbox automatically sync to both repositories

#### Manual Sync Commands

**Quick Sync (Recommended)**
```bash
./sync-repos.sh
```

**Manual Push to Both Repositories**
```bash
git push origin main      # Push to GitHub
git push vibecode main    # Push to Vibecode
```

**Pull Latest from GitHub**
```bash
git pull origin main      # Pull from GitHub
git push vibecode main    # Sync to Vibecode
```

## Security & Credentials Management

### Protected Files (in .gitignore)
- `.env*` - All environment variable files
- `*service-account*.json` - Firebase service account credentials
- `*.key`, `*.pem`, `*.p12` - Private keys and certificates
- `CREDENTIALS.md` - Credential documentation
- `node_modules/`, `.expo/`, `.firebase/` - Build artifacts

### Environment Variables

**NEVER commit secrets to the repository!**

All sensitive credentials should be managed through:
- **Vibecode ENV Tab** - For sandbox environment variables
- **Firebase Secret Manager** - For production API keys (Functions)
- **GitHub Secrets** - For CI/CD workflows

### Current Environment Variables Required

These should be set in **Vibecode ENV Tab**:
```
FIREBASE_PROJECT_ID=precast-qc-tools-web-app
FIREBASE_SERVICE_ACCOUNT=<service-account-json>
```

Firebase Functions also requires (managed via Firebase Secret Manager):
```
ANTHROPIC_API_KEY=<your-anthropic-key>
OPENAI_API_KEY=<your-openai-key>
```

## Common Workflows

### Making Changes

1. **Make your changes** in the Vibecode sandbox
2. **Commit locally**
   ```bash
   git add .
   git commit -m "your message"
   ```
3. **Push to both repositories**
   ```bash
   ./sync-repos.sh
   ```

### Deploying to Firebase

After pushing changes:
```bash
npm run deploy        # Deploy everything
# or specific services:
npm run deploy:hosting
npm run deploy:functions
npm run deploy:rules
```

### Checking Sync Status

```bash
git status                    # Check working directory
git remote -v                 # View remotes
git log --oneline -5          # Recent commits
git log origin/main..main     # Commits not pushed to GitHub
git log vibecode/main..main   # Commits not pushed to Vibecode
```

## Troubleshooting

### If Push Fails

**Remote has changes you don't have:**
```bash
git pull origin main --rebase
./sync-repos.sh
```

**Merge conflicts:**
```bash
# Resolve conflicts in your editor
git add .
git rebase --continue
./sync-repos.sh
```

### If Credentials Are Exposed

1. **Immediately revoke** the exposed credentials
2. **Remove from git history:**
   ```bash
   # Use BFG Repo Cleaner or git filter-branch
   # Contact admin if already pushed
   ```
3. **Generate new credentials**
4. **Update in Vibecode ENV tab** and Firebase Secret Manager

### If Repositories Are Out of Sync

```bash
# Fetch all remotes
git fetch --all

# Check differences
git log origin/main..vibecode/main

# Force sync (use carefully!)
git push vibecode main --force-with-lease
```

## Best Practices

1. ✅ **Always use the ENV tab** for environment variables
2. ✅ **Commit frequently** with descriptive messages
3. ✅ **Push to both remotes** after each commit
4. ✅ **Run tests** before deploying to Firebase
5. ✅ **Check .gitignore** before committing new files
6. ❌ **Never commit** `.env` files or service account keys
7. ❌ **Never force push** to main unless absolutely necessary
8. ❌ **Never commit** large files or build artifacts

## GitHub Actions Workflow

The repository includes a GitHub Actions workflow for automated Firebase deployment:

```yaml
.github/workflows/firebase-deploy.yml
```

This workflow:
- Runs on push to main branch
- Deploys hosting, functions, and Firestore rules
- Uses GitHub secrets for Firebase authentication

**Required GitHub Secrets:**
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `ANTHROPIC_API_KEY`

## Quick Reference

| Task | Command |
|------|---------|
| Sync to both repos | `./sync-repos.sh` |
| Check status | `git status` |
| View remotes | `git remote -v` |
| Deploy to Firebase | `npm run deploy` |
| Pull from GitHub | `git pull origin main` |
| Add environment var | Use Vibecode ENV tab |

## Support

For issues with:
- **Git/GitHub**: Check git logs and remote configuration
- **Vibecode Sync**: Verify ENV tab settings
- **Firebase Deploy**: Check `firebase.json` and credentials
- **Secrets Exposed**: Revoke immediately and regenerate

---

**Last Updated**: 2025-12-01
**Maintained By**: Vibecode AI Assistant
