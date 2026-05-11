import * as vscode from 'vscode';
import { SalesforceAuth, SalesforceOrg } from '../salesforce/auth';
import { SalesforceAPI, PlaceQuoteRequest, QuoteData } from '../salesforce/api';
import { ConfigReader } from '../config/configReader';
import { PricingSnapshot } from '../snapshot/creator';
import { Comparator, ComparisonResult } from './comparator';
import { FieldDiscoveryService } from '../services/fieldDiscoveryService';
import { ApiUtilityService } from '../services/apiUtilityService';
import { RevenueCloudService } from '../services/revenueCloudService';

export interface TestResult {
    success: boolean;
    snapshot: PricingSnapshot;
    targetOrg: SalesforceOrg;
    createdQuoteId?: string;
    actualQuoteData?: QuoteData;
    comparison?: ComparisonResult;
    errors?: string[];
    detailedErrors?: import('../salesforce/api').SalesforceAPIError[];
    executionTime: number;
}

export class TestRunner {
    public auth: SalesforceAuth; // Made public for hierarchical tree provider access
    private api: SalesforceAPI;
    private comparator: Comparator;

    constructor(auth: SalesforceAuth) {
        this.auth = auth;
        this.api = new SalesforceAPI(auth);
        this.comparator = new Comparator();
    }

    /**
     * Wait for pricing calculation to complete
     * With pricingPref='force', pricing is completed inline during quote creation
     * This method adds a configurable delay to ensure pricing data is committed to database
     */
    private async waitForPricingCompletion(quoteId: string, targetOrg: SalesforceOrg, progressCallback?: (progress: number, message: string) => void): Promise<QuoteData> {
        // Get configured delay from settings (default 3000ms)
        const config = vscode.workspace.getConfiguration('revCloudBlueprint.pricing');
        const delayMs = config.get<number>('pricingPollingInitialDelayMs', 3000);
        
        console.log(`[DEBUG] ⏳ Pricing completed inline. Waiting ${delayMs}ms for data to be committed to database...`);
        await this.sleep(delayMs);
        
        console.log(`[DEBUG] 📊 Fetching quote data after ${delayMs}ms delay...`);
                const quoteData = await this.api.getQuoteData(targetOrg.username, quoteId);
        console.log(`[DEBUG] ✅ Quote data fetched. Grand Total: ${quoteData.GrandTotal || 'N/A'}`);
                            
                            return quoteData;
    }
    
    /**
     * Sleep utility for delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get full configuration from ConfigurationService
     */
    private getFullConfig(): any {
        try {
            // Import ConfigurationService dynamically to avoid circular dependencies
            const { ConfigurationService } = require('../services/configurationService');
            return ConfigurationService.getFullConfig();
        } catch (error: any) {
            console.warn(`[WARN] Failed to load configuration: ${error.message}`);
            return { pricing: { reportFields: { quote: { fields: [] }, quoteLineItem: { fields: [] } } } };
        }
    }

    /**
     * Compare two values for equality (handles different data types)
     */
    private valuesEqual(value1: any, value2: any): boolean {
        // Handle null/undefined
        if (value1 === null || value1 === undefined) {
            return value2 === null || value2 === undefined;
        }
        if (value2 === null || value2 === undefined) {
            return value1 === null || value1 === undefined;
        }
        
        // Handle numbers (including 0)
        if (typeof value1 === 'number' && typeof value2 === 'number') {
            return value1 === value2;
        }
        
        // Handle strings
        if (typeof value1 === 'string' && typeof value2 === 'string') {
            return value1 === value2;
        }
        
        // Handle booleans
        if (typeof value1 === 'boolean' && typeof value2 === 'boolean') {
            return value1 === value2;
        }
        
        // Handle objects (shallow comparison)
        if (typeof value1 === 'object' && typeof value2 === 'object') {
            return JSON.stringify(value1) === JSON.stringify(value2);
        }
        
        // Default comparison
        return value1 === value2;
    }

    /**
     * Run a pricing test using a snapshot
     */
    async runTest(snapshot: PricingSnapshot, targetOrg?: SalesforceOrg, progressCallback?: (progress: number, message: string) => void): Promise<TestResult> {
        const startTime = Date.now();
        
        try {
            // console.log(`[DEBUG] Starting pricing test for snapshot: ${snapshot.metadata.description}`);
            progressCallback?.(10, 'Initializing test...');
            
            // Step 1: Use source org as target if not provided (no cross-org testing)
            if (!targetOrg) {
                // console.log('[DEBUG] No target org provided, using source org as target...');
                const orgs = await this.auth.getAuthenticatedOrgs();
                targetOrg = orgs.find(org => org.orgId === snapshot.metadata.sourceOrgId);
                if (!targetOrg) {
                    throw new Error(`Source org with ID ${snapshot.metadata.sourceOrgId} not found in authenticated orgs. Please re-authenticate.`);
                }
                // console.log(`[DEBUG] Using source org as target: ${targetOrg.alias || targetOrg.username}`);
            }
            
            // console.log(`[DEBUG] Using target org: ${targetOrg.alias || targetOrg.username}`);
            progressCallback?.(15, 'Validating org connection...');

            // Step 2: Validate target org connection
            // console.log('[DEBUG] Step 2: Validating org connection...');
            const isConnected = await this.auth.validateOrgConnection(targetOrg.username);
            if (!isConnected) {
                throw new Error(`Cannot connect to target org: ${targetOrg.username}`);
            }
            progressCallback?.(25, 'Validating products in target org...');

            // Step 3: Pre-flight validation - check if products exist in target org
            // console.log('[DEBUG] Step 3: Validating products in target org...');
            await this.validateProductsInTargetOrg(snapshot, targetOrg);
            progressCallback?.(35, 'Preparing quote request...');

            // Step 4: Prepare the quote request
            // console.log('[DEBUG] Step 4: Preparing quote request...');
            const quoteRequest = await this.prepareQuoteRequest(snapshot, targetOrg);
            progressCallback?.(45, 'Creating quote in target org...');

            // Step 5: Place the quote in target org
            // console.log('[DEBUG] Step 5: Creating quote in target org...');
            const placeQuoteResponse = await this.api.placeQuote(targetOrg.username, quoteRequest);
            
            if (!placeQuoteResponse.success) {
                const testResult: TestResult = {
                    success: false,
                    snapshot,
                    targetOrg: targetOrg!,
                    errors: placeQuoteResponse.errors || ['Place Quote failed'],
                    detailedErrors: placeQuoteResponse.detailedErrors,
                    executionTime: Date.now() - startTime
                };
                return testResult;
            }
            progressCallback?.(60, 'Waiting for pricing calculation to complete...');

            // Step 6: Wait for pricing calculation to complete and fetch results
            // console.log('[DEBUG] Step 6: Waiting for pricing calculation to complete...');
            // console.log(`[DEBUG] 🎯 Target quote: ${placeQuoteResponse.quoteId}`);
            // console.log(`[DEBUG] 🏢 Target org: ${targetOrg.username}`);
            
            let actualQuoteData: any;
            try {
                actualQuoteData = await this.waitForPricingCompletion(placeQuoteResponse.quoteId, targetOrg, progressCallback);
                // console.log(`[DEBUG] ✅ Pricing calculation completed and quote data fetched successfully`);
                // console.log(`[DEBUG] 📊 Quote Name: ${actualQuoteData.Name}`);
                // console.log(`[DEBUG] 📊 Line Items Count: ${actualQuoteData.QuoteLines?.length || 0}`);
                // console.log(`[DEBUG] 📊 Grand Total: ${actualQuoteData.GrandTotal || 'N/A'}`);
                // console.log(`[DEBUG] 📊 Currency: ${actualQuoteData.CurrencyIsoCode || 'N/A'}`);
            } catch (error: any) {
                console.error(`[ERROR] ❌ Failed to fetch quote data: ${error.message}`);
                console.error(`[ERROR] 📋 Quote ID that failed: ${placeQuoteResponse.quoteId}`);
                console.error(`[ERROR] 🏢 Org that failed: ${targetOrg.username}`);
                throw new Error(`Failed to fetch created quote data: ${error.message}`);
            }
            
            progressCallback?.(85, 'Comparing results...');

            // Step 7: Compare expected vs actual results
            // console.log('[DEBUG] Step 7: Comparing results...');
            // console.log(`[DEBUG] 🔍 Snapshot has ${snapshot.recreationPayload.lineItems.length} expected line items`);
            // console.log(`[DEBUG] 🔍 Actual quote has ${actualQuoteData.QuoteLines?.length || 0} line items`);
            
            let comparison: any;
            try {
                comparison = this.comparator.compare(snapshot, actualQuoteData);
                // console.log(`[DEBUG] ✅ Comparison completed successfully`);
                console.log(`[DEBUG] 📊 Comparison result structure:`);
                console.log(`[DEBUG]    - overallMatch: ${comparison.overallMatch}`);
                console.log(`[DEBUG]    - quote.fieldComparisons: ${comparison.quote?.fieldComparisons?.length || 'N/A'}`);
                console.log(`[DEBUG]    - lineItems: ${comparison.lineItems?.length || 'N/A'}`);
                console.log(`[DEBUG]    - summary present: ${!!comparison.summary}`);
            } catch (error: any) {
                console.error(`[ERROR] ❌ Comparison failed: ${error.message}`);
                console.error(`[ERROR] 📋 Error details: ${error.stack}`);
                throw new Error(`Failed to compare results: ${error.message}`);
            }

            // DETAILED COMPARISON DEBUG LOGGING
            console.log(`[DEBUG] 🔍 DETAILED COMPARISON RESULTS:`);
            console.log(`[DEBUG]   Overall Match: ${comparison.overallMatch ? '✅ PASS' : '❌ FAIL'}`);
            console.log(`[DEBUG]   Quote Fields Match: ${comparison.quote.overallMatch ? '✅' : '❌'}`);
            console.log(`[DEBUG]   Line Items Match: ${comparison.lineItems.every((li: any) => li.overallMatch) ? '✅' : '❌'}`);
            console.log(`[DEBUG]   Success Rate: ${comparison.summary.successRate.toFixed(2)}% (${comparison.summary.matchingFields}/${comparison.summary.totalFields} fields)`);
            
            // Log quote field discrepancies
            if (!comparison.quote.overallMatch) {
                console.log(`[DEBUG] ❌ QUOTE FIELD DISCREPANCIES:`);
                comparison.quote.fieldComparisons.forEach((fc: any) => {
                    if (!fc.match) {
                        console.log(`[DEBUG]   ❌ ${fc.fieldName}: Expected=${JSON.stringify(fc.expected)} | Actual=${JSON.stringify(fc.actual)} | Variance=${fc.variance || 'N/A'}`);
                    }
                });
            }
            
            // Log line item discrepancies  
            const failedLineItems = comparison.lineItems.filter((li: any) => !li.overallMatch);
            if (failedLineItems.length > 0) {
                console.log(`[DEBUG] ❌ LINE ITEM DISCREPANCIES:`);
                failedLineItems.forEach((li: any, index: number) => {
                    console.log(`[DEBUG]   ❌ Line Item ${index + 1} (${li.externalId}): Found=${li.found} | Match=${li.overallMatch}`);
                    if (li.found && li.fieldComparisons) {
                        li.fieldComparisons.forEach((fc: any) => {
                            if (!fc.match) {
                                console.log(`[DEBUG]     ❌ ${fc.fieldName}: Expected=${JSON.stringify(fc.expected)} | Actual=${JSON.stringify(fc.actual)} | Variance=${fc.variance || 'N/A'}`);
                            }
                        });
                    }
                });
            }
            
            // Log successful matches for reference
            const passedLineItems = comparison.lineItems.filter((li: any) => li.overallMatch);
            if (passedLineItems.length > 0) {
                console.log(`[DEBUG] ✅ SUCCESSFUL LINE ITEMS: ${passedLineItems.length}/${comparison.lineItems.length}`);
                passedLineItems.forEach((li: any, index: number) => {
                    console.log(`[DEBUG]   ✅ Line Item ${index + 1} (${li.externalId}): All ${li.fieldComparisons?.length || 0} fields match`);
                });
            }

            const executionTime = Date.now() - startTime;
            console.log(`[DEBUG] Pricing test completed in ${executionTime}ms. Result: ${comparison.overallMatch ? 'PASS' : 'FAIL'}`);
            progressCallback?.(95, 'Test completed!');

            console.log(`[DEBUG] 🏁 Building final test result object...`);
            console.log(`[DEBUG] 📊 Final result data:`);
            console.log(`[DEBUG]    - success: ${comparison.overallMatch}`);
            console.log(`[DEBUG]    - createdQuoteId: ${placeQuoteResponse.quoteId}`);
            console.log(`[DEBUG]    - snapshot present: ${!!snapshot}`);
            console.log(`[DEBUG]    - targetOrg present: ${!!targetOrg}`);
            console.log(`[DEBUG]    - actualQuoteData present: ${!!actualQuoteData}`);
            console.log(`[DEBUG]    - comparison present: ${!!comparison}`);
            console.log(`[DEBUG]    - executionTime: ${executionTime}ms`);
            
            const testResult = {
                success: comparison.overallMatch,
                snapshot,
                targetOrg,
                createdQuoteId: placeQuoteResponse.quoteId,
                actualQuoteData,
                comparison,
                executionTime
            };
            
            console.log(`[DEBUG] ✅ Test result object built successfully`);
            console.log(`[DEBUG] 🎯 Returning test result to caller...`);
            
            return testResult;

        } catch (error: any) {
            const executionTime = Date.now() - startTime;
            console.error('[ERROR] Test execution failed:', error);

            return {
                success: false,
                snapshot,
                targetOrg: targetOrg!,
                errors: [error.message],
                executionTime
            };
        }
    }

    /**
     * Run multiple tests in batch
     */
    async runBatchTests(snapshots: PricingSnapshot[], targetOrg: SalesforceOrg): Promise<TestResult[]> {
        const results: TestResult[] = [];
        
        for (let i = 0; i < snapshots.length; i++) {
            const snapshot = snapshots[i];
            
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Running test ${i + 1} of ${snapshots.length}`,
                cancellable: false
            }, async (progress) => {
                let currentProgress = 0;
                
                const progressCallback = (increment: number, message: string) => {
                    const progressIncrement = increment - currentProgress;
                    progress.report({ increment: progressIncrement, message });
                    currentProgress = increment;
                };
                
                progressCallback(0, `Testing: ${snapshot.metadata.description || snapshot.metadata.sourceQuoteId}`);
                
                const result = await this.runTest(snapshot, targetOrg, progressCallback);
                results.push(result);
                
                progressCallback(100, 'Test completed!');
            });
        }

        return results;
    }

    /**
     * Validate that all required products exist in the target org
     */
    private async validateProductsInTargetOrg(snapshot: PricingSnapshot, targetOrg: SalesforceOrg): Promise<void> {
        const config = vscode.workspace.getConfiguration('revCloudBlueprint');
        const externalIdField = config.get<string>('pricing.productExternalIdField', 'ProductCode');
        
        console.log(`[DEBUG] Validating products in target org using configured external ID field: ${externalIdField}`);
        const missingProducts = await this.api.validateProducts(targetOrg.username, snapshot.recreationPayload.lineItems, externalIdField);
        
        if (missingProducts.length > 0) {
            // Build helpful error message with configuration guidance
            const errorMessage = [
                `Products not found in target org using external ID field '${externalIdField}':`,
                ...missingProducts.map(id => `   • ${id}`),
                '',
                `💡 Troubleshooting:`,
                `   1. Verify products exist in target org: ${targetOrg.alias || targetOrg.username}`,
                `   2. Check that Product records have values in field '${externalIdField}'`,
                `   3. Confirm external ID field setting: Revcloud Blueprint → Settings → Product External Id Field`,
                `   4. Run 'sf data query --query "SELECT Id, Name, ${externalIdField} FROM Product2 WHERE ${externalIdField} != null LIMIT 5" --target-org ${targetOrg.alias || targetOrg.username}' to verify field values`,
                '',
                `🔧 Current setting: External ID Field = '${externalIdField}'`
            ].join('\n');
            
            console.error(`[ERROR] ${errorMessage}`);
            throw new Error(errorMessage);
        }
        
        console.log(`[DEBUG] All products validated successfully in target org`);
    }

    /**
     * Prepare the Place Sales Transaction API request using Revenue Cloud Connect API format
     * Based on: https://developer.salesforce.com/docs/atlas.en-us.256.0.revenue_lifecycle_management_dev_guide.meta/revenue_lifecycle_management_dev_guide/connect_resources_place_sales_transaction.htm
     */
    private async prepareQuoteRequest(snapshot: PricingSnapshot, targetOrg: SalesforceOrg): Promise<PlaceQuoteRequest> {

        // Step 1: Resolve Pricebook2Id by Name in target org
        let targetPricebook2Id: string | null = null;
        if (snapshot.recreationPayload.pricebook2Name) {
            targetPricebook2Id = await this.api.resolvePricebook2IdByName(targetOrg.username, snapshot.recreationPayload.pricebook2Name);
        }

        // Step 2: Resolve Product2 IDs for all line items
        const resolvedLineItems = await this.resolveProduct2Ids(snapshot.recreationPayload.lineItems, targetOrg);

        // Step 3: Enhanced PricebookEntry resolution with snapshot preference and intelligent fallback
        const quoteCurrency = snapshot.expectedResults.quoteFields.CurrencyIsoCode;
        
        // Check if any line items have captured PricebookEntryIds
        const itemsWithCapturedIds = resolvedLineItems.filter(item => item.sourceData?.PricebookEntryId);
        
        const pricebookEntryMap = await this.api.getPricebookEntriesWithSnapshotPreference(targetOrg.username, resolvedLineItems, snapshot.recreationPayload.pricebook2Name || null, quoteCurrency);
        
        // Check if we have PricebookEntries for all products
        const productIds = resolvedLineItems.map(item => item.product2Id);
        const missingEntries = productIds.filter(pid => !pricebookEntryMap.has(pid));
        if (missingEntries.length > 0) {
            const pricebookName = snapshot.recreationPayload.pricebook2Name || 'Standard Price Book';
            throw new Error(`Missing PricebookEntries in target org for products: ${missingEntries.join(', ')}. These products may not be available in the '${pricebookName}' or currencies may not match.`);
        }
        
        // Build the Place Quote API request with graph structure
        const records = [];
        
        // 1. Quote record (POST to create new quote)
        const quoteRecord = {
            referenceId: 'refQuote',
            record: {
                attributes: {
                    type: 'Quote' as const,
                    method: 'POST' as const
                },
                Name: snapshot.recreationPayload.quoteName || `Test - ${snapshot.metadata.sourceQuoteId}`,
                OpportunityId: targetOrg.testOpportunityId, // Use provided OpportunityId
                // Include writable Quote fields discovered via testing:
                // Name ✅, OpportunityId ✅, Pricebook2Id ✅, Status ✅, Tax ✅, ShippingHandling ✅
                // AccountId is derived from OpportunityId automatically
                Pricebook2Id: targetPricebook2Id, // Use resolved Pricebook2Id for target org
                Status: 'Draft', // Safe default for new quotes
                Tax: snapshot.expectedResults.quoteFields.Tax || 0,
                ShippingHandling: snapshot.expectedResults.quoteFields.ShippingHandling || 0,
                StartDate: snapshot.expectedResults.quoteFields.StartDate, // Include start date from source
                // Include all configured snap fields dynamically
                ...this.getConfiguredQuoteSnapFields(snapshot)
            }
        };
        records.push(quoteRecord);
        
        // 2. QuoteLineItem records (POST to create quote line items)
        console.log(`[DEBUG] 📋 Creating ${resolvedLineItems.length} quote line item records...`);
        
        // Helper function to ensure debug messages go to both console and VS Code output channel
        const debugLog = (message: string) => {
            console.log(message);
            const outputChannel = (global as any).revCloudBlueprintLogger;
            if (outputChannel) {
                outputChannel.appendLine(message);
            }
        };

        // Sort line items: Parents first, then children (to ensure parent line items are created before children reference them)
        const parentItems = resolvedLineItems.filter(item => !item.parentLineItemReference);
        const childItems = resolvedLineItems.filter(item => item.parentLineItemReference);
        const sortedLineItems = [...parentItems, ...childItems];
        
        console.log(`[DEBUG] 📦 Bundle analysis: ${parentItems.length} parent items, ${childItems.length} child items`);
        if (childItems.length > 0) {
            console.log(`[DEBUG] 🔗 Bundle structure detected - creating parents first, then children with proper references`);
        }

        const lineItemReferenceIds: string[] = [];
        const lineItemReferenceMap = new Map<string, string>(); // Map from composite key to reference ID
        
        /**
         * Create unique key for each line item to handle duplicate products in different parent-child contexts
         * This prevents the bug where duplicate products overwrite each other's reference mappings
         */
        const getLineItemKey = (item: any, index: number): string => {
            if (item.parentLineItemReference) {
                // Child item: include parent context to make it unique
                return `${item.productIdentifier.value}_child_of_${item.parentLineItemReference.parentProductIdentifier.value}_${index}`;
            } else {
                // Parent/standalone item: use product identifier with index
                return `${item.productIdentifier.value}_parent_${index}`;
            }
        };

        sortedLineItems.forEach((item, index) => {
            const referenceId = `refQuoteLineItem${index + 1}`;
            lineItemReferenceIds.push(referenceId);
            
            // Use composite key instead of just product identifier to handle duplicate products
            const lineItemKey = getLineItemKey(item, index);
            lineItemReferenceMap.set(lineItemKey, referenceId);
            
            console.log(`[DEBUG] 🗝️ Line item mapping: "${lineItemKey}" → ${referenceId}`);
            
            // DEBUG: Show complete mapping state
            console.log(`[DEBUG] 🗂️ Current lineItemReferenceMap state:`);
            lineItemReferenceMap.forEach((refId, key) => {
                console.log(`[DEBUG]   "${key}" → ${refId}`);
            });
            
            const subscriptionFields = this.buildSubscriptionFields(item, snapshot);
            const lineItemRecord = {
                referenceId: referenceId,
                record: {
                    attributes: {
                        type: 'QuoteLineItem' as const,
                        method: 'POST' as const
                    },
                    QuoteId: '@{refQuote.id}', // Reference to the quote being created
                    Product2Id: item.product2Id,
                    PricebookEntryId: pricebookEntryMap.get(item.product2Id), // Use resolved PricebookEntryId
                    Quantity: item.quantity,
                    // Standard fields  
                    SortOrder: index + 1, // Set sort order for proper display
                    Description: `Line ${index + 1} - ${item.productIdentifier.value}`,
                    // Note: Discount is NOT initialized to 0 - only added if there's an adjustment
                    // This preserves null values from the source snapshot
                    
                    // Add UnitPrice from source snapshot if available
                    ...(item.sourceData?.UnitPrice !== undefined && { UnitPrice: item.sourceData.UnitPrice }),
                    
                    // Add subscription/date fields from source snapshot to prevent END_DATE_MISSING
                    ...subscriptionFields
                } as any // Temporary any cast for flexible field assignment
            };
            
            // Add discount if specified in adjustments (only add if there's an actual value)
            if (item.adjustments && item.adjustments.length > 0) {
                const amountAdjustment = item.adjustments.find(adj => adj.type === 'Amount');
                if (amountAdjustment) {
                    lineItemRecord.record.Discount = amountAdjustment.value;
                    console.log(`[DEBUG] 💰 Adding Discount from adjustment for ${item.productIdentifier.value}: ${amountAdjustment.value}`);
                }
            }
            
            // DEBUG: Check if UnitPrice was included from source snapshot
            if (item.sourceData?.UnitPrice !== undefined) {
                console.log(`[DEBUG] 💰 Including UnitPrice from source snapshot for ${item.productIdentifier.value}: ${item.sourceData.UnitPrice}`);
            } else {
                console.log(`[DEBUG] 💰 No UnitPrice in source snapshot for ${item.productIdentifier.value} - pricing engine will calculate`);
            }
            
            // DEBUG: Show the complete QuoteLineItem record being created
            console.log(`[DEBUG] 🔧 FINAL QuoteLineItem record for ${item.productIdentifier.value}:`, JSON.stringify(lineItemRecord.record, null, 2));
            
            // DEBUG: Specific check for ConstraintEngineNodeStatus__c in final record
            if (lineItemRecord.record.ConstraintEngineNodeStatus__c !== undefined) {
                console.log(`[DEBUG] ✅ FINAL RECORD: ConstraintEngineNodeStatus__c IS included in QuoteLineItem payload`);
            } else {
                console.log(`[DEBUG] ❌ FINAL RECORD: ConstraintEngineNodeStatus__c is NOT included in QuoteLineItem payload`);
            }
            
            // Note: ParentQuoteLineItemId is not writeable - we'll create QuoteLineRelationship records instead
            
            records.push(lineItemRecord);
        });

        // 3. QuoteLineRelationship records (POST to create parent-child relationships for bundles)
        console.log(`[DEBUG] 📦 Creating QuoteLineRelationship records for bundle structure...`);
        let relationshipRecordCount = 0;
        
        // Use captured QuoteLineRelationship data from snapshot instead of querying ProductRelatedComponent
        console.log(`[DEBUG] 📦 Using captured QuoteLineRelationship data from snapshot for bundle structure...`);
        const capturedRelationshipMap = new Map<string, {productRelatedComponentId: string, productRelationshipTypeId: string}>();
        
        // Build map from captured snapshot data
        for (let itemIndex = 0; itemIndex < sortedLineItems.length; itemIndex++) {
            const item = sortedLineItems[itemIndex];
            if (item.parentLineItemReference && item.parentLineItemReference.productRelatedComponentId && item.parentLineItemReference.productRelationshipTypeId) {
                capturedRelationshipMap.set(item.product2Id, {
                    productRelatedComponentId: item.parentLineItemReference.productRelatedComponentId,
                    productRelationshipTypeId: item.parentLineItemReference.productRelationshipTypeId
                });
                console.log(`[DEBUG] 📦 Using captured relationship data: Product2Id=${item.product2Id}, ProductRelatedComponentId=${item.parentLineItemReference.productRelatedComponentId}, ProductRelationshipTypeId=${item.parentLineItemReference.productRelationshipTypeId}`);
            }
        }

        // Now create QuoteLineRelationship records with ProductRelationshipTypeId and ProductRelatedComponentId
        for (let itemIndex = 0; itemIndex < sortedLineItems.length; itemIndex++) {
            const item = sortedLineItems[itemIndex];
            const childReferenceId = lineItemReferenceIds[itemIndex];

            if (item.parentLineItemReference) {
                // Find parent reference using composite key system
                // Look for parent item with matching product identifier that is NOT a child itself
                const parentProductId = item.parentLineItemReference.parentProductIdentifier.value;
                let parentReferenceId: string | undefined;

                // Find the parent item in sortedLineItems to get its composite key
                const parentItemIndex = sortedLineItems.findIndex(parentItem =>
                    parentItem.productIdentifier.value === parentProductId &&
                    !parentItem.parentLineItemReference  // Ensure we find the parent, not another child
                );

                if (parentItemIndex >= 0) {
                    const parentItem = sortedLineItems[parentItemIndex];
                    const parentCompositeKey = getLineItemKey(parentItem, parentItemIndex);
                    parentReferenceId = lineItemReferenceMap.get(parentCompositeKey);
                }

                const capturedRelationship = capturedRelationshipMap.get(item.product2Id);

                if (parentReferenceId && capturedRelationship) {
                    // Get bundle configuration from snapshot (with fallbacks for backward compatibility)
                    const bundleConfig = item.parentLineItemReference.bundleConfiguration || {};
                    
                    // 1. AssociatedQuoteLinePricing - Dynamic based on DoesBundlePriceIncludeChild
                    const associatedQuoteLinePricing = bundleConfig.doesBundlePriceIncludeChild === true 
                        ? "IncludedInBundlePrice" 
                        : "NotIncludedInBundlePrice";
                    
                    // 2. AssociatedQuantScaleMethod - Conditional based on QuantityScaleMethod
                    let associatedQuantScaleMethod: string | undefined;
                    if (bundleConfig.quantityScaleMethod === 'Constant') {
                        associatedQuantScaleMethod = "Constant";
                    } else if (bundleConfig.quantityScaleMethod === 'Proportional') {
                        associatedQuantScaleMethod = "Proportional";
                    }
                    // If None, blank, or null - omit the field (undefined)

                    const relationshipRecord: any = {
                        referenceId: `refQuoteLineRelationship${relationshipRecordCount + 1}`,
                        record: {
                            attributes: {
                                type: 'QuoteLineRelationship' as const,
                                method: 'POST' as const
                            },
                            MainQuoteLineId: `@{${parentReferenceId}.id}`, // Parent quote line
                            AssociatedQuoteLineId: `@{${childReferenceId}.id}`, // Child quote line
                            ProductRelationshipTypeId: capturedRelationship.productRelationshipTypeId,
                            ProductRelatedComponentId: capturedRelationship.productRelatedComponentId,
                            // Dynamic fields based on bundle configuration
                            AssociatedQuoteLinePricing: associatedQuoteLinePricing
                            // MainQuoteLineRole: OMITTED (auto-populated by Salesforce)
                            // AssociatedQuoteLineRole: OMITTED (auto-populated by Salesforce)
                        }
                    };
                    
                    // Conditionally add AssociatedQuantScaleMethod only if it has a value
                    if (associatedQuantScaleMethod) {
                        relationshipRecord.record.AssociatedQuantScaleMethod = associatedQuantScaleMethod;
                    }
                    
                    records.push(relationshipRecord);
                    relationshipRecordCount++;
                } else if (parentReferenceId && !capturedRelationship) {
                    console.warn(`[WARN] ⚠️ Skipping relationship creation for ${item.productIdentifier.value} - No captured relationship data found in snapshot`);
                } else {
                    console.warn(`[WARN] ⚠️ Skipping relationship creation for ${item.productIdentifier.value} - Parent reference not found: ${item.parentLineItemReference.parentProductIdentifier.value}`);
                }
            }
        }
        
        if (relationshipRecordCount > 0) {
            console.log(`[DEBUG] 📦 Created ${relationshipRecordCount} QuoteLineRelationship records for bundle structure`);
        } else {
            console.log(`[DEBUG] 📦 No bundle relationships detected - all line items are standalone`);
        }

        // 4. QuoteLineItemAttribute records (POST to create quote line item attributes)
        let attributeRecordCount = 0;
        for (let itemIndex = 0; itemIndex < sortedLineItems.length; itemIndex++) {
            const item = sortedLineItems[itemIndex];
            const lineItemReferenceId = lineItemReferenceIds[itemIndex];
            
            if (item.attributes && item.attributes.length > 0) {
                console.log(`[DEBUG] Processing ${item.attributes.length} attributes for line item ${itemIndex + 1}`);
                
                // Resolve attribute external IDs to actual IDs in target org
                const resolvedAttributes = await this.resolveAttributeIds(item.attributes, targetOrg);
                
                resolvedAttributes.forEach((attr, attrIndex) => {
                    attributeRecordCount++;
                    const attributeRecord: any = {
                        referenceId: `refAttribute${itemIndex + 1}_${attrIndex + 1}`,
                        record: {
                            attributes: {
                                type: 'QuoteLineItemAttribute' as const,
                                method: 'POST' as const,
                                id: null
                            },
                            QuoteLineItemId: `@{${lineItemReferenceId}.id}`, // Reference to the line item being created
                            AttributeDefinitionId: attr.attributeDefinitionId
                        }
                    };
                    
                    // Add either picklist value ID or text value based on attribute type
                    if (attr.isPicklistAttribute) {
                        attributeRecord.record.AttributePicklistValueId = attr.attributePicklistValueId;
                        console.log(`[DEBUG] 📋 Adding picklist attribute: ${attr.attributeDefinitionName} = ${attr.attributePicklistValueName || attr.attributePicklistValueId}`);
                    } else {
                        attributeRecord.record.AttributeValue = attr.attributeTextValue;
                        console.log(`[DEBUG] 📝 Adding text attribute: ${attr.attributeDefinitionName} = "${attr.attributeTextValue}"`);
                    }
                    
                    records.push(attributeRecord);
                });
            }
        }
        
        console.log(`[DEBUG] Added ${attributeRecordCount} QuoteLineItemAttribute records to payload`);
        
        // Build the complete Place Sales Transaction API request
        const placeQuoteRequest: PlaceQuoteRequest = {
            pricingPref: 'force', // Force pricing during quote creation (no Apex needed) 
            // Remove catalogRatesPref to avoid usage-based product requirements
            configurationPref: {
                configurationMethod: 'Skip', // Skip configuration for simplicity
                configurationOptions: {
                    validateProductCatalog: false, // Disable validation that might require special features
                    validateAmendRenewCancel: false,
                    executeConfigurationRules: false,
                    addDefaultConfiguration: false
                }
            },
            graph: {
                graphId: `pricing-test-${Date.now()}`, // Unique graph ID
                records: records
            }
        };

        console.log(`[DEBUG] Built Place Sales Transaction API request:`);
        console.log(`[DEBUG]   Quote Name: ${quoteRecord.record.Name}`);
        console.log(`[DEBUG]   Opportunity ID: ${targetOrg.testOpportunityId}`);
        console.log(`[DEBUG]   Pricebook2 ID: ${targetPricebook2Id || 'Standard Price Book'}`);
        console.log(`[DEBUG]   Line Items: ${resolvedLineItems.length}`);
        console.log(`[DEBUG]   Pricing Preference: ${placeQuoteRequest.pricingPref}`);
        console.log(`[DEBUG]   Graph Records: ${records.length}`);

        return placeQuoteRequest;
    }

    /**
     * Resolve attribute external IDs to actual Salesforce IDs in target org
     * Handles both picklist and text attributes based on dataType
     */
    private async resolveAttributeIds(attributes: any[], targetOrg: SalesforceOrg): Promise<any[]> {
        console.log(`[DEBUG] 🎯 Resolving attribute external IDs for ${attributes.length} attributes in target org`);
        
        const config = vscode.workspace.getConfiguration('revCloudBlueprint');
        const attrDefExternalIdField = config.get<string>('pricing.attributeDefinitionExternalIdField', 'Code');
        const attrPicklistExternalIdField = config.get<string>('pricing.attributePicklistValueExternalIdField', 'Code');
        
        // Separate attributes by type
        const picklistAttributes = attributes.filter(attr => attr.dataType === 'Picklist');
        const textAttributes = attributes.filter(attr => attr.dataType !== 'Picklist');
        
        console.log(`[DEBUG] 📋 Found ${picklistAttributes.length} picklist attributes`);
        console.log(`[DEBUG] 📝 Found ${textAttributes.length} text/other attributes`);
        
        // Extract unique external IDs for AttributeDefinition (needed for all attributes)
        const attrDefExternalIds = [...new Set(attributes.map(attr => attr.attributeDefinition.value))];
        
        // Extract unique external IDs for AttributePicklistValue (only for picklist attributes)
        const attrPicklistExternalIds = [...new Set(picklistAttributes
            .filter(attr => attr.attributePicklistValue?.value)
            .map(attr => attr.attributePicklistValue.value))];
        
        console.log(`[DEBUG] Resolving ${attrDefExternalIds.length} AttributeDefinition external IDs using field: ${attrDefExternalIdField}`);
        console.log(`[DEBUG] Resolving ${attrPicklistExternalIds.length} AttributePicklistValue external IDs using field: ${attrPicklistExternalIdField}`);
        
        // Resolve external IDs in parallel
        const attrDefMap = await this.api.resolveAttributeDefinitionIds(targetOrg.username, attrDefExternalIds, attrDefExternalIdField);
        
        let attrPicklistMap = new Map<string, string>();
        if (attrPicklistExternalIds.length > 0) {
            attrPicklistMap = await this.api.resolveAttributePicklistValueIds(targetOrg.username, attrPicklistExternalIds, attrPicklistExternalIdField);
        }
        
        // Build resolved attributes array
        const resolvedAttributes = [];
        const missingAttrDefs: string[] = [];
        const missingAttrPicklistValues: string[] = [];
        
        for (const attr of attributes) {
            const attrDefExternalId = attr.attributeDefinition.value;
            const isPicklistAttribute = attr.dataType === 'Picklist';
            
            const attributeDefinitionId = attrDefMap.get(attrDefExternalId);
            
            if (!attributeDefinitionId) {
                missingAttrDefs.push(attrDefExternalId);
                console.warn(`[WARN] AttributeDefinition not found in target org: ${attrDefExternalId}`);
                continue;
            }
            
            const resolvedAttr: any = {
                attributeDefinitionId,
                attributeDefinitionName: attr.attributeDefinitionName,
                isPicklistAttribute,
                dataType: attr.dataType
            };
            
            if (isPicklistAttribute) {
                // Handle picklist attributes
                const attrPicklistExternalId = attr.attributePicklistValue?.value;
                const attributePicklistValueId = attrPicklistMap.get(attrPicklistExternalId);
                
                if (!attributePicklistValueId && attrPicklistExternalId) {
                    missingAttrPicklistValues.push(attrPicklistExternalId);
                    console.warn(`[WARN] AttributePicklistValue not found in target org: ${attrPicklistExternalId}`);
                    continue;
                }
                
                resolvedAttr.attributePicklistValueId = attributePicklistValueId;
                resolvedAttr.attributePicklistValueName = attr.attributePicklistValueName;
                console.log(`[DEBUG] 📋 Resolved picklist attribute: ${attrDefExternalId} -> ${attributeDefinitionId}, ${attrPicklistExternalId} -> ${attributePicklistValueId}`);
            } else {
                // Handle text/number/date/currency/percent/checkbox attributes
                resolvedAttr.attributeTextValue = attr.attributeTextValue;
                console.log(`[DEBUG] 📝 Resolved text attribute: ${attrDefExternalId} -> ${attributeDefinitionId}, value: "${attr.attributeTextValue}"`);
            }
            
            resolvedAttributes.push(resolvedAttr);
        }
        
        // Report any missing attributes
        if (missingAttrDefs.length > 0) {
            throw new Error(`AttributeDefinition records not found in target org (using field '${attrDefExternalIdField}'): ${missingAttrDefs.join(', ')}. Please verify these records exist in the target org.`);
        }
        
        if (missingAttrPicklistValues.length > 0) {
            throw new Error(`AttributePicklistValue records not found in target org (using field '${attrPicklistExternalIdField}'): ${missingAttrPicklistValues.join(', ')}. Please verify these records exist in the target org.`);
        }
        
        console.log(`[DEBUG] ✅ Successfully resolved ${resolvedAttributes.length} attributes (${picklistAttributes.length} picklist, ${textAttributes.length} text/other)`);
        return resolvedAttributes;
    }

    /**
     * Resolve Product2 IDs from productIdentifier values
     */
    private async resolveProduct2Ids(lineItems: any[], targetOrg: SalesforceOrg): Promise<Array<{product2Id: string, quantity: number, productIdentifier: any, adjustments?: any[], attributes?: any[], parentLineItemReference?: any, sourceData?: any}>> {
        // console.log('[DEBUG] Resolving Product2 IDs for line items...');
        
        const config = vscode.workspace.getConfiguration('revCloudBlueprint');
        const externalIdField = config.get<string>('pricing.productExternalIdField', 'ProductCode');
        
        const resolvedItems = [];
        
        for (const item of lineItems) {
            let product2Id = '';
            
            if (item.productIdentifier.type === 'productId') {
                // Already a Product2 ID
                product2Id = item.productIdentifier.value;
                console.log(`[DEBUG] Using Product2 ID directly: ${product2Id}`);
            } else {
                // External ID - need to resolve to Product2 ID
                const externalIdValue = item.productIdentifier.value;
                const field = item.productIdentifier.externalIdField || externalIdField;
                
                console.log(`[DEBUG] Resolving external ID '${externalIdValue}' using field '${field}'...`);
                
                try {
                    const query = `SELECT Id FROM Product2 WHERE ${field} = '${externalIdValue}' AND IsActive = true LIMIT 1`;
                    const result = await this.api.query(targetOrg.username, query);
                    
                    if (result.records && result.records.length > 0) {
                        product2Id = result.records[0].Id;
                        console.log(`[DEBUG] Resolved ${externalIdValue} → ${product2Id}`);
                    } else {
                        throw new Error(`Product not found with ${field} = '${externalIdValue}'`);
                    }
                } catch (error: any) {
                    console.error(`[ERROR] Failed to resolve product ${externalIdValue}: ${error.message}`);
                    throw new Error(`Failed to resolve product ${externalIdValue} using field ${field}: ${error.message}`);
                }
            }
            
            resolvedItems.push({
                product2Id: product2Id,
                quantity: item.quantity,
                productIdentifier: item.productIdentifier,
                adjustments: item.adjustments,
                attributes: item.attributes,
                parentLineItemReference: item.parentLineItemReference,
                sourceData: item.sourceData // CRITICAL: Preserve sourceData including ConstraintEngineNodeStatus__c
            });
        }
        
        console.log(`[DEBUG] Successfully resolved ${resolvedItems.length} Product2 IDs`);
        return resolvedItems;
    }

    /**
     * Clean up test data (delete created quotes)
     */
    async cleanupTestData(testResults: TestResult[]): Promise<void> {
        const deletePromises = testResults
            .filter(result => result.success && result.createdQuoteId)
            .map(async (result) => {
                try {
                    // Note: This would require delete permissions and might not be allowed in all orgs
                    // For now, we'll just log the quote IDs that were created
                    console.log(`Test quote created in ${result.targetOrg.username}: ${result.createdQuoteId}`);
                } catch (error) {
                    console.warn(`Could not clean up quote ${result.createdQuoteId}:`, error);
                }
            });

        await Promise.allSettled(deletePromises);
    }

    /**
     * Generate test summary report
     */
    generateSummaryReport(testResults: TestResult[]): string {
        const totalTests = testResults.length;
        const passedTests = testResults.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;
        
        const avgExecutionTime = testResults.reduce((sum, r) => sum + r.executionTime, 0) / totalTests;

        let summary = `# Pricing Test Summary\n\n`;
        summary += `**Total Tests:** ${totalTests}\n`;
        summary += `**Passed:** ${passedTests} ✅\n`;
        summary += `**Failed:** ${failedTests} ❌\n`;
        summary += `**Success Rate:** ${((passedTests / totalTests) * 100).toFixed(1)}%\n`;
        summary += `**Average Execution Time:** ${(avgExecutionTime / 1000).toFixed(2)}s\n\n`;

        if (failedTests > 0) {
            summary += `## Failed Tests\n\n`;
            testResults
                .filter(r => !r.success)
                .forEach((result, index) => {
                    summary += `### ${index + 1}. ${result.snapshot.metadata.description || result.snapshot.metadata.sourceQuoteId}\n`;
                    summary += `**Error:** ${result.errors?.join(', ') || 'Unknown error'}\n`;
                    summary += `**Execution Time:** ${(result.executionTime / 1000).toFixed(2)}s\n\n`;
                });
        }

        return summary;
    }

    /**
     * Build subscription and date fields from the snapshot to prevent END_DATE_MISSING errors
     */
    private buildSubscriptionFields(item: any, snapshot: PricingSnapshot): any {
        const subscriptionFields: any = {};
        
        // Try to use actual subscription data from the snapshot if available
        // The snapshot should contain the actual subscription/date fields from the source quote
        
        // DEBUG: Show the complete item structure being processed
        console.log(`[DEBUG] 🔍 ITEM STRUCTURE ANALYSIS for ${item.productIdentifier?.value || 'unknown product'}:`);
        console.log(`[DEBUG]   item keys: ${Object.keys(item).join(', ')}`);
        console.log(`[DEBUG]   item.sourceData exists: ${item.sourceData !== undefined}`);
        console.log(`[DEBUG]   item.sourceData type: ${typeof item.sourceData}`);
        
        // Look for subscription fields in the line item data from the snapshot
        const sourceLineItemData = item.sourceData || {}; // This would contain the original QuoteLineItem data
        
        // Dynamic field discovery from sourceData - no hardcoded SBQQ__ assumptions
        const sourceFields = Object.keys(sourceLineItemData);
        console.log(`[DEBUG] 🔍 Available source fields for dynamic mapping:`, sourceFields);
        
        // SPECIFIC DEBUG: Check for ConstraintEngineNodeStatus__c field
        const hasConstraintField = sourceFields.includes('ConstraintEngineNodeStatus__c');
        console.log(`[DEBUG] 🔧 CONSTRAINT FIELD CHECK: ConstraintEngineNodeStatus__c present in sourceData = ${hasConstraintField}`);
        if (hasConstraintField) {
            const constraintValue = sourceLineItemData['ConstraintEngineNodeStatus__c'];
            console.log(`[DEBUG] 🔧 ConstraintEngineNodeStatus__c value: ${JSON.stringify(constraintValue).substring(0, 200)}...`);
        } else {
            console.log(`[DEBUG] 🔧 Available fields in sourceData: ${sourceFields.join(', ')}`);
            console.log(`[DEBUG] 🔧 Full sourceData object:`, JSON.stringify(sourceLineItemData, null, 2));
            console.log(`[DEBUG] 🔧 Full item object structure:`, JSON.stringify(item, null, 2).substring(0, 1000));
        }
        
        // Configuration-driven field extraction - ONLY use fields from settings.json
        let configuredSnapFields: string[] = [];
        try {
            const config = ConfigReader.getConfig();
            configuredSnapFields = config.pricing.snapFields.quoteLineItem.fields;
            console.log(`[DEBUG] 📋 Using configured snap fields: ${configuredSnapFields.join(', ')}`);
        } catch (error: any) {
            console.warn(`[WARN] Failed to load configured snap fields: ${error.message}`);
            configuredSnapFields = [];
        }
        
        // Extract only configured fields - no pattern matching or field categorization
        const availableConfiguredFields = sourceFields.filter(field => 
            configuredSnapFields.includes(field)
        );
        
        console.log(`[DEBUG] 📋 Available configured fields in source data: ${availableConfiguredFields.join(', ')}`);
        
        // Extract ONLY configured snap fields - completely configuration-driven
        availableConfiguredFields.forEach(fieldName => {
            // Check if field exists and get its value
            const fieldExists = fieldName in sourceLineItemData;
            const fieldValue = sourceLineItemData[fieldName];
            
            // Apply ALL configured snap fields, including null/blank/0 values (user's requirement)
            subscriptionFields[fieldName] = fieldValue !== undefined ? fieldValue : null;
            console.log(`[DEBUG] ✅ Using configured snap field ${fieldName}: ${fieldValue} (including null/blank/0 values) - InSource: ${fieldExists ? '✅' : '❌'}`);
        });
        
        // Apply intelligent defaults using the service (only if no configured fields provide the needed data)
        const fieldsWithDefaults = RevenueCloudService.applyIntelligentDefaults(subscriptionFields, 'QuoteLineItem');
        Object.assign(subscriptionFields, fieldsWithDefaults);
        
        // Add required fields for creation (per user requirements)
        // Pass sourceLineItemData and org features to conditionally include feature-dependent fields
        const creationRequiredFields = FieldDiscoveryService.getQuoteLineItemCreationRequiredFields(sourceLineItemData);
        creationRequiredFields.forEach(requiredField => {
            // Special handling for Revenue Cloud fields - always include them (even if null in source)
            if (requiredField === 'StartDate' || requiredField === 'EndDate' || 
                requiredField === 'StartQuantity' || requiredField === 'ConstraintEngineNodeStatus__c') {
                if (subscriptionFields[requiredField] === undefined) {
                    // Use source data if available, otherwise set to null to ensure field is included
                    subscriptionFields[requiredField] = sourceLineItemData[requiredField] !== undefined 
                        ? sourceLineItemData[requiredField] 
                        : null;
                    console.log(`[DEBUG] ✅ Added required subscription field ${requiredField}: ${requiredField === 'ConstraintEngineNodeStatus__c' ? '[JSON object]' : subscriptionFields[requiredField]} (always included for Revenue Cloud scenarios)`);
                }
            } else {
                // Standard logic for other required fields
                if (sourceLineItemData[requiredField] !== undefined && subscriptionFields[requiredField] === undefined) {
                    subscriptionFields[requiredField] = sourceLineItemData[requiredField];
                    console.log(`[DEBUG] ✅ Added required creation field ${requiredField}: ${subscriptionFields[requiredField]}`);
                }
            }
        });

        // Add essential fields when available (excluding calculated ones)
        const creationEssentialFields = FieldDiscoveryService.getQuoteLineItemCreationEssentialFields();
        creationEssentialFields.forEach(essentialField => {
            if (sourceLineItemData[essentialField] !== undefined && subscriptionFields[essentialField] === undefined) {
                subscriptionFields[essentialField] = sourceLineItemData[essentialField];
                console.log(`[DEBUG] ✅ Added essential creation field ${essentialField}: ${subscriptionFields[essentialField]}`);
            }
        });

        // Remove calculated fields that should not be written during creation
        const calculatedFields = FieldDiscoveryService.getQuoteLineItemCalculatedFields();
        calculatedFields.forEach(calculatedField => {
            if (subscriptionFields[calculatedField] !== undefined) {
                console.log(`[DEBUG] 🔢 Removing calculated field: ${calculatedField} (will be calculated by pricing engine)`);
                delete subscriptionFields[calculatedField];
            }
        });

        // Remove non-writable fields that may cause API errors
        const nonWritableFields = FieldDiscoveryService.getWriteProtectedFields();
        nonWritableFields.forEach(blacklistedField => {
            if (subscriptionFields[blacklistedField] !== undefined) {
                console.log(`[DEBUG] 🚫 Removing non-writable field: ${blacklistedField}`);
                delete subscriptionFields[blacklistedField];
            }
        });
        
        const finalFieldCount = Object.keys(subscriptionFields).length;
        console.log(`[DEBUG] ✅ Built ${finalFieldCount} fields from configuration: ${Object.keys(subscriptionFields).join(', ')}`);
        
        return subscriptionFields;
    }

    /**
     * Extract configured quote-level snap fields for quote creation
     */
    private getConfiguredQuoteSnapFields(snapshot: PricingSnapshot): any {
        const quoteSnapFields: any = {};
        
        try {
            // Get quote snap fields from the snapshot's recreation payload
            if (snapshot.recreationPayload.quoteSnapFields) {
                console.log(`[DEBUG] 📋 Applying Quote snap fields from snapshot:`);
                
                // Get calculated fields that should be excluded during creation
                const calculatedFields = FieldDiscoveryService.getQuoteCalculatedFields();
                
                Object.entries(snapshot.recreationPayload.quoteSnapFields).forEach(([fieldName, value]) => {
                    // Exclude calculated fields during quote creation
                    if (calculatedFields.includes(fieldName)) {
                        console.log(`[DEBUG] 🔢 Excluding calculated Quote field during creation: ${fieldName} (will be calculated by pricing engine)`);
                        return;
                    }
                    
                    // Apply ALL non-calculated configured snap fields, including null values (user's requirement)
                    quoteSnapFields[fieldName] = value;
                    console.log(`[DEBUG] ✅ Applying Quote snap field ${fieldName}: ${value} (including null/blank values)`);
                });
                
                console.log(`[DEBUG] 📋 Applied ${Object.keys(quoteSnapFields).length} Quote snap fields from snapshot`);
            } else {
                console.log(`[DEBUG] ⚠️ No Quote snap fields found in snapshot recreation payload`);
            }
        } catch (error: any) {
            console.error(`[ERROR] Failed to extract Quote snap fields: ${error.message}`);
        }
        
        return quoteSnapFields;
    }

}
