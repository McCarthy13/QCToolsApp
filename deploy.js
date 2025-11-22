#!/usr/bin/env node

/**
 * Firebase Deployment Script for Vibecode
 * This script builds the Expo web app and deploys it to Firebase Hosting
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
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

  // Check if credentials are already in environment
  if (process.env.FIREBASE_SERVICE_ACCOUNT && process.env.FIREBASE_PROJECT_ID) {
    info('Using Firebase credentials from environment variables');
    return;
  }

  // If not in environment, try to load from .env file
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
  log('\n🚀 Starting Firebase deployment process...', 'magenta');

  // Load environment variables from .env or use existing environment
  info('Loading credentials...');
  loadEnvFile();

  // Check for required environment variables
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!serviceAccount) {
    error('FIREBASE_SERVICE_ACCOUNT not found in .env file');
  }

  if (!projectId) {
    error('FIREBASE_PROJECT_ID not found in .env file');
  }

  // Validate service account JSON
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

  // Set GOOGLE_APPLICATION_CREDENTIALS
  process.env.GOOGLE_APPLICATION_CREDENTIALS = tempSaFile;

  try {
    // Patch @react-navigation/elements for web compatibility
    log('\n🔧 Applying patches for web compatibility...', 'blue');
    const useFrameSizePath = path.join(process.cwd(), 'node_modules/@react-navigation/elements/src/useFrameSize.tsx');
    if (fs.existsSync(useFrameSizePath)) {
      let content = fs.readFileSync(useFrameSizePath, 'utf8');
      content = content.replace(
        /const SafeAreaListener = require\('react-native-safe-area-context'\)\s*\.SafeAreaListener as/,
        "const SafeAreaListener = (typeof require !== 'undefined'\n  ? require('react-native-safe-area-context').SafeAreaListener\n  : undefined) as"
      );
      fs.writeFileSync(useFrameSizePath, content);
      success('Patches applied');
    }

    // Build the web app
    log('\n📦 Building Expo web app...', 'blue');
    execSync('npx expo export:web', {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env // Pass all environment variables to the build process
    });
    success('Build completed successfully!');

    // Check if web-build directory exists
    const webBuildDir = path.join(process.cwd(), 'web-build');
    if (!fs.existsSync(webBuildDir)) {
      error('web-build directory not found. Build may have failed.');
    }

    // Deploy to Firebase Hosting
    log('\n🔥 Deploying to Firebase Hosting...', 'blue');
    execSync(`npx firebase deploy --only hosting --project ${projectId}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        GOOGLE_APPLICATION_CREDENTIALS: tempSaFile
      }
    });

    success('Deployment completed successfully!');
    log(`\n🌐 Your app is live at: https://${projectId}.web.app`, 'green');
    log(`🌐 Or at: https://${projectId}.firebaseapp.com\n`, 'green');

    // Note about Cloud Functions
    info('Note: Cloud Functions deployment requires additional permissions.');
    info('To deploy functions, enable Cloud Functions API and grant permissions in Google Cloud Console.');

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
