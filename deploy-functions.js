#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function enableAndDeployFunctions() {
  console.log('🔧 Enabling Cloud Functions API and deploying...\n');

  // Load .env file
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Error: .env file not found');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');

  let projectId = '';
  let serviceAccount = '';

  lines.forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;

    if (line.startsWith('FIREBASE_PROJECT_ID=')) {
      projectId = line.substring('FIREBASE_PROJECT_ID='.length);
    } else if (line.startsWith('FIREBASE_SERVICE_ACCOUNT=')) {
      serviceAccount = line.substring('FIREBASE_SERVICE_ACCOUNT='.length);
    }
  });

  if (!projectId || !serviceAccount) {
    console.error('❌ Error: Missing FIREBASE_PROJECT_ID or FIREBASE_SERVICE_ACCOUNT');
    process.exit(1);
  }

  // Create temp service account file
  const tempSaFile = `/tmp/firebase-sa-${Date.now()}.json`;
  fs.writeFileSync(tempSaFile, serviceAccount);

  try {
    // Activate service account
    console.log('🔐 Activating service account...');
    execSync(`gcloud auth activate-service-account --key-file="${tempSaFile}"`, { stdio: 'inherit' });

    // Set project
    console.log(`📦 Setting project: ${projectId}`);
    execSync(`gcloud config set project ${projectId}`, { stdio: 'inherit' });

    // Enable required APIs
    console.log('🔧 Enabling required APIs...');
    execSync('gcloud services enable cloudfunctions.googleapis.com', { stdio: 'inherit' });
    execSync('gcloud services enable cloudbuild.googleapis.com', { stdio: 'inherit' });
    execSync('gcloud services enable artifactregistry.googleapis.com', { stdio: 'inherit' });

    // Deploy functions
    console.log('\n⚡ Deploying Cloud Functions...');
    execSync(`npx firebase deploy --only functions --project ${projectId}`, {
      stdio: 'inherit',
      env: {
        ...process.env,
        GOOGLE_APPLICATION_CREDENTIALS: tempSaFile
      }
    });

    console.log('\n✅ Cloud Functions deployment complete!');
    console.log(`🌐 Function URL: https://us-central1-${projectId}.cloudfunctions.net/openaiVisionProxy`);

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  } finally {
    // Cleanup
    if (fs.existsSync(tempSaFile)) {
      fs.unlinkSync(tempSaFile);
    }
  }
}

enableAndDeployFunctions();
