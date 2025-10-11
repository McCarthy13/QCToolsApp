# Quick Reference: Web Preview Setup

## If Vibecode Enables Web Preview

Once Vibecode support enables web access, you should receive:

### Access URL
You'll get a URL similar to:
```
https://[your-project-id]-web.tunnel.vibecodeapp.io
```
or
```
http://localhost:19006 (if local access)
```

### How to Use

1. **Open your browser** (Chrome recommended)
2. **Navigate to the web URL** provided by Vibecode
3. **Wait for initial load** (first load may take 30-60 seconds)
4. **The app will open** just like on mobile

### Browser DevTools

Press `F12` or `Right-click → Inspect` to access:
- **Console** - See logs, errors, warnings
- **Network** - Monitor API calls
- **React DevTools** - Inspect component state
- **Application** - View LocalStorage (where Zustand stores data)

---

## Testing Your New Features on Web

### Strand Library
✅ **Fully functional on web**
- Add/Edit/Delete custom strands
- View all default strands (Grade 250 & 270)
- Form inputs work perfectly with keyboard

### Stressing Calculator
✅ **Fully functional on web**
- Input values with keyboard (much faster!)
- Select strand from library
- View elongation results
- All calculations work identically

### Slippage Identifier
✅ **Fully functional on web**
- Input slippage values
- View cross-section diagrams
- Generate email reports
- Save/publish records

### What Won't Work on Web
❌ **Camera features** - Browser camera API is different
❌ **Some native file pickers** - Web has different file APIs

---

## Development Workflow with Web

### Recommended Setup
```
┌─────────────────┐  ┌──────────────────┐
│   Code Editor   │  │   Web Browser    │
│   (VS Code)     │  │   (Chrome)       │
│                 │  │                  │
│  Edit files ──────→│  Auto-refresh    │
│  Save changes   │  │  See results     │
└─────────────────┘  └──────────────────┘
```

### Hot Reload
- Changes to code automatically refresh the browser
- No need to manually reload
- Faster than mobile hot reload

### Testing Forms
**Mobile:** Slow touch keyboard, small screen
**Web:** Fast keyboard input, large screen, copy/paste works

Example test data:
```
Jacking Force: 200
Bed Length: 400
Strands: 7
```

### Debugging
```javascript
// Add console.logs in your code
console.log('Calculation result:', result);

// View in browser console (F12)
// Much easier than mobile debugging
```

---

## Local Storage (State Persistence)

### View Stored Data
1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **Local Storage**
4. See all Zustand stores:
   - `strand-library-storage`
   - `strand-pattern-storage`
   - `slippage-history-storage`
   - etc.

### Clear Data (if needed)
```javascript
// In browser console
localStorage.clear()
// Then refresh page
```

---

## Keyboard Shortcuts on Web

### Navigation
- `Tab` - Move between form fields
- `Enter` - Submit forms
- `Esc` - Close modals

### Dev Tools
- `F12` - Open/close DevTools
- `Ctrl+Shift+I` - Open DevTools (alternative)
- `Ctrl+Shift+J` - Open Console directly

---

## Common Issues & Solutions

### Issue: "Can't connect to dev server"
**Solution:** Wait 30-60 seconds for Webpack to compile on first load

### Issue: Changes not showing
**Solution:** Hard refresh with `Ctrl+Shift+R` or `Cmd+Shift+R`

### Issue: LocalStorage full
**Solution:** Open DevTools → Application → Clear Storage

### Issue: Layout looks different
**Expected:** Some minor differences between mobile and web layouts
React Native Web does its best but isn't pixel-perfect

---

## Performance Comparison

### Mobile Preview
- ⏱️ Change → See result: ~10-20 seconds
- 📱 Small screen
- ⌨️ Touch keyboard
- 🔍 Limited debugging

### Web Preview
- ⏱️ Change → See result: ~2-5 seconds
- 🖥️ Full screen
- ⌨️ Physical keyboard
- 🔍 Full Chrome DevTools

---

## What to Send to Vibecode Support

**Option 1: Email**
Subject: Enable Web Preview for Project ID [your-project-id]
Attach: `WEB-PREVIEW-REQUEST.md`

**Option 2: Support Ticket**
- Open support ticket in Vibecode platform
- Reference: "Web Preview Request"
- Attach: `WEB-PREVIEW-REQUEST.md`

**Option 3: Chat Support**
Message: "I need web preview enabled for my Expo app. I have a detailed request document (WEB-PREVIEW-REQUEST.md) in my project root."

---

## After Web Preview is Enabled

### First Time Setup
1. Open the web URL
2. Wait for initial compilation (may take 1-2 minutes)
3. App will load and you'll see the login screen
4. Login with your credentials
5. Navigate to Dashboard

### Bookmark for Easy Access
Save the web URL in your browser bookmarks for quick access

### Use Both!
- **Mobile:** Test touch interactions, real device feel
- **Web:** Fast testing, data entry, debugging

---

**Questions?** 
Refer to `WEB-PREVIEW-REQUEST.md` for technical details or contact Vibecode support.
