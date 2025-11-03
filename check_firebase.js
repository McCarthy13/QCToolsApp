const admin = require('firebase-admin');

// Initialize with service account
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'precast-qc-tools-web-app'
});

const db = admin.firestore();

async function checkData() {
  const strandLibrarySnap = await db.collection('strandLibrary').get();
  console.log('strandLibrary documents:', strandLibrarySnap.size);
  
  const strandPatternsSnap = await db.collection('strandPatterns').get();
  console.log('strandPatterns documents:', strandPatternsSnap.size);
}

checkData().then(() => process.exit(0));
