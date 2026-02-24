# Voice Navigator for Salesforce
# Technical Setup & Installation Guide

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture & Technical Components](#2-architecture--technical-components)
3. [Component Inventory](#3-component-inventory)
4. [How It Works - Technical Deep Dive](#4-how-it-works---technical-deep-dive)
5. [Installation Methods](#5-installation-methods)
6. [Post-Installation Configuration](#6-post-installation-configuration)
7. [Voice Commands Reference](#7-voice-commands-reference)
8. [Security & Permissions](#8-security--permissions)
9. [Browser Requirements](#9-browser-requirements)
10. [Troubleshooting](#10-troubleshooting)
11. [Customization & Extension](#11-customization--extension)
12. [FAQ](#12-faq)

---

## 1. Overview

**Voice Navigator** is a voice-controlled navigation component for Salesforce Lightning Experience. It allows users to navigate Salesforce by speaking natural commands like:

- "Go to accounts" - Opens the Account list view
- "Create new contact" - Opens a new Contact record form
- "Find Acme" - Searches for records named "Acme"
- "Open users" - Navigates to the Users setup page
- "Show account fields" - Opens Account Fields & Relationships in Object Manager

### Key Facts

| Property | Value |
|----------|-------|
| Platform | Salesforce Lightning Experience |
| API Version | 59.0 |
| Project Format | Salesforce DX (SFDX) |
| External Dependencies | None |
| API Keys Required | None |
| Custom Objects Required | None |
| Browser | Google Chrome (required) |
| Language | English (US) |

---

## 2. Architecture & Technical Components

### High-Level Architecture

```
+------------------------------------------------------------------+
|                    Salesforce Lightning Experience                 |
|                                                                   |
|  +-----------------------------+   +---------------------------+  |
|  |   LWC: voiceNavigator       |   |  Apex: VoiceNavigator-   |  |
|  |                             |   |  Controller               |  |
|  |  - Command parsing engine   |<->|                           |  |
|  |  - Navigation logic         |   |  - getObjectApiNames()   |  |
|  |  - Fuzzy matching           |   |  - getObjectFields()     |  |
|  |  - Search UI                |   |  - searchRecords()       |  |
|  |  - Keyboard shortcuts       |   |                           |  |
|  +------------|----------------+   +---------------------------+  |
|               |                              |                    |
|               | postMessage                  | SOSL / Schema API  |
|               v                              v                    |
|  +-----------------------------+   +---------------------------+  |
|  |   VF: VoiceRecognitionPage  |   |  Salesforce Database      |  |
|  |   (Hidden iframe)           |   |                           |  |
|  |                             |   |  - Standard Objects       |  |
|  |  - Web Speech API           |   |  - Custom Objects         |  |
|  |  - SpeechSynthesis API      |   |  - Record Search          |  |
|  +-----------------------------+   +---------------------------+  |
|               |                                                   |
|               v                                                   |
|  +-----------------------------+                                  |
|  |   Browser (Chrome)          |                                  |
|  |   - Microphone access       |                                  |
|  |   - Speech recognition      |                                  |
|  +-----------------------------+                                  |
+------------------------------------------------------------------+
```

### Why the Visualforce Page?

Salesforce's **Locker Service** (security sandbox for LWC) blocks direct access to the browser's Web Speech API. The Visualforce page acts as a bridge:

1. The VF page runs **outside** the Locker Service sandbox
2. It creates a `SpeechRecognition` instance and handles microphone input
3. It communicates with the LWC parent via the `postMessage` API
4. This is a standard, supported workaround for browser API restrictions

### Data Flow

```
User speaks --> Chrome Microphone --> Web Speech API (in VF iframe)
  --> postMessage to LWC --> Command Parser --> Navigation/Search action
  --> Voice feedback via SpeechSynthesis (in VF iframe) --> Speaker
```

---

## 3. Component Inventory

### 3.1 Lightning Web Component: voiceNavigator

| File | Size | Purpose |
|------|------|---------|
| `voiceNavigator.js` | 39 KB | Core logic: command parsing, navigation, fuzzy matching, search |
| `voiceNavigator.html` | 7 KB | UI template: mic button, status, results, help section |
| `voiceNavigator.css` | 1.6 KB | Styling: button animations, status colors, layout |
| `voiceNavigator.js-meta.xml` | 420 B | Metadata: exposed to App Page, Home Page, Utility Bar, Record Page |

**LWC Targets (where it can be placed):**
- `lightning__AppPage` - Lightning App pages
- `lightning__HomePage` - Home page
- `lightning__UtilityBar` - Utility bar (recommended)
- `lightning__RecordPage` - Record detail pages

### 3.2 Apex Controller: VoiceNavigatorController

| File | Size | Purpose |
|------|------|---------|
| `VoiceNavigatorController.cls` | 5.6 KB | Server-side logic: object discovery, field metadata, record search |
| `VoiceNavigatorController.cls-meta.xml` | 150 B | Metadata: API version 59.0, Active |

**Methods:**

| Method | Cacheable | Purpose |
|--------|-----------|---------|
| `getObjectApiNames()` | Yes | Returns all custom objects (label -> API name mapping) |
| `getObjectFields(objectApiName)` | Yes | Returns field metadata for any object (respects FLS) |
| `searchRecords(objectApiName, searchTerm)` | No | SOSL search for records by name |

### 3.3 Apex Test Class: VoiceNavigatorControllerTest

| File | Size | Purpose |
|------|------|---------|
| `VoiceNavigatorControllerTest.cls` | 4.2 KB | 8 test methods covering all Apex methods |
| `VoiceNavigatorControllerTest.cls-meta.xml` | 150 B | Metadata |

**Test Methods:**
1. `testGetObjectApiNames()` - Custom object retrieval
2. `testGetObjectFieldsAccount()` - Field retrieval for Account
3. `testGetObjectFieldsInvalidObject()` - Invalid object handling
4. `testGetObjectFieldsNullInput()` - Null safety
5. `testSearchRecordsWithObject()` - Object-scoped search
6. `testSearchRecordsGeneral()` - Cross-object search
7. `testSearchRecordsEmptyTerm()` - Empty input validation
8. `testSearchRecordsSanitization()` - Special character sanitization

### 3.4 Visualforce Page: VoiceRecognitionPage

| File | Size | Purpose |
|------|------|---------|
| `VoiceRecognitionPage.page` | 3.2 KB | Speech recognition bridge (iframe-hosted) |
| `VoiceRecognitionPage.page-meta.xml` | 250 B | Metadata |

**Message Protocol (LWC <-> VF):**

| Direction | Message | Purpose |
|-----------|---------|---------|
| LWC -> VF | `{ action: 'start' }` | Start listening |
| LWC -> VF | `{ action: 'stop' }` | Stop listening |
| LWC -> VF | `{ action: 'speak', text: '...' }` | Voice feedback |
| VF -> LWC | `{ type: 'voiceSpeechSupport', supported: bool }` | Browser capability |
| VF -> LWC | `{ type: 'voiceStatus', status: '...' }` | Listening/ended status |
| VF -> LWC | `{ type: 'voiceResult', transcript: '...', confidence: 0.95 }` | Speech result |
| VF -> LWC | `{ type: 'voiceError', error: '...' }` | Error event |

### 3.5 Configuration & Deployment Files

| File | Purpose |
|------|---------|
| `sfdx-project.json` | SFDX project definition with unlocked package config |
| `manifest/package.xml` | Metadata API deployment manifest |
| `scripts/deploy.sh` | Automated deployment script (SFDX source deploy) |
| `scripts/create-package.sh` | Unlocked package creation script |
| `scripts/install-package.sh` | Package installation script for target orgs |

---

## 4. How It Works - Technical Deep Dive

### 4.1 Command Parsing Pipeline

When a user speaks a command, it goes through this pipeline (in order):

```
Speech Input: "find account acme"
       |
       v
  [1] trySearchRecord()      --> Matches "find/search [object] [term]"
  [2] tryCreateField()       --> Matches "create/add field on [object]"
  [3] tryObjectSubpage()     --> Matches "[object] [subpage]" (e.g., "account fields")
  [4] trySetupPage()         --> Matches setup page names (e.g., "users", "profiles")
  [5] tryCreateRecord()      --> Matches "create/new [object]"
  [6] tryNavigateObject()    --> Matches "go to/open [object]"
  [7] trySpecialPages()      --> Matches "home", "chatter", "files", etc.
       |
       v
  First match wins --> Execute navigation
```

### 4.2 Fuzzy Matching (Levenshtein Distance)

The component includes a Levenshtein distance algorithm that tolerates speech recognition errors:

- "acount" matches "account" (distance = 1)
- "oppertunities" matches "opportunities" (distance = 2)
- Threshold scales with word length (longer words allow more edits)

### 4.3 Dynamic Custom Object Support

Custom objects are **not hardcoded**. On component load:

1. LWC calls `@wire(getObjectApiNames)` Apex method
2. Apex uses `Schema.getGlobalDescribe()` to discover all custom objects
3. Filters for accessible, searchable, non-custom-setting objects
4. Returns label-to-API-name mapping
5. LWC merges these with the standard object registry

This means Voice Navigator **automatically supports any custom object** in the target org.

### 4.4 Hardcoded Registries

| Registry | Count | Examples |
|----------|-------|---------|
| Standard Objects | 24 | Account, Contact, Opportunity, Lead, Case, Campaign |
| Setup Pages | 120+ | Users, Profiles, Flows, Apex Classes, Permission Sets |
| Object Manager Subpages | 80+ | Fields, Page Layouts, Validation Rules, Triggers |
| Special Pages | 6 | Home, Chatter, Files, Notes, Calendar, Tasks |

---

## 5. Installation Methods

### Method 1: Unlocked Package (Recommended for Distribution)

**Best for:** Installing in multiple orgs, non-technical admins, version management.

#### Prerequisites

- A **Dev Hub-enabled org** (Developer Edition, Enterprise, or Unlimited)
- Salesforce CLI (`sf`) installed

#### Step A: Enable Dev Hub (One-time, in your packaging org)

1. Log in to your Salesforce org (must be Developer Edition, Enterprise, or Unlimited)
2. Go to **Setup** > Search for **Dev Hub**
3. Toggle **Enable Dev Hub** to ON
4. (Optional) Enable **Unlocked Packages and Second-Generation Managed Packages**

#### Step B: Authorize Dev Hub

```bash
# Authorize the Dev Hub org
sf org login web --alias devhub

# Verify
sf org list
```

#### Step C: Create the Package

```bash
# Option 1: Use the provided script
./scripts/create-package.sh devhub

# Option 2: Manual commands
sf package create \
    --name "Voice Navigator" \
    --package-type Unlocked \
    --path force-app \
    --no-namespace \
    --description "Voice-controlled navigation for Salesforce Lightning" \
    --target-dev-hub devhub

# Create a version
sf package version create \
    --package "Voice Navigator" \
    --installation-key-bypass \
    --wait 15 \
    --target-dev-hub devhub \
    --code-coverage
```

#### Step D: Get the Install ID

```bash
# List package versions
sf package version list --packages "Voice Navigator" --target-dev-hub devhub

# Note the "Subscriber Package Version Id" (starts with 04t)
```

#### Step E: Install in Any Target Org

```bash
# Option 1: Use the provided script
./scripts/install-package.sh 04tXXXXXXXXXXXXXXX targetorg

# Option 2: Manual command
sf package install \
    --package 04tXXXXXXXXXXXXXXX \
    --target-org targetorg \
    --wait 10

# Option 3: Share install URL (admin clicks in browser)
# https://<org-domain>/packaging/installPackage.apexp?p0=04tXXXXXXXXXXXXXXX
```

#### Step F: Promote for Production

```bash
# Promote the version (required before installing in production orgs)
sf package version promote --package 04tXXXXXXXXXXXXXXX --target-dev-hub devhub
```

---

### Method 2: SFDX Source Deploy (Recommended for Developers)

**Best for:** Developers, CI/CD pipelines, sandbox deployments.

#### Prerequisites

- Salesforce CLI (`sf`) installed
- Git installed
- Target org authorized

#### Steps

```bash
# 1. Clone the repository
git clone <repository-url>
cd voice-navigator

# 2. Authorize target org
sf org login web --alias myorg                                              # Production/Dev
sf org login web --alias myorg --instance-url https://test.salesforce.com   # Sandbox

# 3. Deploy (use the script or manual command)
./scripts/deploy.sh myorg

# OR manually:
sf project deploy start --target-org myorg --source-dir force-app --wait 10

# 4. Run tests
sf apex run test \
    --target-org myorg \
    --class-names VoiceNavigatorControllerTest \
    --result-format human \
    --wait 5

# 5. Verify
sf project deploy report --target-org myorg
```

---

### Method 3: Metadata API Deploy (via package.xml)

**Best for:** Orgs where SFDX source format is not used, older CI/CD systems.

```bash
# Deploy using the manifest
sf project deploy start \
    --target-org myorg \
    --manifest manifest/package.xml \
    --wait 10
```

---

### Method 4: Change Set (No CLI Required)

**Best for:** Non-technical admins, org-to-org deployment via Salesforce UI.

#### In the Source Org (where code exists):

1. Go to **Setup** > **Outbound Change Sets** > **New**
2. Name it: "Voice Navigator"
3. Add these components:

| Component Type | Component Name |
|---------------|----------------|
| Apex Class | VoiceNavigatorController |
| Apex Class | VoiceNavigatorControllerTest |
| Lightning Web Component Bundle | voiceNavigator |
| Visualforce Page | VoiceRecognitionPage |

4. Click **Upload** and select the target org

#### In the Target Org:

1. Go to **Setup** > **Inbound Change Sets**
2. Find "Voice Navigator" > **Deploy**
3. Select "Run specified tests" > Enter: `VoiceNavigatorControllerTest`
4. Click **Deploy**

---

### Method 5: VS Code with Salesforce Extensions

**Best for:** Developers using VS Code as their IDE.

1. Install **Salesforce Extension Pack** in VS Code
2. Open the `voice-navigator` project folder
3. Press `Ctrl+Shift+P` > **SFDX: Authorize an Org**
4. Right-click the `force-app` folder > **SFDX: Deploy Source to Org**

---

## 6. Post-Installation Configuration

### 6.1 Add to Utility Bar (Recommended)

This makes Voice Navigator accessible from **every page** as a pop-up panel in the utility bar.

1. Go to **Setup** > Search for **App Manager**
2. Find your Lightning App (e.g., "Sales", "Service", or your custom app)
3. Click the dropdown arrow > **Edit**
4. Click **Utility Items (Desktop Only)** in the left sidebar
5. Click **Add Utility Item**
6. Search for and select **voiceNavigator**
7. Configure:
   - **Label:** Voice Navigator
   - **Icon:** voice (or microphone)
   - **Panel Width:** 400
   - **Panel Height:** 500
   - **Start Automatically:** Unchecked (optional)
8. Click **Save**

### 6.2 Alternative: Add to Home Page

1. Go to the Salesforce **Home** page
2. Click the **gear icon** > **Edit Page**
3. Drag **voiceNavigator** from the component palette onto the page layout
4. Click **Save** > **Activate** > **Assign as Org Default** > **Save**

### 6.3 Alternative: Add to Record Pages

1. Navigate to any record page (e.g., an Account)
2. Click **gear icon** > **Edit Page**
3. Drag **voiceNavigator** onto the page sidebar
4. Click **Save** > **Activate**

### 6.4 Grant Microphone Access

- On first use, Chrome will display a microphone permission prompt
- Click **Allow**
- If accidentally denied: Click the **lock icon** in Chrome's address bar > Microphone > Allow > Refresh

---

## 7. Voice Commands Reference

### Object Navigation

| Command Pattern | Example | Action |
|----------------|---------|--------|
| "Go to [objects]" | "Go to accounts" | Opens object list view |
| "Open [objects]" | "Open contacts" | Opens object list view |
| "Navigate to [objects]" | "Navigate to opportunities" | Opens object list view |

**Supported Standard Objects (24):** Account, Contact, Opportunity, Lead, Case, Campaign, Task, Event, Product, Pricebook, Quote, Order, Contract, Solution, User, Report, Dashboard, Document, Note, File, Asset, Work Order, Service Contract, Knowledge.

**Custom Objects:** Automatically discovered - any custom object in your org is supported.

### Record Creation

| Command Pattern | Example | Action |
|----------------|---------|--------|
| "Create [object]" | "Create account" | Opens new record form |
| "New [object]" | "New contact" | Opens new record form |
| "Create new [object]" | "Create new opportunity" | Opens new record form |
| "Add [object]" | "Add a lead" | Opens new record form |

### Record Search

| Command Pattern | Example | Action |
|----------------|---------|--------|
| "Find [object] [name]" | "Find account Acme" | Searches specific object |
| "Search [object] [name]" | "Search contact John" | Searches specific object |
| "Find [name]" | "Find Acme" | Cross-object search (Account, Contact, Opportunity, Lead, Case) |

### Setup Navigation (120+ pages)

| Category | Example Commands |
|----------|-----------------|
| User Management | "Open users", "Go to profiles", "Open permission sets", "Go to roles" |
| Security | "Open sharing settings", "Go to session settings", "Open CORS" |
| Email | "Open email deliverability", "Go to email templates" |
| Data | "Open data import", "Go to storage usage", "Open schema builder" |
| Automation | "Open flows", "Go to approval processes", "Open workflow rules" |
| Custom Code | "Open apex classes", "Go to visualforce pages", "Open static resources" |
| Deployment | "Open sandboxes", "Go to deployment status", "Open installed packages" |
| Company | "Open company information", "Go to business hours" |
| UI/Apps | "Open app manager", "Go to lightning app builder", "Open tabs" |
| Monitoring | "Open debug logs", "Go to scheduled jobs", "Open apex jobs" |

### Object Manager (80+ subpages)

| Command Pattern | Example | Action |
|----------------|---------|--------|
| "[object] fields" | "Account fields" | Opens Fields & Relationships |
| "[object] page layouts" | "Contact page layouts" | Opens Page Layouts |
| "[object] validation rules" | "Lead validation rules" | Opens Validation Rules |
| "[object] triggers" | "Account triggers" | Opens Apex Triggers |
| "[object] record types" | "Opportunity record types" | Opens Record Types |
| "Create field on [object]" | "Create field on account" | Opens New Field wizard |

### Special Pages

| Command | Action |
|---------|--------|
| "Go home" | Opens Home page |
| "Open chatter" | Opens Chatter feed |
| "Open files" | Opens Files page |
| "Open notes" | Opens Notes page |
| "Open calendar" | Opens Calendar |

### Keyboard Shortcut

| Shortcut | Platform | Action |
|----------|----------|--------|
| `Option + Space` | macOS | Toggle voice listening |
| `Ctrl + Space` | Windows/Linux | Toggle voice listening |

---

## 8. Security & Permissions

### What Voice Navigator Accesses

| Access Type | Details | Security Model |
|-------------|---------|---------------|
| Custom Objects | Reads object metadata via `Schema.getGlobalDescribe()` | Respects object-level permissions |
| Object Fields | Reads field metadata | Respects Field-Level Security (FLS) via `isAccessible()` |
| Record Search | SOSL search by name | Respects Record-Level Security (sharing rules) |
| Microphone | Browser microphone access | User must grant permission per domain |

### What It Does NOT Access

- No external APIs or services
- No API keys, tokens, or secrets
- No Named Credentials or Remote Site Settings
- No user credentials or session tokens
- No data modification (read-only Apex methods)
- No DML operations (no insert, update, delete)

### Apex Security

- Controller uses `with sharing` keyword (respects org sharing rules)
- All field access checks use `isAccessible()` (respects FLS)
- SOSL search results filtered by user's record access
- Input sanitization on all search terms (prevents SOSL injection)
- `@AuraEnabled` methods exposed only to Lightning components

### Required User Permissions

| Permission | Required For | Notes |
|------------|-------------|-------|
| API Access | Apex calls from LWC | Standard for all Lightning users |
| Read access to objects | Navigation and search | Per object, per profile/permission set |
| Visualforce Page access | VoiceRecognitionPage | May need to add to profile if restricted |

### Recommended Permission Setup

For orgs with strict security, create a **Permission Set**:

1. **Setup** > **Permission Sets** > **New**
2. Name: "Voice Navigator Access"
3. Add Visualforce Page Access: `VoiceRecognitionPage`
4. Add Apex Class Access: `VoiceNavigatorController`
5. Assign to users who need Voice Navigator

---

## 9. Browser Requirements

### Supported Browsers

| Browser | Speech Recognition | Voice Feedback | Status |
|---------|-------------------|----------------|--------|
| Google Chrome (desktop) | Full support | Full support | **Recommended** |
| Microsoft Edge (Chromium) | Full support | Full support | Supported |
| Firefox | Not supported | Partial | Not recommended |
| Safari | Limited | Full support | Not recommended |

### Chrome Requirements

- Version 33+ (Web Speech API support)
- HTTPS connection (required for microphone - all Salesforce production orgs use HTTPS)
- Microphone permission granted for the Salesforce domain
- No extensions blocking microphone access

---

## 10. Troubleshooting

### Issue: "Speech recognition not supported"

**Cause:** Browser does not support the Web Speech API.
**Fix:** Switch to **Google Chrome** desktop.

### Issue: Microphone permission denied

**Cause:** Browser microphone permission was blocked.
**Fix:**
1. Click the **lock icon** in Chrome's address bar
2. Set **Microphone** to **Allow**
3. Refresh the page

### Issue: Component not visible in App Builder

**Cause:** Deployment may not have completed, or metadata is missing.
**Fix:**
1. Verify deployment: `sf project deploy report --target-org myorg`
2. Check that `isExposed` is `true` in `voiceNavigator.js-meta.xml`
3. Clear browser cache: `Ctrl+Shift+R`

### Issue: Commands not recognized / wrong commands

**Cause:** Speech recognition accuracy depends on microphone quality and background noise.
**Fix:**
1. Speak clearly at normal pace
2. Check the "Last Command" display to see what was heard
3. Aim for confidence above 70%
4. Reduce background noise
5. The fuzzy matching algorithm tolerates minor errors

### Issue: "No results found" for search

**Cause:** Search term too short or record doesn't exist.
**Fix:**
1. Minimum 2-character search term required
2. Search only matches the Name field (or CaseNumber for Cases)
3. Check if the record is accessible to your user profile

### Issue: Navigation goes to wrong setup page

**Cause:** Voice command matched a different setup page name.
**Fix:**
1. Check Chrome console (F12) for the navigation URL
2. Use more specific command names (e.g., "email deliverability" instead of just "email")
3. The command help section in the component shows available commands

### Issue: Custom objects not recognized

**Cause:** Object label doesn't match spoken words.
**Fix:**
1. Say the exact object label as it appears in Salesforce
2. Check that the object is accessible to your user profile
3. The component dynamically loads custom objects on initialization

### Issue: Locker Service blocking speech

**Cause:** This is already handled by the VF page architecture.
**Fix:** If still occurring, ensure the VoiceRecognitionPage Visualforce page was deployed correctly.

---

## 11. Customization & Extension

### Adding New Setup Page Mappings

In `voiceNavigator.js`, locate the `SETUP_PAGES` constant and add entries:

```javascript
const SETUP_PAGES = {
    // ... existing entries
    'my custom setup': '/lightning/setup/MyCustomSetup/home',
};
```

### Adding New Object Mappings

Standard objects are in the `STANDARD_OBJECTS` constant:

```javascript
const STANDARD_OBJECTS = {
    // ... existing entries
    'my object': 'MyObject__c',
    'my objects': 'MyObject__c',  // plural form
};
```

Note: Custom objects are loaded **automatically** from the org - you only need to add mappings for non-standard naming.

### Changing the Speech Language

In `VoiceRecognitionPage.page`, modify:

```javascript
recognition.lang = 'en-US';  // Change to your locale (e.g., 'en-GB', 'es-ES', 'fr-FR')
```

### Adding Voice Feedback Messages

In `voiceNavigator.js`, the `speak()` method sends messages to the VF iframe:

```javascript
speak(text) {
    // Sends to VF page for SpeechSynthesis
}
```

---

## 12. FAQ

**Q: Does this work in Salesforce Classic?**
A: No. Voice Navigator is built with Lightning Web Components and requires Lightning Experience.

**Q: Does this work on mobile (Salesforce Mobile App)?**
A: The LWC targets don't include `lightning__RecordAction` or mobile-specific targets. It currently works on desktop only.

**Q: Does it send voice data to external servers?**
A: The Web Speech API in Chrome processes speech using Google's servers for recognition. No Salesforce data is sent externally. Only the audio of the spoken command is processed by Google's speech-to-text service.

**Q: Can I use this with a namespace (managed package)?**
A: The project is configured with no namespace (`"namespace": ""`). To create a managed package, you would need to assign a namespace in the Dev Hub and update references accordingly.

**Q: Does it support multiple languages?**
A: Currently configured for English (US). The `recognition.lang` property in the VF page can be changed to support other languages. Command matching would also need localization.

**Q: What Salesforce editions are supported?**
A: Any edition that supports Lightning Experience and Lightning Web Components: Developer, Enterprise, Unlimited, and Performance editions.

**Q: How many API calls does it use?**
A: Minimal. `getObjectApiNames()` is cached and called once on load. `searchRecords()` is called only when a search command is spoken. Normal navigation commands use zero API calls.

**Q: Can admins restrict which users have access?**
A: Yes. Use Permission Sets to control access to the `VoiceNavigatorController` Apex class and `VoiceRecognitionPage` Visualforce page. The component can also be placed only on specific app pages or utility bars.

---

## File Structure Reference

```
voice-navigator/
├── sfdx-project.json                           # SFDX project config (with package definition)
├── manifest/
│   └── package.xml                             # Metadata API deployment manifest
├── scripts/
│   ├── deploy.sh                               # Automated source deployment
│   ├── create-package.sh                       # Unlocked package creation
│   └── install-package.sh                      # Package installation
├── DEPLOYMENT_GUIDE.md                         # Quick deployment guide
├── Voice_Navigator_Technical_Setup_Guide.md    # This document
└── force-app/
    └── main/
        └── default/
            ├── classes/
            │   ├── VoiceNavigatorController.cls            # Apex controller
            │   ├── VoiceNavigatorController.cls-meta.xml
            │   ├── VoiceNavigatorControllerTest.cls        # Apex tests (8 methods)
            │   └── VoiceNavigatorControllerTest.cls-meta.xml
            ├── lwc/
            │   └── voiceNavigator/
            │       ├── voiceNavigator.html                 # UI template
            │       ├── voiceNavigator.js                   # Core logic (39 KB)
            │       ├── voiceNavigator.css                  # Styles
            │       └── voiceNavigator.js-meta.xml          # Component metadata
            └── pages/
                ├── VoiceRecognitionPage.page               # Speech API bridge
                └── VoiceRecognitionPage.page-meta.xml
```

---

*Document generated for Voice Navigator v1.0 | Salesforce API 59.0*
