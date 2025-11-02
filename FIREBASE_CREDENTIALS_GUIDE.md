# How to Get Firebase Credentials - Step by Step Guide

## Step 1: Go to Firebase Console

Open your browser and go to: **https://console.firebase.google.com/**

---

## Step 2: Create or Select Your Project

### If you DON'T have a Firebase project yet:

1. Click **"Add project"** or **"Create a project"**
2. Enter a project name (e.g., "Precast Quality Tools")
3. Click **Continue**
4. Disable Google Analytics (optional, you can enable later)
5. Click **Create project**
6. Wait for it to finish, then click **Continue**

### If you ALREADY have a Firebase project:

1. Click on your project name to open it

---

## Step 3: Add a Web App to Your Project

Once you're inside your project:

1. **Look at the center of the screen** - You should see a message like "Get started by adding Firebase to your app"

2. **Click the Web icon** `</>` (it looks like code brackets)
   - If you don't see it in the center, look for it in the **"Project Overview"** section
   - It's usually next to iOS and Android icons

3. **Register your app:**
   - App nickname: `Precast Quality Tools` (or any name you want)
   - You can skip "Also set up Firebase Hosting" for now
   - Click **Register app**

4. **YOU WILL NOW SEE YOUR FIREBASE CONFIG!**

---

## Step 4: Copy the Config Values

You'll see a code snippet that looks like this:

```javascript
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project-12345.firebaseapp.com",
  projectId: "your-project-12345",
  storageBucket: "your-project-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789"
};
```

**Copy each value!** You'll need them in the next step.

---

## Step 5: Add to Vibecode ENV Tab

Open your **Vibecode mobile app** and:

1. Go to the **ENV tab**
2. Add these environment variables (replace with YOUR actual values):

```
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-12345.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-12345
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-12345.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456789
```

3. Save the environment variables

---

## Alternative: If You Already Registered Your App

If you already created a web app and can't see the config, here's how to find it again:

1. In Firebase Console, click the **⚙️ gear icon** next to "Project Overview" at the top left
2. Click **"Project settings"**
3. Scroll down to **"Your apps"** section
4. You should see your web app listed
5. Look for **"SDK setup and configuration"**
6. Select **"Config"** (not npm)
7. You'll see the `firebaseConfig` object with all your values!

---

## Visual Guide - Where to Look

```
Firebase Console
│
├─ Project Overview (top left)
│   └─ Look for "</>" Web icon in center
│       OR
│   └─ Scroll down to "Get started" section
│       └─ Click "</>" Web app icon
│
└─ ⚙️ Settings Icon (next to Project Overview)
    └─ Project settings
        └─ Scroll down to "Your apps"
            └─ Web app section
                └─ SDK setup and configuration
                    └─ Config tab
```

---

## Troubleshooting

### I don't see the Web icon `</>`

- Make sure you're inside a project (not on the projects list page)
- Look in the center of the screen under "Get started by adding Firebase to your app"
- Try the Settings route: Click ⚙️ gear icon → Project settings → Your apps

### I already created an app but lost the config

- Go to Project settings (⚙️ gear icon)
- Scroll to "Your apps"
- Click on your web app
- The config will be shown there

### I see iOS and Android icons but no Web icon

- Click the iOS icon, then look for "Also add a web app" option
- OR go to Project settings → Your apps → "+ Add app" → Web

---

## Next Steps After Adding Credentials

Once you've added the environment variables to Vibecode:

1. ✅ The app will automatically reload
2. ✅ Firebase will be connected
3. ⏳ Continue with the rest of Firebase setup (see `FIREBASE_SETUP.md`)
   - Enable Authentication
   - Create Firestore database
   - Enable Storage
   - Set up security rules
   - Create first admin user

---

## Still Can't Find It?

If you're still stuck, here are the exact steps:

1. Go to: https://console.firebase.google.com/
2. Click on your project
3. Click the **⚙️ Settings gear icon** (top left, next to "Project Overview")
4. Click **"Project settings"**
5. Scroll down until you see **"Your apps"**
6. If you don't see any web apps, click **"Add app"** then select the **"</>"** Web icon
7. The config values will be displayed!

---

Need more help? The Firebase config is ALWAYS available in:
**Firebase Console → ⚙️ Settings → Project settings → Your apps → (Your web app) → SDK setup and configuration**

That's it! 🎉
