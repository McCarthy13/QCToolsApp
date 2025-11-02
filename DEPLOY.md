# Web App Deployment Guide

## Overview

The Precast Quality Tools app runs on Vibecode's remote server and can be deployed as a web application to Firebase Hosting. This guide covers how to deploy updates to the live web app.

---

## 🚀 Quick Deploy (From Vibecode Server)

### Step 1: Build on Vibecode

In the Vibecode environment, run the automated deployment script:

```bash
./deploy-web.sh
```

This script will:
- Build the web app with `npx expo export:web`
- Create a deployment package: `precast-quality-tools-web.zip`
- Display download and deployment instructions

### Step 2: Download to Your Computer

On your local computer (Windows PowerShell):

```powershell
scp -P 2222 vibecode@0199bbde-61be-725f-8b7a-b6d873c51eff.vibecodeapp.io:/home/user/workspace/precast-quality-tools-web.zip .
```

**Password:** `unsubtly-stardust-bottling-harpist-penalty`

### Step 3: Extract the Package

```powershell
# Navigate to your deployment folder
cd "C:\Users\patmc\OneDrive - Molin Concrete Products\QCToolsApp"

# Extract the zip file (will overwrite old web-build folder)
Expand-Archive -Path precast-quality-tools-web.zip -DestinationPath web-build -Force
```

### Step 4: Deploy to Firebase

```powershell
firebase deploy --only hosting
```

### Step 5: Verify Deployment

Your app will be live at:
```
https://precast-qc-tools-web-app.web.app
```

Open in browser and test the login to ensure everything works!

---

## 🔧 One-Time Setup (Already Done)

These steps were completed during initial setup and don't need to be repeated:

### Firebase CLI Installation
```powershell
npm install -g firebase-tools
```

### Firebase Login
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
firebase login
```

### Firebase Project Initialization
```powershell
firebase init
```

---

## 📋 Future Updates Workflow

Every time you make changes to the app:

1. **Make changes in Vibecode** - Edit code, add features, fix bugs
2. **Run deployment script** - `./deploy-web.sh` on Vibecode
3. **Download package** - Use SCP to get the zip file
4. **Extract** - Unzip to replace old web-build folder
5. **Deploy** - `firebase deploy --only hosting`
6. **Test** - Verify at https://precast-qc-tools-web-app.web.app

**Typical deployment time:** 5-10 minutes from build to live

---

## Need Help?

- Check README.md for full documentation
- Firebase Console: https://console.firebase.google.com/
- Your project: precast-qc-tools-web-app
