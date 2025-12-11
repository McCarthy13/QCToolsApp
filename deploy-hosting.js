const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const axios = require('axios');

async function deployToHosting() {
  try {
    console.log('🔐 Authenticating with service account...');
    
    const serviceAccount = JSON.parse(fs.readFileSync('/tmp/firebase-sa.json', 'utf8'));
    
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/firebase.hosting']
    });
    
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    
    if (!accessToken.token) {
      throw new Error('Failed to get access token');
    }
    
    console.log('✅ Authenticated successfully');
    console.log('📦 Creating deployment archive...');
    
    // Create a zip file of web-build directory
    const webBuildDir = path.join(__dirname, 'web-build');
    const zipPath = '/tmp/web-build.zip';
    
    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', resolve);
      archive.on('error', reject);
      
      archive.pipe(output);
      archive.directory(webBuildDir, false);
      archive.finalize();
    });
    
    console.log('✅ Archive created');
    console.log('🚀 Deploying to Firebase Hosting...');
    
    // Use Firebase Hosting REST API
    const projectId = 'precast-qc-tools-web-app';
    const siteId = projectId;
    
    // Create a new version
    const versionResponse = await axios.post(
      `https://firebasehosting.googleapis.com/v1beta1/sites/${siteId}/versions`,
      { config: {} },
      {
        headers: {
          'Authorization': `Bearer ${accessToken.token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const versionName = versionResponse.data.name;
    console.log(`✅ Version created: ${versionName}`);
    
    // Upload files
    const files = fs.readdirSync(webBuildDir);
    console.log(`📤 Uploading ${files.length} files...`);
    
    // For simplicity, we'll use the Firebase CLI instead since REST API is complex
    console.log('⚠️  Using simpler approach...');
    
    // Just use firebase-tools with the token
    const { execSync } = require('child_process');
    execSync(
      `npx firebase-tools deploy --only hosting --project ${projectId} --token "$(GOOGLE_APPLICATION_CREDENTIALS=/tmp/firebase-sa.json gcloud auth application-default print-access-token)"`,
      { stdio: 'inherit', env: { ...process.env, GOOGLE_APPLICATION_CREDENTIALS: '/tmp/firebase-sa.json' } }
    );
    
    console.log('✅ Deployment complete!');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deployToHosting();
