# GitHub Actions Setup Guide

This guide will help you configure GitHub secrets for automatic deployments.

## Prerequisites

You need to add secrets to your GitHub repository to enable automatic deployments on every push to the `main` branch.

## Adding GitHub Secrets

1. Go to your repository: https://github.com/McCarthy13/QCToolsApp
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each secret below

## Required Secrets for Firebase Deployment

### 1. FIREBASE_SERVICE_ACCOUNT_PRECAST_QC_TOOLS_WEB_APP
Copy the entire JSON from your `.env` file's `FIREBASE_SERVICE_ACCOUNT` value.

### 2. EXPO_PUBLIC_FIREBASE_API_KEY
Get this from your `.env` file

### 3. EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
Get this from your `.env` file

### 4. EXPO_PUBLIC_FIREBASE_PROJECT_ID
Get this from your `.env` file

### 5. EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
Get this from your `.env` file

### 6. EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
Get this from your `.env` file

### 7. EXPO_PUBLIC_FIREBASE_APP_ID
Get this from your `.env` file

## How It Works

Once you add all the secrets:

1. Every push to the `main` branch will trigger the workflow
2. The workflow will:
   - Install dependencies
   - Build the web app with your Firebase config
   - Deploy to Firebase Hosting at https://precast-qc-tools-web-app.web.app

## Verification

After adding secrets and pushing code:
1. Go to the **Actions** tab in your repository
2. You should see the workflow running
3. Once complete, your app will be live at https://precast-qc-tools-web-app.web.app

## Notes

- The Firebase API key is safe to expose publicly (it's used for client-side authentication)
- The service account key should be kept secret
- GitHub automatically provides the `GITHUB_TOKEN` secret for deployments
