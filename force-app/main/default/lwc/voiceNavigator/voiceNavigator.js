import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getObjectApiNames from '@salesforce/apex/VoiceNavigatorController.getObjectApiNames';
import searchRecords from '@salesforce/apex/VoiceNavigatorController.searchRecords';

// Standard object mapping (spoken name -> API name)
const STANDARD_OBJECTS = {
    'account': 'Account',
    'accounts': 'Account',
    'contact': 'Contact',
    'contacts': 'Contact',
    'opportunity': 'Opportunity',
    'opportunities': 'Opportunity',
    'lead': 'Lead',
    'leads': 'Lead',
    'case': 'Case',
    'cases': 'Case',
    'campaign': 'Campaign',
    'campaigns': 'Campaign',
    'task': 'Task',
    'tasks': 'Task',
    'event': 'Event',
    'events': 'Event',
    'product': 'Product2',
    'products': 'Product2',
    'price book': 'Pricebook2',
    'pricebook': 'Pricebook2',
    'quote': 'Quote',
    'quotes': 'Quote',
    'order': 'Order',
    'orders': 'Order',
    'contract': 'Contract',
    'contracts': 'Contract',
    'solution': 'Solution',
    'solutions': 'Solution',
    'user': 'User',
    'users': 'User',
    'report': '__report__',
    'reports': '__report__',
    'dashboard': '__dashboard__',
    'dashboards': '__dashboard__'
};

// Levenshtein edit distance for fuzzy matching misspoken object names
function levenshteinDistance(a, b) {
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;

    let prevRow = new Array(n + 1);
    let currRow = new Array(n + 1);

    for (let j = 0; j <= n; j++) {
        prevRow[j] = j;
    }

    for (let i = 1; i <= m; i++) {
        currRow[0] = i;
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            currRow[j] = Math.min(
                currRow[j - 1] + 1,
                prevRow[j] + 1,
                prevRow[j - 1] + cost
            );
        }
        [prevRow, currRow] = [currRow, prevRow];
    }

    return prevRow[n];
}

// Find closest matching key from candidates within maxDistance
function findFuzzyMatch(input, candidates, maxDistance) {
    let bestMatch = null;
    let bestDistance = maxDistance + 1;

    for (const [key, apiName] of Object.entries(candidates)) {
        const distance = levenshteinDistance(input, key);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = { key, apiName, distance };
        }
    }

    return bestDistance <= maxDistance ? bestMatch : null;
}

// Fuzzy match for registry objects (where values are {url/path, label} objects)
function findFuzzyMatchInRegistry(input, registry, maxDistance) {
    let bestMatch = null;
    let bestDistance = maxDistance + 1;

    for (const key of Object.keys(registry)) {
        const distance = levenshteinDistance(input, key);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = { key, entry: registry[key], distance };
        }
    }

    return bestDistance <= maxDistance ? bestMatch : null;
}

// Object Manager subpage registry (spoken name -> { path, label })
const OBJECT_SUBPAGES = {
    'fields':                    { path: 'FieldsAndRelationships/view', label: 'Fields & Relationships' },
    'fields and relationships':  { path: 'FieldsAndRelationships/view', label: 'Fields & Relationships' },
    'field list':                { path: 'FieldsAndRelationships/view', label: 'Fields & Relationships' },
    'relationships':             { path: 'FieldsAndRelationships/view', label: 'Fields & Relationships' },
    'page layouts':              { path: 'PageLayouts/view', label: 'Page Layouts' },
    'page layout':               { path: 'PageLayouts/view', label: 'Page Layouts' },
    'layouts':                   { path: 'PageLayouts/view', label: 'Page Layouts' },
    'layout':                    { path: 'PageLayouts/view', label: 'Page Layouts' },
    'lightning record pages':    { path: 'LightningPages/view', label: 'Lightning Record Pages' },
    'lightning pages':           { path: 'LightningPages/view', label: 'Lightning Record Pages' },
    'record pages':              { path: 'LightningPages/view', label: 'Lightning Record Pages' },
    'buttons links and actions': { path: 'ButtonsLinksActions/view', label: 'Buttons, Links & Actions' },
    'buttons and links':         { path: 'ButtonsLinksActions/view', label: 'Buttons, Links & Actions' },
    'actions':                   { path: 'ButtonsLinksActions/view', label: 'Buttons, Links & Actions' },
    'quick actions':             { path: 'ButtonsLinksActions/view', label: 'Buttons, Links & Actions' },
    'compact layouts':           { path: 'CompactLayouts/view', label: 'Compact Layouts' },
    'compact layout':            { path: 'CompactLayouts/view', label: 'Compact Layouts' },
    'record types':              { path: 'RecordTypes/view', label: 'Record Types' },
    'record type':               { path: 'RecordTypes/view', label: 'Record Types' },
    'validation rules':          { path: 'ValidationRules/view', label: 'Validation Rules' },
    'validation rule':           { path: 'ValidationRules/view', label: 'Validation Rules' },
    'validations':               { path: 'ValidationRules/view', label: 'Validation Rules' },
    'triggers':                  { path: 'ApexTriggers/view', label: 'Triggers' },
    'trigger':                   { path: 'ApexTriggers/view', label: 'Triggers' },
    'apex triggers':             { path: 'ApexTriggers/view', label: 'Triggers' },
    'field sets':                { path: 'FieldSets/view', label: 'Field Sets' },
    'field set':                 { path: 'FieldSets/view', label: 'Field Sets' },
    'fieldsets':                 { path: 'FieldSets/view', label: 'Field Sets' },
    'search layouts':            { path: 'SearchLayouts/view', label: 'Search Layouts' },
    'search layout':             { path: 'SearchLayouts/view', label: 'Search Layouts' },
    'limits':                    { path: 'Limits/view', label: 'Limits' },
    'object limits':             { path: 'Limits/view', label: 'Limits' },
    'details':                   { path: 'Details/view', label: 'Details' },
    'detail':                    { path: 'Details/view', label: 'Details' },
    'object details':            { path: 'Details/view', label: 'Details' },
    'object manager':            { path: 'Details/view', label: 'Object Manager Details' },
    'new field':                 { path: 'FieldsAndRelationships/new', label: 'New Field' },
};

// Setup pages registry (spoken name -> { url, label })
const SETUP_PAGES = {
    // Administration
    'users':                     { url: '/lightning/setup/ManageUsers/home', label: 'Users' },
    'user management':           { url: '/lightning/setup/ManageUsers/home', label: 'Users' },
    'manage users':              { url: '/lightning/setup/ManageUsers/home', label: 'Users' },
    'profiles':                  { url: '/lightning/setup/EnhancedProfiles/home', label: 'Profiles' },
    'profile':                   { url: '/lightning/setup/EnhancedProfiles/home', label: 'Profiles' },
    'roles':                     { url: '/lightning/setup/Roles/home', label: 'Roles' },
    'role hierarchy':            { url: '/lightning/setup/Roles/home', label: 'Roles' },
    'permission sets':           { url: '/lightning/setup/PermSets/home', label: 'Permission Sets' },
    'permission set':            { url: '/lightning/setup/PermSets/home', label: 'Permission Sets' },
    'perms':                     { url: '/lightning/setup/PermSets/home', label: 'Permission Sets' },
    'perm sets':                 { url: '/lightning/setup/PermSets/home', label: 'Permission Sets' },
    'permission set groups':     { url: '/lightning/setup/PermSetGroups/home', label: 'Permission Set Groups' },
    'public groups':             { url: '/lightning/setup/PublicGroups/home', label: 'Public Groups' },
    'queues':                    { url: '/lightning/setup/Queues/home', label: 'Queues' },
    'login history':             { url: '/lightning/setup/OrgLoginHistory/home', label: 'Login History' },

    // Security
    'sharing settings':          { url: '/lightning/setup/SecuritySharing/home', label: 'Sharing Settings' },
    'sharing rules':             { url: '/lightning/setup/SecuritySharing/home', label: 'Sharing Settings' },
    'sharing':                   { url: '/lightning/setup/SecuritySharing/home', label: 'Sharing Settings' },
    'field level security':      { url: '/lightning/setup/FieldAccessibility/home', label: 'Field Accessibility' },
    'field accessibility':       { url: '/lightning/setup/FieldAccessibility/home', label: 'Field Accessibility' },
    'session settings':          { url: '/lightning/setup/SecuritySession/home', label: 'Session Settings' },
    'password policies':         { url: '/lightning/setup/SecurityPolicies/home', label: 'Password Policies' },
    'password policy':           { url: '/lightning/setup/SecurityPolicies/home', label: 'Password Policies' },
    'named credentials':         { url: '/lightning/setup/NamedCredential/home', label: 'Named Credentials' },
    'auth providers':            { url: '/lightning/setup/AuthProvidersPage/home', label: 'Auth. Providers' },
    'single sign on':            { url: '/lightning/setup/SingleSignOn/home', label: 'Single Sign-On' },
    'sso':                       { url: '/lightning/setup/SingleSignOn/home', label: 'Single Sign-On' },
    'connected apps':            { url: '/lightning/setup/ConnectedApplication/home', label: 'Connected Apps' },
    'cors':                      { url: '/lightning/setup/CorsWhitelistEntries/home', label: 'CORS' },
    'remote site settings':      { url: '/lightning/setup/SecurityRemoteProxy/home', label: 'Remote Site Settings' },

    // Email
    'email deliverability':      { url: '/lightning/setup/OrgEmailSettings/home', label: 'Email Deliverability' },
    'deliverability':            { url: '/lightning/setup/OrgEmailSettings/home', label: 'Email Deliverability' },
    'email templates':           { url: '/lightning/setup/LightningEmailTemplateSetup/home', label: 'Email Templates' },
    'email alerts':              { url: '/lightning/setup/WorkflowEmails/home', label: 'Email Alerts' },
    'org wide email':            { url: '/lightning/setup/OrgWideEmailAddresses/home', label: 'Organization-Wide Addresses' },

    // Data
    'data import':               { url: '/lightning/setup/DataManagementDataImporter/home', label: 'Data Import Wizard' },
    'data export':               { url: '/lightning/setup/DataManagementExport/home', label: 'Data Export' },
    'storage usage':             { url: '/lightning/setup/CompanyResourceDisk/home', label: 'Storage Usage' },
    'storage':                   { url: '/lightning/setup/CompanyResourceDisk/home', label: 'Storage Usage' },
    'duplicate rules':           { url: '/lightning/setup/DuplicateRules/home', label: 'Duplicate Rules' },
    'matching rules':            { url: '/lightning/setup/MatchingRules/home', label: 'Matching Rules' },
    'schema builder':            { url: '/lightning/setup/SchemaBuilder/home', label: 'Schema Builder' },

    // Automation
    'flows':                     { url: '/lightning/setup/Flows/home', label: 'Flows' },
    'flow':                      { url: '/lightning/setup/Flows/home', label: 'Flows' },
    'flow builder':              { url: '/lightning/setup/Flows/home', label: 'Flows' },
    'process automation':        { url: '/lightning/setup/ProcessAutomation/home', label: 'Process Automation' },
    'approval processes':        { url: '/lightning/setup/ApprovalProcesses/home', label: 'Approval Processes' },
    'approvals':                 { url: '/lightning/setup/ApprovalProcesses/home', label: 'Approval Processes' },
    'workflow rules':            { url: '/lightning/setup/WorkflowRules/home', label: 'Workflow Rules' },
    'workflow':                  { url: '/lightning/setup/WorkflowRules/home', label: 'Workflow Rules' },

    // Custom Code
    'apex classes':              { url: '/lightning/setup/ApexClasses/home', label: 'Apex Classes' },
    'apex class':                { url: '/lightning/setup/ApexClasses/home', label: 'Apex Classes' },
    'apex':                      { url: '/lightning/setup/ApexClasses/home', label: 'Apex Classes' },
    'apex triggers':             { url: '/lightning/setup/ApexTriggers/home', label: 'Apex Triggers' },
    'visualforce pages':         { url: '/lightning/setup/ApexPages/home', label: 'Visualforce Pages' },
    'visualforce':               { url: '/lightning/setup/ApexPages/home', label: 'Visualforce Pages' },
    'vf pages':                  { url: '/lightning/setup/ApexPages/home', label: 'Visualforce Pages' },
    'lightning components':      { url: '/lightning/setup/LightningComponentBundles/home', label: 'Lightning Components' },
    'lwc':                       { url: '/lightning/setup/LightningComponentBundles/home', label: 'Lightning Components' },
    'static resources':          { url: '/lightning/setup/StaticResources/home', label: 'Static Resources' },
    'custom metadata':           { url: '/lightning/setup/CustomMetadata/home', label: 'Custom Metadata Types' },
    'custom metadata types':     { url: '/lightning/setup/CustomMetadata/home', label: 'Custom Metadata Types' },
    'custom settings':           { url: '/lightning/setup/CustomSettings/home', label: 'Custom Settings' },
    'custom labels':             { url: '/lightning/setup/ExternalStrings/home', label: 'Custom Labels' },
    'custom permissions':        { url: '/lightning/setup/CustomPermissions/home', label: 'Custom Permissions' },
    'platform events':           { url: '/lightning/setup/EventObjects/home', label: 'Platform Events' },

    // Deploy
    'sandboxes':                 { url: '/lightning/setup/DataManagementCreateTestInstance/home', label: 'Sandboxes' },
    'sandbox':                   { url: '/lightning/setup/DataManagementCreateTestInstance/home', label: 'Sandboxes' },
    'deployment status':         { url: '/lightning/setup/DeployStatus/home', label: 'Deployment Status' },
    'deploy':                    { url: '/lightning/setup/DeployStatus/home', label: 'Deployment Status' },
    'outbound change sets':      { url: '/lightning/setup/OutboundChangeSet/home', label: 'Outbound Change Sets' },
    'change sets':               { url: '/lightning/setup/OutboundChangeSet/home', label: 'Outbound Change Sets' },
    'inbound change sets':       { url: '/lightning/setup/InboundChangeSet/home', label: 'Inbound Change Sets' },
    'installed packages':        { url: '/lightning/setup/ImportedPackage/home', label: 'Installed Packages' },
    'packages':                  { url: '/lightning/setup/ImportedPackage/home', label: 'Installed Packages' },

    // Company Settings
    'company information':       { url: '/lightning/setup/CompanyProfileInfo/home', label: 'Company Information' },
    'company info':              { url: '/lightning/setup/CompanyProfileInfo/home', label: 'Company Information' },
    'fiscal year':               { url: '/lightning/setup/ForecastFiscalYear/home', label: 'Fiscal Year' },
    'business hours':            { url: '/lightning/setup/BusinessHours/home', label: 'Business Hours' },
    'holidays':                  { url: '/lightning/setup/Holiday/home', label: 'Holidays' },

    // UI / App Settings
    'app manager':               { url: '/lightning/setup/NavigationMenus/home', label: 'App Manager' },
    'lightning app builder':     { url: '/lightning/setup/FlexiPageList/home', label: 'Lightning App Builder' },
    'app builder':               { url: '/lightning/setup/FlexiPageList/home', label: 'Lightning App Builder' },
    'tabs':                      { url: '/lightning/setup/CustomTabs/home', label: 'Tabs' },
    'custom tabs':               { url: '/lightning/setup/CustomTabs/home', label: 'Tabs' },
    'global actions':            { url: '/lightning/setup/GlobalActions/home', label: 'Global Actions' },
    'themes and branding':       { url: '/lightning/setup/ThemingAndBranding/home', label: 'Themes and Branding' },
    'themes':                    { url: '/lightning/setup/ThemingAndBranding/home', label: 'Themes and Branding' },

    // Monitoring
    'debug logs':                { url: '/lightning/setup/ApexDebugLogs/home', label: 'Debug Logs' },
    'debug log':                 { url: '/lightning/setup/ApexDebugLogs/home', label: 'Debug Logs' },
    'logs':                      { url: '/lightning/setup/ApexDebugLogs/home', label: 'Debug Logs' },
    'scheduled jobs':            { url: '/lightning/setup/ScheduledJobs/home', label: 'Scheduled Jobs' },
    'apex jobs':                 { url: '/lightning/setup/AsyncApexJobs/home', label: 'Apex Jobs' },
    'setup audit trail':         { url: '/lightning/setup/SecurityEvents/home', label: 'Setup Audit Trail' },
    'audit trail':               { url: '/lightning/setup/SecurityEvents/home', label: 'Setup Audit Trail' },

    // Core
    'object manager':            { url: '/lightning/setup/ObjectManager/home', label: 'Object Manager' },
    'setup':                     { url: '/lightning/setup/SetupOneHome/home', label: 'Setup Home' },
    'setup home':                { url: '/lightning/setup/SetupOneHome/home', label: 'Setup Home' },
};

export default class VoiceNavigator extends NavigationMixin(LightningElement) {
    @track lastTranscript = '';
    @track status = 'Ready';
    @track isListening = false;
    @track actionMessage = '';
    @track errorMessage = '';
    @track searchResults = [];
    @track isSearching = false;

    customObjects = {};
    speechSupported = true; // Assume supported until VF page says otherwise
    _messageHandler;

    // Build the VF page URL dynamically
    get vfPageUrl() {
        // Use relative URL to the VF page
        return '/apex/VoiceRecognitionPage';
    }

    // Wire custom objects from Apex
    @wire(getObjectApiNames)
    wiredObjects({ error, data }) {
        if (data) {
            this.customObjects = {};
            for (const [label, apiName] of Object.entries(data)) {
                this.customObjects[label.toLowerCase()] = apiName;
                this.customObjects[label.toLowerCase() + 's'] = apiName;
            }
        }
        if (error) {
            console.error('Error loading objects:', error);
        }
    }

    get micButtonClass() {
        return this.isListening
            ? 'slds-button slds-button_icon slds-button_icon-border-filled mic-button mic-active'
            : 'slds-button slds-button_icon slds-button_icon-border-filled mic-button';
    }

    get micIcon() {
        return this.isListening ? 'utility:stop' : 'utility:microphone';
    }

    get statusBadgeClass() {
        if (this.isListening) return 'slds-badge slds-badge_success';
        return 'slds-badge';
    }

    get hasSearchResults() {
        return this.searchResults && this.searchResults.length > 0;
    }

    get shortcutHint() {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        return isMac ? '\u2325 + Space to toggle voice' : 'Ctrl + Space to toggle voice';
    }

    connectedCallback() {
        // Listen for messages from the VF iframe
        this._messageHandler = this.handleVoiceMessage.bind(this);
        window.addEventListener('message', this._messageHandler);

        // Keyboard shortcut: Cmd+Space (Mac) or Ctrl+Space (Windows/Linux)
        this._keyHandler = this.handleKeyboardShortcut.bind(this);
        window.addEventListener('keydown', this._keyHandler);
    }

    handleKeyboardShortcut(event) {
        // Option+Space on Mac, Ctrl+Space on Windows/Linux
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isShortcut = isMac
            ? (event.code === 'Space' && event.altKey)
            : (event.code === 'Space' && event.ctrlKey);

        if (isShortcut) {
            event.preventDefault();
            event.stopPropagation();
            this.toggleListening();
        }
    }

    handleVoiceMessage(event) {
        if (!event.data || !event.data.type) return;

        const { type } = event.data;

        if (type === 'voiceSpeechSupport') {
            this.speechSupported = event.data.supported;
            if (!event.data.supported) {
                this.status = 'Speech not supported';
                this.errorMessage = 'Web Speech API is not supported in this browser. Please use Chrome.';
            }
        }

        if (type === 'voiceStatus') {
            if (event.data.status === 'listening') {
                this.status = 'Listening...';
                this.errorMessage = '';
            }
            if (event.data.status === 'ended') {
                this.isListening = false;
                if (this.status === 'Listening...') {
                    this.status = 'Ready';
                }
            }
        }

        if (type === 'voiceResult') {
            const transcript = event.data.transcript.toLowerCase().trim();
            const confidence = event.data.confidence;
            this.lastTranscript = `"${transcript}" (${Math.round(confidence * 100)}% confidence)`;
            this.parseAndNavigate(transcript);
        }

        if (type === 'voiceError') {
            const error = event.data.error;
            if (error === 'no-speech') {
                this.status = 'No speech detected';
                this.errorMessage = 'No speech was detected. Click the mic and try again.';
            } else if (error === 'not-allowed') {
                this.status = 'Mic blocked';
                this.errorMessage = 'Microphone access was denied. Please allow microphone permission in your browser settings.';
            } else {
                this.status = 'Error';
                this.errorMessage = `Speech error: ${error}`;
            }
            this.isListening = false;
        }
    }

    toggleListening() {
        if (!this.speechSupported) {
            this.errorMessage = 'Speech recognition is not supported. Use Google Chrome.';
            return;
        }

        this.actionMessage = '';
        this.errorMessage = '';

        const iframe = this.refs.voiceFrame;
        if (!iframe || !iframe.contentWindow) {
            this.errorMessage = 'Voice engine is loading. Please wait a moment and try again.';
            return;
        }

        if (this.isListening) {
            this.isListening = false;
            iframe.contentWindow.postMessage({ action: 'stop' }, '*');
            this.status = 'Ready';
        } else {
            this.isListening = true;
            iframe.contentWindow.postMessage({ action: 'start' }, '*');
        }
    }

    // ─── COMMAND PARSING ENGINE ─────────────────────────────────────────

    parseAndNavigate(transcript) {
        this.actionMessage = '';
        this.errorMessage = '';
        this.searchResults = [];

        const text = transcript
            .replace(/[.,!?]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (this.trySearchRecord(text)) return;
        if (this.tryCreateField(text)) return;
        if (this.tryObjectSubpage(text)) return;
        if (this.trySetupPage(text)) return;
        if (this.tryCreateRecord(text)) return;
        if (this.tryNavigateObject(text)) return;
        if (this.trySpecialPages(text)) return;

        this.errorMessage = `Command not recognized: "${transcript}". Say "help" or check the commands list below.`;
        this.status = 'Not recognized';
        this.speakFeedback('Command not recognized. Please try again.');
    }

    tryCreateField(text) {
        const patterns = [
            /(?:please\s+)?(?:create|add|make|build|insert)\s+(?:a\s+)?(?:new\s+)?field\s+(?:on|in|for|to)\s+(.+)/,
            /(?:new|add)\s+field\s+(?:on|in|for|to)\s+(.+)/,
            /(?:please\s+)?(?:go|navigate|open|take me|jump|head)\s+(?:to\s+)?(?:create|new|add)\s+field\s+(?:on|in|for)\s+(.+)/,
            /field\s+creation\s+(?:on|in|for)\s+(.+)/
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const objectName = this.resolveObject(match[1].trim());
                if (objectName) {
                    this.navigateToNewField(objectName);
                    return true;
                }
                this.errorMessage = `Object "${match[1].trim()}" not found. Try standard objects like Account, Contact, Opportunity.`;
                return true;
            }
        }
        return false;
    }

    tryObjectSubpage(text) {
        // Try to find a known subpage name in the text, then extract the object name
        const subpageKeys = Object.keys(OBJECT_SUBPAGES).sort((a, b) => b.length - a.length);

        let matchedSubpage = null;
        let remainder = null;

        // Pass 1: Exact substring match (longest key first)
        for (const key of subpageKeys) {
            const idx = text.indexOf(key);
            if (idx !== -1) {
                matchedSubpage = OBJECT_SUBPAGES[key];
                remainder = (text.substring(0, idx) + ' ' + text.substring(idx + key.length)).trim();
                break;
            }
        }

        // Pass 2: Fuzzy match multi-word phrases
        if (!matchedSubpage) {
            const words = text.split(' ');
            for (let len = Math.min(words.length, 4); len >= 1; len--) {
                for (let start = 0; start <= words.length - len; start++) {
                    const phrase = words.slice(start, start + len).join(' ');
                    const threshold = phrase.length <= 6 ? 1 : 2;
                    const fuzzyResult = findFuzzyMatchInRegistry(phrase, OBJECT_SUBPAGES, threshold);
                    if (fuzzyResult) {
                        matchedSubpage = fuzzyResult.entry;
                        remainder = words.slice(0, start).concat(words.slice(start + len)).join(' ');
                        break;
                    }
                }
                if (matchedSubpage) break;
            }
        }

        if (!matchedSubpage || !remainder) return false;

        // Clean up remainder to extract the object name
        let objectPortion = remainder
            .replace(/^(?:please\s+)?(?:go|navigate|open|show|view|see|list|take me|bring me|jump|switch|head|visit|pull up|check|access|get|display)\s*/i, '')
            .replace(/^(?:to|for|on|of|in|me)\s*/i, '')
            .replace(/\s+(?:for|on|of|in)\s*$/i, '')
            .replace(/^(?:the|a|an)\s*/i, '')
            .trim();

        if (!objectPortion) return false;

        const objectName = this.resolveObject(objectPortion);
        if (!objectName || objectName === '__report__' || objectName === '__dashboard__') return false;

        const url = `/lightning/setup/ObjectManager/${objectName}/${matchedSubpage.path}`;
        const message = `Opening ${objectName} ${matchedSubpage.label}...`;
        this.navigateToUrl(url, message);
        return true;
    }

    trySetupPage(text) {
        // Strip navigation verbs and prepositions (broad natural language support)
        let cleaned = text
            .replace(/^(?:please\s+)?(?:go|navigate|open|show|take me|bring me|jump|switch|head|visit|pull up|check|view|see|access|get|move|direct me|send me|redirect me|launch|load|display|i want|i need|let me see|can you open|can you show)\s+(?:to\s+|me\s+)?/i, '')
            .replace(/^(?:the|a|an)\s+/i, '')
            .trim();

        const candidates = [cleaned, text];

        // Pass 1: Exact match
        for (const candidate of candidates) {
            if (SETUP_PAGES[candidate]) {
                const page = SETUP_PAGES[candidate];
                this.navigateToUrl(page.url, `Opening ${page.label}...`);
                return true;
            }
        }

        // Pass 2: Substring match (longest key first)
        const setupKeys = Object.keys(SETUP_PAGES).sort((a, b) => b.length - a.length);
        for (const key of setupKeys) {
            if (cleaned.includes(key) || text.includes(key)) {
                const page = SETUP_PAGES[key];
                this.navigateToUrl(page.url, `Opening ${page.label}...`);
                return true;
            }
        }

        // Pass 3: Fuzzy match on full text
        for (const candidate of candidates) {
            const threshold = candidate.length <= 5 ? 1 :
                             candidate.length <= 10 ? 2 : 3;
            const fuzzyResult = findFuzzyMatchInRegistry(candidate, SETUP_PAGES, threshold);
            if (fuzzyResult) {
                this.navigateToUrl(fuzzyResult.entry.url, `Opening ${fuzzyResult.entry.label}...`);
                return true;
            }
        }

        // Pass 4: Fuzzy match multi-word slices
        const words = cleaned.split(' ');
        if (words.length >= 2) {
            for (let len = Math.min(words.length, 5); len >= 2; len--) {
                for (let start = 0; start <= words.length - len; start++) {
                    const phrase = words.slice(start, start + len).join(' ');
                    const threshold = phrase.length <= 8 ? 1 : 2;
                    const fuzzyResult = findFuzzyMatchInRegistry(phrase, SETUP_PAGES, threshold);
                    if (fuzzyResult) {
                        this.navigateToUrl(fuzzyResult.entry.url, `Opening ${fuzzyResult.entry.label}...`);
                        return true;
                    }
                }
            }
        }

        return false;
    }

    tryCreateRecord(text) {
        const patterns = [
            /(?:please\s+)?(?:create|add|make|build|start|open|insert)\s+(?:a\s+)?(?:new\s+)?(.+?)(?:\s+record)?$/,
            /(?:new)\s+(.+?)(?:\s+record)?$/
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const spoken = match[1].trim();
                if (spoken.includes('field')) continue;

                const objectName = this.resolveObject(spoken);
                if (objectName) {
                    if (objectName === '__report__' || objectName === '__dashboard__') continue;
                    this.navigateToNewRecord(objectName);
                    return true;
                }
            }
        }
        return false;
    }

    tryNavigateObject(text) {
        const patterns = [
            /(?:please\s+)?(?:go|navigate|open|show|take me|bring me|jump|switch|head|visit|pull up|check|view|see|access|get|move|launch|load|display)\s+(?:to\s+|me\s+)?(.+)/,
            /^(.+?)(?:\s+page|\s+home|\s+list)?$/
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const spoken = match[1].trim();
                const objectName = this.resolveObject(spoken);
                if (objectName) {
                    if (objectName === '__report__') {
                        this.navigateToUrl('/lightning/o/Report/home', 'Opening Reports...');
                        return true;
                    }
                    if (objectName === '__dashboard__') {
                        this.navigateToUrl('/lightning/o/Dashboard/home', 'Opening Dashboards...');
                        return true;
                    }
                    this.navigateToObjectHome(objectName);
                    return true;
                }
            }
        }
        return false;
    }

    trySpecialPages(text) {
        const specialPages = {
            'home': '/lightning/page/home',
            'chatter': '/lightning/page/chatter',
            'files': '/lightning/o/ContentDocument/home',
            'notes': '/lightning/o/Note/home',
            'calendar': '/lightning/o/Event/home'
        };

        for (const [keyword, url] of Object.entries(specialPages)) {
            if (text.includes(keyword)) {
                this.navigateToUrl(url, `Opening ${keyword}...`);
                return true;
            }
        }
        return false;
    }

    // ─── OBJECT RESOLUTION ──────────────────────────────────────────────

    resolveObject(spoken) {
        const normalized = spoken.toLowerCase().replace(/\s+/g, ' ').trim();

        // 1. Exact match in standard objects
        if (STANDARD_OBJECTS[normalized]) {
            return STANDARD_OBJECTS[normalized];
        }

        // 2. Exact match in custom objects
        if (this.customObjects[normalized]) {
            return this.customObjects[normalized];
        }

        // 3. Try stripping trailing 's' for plurals
        const singular = normalized.replace(/s$/, '');
        if (STANDARD_OBJECTS[singular]) {
            return STANDARD_OBJECTS[singular];
        }
        if (this.customObjects[singular]) {
            return this.customObjects[singular];
        }

        // 4. Fuzzy match — threshold scales with word length
        const fuzzyThreshold = normalized.length <= 4 ? 1 :
                               normalized.length <= 7 ? 2 : 3;

        const standardMatch = findFuzzyMatch(normalized, STANDARD_OBJECTS, fuzzyThreshold);
        if (standardMatch) {
            return standardMatch.apiName;
        }

        const customMatch = findFuzzyMatch(normalized, this.customObjects, fuzzyThreshold);
        if (customMatch) {
            return customMatch.apiName;
        }

        // 5. Fuzzy match with singular form
        if (singular !== normalized) {
            const singularStdMatch = findFuzzyMatch(singular, STANDARD_OBJECTS, fuzzyThreshold);
            if (singularStdMatch) {
                return singularStdMatch.apiName;
            }
            const singularCustMatch = findFuzzyMatch(singular, this.customObjects, fuzzyThreshold);
            if (singularCustMatch) {
                return singularCustMatch.apiName;
            }
        }

        // 6. Last resort: construct custom object API name
        const customApiName = normalized.replace(/\s/g, '_') + '__c';
        if (normalized.length > 1 && !normalized.includes('field') && !normalized.includes('setup')) {
            return customApiName.charAt(0).toUpperCase() + customApiName.slice(1);
        }

        return null;
    }

    // ─── NAVIGATION METHODS ─────────────────────────────────────────────

    // ─── RECORD SEARCH ────────────────────────────────────────────────

    trySearchRecord(text) {
        const objectScopedPattern = /(?:find|search|look\s+up|look\s+for|locate|fetch|get me|pull up)\s+(\w+)\s+(.+)/;
        const generalPattern = /(?:find|search|look\s+up|look\s+for|locate|fetch|get me|pull up)\s+(.+)/;

        // Pattern 1: "find account Acme" / "search contact John"
        const objectScopedMatch = text.match(objectScopedPattern);
        if (objectScopedMatch) {
            const possibleObject = objectScopedMatch[1].trim();
            const searchTerm = objectScopedMatch[2].trim();
            const objectApiName = this.resolveObject(possibleObject);

            if (objectApiName && objectApiName !== '__report__' && objectApiName !== '__dashboard__'
                && !objectApiName.endsWith('__c')) {
                this.executeSearch(objectApiName, searchTerm);
                return true;
            }
        }

        // Pattern 2: "find Acme" / "search John Smith" (cross-object)
        const generalMatch = text.match(generalPattern);
        if (generalMatch) {
            const searchTerm = generalMatch[1].trim();
            if (searchTerm.length >= 2) {
                this.executeSearch(null, searchTerm);
                return true;
            }
        }

        return false;
    }

    async executeSearch(objectApiName, searchTerm) {
        this.isSearching = true;
        this.actionMessage = objectApiName
            ? `Searching ${objectApiName} for "${searchTerm}"...`
            : `Searching for "${searchTerm}"...`;
        this.status = 'Searching';

        try {
            const results = await searchRecords({
                objectApiName: objectApiName,
                searchTerm: searchTerm
            });

            if (results && results.length > 0) {
                this.searchResults = results;
                this.actionMessage = `Found ${results.length} result${results.length > 1 ? 's' : ''}.`;
                this.speakFeedback(`Found ${results.length} result${results.length > 1 ? 's' : ''} for ${searchTerm}.`);
            } else {
                this.searchResults = [];
                this.actionMessage = `No records found for "${searchTerm}".`;
                this.speakFeedback(`No records found for ${searchTerm}.`);
            }
        } catch (error) {
            this.errorMessage = 'Search failed: ' + (error.body ? error.body.message : error.message);
            this.searchResults = [];
        } finally {
            this.isSearching = false;
            this.status = 'Ready';
        }
    }

    handleSearchResultClick(event) {
        const recordId = event.currentTarget.dataset.recordId;
        if (recordId) {
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: recordId,
                    actionName: 'view'
                }
            });
            this.searchResults = [];
            this.speakFeedback('Opening record.');
        }
    }

    // ─── VOICE FEEDBACK ─────────────────────────────────────────────────

    speakFeedback(text) {
        const iframe = this.refs.voiceFrame;
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ action: 'speak', text: text }, '*');
        }
    }

    navigateToNewField(objectApiName) {
        const url = `/lightning/setup/ObjectManager/${objectApiName}/FieldsAndRelationships/new`;
        this.actionMessage = `Navigating to create new field on ${objectApiName}...`;
        this.status = 'Navigating';
        this.speakFeedback(`Creating new field on ${objectApiName}.`);
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: url
            }
        });
    }

    navigateToNewRecord(objectApiName) {
        this.actionMessage = `Creating new ${objectApiName} record...`;
        this.status = 'Navigating';
        this.speakFeedback(`Creating new ${objectApiName} record.`);
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: objectApiName,
                actionName: 'new'
            }
        });
    }

    navigateToObjectHome(objectApiName) {
        this.actionMessage = `Opening ${objectApiName}...`;
        this.status = 'Navigating';
        this.speakFeedback(`Opening ${objectApiName}.`);
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: objectApiName,
                actionName: 'home'
            }
        });
    }

    navigateToUrl(url, message) {
        this.actionMessage = message;
        this.status = 'Navigating';
        this.speakFeedback(message);
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: url
            }
        });
    }

    disconnectedCallback() {
        if (this._messageHandler) {
            window.removeEventListener('message', this._messageHandler);
        }
        if (this._keyHandler) {
            window.removeEventListener('keydown', this._keyHandler);
        }
    }
}
