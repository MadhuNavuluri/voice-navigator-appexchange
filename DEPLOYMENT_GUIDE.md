# Salesforce Voice Navigator - Deployment & Testing Guide

## Overview
Voice Navigator is a Lightning Web Component that adds voice-controlled navigation to your Salesforce org. Speak commands like "create new field on account" and it navigates you directly to the field creation page.

---

## Prerequisites
- Salesforce Developer Edition or Sandbox org
- **Salesforce CLI (sf)** installed → https://developer.salesforce.com/tools/salesforcecli
- **VS Code** with Salesforce Extension Pack (optional but recommended)
- **Google Chrome** browser (required for Web Speech API)

---

## Step 1: Install Salesforce CLI (if not already)

### macOS
```bash
brew install sf
```

### Windows
Download from: https://developer.salesforce.com/tools/salesforcecli

### Verify Installation
```bash
sf --version
```

---

## Step 2: Authorize Your Salesforce Org

```bash
# For Production/Developer org:
sf org login web --alias myorg --instance-url https://login.salesforce.com

# For Sandbox:
sf org login web --alias myorg --instance-url https://test.salesforce.com
```

This opens a browser - log in and authorize the CLI.

### Verify connection:
```bash
sf org list
```

---

## Step 3: Deploy the Code

Navigate to the project folder and deploy:

```bash
cd voice-navigator

# Deploy everything to your org
sf project deploy start --target-org myorg
```

### If deploying individual components:
```bash
# Deploy Apex classes first
sf project deploy start --target-org myorg --source-dir force-app/main/default/classes

# Then deploy LWC
sf project deploy start --target-org myorg --source-dir force-app/main/default/lwc
```

### Verify deployment:
```bash
sf project deploy report --target-org myorg
```

---

## Step 4: Run Tests

```bash
sf apex run test --target-org myorg --class-names VoiceNavigatorControllerTest --result-format human --wait 5
```

You should see all 4 tests pass.

---

## Step 5: Add Voice Navigator to Your App

You have **3 options** for placing the component. **Option A (Utility Bar)** is recommended.

### Option A: Add to Utility Bar (RECOMMENDED - always accessible)

1. Go to **Setup** → Search for **App Manager**
2. Find your Lightning App (e.g., **Sales** or **Service**)
3. Click the **dropdown arrow** → **Edit**
4. Click **Utility Items (Desktop Only)** in the left nav
5. Click **Add Utility Item**
6. Search for **voiceNavigator**
7. Set Label to: `Voice Navigator`
8. Set Icon to: `voice`
9. Set Panel Width: `340`
10. Set Panel Height: `480`
11. **Uncheck** "Start automatically" (optional)
12. Click **Save**

Now the voice navigator appears as a small icon in the bottom utility bar on every page!

### Option B: Add to Home Page

1. Go to your Salesforce **Home** page
2. Click the **gear icon** → **Edit Page**
3. In the Lightning App Builder, drag **voiceNavigator** from the left panel onto your page layout
4. Click **Save** → **Activate** → **Assign as Org Default** → **Save**

### Option C: Add to a Record Page

1. Navigate to any record (e.g., an Account record)
2. Click **gear icon** → **Edit Page**
3. Drag **voiceNavigator** onto the sidebar
4. Click **Save** → **Activate**

---

## Step 6: Allow Microphone Permissions

When you first click the microphone button:

1. Chrome will show a **popup** asking for microphone permission
2. Click **Allow**
3. If you accidentally blocked it:
   - Click the **lock icon** in Chrome's address bar
   - Find **Microphone** → Set to **Allow**
   - Refresh the page

---

## Step 7: Test Voice Commands

### Basic Navigation Commands
| Say This | It Does This |
|----------|-------------|
| "Go to accounts" | Opens Account list view |
| "Open contacts" | Opens Contact list view |
| "Navigate to opportunities" | Opens Opportunity list view |
| "Open leads" | Opens Lead list view |

### Create Record Commands
| Say This | It Does This |
|----------|-------------|
| "Create new account" | Opens new Account form |
| "New contact" | Opens new Contact form |
| "Create a new opportunity" | Opens new Opportunity form |
| "Add a lead" | Opens new Lead form |

### Setup / Field Commands
| Say This | It Does This |
|----------|-------------|
| "Create new field on account" | Opens Account field creation wizard |
| "Add field to contact" | Opens Contact field creation wizard |
| "Show account fields" | Opens Account Fields & Relationships list |
| "Open contact fields" | Opens Contact Fields & Relationships list |
| "Open object manager" | Opens Object Manager home |
| "Go to setup" | Opens Setup home |

### Special Pages
| Say This | It Does This |
|----------|-------------|
| "Open reports" | Opens Reports home |
| "Go to dashboards" | Opens Dashboards home |
| "Go home" | Opens Home page |

---

## Troubleshooting

### "Speech not supported"
- **Solution**: Use **Google Chrome**. Firefox and Safari have limited/no Web Speech API support.

### "Microphone blocked"
- Click the lock icon in Chrome's address bar → Allow microphone
- Or go to Chrome Settings → Privacy & Security → Site Settings → Microphone

### Locker Service / LWS Blocks Speech API
If Salesforce's security framework blocks the Web Speech API:

**Workaround - Use a Visualforce Wrapper:**

Create a Visualforce page that hosts the speech recognition and communicates with LWC via `postMessage`:

```html
<!-- VF Page: VoiceRecognitionPage -->
<apex:page>
<script>
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    
    // Listen for start command from LWC
    window.addEventListener('message', function(event) {
        if (event.data.action === 'start') {
            recognition.start();
        }
        if (event.data.action === 'stop') {
            recognition.stop();
        }
    });
    
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        // Send transcript back to parent LWC
        window.parent.postMessage({
            type: 'voiceResult',
            transcript: transcript
        }, '*');
    };
</script>
</apex:page>
```

Then embed it in LWC using `<iframe>` and listen for `postMessage` events.

### Component Not Showing in App Builder
- Make sure `isExposed` is `true` in the `.js-meta.xml` file
- Verify the deployment succeeded: `sf project deploy report`
- Clear your browser cache and hard refresh (Ctrl+Shift+R)

### Commands Not Recognized
- Speak clearly and at a normal pace
- Check the "Last Command" display to see what was heard
- The confidence percentage helps - aim for above 70%
- Reduce background noise

### Navigation Goes to Wrong Page
- Check Chrome console (F12) for errors
- Custom objects require exact spoken name matching their label
- The component dynamically loads custom object labels via Apex

---

## Project File Structure

```
voice-navigator/
├── sfdx-project.json
└── force-app/
    └── main/
        └── default/
            ├── classes/
            │   ├── VoiceNavigatorController.cls          # Apex - fetches custom objects
            │   ├── VoiceNavigatorController.cls-meta.xml
            │   ├── VoiceNavigatorControllerTest.cls      # Test class
            │   └── VoiceNavigatorControllerTest.cls-meta.xml
            └── lwc/
                └── voiceNavigator/
                    ├── voiceNavigator.html                # UI template
                    ├── voiceNavigator.js                  # Speech + navigation logic
                    ├── voiceNavigator.css                 # Styles
                    └── voiceNavigator.js-meta.xml         # Component config
```

---

## Future Enhancements

1. **AI-Powered Parsing**: Route transcripts to Claude API via Apex for natural language understanding
2. **Record Search**: "Find account named Acme" → searches and navigates to the record
3. **Multi-Language**: Change `recognition.lang` for different languages
4. **Voice Feedback**: Use `SpeechSynthesis` API to speak back confirmation
5. **Custom Commands**: Let admins define custom voice-to-URL mappings via Custom Metadata
6. **Keyboard Shortcut**: Add a hotkey (e.g., Ctrl+Shift+V) to toggle listening
