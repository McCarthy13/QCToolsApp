/**
 * Script to manually add a Microsoft 365 user to Firestore
 * Usage: node add-microsoft-user.js <email> <name> <role>
 * Example: node add-microsoft-user.js john@example.com "John Doe" admin
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Get command line arguments
const email = process.argv[2];
const name = process.argv[3];
const role = process.argv[4] || 'admin';

if (!email || !name) {
  console.error('Usage: node add-microsoft-user.js <email> <name> [role]');
  console.error('Example: node add-microsoft-user.js john@example.com "John Doe" admin');
  process.exit(1);
}

// Validate role
if (!['admin', 'supervisor', 'user'].includes(role)) {
  console.error('Role must be one of: admin, supervisor, user');
  process.exit(1);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

async function addMicrosoftUser() {
  try {
    // Generate userId using same logic as AdminApprovalScreen and loginWithMicrosoft
    const userId = email.toLowerCase().replace(/[^a-z0-9]/g, '_');

    console.log(`Adding Microsoft 365 user:`);
    console.log(`  Email: ${email}`);
    console.log(`  Name: ${name}`);
    console.log(`  Role: ${role}`);
    console.log(`  Generated userId: ${userId}`);

    // Create user document in Firestore
    const userRef = doc(firestore, 'users', userId);
    await setDoc(userRef, {
      uid: userId,
      email: email,
      name: name,
      role: role,
      status: 'approved',
      needsPasswordChange: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('\n✅ Successfully added Microsoft 365 user!');
    console.log(`\nYou can now log in with ${email} using Microsoft authentication.`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error adding user:', error.message);
    process.exit(1);
  }
}

addMicrosoftUser();
