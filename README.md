# Precast Quality Tools

A comprehensive mobile app for precast concrete quality management, built with React Native and Expo.

## Recent Fix: Microsoft 365 Login + Record Saving ✅

**Issue**: After switching to Microsoft 365 login, records were not being saved to "My Records" or "Published".

**Root Cause**: Microsoft 365 authentication didn't create a Firebase Auth session. Firestore security rules require `request.auth` to be set, which only happens when logged into Firebase Auth.

**Solution**: Modified the Microsoft 365 login flow to also create a Firebase Auth session using a deterministic email/password combination. This allows Firestore security rules to work properly while Microsoft 365 handles the actual user authentication.

**Files Modified**:
- `src/services/firebaseAuth.ts` - Added `signInForMicrosoftUser()` function with proper logging
- `src/state/authStore.ts` - Updated `loginWithMicrosoft()` to call Firebase Auth after Microsoft login

**Deployed**: Successfully deployed to Firebase Hosting on 2025-12-11
- Live at: https://precast-qc-tools-web-app.web.app
- Commit: 5cce2a8

## Git Repository Configuration ✅

This project is configured with dual git remotes for automatic synchronization:

**Remotes:**
- `origin` → https://github.com/McCarthy13/QCToolsApp (PRIMARY - GitHub)
- `vibecode` → Vibecode sandbox internal repository

**Authentication**: Personal Access Token configured in remote URL (git-ignored via .git/config exclusion)

### Three-Way Synchronization ⚠️ CRITICAL

All three environments MUST stay in sync at all times:

1. **GitHub Repository** (https://github.com/McCarthy13/QCToolsApp) - **PRIMARY SOURCE OF TRUTH**
2. **Vibecode Sandbox** (/home/user/workspace/) - Development environment
3. **Firebase Hosting** (https://precast-qc-tools-web-app.web.app) - Production deployment

**Last Synchronized**: 2025-12-16 (all environments now in sync)

### Workflow for Every Update

**CRITICAL**: For every code change, you MUST follow these steps in order:

1. **Make changes** in Vibecode sandbox (`/home/user/workspace/`)
2. **Stage changes** for commit (`git add .` or `git add <specific-files>`)
3. **Commit changes** to local git repository with descriptive message
   ```bash
   git commit -m "descriptive commit message"
   ```
4. **Push to BOTH remotes** to keep all environments synchronized:
   ```bash
   git push origin main      # Push to GitHub (primary)
   git push vibecode main    # Push to Vibecode sandbox
   ```
5. **Deploy to Firebase** when ready for production
   ```bash
   node deploy.js
   ```

**IMPORTANT**: Never skip step 4. All changes must be pushed to both GitHub and Vibecode remotes to keep environments synchronized.

This ensures all three environments remain synchronized at all times.

### Security ✅

All sensitive credentials are protected and properly excluded from version control:

**Files protected via `.gitignore`:**
- `.env` and all `.env*` files (environment variables)
- `firebase-service-account.json` (Firebase admin credentials)
- `*service-account*.json` (all service account files)
- `.git-credentials` (GitHub authentication token)
- `.pem`, `.p12`, `.key` files (private keys)

**Verification completed**: No credentials are committed to the repository.

**Environment Variables Location:**
- Primary: `/home/user/workspace/.env` (local only, git-ignored)
- Functions: `/home/user/workspace/functions/.env` (local only, git-ignored)
- Templates: `.env.example` files (safe to commit, no actual values)

**GitHub Authentication:**
- Uses Personal Access Token (PAT) stored in `~/.git-credentials`
- Token not exposed in git remote URL
- Token not committed to repository
- Credential helper configured for automatic authentication

**Required Environment Variables:**
All sensitive keys and tokens are stored in the `.env` file:
- GitHub Access Token
- Anthropic API Key
- OpenAI API Key
- Firebase Service Account credentials
- Microsoft 365 OAuth credentials
- SharePoint configuration

See `.env.example` for the complete list of required variables.

### Git Operations

**Push changes to GitHub:**
```bash
git add .
git commit -m "Your commit message"
git push origin main
```

**Pull latest changes from GitHub:**
```bash
git pull origin main
```

**Check repository status:**
```bash
git status
git remote -v
```

## Deployment Status

✅ **Web App Deployed** - Live at https://precast-qc-tools-web-app.web.app
✅ **Firebase Authentication** - Fully integrated with email/password sign-in
✅ **Firestore Database** - Ready for real-time data sync
✅ **Cloud Storage** - Ready for file uploads
✅ **Cloud Functions** - Claude 3.5 Sonnet Vision API proxy deployed with API key configured
✅ **Product Tag Scanner** - Working in deployed web app with native camera
✅ **Admin Approval System** - Working and tested
✅ **Data Import Tool** - Import existing data from JSON to Firebase

## Environment Variables

The following environment variables are required and should be configured via the Vibecode ENV tab:

### Firebase Configuration (Web App Build)
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

### Firebase Service Account (Deployment)
- `FIREBASE_PROJECT_ID=precast-qc-tools-web-app`
- `FIREBASE_SERVICE_ACCOUNT` (JSON string)

### API Keys (Firebase Functions)
- `ANTHROPIC_API_KEY` - For Claude 3.5 Sonnet vision scanning
- `OPENAI_API_KEY` - Legacy support (not currently used)

**Note**: API keys for Firebase Functions are managed through Firebase Secret Manager and deployed via `.env.prod` file during deployment.

### Recent Updates (2025-12-05)
- ✅ **Complete Aggregate Gradations Tool Integration**:
  - Integrated standalone Gradations Tool (https://github.com/McCarthy13/GradationsTool) as native mobile experience
  - **Multi-test entry**: Conduct multiple gradation tests simultaneously in single session
  - **Material name tracking**: Label each test with load/batch identifier
  - **Advanced keyboard navigation**: Enter/Tab/Arrow keys move between sieve weight inputs
  - **Comprehensive repository**: Filter test history by aggregate, type, material name, date range
  - **Pass/fail indicators**: Visual ASTM C-33 compliance status for each test
  - **Detailed record viewing**: Complete gradation data tables with spec limits
  - **Admin panel**: Manage aggregate configurations and default selections
  - **Firebase cloud storage**: All tests and configurations sync across devices
  - **Calculation accuracy**: Matches original HTML app exactly (%, cumulative %, passing, FM, decant)
  - Components: TestEntryView, RepositoryView, AdminView, RecordDetailModal
  - State management: Full Zustand store with Firebase integration (gradationsStore.ts)
  - Data structure: Enhanced types supporting materialName, aggregateType, passes flag
  - Default aggregates: Keystone #7, Kraemer 9/16", #9 Gravel, Concrete Sand with complete ASTM C-33 limits
  - Future features: SVG charts, print/PDF export, CSV batch export

### Recent Updates (2025-12-04)
- ✅ **Enhanced Design vs Cast Pattern Comparison**:
  - Added side-by-side cross-section view when design differs from cast
  - Design pattern (blue) vs Cast pattern (green) shown simultaneously
  - Inline strand difference annotations in slippage value lists
  - Location-based strand matching (compares by x,y coordinates, not labels)
  - Shows specific mismatches: size differences, missing/extra strands
  - Applied to both on-screen view and PDF reports
  - Improves clarity of what changed between design and actual casting

- ✅ **Configured Git Repository for GitHub Integration**:
  - Updated git remote origin to point to GitHub (https://github.com/McCarthy13/QCToolsApp)
  - Configured Personal Access Token authentication for secure pushes
  - Enhanced .gitignore to protect all environment files (.env, .env.local, .env*.local)
  - Added .git-credentials to gitignore to prevent token exposure
  - Created local .env files with all required credentials (git-ignored)
  - Established three-way sync workflow: Vibecode Sandbox ↔ GitHub ↔ Firebase
  - All code changes now require: commit → push to GitHub → deploy to Firebase
  - Verified secrets protection: no credentials committed to repository

### Recent Updates (2025-12-03)
- ✅ **GitHub Integration & Environment Configuration**:
  - Configured origin remote to point to GitHub repository (https://github.com/McCarthy13/QCToolsApp)
  - Implemented three-way synchronization: GitHub ↔ Vibecode Sandbox ↔ Firebase Hosting
  - Created .env.example template with all required environment variables
  - All secrets protected via .gitignore (API keys, tokens, Firebase credentials)
  - Verified no hardcoded credentials in codebase
  - All changes automatically sync to GitHub with proper commit messages

### Recent Updates (2025-12-01)
- ✅ **Repository Cleanup & Security Hardening**:
  - Removed 36 temporary/debug files from assets directory
  - Removed debug HTML files
  - Enhanced .gitignore to protect all credential types
  - Verified no hardcoded credentials in codebase
  - All secrets properly managed via environment variables

### Recent Updates (2025-11-22)
- ✅ **Design vs Cast Strand Pattern Comparison & Analysis**:
  - **Created comprehensive comparison utility** (`src/utils/strandPatternComparison.ts`):
    - Automatically compares design vs cast patterns when both are specified
    - Identifies strands missing in cast pattern but present in design
    - Identifies extra strands in cast pattern not in design
    - Detects strand size mismatches (3/8" vs 1/2" vs 0.6")
    - Detects strand location mismatches (x,y coordinates with 0.5" tolerance)
    - Provides detailed difference descriptions for each issue
  - **Enhanced Slippage Summary Screen** with visual pattern comparison:
    - New "Design vs Cast Pattern Analysis" section after cross-section diagram
    - Separate comparison panels for bottom and top strand patterns
    - Color-coded indicators: Green checkmark for matches, Red alert for differences
    - Lists all specific differences with clear descriptions
    - Shows pattern names for both design and cast
  - **Enhanced PDF Report** with pattern comparison section:
    - Automatically includes comparison analysis when cast patterns differ from design
    - Professional formatting with color-coded warnings
    - Detailed list of all strand differences found
    - Section appears after cross-section, before statistics
  - Allows quality control to document and track design specification compliance
- ✅ **Design vs Cast Strand Pattern Tracking**:
  - Added separate fields for design and cast strand patterns for both bottom and top strands
  - **Bottom Strand Patterns**:
    - Design Strand Pattern (required) - the pattern the piece was designed with
    - Cast Strand Pattern (optional) - defaults to "Matches Design", can select different pattern if cast with heavier pattern
  - **Top Strand Patterns** (optional, but both required if one is selected):
    - Top Design Strand Pattern - the pattern the top was designed with
    - Top Cast Strand Pattern - defaults to "Matches Design", can select different pattern if cast with heavier pattern
  - This allows engineers to track when pieces designed with lighter strand patterns were cast with heavier patterns (common when multiple patterns are scheduled together)
  - Updated data models across all screens: ProductDetails, SlippageIdentifier, SlippageSummary
  - Updated SlippageConfig interface in slippageHistoryStore to store cast pattern info
  - Updated PDF generator to include cast pattern information in reports
  - Added validation to ensure both top design and cast patterns are selected together

### Recent Updates (2025-12-05)
- 🚧 **Aggregate Gradation Tool - Complete Rebuild (IN PROGRESS)**:
  - **Source**: Exact pixel-perfect recreation of standalone HTML app from https://github.com/McCarthy13/GradationsTool
  - **Main Features Implemented**:
    - ✅ Test entry with 2-column grid layout showing multiple aggregates simultaneously
    - ✅ Real-time calculations (% Retained, Cumulative %, % Passing)
    - ✅ Keyboard navigation (Enter/Arrow keys) between weight input fields
    - ✅ ASTM C-33 compliance color coding (green=pass, red=fail)
    - ✅ Date shortcuts (Today button, Apply to All, custom date formats like "7/3/25")
    - ✅ Fineness Modulus calculation for fine aggregates
    - ✅ Decant percentage calculation
    - ✅ Firebase Firestore storage replacing localStorage
    - ✅ Print blank forms functionality (expo-print)
    - ✅ CSV export for test records (expo-sharing)
    - ✅ Repository view showing all saved test records
    - ✅ Add/Remove tests dynamically
    - ✅ Submit test with automatic form reset
  - **Still To Be Implemented**:
    - ⏳ Admin panel for aggregate management (add/edit/delete aggregates)
    - ⏳ Sieve configuration editor
    - ⏳ Configure default aggregates
    - ⏳ Record detail view with full data and charts
    - ⏳ Edit existing test records
    - ⏳ Delete test records with confirmation
    - ⏳ Repository filters (by aggregate, type, date range)
    - ⏳ "No Production" date range batch entry
    - ⏳ SVG gradation charts (react-native-svg)
    - ⏳ Batch CSV export
    - ⏳ View individual record with chart toggle
  - **Technical Details**:
    - All calculations match original HTML exactly
    - State management mirrors original appState structure
    - Firebase replaces localStorage for cloud sync
    - Uses expo-print for PDF/print functionality
    - Uses expo-sharing for CSV exports
    - Maintains exact feature parity with standalone app

### Recent Updates (2025-11-21)
- ✅ **Made all historical records editable across the app**:
  - **Camber Calculator History**: Added Edit button to Results screen that navigates to Calculator with pre-filled data
    - Calculator screen now accepts `editingCalculation` parameter
    - Pre-fills all form fields including project details, span, strand patterns, and product selection
    - Updates existing calculation instead of creating new one when editing
    - Header dynamically shows "Edit Calculation" when editing
  - **Aggregate Gradation Test History**: Added Edit button to Results screen for modifying existing tests
    - Test screen now accepts `editingTestId` parameter
    - Pre-fills all sieve data, date, and washed weight values
    - Updates existing test record instead of creating new one
  - **Quality Log Entries**: Added Edit button to Detail screen
    - Navigates to QualityLogAddEdit screen with existing log data
    - Existing edit functionality now accessible from history view
  - **Pour Schedule Entries**: Already had full edit capability built-in
    - Click any pour entry to edit it directly in the modal
  - **Slippage Records**: Now fully editable from history screen
    - Added Edit button (blue pencil icon) next to each record
    - Clicking Edit navigates to Product Details screen with all data pre-filled
    - Pre-fills project info, product type, strand patterns, and product width/side
    - Then navigates to Slippage Identifier with existing slippage values loaded
    - All slippage inputs are populated with their original values
    - Users can modify any field and save changes
    - Both "My Records" and "Published Records" can be edited
  - All changes ensure users can correct mistakes in historical records without having to delete and recreate them
  - Navigation types updated to support optional editing parameters

### Recent Updates (2025-11-17)
- ✅ **Improved span fraction input with dropdown selector**:
  - Replaced cycling button with proper dropdown selector for fraction values
  - Users can now select from dropdown (0, 1/8, 1/4, 3/8, 1/2, 5/8, 3/4, 7/8) or manually type values
  - Added validation to ensure only valid 1/8" increments are accepted
  - If user types an invalid value, shows error message and resets to 0
  - Empty input defaults to 0
  - Improved UX with clearer visual feedback and easier selection
- ✅ **DEPLOYED: Fixed user.id persistence bug causing slippage records to disappear**:
  - **Root cause**: Firestore's `.data()` method doesn't include the document ID
  - User profiles fetched from Firestore were missing the `uid` field entirely
  - This caused `currentUser.id` to be undefined in the auth store
  - When saving slippage records, `userId: currentUser?.id || ''` resulted in empty strings
  - When fetching historical records, filter `r.userId === currentUser.id` filtered out ALL records
  - **Solution**: Fixed all 5 Firestore fetch functions to explicitly include `uid: doc.id`
    - `getUserProfile` - single user fetch
    - `getPendingAccessRequests` - pending user list
    - `subscribeToUserProfile` - real-time user updates
    - `subscribeToPendingRequests` - real-time pending list
    - `getAllApprovedUsers` - approved user list
  - Enhanced auth store serialization to ensure proper persistence
  - Added migration code to detect and fix users with missing/invalid IDs
  - After deployment, users will be logged out once and need to re-authenticate
  - All new slippage records will be properly associated with users
  - **LIVE at https://precast-qc-tools-web-app.web.app**
- ✅ **DEPLOYED: Fixed blank white page on web deployment**:
  - Root cause: @react-navigation packages were pulling in version 2.8.1 of @react-navigation/elements
  - Version 2.8.1 has useFrameSize.tsx which uses require() that breaks in webpack browser builds
  - Solution: Added resolutions and overrides to force ALL packages to use version 2.3.8
  - Version 2.3.8 doesn't have useFrameSize.tsx, completely avoiding the require() issue
  - Removed webpack alias workaround that wasn't working
  - Successfully deployed and verified working at https://precast-qc-tools-web-app.web.app

### Previous Updates (2025-11-12)
- ✅ **DEPLOYED: Fixed PDF Generator for Slippage Summary Reports**:
  - Fixed race condition where jsPDF and html2canvas libraries weren't loading properly on web
  - Improved dynamic import handling with proper async/await pattern
  - Added comprehensive error logging to help diagnose PDF generation issues
  - Libraries now load via a single Promise that's awaited before PDF generation
  - Better error handling with fallback to browser print dialog if libraries fail to load
  - Enhanced logging throughout the PDF generation pipeline for easier debugging
  - **LIVE at https://precast-qc-tools-web-app.web.app**
- ✅ **DEPLOYED: Autocomplete Dropdown for Project Name (Polished)**:
  - When typing in the Project Name field, a dropdown shows filtered suggestions from the Project Library
  - **FIXED UI**: Dropdown now properly floats above other fields with proper z-index and shadow
  - **FIXED TYPING**: You can now type freely without interference - autocomplete only triggers when YOU type, not when fields auto-populate
  - Suggestions appear after typing 2+ characters and filter in real-time as you type
  - Each suggestion shows the Project Name and Job Number
  - Clicking a suggestion fills both Project Name AND Project Number automatically
  - Works in both Camber Calculator and Slippage Identifier (Product Details) screens
  - **LIVE at https://precast-qc-tools-web-app.web.app**
- ✅ **DEPLOYED: Auto-populate Project Name from Job Number (Fixed)**:
  - When a Job Number (Project Number) is entered or scanned, the Project Name field automatically populates from the Project Library
  - **NOW TRULY DYNAMIC**: Project Name clears when Job Number is modified/deleted and no longer matches
  - Works in both Camber Calculator and Slippage Identifier (Product Details) screens
  - Uses the existing `useJobAutocomplete` hook with `findByJobNumber` function
  - Real-time lookup as user types or when camera scanner fills the field
  - **LIVE at https://precast-qc-tools-web-app.web.app**
- ✅ **FIXED: Firestore permission errors on app startup**:
  - Fixed race condition where Firebase-backed stores were initializing before user authentication
  - Added authentication guards in ALL store initialize methods to prevent Firebase calls without auth
  - Stores now only initialize AFTER user is authenticated and approved
  - Prevents "Missing or insufficient permissions" errors on login screen
  - Updated App.tsx to split auth initialization and store initialization into separate useEffect hooks
  - Updated 7 store files: strandLibraryStore, strandPatternStore, productLibraryStore, aggregateLibraryStore, admixLibraryStore, projectLibraryStore, contactsStore
  - Each store now checks `auth.currentUser` before attempting any Firebase operations
  - **VERIFIED WORKING** - No more permission errors in logs!

### Recent Updates (2025-11-11)
- ✅ **PDF styling improvements and responsive design**:
  - Changed table headers from blue gradient to black background with white text (prevents confusion with top strand blue color)
  - Removed purple color from END 2 values - all END 1 and END 2 values now black
  - Bottom strand names display in green (#059669), Top strand names display in blue (#2563eb)
  - Implemented responsive sizing with CSS media queries for different screen sizes:
    - Mobile (< 768px): Optimized for small screens, prevents legend cutoff
    - Tablet (768px - 1023px): Medium sizing with improved readability
    - Desktop (≥ 1024px): Large cross-section images (up to 500px height) and significantly larger text for easy reading
  - Cross-section legend now fully visible on all device sizes
  - Font sizes automatically scale based on device: 9px (mobile), 10px (tablet), 12px (desktop)
- ✅ **DEPLOYED: Fixed Firestore permissions error for library collections**:
  - Added explicit security rules for all library collections (strandLibrary, aggregateLibrary, admixLibrary, projectLibrary, productLibrary)
  - All approved users can now read and write to library collections
  - Fixes "Missing or insufficient permissions" error when subscribing to strandLibrary
  - Deployed Firestore rules to production
- ✅ **Improved cross-section legend and PDF size**:
  - Increased legend symbols and text size (symbols 33% larger, text 40% larger)
  - Reduced spacing between symbols and "=" values for cleaner layout
  - Increased PDF cross-section image height from 110px to 180px (63% larger)
  - Cross-sections now much more readable on computer screens
- ✅ **Fixed strand pattern validation for top strands**:
  - Top strand positions now correctly allow negative e values (centroid - strand height can be negative)
  - Bottom strand positions still require positive e values as expected
  - Deployed to production web app
- ✅ **Implemented Firebase Firestore sync for slippage history records**:
  - Converted slippage history from local-only AsyncStorage to Firebase Firestore
  - User records (private) stored in userSlippageRecords collection
  - Published records (public) stored in publishedSlippageRecords collection
  - Records now sync across all devices when user is logged in
  - Real-time subscriptions for published records
  - Proper security rules for data isolation
- ✅ **Added logout functionality**:
  - Red logout button on dashboard screen
  - Displays current user email and role
  - Users can sign out to verify credentials across devices
- ✅ **Fixed strand size legend cutoff in all cross-section displays**:
  - Added dynamic height calculation to all 6 CrossSection components
  - Container View now includes space for StrandSizeLegend
  - Legend now fully visible in app screens and PDF reports
  - Fixes applied to: CrossSection8048, 1047, 1247, 1250, 1648, 1650
- ✅ **Added "Required Force (lbs)" field to strand pattern creator**:
  - New optional field in strand pattern creation/editing form
  - Allows specifying required force in pounds for each strand pattern
  - Will be used in future calculations involving strand patterns
  - Displays in strand pattern list view when set

### Recent Updates (2025-11-10)
- ✅ **Added Strand Size Legend to all CrossSection components**:
  - Created reusable StrandSizeLegend component showing shape key
  - Circle = 0.6", X = 1/2", Diamond = 3/8"
  - Legend appears below cross-section when strands are visible
  - Applied to all 6 CrossSection components (8048, 1047, 1247, 1250, 1648, 1650)
  - Scales proportionally with cross-section scale
- 🚀 **DEPLOYED TO PRODUCTION** - All fixes including PDF layout improvements deployed to https://precast-qc-tools-web-app.web.app
- ✅ **Improved PDF layout and formatting**:
  - Cross-section image now properly centered using flexbox layout (display: flex, justify-content: center)
  - Reduced page padding and margins to fit all content on one page
  - Set image max-width to 90% for better centering with white space on sides
  - Added @page CSS rule to control page size
  - Added overflow:hidden to prevent page breaks
  - Reduced section spacing (5px → 4px) and header spacing (5px → 4px)
  - **All PDF content now fits on a single page with centered cross-section**
- ✅ **CRITICAL FIX: PDF generator now downloads files directly on web (no print dialog)**:
  - Fixed platform detection in both pdfGenerator.ts AND SlippageSummaryScreen.tsx to use `Platform.OS === 'web'`
  - Fixed "Element is not attached to a Document" error on React Native
  - jsPDF and html2canvas now only load on web platform (not React Native)
  - captureRef (react-native-view-shot) only used on native platforms
  - Added error logging to help diagnose library loading issues
  - Web users now get direct PDF file downloads instead of print dialog
  - **VERIFIED WORKING IN PRODUCTION**
- ✅ **Improved PDF generation error handling**:
  - Added validation for HTML content before printing
  - Enhanced error detection for "Printing did not complete" errors
  - Now retries PDF generation without images when print errors occur
  - Better logging to diagnose PDF generation issues
- ✅ **Fixed html2canvas document.createElement error in React Native**:
  - Added document object mock in index.ts for React Native platforms
  - Prevents html2canvas initialization errors on mobile
  - Web-only libraries now safely load without crashing the app
- ✅ **Fixed Latin1 encoding error for jsPDF/fast-png library**:
  - Added TextDecoder polyfill in index.ts to support latin1 encoding
  - Latin1 encoding now maps bytes directly to Unicode codepoints
  - Resolves "Unknown encoding: latin1" error when generating PDF reports
- ✅ **Changed product type 1248 to 1247 throughout the entire codebase**:
  - Renamed CrossSection1248 component to CrossSection1247
  - Updated all imports and references across all screens
  - Updated product type arrays, type definitions, and documentation
  - Updated comments in CrossSection1250 component
  - Product type 1247 now used consistently everywhere
- ✅ Updated OpenAI API key in Cloud Function
- ✅ Deployed Cloud Function successfully
- ✅ Function URL: https://openaivisionproxy-k2ycslozcq-uc.a.run.app
- ✅ Camera scanner now working with new API key
- ✅ Changed "Project Information" to "Product Details" in Camber Calculator and Product Details screens
- ✅ Fixed span input fields layout to prevent fraction button from being pushed off-screen after scanning product tags
- ✅ **Added support for top strand patterns in Slippage Identifier** - DEPLOYED:
  - Updated SlippageData interface to track strand source (bottom/top)
  - Modified SlippageIdentifierScreen to display input fields for both bottom AND top strands
  - Updated SlippageSummaryScreen to show separate sections for bottom and top strands
  - Enhanced PDF generator to include both bottom and top strand data in reports
  - Strands now use prefixes: "B" for bottom strands (B1, B2, B3...), "T" for top strands (T1, T2, T3...)
  - Visual distinction: Bottom strands shown with green badges, Top strands with blue badges
  - Deployed to production at https://precast-qc-tools-web-app.web.app
- ✅ **Enhanced cross-section visualization with shape-based strand identification**:
  - Bottom strands now displayed in GREEN (instead of red)
  - Top strands displayed in BLUE
  - **Shape coding by strand size (applies to both top and bottom strands):**
    - 3/8" strands = Diamonds 🔷
    - 1/2" strands = X marks ✖️
    - 0.6" strands = Circles ⭕
  - Updated all 6 CrossSection components (8048, 1047, 1247, 1250, 1648, 1650)
  - Cross-sections now show both bottom and top strands simultaneously
  - Labels show B1, B2... for bottom strands and T1, T2... for top strands
- ✅ **Fixed strand indicator visibility issue**:
  - Strand indicators now display correctly in all cross-section diagrams
  - Fixed condition logic to show strands when `strandCoordinates`, `bottomStrandSizes`, or `topStrandCoordinates` are provided
  - Applied fix to all 6 CrossSection components
  - Strands now visible in Slippage Identifier screen, Slippage Summary screen, and PDF reports
- ✅ **Enhanced PDF generation with direct download**:
  - Web platform now uses jsPDF + html2canvas for direct PDF file download
  - PDFs are automatically downloaded to Downloads folder (no print dialog)
  - Cross-section illustration now properly included in PDF reports
  - Added better padding (30px top/bottom, 40px left/right) for professional appearance
  - Reordered product details: Project #, Project Name, Mark #, ID #, Product Type, Strand Pattern, Span, Width
  - **Separate statistics for bottom and top strands:**
    - Bottom strand statistics section with totals and averages
    - Top strand statistics section with totals and averages
    - Each section shows: Total E1, Total E2, Total Both Ends, Average E1, Average E2, Average Both Ends
    - Independent warning indicators for bottom and top strands
  - Reduced empty spaces for more compact, efficient layout
  - Multi-page support for longer reports

## Features

### Aggregate Gradation Tool (Complete Integration)
- **Complete ASTM C-33 Compliance Analysis** - All 64 functions from standalone tool fully integrated
- **Main Analysis View** - Real-time gradation calculations with keyboard navigation between sieve inputs
- **Admin Configuration** - Full CRUD operations for aggregate management with sieve editor
- **Test Repository** - Comprehensive record management with filtering, viewing, editing, printing, and CSV export
- **Configure Defaults** - Select up to 8 default aggregates for main page
- **Print & Export** - Blank forms generation (5 per page landscape) and individual record export
- **Gradation Charts** - Log-scale SVG charts showing sieve analysis curves
- **C33 Compliance** - Color-coded pass/fail indicators for all ASTM C-33 limits
- **Fineness Modulus** - Automatic calculation for fine aggregates
- **Decant Percentage** - Automatic calculation with configurable limits
- **No Production Records** - Date range tracking for periods without testing
- **Firebase Integration** - All data stored in Firestore with real-time sync
- **Mobile-First Design** - Card-based layouts optimized for mobile viewing

### Product Tag Scanner
- **Native Camera Integration** - Uses iPhone native camera for sharp, clear images
- **AI-Powered OCR** - Automatically extracts all product information from tags
- **Cloud Function Proxy** - Secure server-side OpenAI API calls
- **Works on Web & Mobile** - Fully functional in both sandbox and deployed environments

### Quality Management Tools
- Product tracking and management
- Schedule scanning and import
- Real-time data synchronization
- User authentication and admin approval

## Deployment

### Deploy Web App + Cloud Functions

Deploy everything with a single command:

```bash
node deploy.js
```

This will:
1. Build the Expo web app for production
2. Deploy to Firebase Hosting
3. Your app will be live at https://precast-qc-tools-web-app.web.app

**Note:** Cloud Functions are deployed separately and require additional permissions (already configured).

### Custom Domain & SSL

Want to use your own domain with free SSL? See **[CUSTOM_DOMAIN_SETUP.md](./CUSTOM_DOMAIN_SETUP.md)** for:
- Connecting a custom domain (e.g., `qctools.yourcompany.com`)
- DNS configuration for all major providers
- Free automatic SSL certificate setup
- Multi-Factor Authentication (MFA) implementation guide

### Deploy Cloud Functions Only

If you need to update just the Cloud Functions:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/tmp/firebase-sa.json npx firebase deploy --only functions --project precast-qc-tools-web-app
```

**Requirements:**
- `FIREBASE_PROJECT_ID` must be set in `.env` file (via Vibecode ENV tab)
- `FIREBASE_SERVICE_ACCOUNT` (full JSON) must be set in `.env` file (via Vibecode ENV tab)

## Quick Start

### 1. Environment Setup

Add these environment variables via the Vibecode ENV tab:
- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `FIREBASE_SERVICE_ACCOUNT` - Your Firebase service account JSON

### 2. Install Dependencies

```bash
bun install
cd functions && npm install && cd ..
```

### 3. Run Development Server

```bash
npx expo start
```

## Architecture

### Frontend
- **React Native** with Expo SDK 53
- **NativeWind** for styling (TailwindCSS)
- **Firebase SDK** for authentication and data
- **Expo Router** for navigation
- **Zustand** for state management

### Backend
- **Firebase Authentication** - User auth with email/password
- **Firestore Database** - Real-time data storage
- **Cloud Functions** - OpenAI Vision API proxy (Node.js 20)
- **Firebase Hosting** - Web app deployment

### Cloud Function: OpenAI Vision Proxy

Located in `/functions/index.js`, this serverless function:
- Receives image data from the web app
- Calls OpenAI GPT-4o Vision API
- Returns parsed product tag data
- Avoids CORS and SSL certificate issues

**Endpoint:** https://us-central1-precast-qc-tools-web-app.cloudfunctions.net/openaiVisionProxy

## Project Structure

```
/home/user/workspace/
├── src/                          # React Native source code
│   ├── api/                      # API integration files
│   │   └── product-tag-scanner.ts  # Product tag AI parsing
│   ├── screens/                  # App screens
│   │   └── ProductTagScannerScreen.tsx
│   ├── components/               # Reusable components
│   ├── config/                   # Configuration files
│   └── store/                    # Zustand state management
├── functions/                    # Firebase Cloud Functions
│   ├── index.js                  # OpenAI Vision proxy function
│   └── package.json              # Function dependencies
├── assets/                       # Images, fonts, etc.
├── deploy.js                     # Deployment script
├── firebase.json                 # Firebase configuration
├── app.json                      # Expo configuration
└── package.json                  # Dependencies

```

## Deployment History

See `changelog.txt` for detailed deployment history and changes.

## Support

For issues or questions:
- Check the deployment logs in the console
- Review Firebase Cloud Function logs at: https://console.firebase.google.com/project/precast-qc-tools-web-app/functions
- Contact Vibecode support for infrastructure issues

## License

Private - All rights reserved
