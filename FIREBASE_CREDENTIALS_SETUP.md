# Firebase Service Account Credentials Setup Guide

## Step-by-Step Instructions for Vibecode ENV Tab

### Step 1: Open Vibecode ENV Tab
1. Navigate to your Vibecode project dashboard
2. Click on the **ENV** tab (or **Environment Variables** section)
3. You should see a list of existing environment variables (if any)

### Step 2: Add FIREBASE_PROJECT_ID

**Variable Name:**
```
FIREBASE_PROJECT_ID
```

**Variable Value:**
```
precast-qc-tools-web-app
```

**Instructions:**
1. Click **"Add New Variable"** or **"+"** button
2. Enter the variable name: `FIREBASE_PROJECT_ID`
3. Enter the value: `precast-qc-tools-web-app`
4. Click **Save** or **Add**

---

### Step 3: Add FIREBASE_SERVICE_ACCOUNT

**Variable Name:**
```
FIREBASE_SERVICE_ACCOUNT
```

**Variable Value:**
Copy and paste your actual Firebase service account JSON here. Get it from:
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Copy the entire JSON content

```
YOUR_FIREBASE_SERVICE_ACCOUNT_JSON_HERE
```

**Instructions:**
1. Click **"Add New Variable"** or **"+"** button
2. Enter the variable name: `FIREBASE_SERVICE_ACCOUNT`
3. Paste the entire JSON string above into the value field
4. **Important:** Make sure the entire JSON is on one line (no line breaks)
5. Click **Save** or **Add**

---

## Verification Steps

After adding both variables:

1. **Check that both variables are saved:**
   - `FIREBASE_PROJECT_ID` = `precast-qc-tools-web-app`
   - `FIREBASE_SERVICE_ACCOUNT` = (the JSON string)

2. **Wait for Vibecode to sync:**
   - Vibecode will automatically sync these to your local `.env` file
   - This may take a few moments

3. **Verify the `.env` file:**
   - Check your project's `.env` file
   - It should contain both variables
   - The file should NOT be erased anymore since Vibecode is managing it

4. **Test the deployment:**
   ```bash
   node deploy.js
   ```
   - This should now work without errors about missing credentials

---

## Troubleshooting

### If `.env` file is still being erased:
- Make sure you added the variables through the **Vibecode ENV tab**, not by editing the file directly
- Vibecode will overwrite manually edited `.env` files with values from the platform

### If deployment fails:
- Verify the JSON is valid (no line breaks in the middle)
- Check that both variables are exactly as shown above
- Ensure there are no extra spaces or quotes around the values

### If you can't find the Vibecode ENV tab:
- Look for "Environment Variables", "ENV", or "Settings" in your Vibecode dashboard
- Check the Vibecode documentation for your specific platform version

---

## Summary

You need to add **2 environment variables** to Vibecode:

1. **FIREBASE_PROJECT_ID** → `precast-qc-tools-web-app`
2. **FIREBASE_SERVICE_ACCOUNT** → (the complete JSON string above)

Once added through Vibecode's UI, they will be automatically synced to your `.env` file and won't be erased.

