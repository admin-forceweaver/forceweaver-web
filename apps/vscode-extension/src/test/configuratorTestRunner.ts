import * as vscode from 'vscode';
import { SalesforceAuth, SalesforceOrg } from '../salesforce/auth';
import { SalesforceAPI } from '../salesforce/api';
import { ConfiguratorSnapshot, ConfiguratorQuoteLineItem, ConfiguratorQuoteLineRelationship } from '../snapshot/configuratorSnapshotCreator';
import { ConfiguratorService, ConfigurationMessage, ConfigureRequest, ConfigureAddedNode } from '../services/configuratorService';
import { ConfiguratorComparator, ConfiguratorComparisonResult } from './configuratorComparator';
import { Logger } from '../utils/logger';
import { PlaceQuoteService, PlaceQuoteRequest } from '../services/placeQuoteService';

/**
 * Configurator test result
 */
export interface ConfiguratorTestResult {
    success: boolean;
    snapshot: ConfiguratorSnapshot;
    targetOrg: SalesforceOrg;
    createdQuoteId?: string;
    configurationMessages: ConfigurationMessage[];
    comparisonResult?: ConfiguratorComparisonResult;  // Full comparison result from comparator
    hasErrors: boolean;
    hasWarnings: boolean;
    hasInfo: boolean;
    executionTime: number;
    errors?: string[];
}

/**
 * Test runner for configurator regression tests
 * Executes configuration tests using the Configurator Business APIs
 */
export class ConfiguratorTestRunner {
    public auth: SalesforceAuth;
    private api: SalesforceAPI;
    private configuratorService: ConfiguratorService;
    private placeQuoteService: PlaceQuoteService;
    private comparator: ConfiguratorComparator;

    constructor(auth: SalesforceAuth) {
        this.auth = auth;
        this.api = new SalesforceAPI(auth);
        this.configuratorService = new ConfiguratorService(auth);
        this.placeQuoteService = new PlaceQuoteService(auth);
        this.comparator = new ConfiguratorComparator();
    }

    /**
     * Run a configurator test
     */
    async runTest(
        snapshot: ConfiguratorSnapshot,
        targetOrg: SalesforceOrg,
        progressCallback?: (progress: number, message: string) => void
    ): Promise<ConfiguratorTestResult> {
        const startTime = Date.now();

        try {
            Logger.debug(`Starting configurator test execution for snapshot: ${snapshot.snapshotMetadata.description || snapshot.snapshotMetadata.sourceQuoteId}`, undefined, 'ConfiguratorTestRunner');
            Logger.debug(`Snapshot has ${snapshot.expectedQuoteState.QuoteLineItem?.length || 0} line items`, undefined, 'ConfiguratorTestRunner');
            Logger.debug(`Snapshot has ${snapshot.expectedQuoteState.QuoteLineItemRelationship?.length || 0} relationships`, undefined, 'ConfiguratorTestRunner');
            Logger.debug(`Snapshot has ${snapshot.expectedQuoteState.messages?.length || 0} expected messages`, undefined, 'ConfiguratorTestRunner');

            progressCallback?.(10, 'Resolving PricebookEntries in target org...');

            // Step 1: Resolve PricebookEntryIds in target org and get actual Pricebook2Id
            // PricebookEntryIds from source org won't exist in target org, so we need to find them
            // CRITICAL: Pass CurrencyIsoCode from snapshot to ensure currency matching in multi-currency orgs
            const quoteCurrency = (snapshot.quoteContext as any).CurrencyIsoCode;
            const { resolvedLineItems, actualPricebook2Id } = await this.resolvePricebookEntries(
                targetOrg,
                snapshot.expectedQuoteState.QuoteLineItem,
                snapshot.quoteContext.pricebookId,
                quoteCurrency  // Pass currency for multi-currency org support
            );
            Logger.debug(`Resolved ${resolvedLineItems.length} PricebookEntries in target org (Pricebook: ${actualPricebook2Id}, Currency: ${quoteCurrency || 'N/A'})`, undefined, 'ConfiguratorTestRunner');

            progressCallback?.(20, 'Creating quote with line items and attributes...');

            // Step 2: Create quote with all line items and attributes using PST API
            // This is more reliable than creating empty quote + configure API
            const pstRequest = await this.buildPSTRequest(snapshot, targetOrg, resolvedLineItems, actualPricebook2Id);
            Logger.debug(`Calling PST API to create quote with ${resolvedLineItems.length} line items...`, undefined, 'ConfiguratorTestRunner');
            Logger.debug(`PST Request payload: ${JSON.stringify(pstRequest, null, 2)}`, undefined, 'ConfiguratorTestRunner');
            
            const pstResponse = await this.placeQuoteService.placeQuote(
                targetOrg.alias || targetOrg.username,
                pstRequest
            );
            
            Logger.debug(`PST Response: ${JSON.stringify(pstResponse, null, 2)}`, undefined, 'ConfiguratorTestRunner');
            
            if (!pstResponse.success || !pstResponse.quoteId) {
                const errorDetails = JSON.stringify(pstResponse, null, 2);
                Logger.error(`PST API failed. Full response: ${errorDetails}`, undefined, 'ConfiguratorTestRunner');
                throw new Error(`Failed to create quote via PST API: ${pstResponse.errors?.join(', ') || 'Unknown error'}`);
            }
            
            const quoteId = pstResponse.quoteId;
            Logger.debug(`Quote created successfully via PST API: ${quoteId}`, undefined, 'ConfiguratorTestRunner');

            progressCallback?.(60, 'Loading configuration to check messages...');

            // Step 2: Load configuration instance to capture messages
            // The quote already has line items from PST API, so load-instance will evaluate rules
            const loadResponse = await this.configuratorService.loadInstance(targetOrg.alias || targetOrg.username, quoteId);
            Logger.debug(`Configuration instance loaded. Context ID: ${loadResponse.contextId}`, undefined, 'ConfiguratorTestRunner');
            Logger.debug(`Load response full: ${JSON.stringify(loadResponse, null, 2)}`, undefined, 'ConfiguratorTestRunner');

            // Extract messages from load-instance
            const allMessages: ConfigurationMessage[] = this.extractMessages(loadResponse);
            Logger.debug(`Messages extracted from load-instance: ${allMessages.length}`, undefined, 'ConfiguratorTestRunner');
            Logger.debug(`Load messages detail: ${JSON.stringify(allMessages, null, 2)}`, undefined, 'ConfiguratorTestRunner');

            progressCallback?.(90, 'Analyzing results...');

            // Step 3: Use comparator to validate messages against expected results
            const comparisonResult = this.comparator.compare(snapshot, allMessages);
            
            Logger.debug(`Comparison completed. Success: ${comparisonResult.success}`, undefined, 'ConfiguratorTestRunner');
            Logger.debug(`Summary: ${JSON.stringify(comparisonResult.summary, null, 2)}`, undefined, 'ConfiguratorTestRunner');
            
            if (comparisonResult.errorDetails && comparisonResult.errorDetails.length > 0) {
                Logger.warn(`Comparison issues detected:`, undefined, 'ConfiguratorTestRunner');
                comparisonResult.errorDetails.forEach(detail => Logger.warn(`  ${detail}`, undefined, 'ConfiguratorTestRunner'));
            }

            const hasErrors = allMessages.some(m => m.messageType === 'error');
            const hasWarnings = allMessages.some(m => m.messageType === 'warning');
            const hasInfo = allMessages.some(m => m.messageType === 'info');

            progressCallback?.(100, 'Test complete!');

            return {
                success: comparisonResult.success,  // Use comparator's success flag
                snapshot: snapshot,
                targetOrg: targetOrg,
                createdQuoteId: quoteId,
                configurationMessages: allMessages,
                comparisonResult: comparisonResult,  // Include full comparison result
                hasErrors: hasErrors,
                hasWarnings: hasWarnings,
                hasInfo: hasInfo,
                executionTime: Date.now() - startTime
            };

        } catch (error: any) {
            Logger.error(`Configurator test execution failed`, error, 'ConfiguratorTestRunner');

            return {
                success: false,
                snapshot: snapshot,
                targetOrg: targetOrg,
                configurationMessages: [],
                hasErrors: true,
                hasWarnings: false,
                hasInfo: false,
                executionTime: Date.now() - startTime,
                errors: [error.message]
            };
        }
    }

    /**
     * Resolve PricebookEntryIds in target org and get the actual Pricebook2Id used
     * Uses the same logic as pricing test runner to ensure PricebookEntry matches Quote's Pricebook2Id
     * Returns both resolved line items AND the actual Pricebook2Id that was used
     */
    private async resolvePricebookEntries(
        targetOrg: SalesforceOrg,
        lineItems: ConfiguratorQuoteLineItem[],
        quotePricebookId: string | null,
        quoteCurrencyIsoCode?: string
    ): Promise<{ resolvedLineItems: ConfiguratorQuoteLineItem[], actualPricebook2Id: string }> {
        Logger.debug(`Resolving PricebookEntries for ${lineItems.length} line items in Pricebook: ${quotePricebookId || 'Standard'}`, undefined, 'ConfiguratorTestRunner');
        
        if (quoteCurrencyIsoCode) {
            Logger.debug(`Quote Currency: ${quoteCurrencyIsoCode} - will match PricebookEntries to this currency`, undefined, 'ConfiguratorTestRunner');
        } else {
            Logger.debug(`No currency specified - assuming single-currency org`, undefined, 'ConfiguratorTestRunner');
        }
        
        // Extract Product2Ids from line items
        const productIds = lineItems.map(li => li.Product2Id);
        
        // Use the same method as pricing tests to resolve PricebookEntries
        // This ensures PricebookEntry.Pricebook2Id matches Quote.Pricebook2Id
        // AND PricebookEntry.CurrencyIsoCode matches Quote.CurrencyIsoCode (for multi-currency orgs)
        const pricebookEntryMap = await this.api.getPricebookEntriesForProducts(
            targetOrg.username,
            productIds,
            quotePricebookId,      // Pass the Quote's Pricebook2Id (may be null → uses Standard)
            quoteCurrencyIsoCode,  // CRITICAL: Pass currency to ensure PricebookEntry matches Quote's currency
            null                   // No pricebook name
        );
        
        // Build resolved line items with correct PricebookEntryIds
        const resolvedLineItems: ConfiguratorQuoteLineItem[] = [];
        
        for (const lineItem of lineItems) {
            const resolvedPricebookEntryId = pricebookEntryMap.get(lineItem.Product2Id);
            
            if (!resolvedPricebookEntryId) {
                throw new Error(`No PricebookEntry found for Product2Id: ${lineItem.Product2Id} in Pricebook: ${quotePricebookId || 'Standard'}. Ensure the product is added to the pricebook.`);
            }
            
            Logger.debug(`Resolved PricebookEntry: ${resolvedPricebookEntryId} for Product: ${lineItem.Product2Id}`, undefined, 'ConfiguratorTestRunner');
            
            resolvedLineItems.push({
                ...lineItem,
                PricebookEntryId: resolvedPricebookEntryId
            });
        }
        
        // CRITICAL: Query the first PricebookEntry to get its actual Pricebook2Id
        // This is the Pricebook2Id we MUST use on the Quote
        const firstPricebookEntryId = resolvedLineItems[0].PricebookEntryId;
        const pbeQuery = `SELECT Id, Pricebook2Id FROM PricebookEntry WHERE Id = '${firstPricebookEntryId}' LIMIT 1`;
        const pbeResult = await this.api.query(targetOrg.username, pbeQuery);
        
        if (!pbeResult.records || pbeResult.records.length === 0) {
            throw new Error(`Failed to query PricebookEntry: ${firstPricebookEntryId}`);
        }
        
        const actualPricebook2Id = pbeResult.records[0].Pricebook2Id;
        Logger.debug(`Actual Pricebook2Id from resolved PricebookEntry: ${actualPricebook2Id}`, undefined, 'ConfiguratorTestRunner');
        Logger.debug(`Successfully resolved ${resolvedLineItems.length} PricebookEntries`, undefined, 'ConfiguratorTestRunner');
        
        return { resolvedLineItems, actualPricebook2Id };
    }

    /**
     * Build PST API request to create quote with line items
     * Similar to pricing test runner, but for configurator testing
     * @param actualPricebook2Id The actual Pricebook2Id that was used to resolve PricebookEntries (from target org)
     */
    private async buildPSTRequest(
        snapshot: ConfiguratorSnapshot, 
        targetOrg: SalesforceOrg, 
        lineItems: ConfiguratorQuoteLineItem[],
        actualPricebook2Id: string
    ): Promise<any> {
        const records: any[] = [];
        
        // Validate required fields - use OpportunityId from snapshot, fallback to targetOrg if not available
        const opportunityId = snapshot.quoteContext.opportunityId || targetOrg.testOpportunityId;
        
        if (!opportunityId) {
            throw new Error('OpportunityId is required. Snapshot must contain quoteContext.opportunityId or target org must have testOpportunityId configured.');
        }
        
        if (!actualPricebook2Id) {
            throw new Error('Pricebook2Id is required. Cannot create Quote without a valid Pricebook2Id.');
        }
        
        Logger.debug(`Building PST request with OpportunityId: ${opportunityId}`, undefined, 'ConfiguratorTestRunner');
        Logger.debug(`Building PST request with Pricebook2Id: ${actualPricebook2Id}`, undefined, 'ConfiguratorTestRunner');
        
        // 1. Quote record - MUST include Pricebook2Id that matches PricebookEntries
        const quoteRecord: any = {
            referenceId: 'refQuote',
            record: {
                attributes: {
                    type: 'Quote',
                    method: 'POST'
                },
                Name: `Config Test - ${snapshot.snapshotMetadata.description || snapshot.snapshotMetadata.sourceQuoteId}`,
                OpportunityId: opportunityId,
                Pricebook2Id: actualPricebook2Id,  // ← CRITICAL: Use the actual Pricebook2Id from resolved PricebookEntries
                Status: 'Draft'
            }
        };
        
        // Add CurrencyIsoCode if available (for multi-currency orgs)
        const quoteCurrency = (snapshot.quoteContext as any).CurrencyIsoCode;
        if (quoteCurrency) {
            quoteRecord.record.CurrencyIsoCode = quoteCurrency;
            Logger.debug(`Setting Quote CurrencyIsoCode: ${quoteCurrency}`, undefined, 'ConfiguratorTestRunner');
        }
        
        records.push(quoteRecord);
        
        // 2. QuoteLineItem records (using resolved line items)
        Logger.debug(`Building PST request with ${lineItems.length} line items`, undefined, 'ConfiguratorTestRunner');
        
        lineItems.forEach((lineItem, index) => {
            // Validate required fields
            if (!lineItem.Product2Id) {
                throw new Error(`Line item ${index + 1} is missing Product2Id`);
            }
            if (!lineItem.PricebookEntryId) {
                throw new Error(`Line item ${index + 1} is missing PricebookEntryId`);
            }
            
            const referenceId = lineItem.referenceId || `refQuoteLineItem${index + 1}`;
            
            Logger.debug(`Adding line item ${index + 1}: Product2Id=${lineItem.Product2Id}, PBE=${lineItem.PricebookEntryId}, Qty=${lineItem.Quantity}`, undefined, 'ConfiguratorTestRunner');
            
            const lineItemRecord: any = {
                referenceId: referenceId,
                record: {
                    attributes: {
                        type: 'QuoteLineItem',
                        method: 'POST'
                    },
                    QuoteId: '@{refQuote.id}',
                    Product2Id: lineItem.Product2Id,
                    PricebookEntryId: lineItem.PricebookEntryId,
                    Quantity: lineItem.Quantity || 1,
                    UnitPrice: lineItem.UnitPrice || 0  // Required field, default to 0 if not present
                }
            };
            
            // Add optional fields
            if (lineItem.Description) {
                lineItemRecord.record.Description = lineItem.Description;
            }
            
            if (lineItem.SortOrder !== undefined) {
                lineItemRecord.record.SortOrder = lineItem.SortOrder;
            }
            
            if (lineItem.ServiceDate) {
                lineItemRecord.record.ServiceDate = lineItem.ServiceDate;
            }
            
            if (lineItem.StartDate) {
                lineItemRecord.record.StartDate = lineItem.StartDate;
            }
            
            if (lineItem.EndDate) {
                lineItemRecord.record.EndDate = lineItem.EndDate;
            }
            
            if (lineItem.BillingFrequency) {
                lineItemRecord.record.BillingFrequency = lineItem.BillingFrequency;
            }
            
            if (lineItem.PeriodBoundary) {
                lineItemRecord.record.PeriodBoundary = lineItem.PeriodBoundary;
            }
            
            records.push(lineItemRecord);
        });
        
        // 3. QuoteLineItemRelationship records (for bundles)
        const relationships = snapshot.expectedQuoteState.QuoteLineItemRelationship || [];
        if (relationships.length > 0) {
            Logger.debug(`Building PST request with ${relationships.length} relationships`, undefined, 'ConfiguratorTestRunner');
            
            relationships.forEach((rel, index) => {
                const referenceId = `refRelationship${index + 1}`;
                
                const relationshipRecord: any = {
                    referenceId: referenceId,
                    record: {
                        attributes: {
                            type: 'QuoteLineRelationship',
                            method: 'POST'
                        },
                        MainQuoteLineId: `@{${rel.mainItemReferenceId}.id}`,
                        AssociatedQuoteLineId: `@{${rel.associatedItemReferenceId}.id}`,
                        ProductRelatedComponentId: rel.ProductRelatedComponentId,
                        AssociatedQuoteLinePricing: rel.AssociatedQuoteLinePricing || 'NotIncludedInBundlePrice',
                        AssociatedQuantScaleMethod: rel.AssociatedQuantScaleMethod || 'Proportional'
                    }
                };
                
                if (rel.ProductRelationshipTypeId) {
                    relationshipRecord.record.ProductRelationshipTypeId = rel.ProductRelationshipTypeId;
                }
                
                records.push(relationshipRecord);
            });
        }
        
        // 4. QuoteLineItemAttribute records (for product configuration attributes)
        const attributes = snapshot.expectedQuoteState.QuoteLineItemAttribute || [];
        let attributeRecordCount = 0;
        
        if (attributes.length > 0) {
            Logger.debug(`Processing ${attributes.length} attributes for PST request`, undefined, 'ConfiguratorTestRunner');
            
            // Group attributes by QuoteLineItemId (which is actually a referenceId in our case)
            const attributesByLineItem = new Map<string, any[]>();
            attributes.forEach(attr => {
                const lineItemRef = attr.QuoteLineItemId;  // This is a referenceId like 'ref_line_1'
                if (!lineItemRef) {
                    Logger.warn(`Skipping attribute with missing QuoteLineItemId`, undefined, 'ConfiguratorTestRunner');
                    return;
                }
                if (!attributesByLineItem.has(lineItemRef)) {
                    attributesByLineItem.set(lineItemRef, []);
                }
                attributesByLineItem.get(lineItemRef)!.push(attr);
            });
            
            // Process attributes for each line item
            for (const [lineItemRef, lineItemAttrs] of attributesByLineItem.entries()) {
                Logger.debug(`Processing ${lineItemAttrs.length} attributes for ${lineItemRef}`, undefined, 'ConfiguratorTestRunner');
                
                // Resolve attribute IDs in target org
                const resolvedAttributes = await this.resolveAttributeIds(lineItemAttrs, targetOrg);
                
                resolvedAttributes.forEach((attr, attrIndex) => {
                    attributeRecordCount++;
                    const attributeRecord: any = {
                        referenceId: `refAttribute_${lineItemRef}_${attrIndex + 1}`,
                        record: {
                            attributes: {
                                type: 'QuoteLineItemAttribute',
                                method: 'POST',
                                id: null
                            },
                            QuoteLineItemId: `@{${lineItemRef}.id}`,  // Reference to the line item being created
                            AttributeDefinitionId: attr.attributeDefinitionId
                        }
                    };
                    
                    // Add either picklist value ID or text value based on attribute type
                    if (attr.isPicklistAttribute) {
                        attributeRecord.record.AttributePicklistValueId = attr.attributePicklistValueId;
                        Logger.debug(`Adding picklist attribute: ${attr.attributeDefinitionName} = ${attr.attributePicklistValueName}`, undefined, 'ConfiguratorTestRunner');
                    } else {
                        attributeRecord.record.AttributeValue = attr.attributeTextValue;
                        Logger.debug(`Adding text attribute: ${attr.attributeDefinitionName} = "${attr.attributeTextValue}"`, undefined, 'ConfiguratorTestRunner');
                    }
                    
                    records.push(attributeRecord);
                });
            }
        }
        
        Logger.debug(`Added ${attributeRecordCount} QuoteLineItemAttribute records to PST payload`, undefined, 'ConfiguratorTestRunner');
        
        // Return PST API request in correct format
        // Must include pricingPref, configurationPref, and graph structure
        return {
            pricingPref: "skip",  // Skip pricing for configurator tests
            configurationPref: {
                configurationMethod: "Skip",  // Skip configuration during PST (we'll use load-instance after)
                configurationOptions: {
                    validateProductCatalog: false,
                    validateAmendRenewCancel: false,
                    executeConfigurationRules: false,  // Don't execute rules during PST creation
                    addDefaultConfiguration: false
                }
            },
            graph: {
                graphId: `configurator-test-${Date.now()}`,
                records: records
            }
        };
    }

    /**
     * Resolve attribute external IDs to actual Salesforce IDs in target org
     * Reuses the same logic as pricing test runner
     */
    private async resolveAttributeIds(attributes: any[], targetOrg: SalesforceOrg): Promise<any[]> {
        Logger.debug(`Resolving attribute external IDs for ${attributes.length} attributes in target org`, undefined, 'ConfiguratorTestRunner');
        
        const config = vscode.workspace.getConfiguration('revCloudBlueprint');
        const attrDefExternalIdField = config.get<string>('pricing.attributeDefinitionExternalIdField', 'Code');
        const attrPicklistExternalIdField = config.get<string>('pricing.attributePicklistValueExternalIdField', 'Code');
        
        // Separate attributes by type
        const picklistAttributes = attributes.filter(attr => attr.DataType === 'Picklist');
        const textAttributes = attributes.filter(attr => attr.DataType !== 'Picklist');
        
        Logger.debug(`Found ${picklistAttributes.length} picklist attributes, ${textAttributes.length} text/other attributes`, undefined, 'ConfiguratorTestRunner');
        
        // Extract unique external IDs for AttributeDefinition
        const attrDefNames = [...new Set(attributes.map(attr => attr.AttributeDefinitionName))];
        
        // Extract unique external IDs for AttributePicklistValue
        const attrPicklistNames = [...new Set(picklistAttributes
            .filter(attr => attr.AttributePicklistValueName)
            .map(attr => attr.AttributePicklistValueName))];
        
        Logger.debug(`Resolving ${attrDefNames.length} AttributeDefinition names, ${attrPicklistNames.length} AttributePicklistValue names`, undefined, 'ConfiguratorTestRunner');
        
        // Resolve external IDs in parallel
        const attrDefMap = await this.api.resolveAttributeDefinitionIds(targetOrg.username, attrDefNames, attrDefExternalIdField);
        
        let attrPicklistMap = new Map<string, string>();
        if (attrPicklistNames.length > 0) {
            attrPicklistMap = await this.api.resolveAttributePicklistValueIds(targetOrg.username, attrPicklistNames, attrPicklistExternalIdField);
        }
        
        // Build resolved attributes array
        const resolvedAttributes = [];
        const missingAttrDefs: string[] = [];
        const missingAttrPicklistValues: string[] = [];
        
        for (const attr of attributes) {
            const attrDefName = attr.AttributeDefinitionName;
            const isPicklistAttribute = attr.DataType === 'Picklist';
            
            const attributeDefinitionId = attrDefMap.get(attrDefName);
            
            if (!attributeDefinitionId) {
                missingAttrDefs.push(attrDefName);
                Logger.warn(`Missing AttributeDefinition in target org: ${attrDefName}`, undefined, 'ConfiguratorTestRunner');
                continue;
            }
            
            const resolvedAttr: any = {
                attributeDefinitionId: attributeDefinitionId,
                attributeDefinitionName: attrDefName,
                isPicklistAttribute: isPicklistAttribute
            };
            
            if (isPicklistAttribute) {
                const picklistValueName = attr.AttributePicklistValueName;
                const attributePicklistValueId = attrPicklistMap.get(picklistValueName);
                
                if (!attributePicklistValueId) {
                    missingAttrPicklistValues.push(picklistValueName);
                    Logger.warn(`Missing AttributePicklistValue in target org: ${picklistValueName}`, undefined, 'ConfiguratorTestRunner');
                    continue;
                }
                
                resolvedAttr.attributePicklistValueId = attributePicklistValueId;
                resolvedAttr.attributePicklistValueName = picklistValueName;
            } else {
                resolvedAttr.attributeTextValue = attr.AttributeValue;
            }
            
            resolvedAttributes.push(resolvedAttr);
        }
        
        // Report any missing attributes
        if (missingAttrDefs.length > 0) {
            Logger.error(`Missing ${missingAttrDefs.length} AttributeDefinitions in target org: ${missingAttrDefs.join(', ')}`, undefined, 'ConfiguratorTestRunner');
        }
        if (missingAttrPicklistValues.length > 0) {
            Logger.error(`Missing ${missingAttrPicklistValues.length} AttributePicklistValues in target org: ${missingAttrPicklistValues.join(', ')}`, undefined, 'ConfiguratorTestRunner');
        }
        
        Logger.debug(`Successfully resolved ${resolvedAttributes.length} out of ${attributes.length} attributes`, undefined, 'ConfiguratorTestRunner');
        
        return resolvedAttributes;
    }

    /**
     * OLD METHOD - NO LONGER USED
     * Create a base Quote in the target org
     */
    private async createBaseQuote_OLD(targetOrg: SalesforceOrg, snapshot: ConfiguratorSnapshot): Promise<string> {
        Logger.debug('Creating base quote...', undefined, 'ConfiguratorTestRunner');

        // Use Salesforce REST API to create a Quote
        // NOTE: We're not using PST API here because we want a clean quote for configurator testing
        
        const quoteData: any = {
            Name: `Config Test - ${snapshot.snapshotMetadata.description || snapshot.snapshotMetadata.sourceQuoteId}`,
            Status: 'Draft'
        };

        // Add AccountId and Pricebook2Id if available
        if (snapshot.quoteContext.accountId) {
            quoteData.AccountId = snapshot.quoteContext.accountId;
        }
        
        if (snapshot.quoteContext.pricebookId) {
            quoteData.Pricebook2Id = snapshot.quoteContext.pricebookId;
        }

        // Try to create Quote using REST API
        let createResult = await this.api.createRecord(targetOrg.username, 'Quote', quoteData);
        
        // If AccountId permission error, retry without it
        if (!createResult.success && createResult.errors?.some(err => err.includes('AccountId'))) {
            Logger.warn('AccountId permission error, retrying without AccountId...', undefined, 'ConfiguratorTestRunner');
            delete quoteData.AccountId;
            createResult = await this.api.createRecord(targetOrg.username, 'Quote', quoteData);
        }
        
        if (!createResult.success || !createResult.id) {
            throw new Error(`Failed to create base quote: ${createResult.errors?.join(', ')}`);
        }

        Logger.debug(`Base quote created successfully: ${createResult.id}`, undefined, 'ConfiguratorTestRunner');

        return createResult.id;
    }

    /**
     * Configure all line items using the Configurator API
     */
    private async configureLineItems(
        targetOrg: SalesforceOrg,
        quoteId: string,
        lineItems: ConfiguratorQuoteLineItem[],
        relationships?: ConfiguratorQuoteLineRelationship[]
    ): Promise<any> {
        Logger.debug(`Configuring ${lineItems.length} line items...`, undefined, 'ConfiguratorTestRunner');
        Logger.debug(`Line items detail: ${JSON.stringify(lineItems, null, 2)}`, undefined, 'ConfiguratorTestRunner');
        Logger.debug(`Relationships detail: ${JSON.stringify(relationships, null, 2)}`, undefined, 'ConfiguratorTestRunner');

        // Build addedNodes payload for all line items
        const addedNodes: ConfigureAddedNode[] = [];

        // Add all line items first (without relationships)
        for (const lineItem of lineItems) {
            const referenceId = lineItem.referenceId;

            addedNodes.push({
                path: [quoteId, referenceId],
                addedObject: {
                    id: referenceId,
                    SalesTransactionItemSource: referenceId,
                    SalesTransactionItemParent: quoteId,
                    Product: lineItem.Product2Id,
                    PricebookEntry: lineItem.PricebookEntryId,
                    Quantity: lineItem.Quantity,
                    Description: lineItem.Description,
                    businessObjectType: 'QuoteLineItem'
                }
            });
        }

        // Add relationships if any
        if (relationships && relationships.length > 0) {
            for (const rel of relationships) {
                const relationshipRefId = `rel_${rel.mainItemReferenceId}_${rel.associatedItemReferenceId}`;

                addedNodes.push({
                    path: [quoteId, rel.mainItemReferenceId, relationshipRefId],
                    addedObject: {
                        id: relationshipRefId,
                        SalesTransactionItemSource: relationshipRefId,
                        SalesTransactionItemParent: quoteId,
                        MainItem: rel.mainItemReferenceId,
                        AssociatedItem: rel.associatedItemReferenceId,
                        ProductRelatedComponent: rel.ProductRelatedComponentId,
                        ProductRelationshipType: rel.ProductRelationshipTypeId,
                        AssociatedItemPricing: rel.AssociatedQuoteLinePricing,
                        AssociatedQuantScaleMethod: rel.AssociatedQuantScaleMethod,
                        businessObjectType: 'QuoteLineRelationship'
                    }
                });
            }
        }

        // Execute configure API call
        const configureRequest: ConfigureRequest = {
            transactionId: quoteId,
            configuratorOptions: {
                executePricing: false,  // Skip pricing for configuration tests
                returnProductCatalogData: false
            },
            addedNodes: addedNodes
        };

        Logger.debug(`Executing configure API with ${addedNodes.length} nodes...`, undefined, 'ConfiguratorTestRunner');
        Logger.debug(`Configure request payload: ${JSON.stringify(configureRequest, null, 2)}`, undefined, 'ConfiguratorTestRunner');

        const configureResponse = await this.configuratorService.configure(
            targetOrg.alias || targetOrg.username,
            configureRequest
        );
        
        Logger.debug(`Configure response: ${JSON.stringify(configureResponse, null, 2)}`, undefined, 'ConfiguratorTestRunner');
        
        return configureResponse;
    }

    /**
     * Extract configuration messages from API responses
     */
    private extractMessages(response: any): ConfigurationMessage[] {
        const messages: ConfigurationMessage[] = [];

        // Extract from configuratorMessages (load-instance)
        if (response.configuratorMessages) {
            for (const [key, msgArray] of Object.entries(response.configuratorMessages)) {
                if (Array.isArray(msgArray)) {
                    messages.push(...msgArray);
                }
            }
        }

        // Extract from messages (configure)
        if (response.messages) {
            for (const [key, msgArray] of Object.entries(response.messages)) {
                if (Array.isArray(msgArray)) {
                    messages.push(...msgArray);
                }
            }
        }

        return messages;
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

