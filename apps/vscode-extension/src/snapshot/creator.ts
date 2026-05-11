import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SalesforceAuth, SalesforceOrg } from '../salesforce/auth';
import { SalesforceAPI, QuoteData, QuoteLineData, OpportunityData } from '../salesforce/api';
import { ConfigurationService } from '../services/configurationService';
import { FieldDiscoveryService } from '../services/fieldDiscoveryService';
import { ApiUtilityService } from '../services/apiUtilityService';
import { ConfigReader } from '../config/configReader';
import { Logger } from '../utils/logger';
import { OrgFeatureService, OrgFeatures } from '../services/orgFeatureService';
import { FileSystemService } from '../utils/fileSystemService';
import { AsyncJsonParser } from '../utils/asyncJsonParser';

export interface SnapshotMetadata {
    snapshotVersion: string;
    sourceOrgAlias?: string;
    sourceOrgUsername: string;
    sourceOrgId: string;
    sourceQuoteId: string;
    sourceOpportunityId?: string | null; // Allow null to preserve in JSON
    createdAt: string;
    description?: string;
    lastRefreshedAt?: string;
}

export interface ExpectedResults {
    quoteFields: {
        [key: string]: any; // Dynamically populated based on configured calculated fields
    };
    lineItems?: Array<{
        externalId: string;
        pricingFields: {
            [key: string]: any; // Dynamically populated based on configured calculated fields
        };
    }>;
}

export interface ProductIdentifier {
    type: 'externalId' | 'productId';
    externalIdField?: string;
    value: string;
    productName?: string; // Product2.Name for display purposes
}

export interface RecreationLineItem {
    productIdentifier: ProductIdentifier;
    quantity: number;
    adjustments?: Array<{
        type: 'Amount' | 'Percentage';
        value: number;
    }>;
    attributes?: Array<{
        attributeDefinition: {
            type: 'externalId' | 'id';
            externalIdField?: string;
            value: string;
        };
        // For picklist attributes
        attributePicklistValue?: {
            type: 'externalId' | 'id';
            externalIdField?: string;
            value: string | null;
        };
        // For text/number/date/currency/percent/checkbox attributes
        attributeTextValue?: string;
        attributeDefinitionName?: string;
        attributePicklistValueName?: string;
        // Store the datatype for debugging/reference
        dataType?: string;
    }>;
    // Bundle structure: Reference to parent line item for product bundles
    parentLineItemReference?: {
        sourceParentLineItemId: string; // Original parent ID from source org
        parentProductIdentifier: ProductIdentifier; // Parent product identifier for cross-org resolution
        productClassificationId?: string; // Classification ID if this product is classified (for QuoteLineRelationship)
        productRelationshipTypeId?: string; // Original relationship type from source
        productRelatedComponentId?: string; // Original ProductRelatedComponent ID from source
        // Bundle configuration from ProductRelatedComponent
        bundleConfiguration?: {
            doesBundlePriceIncludeChild?: boolean; // For AssociatedQuoteLinePricing determination
            quantityScaleMethod?: string; // For AssociatedQuantScaleMethod determination
            // Note: AssociatedQuoteLineRole is auto-populated by Salesforce, so we don't capture ChildProduct fields
        };
    };
    // Expected pricing results for validation after quote creation (based on configured calculated fields)
    expectedPricingFields: {
        [key: string]: any;
    };
    // Source data to preserve subscription/date fields from the original quote
    sourceData?: {
        [key: string]: any; // Original QuoteLineItem data from source org
    };
}

export interface RecreationPayload {
    accountId: string;
    quoteName: string;
    pricebook2Name?: string; // Pricebook2 Name for cross-org resolution
    sourceOpportunity?: OpportunityData | null; // Source org opportunity data for reference
    quoteSnapFields?: { [key: string]: any }; // Quote-level snap fields for recreation
    lineItems: RecreationLineItem[];
}

export interface PricingSnapshot {
    metadata: SnapshotMetadata;
    expectedResults: ExpectedResults;
    recreationPayload: RecreationPayload;
}

export class SnapshotCreator {
    private auth: SalesforceAuth;

    private api: SalesforceAPI;

    constructor(auth: SalesforceAuth) {
        this.auth = auth;
        this.api = new SalesforceAPI(auth);
    }

    /**
     * Create a pricing snapshot from a quote
     */
    async createSnapshot(): Promise<string | null> {
        try {
            Logger.debug('Starting snapshot creation process...', undefined, 'SnapshotCreator');
            
            // Step 1: Select source org
            const sourceOrg = await this.auth.selectOrg('Select Source Org (where the correct quote exists)');
            if (!sourceOrg) {
                Logger.debug('User cancelled org selection', undefined, 'SnapshotCreator');
                return null;
            }
            
            Logger.debug(`Selected source org: ${sourceOrg.alias || sourceOrg.username} (${sourceOrg.username})`, undefined, 'SnapshotCreator');

            // Step 2: Get quote ID from user with persistent retry logic
            const quoteId = await this.getQuoteIdWithRetry();
            if (!quoteId) {
                return null;
            }
            
            Logger.debug(`User entered Quote ID: ${quoteId}`, undefined, 'SnapshotCreator');

            // Step 3: Get optional description with better UX
            const description = await this.getDescriptionWithRetry();

            // Step 4: Validate quote exists and fetch data
            let filePath: string | null = null;
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Creating pricing snapshot...',
                cancellable: false
            }, async (progress) => {
                // Start indeterminate progress animation
                let progressValue = 0;
                const progressInterval = setInterval(() => {
                    progressValue = (progressValue + 5) % 100;
                    progress.report({ message: 'Fetching quote data...' });
                }, 150);

                try {
                    const outputChannel = (global as any).revCloudBlueprintLogger;
                    
                    Logger.debug('Progress: Starting quote data fetch...', undefined, 'SnapshotCreator');
                    outputChannel?.appendLine('[DEBUG] 📊 SNAPSHOT CREATION: Starting quote data fetch...');
                    const quoteData = await this.api.getQuoteData(sourceOrg.username, quoteId);
                    Logger.debug(`Quote data fetched successfully: ${quoteData.Name} with ${quoteData.QuoteLines.length} lines`, undefined, 'SnapshotCreator');
                    outputChannel?.appendLine(`[DEBUG] 📊 SNAPSHOT CREATION: Quote data fetched successfully: ${quoteData.Name} with ${quoteData.QuoteLines.length} lines`);
                    
                    // Update progress message
                    progress.report({ message: 'Building snapshot structure...' });
                    Logger.debug('Progress: Building snapshot...', undefined, 'SnapshotCreator');
                    outputChannel?.appendLine('[DEBUG] 📊 SNAPSHOT CREATION: Building snapshot...');
                    const snapshot = await this.buildSnapshot(sourceOrg, quoteData, description);
                    Logger.debug('Snapshot built successfully', undefined, 'SnapshotCreator');
                    outputChannel?.appendLine('[DEBUG] 📊 SNAPSHOT CREATION: Snapshot built successfully');
                    
                    // Update progress message
                    progress.report({ message: 'Saving snapshot file...' });
                    console.log('[DEBUG] Progress: Saving snapshot file...');
                    outputChannel?.appendLine('[DEBUG] 📊 SNAPSHOT CREATION: Saving snapshot file...');
                    filePath = await this.saveSnapshot(snapshot);
                    console.log('[DEBUG] Snapshot saved successfully');
                    outputChannel?.appendLine('[DEBUG] 📊 SNAPSHOT CREATION: Snapshot saved successfully');
                    
                    // DEBUG: Check what fields are actually in the snapshot
                    if (snapshot.recreationPayload.lineItems.length > 0) {
                        const firstLineItem = snapshot.recreationPayload.lineItems[0];
                        const sourceDataFields = firstLineItem.sourceData ? Object.keys(firstLineItem.sourceData) : [];
                        outputChannel?.appendLine(`[DEBUG] 📊 SNAPSHOT VERIFICATION: First line item source data fields: ${sourceDataFields.join(', ')}`);
                        
                        // Show configured snap fields from settings
                        const configuredSnapFields = this.getConfiguredSnapFields('quoteLineItem');
                        configuredSnapFields.forEach(field => {
                            const hasField = sourceDataFields.includes(field);
                            const fieldValue = firstLineItem.sourceData?.[field];
                            outputChannel?.appendLine(`[DEBUG] 📊 CONFIGURED FIELD CHECK: ${field} - Present: ${hasField ? '✅' : '❌'} - Value: ${fieldValue}`);
                        });
                    }
                    
                    // DEBUG: Check quote-level fields 
                    if (snapshot.recreationPayload.quoteSnapFields) {
                        const quoteFields = Object.keys(snapshot.recreationPayload.quoteSnapFields);
                        outputChannel?.appendLine(`[DEBUG] 📊 SNAPSHOT VERIFICATION: Quote snap fields: ${quoteFields.join(', ')}`);
                        // Show configured quote snap fields from settings
                        const configuredQuoteSnapFields = this.getConfiguredSnapFields('quote');
                        configuredQuoteSnapFields.forEach(field => {
                            const hasField = field in (snapshot.recreationPayload.quoteSnapFields || {});
                            const fieldValue = snapshot.recreationPayload.quoteSnapFields?.[field];
                            outputChannel?.appendLine(`[DEBUG] 📊 CONFIGURED QUOTE FIELD CHECK: ${field} - Present: ${hasField ? '✅' : '❌'} - Value: ${fieldValue}`);
                        });
                    }
                    
                    // Complete progress
                    progress.report({ message: 'Snapshot created successfully!' });
                    
                    vscode.window.showInformationMessage(`Pricing snapshot created successfully for Quote: ${quoteData.Name}`);
                } catch (error: any) {
                    console.error('Error creating snapshot:', error);
                    vscode.window.showErrorMessage(`Failed to create snapshot: ${error.message}`);
                } finally {
                    // Always clear the interval
                    clearInterval(progressInterval);
                }
            });

            return filePath;

        } catch (error: any) {
            console.error('Error in createSnapshot:', error);
            vscode.window.showErrorMessage(`Error: ${error.message}`);
            return null;
        }
    }

    /**
     * Build snapshot object from quote data
     */
    private async buildSnapshot(sourceOrg: SalesforceOrg, quoteData: QuoteData, description?: string): Promise<PricingSnapshot> {
        console.log(`[DEBUG] 🚀🚀🚀 BUILDSNAP ENTRY: buildSnapshot method started!`);
        console.log(`[DEBUG] 🚀 BUILDSNAP: sourceOrg.username = ${sourceOrg.username}`);
        console.log(`[DEBUG] 🚀 BUILDSNAP: quoteData.Id = ${quoteData.Id}`);
        console.log(`[DEBUG] 🚀 BUILDSNAP: description = ${description || 'undefined'}`);
        
        const config = vscode.workspace.getConfiguration('revCloudBlueprint');
        const externalIdField = config.get<string>('pricing.productExternalIdField', 'ProductCode');
        
        console.log(`[DEBUG] 🚀 BUILDSNAP: externalIdField = ${externalIdField}`);

        // CRITICAL DEBUG: Check if OpportunityId is populated
        const hasOpportunityId = quoteData.OpportunityId && quoteData.OpportunityId.trim() !== '';
        
        console.log(`[DEBUG] 🎯 OPPORTUNITY ID CHECK:`);
        console.log(`[DEBUG]   Quote ID: ${quoteData.Id}`);
        console.log(`[DEBUG]   Quote Name: ${quoteData.Name}`);
        console.log(`[DEBUG]   OpportunityId from quoteData: ${quoteData.OpportunityId || 'UNDEFINED/NULL'}`);
        console.log(`[DEBUG]   OpportunityId type: ${typeof quoteData.OpportunityId}`);
        console.log(`[DEBUG]   Has valid OpportunityId: ${hasOpportunityId}`);
        
        // Build metadata (ensure null values don't get filtered by JSON.stringify)
        const metadata: SnapshotMetadata = {
            snapshotVersion: '1.0',
            sourceOrgAlias: sourceOrg.alias,
            sourceOrgUsername: sourceOrg.username,
            sourceOrgId: sourceOrg.orgId,
            sourceQuoteId: quoteData.Id,
            sourceOpportunityId: hasOpportunityId && quoteData.OpportunityId ? quoteData.OpportunityId : null, // Use null instead of undefined to preserve in JSON
            createdAt: new Date().toISOString(),
            description: description
        };
        
        console.log(`[DEBUG]   Metadata sourceOpportunityId: ${metadata.sourceOpportunityId || 'NULL'}`);
        console.log(`[DEBUG]   sourceOpportunityId will be ${metadata.sourceOpportunityId ? 'included' : 'null'} in JSON`);

        // Get configured report fields for comparison
        Logger.debug(`🚀 BUILDSNAP: About to load and merge report fields...`, undefined, 'SnapshotCreator');
        
        // ALWAYS include these standard fields in reports
        // Get standard report fields from FieldDiscoveryService (per FIELD_GUIDE.md)
        const standardQuoteReportFields = FieldDiscoveryService.getRequiredQuoteReportFields();
        const standardQLIReportFields = FieldDiscoveryService.getRequiredQuoteLineItemReportFields();
        
        let configuredQuoteReportFields: string[] = [];
        let configuredQLIReportFields: string[] = [];
        Logger.debug(`🚀 BUILDSNAP: Initialized empty configured field arrays`, undefined, 'SnapshotCreator');
        
        try {
            Logger.debug(`🚀 BUILDSNAP: Loading additional configured report fields...`, undefined, 'SnapshotCreator');
            const pricingConfig = ConfigurationService.getModuleConfig('pricing');
            
            Logger.debug(`🔍 Raw pricing config object:`, pricingConfig, 'SnapshotCreator');
            Logger.debug(`🔍 pricingConfig.reportFields:`, pricingConfig.reportFields, 'SnapshotCreator');
            
            // Try to load additional configured fields (graceful handling if not present)
            let additionalQuoteFields: string[] = [];
            let additionalQLIFields: string[] = [];
            
            if (pricingConfig.reportFields?.quote?.fields) {
                additionalQuoteFields = pricingConfig.reportFields.quote.fields;
                Logger.debug(`📊 ✅ Found ${additionalQuoteFields.length} additional Quote report fields: [${additionalQuoteFields.join(', ')}]`, undefined, 'SnapshotCreator');
            } else {
                Logger.debug(`📊 ℹ️ No additional Quote report fields configured`, undefined, 'SnapshotCreator');
            }
            
            if (pricingConfig.reportFields?.quoteLineItem?.fields) {
                additionalQLIFields = pricingConfig.reportFields.quoteLineItem.fields;
                Logger.debug(`📊 ✅ Found ${additionalQLIFields.length} additional QuoteLineItem report fields: [${additionalQLIFields.join(', ')}]`, undefined, 'SnapshotCreator');
            } else {
                Logger.debug(`📊 ℹ️ No additional QuoteLineItem report fields configured`, undefined, 'SnapshotCreator');
            }
            
            // MERGE: Standard fields + Additional configured fields (remove duplicates)
            configuredQuoteReportFields = [...new Set([...standardQuoteReportFields, ...additionalQuoteFields])];
            configuredQLIReportFields = [...new Set([...standardQLIReportFields, ...additionalQLIFields])];
            
            Logger.debug(`📊 ✅ Final merged report fields:`, undefined, 'SnapshotCreator');
            Logger.debug(`  Quote fields (${configuredQuoteReportFields.length}): [${configuredQuoteReportFields.join(', ')}]`, undefined, 'SnapshotCreator');
            Logger.debug(`  QuoteLineItem fields (${configuredQLIReportFields.length}): [${configuredQLIReportFields.join(', ')}]`, undefined, 'SnapshotCreator');
            
        } catch (error: any) {
            console.error(`[ERROR] 🚀 BUILDSNAP: ❌ CONFIGURATION LOADING FAILED - Using standard fields only!`);
            console.error(`[ERROR] ❌ Failed to load additional configured report fields: ${error.message}`);
            console.error(`[ERROR] 📋 Error type: ${error.constructor?.name}`);
            console.error(`[ERROR] 📋 Error stack: ${error.stack}`);
            console.warn(`[WARN] 🔧 Using standard fields only (no additional configured fields)`);
            
            // Fallback to standard fields only
            configuredQuoteReportFields = [...standardQuoteReportFields];
            configuredQLIReportFields = [...standardQLIReportFields];
            
            console.log(`[DEBUG] 🔧 Standard Quote fields: [${configuredQuoteReportFields.join(', ')}]`);
            console.log(`[DEBUG] 🔧 Standard QuoteLineItem fields: [${configuredQLIReportFields.join(', ')}]`);
        }

        // Build expected results for quote-level fields using configured report fields
        console.log(`[DEBUG] 🚀 BUILDSNAP: Building quote fields for expectedResults...`);
        const quoteFields: any = {
            // Always include these core fields for cross-org resolution
            Pricebook2Id: quoteData.Pricebook2Id, 
            CurrencyIsoCode: quoteData.CurrencyIsoCode, 
            StartDate: quoteData.StartDate
        };
        
        console.log(`[DEBUG] 🚀 BUILDSNAP: Added core fields to quoteFields`);
        Logger.debug(`🚀 BUILDSNAP: About to process ${configuredQuoteReportFields.length} configured Quote report fields: [${configuredQuoteReportFields.join(', ')}]`, undefined, 'SnapshotCreator');
        
        // Add configured report Quote fields  
        configuredQuoteReportFields.forEach(fieldName => {
            Logger.debug(`🚀 BUILDSNAP: Processing Quote reportField: ${fieldName}`, undefined, 'SnapshotCreator');
            const quoteDataAsAny = quoteData as any;
            
            // Debug: Check field availability and value
            Logger.debug(`🔍 Quote field ${fieldName} - InQuoteData: ${fieldName in quoteDataAsAny ? '✅' : '❌'} - Value: ${JSON.stringify(quoteDataAsAny[fieldName])} - Type: ${typeof quoteDataAsAny[fieldName]}`, undefined, 'SnapshotCreator');
            
            // Capture field if it was queried (even if null)
            if (fieldName in quoteDataAsAny) {
                quoteFields[fieldName] = quoteDataAsAny[fieldName];
                Logger.debug(`📊 ✅ Captured Quote report field ${fieldName}: ${JSON.stringify(quoteDataAsAny[fieldName])}`, undefined, 'SnapshotCreator');
            } else {
                Logger.debug(`📊 ❌ Quote report field ${fieldName} not found in quoteData - field was not queried or doesn't exist`, undefined, 'SnapshotCreator');
                // Log available fields for debugging
                const availableFields = Object.keys(quoteDataAsAny).filter(key => key !== 'QuoteLines');
                Logger.debug(`📊 Available Quote fields: ${availableFields.join(', ')}`, undefined, 'SnapshotCreator');
            }
        });

        // Get configured snap fields for QuoteLineItem to include in expectedResults
        const configuredQLISnapFields = this.getConfiguredSnapFields('quoteLineItem');
        const allQLIFieldsForExpectedResults = [...new Set([...configuredQLIReportFields, ...configuredQLISnapFields])];
        
        console.log(`[DEBUG] 🎯 Building expectedResults.lineItems with ALL comparison fields...`);
        console.log(`[DEBUG] 📋 About to process ${quoteData.QuoteLines.length} quote lines`);
        console.log(`[DEBUG] 📋 Using configuredQLIReportFields: [${configuredQLIReportFields.join(', ')}]`);
        console.log(`[DEBUG] 📋 Using configuredQLISnapFields: [${configuredQLISnapFields.join(', ')}]`);
        console.log(`[DEBUG] 📋 Combined fields for expectedResults: [${allQLIFieldsForExpectedResults.join(', ')}]`);

        const expectedResults: ExpectedResults = {
            quoteFields,
            lineItems: quoteData.QuoteLines.map((line, index) => {
                console.log(`[DEBUG] 🔍 Processing line item ${index + 1} for expectedResults:`);
                console.log(`[DEBUG]   Product: ${line.Product2?.Name || line.Product2Id || 'Unknown'}`);
                console.log(`[DEBUG]   External ID: ${this.extractExternalId(line, externalIdField)}`);
                
                const pricingFields: any = {};
                
                console.log(`[DEBUG] 📊 Building pricingFields from ALL comparison fields (${allQLIFieldsForExpectedResults.length}):`);
                
                // Add both snap fields AND report fields for complete comparison
                allQLIFieldsForExpectedResults.forEach(fieldName => {
                    const lineAsAny = line as any;
                    console.log(`[DEBUG]   Checking field '${fieldName}': ${lineAsAny[fieldName] !== undefined ? 'EXISTS' : 'MISSING'} (value: ${lineAsAny[fieldName]})`);
                    
                    if (lineAsAny[fieldName] !== undefined) {
                        pricingFields[fieldName] = lineAsAny[fieldName];
                        console.log(`[DEBUG] ✅ Captured QLI field ${fieldName}: ${lineAsAny[fieldName]} for ${line.Product2?.Name || line.Product2Id}`);
                    } else {
                        console.log(`[DEBUG] ⚠️ Configured field '${fieldName}' not found in source line item`);
                    }
                });
                
                console.log(`[DEBUG] 📊 Final pricingFields object for ${line.Product2?.Name}:`, JSON.stringify(pricingFields, null, 2));
                
                const lineItemResult = {
                    externalId: this.extractExternalId(line, externalIdField),
                    pricingFields
                };
                
                console.log(`[DEBUG] 📋 Final line item result:`, JSON.stringify(lineItemResult, null, 2));
                return lineItemResult;
            })
        };
        
        console.log(`[DEBUG] 🏁 expectedResults built with ${expectedResults.lineItems?.length || 0} line items`);

        // CRITICAL DEBUG: Verify essential field capture
        console.log(`[DEBUG] 💰 QUOTE FIELD CAPTURE from Source Quote:`);
        console.log(`[DEBUG]   Quote ID: ${quoteData.Id}`);
        console.log(`[DEBUG]   Quote Currency: ${quoteData.CurrencyIsoCode || 'UNDEFINED/NULL'}`);
        console.log(`[DEBUG]   StartDate: ${quoteData.StartDate || 'UNDEFINED/NULL'}`);
        console.log(`[DEBUG]   Pricebook2Id: ${quoteData.Pricebook2Id || 'UNDEFINED/NULL'}`);
        
        // Log configured snap fields dynamically
        try {
            const pricingConfig = ConfigurationService.getModuleConfig('pricing');
            const configuredQuoteFields = pricingConfig.snapFields.quote.fields;
            console.log(`[DEBUG] 📋 Configured Quote snap fields captured:`);
            configuredQuoteFields.forEach((fieldName: string) => {
                console.log(`[DEBUG]   ${fieldName}: ${quoteData[fieldName] || 'UNDEFINED/NULL'}`);
            });
        } catch (error: any) {
            console.warn(`[WARN] Could not log configured fields: ${error.message}`);
        }
        
        if (!quoteData.CurrencyIsoCode) {
            console.log(`[DEBUG] ⚠️ CurrencyIsoCode is missing from source Quote - assuming single-currency org`);
            console.log(`[DEBUG] PricebookEntry matching will be done without currency filtering`);
        } else {
            console.log(`[DEBUG] ✅ Currency captured successfully for PricebookEntry filtering: ${quoteData.CurrencyIsoCode}`);
        }
        
        if (!quoteData.StartDate) {
            console.log(`[WARN] ⚠️ StartDate is missing from source Quote - target quote may not have start date populated`);
        } else {
            console.log(`[DEBUG] ✅ StartDate captured for proper quote timing`);
        }

        // Get Pricebook2 Name for cross-org matching
        let pricebook2Name = null;
        if (quoteData.Pricebook2Id) {
            try {
                console.log(`[DEBUG] Fetching Pricebook2 Name for ID: ${quoteData.Pricebook2Id}`);
                const pricebookQuery = `SELECT Id, Name FROM Pricebook2 WHERE Id = '${quoteData.Pricebook2Id}'`;
                const pricebookResult = await this.api.query(sourceOrg.username, pricebookQuery);
                if (pricebookResult.records.length > 0) {
                    pricebook2Name = pricebookResult.records[0].Name;
                    console.log(`[DEBUG] Found Pricebook2 Name: ${pricebook2Name}`);
                }
            } catch (error: any) {
                console.warn(`[WARN] Could not fetch Pricebook2 name: ${error.message}`);
            }
        }

        // Retrieve opportunity data from source org if available
        let sourceOpportunityData: OpportunityData | null = null;
        
        console.log(`[DEBUG] 🎯 OPPORTUNITY RETRIEVAL:`);
        console.log(`[DEBUG]   Has OpportunityId: ${hasOpportunityId}`);
        
        if (hasOpportunityId) {
            try {
                // Add null safety check before accessing OpportunityId
                if (!quoteData.OpportunityId) {
                    throw new Error('Quote does not have an associated Opportunity ID');
                }
                console.log(`[DEBUG] Fetching opportunity data for ID: ${quoteData.OpportunityId}`);
                sourceOpportunityData = await this.api.getOpportunityData(sourceOrg.username, quoteData.OpportunityId);
                console.log(`[DEBUG] ✅ Retrieved opportunity: ${sourceOpportunityData.Name} (${sourceOpportunityData.Id})`);
            } catch (error: any) {
                console.warn(`[WARN] ❌ Could not retrieve opportunity data: ${error.message}`);
                // Continue without opportunity data - it's optional
                sourceOpportunityData = null;
            }
        } else {
            console.log(`[DEBUG] ⏭️ Skipping opportunity retrieval - no OpportunityId on Quote`);
        }

        // Build recreation payload with proper external ID resolution
        console.log(`[DEBUG] Building recreation payload using external ID field: ${externalIdField}`);
        console.log(`[DEBUG] 🎯 RECREATION PAYLOAD OPPORTUNITY DATA:`);
        console.log(`[DEBUG]   sourceOpportunityData: ${sourceOpportunityData ? `Present (${sourceOpportunityData.Name})` : 'null'}`);
        
        // Extract quote-level snap fields for recreation
        const quoteSnapFields = this.extractQuoteSnapFields(quoteData);
        console.log(`[DEBUG] 📋 Extracted Quote snap fields:`, JSON.stringify(quoteSnapFields, null, 2));
        
        // Handle case where Quote might not have an Account relationship object (e.g., when no Opportunity is linked)
        // Try Account.Id first (relationship), then fall back to AccountId (direct field)
        const accountId = quoteData.Account?.Id || quoteData.AccountId;
        if (!accountId) {
            throw new Error('Quote does not have an associated Account. This extension requires quotes to be linked to an Account. Please ensure the Quote has either an OpportunityId (with Account) or a direct AccountId.');
        }
        
        console.log(`[DEBUG] 🎯 ACCOUNT RESOLUTION: Using ${quoteData.Account?.Id ? 'Account.Id (via relationship)' : 'AccountId (direct field)'}: ${accountId}`);

        const recreationPayload: RecreationPayload = {
            accountId: accountId, // This will need to be mapped to target org
            quoteName: `Regression Test - ${quoteData.Name}`,
            pricebook2Name: pricebook2Name, // Store Pricebook2 Name for cross-org resolution
            sourceOpportunity: sourceOpportunityData, // Store source opportunity data for reference (null if not available)
            quoteSnapFields: quoteSnapFields, // Quote-level snap fields for recreation
            lineItems: await this.buildLineItemsWithExternalIds(sourceOrg, quoteData.QuoteLines, externalIdField, configuredQLIReportFields)
        };
        
        console.log(`[DEBUG] 🎯 FINAL SNAPSHOT STRUCTURE CHECK:`);
        console.log(`[DEBUG]   metadata.sourceOpportunityId: ${metadata.sourceOpportunityId || 'UNDEFINED/NULL'}`);
        console.log(`[DEBUG]   recreationPayload.sourceOpportunity: ${recreationPayload.sourceOpportunity ? 'Present' : 'null'}`);
        console.log(`[DEBUG]   About to return snapshot with ${recreationPayload.lineItems.length} line items`);
        console.log(`[DEBUG] 🚀🚀🚀 BUILDSNAP COMPLETE: buildSnapshot method finishing successfully!`);

        return {
            metadata,
            expectedResults,
            recreationPayload
        };
    }

    /**
     * Build line items with proper external ID resolution from source org
     */
    private async buildLineItemsWithExternalIds(sourceOrg: SalesforceOrg, quoteLines: QuoteLineData[], externalIdField: string, configuredQLIReportFields: string[]): Promise<RecreationLineItem[]> {
        console.log(`[DEBUG] Building line items for ${quoteLines.length} products using external ID field: ${externalIdField}`);
        
        // Extract Product2 IDs from quote lines
        const productIds = quoteLines.map(line => line.Product2.Id);
        console.log(`[DEBUG] Product IDs to resolve: ${productIds.join(', ')}`);

        // Query source org to get external ID values for these products
        let productMap: { [productId: string]: any } = {};
        
        try {
            const productIdList = productIds.map(id => `'${id}'`).join(',');
            const query = `
                SELECT Id, Name, ProductCode, ${externalIdField}
                FROM Product2 
                WHERE Id IN (${productIdList})
            `;
            
            console.log(`[DEBUG] Querying source org for external IDs: ${query}`);
            const result = await this.api.query(sourceOrg.username, query);
            
            // Build product lookup map
            result.records.forEach(record => {
                productMap[record.Id] = record;
            });
            
            console.log(`[DEBUG] Retrieved ${result.records.length} product records from source org`);
            
        } catch (error: any) {
            console.error(`[ERROR] Failed to query products in source org: ${error.message}`);
            throw new Error(`Failed to query products in source org using field '${externalIdField}': ${error.message}. Please verify the external ID field is correct in Settings.`);
        }

        // Build line items with external ID resolution
        const lineItems: RecreationLineItem[] = [];
        const missingExternalIds: string[] = [];
        
        for (const line of quoteLines) {
            const product = productMap[line.Product2.Id];
            if (!product) {
                throw new Error(`Product not found in source org: ${line.Product2.Id}`);
            }

            // Get the external ID value from the configured field
            let externalIdValue = product[externalIdField];
            let identifierType: 'externalId' | 'productId' = 'externalId';

            // If configured field is empty/null, provide helpful guidance
            if (!externalIdValue || externalIdValue === null || externalIdValue === '') {
                console.log(`[DEBUG] Product ${product.Name} (${product.Id}) has no value in field '${externalIdField}'`);
                
                // Check if ProductCode has a value as alternative
                if (externalIdField !== 'ProductCode' && product.ProductCode) {
                    console.log(`[DEBUG] Product ${product.Name} has ProductCode: ${product.ProductCode}, but configured field '${externalIdField}' is empty`);
                    missingExternalIds.push(`${product.Name} (${product.Id}): '${externalIdField}' is empty, but 'ProductCode' = '${product.ProductCode}'`);
                } else {
                    missingExternalIds.push(`${product.Name} (${product.Id}): '${externalIdField}' is empty`);
                }
                
                // Fall back to Product2.Id for now, but mark as productId type
                externalIdValue = product.Id;
                identifierType = 'productId';
            } else {
                console.log(`[DEBUG] Product ${product.Name}: ${externalIdField} = '${externalIdValue}'`);
            }

            // Use the same configured report fields that were loaded earlier in buildSnapshot method
            // This ensures consistency between expectedResults.lineItems and recreationPayload.lineItems
            console.log(`[DEBUG] 🔍 buildLineItemsWithExternalIds: Using configured QLI report fields from buildSnapshot: [${configuredQLIReportFields.join(', ')}]`);
            
            if (configuredQLIReportFields.length === 0) {
                console.warn(`[WARN] 🔧 buildLineItemsWithExternalIds: No configured QLI report fields - using fallback defaults`);
                configuredQLIReportFields = ['NetUnitPrice', 'NetTotalPrice', 'UnitPrice', 'TotalPrice', 'Quantity'];
                console.log(`[DEBUG] 🔧 Fallback QLI report fields: [${configuredQLIReportFields.join(', ')}]`);
            }

            // Build expectedPricingFields from configured report fields ONLY 
            // NOTE: ConstraintEngineNodeStatus__c is intentionally EXCLUDED from report comparisons
            // as it contains internal engine state that shouldn't be compared between orgs
            console.log(`[DEBUG] 🎯 Building expectedPricingFields for ${product.Name} using ONLY configured report fields...`);
            const expectedPricingFields: any = {};
            
            configuredQLIReportFields.forEach(fieldName => {
                // Validate that ConstraintEngineNodeStatus__c is not accidentally added to report fields
                if (fieldName === 'ConstraintEngineNodeStatus__c') {
                    console.warn(`[WARN] ⚠️ ConstraintEngineNodeStatus__c found in reportFields configuration - this field should only be in snapFields, not reportFields`);
                    return;
                }
                
                const lineAsAny = line as any;
                console.log(`[DEBUG]   Checking configured report field '${fieldName}': ${lineAsAny[fieldName] !== undefined ? 'EXISTS' : 'MISSING'} (value: ${lineAsAny[fieldName]})`);
                
                if (lineAsAny[fieldName] !== undefined) {
                    expectedPricingFields[fieldName] = lineAsAny[fieldName];
                    console.log(`[DEBUG] ✅ Captured expected report field ${fieldName}: ${lineAsAny[fieldName]} for ${product.Name}`);
                } else {
                    console.log(`[DEBUG] ⚠️ Configured report field '${fieldName}' not found in source line item for ${product.Name}`);
                }
            });
            
            console.log(`[DEBUG] 🏁 Final expectedPricingFields for ${product.Name}:`, JSON.stringify(expectedPricingFields, null, 2));

            const lineItem: RecreationLineItem = {
                productIdentifier: {
                    type: identifierType,
                    externalIdField: externalIdField,
                    value: externalIdValue,
                    productName: product.Name // Store product name for display
                },
                // Preserve Quantity even if 0 (important for amendment scenarios)
                quantity: line.Quantity !== undefined && line.Quantity !== null ? line.Quantity : 1,
                expectedPricingFields,
                // Capture original source data for subscription/date fields
                sourceData: this.extractSubscriptionFields(line)
            };

            // Add bundle structure: parent line item reference if this is a child line
            if (line.ParentQuoteLineItemId) {
                const parentLine = quoteLines.find(parentLine => parentLine.Id === line.ParentQuoteLineItemId);
                const parentProduct = parentLine ? productMap[parentLine.Product2.Id] : null;
                if (parentProduct) {
                    let parentExternalIdValue = parentProduct[externalIdField];
                    let parentIdentifierType: 'externalId' | 'productId' = 'externalId';
                    
                    if (!parentExternalIdValue || parentExternalIdValue === null || parentExternalIdValue === '') {
                        parentExternalIdValue = parentProduct.Id;
                        parentIdentifierType = 'productId';
                    }
                    
                    // Capture QuoteLineRelationship data and ProductRelatedComponent configuration for proper recreation
                    console.log(`[DEBUG] 🔗 FETCHING QuoteLineRelationship and ProductRelatedComponent data for child: ${line.Id}`);
                    let productRelatedComponentId: string | undefined;
                    let productRelationshipTypeId: string | undefined;
                    let bundleConfiguration: any = {};
                    
                    try {
                        const relationshipQuery = `
                            SELECT Id, ProductRelatedComponentId, ProductRelationshipTypeId,
                                   ProductRelatedComponent.DoesBundlePriceIncludeChild,
                                   ProductRelatedComponent.QuantityScaleMethod
                            FROM QuoteLineRelationship 
                            WHERE AssociatedQuoteLineId = '${line.Id}' 
                            LIMIT 1
                        `;
                        console.log(`[DEBUG] 🔍 Enhanced relationship query: ${relationshipQuery.trim()}`);
                        const relationshipResult = await this.api.query(sourceOrg.username, relationshipQuery);
                        
                        if (relationshipResult.records.length > 0) {
                            const relationship = relationshipResult.records[0];
                            productRelatedComponentId = relationship.ProductRelatedComponentId;
                            productRelationshipTypeId = relationship.ProductRelationshipTypeId;
                            
                            // Capture ProductRelatedComponent configuration
                            const prc = relationship.ProductRelatedComponent;
                            if (prc) {
                                bundleConfiguration = {
                                    doesBundlePriceIncludeChild: prc.DoesBundlePriceIncludeChild,
                                    quantityScaleMethod: prc.QuantityScaleMethod
                                };
                                console.log(`[DEBUG] 🎯 Found QuoteLineRelationship with ProductRelatedComponent config:`);
                                console.log(`[DEBUG]   ProductRelatedComponentId: ${productRelatedComponentId}`);
                                console.log(`[DEBUG]   ProductRelationshipTypeId: ${productRelationshipTypeId}`);
                                console.log(`[DEBUG]   DoesBundlePriceIncludeChild: ${bundleConfiguration.doesBundlePriceIncludeChild}`);
                                console.log(`[DEBUG]   QuantityScaleMethod: ${bundleConfiguration.quantityScaleMethod}`);
                                console.log(`[DEBUG]   Note: AssociatedQuoteLineRole will be auto-populated by Salesforce`);
                            } else {
                                console.warn(`[WARN] ⚠️ ProductRelatedComponent data not available in relationship query result`);
                            }
                        } else {
                            console.warn(`[WARN] ⚠️ No QuoteLineRelationship found for child line: ${line.Id}`);
                        }
                    } catch (error: any) {
                        console.warn(`[WARN] ⚠️ Failed to fetch QuoteLineRelationship/ProductRelatedComponent data for ${line.Id}: ${error.message}`);
                        console.warn(`[WARN] This may be due to field access permissions or missing ProductRelatedComponent relationship`);
                    }
                    
                    lineItem.parentLineItemReference = {
                        sourceParentLineItemId: line.ParentQuoteLineItemId,
                        parentProductIdentifier: {
                            type: parentIdentifierType,
                            externalIdField: externalIdField,
                            value: parentExternalIdValue,
                            productName: parentProduct.Name // Store parent product name for display
                        },
                        productRelatedComponentId: productRelatedComponentId,
                        productRelationshipTypeId: productRelationshipTypeId,
                        bundleConfiguration: bundleConfiguration // Include captured ProductRelatedComponent configuration
                    };
                    console.log(`[DEBUG] 📦 Bundle structure: ${product.Name} is a child of ${parentProduct.Name}`);
                    console.log(`[DEBUG] 📦 Bundle config: ProductRelatedComponentId=${productRelatedComponentId}, DoesBundlePriceIncludeChild=${bundleConfiguration.doesBundlePriceIncludeChild}`);
                }
            }

            // Add manual discounts as adjustments if present
            if (line.Discount && line.Discount > 0) {
                lineItem.adjustments = [{
                    type: 'Amount',
                    value: line.Discount
                }];
            }

            // Add QuoteLineItemAttribute data if present
            console.log(`[DEBUG] 🔍 SNAPSHOT CREATOR: Checking QuoteLineItemAttributes for line ${line.Id} (${product.Name})`);
            console.log(`[DEBUG] 📊 QuoteLineItemAttributes property:`, line.QuoteLineItemAttributes ? `EXISTS with ${line.QuoteLineItemAttributes.length} records` : 'MISSING or EMPTY');
            console.log(`[DEBUG] 🔍 Full line object keys:`, Object.keys(line).filter(key => key !== 'attributes'));
            console.log(`[DEBUG] 🔍 Line object sample:`, JSON.stringify({
                Id: line.Id,
                Product2Id: line.Product2Id,
                hasQuoteLineItemAttributes: !!line.QuoteLineItemAttributes,
                QuoteLineItemAttributesLength: line.QuoteLineItemAttributes?.length || 0
            }, null, 2));
            
            if (line.QuoteLineItemAttributes && line.QuoteLineItemAttributes.length > 0) {
                console.log(`[DEBUG] 🎉 SNAPSHOT CREATOR: Processing ${line.QuoteLineItemAttributes.length} attributes for line item: ${product.Name}`);
                console.log(`[DEBUG] 📝 Raw attribute data sample:`, JSON.stringify(line.QuoteLineItemAttributes.slice(0, 1), null, 2));
                
                // Get configured external ID fields for attributes
                const config = vscode.workspace.getConfiguration('revCloudBlueprint');
                const attrDefExternalIdField = config.get<string>('pricing.attributeDefinitionExternalIdField', 'Code');
                const attrPicklistExternalIdField = config.get<string>('pricing.attributePicklistValueExternalIdField', 'Code');
                
                console.log(`[DEBUG] 🔧 Using external ID fields - AttributeDefinition: ${attrDefExternalIdField}, AttributePicklistValue: ${attrPicklistExternalIdField}`);
                
                lineItem.attributes = line.QuoteLineItemAttributes.map((attr: any, index: number) => {
                    const dataType = attr.AttributeDefinition?.DataType;
                    const isPicklistAttribute = dataType === 'Picklist';
                    
                    console.log(`[DEBUG] 🎯 Processing attribute "${attr.AttributeDefinition?.Name}" (${dataType}): ${isPicklistAttribute ? 'PICKLIST' : 'TEXT/OTHER'}`);
                    
                    // CRITICAL DEBUG: Check what fields are available on AttributeDefinition
                    console.log(`[DEBUG] 🔍 ATTRIBUTE DEFINITION FIELDS AVAILABLE:`);
                    console.log(`[DEBUG]   Id: ${attr.AttributeDefinitionId}`);
                    console.log(`[DEBUG]   Name: ${attr.AttributeDefinition?.Name}`);
                    console.log(`[DEBUG]   Code: ${attr.AttributeDefinition?.Code}`);
                    console.log(`[DEBUG]   DeveloperName: ${attr.AttributeDefinition?.DeveloperName}`);
                    console.log(`[DEBUG]   Configured externalIdField: ${attrDefExternalIdField}`);
                    console.log(`[DEBUG] 🔍 FULL AttributeDefinition object:`, JSON.stringify(attr.AttributeDefinition, null, 2));
                    console.log(`[DEBUG] 🔍 ALL available fields on AttributeDefinition:`, attr.AttributeDefinition ? Object.keys(attr.AttributeDefinition) : 'AttributeDefinition is null/undefined');
                    
                    // Use the configured external ID field dynamically
                    let externalIdValue: string;
                    if (attrDefExternalIdField && attr.AttributeDefinition?.[attrDefExternalIdField]) {
                        externalIdValue = attr.AttributeDefinition[attrDefExternalIdField];
                        console.log(`[DEBUG] ✅ Using configured field '${attrDefExternalIdField}': ${externalIdValue}`);
                    } else {
                        externalIdValue = attr.AttributeDefinitionId;
                        console.log(`[DEBUG] ⚠️ Configured field '${attrDefExternalIdField}' not available, falling back to ID: ${externalIdValue}`);
                    }
                    
                    const mappedAttr: any = {
                        attributeDefinition: {
                            type: 'externalId' as const,
                            externalIdField: attrDefExternalIdField,
                            value: externalIdValue
                        },
                        // Store names and datatype for reference/debugging
                        attributeDefinitionName: attr.AttributeDefinition?.Name,
                        dataType: dataType
                    };
                    
                    if (isPicklistAttribute) {
                        // CRITICAL DEBUG: Check what fields are available on AttributePicklistValue
                        console.log(`[DEBUG] 🔍 ATTRIBUTE PICKLIST VALUE FIELDS AVAILABLE:`);
                        console.log(`[DEBUG]   Id: ${attr.AttributePicklistValueId}`);
                        console.log(`[DEBUG]   Name: ${attr.AttributePicklistValue?.Name}`);
                        console.log(`[DEBUG]   Code: ${attr.AttributePicklistValue?.Code}`);
                        console.log(`[DEBUG]   Configured externalIdField: ${attrPicklistExternalIdField}`);
                        
                        // Use the configured external ID field dynamically for picklist value
                        let picklistExternalIdValue: string | null = null;
                        if (attrPicklistExternalIdField && attr.AttributePicklistValue?.[attrPicklistExternalIdField]) {
                            picklistExternalIdValue = attr.AttributePicklistValue[attrPicklistExternalIdField];
                            console.log(`[DEBUG] ✅ Using configured picklist field '${attrPicklistExternalIdField}': ${picklistExternalIdValue}`);
                        } else {
                            picklistExternalIdValue = attr.AttributePicklistValueId;
                            console.log(`[DEBUG] ⚠️ Configured picklist field '${attrPicklistExternalIdField}' not available, falling back to ID: ${picklistExternalIdValue}`);
                        }
                        
                        // For picklist attributes: resolve external IDs
                        mappedAttr.attributePicklistValue = {
                            type: 'externalId' as const,
                            externalIdField: attrPicklistExternalIdField,
                            value: picklistExternalIdValue
                        };
                        mappedAttr.attributePicklistValueName = attr.AttributePicklistValue?.Name;
                        console.log(`[DEBUG] 📋 Picklist attribute: ${attr.AttributeDefinition?.Name} = ${picklistExternalIdValue} (${attr.AttributePicklistValue?.Name})`);
                    } else {
                        // For text/number/date/currency/percent/checkbox attributes: use direct value
                        mappedAttr.attributeTextValue = attr.AttributeValue;
                        console.log(`[DEBUG] 📝 Text/Other attribute: ${attr.AttributeDefinition?.Name} = "${attr.AttributeValue}"`);
                    }
                    
                    if (index === 0) {
                        console.log(`[DEBUG] 🗺️ Attribute mapping sample:`, JSON.stringify(mappedAttr, null, 2));
                    }
                    
                    return mappedAttr;
                });
                
                console.log(`[DEBUG] ✅ SNAPSHOT CREATOR: Successfully captured ${lineItem.attributes?.length || 0} attributes for product: ${product.Name}`);
            } else {
                console.log(`[DEBUG] ❌ SNAPSHOT CREATOR: NO ATTRIBUTES found for line item: ${product.Name} (ID: ${line.Id})`);
                if (!line.QuoteLineItemAttributes) {
                    console.log(`[DEBUG] 🔍 QuoteLineItemAttributes property is: ${typeof line.QuoteLineItemAttributes} (${line.QuoteLineItemAttributes})`);
                } else if (line.QuoteLineItemAttributes.length === 0) {
                    console.log(`[DEBUG] 🔍 QuoteLineItemAttributes array is empty`);
                }
            }

            lineItems.push(lineItem);
        }

        // Show warning if some products don't have external ID values
        if (missingExternalIds.length > 0) {
            const warningMessage = [
                `⚠️  Warning: ${missingExternalIds.length} products don't have values in the configured external ID field '${externalIdField}':`,
                ...missingExternalIds.map(msg => `   • ${msg}`),
                '',
                `💡 To fix this:`,
                `   1. Update your Product records to populate the '${externalIdField}' field, OR`,
                `   2. Change the external ID field in Revcloud Blueprint settings to a field that has values (e.g., 'ProductCode')`,
                '',
                `🔧 Current setting: Revcloud Blueprint → Pricing → Product External Id Field = '${externalIdField}'`
            ].join('\n');
            
            console.warn(warningMessage);
            vscode.window.showWarningMessage(
                `Products missing external ID values in field '${externalIdField}'. Cross-org testing may not work properly. See Debug Console for details.`,
                'Open Settings'
            ).then(selection => {
                if (selection === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'revCloudBlueprint.pricing.productExternalIdField');
                }
            });
        }

        // Sort line items hierarchically: parents first, followed by their children in ascending order
        const sortedLineItems = this.sortLineItemsHierarchically(lineItems);
        console.log(`[DEBUG] 🗂️ Sorted ${lineItems.length} line items hierarchically for consistent JSON structure`);

        return sortedLineItems;
    }

    /**
     * Sort line items hierarchically: parents first, followed by their children in ascending order
     * This creates a consistent JSON structure that matches the hierarchical display
     */
    private sortLineItemsHierarchically(lineItems: RecreationLineItem[]): RecreationLineItem[] {
        console.log(`[DEBUG] 🏗️ Sorting line items hierarchically...`);
        
        // Separate parent items, child items, and standalone items
        const parentItems = new Map<string, RecreationLineItem>();
        const childItems = new Map<string, RecreationLineItem[]>(); // parentExternalId -> children array
        const standaloneItems: RecreationLineItem[] = [];
        
        // First pass: categorize all items
        lineItems.forEach((item, index) => {
            const externalId = item.productIdentifier.value;
            console.log(`[DEBUG]   Analyzing item ${index + 1}: ${externalId}`);
            
            if (item.parentLineItemReference) {
                // This is a child item
                const parentExternalId = item.parentLineItemReference.parentProductIdentifier.value;
                console.log(`[DEBUG]     → Child of: ${parentExternalId}`);
                
                if (!childItems.has(parentExternalId)) {
                    childItems.set(parentExternalId, []);
                }
                childItems.get(parentExternalId)!.push(item);
            } else {
                // Check if this item is a parent (has children referencing it)
                const hasChildren = lineItems.some(otherItem => 
                    otherItem.parentLineItemReference?.parentProductIdentifier.value === externalId
                );
                
                if (hasChildren) {
                    console.log(`[DEBUG]     → Parent item`);
                    parentItems.set(externalId, item);
                } else {
                    console.log(`[DEBUG]     → Standalone item`);
                    standaloneItems.push(item);
                }
            }
        });
        
        // Sort child items within each parent group (ascending by external ID)
        childItems.forEach((children, parentExternalId) => {
            children.sort((a, b) => a.productIdentifier.value.localeCompare(b.productIdentifier.value));
            console.log(`[DEBUG]   Sorted ${children.length} children for parent ${parentExternalId}: [${children.map(c => c.productIdentifier.value).join(', ')}]`);
        });
        
        // Sort standalone items by external ID
        standaloneItems.sort((a, b) => a.productIdentifier.value.localeCompare(b.productIdentifier.value));
        
        // Build final hierarchically sorted array
        const sortedItems: RecreationLineItem[] = [];
        
        // Add parent items with their children (sorted by parent external ID)
        const sortedParentKeys = Array.from(parentItems.keys()).sort();
        sortedParentKeys.forEach(parentExternalId => {
            const parentItem = parentItems.get(parentExternalId)!;
            const children = childItems.get(parentExternalId) || [];
            
            console.log(`[DEBUG]   Adding bundle: ${parentExternalId} with ${children.length} children`);
            
            // Add parent first
            sortedItems.push(parentItem);
            
            // Add children in sorted order
            children.forEach(child => {
                sortedItems.push(child);
            });
        });
        
        // Add standalone items at the end
        standaloneItems.forEach(item => {
            console.log(`[DEBUG]   Adding standalone: ${item.productIdentifier.value}`);
            sortedItems.push(item);
        });
        
        console.log(`[DEBUG] 🏁 Hierarchical sorting complete:`);
        console.log(`[DEBUG]   - ${parentItems.size} bundles (parent items)`);
        console.log(`[DEBUG]   - ${Array.from(childItems.values()).reduce((sum, children) => sum + children.length, 0)} child items`);
        console.log(`[DEBUG]   - ${standaloneItems.length} standalone items`);
        console.log(`[DEBUG]   - Final order: [${sortedItems.map(item => item.productIdentifier.value).join(' → ')}]`);
        
        return sortedItems;
    }

    /**
     * Extract configured snap fields from the source Quote (purely configuration-driven)
     */
    private extractQuoteSnapFields(quoteData: any): any {
        const extractedData: any = {};
        
        try {
            // Extract ONLY configured snap fields from settings.json - no pattern matching or hardcoded logic
            const pricingConfig = ConfigurationService.getModuleConfig('pricing');
            const configuredSnapFields = pricingConfig.snapFields.quote.fields;
            
            console.log(`[DEBUG] 📋 Extracting configured Quote snap fields: ${configuredSnapFields.join(', ')}`);
            
            // DEBUG: Log what fields are available in the source quote
            const availableFields = Object.keys(quoteData || {});
            const outputChannel = (global as any).revCloudBlueprintLogger;
            outputChannel?.appendLine(`[DEBUG] 📊 QUOTE FIELD EXTRACTION: Available fields in source quote: ${availableFields.join(', ')}`);
            
            let extractedCount = 0;
            configuredSnapFields.forEach((fieldName: string) => {
                // Check if field exists in source data
                const fieldExists = fieldName in quoteData;
                const fieldValue = quoteData[fieldName];
                
                // Include ALL configured snap fields, even if null/blank/0 (user's requirement)
                extractedData[fieldName] = fieldValue !== undefined ? fieldValue : null;
                extractedCount++;
                
                const outputChannel = (global as any).revCloudBlueprintLogger;
                outputChannel?.appendLine(`[DEBUG] 🔍 QUOTE FIELD EXTRACTION: ${fieldName} - InSource: ${fieldExists ? '✅' : '❌'} - Value: ${fieldValue} - Extracted: ${extractedData[fieldName]}`);
                console.log(`[DEBUG] ✅ Extracted configured Quote snap field ${fieldName}: ${extractedData[fieldName]} (including null/blank/0 values)`);
            });
            
            // Include essential Quote fields for amendment scenarios (always include, even if null)
            const essentialQuoteFields = ['OriginalActionType'];
            essentialQuoteFields.forEach(fieldName => {
                // Only add if not already extracted from configured fields
                if (!extractedData.hasOwnProperty(fieldName)) {
                    extractedData[fieldName] = quoteData[fieldName] !== undefined ? quoteData[fieldName] : null;
                    extractedCount++;
                    console.log(`[DEBUG] ✅ Extracted essential Quote field ${fieldName}: ${extractedData[fieldName]} (always included)`);
                }
            });
            
            console.log(`[DEBUG] 📋 Extracted ${extractedCount} Quote snap fields (configured + essential)`);
            
        } catch (error: any) {
            console.error(`[ERROR] Failed to extract Quote snap fields: ${error.message}`);
        }
        
        return extractedData;
    }

    /**
     * Extract configured snap fields from the source QuoteLineItem (purely configuration-driven)
     */
    private extractSubscriptionFields(line: any): any {
        const extractedData: any = {};
        
        try {
            // Extract ONLY configured snap fields from settings.json - no pattern matching or hardcoded logic
            const pricingConfig = ConfigurationService.getModuleConfig('pricing');
            const configuredSnapFields = pricingConfig.snapFields.quoteLineItem.fields;
            
            console.log(`[DEBUG] 📋 Extracting configured snap fields: ${configuredSnapFields.join(', ')}`);
            
            // DEBUG: Log what fields are available in the source line item
            const availableFields = Object.keys(line || {});
            const outputChannel = (global as any).revCloudBlueprintLogger;
            outputChannel?.appendLine(`[DEBUG] 📊 FIELD EXTRACTION: Available fields in source line: ${availableFields.join(', ')}`);
            
            let extractedCount = 0;
            configuredSnapFields.forEach((fieldName: string) => {
                // Check if field exists in source data
                const fieldExists = fieldName in line;
                const fieldValue = line[fieldName];
                
                // Include ALL configured snap fields, even if null/blank (user's requirement)  
                extractedData[fieldName] = fieldValue !== undefined ? fieldValue : null;
                extractedCount++;
                
                outputChannel?.appendLine(`[DEBUG] 🔍 FIELD EXTRACTION: ${fieldName} - InSource: ${fieldExists ? '✅' : '❌'} - Value: ${fieldValue} - Extracted: ${extractedData[fieldName]}`);
                console.log(`[DEBUG] ✅ Extracted configured snap field ${fieldName}: ${extractedData[fieldName]} (including null/blank values)`);
            });
            
            // Include essential standard fields for pricing and Revenue Cloud operations
            const essentialFields = ['UnitPrice', 'PricebookEntryId']; // Standard Salesforce fields
            const essentialRevCloudFields = ['ConstraintEngineNodeStatus__c', 'StartDate', 'EndDate', 'BillingFrequency', 'StartQuantity']; // Essential Revenue Cloud fields
            
            [...essentialFields, ...essentialRevCloudFields].forEach(fieldName => {
                // Special handling for Revenue Cloud fields - always include them (even if null)
                if (fieldName === 'StartDate' || fieldName === 'EndDate' || fieldName === 'BillingFrequency' || 
                    fieldName === 'StartQuantity' || fieldName === 'ConstraintEngineNodeStatus__c') {
                    if (!extractedData.hasOwnProperty(fieldName)) {
                        extractedData[fieldName] = line[fieldName] !== undefined ? line[fieldName] : null;
                        extractedCount++;
                        console.log(`[DEBUG] ✅ Extracted essential subscription field ${fieldName}: ${fieldName === 'ConstraintEngineNodeStatus__c' ? '[JSON object]' : extractedData[fieldName]} (always included)`);
                    }
                } else {
                    // Standard logic for other essential fields
                    if (line[fieldName] !== undefined && line[fieldName] !== null && !extractedData[fieldName]) {
                        extractedData[fieldName] = line[fieldName];
                        extractedCount++;
                        console.log(`[DEBUG] ✅ Extracted essential field ${fieldName}: ${extractedData[fieldName]}`);
                    }
                }
            });
            
            console.log(`[DEBUG] 📋 Extracted ${extractedCount} configured fields from source QuoteLineItem`);
            
        } catch (error: any) {
            console.warn(`[WARN] Failed to extract configured fields: ${error.message}`);
            
            // Minimal fallback - extract essential fields for pricing
            if (line.UnitPrice !== undefined && line.UnitPrice !== null) {
                extractedData.UnitPrice = line.UnitPrice;
                console.log(`[DEBUG] ✅ Fallback: Extracted essential UnitPrice: ${extractedData.UnitPrice}`);
            }
            if (line.PricebookEntryId !== undefined && line.PricebookEntryId !== null) {
                extractedData.PricebookEntryId = line.PricebookEntryId;
                console.log(`[DEBUG] ✅ Fallback: Extracted essential PricebookEntryId: ${extractedData.PricebookEntryId}`);
            }
        }
        
        return extractedData;
    }

    /**
     * Save snapshot to file system
     */
    private async saveSnapshot(snapshot: PricingSnapshot): Promise<string> {
        const snapshotDir = ApiUtilityService.getSnapshotDirectory();
        
        // Ensure snapshots directory exists
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folder is open');
        }

        const fullSnapshotDir = path.resolve(workspaceFolders[0].uri.fsPath, snapshotDir);
        await FileSystemService.ensureDirectoryExists(fullSnapshotDir);

        // Generate filename with description
        const orgAlias = snapshot.metadata.sourceOrgAlias || snapshot.metadata.sourceOrgUsername;
        const quoteId = snapshot.metadata.sourceQuoteId; // Full Quote ID
        const description = snapshot.metadata.description ? 
            this.sanitizeFilename(snapshot.metadata.description) : 
            new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const filename = `snapshot_${orgAlias}_${quoteId}_${description}.json`;
        
        const filePath = path.join(fullSnapshotDir, filename);
        
        // Write file with pretty formatting using async JSON parser
        const jsonContent = await AsyncJsonParser.stringifyAsync(snapshot, 2);
        await FileSystemService.writeFileAsync(filePath, jsonContent, 'utf8');
        
        // Note: The snapshot viewer will be opened automatically by the command handler in extension.ts
        // instead of opening the raw JSON file here
        
        return filePath;
    }

    /**
     * Load snapshot from file using optimized file service
     */
    static async loadSnapshot(filePath: string): Promise<PricingSnapshot> {
        try {
            // Use simple fs.readFileSync for now to avoid test environment issues
            const content = fs.readFileSync(filePath, 'utf8');
            const snapshot = await AsyncJsonParser.parseAsync<PricingSnapshot>(content);
            
            // Validate snapshot structure
            if (!snapshot.metadata || !snapshot.expectedResults || !snapshot.recreationPayload) {
                throw new Error('Invalid snapshot file structure');
            }
            
            return snapshot;
        } catch (error: any) {
            console.error('Error loading snapshot:', error);
            throw new Error(`Failed to load snapshot: ${error.message}`);
        }
    }

    /**
     * List all snapshot files in the workspace
     */
    static getSnapshotFiles(): string[] {
        const logger = (global as any).revCloudBlueprintLogger;
        const snapshotDir = ApiUtilityService.getSnapshotDirectory();

        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (!workspaceFolders) {
            logger?.appendLine('[WARNING] getSnapshotFiles() - No workspace folders available');
            return [];
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const fullSnapshotDir = path.resolve(workspaceRoot, snapshotDir);

        if (!fs.existsSync(fullSnapshotDir)) {
            logger?.appendLine(`[WARNING] getSnapshotFiles() - Snapshot directory does not exist: ${fullSnapshotDir}`);
            return [];
        }

        try {
            const allFiles = fs.readdirSync(fullSnapshotDir);
            const jsonFiles = allFiles.filter(file => file.endsWith('.json'));
            const snapshotFiles = jsonFiles.filter(file => file.startsWith('snapshot_'));

            const files = snapshotFiles
                .map(file => path.join(fullSnapshotDir, file))
                .sort((a, b) => fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime()); // Sort by modification time, newest first

            return files;
        } catch (error: any) {
            console.error('Error reading snapshot directory:', error);
            logger?.appendLine(`[ERROR] getSnapshotFiles() - Error reading directory: ${error.message}`);
            logger?.appendLine(`[ERROR] getSnapshotFiles() - Stack trace: ${error.stack}`);
            return [];
        }
    }

    /**
     * Delete a snapshot file
     */
    static async deleteSnapshot(filePath: string): Promise<void> {
        try {
            const fileName = path.basename(filePath);
            const confirmed = await vscode.window.showWarningMessage(
                `Are you sure you want to delete snapshot "${fileName}"?`,
                { modal: true },
                'Delete'
            );

            if (confirmed === 'Delete') {
                fs.unlinkSync(filePath);
                vscode.window.showInformationMessage(`Snapshot "${fileName}" deleted successfully.`);
            }
        } catch (error: any) {
            console.error('Error deleting snapshot:', error);
            vscode.window.showErrorMessage(`Failed to delete snapshot: ${error.message}`);
        }
    }

    /**
     * Get Quote ID with persistent retry - won't lose progress on window switch
     */
    private async getQuoteIdWithRetry(attempt: number = 1): Promise<string | undefined> {
        const maxAttempts = 5;
        
        while (attempt <= maxAttempts) {
            try {
                const result = await vscode.window.showInputBox({
                    prompt: `Enter Quote ID ${attempt > 1 ? `(Attempt ${attempt}/${maxAttempts})` : ''}`,
                    placeHolder: '0Q0XXXXXXXXXXXXXXX (15 or 18 characters)',
                    ignoreFocusOut: true, // This keeps the dialog open when switching windows!
                    validateInput: (value) => {
                        if (!value) {
                            return 'Quote ID is required';
                        }
                        if (!/^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/.test(value)) {
                            return 'Invalid Quote ID format. Must be a valid 15 or 18 character Salesforce ID.';
                        }
                        return null;
                    }
                });

                if (result) {
                    return result;
                }

                // User cancelled - show retry option
                if (attempt < maxAttempts) {
                    const retryChoice = await vscode.window.showWarningMessage(
                        'Quote ID is required to create a pricing snapshot. Would you like to try again?',
                        'Try Again',
                        'Cancel'
                    );

                    if (retryChoice === 'Try Again') {
                        attempt++;
                        continue;
                    }
                }

                return undefined;
            } catch (error) {
                console.error('[ERROR] Error in getQuoteIdWithRetry:', error);
                const retryChoice = await vscode.window.showErrorMessage(
                    'An error occurred while getting Quote ID. Would you like to try again?',
                    'Try Again',
                    'Cancel'
                );

                if (retryChoice === 'Try Again') {
                    attempt++;
                    continue;
                }
                return undefined;
            }
        }

        vscode.window.showErrorMessage(`Failed to get Quote ID after ${maxAttempts} attempts.`);
        return undefined;
    }

    /**
     * Get description with better UX - won't lose progress on window switch
     */
    private async getDescriptionWithRetry(): Promise<string | undefined> {
        try {
            const result = await vscode.window.showInputBox({
                prompt: 'Enter snapshot description (optional)',
                placeHolder: 'e.g., Laptop Pro Bundle with 10% discount',
                ignoreFocusOut: true, // Keeps dialog open when switching windows
                validateInput: (value) => {
                    // Allow empty (optional field) but limit length
                    if (value && value.length > 200) {
                        return 'Description too long. Please keep under 200 characters.';
                    }
                    return null;
                }
            });

            return result || 'Pricing snapshot'; // Default description if empty
        } catch (error) {
            console.warn('[WARN] Error getting description, using default:', error);
            return 'Pricing snapshot';
        }
    }

    /**
     * Sanitize description for use in filename (enhanced security against path traversal)
     */
    private sanitizeFilename(description: string): string {
        if (!description) {
            return 'untitled';
        }

        // Enhanced sanitization to prevent path traversal attacks
        let sanitized = description
            .replace(/[\/\\:\*\?"<>\|]/g, '') // Remove path separators and invalid filename chars
            .replace(/\x00/g, '') // Remove null bytes
            .replace(/\.\./g, '') // Remove parent directory references (..)
            .replace(/^\.+/, '') // Remove leading dots (hidden files and relative paths)
            .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove other special characters
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .substring(0, 50) // Limit length to 50 characters
            .toLowerCase()
            .trim();

        // Ensure filename is not empty after sanitization
        return sanitized || 'untitled';
    }

    /**
     * Get configured snap fields from settings.json
     */
    private getConfiguredSnapFields(objectType: 'quote' | 'quoteLineItem'): string[] {
        try {
            const config = ConfigReader.getConfig();
            return config.pricing?.snapFields?.[objectType]?.fields || [];
        } catch (error: any) {
            console.warn(`[WARN] Failed to load configured snap fields for ${objectType}: ${error.message}`);
            return [];
        }
    }

    /**
     * Extract external ID from a quote line item's Product2
     */
    private extractExternalId(line: QuoteLineData, externalIdField: string): string {
        const product = line.Product2;
        const externalIdValue = product[externalIdField];
        
        // If external ID field has a value, use it
        if (externalIdValue && externalIdValue !== null && externalIdValue !== '') {
            return externalIdValue;
        }
        
        // Fallback to ProductCode if available and different field
        if (externalIdField !== 'ProductCode' && product.ProductCode) {
            return product.ProductCode;
        }
        
        // Last resort: use Product2.Id
        return product.Id;
    }

    /**
     * Refresh an existing snapshot with the latest data from the source org
     */
    async refreshSnapshot(snapshotPath: string): Promise<boolean> {
        try {
            const logger = (global as any).revCloudBlueprintLogger;
            
            Logger.debug('Starting snapshot refresh...', undefined, 'SnapshotCreator');
            logger?.appendLine('[DEBUG] 🔄 SNAPSHOT REFRESH: Starting refresh process...');
            
            // 1. Load existing snapshot
            const existingSnapshot = await SnapshotCreator.loadSnapshot(snapshotPath);
            Logger.debug(`Loaded existing snapshot: ${existingSnapshot.metadata.description}`, undefined, 'SnapshotCreator');
            logger?.appendLine(`[DEBUG] 🔄 SNAPSHOT REFRESH: Loaded existing snapshot: ${existingSnapshot.metadata.description}`);
            
            // 2. Extract source org and quote info
            const sourceOrgUsername = existingSnapshot.metadata.sourceOrgUsername;
            const quoteId = existingSnapshot.metadata.sourceQuoteId;
            const description = existingSnapshot.metadata.description;
            const originalCreatedAt = existingSnapshot.metadata.createdAt;
            
            Logger.debug(`Source org: ${sourceOrgUsername}, Quote ID: ${quoteId}`, undefined, 'SnapshotCreator');
            logger?.appendLine(`[DEBUG] 🔄 SNAPSHOT REFRESH: Source org: ${sourceOrgUsername}, Quote ID: ${quoteId}`);
            
            // 3. Find source org from authenticated orgs (no prompt)
            const authenticatedOrgs = await this.auth.getAuthenticatedOrgs();
            const sourceOrg = authenticatedOrgs.find(org => org.username === sourceOrgUsername);
            
            if (!sourceOrg) {
                throw new Error(`Source org '${sourceOrgUsername}' not found or not authenticated. Please re-authenticate with the source org.`);
            }
            
            Logger.debug(`Source org found: ${sourceOrgUsername}`, undefined, 'SnapshotCreator');
            logger?.appendLine(`[DEBUG] 🔄 SNAPSHOT REFRESH: Source org found: ${sourceOrgUsername} (no prompt)`);
            
            // 4. Fetch fresh quote data
            Logger.debug('Fetching fresh quote data...', undefined, 'SnapshotCreator');
            logger?.appendLine('[DEBUG] 🔄 SNAPSHOT REFRESH: Fetching fresh quote data...');
            const quoteData = await this.api.getQuoteData(sourceOrgUsername, quoteId);
            
            Logger.debug(`Fresh quote data fetched: ${quoteData.Name} with ${quoteData.QuoteLines.length} lines`, undefined, 'SnapshotCreator');
            logger?.appendLine(`[DEBUG] 🔄 SNAPSHOT REFRESH: Fresh quote data fetched: ${quoteData.Name} with ${quoteData.QuoteLines.length} lines`);
            
            // 5. Build new snapshot with fresh data
            Logger.debug('Building updated snapshot...', undefined, 'SnapshotCreator');
            logger?.appendLine('[DEBUG] 🔄 SNAPSHOT REFRESH: Building updated snapshot...');
            const updatedSnapshot = await this.buildSnapshot(sourceOrg, quoteData, description);
            
            // 6. Preserve original creation timestamp and add refresh timestamp
            updatedSnapshot.metadata.createdAt = originalCreatedAt;
            updatedSnapshot.metadata.lastRefreshedAt = new Date().toISOString();
            
            Logger.debug('Preserved original metadata and added refresh timestamp', undefined, 'SnapshotCreator');
            logger?.appendLine('[DEBUG] 🔄 SNAPSHOT REFRESH: Preserved original metadata and added refresh timestamp');
            
            // 7. Write to file
            Logger.debug(`Writing updated snapshot to: ${snapshotPath}`, undefined, 'SnapshotCreator');
            logger?.appendLine(`[DEBUG] 🔄 SNAPSHOT REFRESH: Writing updated snapshot to: ${snapshotPath}`);
            await FileSystemService.writeFileAsync(snapshotPath, JSON.stringify(updatedSnapshot, null, 2), 'utf8');
            
            Logger.debug('Snapshot refresh completed successfully', undefined, 'SnapshotCreator');
            logger?.appendLine('[DEBUG] ✅ SNAPSHOT REFRESH: Snapshot refresh completed successfully');
            
            return true;
            
        } catch (error: any) {
            const logger = (global as any).revCloudBlueprintLogger;
            Logger.error(`Failed to refresh snapshot: ${error.message}`, error, 'SnapshotCreator');
            logger?.appendLine(`[ERROR] ❌ SNAPSHOT REFRESH FAILED: ${error.message}`);
            logger?.appendLine(`[ERROR] Stack trace: ${error.stack}`);
            throw error;
        }
    }


}
