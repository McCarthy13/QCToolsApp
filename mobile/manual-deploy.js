const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function uploadToFirebaseHosting() {
  try {
    console.log('🔐 Authenticating with Google Cloud...');
    
    const auth = new google.auth.GoogleAuth({
      keyFile: '/tmp/firebase-sa.json',
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/firebase',
        'https://www.googleapis.com/auth/firebase.hosting'
      ]
    });
    
    const authClient = await auth.getClient();
    const projectId = 'precast-qc-tools-web-app';
    
    console.log('✅ Authenticated');
    console.log('📦 Preparing files for upload...');
    
    // Get all files from web-build
    const webBuildDir = path.join(__dirname, 'web-build');
    const files = [];
    
    function walkDir(dir, baseDir = dir) {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walkDir(fullPath, baseDir);
        } else {
          const relativePath = '/' + path.relative(baseDir, fullPath).replace(/\\/g, '/');
          const content = fs.readFileSync(fullPath);
          const hash = crypto.createHash('sha256').update(content).digest('hex');
          files.push({
            path: relativePath,
            hash: hash,
            size: stat.size
          });
        }
      }
    }
    
    walkDir(webBuildDir);
    console.log(`✅ Found ${files.length} files`);
    
    // Use Firebase Hosting API
    const hosting = google.firebasehosting({ version: 'v1beta1', auth: authClient });
    
    console.log('🚀 Creating new version...');
    const site = `projects/${projectId}/sites/${projectId}`;
    
    // Create a new version
    const versionResponse = await hosting.sites.versions.create({
      parent: site,
      requestBody: {
        config: {
          headers: [
            {
              glob: '**',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate'
              }
            },
            {
              glob: '**/*.@(jpg|jpeg|gif|png|svg|webp|js|css)',
              headers: {
                'Cache-Control': 'max-age=31536000'
              }
            }
          ]
        }
      }
    });
    
    const versionName = versionResponse.data.name;
    console.log(`✅ Version created: ${versionName}`);
    
    // Populate files
    console.log('📤 Populating file list...');
    await hosting.sites.versions.populateFiles({
      parent: versionName,
      requestBody: {
        files: files.reduce((acc, file) => {
          acc[file.path] = file.hash;
          return acc;
        }, {})
      }
    });
    
    console.log('📤 Uploading files...');
    
    // Upload each file
    for (const file of files) {
      const fullPath = path.join(webBuildDir, file.path.substring(1));
      const content = fs.readFileSync(fullPath);
      
      try {
        await hosting.sites.versions.files.upload({
          parent: versionName,
          fileId: file.hash,
          requestBody: content,
          headers: {
            'Content-Type': 'application/octet-stream'
          }
        });
        process.stdout.write('.');
      } catch (err) {
        // File might already exist, ignore
      }
    }
    
    console.log('\n✅ Files uploaded');
    
    // Finalize the version
    console.log('🔄 Finalizing version...');
    await hosting.sites.versions.patch({
      name: versionName,
      updateMask: 'status',
      requestBody: {
        status: 'FINALIZED'
      }
    });
    
    console.log('✅ Version finalized');
    
    // Release the version
    console.log('🚀 Releasing to production...');
    await hosting.sites.releases.create({
      parent: site,
      requestBody: {
        version: versionName
      }
    });
    
    console.log('✅ Deployment complete!');
    console.log(`🌐 Your app is live at: https://${projectId}.web.app`);
    console.log(`🌐 Or at: https://${projectId}.firebaseapp.com`);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

uploadToFirebaseHosting();
