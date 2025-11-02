# Deploy Your Web App to Firebase Hosting

## Your app is built and ready to deploy!

The web version has been built and is in the `web-build/` folder.

---

## Option 1: Deploy from Your Local Computer (Recommended)

Since the Vibecode environment can't authenticate with Firebase interactively, you'll need to deploy from your local computer.

### Steps:

1. **Install Firebase CLI on your computer:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Download your project files:**
   - The files you need are already in `/home/user/workspace/`
   - You can commit them to git and pull on your computer
   - Or download: `web-build/`, `firebase.json`, `.firebaserc`, `firestore.rules`, `storage.rules`

3. **Login to Firebase:**
   ```bash
   firebase login
   ```

4. **Deploy:**
   ```bash
   firebase deploy --only hosting
   ```

5. **Your app will be live at:**
   ```
   https://precast-qc-tools-web-app.web.app
   ```

---

## Option 2: Deploy via Git (If you have the repo on your computer)

If you commit and push these changes, you can pull them on your local machine and deploy from there.

### Commit the files:
```bash
git add .
git commit -m "Build web app for Firebase Hosting deployment"
git push
```

Then on your computer:
```bash
git pull
firebase login
firebase deploy --only hosting
```

---

## Option 3: Manual Upload to Firebase Console

You can also manually upload the `web-build` folder contents to Firebase Hosting through the console, but it's more tedious.

---

## After Deployment

Once deployed, your app will be available at:
- **Primary URL:** `https://precast-qc-tools-web-app.web.app`
- **Secondary URL:** `https://precast-qc-tools-web-app.firebaseapp.com`

You can share this URL with your team! Everyone can:
1. Access it from any browser
2. Login with their credentials (after you approve them as admin)
3. Use all the precast quality tools

---

## Updating the App

Every time you make changes:
1. Run: `npx expo export:web`
2. Run: `firebase deploy --only hosting`
3. Changes are live immediately!

---

## Adding a Custom Domain (Optional)

In Firebase Console → Hosting, you can add your own domain like `quality.yourcompany.com`

---

**Ready to deploy from your computer?**
