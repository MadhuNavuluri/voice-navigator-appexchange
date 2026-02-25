/**
 * Server-side controller for the Voice Navigator component.
 * Provides object metadata discovery and record search capabilities
 * used by the voice command engine in the LWC front end.
 *
 * @author  Madhu Navuluri
 * @since   2024
 */
public with sharing class VoiceNavigatorController {

    private static final String REPORT_PLACEHOLDER = '__report__';
    private static final String DASHBOARD_PLACEHOLDER = '__dashboard__';
    private static final String CASE_NUMBER_FIELD = 'CaseNumber';
    private static final String NAME_FIELD = 'Name';
    private static final Integer SEARCH_LIMIT = 10;
    private static final Integer MIN_SEARCH_LENGTH = 2;

    /**
     * Returns a mapping of custom object labels (singular and plural) to API names.
     * Only includes objects that the running user can access and that support search.
     *
     * @return label-to-API-name map for all accessible custom objects
     */
    @AuraEnabled(cacheable=true)
    public static Map<String, String> getObjectApiNames() {
        Map<String, String> objectMap = new Map<String, String>();
        Map<String, Schema.SObjectType> globalDescribe = Schema.getGlobalDescribe();

        for (String apiName : globalDescribe.keySet()) {
            Schema.DescribeSObjectResult descResult = globalDescribe.get(apiName).getDescribe();

            if (descResult.isCustom()
                    && descResult.isAccessible()
                    && descResult.isSearchable()
                    && !descResult.isCustomSetting()) {

                String label = descResult.getLabel();
                objectMap.put(label, descResult.getName());

                String pluralLabel = descResult.getLabelPlural();
                if (String.isNotBlank(pluralLabel) && !pluralLabel.equals(label)) {
                    objectMap.put(pluralLabel, descResult.getName());
                }
            }
        }

        return objectMap;
    }

    /**
     * Returns field metadata for the specified object.
     * Respects field-level security — only accessible fields are returned.
     *
     * @param objectApiName the API name of the target sObject
     * @return list of field descriptors (apiName, label, type, isCustom)
     */
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getObjectFields(String objectApiName) {
        List<Map<String, String>> fieldList = new List<Map<String, String>>();

        Schema.SObjectType sObjType = Schema.getGlobalDescribe().get(objectApiName);
        if (sObjType == null) {
            return fieldList;
        }

        Map<String, Schema.SObjectField> fieldsMap = sObjType.getDescribe().fields.getMap();
        for (String fieldName : fieldsMap.keySet()) {
            Schema.DescribeFieldResult fieldDesc = fieldsMap.get(fieldName).getDescribe();

            if (fieldDesc.isAccessible()) {
                Map<String, String> fieldInfo = new Map<String, String>{
                    'apiName' => fieldDesc.getName(),
                    'label'   => fieldDesc.getLabel(),
                    'type'    => String.valueOf(fieldDesc.getType()),
                    'isCustom' => String.valueOf(fieldDesc.isCustom())
                };
                fieldList.add(fieldInfo);
            }
        }

        return fieldList;
    }

    /**
     * Searches records by name using SOSL. Supports both single-object
     * and cross-object (Account, Contact, Opportunity, Lead, Case) searches.
     * Runs in USER_MODE to enforce CRUD and field-level security.
     *
     * @param objectApiName the object to search within, or null/blank for cross-object
     * @param searchTerm    the user's search query (minimum 2 characters)
     * @return list of record summaries containing id, name, objectType, and objectApiName
     */
    @AuraEnabled
    public static List<Map<String, String>> searchRecords(String objectApiName, String searchTerm) {
        List<Map<String, String>> results = new List<Map<String, String>>();

        if (String.isBlank(searchTerm) || searchTerm.trim().length() < MIN_SEARCH_LENGTH) {
            return results;
        }

        String sanitized = String.escapeSingleQuotes(searchTerm.trim());
        sanitized = sanitized.replaceAll('[\\*\\?\\&\\|\\!\\{\\}\\[\\]\\(\\)\\^\\~\\:\\\\"\']', '');

        if (String.isBlank(sanitized) || sanitized.length() < MIN_SEARCH_LENGTH) {
            return results;
        }

        String searchQuery = buildSearchQuery(objectApiName, sanitized);

        try {
            List<List<SObject>> searchResults = Search.query(searchQuery, AccessLevel.USER_MODE);

            for (List<SObject> objList : searchResults) {
                for (SObject record : objList) {
                    results.add(buildResultItem(record));
                }
            }
        } catch (Exception e) {
            // Swallow search exceptions gracefully; the caller handles empty results
        }

        return results;
    }

    /**
     * Builds the SOSL query string based on whether the search is object-scoped
     * or cross-object. Report/Dashboard placeholders fall through to cross-object.
     */
    private static String buildSearchQuery(String objectApiName, String sanitizedTerm) {
        if (String.isNotBlank(objectApiName)
                && objectApiName != REPORT_PLACEHOLDER
                && objectApiName != DASHBOARD_PLACEHOLDER) {

            Schema.SObjectType targetType = Schema.getGlobalDescribe().get(objectApiName);
            if (targetType == null || !targetType.getDescribe().isAccessible()) {
                return buildCrossObjectQuery(sanitizedTerm);
            }

            return 'FIND \'' + sanitizedTerm + '*\' IN NAME FIELDS RETURNING '
                    + String.escapeSingleQuotes(objectApiName) + '(Id, Name) LIMIT ' + SEARCH_LIMIT;
        }

        return buildCrossObjectQuery(sanitizedTerm);
    }

    private static String buildCrossObjectQuery(String sanitizedTerm) {
        return 'FIND \'' + sanitizedTerm + '*\' IN NAME FIELDS RETURNING '
                + 'Account(Id, Name), Contact(Id, Name), Opportunity(Id, Name), '
                + 'Lead(Id, Name), Case(Id, CaseNumber) LIMIT ' + SEARCH_LIMIT;
    }

    /**
     * Extracts a display-friendly result map from a single SObject record.
     * Prefers the Name field; falls back to CaseNumber, then Id.
     */
    private static Map<String, String> buildResultItem(SObject record) {
        Map<String, Object> populatedFields = record.getPopulatedFieldsAsMap();

        String displayName;
        if (populatedFields.containsKey(NAME_FIELD) && populatedFields.get(NAME_FIELD) != null) {
            displayName = (String) populatedFields.get(NAME_FIELD);
        } else if (populatedFields.containsKey(CASE_NUMBER_FIELD) && populatedFields.get(CASE_NUMBER_FIELD) != null) {
            displayName = (String) populatedFields.get(CASE_NUMBER_FIELD);
        } else {
            displayName = (String) record.get('Id');
        }

        return new Map<String, String>{
            'id'            => (String) record.get('Id'),
            'name'          => displayName,
            'objectType'    => record.getSObjectType().getDescribe().getLabel(),
            'objectApiName' => record.getSObjectType().getDescribe().getName()
        };
    }
}
