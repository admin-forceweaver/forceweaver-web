import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SalesforceAuth, SalesforceOrg } from '../salesforce/auth';
import { SalesforceAPI } from '../salesforce/api';
import { ApiUtilityService } from '../services/apiUtilityService';
import { ConfigReader } from '../config/configReader';
import { Logger } from '../utils/logger';
import { FileSystemService } from '../utils/fileSystemService';
import { SnapshotCreator } from './creator';
import { ConfiguratorService, ConfigurationMessage } from '../services/configuratorService';
import { OrgFeatureService, OrgFeatures } from '../services/orgFeatureService';

/**
 * Configurator Snapshot Metadata
 */
export interface ConfiguratorSnapshotMetadata {
    snapshotVersion: string;
    sourceOrgAlias?: string;
    sourceOrgUsername: string;
    sourceOrgId: string;
    sourceQuoteId: string;
    testType: 'positiveConfiguration' | 'negativeConfiguration';
    createdAt: string;
    description?: string;
    lastRefreshedAt?: string;
}

/**
 * Quote Context - non-price quote fields for context
 */
export interface QuoteContext {
    accountId: string;
    opportunityId?: string;  // Required for PST API to create test quotes
    pricebookId: string | null;
    quoteName?: string;
    [key: string]: any; // Allow additional non-price fields
}

/**
 * QuoteLineItem for configurator (non-price fields only)
 */
export interface ConfiguratorQuoteLineItem {
    referenceId: string;                  // For cross-referencing within snapshot
    Product2Id: string;
    Quantity: number;
    PricebookEntryId: string;
    SortOrder?: number;
    Description?: string;
    // Custom non-price fields captured from configuration
    [key: string]: any;
}

/**
 * QuoteLineItemAttribute
 */
export interface ConfiguratorQuoteLineItemAttribute {
    QuoteLineItemId: string | null;       // Will be resolved during test execution
    AttributeDefinitionId: string;
    AttributePicklistValueId?: string | null;
    AttributeValue?: string | null;       // For text/number/date/currency/percent/checkbox attributes
    // Additional metadata for reference
    AttributeDefinitionName?: string;
    AttributePicklistValueName?: string;
    DataType?: string;
}

/**
 * QuoteLineItemRelationship for bundles
 */
export interface ConfiguratorQuoteLineRelationship {
    mainItemReferenceId: string;          // Reference to main/parent line item
    associatedItemReferenceId: string;    // Reference to associated/child line item
    ProductRelatedComponentId?: string;
    ProductRelationshipTypeId?: string | null;
    AssociatedQuoteLinePricing?: string;
    AssociatedQuantScaleMethod?: string;
}

/**
 * Expected Configuration Error - for negative tests
 */
export interface ExpectedConfigurationError {
    messageType: 'error' | 'warning';  // Expected message type
    messagePattern?: string;  // Optional regex pattern to match message text
    category?: string;  // Optional category filter (e.g., 'configurationrules')
    relatedProduct?: string;  // Optional Product2Id or ProductCode that should trigger the error
    description?: string;  // Human-readable description of what this error tests
}

/**
 * Expected Quote State (for positive and negative tests)
 */
export interface ExpectedQuoteState {
    Quote: QuoteContext;
    QuoteLineItem: ConfiguratorQuoteLineItem[];
    QuoteLineItemAttribute?: ConfiguratorQuoteLineItemAttribute[];
    QuoteLineItemRelationship?: ConfiguratorQuoteLineRelationship[];
    messages?: ConfigurationMessage[];  // Expected configuration messages (warnings, errors, info) - for positive tests
    expectedErrors?: ExpectedConfigurationError[];  // Expected errors - for negative tests
}

/**
 * Configurator Snapshot (Positive Test)
 */
export interface ConfiguratorSnapshot {
    snapshotMetadata: ConfiguratorSnapshotMetadata;
    quoteContext: QuoteContext;
    expectedQuoteState: ExpectedQuoteState;
}

/**
 * Price-related fields to strip from configurator snapshots
 */
const PRICE_FIELDS_TO_STRIP = [
    // Quote-level price fields
    'GrandTotal',
    'Subtotal',
    'TotalPrice',
    'Tax',
    'ShippingHandling',
    'Discount',
    'TotalAmount',
    // QuoteLineItem price fields
    'UnitPrice',
    'ListPrice',
    'NetUnitPrice',
    'NetTotalPrice',
    'TotalPrice',
    'AdjustedPrice',
    'AdjustmentAmount',
    'AdjustmentPercent',
    'LineItemDiscount',
    'LineItemDiscountAmount',
    'CostPrice',
    'MarginAmount',
    'MarginPercent',
    // Any field containing "price", "amount", "cost", "margin", "discount" (case-insensitive)
    // This is handled in the stripping logic
];

/**
 * Service for creating configurator regression test snapshots
 * Captures non-price configuration state of quotes for automated testing
 */
export class ConfiguratorSnapshotCreator {
    private auth: SalesforceAuth;
    private api: SalesforceAPI;
    private configuratorService: ConfiguratorService;

    constructor(auth: SalesforceAuth) {
        this.auth = auth;
        this.api = new SalesforceAPI(auth);
        this.configuratorService = new ConfiguratorService(auth);
    }

    /**
     * Create a configurator snapshot from a quote
     */
    async createSnapshot(): Promise<string | null> {
        try {
            Logger.debug('Starting configurator snapshot creation...', undefined, 'ConfiguratorSnapshotCreator');

            // Step 1: Select source org
            const sourceOrg = await this.auth.selectOrg('Select Source Org (where the configured quote exists)');
            if (!sourceOrg) {
                Logger.debug('User cancelled org selection', undefined, 'ConfiguratorSnapshotCreator');
                return null;
            }

            Logger.debug(`Selected source org: ${sourceOrg.alias || sourceOrg.username}`, undefined, 'ConfiguratorSnapshotCreator');

            // Step 2: Get quote ID
            const quoteId = await vscode.window.showInputBox({
                prompt: 'Enter Quote ID',
                placeHolder: '0Q0...',
                validateInput: (value) => {
                    if (!value || value.trim() === '') {
                        return 'Quote ID is required';
                    }
                    if (!value.startsWith('0Q0')) {
                        return 'Quote ID must start with 0Q0';
                    }
                    return null;
                }
            });

            if (!quoteId) {
                Logger.debug('User cancelled quote ID input', undefined, 'ConfiguratorSnapshotCreator');
                return null;
            }

            Logger.debug(`User entered Quote ID: ${quoteId}`, undefined, 'ConfiguratorSnapshotCreator');

            // Step 3: Get description
            const description = await vscode.window.showInputBox({
                prompt: 'Enter snapshot description (optional)',
                placeHolder: 'e.g., Laptop Bundle with Premium Warranty',
            });

            // Step 4: Fetch data and build snapshot
            let filePath: string | null = null;
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Creating configurator snapshot...',
                cancellable: false
            }, async (progress) => {
                try {
                    progress.report({ message: 'Fetching quote configuration...' });
                    Logger.debug('Fetching quote data...', undefined, 'ConfiguratorSnapshotCreator');

                    const quoteData = await this.fetchQuoteConfigurationData(sourceOrg.username, quoteId);
                    Logger.debug(`Quote data fetched: ${quoteData.lineItems.length} line items`, undefined, 'ConfiguratorSnapshotCreator');

                    progress.report({ message: 'Building snapshot structure...' });
                    Logger.debug('Building snapshot...', undefined, 'ConfiguratorSnapshotCreator');

                    const snapshot = await this.buildSnapshot(sourceOrg, quoteData, description);
                    Logger.debug('Snapshot built successfully', undefined, 'ConfiguratorSnapshotCreator');

                    progress.report({ message: 'Saving snapshot file...' });
                    Logger.debug('Saving snapshot...', undefined, 'ConfiguratorSnapshotCreator');

                    filePath = await this.saveSnapshot(snapshot);
                    Logger.debug('Snapshot saved successfully', undefined, 'ConfiguratorSnapshotCreator');

                    vscode.window.showInformationMessage(`Configurator snapshot created successfully for Quote: ${quoteData.quoteName}`);
                } catch (error: any) {
                    Logger.error('Error creating configurator snapshot', error, 'ConfiguratorSnapshotCreator');
                    vscode.window.showErrorMessage(`Failed to create configurator snapshot: ${error.message}`);
                    throw error;
                }
            });

            return filePath;

        } catch (error: any) {
            Logger.error('Error in createSnapshot', error, 'ConfiguratorSnapshotCreator');
            vscode.window.showErrorMessage(`Error: ${error.message}`);
            return null;
        }
    }

    /**
     * Fetch quote configuration data (non-price fields only)
     */
    private async fetchQuoteConfigurationData(orgUsername: string, quoteId: string): Promise<any> {
        Logger.debug(`Fetching configuration data for Quote: ${quoteId}`, undefined, 'ConfiguratorSnapshotCreator');

        // Get configured snap fields from settings
        const configuredQuoteFields = this.getConfiguredSnapFields('quote');
        const configuredLineItemFields = this.getConfiguredSnapFields('quoteLineItem');

        // Build SOQL queries (Quote query is async for org feature detection)
        const quoteQuery = await this.buildQuoteQuery(orgUsername, quoteId, configuredQuoteFields);
        const lineItemsQuery = this.buildLineItemsQuery(quoteId, configuredLineItemFields);
        const relationshipsQuery = this.buildRelationshipsQuery(quoteId);

        Logger.debug(`Executing SOQL: ${quoteQuery}`, undefined, 'ConfiguratorSnapshotCreator');
        const quoteResult = await this.api.query(orgUsername, quoteQuery);

        if (!quoteResult.records || quoteResult.records.length === 0) {
            throw new Error(`Quote ${quoteId} not found in org ${orgUsername}`);
        }

        const quote = quoteResult.records[0];

        Logger.debug(`Executing SOQL: ${lineItemsQuery}`, undefined, 'ConfiguratorSnapshotCreator');
        const lineItemsResult = await this.api.query(orgUsername, lineItemsQuery);

        Logger.debug(`Executing SOQL: ${relationshipsQuery}`, undefined, 'ConfiguratorSnapshotCreator');
        const relationshipsResult = await this.api.query(orgUsername, relationshipsQuery);

        // Fetch attributes for all line items
        const attributes: any[] = [];
        if (lineItemsResult.records && lineItemsResult.records.length > 0) {
            const lineItemIds = lineItemsResult.records.map((li: any) => li.Id).join("','");
            const attributesQuery = `
                SELECT Id, QuoteLineItemId, AttributeDefinitionId, AttributePicklistValueId, AttributeValue,
                       AttributeDefinition.Name, AttributeDefinition.DataType,
                       AttributePicklistValue.Name
                FROM QuoteLineItemAttribute
                WHERE QuoteLineItemId IN ('${lineItemIds}')
            `.trim().replace(/\s+/g, ' ');

            Logger.debug(`Executing SOQL: ${attributesQuery}`, undefined, 'ConfiguratorSnapshotCreator');
            const attributesResult = await this.api.query(orgUsername, attributesQuery);
            attributes.push(...(attributesResult.records || []));
        }

        // Fetch configuration messages using load-instance API
        Logger.debug(`Calling load-instance API to capture configuration messages...`, undefined, 'ConfiguratorSnapshotCreator');
        let configurationMessages: ConfigurationMessage[] = [];
        try {
            Logger.debug(`About to call configuratorService.loadInstance for Quote: ${quoteId}`, undefined, 'ConfiguratorSnapshotCreator');
            const loadResponse = await this.configuratorService.loadInstance(orgUsername, quoteId);
            Logger.debug(`Load-instance response received. Full response: ${JSON.stringify(loadResponse, null, 2)}`, undefined, 'ConfiguratorSnapshotCreator');
            
            configurationMessages = this.extractMessagesFromLoadResponse(loadResponse);
            Logger.debug(`Extracted ${configurationMessages.length} configuration messages from load response`, undefined, 'ConfiguratorSnapshotCreator');
            
            if (configurationMessages.length > 0) {
                Logger.debug(`Messages detail: ${JSON.stringify(configurationMessages, null, 2)}`, undefined, 'ConfiguratorSnapshotCreator');
            } else {
                Logger.warn(`No messages extracted even though load-instance was called successfully`, undefined, 'ConfiguratorSnapshotCreator');
                Logger.warn(`configuratorMessages in response: ${JSON.stringify(loadResponse.configuratorMessages)}`, undefined, 'ConfiguratorSnapshotCreator');
            }
        } catch (error: any) {
            Logger.error(`Failed to load configuration messages: ${error.message}`, error, 'ConfiguratorSnapshotCreator');
            Logger.error(`Error stack: ${error.stack}`, undefined, 'ConfiguratorSnapshotCreator');
            // Continue without messages - they're not critical for snapshot creation
        }

        return {
            quote: quote,
            quoteName: quote.Name,
            lineItems: lineItemsResult.records || [],
            relationships: relationshipsResult.records || [],
            attributes: attributes,
            messages: configurationMessages
        };
    }

    /**
     * Build SOQL query for Quote (non-price fields only)
     * Conditionally includes CurrencyIsoCode based on org features
     */
    private async buildQuoteQuery(orgUsername: string, quoteId: string, customFields: string[]): Promise<string> {
        // Base fields for all orgs
        const baseFields = ['Id', 'Name', 'AccountId', 'Pricebook2Id', 'Status', 'OpportunityId'];
        
        // Detect org features to conditionally include fields
        let orgFeatures: OrgFeatures | undefined;
        try {
            orgFeatures = await OrgFeatureService.getOrgFeatures(this.api, orgUsername);
            Logger.debug(`Org features detected: Multi-currency=${orgFeatures.multiCurrencyEnabled}, Revenue Cloud=${orgFeatures.revenueCloudEnabled}, Advance Configurator=${orgFeatures.advanceConfiguratorEnabled}`, undefined, 'ConfiguratorSnapshotCreator');
        } catch (error: any) {
            Logger.warn(`Could not detect org features, assuming single-currency: ${error.message}`, undefined, 'ConfiguratorSnapshotCreator');
        }
        
        // CRITICAL: Include CurrencyIsoCode only for multi-currency orgs
        // This ensures PricebookEntry resolution matches the Quote's currency
        if (orgFeatures?.multiCurrencyEnabled) {
            baseFields.push('CurrencyIsoCode');
            Logger.debug(`Including CurrencyIsoCode field (multi-currency org)`, undefined, 'ConfiguratorSnapshotCreator');
        } else {
            Logger.debug(`Excluding CurrencyIsoCode field (single-currency org)`, undefined, 'ConfiguratorSnapshotCreator');
        }
        
        // Filter out price-related custom fields
        const nonPriceCustomFields = customFields.filter(field => !this.isPriceField(field));
        
        const allFields = [...new Set([...baseFields, ...nonPriceCustomFields])];
        
        return `SELECT ${allFields.join(', ')} FROM Quote WHERE Id = '${quoteId}'`;
    }

    /**
     * Build SOQL query for QuoteLineItems (non-price fields only)
     */
    private buildLineItemsQuery(quoteId: string, customFields: string[]): string {
        const baseFields = [
            'Id', 'QuoteId', 'Product2Id', 'Product2.Name', 'Product2.ProductCode',
            'PricebookEntryId', 'Quantity', 'SortOrder', 'Description',
            'UnitPrice', 'ServiceDate', 'StartDate', 'EndDate', 'BillingFrequency', 'PeriodBoundary'
        ];
        
        // Filter out price-related custom fields
        const nonPriceCustomFields = customFields.filter(field => !this.isPriceField(field));
        
        const allFields = [...new Set([...baseFields, ...nonPriceCustomFields])];
        
        return `SELECT ${allFields.join(', ')} FROM QuoteLineItem WHERE QuoteId = '${quoteId}' ORDER BY SortOrder`;
    }

    /**
     * Build SOQL query for QuoteLineRelationships
     * Note: QuoteLineRelationship doesn't have a Quote field, so we need to use a subquery
     */
    private buildRelationshipsQuery(quoteId: string): string {
        return `
            SELECT Id, MainQuoteLineId, AssociatedQuoteLineId, ProductRelatedComponentId, 
                   ProductRelationshipTypeId, AssociatedQuoteLinePricing, AssociatedQuantScaleMethod
            FROM QuoteLineRelationship
            WHERE MainQuoteLineId IN (SELECT Id FROM QuoteLineItem WHERE QuoteId = '${quoteId}')
        `.trim().replace(/\s+/g, ' ');
    }

    /**
     * Build configurator snapshot from fetched data
     */
    private async buildSnapshot(
        sourceOrg: SalesforceOrg,
        quoteData: any,
        description?: string
    ): Promise<ConfiguratorSnapshot> {
        Logger.debug('Building configurator snapshot structure...', undefined, 'ConfiguratorSnapshotCreator');

        // Build metadata
        const metadata: ConfiguratorSnapshotMetadata = {
            snapshotVersion: '1.0',
            sourceOrgAlias: sourceOrg.alias,
            sourceOrgUsername: sourceOrg.username,
            sourceOrgId: sourceOrg.orgId,
            sourceQuoteId: quoteData.quote.Id,
            testType: 'positiveConfiguration',
            createdAt: new Date().toISOString(),
            description: description
        };

        // Build quote context (strip price fields)
        const quoteContext: QuoteContext = this.stripPriceFields({
            accountId: quoteData.quote.AccountId,
            opportunityId: quoteData.quote.OpportunityId,  // Required for PST API
            pricebookId: quoteData.quote.Pricebook2Id,
            quoteName: quoteData.quote.Name,
            ...quoteData.quote
        });

        // Build expected quote state
        const expectedQuoteState = await this.buildExpectedQuoteState(quoteData, quoteContext);

        return {
            snapshotMetadata: metadata,
            quoteContext: quoteContext,
            expectedQuoteState: expectedQuoteState
        };
    }

    /**
     * Build expected quote state from fetched data
     */
    private async buildExpectedQuoteState(quoteData: any, quoteContext: QuoteContext): Promise<ExpectedQuoteState> {
        // Build QuoteLineItem array with reference IDs
        const lineItems: ConfiguratorQuoteLineItem[] = quoteData.lineItems.map((line: any, index: number) => {
            const referenceId = `ref_line_${index + 1}`;
            const lineItem = this.stripPriceFields({
                referenceId: referenceId,
                Product2Id: line.Product2Id,
                Quantity: line.Quantity,
                PricebookEntryId: line.PricebookEntryId,
                UnitPrice: line.UnitPrice,
                SortOrder: line.SortOrder,
                Description: line.Description,
                ServiceDate: line.ServiceDate,
                StartDate: line.StartDate,
                EndDate: line.EndDate,
                BillingFrequency: line.BillingFrequency,
                PeriodBoundary: line.PeriodBoundary,
                ...line
            });
            
            // Store original ID for relationship mapping
            lineItem._sourceId = line.Id;
            
            return lineItem;
        });

        // Build QuoteLineItemAttribute array
        const attributes: ConfiguratorQuoteLineItemAttribute[] = [];
        if (quoteData.attributes && quoteData.attributes.length > 0) {
            for (const attr of quoteData.attributes) {
                // Find the line item reference ID
                const lineItem = lineItems.find((li: any) => li._sourceId === attr.QuoteLineItemId);
                
                attributes.push({
                    QuoteLineItemId: lineItem?.referenceId || null,
                    AttributeDefinitionId: attr.AttributeDefinitionId,
                    AttributePicklistValueId: attr.AttributePicklistValueId || null,
                    AttributeValue: attr.AttributeValue || null,
                    AttributeDefinitionName: attr.AttributeDefinition?.Name,
                    AttributePicklistValueName: attr.AttributePicklistValue?.Name,
                    DataType: attr.AttributeDefinition?.DataType
                });
            }
        }

        // Build QuoteLineRelationship array
        const relationships: ConfiguratorQuoteLineRelationship[] = [];
        if (quoteData.relationships && quoteData.relationships.length > 0) {
            for (const rel of quoteData.relationships) {
                // Find reference IDs for main and associated items
                const mainItem = lineItems.find((li: any) => li._sourceId === rel.MainQuoteLineId);
                const associatedItem = lineItems.find((li: any) => li._sourceId === rel.AssociatedQuoteLineId);
                
                if (mainItem && associatedItem) {
                    relationships.push({
                        mainItemReferenceId: mainItem.referenceId,
                        associatedItemReferenceId: associatedItem.referenceId,
                        ProductRelatedComponentId: rel.ProductRelatedComponentId,
                        ProductRelationshipTypeId: rel.ProductRelationshipTypeId,
                        AssociatedQuoteLinePricing: rel.AssociatedQuoteLinePricing,
                        AssociatedQuantScaleMethod: rel.AssociatedQuantScaleMethod
                    });
                }
            }
        }

        // Clean up _sourceId from line items
        lineItems.forEach((li: any) => delete li._sourceId);

        return {
            Quote: quoteContext,
            QuoteLineItem: lineItems,
            QuoteLineItemAttribute: attributes.length > 0 ? attributes : undefined,
            QuoteLineItemRelationship: relationships.length > 0 ? relationships : undefined,
            messages: quoteData.messages || []  // Include configuration messages from load-instance
        };
    }

    /**
     * Strip price-related fields from an object
     */
    private stripPriceFields(obj: any): any {
        const stripped: any = {};
        
        for (const [key, value] of Object.entries(obj)) {
            if (!this.isPriceField(key)) {
                stripped[key] = value;
            } else {
                Logger.debug(`Stripped price field: ${key}`, undefined, 'ConfiguratorSnapshotCreator');
            }
        }
        
        return stripped;
    }

    /**
     * Check if a field is price-related
     */
    private isPriceField(fieldName: string): boolean {
        // Exception: These fields contain "price" but are required for configurator tests
        const exceptions = ['PricebookEntryId', 'Pricebook2Id', 'UnitPrice'];
        if (exceptions.includes(fieldName)) {
            return false;
        }
        
        // Check against explicit price fields list
        if (PRICE_FIELDS_TO_STRIP.includes(fieldName)) {
            return true;
        }
        
        // Check if field name contains price-related keywords (case-insensitive)
        const lowerFieldName = fieldName.toLowerCase();
        const priceKeywords = ['price', 'amount', 'cost', 'margin', 'discount', 'total', 'subtotal'];
        
        return priceKeywords.some(keyword => lowerFieldName.includes(keyword));
    }

    /**
     * Get configured snap fields from settings
     */
    private getConfiguredSnapFields(objectType: 'quote' | 'quoteLineItem'): string[] {
        try {
            const config = ConfigReader.getConfig();
            return config.configurator?.snapFields?.[objectType]?.fields || [];
        } catch (error: any) {
            Logger.warn(`Failed to load configured configurator snap fields for ${objectType}: ${error.message}`, 'ConfiguratorSnapshotCreator');
            return [];
        }
    }

    /**
     * Save snapshot to file
     */
    private async saveSnapshot(snapshot: ConfiguratorSnapshot): Promise<string> {
        const snapshotDir = ApiUtilityService.getConfiguratorSnapshotDirectory();
        
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folder is open');
        }

        const fullSnapshotDir = path.resolve(workspaceFolders[0].uri.fsPath, snapshotDir);
        await FileSystemService.ensureDirectoryExists(fullSnapshotDir);

        // Generate filename: snapshot_orgAlias_quoteId_description.config.snapshot.json
        const orgAlias = snapshot.snapshotMetadata.sourceOrgAlias || 'unknown';
        const quoteId = snapshot.snapshotMetadata.sourceQuoteId;
        const description = snapshot.snapshotMetadata.description?.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50) || 'config';
        const timestamp = Date.now();
        
        const filename = `snapshot_${orgAlias}_${quoteId}_${description}_${timestamp}.config.snapshot.json`;
        const filePath = path.join(fullSnapshotDir, filename);

        // Write JSON file
        const jsonContent = JSON.stringify(snapshot, null, 2);
        fs.writeFileSync(filePath, jsonContent, 'utf8');

        Logger.debug(`Snapshot saved to: ${filePath}`, undefined, 'ConfiguratorSnapshotCreator');

        return filePath;
    }

    /**
     * Load a configurator snapshot from file
     */
    static async loadSnapshot(filePath: string): Promise<ConfiguratorSnapshot> {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Snapshot file not found: ${filePath}`);
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const snapshot = JSON.parse(content) as ConfiguratorSnapshot;

        return snapshot;
    }

    /**
     * Get all configurator snapshot files (reuse pattern from SnapshotCreator)
     */
    static getSnapshotFiles(): string[] {
        const snapshotDir = ApiUtilityService.getConfiguratorSnapshotDirectory();

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return [];
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const fullSnapshotDir = path.resolve(workspaceRoot, snapshotDir);

        if (!fs.existsSync(fullSnapshotDir)) {
            return [];
        }

        try {
            const allFiles = fs.readdirSync(fullSnapshotDir);
            const configSnapshotFiles = allFiles.filter(file => file.endsWith('.config.snapshot.json'));
            
            return configSnapshotFiles.map(file => path.join(fullSnapshotDir, file));
        } catch (error: any) {
            Logger.error('Error reading configurator snapshot directory', error, 'ConfiguratorSnapshotCreator');
            return [];
        }
    }

    /**
     * Extract configuration messages from load-instance response
     */
    private extractMessagesFromLoadResponse(loadResponse: any): ConfigurationMessage[] {
        const messages: ConfigurationMessage[] = [];

        // Extract from configuratorMessages (keyed by QuoteLineItem ID)
        if (loadResponse.configuratorMessages) {
            for (const [lineItemId, msgArray] of Object.entries(loadResponse.configuratorMessages)) {
                if (Array.isArray(msgArray)) {
                    messages.push(...msgArray);
                }
            }
        }

        return messages;
    }
}

