@isTest
private class VoiceNavigatorControllerTest {
    
    @isTest
    static void testGetObjectApiNames() {
        Test.startTest();
        Map<String, String> objectMap = VoiceNavigatorController.getObjectApiNames();
        Test.stopTest();
        
        // The map should not be null
        System.assertNotEquals(null, objectMap, 'Object map should not be null');
        
        // If there are custom objects in the org, verify they have proper API names
        for (String label : objectMap.keySet()) {
            String apiName = objectMap.get(label);
            System.assert(String.isNotBlank(apiName), 'API name should not be blank for label: ' + label);
            // Custom objects should end with __c
            System.assert(apiName.endsWith('__c'), 'Custom object API name should end with __c: ' + apiName);
        }
    }
    
    @isTest
    static void testGetObjectFieldsAccount() {
        Test.startTest();
        List<Map<String, String>> fields = VoiceNavigatorController.getObjectFields('Account');
        Test.stopTest();
        
        // Account should have fields
        System.assert(fields.size() > 0, 'Account should have accessible fields');
        
        // Verify field structure
        Map<String, String> firstField = fields[0];
        System.assert(firstField.containsKey('apiName'), 'Field should have apiName');
        System.assert(firstField.containsKey('label'), 'Field should have label');
        System.assert(firstField.containsKey('type'), 'Field should have type');
        System.assert(firstField.containsKey('isCustom'), 'Field should have isCustom');
    }
    
    @isTest
    static void testGetObjectFieldsInvalidObject() {
        Test.startTest();
        List<Map<String, String>> fields = VoiceNavigatorController.getObjectFields('InvalidObject__xyz');
        Test.stopTest();
        
        // Should return empty list for invalid object
        System.assertEquals(0, fields.size(), 'Invalid object should return empty field list');
    }
    
    @isTest
    static void testGetObjectFieldsNullInput() {
        Test.startTest();
        List<Map<String, String>> fields = VoiceNavigatorController.getObjectFields(null);
        Test.stopTest();

        System.assertEquals(0, fields.size(), 'Null input should return empty field list');
    }

    @isTest
    static void testSearchRecordsWithObject() {
        Account testAcc = new Account(Name = 'Acme Test Corp');
        insert testAcc;

        Test.startTest();
        Test.setFixedSearchResults(new List<Id>{ testAcc.Id });
        List<Map<String, String>> results = VoiceNavigatorController.searchRecords('Account', 'Acme');
        Test.stopTest();

        System.assert(results.size() > 0, 'Should find the test account');
        System.assertEquals(testAcc.Id, results[0].get('id'));
        System.assertEquals('Acme Test Corp', results[0].get('name'));
    }

    @isTest
    static void testSearchRecordsGeneral() {
        Account testAcc = new Account(Name = 'Global Industries');
        insert testAcc;

        Test.startTest();
        Test.setFixedSearchResults(new List<Id>{ testAcc.Id });
        List<Map<String, String>> results = VoiceNavigatorController.searchRecords(null, 'Global');
        Test.stopTest();

        System.assert(results.size() > 0, 'Should find records across objects');
    }

    @isTest
    static void testSearchRecordsEmptyTerm() {
        Test.startTest();
        List<Map<String, String>> results = VoiceNavigatorController.searchRecords('Account', '');
        Test.stopTest();

        System.assertEquals(0, results.size(), 'Empty search should return no results');
    }

    @isTest
    static void testSearchRecordsShortTerm() {
        Test.startTest();
        List<Map<String, String>> results = VoiceNavigatorController.searchRecords('Account', 'A');
        Test.stopTest();

        System.assertEquals(0, results.size(), 'Single char search should return no results');
    }

    @isTest
    static void testSearchRecordsSanitization() {
        Test.startTest();
        List<Map<String, String>> results = VoiceNavigatorController.searchRecords('Account', 'test*?&|');
        Test.stopTest();

        System.assertNotEquals(null, results, 'Should return a list even with special chars');
    }
}
