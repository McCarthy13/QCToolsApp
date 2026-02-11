/**
 * Deploy Firestore security rules using the Firebase Management API
 */

const fs = require('fs');
const https = require('https');

// Read the service account from environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// Function to get OAuth access token from service account
async function getAccessToken() {
  const { GoogleAuth } = require('google-auth-library');
  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  return accessToken.token;
}

// Function to deploy Firestore rules
async function deployRules() {
  try {
    console.log('🔥 Deploying Firestore security rules...');

    // Read the rules file
    const rulesContent = fs.readFileSync('./firestore.rules', 'utf8');

    // Get access token
    const accessToken = await getAccessToken();

    // Prepare the request body
    const requestBody = JSON.stringify({
      rules: {
        files: [
          {
            name: 'firestore.rules',
            content: rulesContent,
          },
        ],
      },
    });

    const projectId = serviceAccount.project_id;

    // Make the API request
    const options = {
      hostname: 'firebaserules.googleapis.com',
      port: 443,
      path: `/v1/projects/${projectId}/releases?releaseId=cloud.firestore`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
        'Authorization': `Bearer ${accessToken}`,
      },
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('✅ Firestore security rules deployed successfully!');
            console.log(`Response: ${data}`);
            resolve();
          } else {
            console.error(`❌ Failed to deploy rules. Status: ${res.statusCode}`);
            console.error(`Response: ${data}`);
            reject(new Error(`Deployment failed with status ${res.statusCode}`));
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ Error deploying rules:', error);
        reject(error);
      });

      req.write(requestBody);
      req.end();
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run the deployment
deployRules()
  .then(() => {
    console.log('🎉 Deployment complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Deployment failed:', error);
    process.exit(1);
  });
