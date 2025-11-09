#!/usr/bin/env node

// This script reads Vibecode environment variables and writes them to .env file
const fs = require('fs');

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
const projectId = process.env.FIREBASE_PROJECT_ID;

if (!serviceAccount || !projectId) {
  console.error('Error: Firebase credentials not found in process.env');
  console.error('FIREBASE_SERVICE_ACCOUNT:', serviceAccount ? 'present' : 'missing');
  console.error('FIREBASE_PROJECT_ID:', projectId ? 'present' : 'missing');
  process.exit(1);
}

const envContent = `FIREBASE_PROJECT_ID=${projectId}
FIREBASE_SERVICE_ACCOUNT=${serviceAccount}
`;

fs.writeFileSync('.env', envContent);
console.log('✅ .env file created successfully');
