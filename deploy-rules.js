#!/usr/bin/env node

/**
 * Deploy only Firestore Rules
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

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

  // Check for Firebase token first (preferred method)
  const firebaseToken = process.env.FIREBASE_TOKEN;
  
  if (firebaseToken) {
    info('Using FIREBASE_TOKEN for authentication...');
    try {
      // Deploy Firestore rules only
      info('Deploying Firestore rules...');
      execSync(`npx firebase deploy --only firestore:rules --project ${projectId} --non-interactive --token ${firebaseToken}`, {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      success('Firestore rules deployed successfully!');
      log(`\n✨ Your Firestore rules are now live in project: ${projectId}\n`, 'green');
      return;
    } catch (e) {
      error(`Deployment failed: ${e.message}`);
    }
  }

  // Fallback 1: Try service account authentication
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccount) {
    info('Using FIREBASE_SERVICE_ACCOUNT for authentication...');
    try {
      // Validate service account JSON
      let serviceAccountObj;
      try {
        serviceAccountObj = JSON.parse(serviceAccount);
      } catch (e) {
        throw new Error(`FIREBASE_SERVICE_ACCOUNT is not valid JSON: ${e.message}`);
      }

      // Create temporary service account file
      const tempDir = os.tmpdir();
      const tempSaFile = path.join(tempDir, `firebase-sa-${Date.now()}.json`);

      try {
        fs.writeFileSync(tempSaFile, JSON.stringify(serviceAccountObj, null, 2));
        info('Service account file created');

        // Deploy using service account
        info('Deploying Firestore rules with service account...');
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

        // Cleanup
        try {
          if (fs.existsSync(tempSaFile)) {
            fs.unlinkSync(tempSaFile);
          }
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        return;
      } catch (writeError) {
        throw new Error(`Failed to write service account file: ${writeError.message}`);
      }
    } catch (saError) {
      log(`⚠️  Service account authentication failed: ${saError.message}`, 'yellow');
      log('Trying alternative authentication methods...', 'cyan');
    }
  }

  // Fallback 2: Check if user is already logged in
  info('Checking Firebase CLI authentication...');
  let cliAuthenticated = false;
  try {
    execSync(`npx firebase projects:list`, {
      stdio: 'pipe',
      cwd: process.cwd()
    });
    cliAuthenticated = true;
    info('Firebase CLI is authenticated');
  } catch (authError) {
    log(`⚠️  Firebase CLI is not authenticated.`, 'yellow');
  }

  if (!cliAuthenticated) {
    log(`\n💡 To fix authentication, choose one of the following:`, 'cyan');
    log(`\n   Option 1 (Recommended - Interactive):`, 'cyan');
    log(`   1. Run: npx firebase login`, 'cyan');
    log(`   2. Then run this script again`, 'cyan');
    log(`\n   Option 2 (CI/CD - Non-interactive):`, 'cyan');
    log(`   1. Run: npx firebase login:ci`, 'cyan');
    log(`   2. Copy the token and add it to .env as: FIREBASE_TOKEN=your_token_here`, 'cyan');
    log(`   3. Then run this script again`, 'cyan');
    log(`\n   Option 3 (Service Account):`, 'cyan');
    log(`   1. Add FIREBASE_SERVICE_ACCOUNT to .env with your service account JSON`, 'cyan');
    log(`   2. Then run this script again`, 'cyan');
    log(`\n   Option 4 (Manual deployment):`, 'cyan');
    log(`   Run: npx firebase deploy --only firestore:rules --project ${projectId}`, 'cyan');
    error('Authentication required');
  }

  // Set the project
  info(`Setting Firebase project to ${projectId}...`);
  try {
    execSync(`npx firebase use ${projectId} --non-interactive`, {
      stdio: 'pipe',
      cwd: process.cwd()
    });
  } catch (useError) {
    // Project might already be set, continue
    info('Project configuration checked');
  }

  // Deploy Firestore rules only
  info('Deploying Firestore rules...');
  try {
    execSync(`npx firebase deploy --only firestore:rules --project ${projectId} --non-interactive`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    success('Firestore rules deployed successfully!');
    log(`\n✨ Your Firestore rules are now live in project: ${projectId}\n`, 'green');
  } catch (e) {
    const errorMessage = e.message || String(e);
    if (errorMessage.includes('401') || errorMessage.includes('authentication')) {
      log(`\n❌ Authentication failed with 401 error.`, 'red');
      log(`\n💡 This usually means:`, 'cyan');
      log(`   1. Your Firebase CLI session expired - run: npx firebase login`, 'cyan');
      log(`   2. You don't have permission to deploy to this project`, 'cyan');
      log(`   3. Your service account doesn't have the right permissions`, 'cyan');
      log(`\n   Try using service account authentication instead:`, 'cyan');
      log(`   Add FIREBASE_SERVICE_ACCOUNT to .env with your service account JSON`, 'cyan');
    }
    error(`Deployment failed: ${errorMessage}`);
  }
}

main().catch(e => {
  error(`Unexpected error: ${e.message}`);
});
