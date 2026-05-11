# **Revcloud Blueprint: Configurator Regression Testing**

## **Solution & Technical Design Document (v2.0)**

**Last Updated:** October 20, 2025

**Status:** PoC Complete - Ready for Implementation

### **1.0 Executive Summary**

#### **1.1 Project Goal**

This document outlines the technical design for a new, distinct testing module within the **Revcloud Blueprint** VS Code extension. This module will provide a comprehensive, automated regression testing suite for the **Salesforce Revenue Cloud Product Configurator**.

Drawing from the successful patterns established in the Pricing Test Suite, this new functionality will operate independently, enabling focused testing of product structures, attributes, and configuration rules (e.g., inclusion, exclusion, validation, and quantity constraints). It will leverage the existing hierarchical UI, multi-org authentication, and reporting framework, while introducing its own snapshot format and API-driven execution engine.

#### **1.2 Core Functionality**

The Configurator Regression Testing module will enable developers and QA experts to:

1. **Capture Configuration Snapshots:** Programmatically capture the complete non-price state of a correctly configured quote (especially complex bundles) and save it as a "golden" JSON snapshot.  
2. **Define Negative Tests:** Define invalid configuration scenarios (e.g., rule violations) as "negative" snapshots by specifying a valid base state, an invalid delta modification, and the expected error messages.  
3. **Execute Automated Tests:** Run one or more snapshots against a target Salesforce org using the Product Configurator's Business APIs to programmatically recreate the configuration.  
4. **Validate and Report:** Perform a deep comparison between the result in the target org and the snapshot's expected state. The tool will then generate a detailed HTML report highlighting any discrepancies, unexpected errors, or missing validation messages, consistent with the existing reporting UI.

### **2.0 Architectural Integration**

The new module will be seamlessly integrated into the existing Rev Cloud Blueprint architecture.

Rev Cloud Blueprint Extension  
├── Core Testing Engine  
│   ├── Pricing Test Suite (Existing)  
│   │   ├── Snapshot Creation  
│   │   ├── Test Execution (Place Sales Transaction API)  
│   │   └── Result Comparison  
│   └── 🔶 Configurator Test Suite (New)  
│       ├── 🔶 Snapshot Creation  
│       ├── 🔶 Test Execution (Configurator Business APIs)  
│       └── 🔶 Result Comparison  
├── Monetization Layer (Shared)  
├── User Interface (Shared)  
│   ├── Hierarchical Tree View  
│   └── Report View (Webview)  
└── Salesforce Services (Shared)  
    ├── Auth Service  
    └── API Service

* **UI Integration:** A new top-level folder, "📁 Configurator", will appear in the Hierarchical Tree View, parallel to "📁 Pricing". All existing UI patterns (creating snapshots/groups, running tests, context menus) will be reused.  
* **Shared Services:** The existing multi-org authentication (src/salesforce/auth.ts), monetization (src/services/licenseService.ts), and reporting framework (src/ui/reportView.ts) will be fully utilized.  
* **New Services:** New services will be created to handle the specific logic for configurator snapshot creation, API-driven execution, and comparison.

### **3.0 Snapshot File Structure (Configurator)**

A new snapshot type is introduced to isolate configuration testing.

**File Naming Convention:** \[TestName\].config.snapshot.json

**Storage Directory:** A new directory will be configured in VS Code settings: "revCloudBlueprint.configurator.snapshotDirectory": "revcloud\_blueprint/configurator/snapshots"

#### **3.1 Base Snapshot Structure**

{  
  "snapshotMetadata": {  
    "name": "Laptop Bundle with Premium Warranty",  
    "description": "Tests the successful configuration of a standard laptop bundle.",  
    "createdAt": "2025-10-20T14:30:00Z",  
    "sourceOrgAlias": "uat-org",  
    "testType": "positiveConfiguration"  
  },  
  "quoteContext": {  
    "accountId": "001...",  
    "pricebookId": "01s..."  
  },  
  // ... Test-type specific content follows  
}

#### **3.2 Positive Configuration Snapshot (testType: "positiveConfiguration")**

This snapshot captures a valid, achievable configuration state, **excluding all calculated price fields**.

"expectedQuoteState": {  
  "Quote": { "Name": "Golden Config \- Laptop Bundle" },  
  "QuoteLineItem": \[  
    {  
      "referenceId": "ROOT\_BUNDLE",  
      "Product2Id": "01t...", // Laptop Bundle Product ID  
      "Quantity": 1,  
      "PricebookEntryId": "01u..."  
    },  
    {  
      "referenceId": "CHILD\_LAPTOP",  
      "Product2Id": "01t...", // Laptop Product ID  
      "Quantity": 1,  
      "PricebookEntryId": "01u...",  
      "RAM\_Attribute\_\_c": "16GB",  
      "Storage\_Attribute\_\_c": "512GB"  
    }  
  \],  
  "QuoteLineItemRelationship": \[  
    {  
      "mainItemReferenceId": "ROOT\_BUNDLE",  
      "associatedItemReferenceId": "CHILD\_LAPTOP",  
      "ProductRelatedComponent": "0dS..."  
    }  
  \]  
}

#### **3.3 Negative Configuration Snapshot (testType: "negativeConfiguration")**

This defines an invalid action and the expected error response.

"baseValidQuoteState": {  
  // A valid JSON structure (like expectedQuoteState above) representing  
  // the quote's state \*before\* the invalid action is attempted.  
},  
"invalidModification": {  
  "apiAction": "/connect/cpq/configurator/actions/configure",  
  "payloadFragment": {  
    "addedNodes": \[  
      // Payload to add a forbidden product  
    \]  
  }  
},  
"expectedErrorMessages": \[  
  {  
    "category": "ConfigurationRules",  
    "message": "Product 'Forbidden Component' cannot be added.",  
    "messageType": "Error"  
  }  
\]

### **4.0 Feature Workflow Details**

#### **4.1 Snapshot Capture Workflow**

This workflow mirrors the existing pricing snapshot creation but targets different data and uses a new command.

1. **Trigger:** User right-clicks the "📁 Configurator" category in the tree view and selects Create Configurator Snapshot.  
2. **UI Prompts:** The extension prompts for Org Alias, source Quote ID, Snapshot Name, and Description.  
3. **Data Fetching:** The extension executes SOQL queries to fetch the Quote, QuoteLineItem, and QuoteLineItemRelationship records.  
4. **Data Sanitization:** A new utility will strip all price-related fields (e.g., UnitPrice, NetTotalPrice, GrandTotal) from the queried data. Custom fields to be captured will be read from a new configurator section in .revcloud/settings.json.  
5. **File Generation:** The sanitized JSON is saved as a .config.snapshot.json file in the configured directory.

#### **4.2 Negative Test Definition Workflow**

This requires a new UI to guide the user.

1. **Trigger:** The user right-clicks a positive config snapshot and selects Create Negative Test from this Snapshot.  
2. **Snapshot Duplication:** The extension duplicates the file, renaming it and setting testType to negativeConfiguration. The expectedQuoteState is moved into the baseValidQuoteState block.  
3. **Webview UI:** A new Webview panel opens, guiding the user to define:  
   * **Invalid Modification:** A form to select the API action (update-nodes, add-nodes, delete-nodes), the target line item/attribute, and the invalid value.  
   * **Expected Errors:** Text areas to input the exact error message(s) the system should produce.  
4. **File Update:** The extension saves these definitions into the invalidModification and expectedErrorMessages sections of the new snapshot file.

#### **4.3 Test Execution Workflow**

This workflow introduces a new test runner specific to the Configurator APIs.

1. **Trigger:** User clicks the ▶️ icon on a .config.snapshot.json file or a group within the "📁 Configurator" category.  
2. **Execution Engine Logic (Positive Test):**  
   1. Parse the snapshot file.  
   2. Create a base Quote in the target org.  
   3. **Initialize:** Call POST /actions/load-instance with the new Quote ID to get a contextId.  
   4. **Replicate:** Construct and execute one or more calls to POST /actions/configure, using addedNodes and updatedNodes based on the expectedQuoteState. The configuratorOptions payload will be { "executePricing": false, "executeConfigurationRules": true }.  
   5. **Persist:** Call POST /actions/save-instance with the final contextId.  
   6. **Validate:** Query the final state from the target org and perform a deep comparison against the expectedQuoteState, ignoring price fields. Check that no errors were returned by the APIs.  
   7. Generate and display the report.  
3. **Execution Engine Logic (Negative Test):**  
   1. Follow steps 1-5 above to recreate the baseValidQuoteState.  
   2. **Attempt Invalid Action:** Construct the invalid API payload from the invalidModification section and execute the API call.  
   3. **Validate:**  
      * Compare the messages array from the API response against expectedErrorMessages. A perfect match is a "Pass".  
      * If no error is returned, or a different error is returned, the test "Fails".  
   4. Generate and display the report detailing the message comparison.

### **5.0 Key Salesforce API Endpoints & Payloads**

The tool will exclusively use the Product Configurator Business APIs.

#### **5.1 POST /connect/cpq/configurator/actions/configure**

* **Purpose:** The main engine for applying configuration changes and running rules.  
* **Key configuratorOptions:** We will explicitly set executePricing to false to isolate configuration logic.  
* **Payload Construction:**  
  * **addedNodes:** To add optional bundle components, the tool must construct a payload that includes *both* a QuoteLineItem object and a corresponding QuoteLineItemRelationship object to link it back to its parent. This requires careful path and reference ID management.  
  * **updatedNodes:** To set attribute values or change quantities, the tool will use this. The path array identifies the target line item (e.g., \["\<QuoteId\>", "\<QuoteLineItemId\>"\]), and updatedAttributes provides a map of field API names to their new values.

#### **5.2 POST /connect/cpq/configurator/actions/save-instance**

* **Purpose:** Persists the final in-memory configuration state to the Salesforce database. This is the final step of a successful configuration recreation.

### **6.0 Project Configuration (.revcloud/settings.json)**

The existing configuration file will be extended to support the new module, ensuring clear separation.

{  
  "pricing": {  
    // ... existing pricing configuration ...  
  },  
  "configurator": {  
    "snapFields": {  
      "description": "Input fields captured for configuration state validation.",  
      "quote": {  
        "fields": \[\] // e.g., "Configuration\_Type\_\_c" if it affects rules  
      },  
      "quoteLineItem": {  
        "fields": \[  
          // Add custom attribute fields here  
          // e.g., "Color\_Attribute\_\_c", "RAM\_Attribute\_\_c"  
        \]  
      }  
    },  
    "reportFields": {  
        "description": "This section is not applicable for configurator tests as we compare the full non-price state.",  
        "quote": { "fields": \[\] },  
        "quoteLineItem": { "fields": \[\] }  
    }  
  }  
}

### **7.0 Reporting**

The existing HTML reporting engine (src/ui/reportView.ts) will be reused. The comparator will be adapted to generate a diff object suitable for the report view.

* **For Positive Tests:** The report will show a side-by-side comparison of the expectedQuoteState vs. the actual state from the target org.  
* **For Negative Tests:** The report will show a comparison of Expected Messages vs. Actual Messages returned by the API.

This approach ensures a consistent user experience and maximizes code reuse while providing a powerful, dedicated testing capability for the Product Configurator.

---

## **8.0 Proof of Concept - API Validation Results**

**Date:** October 21, 2025  
**Org:** rcbconfigorg (Salesforce Revenue Cloud)  
**Status:** ✅ All Critical Scenarios Validated

### **8.1 Executive Summary**

A comprehensive Proof of Concept was conducted to validate the Product Configurator Business APIs and confirm the technical approach. **Five critical scenarios** were tested, confirming that:

1. ✅ **Configurator APIs are fully functional** for configuration testing
2. ✅ **Product Configuration Rules ARE detected** and exposed via API responses
3. ✅ **PST API does NOT expose Product Configuration Rule messages** (decision: use Configurator APIs)
4. ✅ **Message structure is consistent** across all rule types (exclusion, quantity constraints)
5. ✅ **All three Configurator APIs work** (load-instance, configure, save-instance)

**Critical Prerequisites:**
- The "Product Configurator API User" system permission must be enabled for the API user
- Navigate to: Setup → Permission Sets → [Permission Set] → System Permissions → Enable "Product Configurator API User"

### **8.2 API Decision: Configurator APIs vs PST API**

**Decision: Use Configurator APIs** (POST /connect/cpq/configurator/actions/*)

| Feature | Configurator APIs | PST API |
|---------|-------------------|---------|
| Returns Product Configuration Rule messages? | ✅ YES | ❌ NO |
| Detects rule violations? | ✅ YES | ❌ NO |
| API Version | v62.0+ | v63.0+ |
| Suitable for configuration testing? | ✅ YES | ❌ NO |

**Reasoning:**
- Product Configuration Rules (Setup → Product Configuration Rules) are **only checked and exposed** by Configurator APIs
- PST API's `executeConfigurationRules: true` parameter checks different types of rules (catalog rules, constraints) but **NOT** Product Configuration Rules
- UI Product Configurator uses Configurator APIs internally (confirmed by testing)

### **8.3 API Endpoints - Validated Structure**

#### **8.3.1 Load Instance API**

**Endpoint:** `POST /services/data/v64.0/connect/cpq/configurator/actions/load-instance`

**Request:**
```json
{
  "transactionId": "0Q0xxx..."  // Quote ID
}
```

**Response:**
```json
{
  "contextId": "0000000r25tq18g...",
  "configuratorMessages": {
    "0QLxxx...": [{  // QuoteLineItem ID
      "category": "configurationrules",
      "message": "Error message text",
      "messageType": "info|warning|error",
      "primaryRecordId": "0Q0xxx...",  // Quote ID
      "relatedRecordId": "0QLxxx..."   // QuoteLineItem ID
    }]
  },
  "success": true,
  "errors": []
}
```

**Key Findings:**
- Returns `configuratorMessages` for **existing** line items
- Context ID expires quickly (within minutes)
- Keys are actual QuoteLineItem IDs

#### **8.3.2 Configure API**

**Endpoint:** `POST /services/data/v64.0/connect/cpq/configurator/actions/configure`

**Request (addedNodes):**
```json
{
  "transactionId": "0Q0xxx...",
  "configuratorOptions": {
    "executePricing": false,
    "returnProductCatalogData": false
  },
  "addedNodes": [{
    "path": ["0Q0xxx...", "ref_unique_id"],
    "addedObject": {
      "id": "ref_unique_id",
      "SalesTransactionItemSource": "ref_unique_id",
      "SalesTransactionItemParent": "0Q0xxx...",
      "Product": "01txxx...",           // Product2Id
      "PricebookEntry": "01uxxx...",    // PricebookEntryId
      "Quantity": 1,
      "businessObjectType": "QuoteLineItem"
    }
  }]
}
```

**Request (updatedNodes):**
```json
{
  "transactionId": "0Q0xxx...",
  "updatedNodes": [{
    "path": ["0Q0xxx...", "0QLxxx..."],  // [QuoteId, LineItemId]
    "updatedAttributes": {
      "Quantity": 5
    }
  }]
}
```

**Response:**
```json
{
  "success": true,
  "messages": {
    "ref_unique_id": [{  // Reference ID (temp)
      "category": "configurationrules",
      "message": "Error message text",
      "messageType": "error",
      "primaryRecordId": "0Q0xxx...",
      "relatedRecordId": "ref_unique_id"
    }]
  },
  "transactionContext": {
    "SalesTransaction": [{
      "SalesTransactionItem": [/* all line items */]
    }]
  },
  "transactionContextId": "0000000r25tq18g..."
}
```

**Critical Field Name Mappings:**
| Database Field | API Field (addedObject) |
|----------------|------------------------|
| Product2Id | `Product` |
| PricebookEntryId | `PricebookEntry` |
| MainQuoteLineId | `MainItem` |
| AssociatedQuoteLineId | `AssociatedItem` |

**Key Findings:**
- Returns `messages` for **items being added/updated**
- Keys are reference IDs (temporary IDs from payload)
- Complete transaction context returned with all line items
- Use `transactionContextId` for save-instance

#### **8.3.3 Save Instance API**

**Endpoint:** `POST /services/data/v64.0/connect/cpq/configurator/actions/save-instance`

**Request:**
```json
{
  "contextId": "0000000r25tq18g..."  // From load-instance or configure
}
```

**Response:**
```json
{
  "success": true,
  "errors": []
}
```

**Key Findings:**
- Persists configuration to database
- Context expires quickly - execute full flow without delays
- Does NOT block even with error messages present

### **8.4 Configuration Message Structure**

**Two Different Message Fields:**

| API | Field Name | Key Type | When Used |
|-----|-----------|----------|-----------|
| load-instance | `configuratorMessages` | QuoteLineItem ID | Messages about existing line items |
| configure | `messages` | Reference ID | Messages about items being added/updated |

**Message Object Structure (consistent across both):**
```json
{
  "category": "configurationrules",
  "message": "Human-readable error message",
  "messageType": "info|warning|error",
  "primaryRecordId": "0Q0xxx...",  // Quote ID
  "relatedRecordId": "0QLxxx..."   // Line Item ID or Reference ID
}
```

**Message Severity Levels:**
- `"info"` - Informational, does not block (validated in PoC)
- `"warning"` - Warning, does not block (expected behavior)
- `"error"` - Error, **does NOT block API** (validated in PoC)

**CRITICAL:** Even with `messageType: "error"`, the APIs return `success: true` and save the configuration. The tool MUST explicitly check for error messages to determine test failure.

### **8.5 PoC Scenarios - Detailed Results**

#### **Scenario 1: Simple Product Addition** ✅ PASS
- **Goal:** Validate basic configure API structure
- **Result:** Successfully added product using `addedNodes`
- **Key Learning:** API field names differ from database field names

#### **Scenario 2: Bundle Configuration** ✅ PASS
- **Goal:** Validate bundle/relationship handling
- **Result:** Successfully created QuoteLineItem + QuoteLineRelationship
- **Key Learning:** `SalesTransactionItemParent` must be Quote ID (not parent line item)

#### **Scenario 3: Attribute Configuration** ✅ PASS
- **Goal:** Validate `updatedNodes` for attribute updates
- **Result:** Successfully updated QuoteLineItem quantity
- **Key Learning:** Attributes use QuoteLineItemAttribute records (relationship-based)

#### **Scenario 4: Rule Violation (Exclusion Rule)** ✅ PASS
- **Setup:** "Printer cannot be added when Desktop is already on the quote"
- **Severity Tested:** Info and Error
- **Results:**
  - Info severity: `messageType: "info"`, `success: true`, data saved
  - Error severity: `messageType: "error"`, `success: true`, data **still saved**
- **Key Learning:** APIs do NOT block on errors - tool must check messages

#### **Scenario 5: Quantity Constraint (Bundle Child)** ✅ PASS
- **Setup:** "You can choose only one Laptop when bought in a bundle"
- **Result:** Message appeared when updating laptop quantity 1→2
- **Key Learning:** 
  - Rules trigger on **updates** to invalid values
  - API returns original value (1) not requested value (2)
  - All quantity rules are informational (`messageType: "info"`)

### **8.6 Error Detection Logic**

**The tool MUST implement this logic:**

```typescript
function hasConfigurationErrors(response: any): boolean {
  // Check errors array
  if (response.errors && response.errors.length > 0) {
    return true;
  }
  
  // Check configuratorMessages (load-instance)
  if (response.configuratorMessages) {
    for (const messages of Object.values(response.configuratorMessages)) {
      if (Array.isArray(messages) && 
          messages.some(m => m.messageType === "error")) {
        return true;
      }
    }
  }
  
  // Check messages (configure)
  if (response.messages) {
    for (const messages of Object.values(response.messages)) {
      if (Array.isArray(messages) && 
          messages.some(m => m.messageType === "error")) {
        return true;
      }
    }
  }
  
  return false;
}
```

**For Positive Tests:**
- If any `messageType === "error"` → Test FAILS (rule changed since snapshot)
- Display all error messages to user

**For Negative Tests:**
- Verify expected error message exists in `messages` field
- Match `messageType` and message text
- Test PASSES if error matches expected

### **8.7 Implementation Security Considerations**

Based on PoC findings, the following security aspects must be addressed:

1. **API Authentication:**
   - Reuse existing multi-org auth from `src/salesforce/auth.ts`
   - Validate "Product Configurator API User" permission before API calls
   - Handle token expiration and refresh

2. **Context ID Security:**
   - Context IDs expire quickly (minutes)
   - Never log or persist context IDs
   - Execute load→configure→save flow atomically

3. **Input Validation:**
   - Sanitize all user inputs (snapshot names, descriptions)
   - Validate Quote IDs, Product IDs before API calls
   - Prevent injection attacks in SOQL queries

4. **Error Handling:**
   - Never expose access tokens in error messages
   - Log API errors securely (strip sensitive data)
   - Handle timeout scenarios gracefully

5. **Data Privacy:**
   - Strip price fields from snapshots (already designed)
   - Do not capture customer PII in snapshots
   - Validate org access before fetching data

### **8.8 Implementation Readiness**

✅ **All Critical APIs Validated**
✅ **Message Structure Documented**
✅ **Error Detection Logic Defined**
✅ **Security Considerations Identified**
✅ **Field Name Mappings Documented**
✅ **API Decision Confirmed (Configurator APIs)**

**Ready to implement with confidence.**

---

## **9.0 Implementation Plan**

### **9.1 Modular Architecture**

The implementation will follow these principles:
1. **No regressions:** Existing pricing functionality remains untouched
2. **Code reuse:** Leverage existing patterns from pricing module
3. **Modular design:** Clear separation between configurator and pricing
4. **Security first:** All PoC security considerations addressed

### **9.2 File Structure**

```
apps/vscode-extension/src/
├── services/
│   ├── configuratorService.ts          (NEW - Configurator API client)
│   ├── placeQuoteService.ts            (EXISTING - Pricing)
│   └── [other existing services]
├── snapshot/
│   ├── creator.ts                      (EXTEND - Add configurator support)
│   └── [existing snapshot files]
├── test/
│   ├── runner.ts                       (EXTEND - Add configurator runner)
│   ├── comparator.ts                   (EXTEND - Add configurator comparison)
│   └── [existing test files]
├── ui/
│   ├── hierarchicalTreeProvider.ts     (EXTEND - Add configurator tree)
│   ├── reportView.ts                   (REUSE - Same reporting)
│   └── [other UI files]
└── extension.ts                        (EXTEND - Register new commands)
```

### **9.3 Implementation Priority**

**Phase 1: Core Infrastructure**
1. Create `configuratorService.ts` with all three API methods
2. Extend `hierarchicalTreeProvider.ts` for dual tree view (Pricing/Configurator tabs)
3. Update command registration in `extension.ts`

**Phase 2: Snapshot Creation**
4. Extend `creator.ts` with configurator snapshot logic
5. Implement SOQL queries for QuoteLineItem + relationships + attributes
6. Strip price fields as per design

**Phase 3: Test Execution**
7. Extend `runner.ts` with configurator test execution
8. Implement payload construction (addedNodes, updatedNodes, relationships)
9. Add error detection logic from PoC findings

**Phase 4: Comparison & Reporting**
10. Extend `comparator.ts` for configuration comparison
11. Reuse existing `reportView.ts` with configurator diff data
12. Implement message comparison for negative tests

**Phase 5: Feature Gating**
13. Make configurator tests Pro-only feature
14. Update `featureAccessControl.ts`

---

## **10.0 Next Steps**

1. ✅ PoC Complete
2. ➡️ **Begin Implementation - Phase 1**
3. ⏳ Unit Testing
4. ⏳ Integration Testing
5. ⏳ Documentation Update
6. ⏳ Release