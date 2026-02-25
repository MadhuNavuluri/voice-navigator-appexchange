/**
 * Test coverage for VoiceNavigatorController.
 * Validates object discovery, field metadata retrieval,
 * and SOSL-based record search across standard and custom objects.
 *
 * @author  Madhu Navuluri
 * @since   2024
 */
@isTest
private class VoiceNavigatorControllerTest {

    @TestSetup
    static void setupTestData() {
        insert new Account(Name = 'Acme Test Corp');
        insert new Account(Name = 'Global Industries');
        insert new Case(Subject = 'Voice Nav Test Case');
    }

    @isTest
    static void testGetObjectApiNames() {
        Test.startTest();
        Map<String, String> objectMap = VoiceNavigatorController.getObjectApiNames();
        Test.stopTest();

        Assert.isNotNull(objectMap, 'Object map should not be null');
        for (String label : objectMap.keySet()) {
            String apiName = objectMap.get(label);
            Assert.isTrue(String.isNotBlank(apiName), 'API name should not be blank for: ' + label);
            Assert.isTrue(apiName.endsWith('__c'), 'Custom object should end with __c: ' + apiName);
        }
    }

    @isTest
    static void testGetObjectFieldsAccount() {
        Test.startTest();
        List<Map<String, String>> fields = VoiceNavigatorController.getObjectFields('Account');
        Test.stopTest();

        Assert.isTrue(fields.size() > 0, 'Account should have accessible fields');
        Map<String, String> firstField = fields[0];
        Assert.isTrue(firstField.containsKey('apiName'), 'Field should contain apiName');
        Assert.isTrue(firstField.containsKey('label'), 'Field should contain label');
        Assert.isTrue(firstField.containsKey('type'), 'Field should contain type');
        Assert.isTrue(firstField.containsKey('isCustom'), 'Field should contain isCustom');
    }

    @isTest
    static void testGetObjectFieldsInvalidObject() {
        Test.startTest();
        List<Map<String, String>> fields = VoiceNavigatorController.getObjectFields('InvalidObject__xyz');
        Test.stopTest();

        Assert.areEqual(0, fields.size(), 'Invalid object should return empty list');
    }

    @isTest
    static void testGetObjectFieldsNullInput() {
        Test.startTest();
        List<Map<String, String>> fields = VoiceNavigatorController.getObjectFields(null);
        Test.stopTest();

        Assert.areEqual(0, fields.size(), 'Null input should return empty list');
    }

    @isTest
    static void testSearchRecordsWithObject() {
        Account testAcc = [SELECT Id FROM Account WHERE Name = 'Acme Test Corp' LIMIT 1];

        Test.startTest();
        Test.setFixedSearchResults(new List<Id>{ testAcc.Id });
        List<Map<String, String>> results = VoiceNavigatorController.searchRecords('Account', 'Acme');
        Test.stopTest();

        Assert.isTrue(results.size() > 0, 'Should find the test account');
        Assert.areEqual(testAcc.Id, results[0].get('id'), 'Record Id should match');
        Assert.areEqual('Acme Test Corp', results[0].get('name'), 'Name should match');
    }

    @isTest
    static void testSearchRecordsCrossObject() {
        Account testAcc = [SELECT Id FROM Account WHERE Name = 'Global Industries' LIMIT 1];

        Test.startTest();
        Test.setFixedSearchResults(new List<Id>{ testAcc.Id });
        List<Map<String, String>> results = VoiceNavigatorController.searchRecords(null, 'Global');
        Test.stopTest();

        Assert.isTrue(results.size() > 0, 'Cross-object search should find records');
    }

    @isTest
    static void testSearchRecordsEmptyTerm() {
        Test.startTest();
        List<Map<String, String>> results = VoiceNavigatorController.searchRecords('Account', '');
        Test.stopTest();

        Assert.areEqual(0, results.size(), 'Empty term should return no results');
    }

    @isTest
    static void testSearchRecordsShortTerm() {
        Test.startTest();
        List<Map<String, String>> results = VoiceNavigatorController.searchRecords('Account', 'A');
        Test.stopTest();

        Assert.areEqual(0, results.size(), 'Single-char term should return no results');
    }

    @isTest
    static void testSearchRecordsSanitization() {
        Test.startTest();
        List<Map<String, String>> results = VoiceNavigatorController.searchRecords('Account', 'test*?&|');
        Test.stopTest();

        Assert.isNotNull(results, 'Should handle special characters gracefully');
    }

    @isTest
    static void testSearchRecordsSanitizationAllSpecialChars() {
        Test.startTest();
        List<Map<String, String>> results = VoiceNavigatorController.searchRecords('Account', '*?&|');
        Test.stopTest();

        Assert.areEqual(0, results.size(), 'All-special-char term should return no results');
    }

    @isTest
    static void testSearchRecordsReportDashboardBypass() {
        Account testAcc = [SELECT Id FROM Account WHERE Name = 'Acme Test Corp' LIMIT 1];

        Test.startTest();
        Test.setFixedSearchResults(new List<Id>{ testAcc.Id });
        List<Map<String, String>> reportResults = VoiceNavigatorController.searchRecords('__report__', 'Acme');
        List<Map<String, String>> dashResults = VoiceNavigatorController.searchRecords('__dashboard__', 'Acme');
        Test.stopTest();

        Assert.isNotNull(reportResults, 'Report placeholder should fall through to cross-object');
        Assert.isNotNull(dashResults, 'Dashboard placeholder should fall through to cross-object');
    }

    @isTest
    static void testSearchRecordsWithCase() {
        Case testCase = [SELECT Id FROM Case WHERE Subject = 'Voice Nav Test Case' LIMIT 1];

        Test.startTest();
        Test.setFixedSearchResults(new List<Id>{ testCase.Id });
        List<Map<String, String>> results = VoiceNavigatorController.searchRecords(null, 'Voice');
        Test.stopTest();

        Assert.isNotNull(results, 'Should return results for Case search');
        if (results.size() > 0) {
            Assert.isTrue(String.isNotBlank(results[0].get('name')), 'Case should have a display name');
        }
    }

    @isTest
    static void testSearchRecordsBlankObjectApiName() {
        Account testAcc = [SELECT Id FROM Account WHERE Name = 'Acme Test Corp' LIMIT 1];

        Test.startTest();
        Test.setFixedSearchResults(new List<Id>{ testAcc.Id });
        List<Map<String, String>> results = VoiceNavigatorController.searchRecords('', 'Acme');
        Test.stopTest();

        Assert.isNotNull(results, 'Blank objectApiName should default to cross-object search');
    }

    @isTest
    static void testSearchRecordsInaccessibleObject() {
        Test.startTest();
        List<Map<String, String>> results = VoiceNavigatorController.searchRecords('NonExistentObj__c', 'test');
        Test.stopTest();

        Assert.isNotNull(results, 'Inaccessible object should not throw an exception');
    }
}
