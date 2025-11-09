# Enabling Cloud Functions for Product Tag Scanner

## Problem
The deployed web app needs to call OpenAI's API, but the Vibecode proxy URL has SSL certificate issues when accessed from iOS browsers (Chrome/Safari).

## Solution
Deploy a Firebase Cloud Function that proxies OpenAI requests server-side, avoiding the SSL issue.

## Steps to Enable and Deploy

### 1. Grant Service Account Permissions
The Firebase service account needs additional permissions to deploy Cloud Functions.

Go to [IAM & Admin Console](https://console.cloud.google.com/iam-admin/iam?project=precast-qc-tools-web-app) and add these roles to the service account:
```
firebase-adminsdk-fbsvc@precast-qc-tools-web-app.iam.gserviceaccount.com
```

Add these roles:
- **Service Usage Admin** (to enable APIs)
- **Cloud Functions Developer** (to deploy functions)
- **Cloud Build Service Account** (for building functions)

### 2. Enable Required APIs
Go to [API Library](https://console.cloud.google.com/apis/library?project=precast-qc-tools-web-app) and enable:
- Cloud Functions API
- Cloud Build API
- Artifact Registry API

### 3. Deploy Cloud Functions
Once permissions are granted, run:
```bash
cd /home/user/workspace
npx firebase deploy --only functions --project precast-qc-tools-web-app
```

Or use the full deploy script:
```bash
node deploy.js
```
Then manually deploy functions:
```bash
GOOGLE_APPLICATION_CREDENTIALS=/tmp/firebase-sa.json npx firebase deploy --only functions
```

### 4. Verify Deployment
After successful deployment, the function will be available at:
```
https://us-central1-precast-qc-tools-web-app.cloudfunctions.net/openaiVisionProxy
```

Test it with:
```bash
curl -X POST https://us-central1-precast-qc-tools-web-app.cloudfunctions.net/openaiVisionProxy \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}],"model":"gpt-4o"}'
```

## Files Created
- `/home/user/workspace/functions/index.js` - Cloud Function code
- `/home/user/workspace/functions/package.json` - Function dependencies
- `/home/user/workspace/firebase.json` - Updated with functions config

## How It Works
1. Web app (deployed on Firebase Hosting) detects it's running in a browser
2. Instead of calling Vibecode proxy directly (which has SSL issues), it calls our Cloud Function
3. Cloud Function (running on Google's servers) calls the Vibecode proxy where SSL works properly
4. Response is returned to the web app

## Alternative: Contact Vibecode
Ask Vibecode to fix the SSL certificate issue on `api.openai.com.proxy.vibecodeapp.com` so the direct proxy URL works from browsers.
