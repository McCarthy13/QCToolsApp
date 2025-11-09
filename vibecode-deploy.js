#!/usr/bin/env node

/**
 * Vibecode Firebase Deployment Script
 * Accesses Vibecode environment variables directly from process.env
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Firebase deployment...');

// Access Vibecode environment variables
const projectId = process.env.FIREBASE_PROJECT_ID;
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

console.log('📝 Checking Firebase credentials...');
console.log('  FIREBASE_PROJECT_ID:', projectId ? 'Found' : 'Missing');
console.log('  FIREBASE_SERVICE_ACCOUNT:', serviceAccount ? 'Found' : 'Missing');

if (!projectId || !serviceAccount) {
  console.error('❌ Error: Firebase credentials not found in environment');
  process.exit(1);
}

// Validate service account JSON
let serviceAccountObj;
try {
  serviceAccountObj = JSON.parse(serviceAccount);
  console.log('✅ Service account JSON validated');
} catch (e) {
  console.error('❌ Error: Invalid service account JSON:', e.message);
  process.exit(1);
}

// Create temporary service account file
const tempSaFile = `/tmp/firebase-sa-${Date.now()}.json`;
fs.writeFileSync(tempSaFile, JSON.stringify(serviceAccountObj, null, 2));
console.log('✅ Temporary service account file created');

// Set Google Application Credentials
process.env.GOOGLE_APPLICATION_CREDENTIALS = tempSaFile;

try {
  // Build is already done, just deploy
  console.log('\n🔥 Deploying to Firebase Hosting...');
  console.log(`  Project: ${projectId}`);
  console.log('  Directory: web-build');

  execSync(`npx firebase-tools deploy --only hosting --project ${projectId} --non-interactive`, {
    stdio: 'inherit',
    env: {
      ...process.env,
      GOOGLE_APPLICATION_CREDENTIALS: tempSaFile
    }
  });

  console.log('\n✅ Deployment completed successfully!');
  console.log(`🌐 Your app is live at: https://${projectId}.web.app`);

} catch (error) {
  console.error('\n❌ Deployment failed:', error.message);
  process.exit(1);
} finally {
  // Cleanup
  try {
    if (fs.existsSync(tempSaFile)) {
      fs.unlinkSync(tempSaFile);
      console.log('✅ Cleanup completed');
    }
  } catch (e) {
    console.warn('⚠️  Warning: Failed to cleanup temp file');
  }
}
