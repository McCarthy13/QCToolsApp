#!/usr/bin/env node

/**
 * Deploy only Firestore Rules
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ Error: ${message}`, 'red');
  process.exit(1);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

// Load .env file
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');

  if (!fs.existsSync(envPath)) {
    error('.env file not found');
  }

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
}

async function main() {
  log('\n🔥 Deploying Firestore Rules...', 'magenta');

  // Load environment variables
  info('Loading credentials...');
  loadEnvFile();

  // Get Firebase project ID
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;

  if (!projectId) {
    error('EXPO_PUBLIC_FIREBASE_PROJECT_ID not found in .env file');
  }

  success(`Project ID: ${projectId}`);

  // Check if service account exists
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccount) {
    error('FIREBASE_SERVICE_ACCOUNT not found in .env file. Please add it to deploy.');
  }

  // Validate service account JSON
  let serviceAccountObj;
  try {
    serviceAccountObj = JSON.parse(serviceAccount);
  } catch (e) {
    error(`FIREBASE_SERVICE_ACCOUNT is not valid JSON: ${e.message}`);
  }

  success('Service account validated');

  // Create temporary service account file
  info('Creating temporary service account credentials...');
  const tempDir = '/tmp';
  const tempSaFile = path.join(tempDir, `firebase-sa-${Date.now()}.json`);

  try {
    fs.writeFileSync(tempSaFile, JSON.stringify(serviceAccountObj, null, 2));
    success('Service account file created');
  } catch (e) {
    error(`Failed to write service account file: ${e.message}`);
  }

  try {
    // Deploy Firestore rules only
    info('Deploying Firestore rules...');
    execSync(`npx firebase deploy --only firestore:rules --project ${projectId} --non-interactive`, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        GOOGLE_APPLICATION_CREDENTIALS: tempSaFile
      }
    });

    success('Firestore rules deployed successfully!');
    log(`\n✨ Your Firestore rules are now live in project: ${projectId}\n`, 'green');

  } catch (e) {
    error(`Deployment failed: ${e.message}`);
  } finally {
    // Cleanup
    info('Cleaning up temporary files...');
    try {
      if (fs.existsSync(tempSaFile)) {
        fs.unlinkSync(tempSaFile);
        success('Cleanup completed');
      }
    } catch (e) {
      log(`Warning: Failed to cleanup temp file: ${e.message}`, 'yellow');
    }
  }
}

main().catch(e => {
  error(`Unexpected error: ${e.message}`);
});
