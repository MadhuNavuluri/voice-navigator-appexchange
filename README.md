Concern 1: "Does this package send data outside Salesforce?"                                                                
                                                                                                                              
  No. Voice Navigator makes zero external API calls. There are no Remote Site Settings, no Named Credentials, no callouts. All
   processing happens inside the Salesforce org and the user's browser. Speech recognition is handled by the browser's
  built-in Web Speech API — audio is processed by Google Chrome, not by our code.

  Concern 2: "Does it modify or delete our data?"

  No. The Apex controller is 100% read-only. There are zero DML operations (no insert, update, delete, upsert). It only reads
  object metadata and searches records via SOSL. The controller uses with sharing, meaning it respects the user's record
  access and sharing rules.

  Concern 3: "Can it access data beyond the user's permissions?"

  No. The Apex class enforces:
  - with sharing — respects org sharing rules and record-level access
  - Field-Level Security (FLS) — getObjectFields() checks isAccessible() before returning fields
  - Object-level permissions — getGlobalDescribe() only returns objects the user can access

  Concern 4: "Does it require API keys, tokens, or stored credentials?"

  No. Zero secrets, zero stored credentials, zero configuration. It works purely with the logged-in user's session.

  Concern 5: "What about microphone access?"

  The microphone permission is browser-level, not Salesforce-level. Chrome asks the user directly — the package cannot
  silently enable the microphone. Users can revoke access anytime from browser settings.

  Concern 6: "Is it an unlocked package — can you see our data?"

  No. Unlocked packages run inside the customer's org. The package publisher has zero access to the installing org. There is
  no phone-home, no telemetry, no analytics.

  Concern 7: "Has it passed Salesforce security review?"

  This is the one real gap. The package has not gone through the Salesforce AppExchange Security Review. If customers require
  AppExchange-listed packages, you would need to:
  1. Convert to a managed package
  2. Submit for Salesforce Security Review (includes automated code scanning + manual review)
  3. List on AppExchange
