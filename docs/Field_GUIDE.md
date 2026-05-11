## **Revenue Cloud Blueprint Extension \- Comprehensive Field Documentation**

---

## **📋 Table of Contents**

1. Overview  
2. Field Categories  
3. Quote Field Management  
4. QuoteLineItem Field Management  
5. Technical Design  
6. Configuration Examples  
7. Field Usage by Phase
8. **snapFields vs reportFields: Complete Usage Guide**
9. Best Practices

---

## **🎯 Overview**

The Revenue Cloud Blueprint Extension uses a **configuration-driven field management system** that eliminates pattern matching and provides explicit control over which fields are included in snapshots, test creation, and report comparison.

### **Key Principles**

* **Configuration-Driven**: All field selection is based on explicit configuration, not pattern matching  
* **Essential Fields**: Core Salesforce and Revenue Cloud fields that are always included  
* **User Configuration**: Project-specific fields defined in .revcloud/settings.json  
* **Phase-Specific**: Different field sets for snapshots, creation, and reporting  
* **Write Protection**: Calculated and system-managed fields are protected during creation

---

## **🗂️ Field Categories**

### **1\. Essential Fields**

**Always included** regardless of configuration. These are core Salesforce and Revenue Cloud fields required for basic functionality.

### **2\. Configured Fields**

**User-defined** fields specified in .revcloud/settings.json. These are project-specific fields needed for your pricing scenarios.

### **3\. Excluded Fields**

**Automatically filtered out** during certain operations. These include:

* **Calculated Fields**: Fields computed by the pricing engine  
* **System-Managed Fields**: Read-only fields managed by Salesforce  
* **Write-Protected Fields**: Fields that cannot be written during test creation

---

## **📊 Quote Field Management**

### **Essential Quote Fields**

*Always included in snapshots and queries*

| Field | Category | Purpose |
| ----- | ----- | ----- |
| Id | Standard | Record identification |
| Name | Standard | Quote identification |
| Status | Standard | Quote lifecycle state |
| CreatedDate | Standard | Audit trail |
| LastModifiedDate | Standard | Audit trail |
| Account.Id | Relationship | Account association |
| Account.Name | Relationship | Account identification |
| Pricebook2Id | Standard | Pricing context |
| OpportunityId | Standard | Opportunity relationship |
| ContactId | Standard | Contact association |
| StartDate | Standard | Quote validity period |
| CurrencyIsoCode | Standard | Currency context |
| Tax | Pricing | Tax calculation |
| ShippingHandling | Pricing | Shipping costs |
| Discount | Pricing | Discount application |
| GrandTotal | Pricing | Final calculated total |
| TotalPrice | Pricing | Pre-tax total |
| Subtotal | Pricing | Line items subtotal |

### **Configured Quote Fields**

*Project-specific fields from* .revcloud/settings.json

**Example Configuration:**

`{`  
  `"pricing": {`  
    `"snapFields": {`  
      `"quote": {`  
        `"fields": [`  
          `"ContractTerm__c",`  
          `"PricingModel__c",`  
          `"Region__c"`  
        `]`  
      `}`  
    `}`  
  `}`  
`}`

### **Quote Calculated Fields *(Excluded during creation)***

* GrandTotal \- Calculated by pricing engine  
* TotalPrice \- Calculated by pricing engine  
* Subtotal \- Calculated by pricing engine

### **Required Quote Report Fields *(Always in reports)***

* GrandTotal \- Verify final pricing  
* Subtotal \- Verify line item totals  
* TotalPrice \- Verify pre-tax pricing

---

## **📦 QuoteLineItem Field Management**

### **Essential QuoteLineItem Fields**

*Always included in snapshots and queries*

| Field | Category | Purpose |
| ----- | ----- | ----- |
| Id | Standard | Record identification |
| QuoteId | Relationship | Parent quote association |
| Product2Id | Relationship | Product association |
| PricebookEntryId | Relationship | Pricing reference |
| LineNumber | Standard | Line ordering |
| Quantity | Pricing | Quantity for calculation |
| UnitPrice | Pricing | Base unit price |
| TotalPrice | Pricing | Line total price |
| NetUnitPrice | Pricing | Net unit price after adjustments |
| NetTotalPrice | Pricing | Net total price after adjustments |
| ServiceDate | Standard | Service delivery date |
| Discount | Pricing | Line-level discount |
| Description | Standard | Line description |
| SortOrder | Standard | Display ordering |
| Product2.Id | Relationship | Product details |
| Product2.Name | Relationship | Product identification |
| Product2.ProductCode | Relationship | Product code reference |
| PricebookEntry.Id | Relationship | Entry details |
| PricebookEntry.Name | Relationship | Entry identification |
| PricebookEntry.ProductCode | Relationship | Entry product code |
| OpportunityLineItemId | Relationship | Opportunity line association |
| CreatedDate | Standard | Audit trail |
| LastModifiedDate | Standard | Audit trail |
| HasQuantitySchedule | Standard | Schedule indicator |
| HasRevenueSchedule | Standard | Revenue schedule indicator |
| ParentQuoteLineItemId | Relationship | Parent line relationship |
| PartnerUnitPrice | Pricing | Partner pricing |
| UnitPriceUplift | Pricing | Price uplift amount |
| ListPrice | Pricing | List price reference |
| ConstraintEngineNodeStatus\_\_c | Revenue Cloud | Pricing engine status |
| PricingTerm | Revenue Cloud | Subscription pricing term |
| PricingTermUnit | Revenue Cloud | Term unit (months/years) |
| BillingFrequency | Revenue Cloud | Billing cycle |
| StartDate | Revenue Cloud | Subscription start |
| EndDate | Revenue Cloud | Subscription end |
| SubscriptionTerm | Revenue Cloud | Subscription duration |
| SubscriptionTermUnit | Revenue Cloud | Subscription unit |
| PricingTermCount | Revenue Cloud | Number of pricing terms |
| ProrationPolicyId | Revenue Cloud | Proration rules |
| PeriodBoundary | Revenue Cloud | Period alignment |
| PeriodBoundaryDay | Revenue Cloud | Boundary day |
| PeriodBoundaryStartMonth | Revenue Cloud | Boundary start month |

### **QuoteLineItem Creation Required Fields**

*Must be present during test creation*

* QuoteId \- Parent quote reference  
* Product2Id \- Product association  
* PricebookEntryId \- Pricing entry reference  
* UnitPrice \- Base pricing input  
* Quantity \- Quantity for calculation  
* StartDate \- Subscription start date
* EndDate \- Subscription end date
* ConstraintEngineNodeStatus\_\_c \- Revenue Cloud requirement

### **QuoteLineItem Creation Essential Fields**

*Applied when available in snapshot data*

* LineNumber \- Line ordering  
* ServiceDate \- Service delivery  
* Discount \- Line-level discount  
* Description \- Line description  
* SortOrder \- Display ordering  
* OpportunityLineItemId \- Opportunity relationship  
* HasQuantitySchedule \- Schedule indicator  
* HasRevenueSchedule \- Revenue schedule indicator  
* ParentQuoteLineItemId \- Parent relationship  
* PartnerUnitPrice \- Partner pricing  
* UnitPriceUplift \- Price adjustments  
* ListPrice \- List price reference  
* All Revenue Cloud subscription fields

### **QuoteLineItem Calculated Fields *(Excluded during creation)***

* TotalPrice \- Calculated during pricing  
* PricingTermCount \- Calculated during pricing  
* NetUnitPrice \- Calculated during pricing  
* NetTotalPrice \- Calculated during pricing

### **Required QuoteLineItem Report Fields *(Always in reports)***

* NetUnitPrice \- Verify unit pricing output  
* NetTotalPrice \- Verify total pricing output  
* Quantity \- Verify quantity accuracy

### **Write-Protected Fields *(Never written during creation)***

* ProrationPolicyId \- Read-only Revenue Cloud field  
* CreatedDate \- System managed  
* LastModifiedDate \- System managed  
* Id \- System managed

---

## **🔧 Technical Design**

### **Architecture Overview**

### **Core Components**

#### **1\. FieldDiscoveryService**

**Location**: src/services/fieldDiscoveryService.ts

**Responsibilities**:

* Define essential fields for Quote and QuoteLineItem objects  
* Provide field categorization methods  
* Handle field exclusion logic  
* Support configuration-driven field resolution

**Key Methods**:

`// Essential fields (always included)`  
`static getEssentialQuoteFields(): string[]`  
`static getEssentialQuoteLineItemFields(): string[]`

`// Configured fields (from settings.json)`  
`static getConfiguredFields(objectType: 'quote' | 'quoteLineItem', fieldType: 'snapFields' | 'reportFields'): string[]`

`// Combined field resolution`    
`static getAllRequiredFields(objectType: 'quote' | 'quoteLineItem'): string[]`

`// Field categorization`  
`static getRequiredSnapshotFields(objectType: 'quote' | 'quoteLineItem'): string[]`  
`static getQuoteCalculatedFields(): string[]`  
`static getQuoteLineItemCalculatedFields(): string[]`  
`static getWriteProtectedFields(): string[]`

#### **2\. ConfigurationService**

**Location**: src/services/configurationService.ts

**Responsibilities**:

* Load and validate .revcloud/settings.json  
* Provide configuration templates  
* Handle configuration defaults  
* Support modular configuration structure

**Configuration Structure**:

`interface PricingConfiguration {`  
  `snapFields: {`  
    `quote: { fields: string[], description: string }`  
    `quoteLineItem: { fields: string[], description: string }`  
  `}`  
  `reportFields: {`  
    `quote: { fields: string[], description: string }`  
    `quoteLineItem: { fields: string[], description: string }`  
  `}`  
`}`

#### **3\. SalesforceAPI**

**Location**: src/salesforce/api.ts

**Responsibilities**:

* Execute SOQL queries with resolved field lists  
* Handle Place Quote API calls with proper field filtering  
* Manage field validation and error handling  
* Apply retry logic for API resilience

**Field Resolution Flow**:

`// 1. Get all required fields for SOQL`  
`const allFields = FieldDiscoveryService.getAllRequiredFields(objectType);`

`// 2. Execute SOQL query with complete field list`  
``const query = `SELECT ${allFields.join(', ')} FROM ${objectType} WHERE ...`;``

`// 3. During creation, filter out calculated fields`  
`const createFields = this.filterCalculatedFields(allFields, objectType);`

### **Field Resolution Algorithm**

`function resolveFieldsForPhase(objectType: 'quote' | 'quoteLineItem', phase: 'snapshot' | 'creation' | 'report'): string[] {`  
    `// Step 1: Start with essential fields`  
    `let fields = FieldDiscoveryService.getEssentialFields(objectType);`  
      
    `// Step 2: Add configured fields`  
    `if (phase === 'snapshot' || phase === 'report') {`  
        `fields.push(...FieldDiscoveryService.getConfiguredFields(objectType, 'snapFields'));`  
    `}`  
      
    `if (phase === 'report') {`  
        `fields.push(...FieldDiscoveryService.getConfiguredFields(objectType, 'reportFields'));`  
        `fields.push(...FieldDiscoveryService.getRequiredReportFields(objectType));`  
    `}`  
      
    `// Step 3: Remove duplicates`  
    `fields = [...new Set(fields)];`  
      
    `// Step 4: Apply phase-specific exclusions`  
    `if (phase === 'creation') {`  
        `const calculatedFields = FieldDiscoveryService.getCalculatedFields(objectType);`  
        `const writeProtectedFields = FieldDiscoveryService.getWriteProtectedFields();`  
        `fields = fields.filter(f => !calculatedFields.includes(f) && !writeProtectedFields.includes(f));`  
    `}`  
      
    `return fields;`  
`}`

### **Data Flow**

#### **Snapshot Creation**

1. **Field Resolution**: Essential \+ Configured Snap \+ Configured Report  
2. **SOQL Execution**: Query with complete field list  
3. **Data Storage**: Store all field data in JSON snapshot  
4. **Validation**: Verify required fields are present

#### **Test Creation (Place Quote)**

1. **Field Filtering**: Remove calculated and write-protected fields  
2. **Data Preparation**: Extract creation-safe fields from snapshot  
3. **API Call**: Submit filtered data to Place Quote API  
4. **Result Capture**: Store creation results for comparison

#### **Report Generation**

1. **Field Selection**: Essential Report \+ Configured Report \+ Required Report  
2. **Data Comparison**: Compare expected vs actual values  
3. **Validation**: Flag missing or incorrect field values  
4. **Report Output**: Generate detailed comparison report

---

## **⚙️ Configuration Examples**

### **Basic Configuration**

.revcloud/settings.json

`{`  
  `"pricing": {`  
    `"snapFields": {`  
      `"description": "Input fields captured in snapshots and used for pricing test recreation",`  
      `"quote": {`  
        `"description": "Custom Quote fields required for pricing calculation",`  
        `"fields": [`  
          `"Region__c",`  
          `"ContractTerm__c"`  
        `]`  
      `},`  
      `"quoteLineItem": {`  
        `"description": "Custom QuoteLineItem fields required for pricing calculation",`  
        `"fields": [`  
          `"ServiceType__c",`  
          `"PriceMethod__c"`  
        `]`  
      `}`  
    `},`  
    `"reportFields": {`  
      `"description": "Output fields captured and compared in test reports",`   
      `"quote": {`  
        `"description": "Quote-level pricing outputs to verify",`  
        `"fields": [`  
          `"TotalACV__c",`  
          `"TotalTCV__c"`  
        `]`  
      `},`  
      `"quoteLineItem": {`  
        `"description": "QuoteLineItem-level pricing outputs to verify",`  
        `"fields": [`  
          `"CalculatedPrice__c",`  
          `"ListPriceACV__c"`  
        `]`  
      `}`  
    `}`  
  `}`  
`}`

### **Advanced Configuration**

`{`  
  `"pricing": {`  
    `"snapFields": {`  
      `"quote": {`  
        `"fields": [`  
          `"Region__c",`  
          `"ContractTerm__c",`  
          `"PricingModel__c",`   
          `"DiscountProgram__c",`  
          `"PaymentTerms__c"`  
        `]`  
      `},`  
      `"quoteLineItem": {`  
        `"fields": [`  
          `"ServiceType__c",`  
          `"PriceMethod__c",`  
          `"CostCenter__c",`  
          `"TierLevel__c",`  
          `"CommissionRate__c"`  
        `]`  
      `}`  
    `},`  
    `"reportFields": {`  
      `"quote": {`  
        `"fields": [`  
          `"TotalACV__c",`  
          `"TotalTCV__c",`  
          `"YearlyRecurring__c",`  
          `"OneTimeCharges__c",`  
          `"NetPrice__c"`  
        `]`  
      `},`  
      `"quoteLineItem": {`  
        `"fields": [`  
          `"CalculatedPrice__c",`  
          `"ListPriceACV__c",`  
          `"CommissionAmount__c",`  
          `"MarginPercent__c",`  
          `"PricingTier__c"`  
        `]`  
      `}`  
    `}`  
  `}`  
`}`  
---

## **🔄 Field Usage by Phase**

### **Phase 1: Snapshot Creation**

**Purpose**: Capture complete pricing scenario data for test recreation

**Field Sources**:

* ✅ Essential Quote/QuoteLineItem fields  
* ✅ Configured snap fields  
* ✅ Configured report fields  
* ❌ No exclusions (capture everything needed)

**SOQL Example**:

`SELECT Id, Name, Status, GrandTotal, TotalPrice, Subtotal, Region__c, ContractTerm__c, TotalACV__c`   
`FROM Quote`   
`WHERE Id = '0Q0000000000001'`

**Result**: Complete snapshot JSON with all necessary field data

### **Phase 2: Test Creation (Place Quote)**

**Purpose**: Recreate pricing scenario in target org using Place Quote API

**Field Sources**:

* ✅ Essential fields (creation-safe only)  
* ✅ Configured snap fields  
* ❌ Calculated fields (excluded \- pricing engine will compute)  
* ❌ Write-protected fields (excluded \- system managed)

**API Payload Example**:

`{`  
  `"record": {`  
    `"Name": "Test Quote Recreation",`  
    `"OpportunityId": "006000000000001",`  
    `"StartDate": "2024-01-01",`  
    `"Region__c": "North America",`  
    `"ContractTerm__c": "12"`  
  `}`  
`}`

**Excluded During Creation**:

* GrandTotal (calculated by pricing)  
* TotalPrice (calculated by pricing)  
* CreatedDate (system managed)  
* Id (system managed)

### **Phase 3: Report Generation**

**Purpose**: Compare expected vs actual pricing results

**Field Sources**:

* ✅ Required report fields (always)  
* ✅ Configured report fields  
* ✅ Essential pricing outputs  
* ❌ No exclusions (compare all outputs)

**Comparison Example**:

`{`  
  `"quote": {`  
    `"GrandTotal": {`  
      `"expected": 12000.00,`  
      `"actual": 12000.00,`  
      `"match": true`  
    `},`  
    `"TotalACV__c": {`  
      `"expected": 10000.00,`  
      `"actual": 10500.00,`  
      `"match": false,`  
      `"variance": 500.00`  
    `}`  
  `}`  
`}`  
---

## **📋 snapFields vs reportFields: Complete Usage Guide**

### **🎯 Core Concept**

The Revenue Cloud Blueprint Extension makes a **critical distinction** between two types of fields:

- **`snapFields`**: **Input fields** used for quote/line item creation and recreation
- **`reportFields`**: **Output/calculated fields** used only for comparison and verification

This separation ensures that **calculated fields are never incorrectly written** during test creation, while still being properly **captured for comparison**.

---

### **📊 Field Categories & Usage Matrix**

| Field Category | Snapshot Creation | Quote/LineItem Creation | SOQL Queries | Report Comparison |
|----------------|------------------|------------------------|---------------|-------------------|
| **Essential Fields** | ✅ Always included | ✅ Creation-safe only | ✅ Always included | ✅ Always included |
| **snapFields** | ✅ Captured | ✅ **Used for creation** | ✅ Queried | ✅ **Compared for verification** |
| **reportFields** | ✅ Captured | ❌ **Never written** | ✅ Queried | ✅ **Used for comparison** |

---

### **🔄 Complete Field Flow**

#### **Phase 1: Snapshot Creation** 

**What happens:**
- Extension queries source org to capture pricing scenario
- ALL field types are captured for complete data preservation

**Fields included:**
```typescript
// Essential fields (always)
['Id', 'Name', 'GrandTotal', 'TotalPrice', ...]

// + snapFields from configuration  
['RCA_ContractTerm__c', 'RCA_PriceMethod__c', ...]

// + reportFields from configuration
['RCA_TotalCost__c', 'RCA_TotalQuoteMargin__c', ...]
```

**Storage locations:**
- **snapFields**: → `recreationPayload.quoteSnapFields` (for creation)
- **reportFields**: → `expectedResults.quoteFields` (for comparison)

#### **Phase 2: Target Quote/LineItem Creation**

**What happens:**
- Extension creates quotes/line items in target org using Place Quote API
- Only **input fields** (snapFields) are written to avoid overriding calculated values

**Fields used for creation:**
```typescript
// Essential fields (creation-safe only)
['Name', 'OpportunityId', 'StartDate', 'Tax', ...]

// + snapFields (input fields only)
['RCA_ContractTerm__c', 'RCA_PriceMethod__c', ...]

// - reportFields (EXCLUDED - these will be calculated)
// ❌ RCA_TotalCost__c (calculated field)
// ❌ RCA_TotalQuoteMargin__c (calculated field)
```

**Critical protection:**
- **reportFields** are **never written** during creation
- Pricing engine calculates these fields naturally
- Prevents data corruption and calculation conflicts

#### **Phase 3: SOQL Data Retrieval**

**What happens:**
- Extension queries the created quote/line items to get final calculated values
- ALL field types are queried to enable complete comparison

**Fields included in SOQL:**
```sql
SELECT 
  -- Essential fields
  Id, Name, GrandTotal, TotalPrice,
  -- snapFields  
  RCA_ContractTerm__c, RCA_PriceMethod__c,
  -- reportFields
  RCA_TotalCost__c, RCA_TotalQuoteMargin__c
FROM Quote 
WHERE Id = '...'
```

#### **Phase 4: Report Comparison**

**What happens:**
- Extension compares expected values (from snapshot) vs actual values (from target)
- Uses **standard fields + reportFields + snapFields** for comprehensive comparison
- **snapFields are compared** to verify input data was correctly applied
- **reportFields are compared** to verify calculated outputs are correct

**Fields compared:**
```typescript
// Standard report fields (always compared)
['GrandTotal', 'TotalPrice', 'NetUnitPrice', 'NetTotalPrice', 'Quantity']

// + reportFields from configuration (calculated outputs to verify)
['RCA_TotalCost__c', 'RCA_TotalQuoteMargin__c', 'RCA_TotalACVListUSD__c']

// + snapFields from configuration (input data to verify)
['RCA_ContractTerm__c', 'RCA_PriceMethod__c', 'RCA_ServiceType__c', 'RCA_SDKDerivedPriceSource__c']

// ALL configured fields are compared for complete verification
```

**🎯 Why Both Field Types Are Compared:**
- **snapFields comparison**: Verifies that input data was correctly written to the target quote/line items
- **reportFields comparison**: Verifies that the pricing engine calculated the expected output values
- **Complete verification**: Ensures both input fidelity AND calculation accuracy

---

### **🛠️ Configuration Examples**

#### **Correct Configuration Pattern (Real-World Example)**

This example shows the proper separation between input fields (snapFields) and calculated output fields (reportFields):

```json
{
  "pricing": {
    "snapFields": {
      "description": "Input fields captured in snapshots and used for pricing test recreation (these provide the data pricing procedures need to calculate correctly)",
      "quote": {
        "description": "Custom fields for Quote object that are required inputs for pricing calculation",
        "fields": [
          "RCA_ContractTerm__c"           // ✅ Input field - used to set contract duration
        ]
      },
      "quoteLineItem": {
        "description": "Custom fields for QuoteLineItem object that are required inputs for pricing calculation",
        "fields": [
          "RCA_PriceMethod__c",           // ✅ Input field - determines pricing method
          "RCA_ServiceType__c",           // ✅ Input field - affects pricing logic  
          "RCA_SDKDerivedPriceSource__c", // ✅ Input field - pricing source
          "RCA_PriceAdjustmentRelevant__c" // ✅ Input field - adjustment flag
          // ❌ RCA_TotalCost__c - MOVED TO reportFields (calculated output)
          // ❌ RCA_UnitCost__c - MOVED TO reportFields (calculated output)
        ]
      }
    },
    "reportFields": {
      "description": "Output fields captured in snapshots and used for test report comparison (these are the calculated results from pricing procedures that we want to verify)",
      "quote": {
        "description": "Quote-level pricing outputs to verify in test reports",
        "fields": [
          "RCA_TotalACVListUSD__c",       // ✅ Calculated output - verify ACV calculation
          "RCA_TotalCost__c",             // ✅ Calculated output - verify cost calculation  
          "RCA_TotalQuoteMargin__c"       // ✅ Calculated output - verify margin calculation
        ]
      },
      "quoteLineItem": {
        "description": "QuoteLineItem-level pricing outputs to verify in test reports",
        "fields": [
          "RCA_TotalCost__c",             // ✅ Calculated output - verify line item cost
          "RCA_UnitCost__c"               // ✅ Calculated output - verify unit cost calculation
        ]
      }
    }
  }
}
```

**Key Changes Made:**
- **Moved `RCA_TotalCost__c` and `RCA_UnitCost__c`** from `snapFields` to `reportFields`
- These are **calculated fields** that should be verified, not written during creation
- **Kept input fields** like `RCA_ContractTerm__c` and `RCA_PriceMethod__c` in `snapFields`
- These are **required inputs** that influence the pricing calculations

#### **Field Type Decision Guide**

**Use `snapFields` when the field is:**
- ✅ An **input** that influences pricing calculations
- ✅ Set by users or business logic before pricing runs
- ✅ Needed to recreate the same pricing scenario
- ✅ Safe to write during quote/line item creation

**Use `reportFields` when the field is:**
- ✅ An **output** calculated by the pricing engine
- ✅ A result you want to verify for accuracy
- ✅ Calculated based on other field values
- ✅ Should never be written during creation

---

### **🔍 Default Fields Reference**

#### **Always Included (Standard Report Fields)**

**Quote Level:**
```typescript
['GrandTotal', 'TotalPrice']  // Always in reports
```

**QuoteLineItem Level:**  
```typescript
['UnitPrice', 'NetUnitPrice', 'TotalPrice', 'NetTotalPrice', 'Quantity']  // Always in reports
```

#### **Field Merging Logic**

The system **merges** your configured reportFields with standard fields:

**Final Quote Report Fields:**
```typescript
// Standard + Configured
['GrandTotal', 'TotalPrice', 'RCA_TotalACVListUSD__c', 'RCA_TotalCost__c', 'RCA_TotalQuoteMargin__c']
```

**Final LineItem Report Fields:**
```typescript  
// Standard + Configured
['UnitPrice', 'NetUnitPrice', 'TotalPrice', 'NetTotalPrice', 'Quantity', 'RCA_TotalCost__c', 'RCA_UnitCost__c']
```

---

### **⚠️ Common Mistakes to Avoid**

#### **❌ Mistake 1: Putting Calculated Fields in snapFields**
```json
{
  "snapFields": {
    "quote": {
      "fields": [
        "RCA_TotalQuoteMargin__c"  // ❌ This is calculated - will cause creation errors
      ]
    }
  }
}
```
**Problem:** Extension tries to write calculated field → API error or incorrect values

#### **❌ Mistake 2: Putting Input Fields in reportFields Only**
```json
{
  "reportFields": {
    "quote": {
      "fields": [
        "RCA_ContractTerm__c"  // ❌ This is input - won't be written during creation
      ]
    }
  }
}
```
**Problem:** Input field not written → pricing calculation uses default/wrong values

#### **✅ Correct Approach: Separate Input vs Output**
```json
{
  "snapFields": {
    "quote": {
      "fields": ["RCA_ContractTerm__c"]  // ✅ Input - written during creation
    }
  },
  "reportFields": {
    "quote": {
      "fields": ["RCA_TotalQuoteMargin__c"]  // ✅ Output - compared after calculation
    }
  }
}
```

---

### **🔧 Technical Implementation Details**

#### **Code Locations**

1. **Snapshot Creation**: `src/snapshot/creator.ts`
   - `extractQuoteSnapFields()` → Uses `snapFields` configuration
   - `buildSnapshot()` → Uses `reportFields` for expected results

2. **Quote Creation**: `src/test/runner.ts`
   - `getConfiguredQuoteSnapFields()` → Only uses `recreationPayload.quoteSnapFields`
   - `buildSubscriptionFields()` → Only uses `snapFields` configuration

3. **Field Querying**: `src/services/fieldDiscoveryService.ts`
   - `getAllRequiredFields()` → Merges essential + snapFields + reportFields
   - Used by SOQL queries to get complete field data

4. **Report Comparison**: `src/test/comparator.ts`  
   - `compareQuoteFields()` → Uses `expectedResults.quoteFields` (reportFields)
   - `compareLineItems()` → Uses `expectedPricingFields` (reportFields)

#### **Data Flow Verification**

You can verify this is working by checking the debug logs:

**During Snapshot Creation:**
```
[DEBUG] ✅ Extracted configured Quote snap field RCA_ContractTerm__c: 60
[DEBUG] ✅ Captured Quote report field RCA_TotalQuoteMargin__c: 62.89
```

**During Quote Creation:**
```  
[DEBUG] ✅ Applying Quote snap field RCA_ContractTerm__c: 60
[DEBUG] 🔢 Excluding calculated Quote field during creation: RCA_TotalQuoteMargin__c
```

**During Comparison:**
```
[DEBUG] 🔍 compareFieldValues(RCA_TotalQuoteMargin__c): Expected=62.89 | Actual=62.89  
```

---

### **🎯 Summary**

The **snapFields vs reportFields** separation ensures:

1. **Data Integrity**: Calculated fields are never incorrectly overwritten
2. **Accurate Testing**: Input fields properly recreate pricing scenarios  
3. **Complete Validation**: Output fields are properly compared for accuracy
4. **API Safety**: Place Quote API calls only include writable fields
5. **Flexibility**: Easy configuration updates without code changes

**Remember**: 
- **snapFields** = "What do I need to **write** to recreate this pricing scenario?"
- **reportFields** = "What do I need to **verify** was calculated correctly?"

---

## **📝 Best Practices**

### **Configuration Management**

1. **Start Simple**: Begin with minimal field configuration and add as needed  
2. **Document Purpose**: Use field descriptions to explain why each field is needed  
3. **Test Thoroughly**: Validate field configuration with sample snapshots  
4. **Version Control**: Track configuration changes in your project repository

### **Field Selection Guidelines**

1. **Snap Fields**: Include all fields that influence pricing calculations  
2. **Report Fields**: Include all fields you want to verify in test results  
3. **Avoid Redundancy**: Essential fields are automatically included  
4. **Consider Dependencies**: Some fields may be required by others

### **Troubleshooting**

1. **Missing Fields**: Check if field exists using sf sobject describe  
2. **SOQL Errors**: Verify field API names and accessibility  
3. **Creation Failures**: Ensure fields are writable and not calculated  
4. **Report Inconsistencies**: Verify expected vs actual field values

### **Performance Optimization**

1. **Minimize Fields**: Only configure fields you actually need  
2. **Batch Processing**: Use bulk operations for multiple snapshots  
3. **Field Validation**: Validate field existence before SOQL execution  
4. **Error Handling**: Implement retry logic for transient API failures

---

## **🏁 Summary**

The Revenue Cloud Blueprint Extension provides a robust, configuration-driven field management system that:

* **Eliminates Pattern Matching**: No more guesswork about which fields to include  
* **Provides Explicit Control**: You decide exactly which fields are used  
* **Ensures Consistency**: Same field logic across snapshots, creation, and reporting  
* **Protects Data Integrity**: Automatic exclusion of calculated and system fields  
* **Supports Scalability**: Easy configuration updates for new requirements

**Key Success Factors**:

* ✅ Configure only the fields you need  
* ✅ Test configurations with real pricing scenarios  
* ✅ Document field purposes for team understanding  
* ✅ Monitor field usage and performance  
* ✅ Keep configurations in version control

This system provides enterprise-grade field management for complex Revenue Cloud pricing scenarios while maintaining simplicity and reliability.

