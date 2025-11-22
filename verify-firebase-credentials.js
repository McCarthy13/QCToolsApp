#!/usr/bin/env node

/**
 * Firebase Credentials Verification Script
 * 
 * This script verifies that your Firebase service account credentials
 * are properly configured in your .env file.
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Load .env file
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  
  if (!fs.existsSync(envPath)) {
    error('.env file not found!');
    return false;
  }
  
  success('.env file exists');
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  lines.forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
  
  return true;
}

// Verify FIREBASE_PROJECT_ID
function verifyProjectId() {
  info('Checking FIREBASE_PROJECT_ID...');
  
  const projectId = process.env.FIREBASE_PROJECT_ID;
  
  if (!projectId) {
    error('FIREBASE_PROJECT_ID is missing');
    return false;
  }
  
  if (projectId !== 'precast-qc-tools-web-app') {
    warning(`FIREBASE_PROJECT_ID is "${projectId}", expected "precast-qc-tools-web-app"`);
  } else {
    success(`FIREBASE_PROJECT_ID is correct: ${projectId}`);
  }
  
  return true;
}

// Verify FIREBASE_SERVICE_ACCOUNT
function verifyServiceAccount() {
  info('Checking FIREBASE_SERVICE_ACCOUNT...');
  
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (!serviceAccount) {
    error('FIREBASE_SERVICE_ACCOUNT is missing');
    return false;
  }
  
  // Try to parse JSON
  let serviceAccountObj;
  try {
    serviceAccountObj = JSON.parse(serviceAccount);
    success('FIREBASE_SERVICE_ACCOUNT is valid JSON');
  } catch (e) {
    error(`FIREBASE_SERVICE_ACCOUNT is not valid JSON: ${e.message}`);
    return false;
  }
  
  // Verify required fields
  const requiredFields = [
    'type',
    'project_id',
    'private_key_id',
    'private_key',
    'client_email',
    'client_id',
  ];
  
  const missingFields = requiredFields.filter(field => !serviceAccountObj[field]);
  
  if (missingFields.length > 0) {
    error(`Missing required fields: ${missingFields.join(', ')}`);
    return false;
  }
  
  success('All required fields are present');
  
  // Verify field values
  if (serviceAccountObj.type !== 'service_account') {
    warning(`type is "${serviceAccountObj.type}", expected "service_account"`);
  } else {
    success(`type is correct: ${serviceAccountObj.type}`);
  }
  
  if (serviceAccountObj.project_id !== 'precast-qc-tools-web-app') {
    warning(`project_id is "${serviceAccountObj.project_id}", expected "precast-qc-tools-web-app"`);
  } else {
    success(`project_id is correct: ${serviceAccountObj.project_id}`);
  }
  
  if (!serviceAccountObj.private_key || !serviceAccountObj.private_key.includes('BEGIN PRIVATE KEY')) {
    error('private_key is missing or invalid');
    return false;
  } else {
    success('private_key is present and valid');
  }
  
  if (!serviceAccountObj.client_email || !serviceAccountObj.client_email.includes('@')) {
    error('client_email is missing or invalid');
    return false;
  } else {
    success(`client_email is correct: ${serviceAccountObj.client_email}`);
  }
  
  // Display summary
  log('\n📋 Service Account Summary:', 'blue');
  log(`   Type: ${serviceAccountObj.type}`, 'cyan');
  log(`   Project ID: ${serviceAccountObj.project_id}`, 'cyan');
  log(`   Client Email: ${serviceAccountObj.client_email}`, 'cyan');
  log(`   Client ID: ${serviceAccountObj.client_id}`, 'cyan');
  log(`   Private Key ID: ${serviceAccountObj.private_key_id}`, 'cyan');
  
  return true;
}

// Test Firebase Admin SDK (optional, requires firebase-admin package)
function testFirebaseConnection() {
  info('\nTesting Firebase connection...');
  
  try {
    // Try to require firebase-admin
    const admin = require('firebase-admin');
    
    // Check if already initialized
    if (admin.apps.length > 0) {
      warning('Firebase Admin is already initialized');
      return true;
    }
    
    // Initialize with service account
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    
    success('Firebase Admin initialized successfully!');
    log('   You can now use Firebase Admin SDK in your code', 'cyan');
    
    return true;
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      warning('firebase-admin package not installed');
      info('   To test Firebase connection, install it with: npm install firebase-admin');
      return true; // Not an error, just optional
    } else {
      error(`Failed to initialize Firebase: ${e.message}`);
      return false;
    }
  }
}

// Main verification function
function main() {
  log('\n🔍 Firebase Credentials Verification\n', 'blue');
  
  // Load .env file
  if (!loadEnvFile()) {
    process.exit(1);
  }
  
  log('\n');
  
  // Verify credentials
  const projectIdValid = verifyProjectId();
  log('\n');
  const serviceAccountValid = verifyServiceAccount();
  
  // Test connection if credentials are valid
  if (projectIdValid && serviceAccountValid) {
    testFirebaseConnection();
  }
  
  // Final summary
  log('\n' + '='.repeat(50), 'blue');
  if (projectIdValid && serviceAccountValid) {
    success('All credentials are properly configured!');
    log('\n✅ Your Firebase service account is ready to use.', 'green');
    log('   You can now run: node deploy.js', 'cyan');
  } else {
    error('Some credentials are missing or invalid.');
    log('\n❌ Please check your .env file or add credentials via Vibecode ENV tab.', 'red');
    process.exit(1);
  }
  log('='.repeat(50) + '\n', 'blue');
}

// Run verification
main();

