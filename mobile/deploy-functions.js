#!/usr/bin/env node

/**
 * Firebase Cloud Functions Deployment Script
 * Deploys only cloud functions to Firebase
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`Error: ${message}`, 'red');
  process.exit(1);
}

function success(message) {
  log(`${message}`, 'green');
}

function info(message) {
  log(`${message}`, 'cyan');
}

// Load .env file
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');

  if (process.env.FIREBASE_SERVICE_ACCOUNT && process.env.FIREBASE_PROJECT_ID) {
    info('Using Firebase credentials from environment variables');
    return;
  }

  if (!fs.existsSync(envPath)) {
    error('.env file not found and credentials not in environment');
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
  log('\nStarting Firebase Cloud Functions deployment...', 'magenta');

  info('Loading credentials...');
  loadEnvFile();

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!serviceAccount) {
    error('FIREBASE_SERVICE_ACCOUNT not found in .env file');
  }

  if (!projectId) {
    error('FIREBASE_PROJECT_ID not found in .env file');
  }

  let serviceAccountObj;
  try {
    serviceAccountObj = JSON.parse(serviceAccount);
  } catch (e) {
    error(`FIREBASE_SERVICE_ACCOUNT is not valid JSON: ${e.message}`);
  }

  success('Environment variables validated');

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

  process.env.GOOGLE_APPLICATION_CREDENTIALS = tempSaFile;

  try {
    // Install functions dependencies
    log('\nInstalling functions dependencies...', 'blue');
    execSync('npm install', {
      stdio: 'inherit',
      cwd: path.join(process.cwd(), 'functions'),
    });
    success('Dependencies installed');

    // Deploy functions only
    log('\nDeploying Cloud Functions...', 'blue');
    execSync(`./node_modules/.bin/firebase deploy --only functions --project ${projectId}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        GOOGLE_APPLICATION_CREDENTIALS: tempSaFile
      }
    });

    success('\nCloud Functions deployment completed successfully!');

  } catch (e) {
    error(`Deployment failed: ${e.message}`);
  } finally {
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
