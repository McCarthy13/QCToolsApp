# Quick Deployment Instructions

## Step 1: Clone/Pull This Repo on Your Computer

If you haven't cloned the repo yet, do:
```bash
git clone [YOUR_REPO_URL]
cd [repo-folder]
```

Or if you already have it:
```bash
git pull
```

## Step 2: Install Dependencies

```bash
npm install -g firebase-tools
```

In the project folder:
```bash
bun install
```

## Step 3: Build the Web App

```bash
npx expo export:web
```

This creates the `web-build/` folder with your compiled app.

## Step 4: Deploy to Firebase

```bash
firebase login
firebase deploy --only hosting
```

## Step 5: Access Your App

Your app will be live at:
```
https://precast-qc-tools-web-app.web.app
```

Share this URL with your team!

---

## Future Updates

Every time you make changes:
1. Make your code changes
2. Run: `npx expo export:web`
3. Run: `firebase deploy --only hosting`
4. Changes are live immediately!

---

## Need Help?

- Check README.md for full documentation
- Firebase Console: https://console.firebase.google.com/
- Your project: precast-qc-tools-web-app
