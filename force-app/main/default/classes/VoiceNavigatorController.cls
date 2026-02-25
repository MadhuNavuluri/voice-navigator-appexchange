public with sharing class VoiceNavigatorController {
    
    /**
     * Returns a map of custom object labels to their API names
     * This allows the Voice Navigator to support custom objects dynamically
     */
    @AuraEnabled(cacheable=true)
    public static Map<String, String> getObjectApiNames() {
        Map<String, String> objectMap = new Map<String, String>();
        
        // Get all sObject types
        Map<String, Schema.SObjectType> globalDescribe = Schema.getGlobalDescribe();
        
        for (String apiName : globalDescribe.keySet()) {
            Schema.SObjectType sObjType = globalDescribe.get(apiName);
            Schema.DescribeSObjectResult descResult = sObjType.getDescribe();
            
            // Only include custom objects that are accessible and searchable
            if (descResult.isCustom() && 
                descResult.isAccessible() && 
                descResult.isSearchable() &&
                !descResult.isCustomSetting()) {
                
                String label = descResult.getLabel();
                String objApiName = descResult.getName();
                
                objectMap.put(label, objApiName);
                
                // Also add the plural label
                String pluralLabel = descResult.getLabelPlural();
                if (String.isNotBlank(pluralLabel) && !pluralLabel.equals(label)) {
                    objectMap.put(pluralLabel, objApiName);
                }
            }
        }
        
        return objectMap;
    }
    
    /**
     * Returns field information for a given object
     * Can be used for future voice commands like "what fields does account have"
     */
    @AuraEnabled(cacheable=true)
    public static List<Map<String, String>> getObjectFields(String objectApiName) {
        List<Map<String, String>> fieldList = new List<Map<String, String>>();
        
        try {
            Schema.SObjectType sObjType = Schema.getGlobalDescribe().get(objectApiName);
            if (sObjType == null) {
                return fieldList;
            }
            
            Map<String, Schema.SObjectField> fieldsMap = sObjType.getDescribe().fields.getMap();
            
            for (String fieldName : fieldsMap.keySet()) {
                Schema.DescribeFieldResult fieldDesc = fieldsMap.get(fieldName).getDescribe();
                
                if (fieldDesc.isAccessible()) {
                    Map<String, String> fieldInfo = new Map<String, String>();
                    fieldInfo.put('apiName', fieldDesc.getName());
                    fieldInfo.put('label', fieldDesc.getLabel());
                    fieldInfo.put('type', String.valueOf(fieldDesc.getType()));
                    fieldInfo.put('isCustom', String.valueOf(fieldDesc.isCustom()));
                    fieldList.add(fieldInfo);
                }
            }
        } catch (Exception e) {
            // Field describe failed — return empty list
        }

        return fieldList;
    }

    /**
     * Searches for records using SOSL
     * Returns a list of record summaries (Id, Name, object type)
     */
    @AuraEnabled
    public static List<Map<String, String>> searchRecords(String objectApiName, String searchTerm) {
        List<Map<String, String>> results = new List<Map<String, String>>();

        if (String.isBlank(searchTerm) || searchTerm.trim().length() < 2) {
            return results;
        }

        // Sanitize input
        String sanitized = String.escapeSingleQuotes(searchTerm.trim());
        sanitized = sanitized.replaceAll('[\\*\\?\\&\\|\\!\\{\\}\\[\\]\\(\\)\\^\\~\\:\\\\"\']', '');

        if (String.isBlank(sanitized) || sanitized.length() < 2) {
            return results;
        }

        // Some objects use a different name field
        Map<String, String> nameFieldMap = new Map<String, String>{
            'Case' => 'CaseNumber',
            'Task' => 'Subject',
            'Order' => 'OrderNumber',
            'Contract' => 'ContractNumber'
        };

        String searchQuery;
        if (String.isNotBlank(objectApiName) && objectApiName != '__report__' && objectApiName != '__dashboard__') {
            String nameField = nameFieldMap.containsKey(objectApiName) ? nameFieldMap.get(objectApiName) : 'Name';
            searchQuery = 'FIND \'' + sanitized + '*\' IN NAME FIELDS RETURNING '
                        + String.escapeSingleQuotes(objectApiName) + '(Id, ' + nameField + ') LIMIT 10';
        } else {
            searchQuery = 'FIND \'' + sanitized + '*\' IN NAME FIELDS RETURNING '
                        + 'Account(Id, Name), Contact(Id, Name), Opportunity(Id, Name), '
                        + 'Lead(Id, Name), Case(Id, CaseNumber), '
                        + 'Campaign(Id, Name), Task(Id, Subject), User(Id, Name), '
                        + 'Order(Id, OrderNumber), Contract(Id, ContractNumber), '
                        + 'Asset(Id, Name) LIMIT 20';
        }

        try {
            List<List<SObject>> searchResults = Search.query(searchQuery, AccessLevel.USER_MODE);
            for (List<SObject> objList : searchResults) {
                for (SObject record : objList) {
                    Map<String, String> item = new Map<String, String>();
                    item.put('id', (String) record.get('Id'));

                    // Determine the display field based on object type
                    String objectType = record.getSObjectType().getDescribe().getName();
                    Map<String, String> displayFieldMap = new Map<String, String>{
                        'Case' => 'CaseNumber',
                        'Task' => 'Subject',
                        'Order' => 'OrderNumber',
                        'Contract' => 'ContractNumber'
                    };
                    String displayField = displayFieldMap.containsKey(objectType)
                        ? displayFieldMap.get(objectType)
                        : 'Name';

                    String displayName;
                    try {
                        displayName = String.valueOf(record.get(displayField));
                    } catch (Exception ex) {
                        displayName = (String) record.get('Id');
                    }
                    if (String.isBlank(displayName)) {
                        displayName = (String) record.get('Id');
                    }
                    item.put('name', displayName);
                    item.put('objectType', record.getSObjectType().getDescribe().getLabel());
                    item.put('objectApiName', record.getSObjectType().getDescribe().getName());
                    results.add(item);
                }
            }
        } catch (Exception e) {
            // Search failed — return empty results
        }

        return results;
    }
}
