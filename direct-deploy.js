#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get credentials from environment
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
const projectId = process.env.FIREBASE_PROJECT_ID || 'precast-qc-tools-web-app';

if (!serviceAccountJson) {
  console.error('Error: FIREBASE_SERVICE_ACCOUNT not found in environment');
  process.exit(1);
}

// Create temporary service account file
const tempSaFile = '/tmp/firebase-deploy-sa.json';
fs.writeFileSync(tempSaFile, serviceAccountJson);

console.log('🔥 Deploying to Firebase Hosting...');
console.log(`📦 Project: ${projectId}`);
console.log(`📁 Directory: web-build`);

try {
  // Set the environment variable for Google Application Credentials
  process.env.GOOGLE_APPLICATION_CREDENTIALS = tempSaFile;

  // Deploy using Firebase CLI with service account
  const result = execSync(`npx firebase-tools deploy --only hosting --project ${projectId} --non-interactive`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      GOOGLE_APPLICATION_CREDENTIALS: tempSaFile
    }
  });

  console.log('\n✅ Deployment successful!');
  console.log(`🌐 Live at: https://${projectId}.web.app`);

} catch (error) {
  console.error('\n❌ Deployment failed:', error.message);
  process.exit(1);
} finally {
  // Cleanup
  try {
    if (fs.existsSync(tempSaFile)) {
      fs.unlinkSync(tempSaFile);
    }
  } catch (e) {
    console.warn('Warning: Failed to cleanup temp file');
  }
}
