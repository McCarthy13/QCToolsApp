#!/usr/bin/env node

// This script reads Vibecode environment variables and appends them to .env
const fs = require('fs');

// Try to read from process.env (which Vibecode should populate)
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
const projectId = process.env.FIREBASE_PROJECT_ID || 'precast-qc-tools-web-app';

console.log('Checking for Firebase credentials...');
console.log('FIREBASE_PROJECT_ID:', projectId ? 'Found' : 'Not found');
console.log('FIREBASE_SERVICE_ACCOUNT:', serviceAccount ? `Found (${serviceAccount.length} chars)` : 'Not found');

if (!serviceAccount) {
  console.error('\n❌ FIREBASE_SERVICE_ACCOUNT not accessible from process.env');
  console.error('These environment variables must be added to .env file manually.');
  process.exit(1);
}

// Write to .env file
const envContent = `FIREBASE_PROJECT_ID=${projectId}
FIREBASE_SERVICE_ACCOUNT=${serviceAccount}
`;

fs.writeFileSync('.env', envContent);
console.log('\n✅ .env file updated successfully!');
console.log('You can now run: bun run deploy');
