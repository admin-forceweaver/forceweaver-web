# **Revcloud Blueprint - Comprehensive Testing Framework for Salesforce Revenue Cloud**

[![Version](https://img.shields.io/badge/version-1.3.3-blue.svg)](https://marketplace.visualstudio.com/items/forceweaver.revcloud-blueprint/changelog)
[![License](https://img.shields.io/badge/license-EULA-green.svg)](https://marketplace.visualstudio.com/items/forceweaver.revcloud-blueprint/license)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=arohitu_revcloud-blueprint-extension&metric=security_rating&token=2322b9886e5d5d7c886c4f124c4184c6616a4441)](https://sonarcloud.io/summary/new_code?id=arohitu_revcloud-blueprint-extension)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=arohitu_revcloud-blueprint-extension&metric=vulnerabilities&token=2322b9886e5d5d7c886c4f124c4184c6616a4441)](https://sonarcloud.io/summary/new_code?id=arohitu_revcloud-blueprint-extension)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)](https://www.typescriptlang.org/)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.74.0+-orange)](https://code.visualstudio.com/)
[![Salesforce](https://img.shields.io/badge/Salesforce-Revenue%20Cloud-00a1e0)](https://www.salesforce.com/products/revenue-lifecycle-management/)

> **A comprehensive Visual Studio Code extension for automating regression testing across the entire Salesforce Revenue Cloud ecosystem - Pricing, Configurator, Order Decomposition, and Billing.**

---

## 🚀 **Public Beta - Free Access!** 🚀

**Revcloud Blueprint is currently in its Early Adopter Program.** For a limited time, all professional features are enabled for free! We invite you to use the tool and provide [feedback](https://form.jotform.com/252443148591055) to help shape its future. We plan to introduce paid plans in late 2025 to support continued development.

---

## **🎯 Overview**

Revcloud Blueprint is a VS Code extension that revolutionizes testing for Salesforce Revenue Cloud by providing:

- **Zero-Touch Pricing Validation** - Automatically verify pricing accuracy across environments with enterprise-grade reliability
- **Smart Test Organization** - Group and manage hundreds of pricing scenarios with intuitive hierarchical workflows  
- **Lightning-Fast Regression Testing** - Catch pricing breaks instantly with Git-integrated snapshot comparisons
- **Seamless Multi-Org Workflows** - Switch between Production, UAT, and Dev orgs effortlessly with secure CLI authentication
- **Executive-Ready Reports** - Generate stunning HTML reports with expandable details, perfect for stakeholder reviews
- **Professional Documentation** - Save, export, and share test results in HTML and PDF formats for audit trails
- **Delightful Developer Experience** - Intuitive UI with real-time progress, smart notifications, and one-click setup

---

## **💎 Features**

### **What Makes This Special**
- **Laser-Focused Expertise**: Deep specialization in Revenue Cloud pricing ensures bulletproof accuracy and comprehensive coverage
- **Enterprise-Grade Resilience**: Built-in intelligent retry logic and comprehensive error handling designed for real-world network challenges, API timeouts, and Salesforce's asynchronous pricing engine behaviors
- **Complete Pricing Coverage**: From simple list prices to complex multi-tier, multi-currency pricing scenarios with bundles
- **End-to-End Workflows**: Full quote lifecycle testing including line item validation, totals verification, and pricing rule execution

### **Core Strengths (Fully Supported)**
- **Advanced Pricing Validation** - Master complex Revenue Cloud pricing calculations, discount rules, and multi-currency scenarios
- **Enterprise-Scale Testing** - Handle hundreds of pricing scenarios across your entire product catalog with confidence  
- **Intelligent Automation** - Smart snapshot management with Git integration for seamless CI/CD pipeline integration
- **Production-Ready Reports** - Stakeholder-friendly reports that clearly communicate pricing accuracy and test coverage

### **Expanding Horizons**
We're building the **ultimate Revenue Cloud testing platform**. While our current laser focus on pricing delivers unparalleled value, exciting expansions are coming:
- **Product Configurator** - Configuration rules and bundle testing (planned)
- **Billing & Revenue** - Invoice and payment validation (planned)  
- **Order Management** - Quote-to-cash workflows (planned)

---

## **📖 Table of Contents**

1. [🎯 Overview](#-overview)
2. [💎 Focused Excellence](#-focused-excellence)
3. [🚀 Getting Started](#-getting-started)
   - [🔐 Extension Authentication & Activation](#-extension-authentication--activation)
4. [📋 How to Use](#-how-to-use)
   - [🔐 Before You Start: Sign In to Your Account](#-before-you-start-sign-in-to-your-account)
5. [⚙️ Configuration](#️-configuration)
6. [⚠️ Known Issues](#️-known-issues)
7. [🗺️ Roadmap](#️-roadmap)
8. [📚 Additional Resources](#-additional-resources)
9. [📄 License](#-license)
10. [🙏 Acknowledgments](#-acknowledgments)

---

## **🚀 Getting Started**

### **📋 Prerequisites**

- **VS Code**: Version 1.74.0 or higher
- **Salesforce CLI**: Latest version (`npm install -g @salesforce/cli`)
- **Revenue Cloud**: Enabled in your Salesforce orgs

### **⚡ Installation & Setup**

**Complete setup in under 5 minutes with automated configuration:**

#### **Step 1: Install Extension**
- **From VS Code**: Extensions (Ctrl+Shift+X) → Search "Revcloud Blueprint" → Install
- **From Marketplace**: [📥 Install Extension](https://marketplace.visualstudio.com/items?itemName=forceweaver.revcloud-blueprint)

#### **Step 2: Authenticate Salesforce Orgs**
   ```bash
# Production/Source org (where your pricing snapshots come from)
   sfdx auth:web:login -a ProductionOrg
   
# Development/Test org (where you test pricing changes)  
   sfdx auth:web:login -a DevOrg
   
   # Verify authentication
   sfdx org:list
   ```

#### **Step 3: Automated Project Setup**
1. **Open Your Project**: Open your Revenue Cloud project workspace in VS Code
2. **Setup Notification**: Extension automatically detects missing configuration and shows setup prompt
3. **Click "Setup Now"**: Or use the setup icon (🛠️) in the RevCloud Blueprint sidebar
4. **Configuration Created**: Extension automatically creates:
   - `.revcloud/groups.json` - Snapshot grouping configuration
   - `.revcloud/settings.json` - Custom field configuration for pricing and configurator tests
   - `revcloud_blueprint/pricing/snapshots/` - Directory for pricing test snapshots
   - `revcloud_blueprint/configurator/snapshots/` - Directory for configurator test snapshots

#### **Step 4: Verify Installation**
- Look for the **Rev Cloud Blueprint icon** (<img src="images/rcb_logo_color.png" width="16" height="16" style="vertical-align: middle;">) in the VS Code Activity Bar (far-left vertical bar)
- Click the Rev Cloud Blueprint icon to open the dedicated sidebar
- You should see the hierarchical tree structure with your snapshots and groups
- Click the ➕ button to create your first snapshot
- **Optional**: Click the user icon (👤) in the title bar to view the Profile page with Public Beta information

---

### **🔐 Extension Authentication & Activation**

Revcloud Blueprint uses a seamless browser-based authentication flow to manage your account and license tier:

#### **How it Works**

1. **Click "Sign In"** - Open the extension by clicking the Rev Cloud Blueprint icon in the Activity Bar, then click the User/Account icon (👤), and click "Sign In"
2. **Browser Opens** - Your default browser opens automatically to `https://blueprint.forceweaver.com/login`
3. **Log In or Sign Up** - 
   - **Existing users**: Enter your email and password
   - **New users**: Click "Create Account" to sign up (you'll receive a confirmation email)
4. **Auto-Redirect** - After logging in, you're automatically redirected back to VS Code
5. **Done!** - Your extension is authenticated and your tier is displayed - no codes, no manual steps

#### **Your License Tier**

After signing in, you'll see your current tier in the account view:
- **Free Tier** - 2 snapshots, 1 group, basic features
- **Pro Tier** - 50 snapshots, 20 groups, advanced features including batch testing, group management, and PDF export
- **Enterprise Tier** - Unlimited snapshots and groups, priority support, SSO, and dedicated assistance

> **Public Beta Note**: During the public beta period, all users have access to Pro-level features for free. Your actual tier will be enforced when paid plans are introduced.

#### **Key Features**

- **🌐 Automatic Callback** - No device codes or manual copy-paste required
- **🔒 Secure** - Token-based authentication with automatic fallback storage for reliability
- **⚡ Fast** - Complete authentication in under 30 seconds
- **🎯 Simple** - One click to start, automatic completion
- **💾 Persistent** - Stay signed in across VS Code restarts

#### **Troubleshooting**

**Browser doesn't open?**
- Manually visit: `https://blueprint.forceweaver.com/login`
- After logging in, you'll be automatically redirected back to VS Code

**"Authentication timed out" error?**
- Click "Retry" to try again
- Complete the login within 5 minutes
- Check your internet connection

**Port conflict errors?**
- The extension uses a random port between 49152-65535 for the callback
- Check firewall settings if issues persist
- You can configure the port range in VS Code settings: `revCloudBlueprint.auth.localServerPortRange`

---

### **Configuration Files Created Automatically**

The extension creates two essential configuration files in your project:

#### **`.revcloud/settings.json` - Field Configuration**
```json
{
  "pricing": {
    "snapFields": {
      "description": "Input fields captured and used for pricing test recreation",
      "quote": {
        "description": "Custom Quote fields required for pricing calculation",
        "fields": [
          // Add your project-specific Quote fields here
          // Example: "ContractTerm__c", "Custom_Pricing_Model__c"
        ]
      },
      "quoteLineItem": {
        "description": "Custom QuoteLineItem fields required for pricing calculation", 
        "fields": [
          // Add your project-specific QuoteLineItem fields here
          // Example: "PriceMethod__c", "ServiceType__c"
        ]
      }
    },
    "reportFields": {
      "description": "Output fields captured and compared in test reports",
      "quote": {
        "description": "Quote-level pricing outputs to verify in test reports",
        "fields": [
          "GrandTotal"
        ]
      },
      "quoteLineItem": {
        "description": "QuoteLineItem-level pricing outputs to verify in test reports",
        "fields": [
          "NetUnitPrice",
          "NetTotalPrice",
          "Quantity"
        ]
      }
    }
  }
}
```

#### **`.revcloud/groups.json` - Snapshot Organization**
```json
{
  "_comment": "This file stores snapshot grouping configuration for RevCloud Blueprint extension",
  "version": "1.0",
  "groups": [
    {
      "id": "uncategorized",
      "name": "Uncategorized",
      "description": "New snapshots will be placed here until moved to a specific group",
      "snapshotPaths": [],
      "createdAt": "2024-12-19T12:00:00.000Z"
    }
  ]
}
```

### **API Reliability Settings (Optional)**

For enhanced reliability with intermittent network issues or slow pricing calculations, configure these VS Code settings:

**Access via**: File → Preferences → Settings → Search "RevCloud Blueprint"

#### **Basic Polling Configuration**
```json
{
  "revCloudBlueprint.pricing.pricingPollingEnabled": true,
  "revCloudBlueprint.pricing.pricingPollingMaxRetries": 10,
  "revCloudBlueprint.pricing.pricingPollingInitialDelayMs": 2000
}
```

#### **Advanced Revenue Cloud Timing Detection (v1.2.4+)**
```json
{
  "revCloudBlueprint.pricing.polling.fieldStability.enabled": true,
  "revCloudBlueprint.pricing.polling.fieldStability.requiredStableAttempts": 2,
  "revCloudBlueprint.pricing.polling.revenueCloud.bufferTimeMs": 3000,
  "revCloudBlueprint.pricing.polling.revenueCloud.enableQuickCompletionCheck": true
}
```

#### **Setting Descriptions**

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| `pricingPollingEnabled` | `true` | boolean | Enable intelligent polling for pricing completion |
| `pricingPollingMaxRetries` | `10` | 3-20 | Maximum polling attempts before timeout |
| `pricingPollingInitialDelayMs` | `2000` | 1000-10000 | Initial delay before starting to poll (ms) |
| `polling.fieldStability.enabled` | `true` | boolean | Monitor field values for stability (prevents false mismatches) |
| `polling.fieldStability.requiredStableAttempts` | `2` | 1-5 | Consecutive polls where fields must remain stable |
| `polling.revenueCloud.bufferTimeMs` | `3000` | 1000-10000 | Additional wait time for Revenue Cloud calculations (ms) |
| `polling.revenueCloud.enableQuickCompletionCheck` | `true` | boolean | Add extra buffer for fast-completing scenarios |

**Performance Recommendations by Org Type:**
- **Dev/Scratch Orgs** (fast): `maxRetries: 5, initialDelayMs: 1000, bufferTimeMs: 1000`
- **Production Orgs** (standard): Use default settings above
- **Complex Pricing Orgs** (slow): `maxRetries: 15, initialDelayMs: 3000, bufferTimeMs: 5000`
- **Multi-Phase Revenue Cloud** (complex): Enable field stability monitoring with `requiredStableAttempts: 3`

### **🎯 You're Ready!**

After setup, you can immediately:
- **Create Snapshots**: Capture pricing data from your source org
- **Organize Tests**: Group snapshots by feature, release, or test suite
- **Run Tests**: Execute individual tests or batch runs on groups
- **Analyze Results**: View detailed comparison reports with pass/fail analysis

---

## **📋 How to Use**

### **🔐 Before You Start: Sign In to Your Account**

To use Revcloud Blueprint, you'll need to sign in to your account. This allows the extension to track your usage, enforce license limits, and sync your settings.

#### **First-Time Setup**

1. **Open the Extension**
   - Click the **Rev Cloud Blueprint icon** (<img src="images/rcb_logo_color.png" width="16" height="16" style="vertical-align: middle;">) in the VS Code Activity Bar (left sidebar)
   
2. **Access Account View**
   - Click the **User/Account icon** (👤) in the extension's title bar
   - You'll see the account page with a "Sign In" button

3. **Sign In**
   - Click **"Sign In"** 
   - Your browser opens automatically to the login page at `https://blueprint.forceweaver.com/login`
   
4. **Authenticate**
   - **Existing users**: Enter your email and password, then click "Sign in"
   - **New users**: Click "Create Account" to register (free tier available)
     - Fill in your email and password
     - Check your email for a confirmation link
     - After confirming, return to the login page and sign in
   
5. **Automatic Return**
   - After successful login, you're automatically redirected back to VS Code
   - The account view updates to show:
     - ✅ Your current tier (Free, Pro, or Enterprise)
     - Your account email
     - "Sign Out" button
     - "Manage License" button (to upgrade or view billing)

#### **Viewing Your Account Status**

Once signed in, you can view your account anytime:
- Click the **User/Account icon** (👤) in the extension title bar
- You'll see your tier, feature limits, and account options
- Click **"Manage License"** to visit the dashboard at `https://blueprint.forceweaver.com/dashboard`

#### **Signing Out**

To sign out of your account:
1. Click the **User/Account icon** (👤)
2. Click the **"Sign Out"** button
3. Confirm sign out
4. You'll need to sign in again to use the extension

> **💡 Tip**: You stay signed in across VS Code restarts, so you only need to sign in once!

---

### **1. 📁 Organizing with Smart Groups**

#### **Creating Your First Group**
1. **Locate RevCloud Blueprint**: Find the RevCloud Blueprint section in VS Code Explorer
2. **Create Group**: Click the **➕ folder icon** next to "RevCloud Blueprint" 
3. **Name Your Group**: Enter a descriptive name (e.g., "Q4 Release Tests", "Bundle Pricing", "Discount Scenarios")
4. **Group Created**: Your new group appears in the hierarchical tree structure

#### **Managing Groups**
- **Rename Group**: Right-click group → "Rename" → Enter new name
- **Delete Group**: Right-click group → "Delete" → Confirm (snapshots move to "Uncategorized")
- **View Groups**: All groups stored in `.revcloud/groups.json` for version control

### **2. Creating Pricing Snapshots**

#### **Method 1: Create in Specific Group**
1. **Right-click Group**: Choose your target group in the tree view
2. **Select "Create Snapshot"**: Snapshot will be placed directly in this group
3. **Follow Creation Process**: See steps below

#### **Method 2: Create at Main Level**
1. **Click Main ➕**: Use the main "Create Pricing Snapshot" button
2. **Auto-placed**: Snapshot automatically goes to "Uncategorized" group
3. **Move Later**: Drag-and-drop to move to desired group

#### **Snapshot Creation Process**
1. **Select Source Org**: Choose your source org (Production, UAT, or reference)
2. **Enter Quote Details**:
   - **Quote ID**: 15 or 18 character Salesforce Quote ID
   - **Description**: Meaningful test description (e.g., "Enterprise bundle with 20% discount")
3. **Generated Snapshot**: Creates JSON in `revcloud_blueprint/pricing/snapshots/`
  ```json
  {
    "metadata": { 
      "sourceOrgId": "00D000000000001",
      "sourceOpportunityId": "006000000000001",
       "description": "Enterprise bundle with 20% discount",
       "createdDate": "2024-12-19T10:30:00Z"
     },
     "expectedResults": { /* Quote and line item pricing data */ },
     "recreationPayload": { /* Data needed to recreate the quote */ }
   }
   ```

### **3. Moving Snapshots Between Groups**

#### **Drag and Drop**
- **Simply Drag**: Click and drag snapshot from one group to another
- **Visual Feedback**: Tree updates immediately
- **Auto-Save**: Changes saved automatically to `.revcloud/groups.json`

### **4. Running Individual Tests**

#### **For Specific Snapshots**
1. **Locate Snapshot**: Find your snapshot in any group
2. **Click Play Icon**: Click ▶️ icon next to the snapshot
3. **Choose Opportunity**: Select testing approach:

##### **Smart Opportunity Selection**

**Option 1: "Use same opportunity"** - Reuses original opportunity
- **Best for**: Testing configuration changes with controlled variables
- **Benefits**: Identical account context, currency, relationships
- **Use case**: "Did my pricing rule update work correctly?"

**Option 2: "Use different opportunity"** - Test with new opportunity  
- **Best for**: Testing across different customer scenarios
- **Benefits**: Validates pricing logic across various contexts
- **Use case**: "Does this pricing work for different customer types?"

4. **Monitor Progress**: Watch real-time progress with intelligent polling
5. **View Results**: Detailed HTML report opens automatically

### **5. 🚀 Running Batch Tests (Groups)**

#### **Test Entire Groups**
1. **Locate Group**: Find the group you want to test
2. **Click Group Play Icon**: Click ▶️ next to the group name
3. **Automatic Execution**: All snapshots run automatically using:
   - **Source Org**: Same as original snapshot
   - **Source Opportunity**: Original opportunity from each snapshot
   - **No User Input**: Fully automated execution

#### **Batch Run Features**
- **Continuous Progress**: Moving progress bar shows ongoing execution
- **Real-time Updates**: See each snapshot as it completes
- **Comprehensive Report**: Single report summarizes all test results:

```
📊 Batch Test Results: "Q4 Release Tests"
═══════════════════════════════════════════════════════════
✅ Overall Success Rate: 85% (17/20 snapshots passed)
⏱️  Total Execution Time: 4m 32s
📅 Executed: December 19, 2024 at 2:45 PM

📋 Summary by Snapshot:
───────────────────────────────────────────────────────────
✅ Enterprise Bundle - Basic          | Passed  | 12.3s
✅ Enterprise Bundle - 10% Discount   | Passed  | 11.8s  
❌ Professional Package - Multi-year  | Failed  | 8.9s
   └─ Issue: Line item pricing mismatch on Annual Support
✅ Small Business - Standard          | Passed  | 9.1s
...
```

#### **Batch Report Benefits**
- **High-Level Overview**: Pass/fail status for each snapshot
- **Failure Analysis**: Clear reasons for each failure
- **Time Tracking**: Execution time per snapshot
- **Actionable Insights**: Focus on specific snapshots that need attention

### **6. Understanding Test Results**

#### **Individual Test Reports**
- **Accordion Layout**: Expandable sections for 100+ line items
- **Save & Export**: Save HTML reports and export to PDF
- **Detailed Analysis**: Field-by-field comparison with variance tracking
- **Bundle Hierarchy**: Visual parent-child relationships for complex products

#### **Batch Test Reports**  
- **Executive Summary**: High-level pass/fail rates and timing
- **Focused Failures**: Clear identification of issues without overwhelming detail
- **Snapshot Navigation**: Quick links to investigate specific failures
- **Trend Analysis**: Track success rates across test runs

### **7. Snapshot Management**

#### **View Snapshots**
- **Code Icon**: Click `</>` to view the JSON file directly
- **File Access**: Opens snapshot file for inspection or manual editing

#### **Delete Snapshots**
- **Trash Icon**: Click 🗑️ next to any snapshot
- **Confirmation**: Confirms deletion with snapshot details
- **Clean Removal**: Removes from group and deletes file

> **💡 Pro Tip**: Create groups by feature, release, or customer type. Use batch runs to validate entire feature sets, then drill down to individual snapshots for detailed analysis.


---

## **⚙️ Configuration**

### **🔧 Extension Settings**

Access via: `Ctrl+Shift+P` → "Preferences: Open Settings" → Search "Revcloud Blueprint"

#### **Core Configuration**
```json
{
  "revCloudBlueprint.pricing.productExternalIdField": "ProductCode",
  "revCloudBlueprint.pricing.attributeDefinitionExternalIdField": "Code",
  "revCloudBlueprint.pricing.attributePicklistValueExternalIdField": "Code", 
  "revCloudBlueprint.api.version": "v64.0",
  "revCloudBlueprint.verboseLogging": true,
  "revCloudBlueprint.pricing.snapshotDirectory": "revcloud_blueprint/pricing/snapshots"
}
```

#### **Setting Details**

| Setting | Default | Description |
|---------|---------|-------------|
| `attributeDefinitionExternalIdField` | `"Code"` | External ID field on AttributeDefinition |
| `attributePicklistValueExternalIdField` | `"Code"` | External ID field on AttributePicklistValue |
| `api.version` | `"v64.0"` | Salesforce API version for Connect APIs |
| `verboseLogging` | `false` | Enable detailed debug logging |
| `pricing.snapshotDirectory` | `"revcloud_blueprint/pricing/snapshots"` | Directory for snapshot storage |

### **Project-Specific Field Configuration**

Configure which custom fields to capture and compare by editing `.revcloud/settings.json` in your workspace root.

#### **Two Field Types**

| Field Type | When Used | Purpose |
|------------|-----------|---------|
| **`snapFields`** | During quote/line item **creation** + **comparison** | Input data your pricing procedures need to calculate correctly |
| **`reportFields`** | During **comparison only** (never written) | Calculated results you want to verify are correct |

#### **Quick Setup Example**

```json
{
  "pricing": {
    "snapFields": {
      "quote": {
        "fields": ["ContractTerm__c", "PricingModel__c"]
      },
      "quoteLineItem": {
        "fields": ["ServiceType__c", "PriceMethod__c"]
      }
    },
    "reportFields": {
      "quote": {
        "fields": ["TotalServiceCost__c", "TotalCost__c"]
      },
      "quoteLineItem": {
        "fields": ["SellPrice__c", "BandPrice__c"]
      }
    }
  }
}
```

#### **Configuration Rules**

**🎯 How Field Types Work:**

**`snapFields`** - **Input Fields** (Data you provide):
- ✅ **Captured** from your source quote/line items
- ✅ **Written** to new quote/line items when running tests
- ✅ **Compared** to verify the data was correctly applied
- 💡 **Use for**: Fields that your pricing procedures READ (contract terms, pricing models, service types)

**`reportFields`** - **Output Fields** (Data the system calculates):
- ✅ **Captured** from your source quote/line items  
- ❌ **Never written** to new quote/line items (would interfere with calculations)
- ✅ **Compared** to verify the pricing engine calculated correctly
- 💡 **Use for**: Fields that your pricing procedures CALCULATE (totals, costs, margins)

**Standard Fields** (Always included automatically):
- Quote: `GrandTotal`, `TotalPrice`, `Subtotal`
- Line Items: `UnitPrice`, `NetUnitPrice`, `TotalPrice`, `NetTotalPrice`, `Quantity`

#### **Setup Steps**

1. **Identify Input Fields**: What custom fields do your pricing procedures need to read to calculate correctly?
   - Example: Contract terms, pricing models, service types, adjustment flags
   - ➡️ Add these to `snapFields`

2. **Identify Output Fields**: What custom fields do your pricing procedures calculate that you want to verify?
   - Example: Service costs, total costs, margins, calculated prices
   - ➡️ Add these to `reportFields`

3. **Update Configuration**: Add your fields to the appropriate sections in `.revcloud/settings.json`

4. **Test Your Setup**: Create a snapshot and run a pricing test to verify all fields are captured and compared correctly

#### **Real-World Example**

**Scenario**: You have a Revenue Cloud pricing procedure that:
- Reads `ContractTerm__c` to determine pricing duration
- Reads `ServiceType__c` to apply the correct pricing model  
- Calculates `TotalServiceCost__c` based on the above inputs
- Calculates `ServiceMargin__c` based on costs

**Configuration**:
```json
{
  "pricing": {
    "snapFields": {
      "quote": { "fields": ["ContractTerm__c"] },
      "quoteLineItem": { "fields": ["ServiceType__c"] }
    },
    "reportFields": {
      "quote": { "fields": ["TotalServiceCost__c", "ServiceMargin__c"] },
      "quoteLineItem": { "fields": [] }
    }
  }
}
```

**What happens during testing**:
1. **Snapshot creation**: All fields captured from source quote
2. **Test execution**: `ContractTerm__c` and `ServiceType__c` written to new quote/line items
3. **Pricing calculation**: Revenue Cloud calculates `TotalServiceCost__c` and `ServiceMargin__c`
4. **Verification**: All fields compared to ensure input data was applied correctly AND calculated results match expectations

---

## **⚠️ Known Issues**

### **Configuration Refresh Required**

**Issue**: When making changes to `.revcloud/settings.json` to add project-specific fields, the changes are not immediately reflected in snapshot creation or pricing test runs.

**Workaround**: After modifying `.revcloud/settings.json`, you need to refresh VS Code to apply the configuration changes:

1. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
2. Type and select **"Developer: Reload Window"**
3. Wait for VS Code to reload completely
4. Your configuration changes will now be active

**Why this happens**: The extension loads configuration settings when VS Code starts. Changes to configuration files require a window reload to be detected and applied.

**Planned fix**: We're working on automatic configuration reload detection in a future release to eliminate this manual step.

### **Cannot create an Amendment Quote with 0 delta quantity**

**Issue**: Curently, we cannot create an amendment Quote with a line that has delta quantity as 0 (unchanged).

**Workaround**: No Known Workaround.

**Why this happens**: The PST API currently does now allow the creation of a line with quantity of 0.

---

## **Roadmap**

### **Proven Excellence (v1.x.x) - Industry-Leading Pricing Testing**

- **Next-Generation Pricing Engine** - Advanced snapshot-based validation with intelligent field discovery and cross-org compatibility
- **Smart Test Orchestration** - Hierarchical grouping, batch execution, and automated retry logic for bulletproof reliability  
- **Enterprise Reporting Suite** - Executive-ready HTML reports with accordion layouts, PDF export, and comprehensive audit trails
- **Developer-First Experience** - Seamless VS Code integration with real-time progress, one-click setup, and intelligent notifications
- **Production-Grade Reliability** - Enterprise-grade API resilience, exponential backoff, and multi-org authentication workflows
- **Complete Revenue Cloud Integration** - Native Place Sales Transaction API, dynamic schema discovery, and attribute management

### **🎯 Innovation Roadmap**

#### **🔥 v1.x+ - Pricing Mastery** 
*Continuing our excellence with advanced pricing scenarios*

#### **⚡ v2.0 - Configurator Intelligence** 
*Smart configuration testing with rule validation*

#### **💎 v3.0 - Order Orchestration** 
*End-to-end quote-to-cash workflow validation*

#### **🚀 v4.0 - Billing Excellence** 
*Complete revenue lifecycle testing platform*

---

## **📚 Additional Resources**

### **📖 Documentation**
- [Changelog](https://marketplace.visualstudio.com/items/forceweaver.revcloud-blueprint/changelog) - Version history and changes

### **🔗 External References**
- [Revenue Cloud Developer Documentation](https://developer.salesforce.com/docs/atlas.en-us.revenue_lifecycle_management_dev_guide.meta/revenue_lifecycle_management_dev_guide/rlm_get_started.htm)
- [VS Code Extension Development](https://code.visualstudio.com/api)
- [Salesforce CLI Documentation](https://developer.salesforce.com/tools/sfdxcli)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

---

## **📄 License**

This project is licensed under the EULA License Agreement - see the [LICENSE](https://marketplace.visualstudio.com/items/forceweaver.revcloud-blueprint/license) file for details.

---

## **🙏 Acknowledgments**

- **Salesforce Revenue Cloud Team** - For providing comprehensive API documentation and support
- **VS Code Extension Community** - For excellent development tools and resources  
- **TypeScript Team** - For robust type safety and development experience
- **Open Source Community** - For the amazing libraries and tools that make this possible

---

<div align="center">

**🚀 Ready to revolutionize your Revenue Cloud testing? Get started with Revcloud Blueprint today! 🚀**

[📥 Install Extension](https://marketplace.visualstudio.com/items?itemName=forceweaver.revcloud-blueprint) | [🐛 Report Issues](https://form.jotform.com/252443148591055) | [🙌 Support](https://github.com/sponsors/arohitu)

</div>