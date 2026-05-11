# Configurator Configure API

## Overview

The **Configure** API is the main engine for applying configuration changes and running Product Configuration Rules in Salesforce Revenue Cloud. It allows you to add, update, or delete quote line items and their attributes, and returns configuration rule messages (info, warning, error) based on the current state.

**Endpoint:** `POST /services/data/{apiVersion}/connect/cpq/configurator/actions/configure`

**Example:** `POST /services/data/v64.0/connect/cpq/configurator/actions/configure`

---

## Prerequisites

### Required Permission

The API user must have the **Product Configurator API User** system permission enabled.

- **Path:** Setup → Permission Sets → [Your Permission Set] → System Permissions
- **Enable:** Product Configurator API User
- **Assign** the permission set to the API user

Without this permission, API calls will fail with an authorization error.

### Related APIs

The Configure API is typically used in sequence with:

| API | Purpose |
|-----|---------|
| **load-instance** | Load an existing quote configuration into memory; returns `contextId` and existing messages |
| **configure** | Apply changes (add/update/delete nodes) and run configuration rules |
| **save-instance** | Persist the in-memory configuration to the Salesforce database |

---

## Request Structure

### Base Request

```json
{
  "transactionId": "0Q0xxx...",
  "configuratorOptions": {
    "executePricing": false,
    "returnProductCatalogData": false
  },
  "addedNodes": [],
  "updatedNodes": [],
  "deletedNodes": []
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `transactionId` | string | Quote ID (18-character Salesforce Id) |

**At least one of** `addedNodes`, `updatedNodes`, or `deletedNodes` must be provided. An empty request with none of these will return an error.

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `configuratorOptions` | object | Controls behavior of the configuration run |
| `configuratorOptions.executePricing` | boolean | Whether to run pricing (default: `false` for configuration-only checks) |
| `configuratorOptions.returnProductCatalogData` | boolean | Whether to return product catalog data (default: `false`) |
| `addedNodes` | array | Nodes to add (e.g., new QuoteLineItems, QuoteLineRelationships) |
| `updatedNodes` | array | Nodes to update (e.g., attribute changes, quantity changes) |
| `deletedNodes` | array | Nodes to delete (reserved for future use) |

---

## Adding Line Items (addedNodes)

Use `addedNodes` to add new quote line items or relationships to an existing quote.

### Adding a QuoteLineItem

```json
{
  "transactionId": "0Q0xxx...",
  "configuratorOptions": {
    "executePricing": false,
    "returnProductCatalogData": false
  },
  "addedNodes": [
    {
      "path": ["0Q0xxx...", "ref_line_1"],
      "addedObject": {
        "id": "ref_line_1",
        "SalesTransactionItemSource": "ref_line_1",
        "SalesTransactionItemParent": "0Q0xxx...",
        "Product": "01txxx...",
        "PricebookEntry": "01uxxx...",
        "Quantity": 1,
        "businessObjectType": "QuoteLineItem"
      }
    }
  ]
}
```

### Field Name Mappings (API vs Database)

The Configure API uses different field names than the Salesforce database:

| Database Field | API Field (addedObject) |
|----------------|-------------------------|
| Product2Id | `Product` |
| PricebookEntryId | `PricebookEntry` |
| MainQuoteLineId | `MainItem` |
| AssociatedQuoteLineId | `AssociatedItem` |
| ProductRelatedComponentId | `ProductRelatedComponent` |
| ProductRelationshipTypeId | `ProductRelationshipType` |

### Adding a QuoteLineRelationship (Bundle Child)

To add a bundle component, you must add both the QuoteLineItem and the QuoteLineItemRelationship. **Order matters:** add the parent line item first, then the child line item, then the relationship.

`MainItem` and `AssociatedItem` use **reference IDs** from the same request — the IDs you assign in each `addedObject.id`. These are plain strings (e.g., `"ref_parent"`, `"ref_child_1"`), not the `@{...}` graph syntax used by the PST API.

```json
{
  "transactionId": "0Q0xxx...",
  "configuratorOptions": {
    "executePricing": false,
    "returnProductCatalogData": false
  },
  "addedNodes": [
    {
      "path": ["0Q0xxx...", "ref_parent"],
      "addedObject": {
        "id": "ref_parent",
        "SalesTransactionItemSource": "ref_parent",
        "SalesTransactionItemParent": "0Q0xxx...",
        "Product": "01txxx...",
        "PricebookEntry": "01uxxx...",
        "Quantity": 1,
        "businessObjectType": "QuoteLineItem"
      }
    },
    {
      "path": ["0Q0xxx...", "ref_child_1"],
      "addedObject": {
        "id": "ref_child_1",
        "SalesTransactionItemSource": "ref_child_1",
        "SalesTransactionItemParent": "0Q0xxx...",
        "Product": "01txxx...",
        "PricebookEntry": "01uxxx...",
        "Quantity": 1,
        "businessObjectType": "QuoteLineItem"
      }
    },
    {
      "path": ["0Q0xxx...", "ref_parent", "ref_rel_1"],
      "addedObject": {
        "id": "ref_rel_1",
        "MainItem": "ref_parent",
        "AssociatedItem": "ref_child_1",
        "ProductRelatedComponent": "0dSxxx...",
        "ProductRelationshipType": "0yoxxx...",
        "AssociatedItemPricing": "IncludedInBundlePrice",
        "AssociatedQuantScaleMethod": "Proportional",
        "businessObjectType": "QuoteLineRelationship"
      }
    }
  ]
}
```

**Reference ID usage:**
- `MainItem: "ref_parent"` — reference ID of the parent bundle (from the first `addedNode`)
- `AssociatedItem: "ref_child_1"` — reference ID of the child line item (from the second `addedNode`)

**Note:** `SalesTransactionItemParent` for line items is the **Quote ID**, not the parent line item ID.

---

## Updating Line Items (updatedNodes)

Use `updatedNodes` to change attributes, quantities, or other fields on existing line items.

```json
{
  "transactionId": "0Q0xxx...",
  "updatedNodes": [
    {
      "path": ["0Q0xxx...", "0QLxxx..."],
      "updatedAttributes": {
        "Quantity": 5
      }
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `path` | Array of `[QuoteId, QuoteLineItemId]` — identifies the target line item |
| `updatedAttributes` | Object mapping API field names to new values |

---

## Response Structure

```json
{
  "success": true,
  "transactionContextId": "0000000r25tq18g...",
  "messages": {
    "ref_line_1": [
      {
        "category": "configurationrules",
        "message": "Warranty is required when laptop and printer are sold together",
        "messageType": "warning",
        "primaryRecordId": "0Q0xxx...",
        "relatedRecordId": "ref_line_1"
      }
    ]
  },
  "transactionContext": {
    "SalesTransaction": [
      {
        "SalesTransactionItem": [/* all line items */]
      }
    ]
  },
  "errors": []
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the API call succeeded |
| `transactionContextId` | string | Context ID for subsequent save-instance call; expires quickly |
| `messages` | object | Configuration rule messages keyed by reference ID or line item ID |
| `transactionContext` | object | Complete transaction data with all line items |
| `errors` | array | API-level errors (e.g., validation failures) |

### Configuration Message Structure

Each message in the `messages` object has this structure:

```json
{
  "category": "configurationrules",
  "message": "Human-readable message text",
  "messageType": "info|warning|error",
  "primaryRecordId": "0Q0xxx...",
  "relatedRecordId": "0QLxxx..."
}
```

| Field | Description |
|-------|-------------|
| `category` | Source of the message (e.g., `configurationrules`) |
| `message` | Human-readable text |
| `messageType` | Severity: `info`, `warning`, or `error` |
| `primaryRecordId` | Quote ID |
| `relatedRecordId` | QuoteLineItem ID or reference ID |

---

## How to Do a Configuration Check

A **configuration check** means running the configurator to evaluate Product Configuration Rules and retrieve any resulting messages (info, warning, error).

### Option 1: Load Instance (Existing Quote)

For a quote that already exists with line items:

1. Call **load-instance** with the Quote ID.
2. The response includes `configuratorMessages` for all existing line items.

```
POST /connect/cpq/configurator/actions/load-instance
{ "transactionId": "0Q0xxx..." }
```

**Use when:** You have a saved quote and want to check its current configuration state.

### Option 2: Configure (Add or Update)

For adding new items or changing existing ones:

1. Call **configure** with `addedNodes` and/or `updatedNodes`.
2. The response includes `messages` for the items you added or updated.

```
POST /connect/cpq/configurator/actions/configure
{
  "transactionId": "0Q0xxx...",
  "configuratorOptions": { "executePricing": false },
  "addedNodes": [ ... ],
  "updatedNodes": [ ... ]
}
```

**Use when:** You are modifying a quote and want to see rule messages for those changes.

### Option 3: Full Flow (Create → Configure → Check)

For a new quote created via PST or REST:

1. Create the quote with line items (e.g., via Place Sales Transaction API).
2. Call **load-instance** with the new Quote ID.
3. Inspect `configuratorMessages` in the response.

**Use when:** You create quotes programmatically and need to validate configuration rules.

---

## Critical Behavior Notes

### 1. APIs Do Not Block on Errors

**Important:** The Configure and Load Instance APIs return `success: true` even when configuration rule **errors** are present. You must explicitly check the `messages` / `configuratorMessages` to determine if the configuration is valid.

```typescript
// Correct: Check for error-level messages
function hasConfigurationErrors(response) {
  if (response.errors?.length > 0) return true;
  for (const messages of Object.values(response.messages || {})) {
    if (messages.some(m => m.messageType === 'error')) return true;
  }
  return false;
}
```

### 2. Message Keys Differ by API

| API | Message Field | Key Type |
|-----|---------------|----------|
| load-instance | `configuratorMessages` | QuoteLineItem ID |
| configure | `messages` | Reference ID (from request) |

### 3. Context ID Expiration

`transactionContextId` (and `contextId` from load-instance) expire quickly (within minutes). Execute load → configure → save without unnecessary delays.

### 4. Configuration Rules vs PST API

Product Configuration Rules (Setup → Product Configuration Rules) are **only** evaluated by the Configurator APIs. The Place Sales Transaction (PST) API does **not** return Product Configuration Rule messages, even with `executeConfigurationRules: true`.

---

## Example: Complete Configuration Check Flow

```javascript
// 1. Load existing quote
const loadResponse = await client.post('/connect/cpq/configurator/actions/load-instance', {
  transactionId: '0Q0xxx...'
});

// 2. Check for messages
const allMessages = [];
if (loadResponse.data.configuratorMessages) {
  for (const msgs of Object.values(loadResponse.data.configuratorMessages)) {
    allMessages.push(...msgs);
  }
}

// 3. Determine if configuration is valid
const hasErrors = allMessages.some(m => m.messageType === 'error');
const hasWarnings = allMessages.some(m => m.messageType === 'warning');

if (hasErrors) {
  console.log('Configuration has errors:', allMessages.filter(m => m.messageType === 'error'));
} else if (hasWarnings) {
  console.log('Configuration has warnings:', allMessages.filter(m => m.messageType === 'warning'));
} else {
  console.log('Configuration is valid');
}
```

---

## References

- **Configurator Service:** `apps/vscode-extension/src/services/configuratorService.ts`
- **Configurator Test Design:** `docs/RCB Configurator Regression Testing.md`
- **Salesforce Revenue Cloud:** Product Configurator API documentation
