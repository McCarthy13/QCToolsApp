const { GoogleAuth } = require('google-auth-library');
const { execSync } = require('child_process');

async function deploy() {
  try {
    console.log('🔐 Authenticating...');
    
    const auth = new GoogleAuth({
      keyFile: '/tmp/firebase-sa.json',
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/firebase'
      ]
    });
    
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    
    if (!accessToken.token) {
      throw new Error('Failed to get access token');
    }
    
    console.log('✅ Authenticated');
    console.log('🚀 Deploying to Firebase Hosting...');
    
    // Deploy using the token
    execSync(
      `npx firebase deploy --only hosting --project precast-qc-tools-web-app --token "${accessToken.token}"`,
      { stdio: 'inherit' }
    );
    
    console.log('✅ Deployment complete!');
    console.log('🌐 App is live at: https://precast-qc-tools-web-app.web.app');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stderr) console.error(error.stderr.toString());
    process.exit(1);
  }
}

deploy();
