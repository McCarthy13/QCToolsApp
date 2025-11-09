const admin = require('firebase-admin');
const { getStorage } = require('firebase-admin/storage');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Try to get credentials from environment or use application default
let credential;
const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;

if (serviceAccountEnv) {
  try {
    const serviceAccount = JSON.parse(serviceAccountEnv);
    credential = admin.credential.cert(serviceAccount);
    console.log('✅ Using service account from environment');
  } catch (e) {
    console.log('⚠️  Could not parse service account from environment');
    credential = admin.credential.applicationDefault();
  }
} else {
  console.log('⚠️  No service account in environment, using application default');
  credential = admin.credential.applicationDefault();
}

// Initialize Firebase Admin
try {
  admin.initializeApp({
    credential,
    projectId: 'precast-qc-tools-web-app',
    storageBucket: 'precast-qc-tools-web-app.firebasestorage.app'
  });
  console.log('✅ Firebase Admin initialized');
} catch (e) {
  console.error('❌ Failed to initialize Firebase Admin:', e.message);
  process.exit(1);
}

// Now try the deploy command with admin initialized
console.log('\n🔥 Attempting Firebase CLI deploy...');
try {
  execSync('bunx firebase deploy --only hosting --project precast-qc-tools-web-app', {
    stdio: 'inherit'
  });
  console.log('\n✅ Deployment successful!');
} catch (e) {
  console.error('\n❌ Deployment failed:', e.message);
  process.exit(1);
}
