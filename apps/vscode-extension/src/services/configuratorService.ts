import axios, { AxiosInstance } from 'axios';
import * as vscode from 'vscode';
import { SalesforceAuth } from '../salesforce/auth';
import { ValidationService } from './validationService';
import { HttpClientFactory } from './httpClientFactory';
import { Logger } from '../utils/logger';

/**
 * Configuration message structure returned by Configurator APIs
 */
export interface ConfigurationMessage {
    category: string;         // e.g., "configurationrules"
    message: string;           // Human-readable error message
    messageType: 'info' | 'warning' | 'error';
    primaryRecordId: string;   // Quote ID
    relatedRecordId: string;   // QuoteLineItem ID or Reference ID
}

/**
 * Load Instance API Request
 */
export interface LoadInstanceRequest {
    transactionId: string;  // Quote ID
}

/**
 * Load Instance API Response
 */
export interface LoadInstanceResponse {
    success: boolean;
    contextId?: string;
    configuratorMessages?: Record<string, ConfigurationMessage[]>;  // Key: QuoteLineItem ID
    transactionContext?: any;  // Complete transaction data
    errors?: any[];
}

/**
 * Configure API Request - addedObject structure
 */
export interface ConfigureAddedObject {
    id: string;                           // Reference ID
    SalesTransactionItemSource: string;   // Reference ID
    SalesTransactionItemParent: string;   // Quote ID for line items
    Product?: string;                     // Product2Id (API field name)
    PricebookEntry?: string;              // PricebookEntryId (API field name)
    Quantity?: number;
    UnitPrice?: number;
    businessObjectType: 'QuoteLineItem' | 'QuoteLineRelationship';
    
    // For QuoteLineRelationship
    MainItem?: string;                    // MainQuoteLineId (API field name)
    AssociatedItem?: string;              // AssociatedQuoteLineId (API field name)
    ProductRelatedComponent?: string;     // ProductRelatedComponentId
    ProductRelationshipType?: string | null;  // ProductRelationshipTypeId
    AssociatedItemPricing?: string;       // AssociatedQuoteLinePricing
    AssociatedQuantScaleMethod?: string;  // AssociatedQuantScaleMethod
    
    [key: string]: any;  // Allow additional fields
}

/**
 * Configure API Request - addedNode structure
 */
export interface ConfigureAddedNode {
    path: string[];              // e.g., [QuoteId, RefId] or [QuoteId, RefId, RelationshipRefId]
    addedObject: ConfigureAddedObject;
}

/**
 * Configure API Request - updatedNode structure
 */
export interface ConfigureUpdatedNode {
    path: string[];              // e.g., [QuoteId, QuoteLineItemId]
    updatedAttributes: Record<string, any>;  // Field name -> new value
}

/**
 * Configure API Request
 */
export interface ConfigureRequest {
    transactionId: string;  // Quote ID
    configuratorOptions?: {
        executePricing?: boolean;          // Default: false for configuration-only tests
        returnProductCatalogData?: boolean;  // Default: false
        [key: string]: any;
    };
    addedNodes?: ConfigureAddedNode[];
    updatedNodes?: ConfigureUpdatedNode[];
    deletedNodes?: any[];  // Reserved for future use
}

/**
 * Configure API Response
 */
export interface ConfigureResponse {
    success: boolean;
    transactionContextId?: string;         // Context ID for save-instance
    messages?: Record<string, ConfigurationMessage[]>;  // Key: Reference ID
    transactionContext?: any;              // Complete transaction data with all line items
    errors?: any[];
}

/**
 * Save Instance API Request
 */
export interface SaveInstanceRequest {
    contextId: string;  // From load-instance or configure response
}

/**
 * Save Instance API Response
 */
export interface SaveInstanceResponse {
    success: boolean;
    errors?: any[];
}

/**
 * Service for Salesforce Revenue Cloud Product Configurator Business APIs
 * Handles configuration operations through the Configurator APIs
 * 
 * **IMPORTANT: Product Configurator API User Permission Required**
 * - Navigate to: Setup → Permission Sets → [Permission Set]
 * - System Permissions → Enable "Product Configurator API User"
 * - Assign permission set to the API user
 * 
 * API Documentation:
 * - Load Instance: /connect/cpq/configurator/actions/load-instance
 * - Configure: /connect/cpq/configurator/actions/configure
 * - Save Instance: /connect/cpq/configurator/actions/save-instance
 */
export class ConfiguratorService {
    private auth: SalesforceAuth;

    constructor(auth: SalesforceAuth) {
        this.auth = auth;
    }

    /**
     * Create or get HTTP client for org using centralized factory
     */
    private async getClient(orgAlias: string): Promise<AxiosInstance> {
        // Configurator APIs can be slow, use longer timeout
        return await HttpClientFactory.getClient(orgAlias, this.auth, 90000);
    }

    /**
     * Load a configuration instance for an existing quote
     * Returns context ID and any existing configuration messages
     * 
     * @param orgAlias - Salesforce org alias
     * @param quoteId - Quote ID to load
     * @returns LoadInstanceResponse with contextId and configuratorMessages
     */
    async loadInstance(orgAlias: string, quoteId: string): Promise<LoadInstanceResponse> {
        try {
            Logger.debug(`Loading configuration instance for Quote: ${quoteId}`, undefined, 'ConfiguratorService');
            
            ValidationService.validateSalesforceId(quoteId, 'Quote');

            const client = await this.getClient(orgAlias);
            const request: LoadInstanceRequest = {
                transactionId: quoteId
            };

            const response = await client.post('/connect/cpq/configurator/actions/load-instance', request);
            
            // Accept both 200 OK and 201 Created as successful responses
            if (response.status !== 200 && response.status !== 201) {
                throw new Error(`API call failed with status: ${response.status}`);
            }

            const responseData = response.data;
            Logger.debug(`Load instance successful for Quote: ${quoteId}`, { 
                hasContextId: !!responseData.contextId,
                messageCount: this.countMessages(responseData.configuratorMessages)
            }, 'ConfiguratorService');
            
            return {
                success: responseData.success || true,
                contextId: responseData.contextId,
                configuratorMessages: responseData.configuratorMessages,
                transactionContext: responseData.transactionContext,
                errors: responseData.errors || []
            };

        } catch (error: any) {
            Logger.error(`Load instance failed for Quote: ${quoteId}`, error, 'ConfiguratorService');
            
            const errorMessages = this.extractErrorMessages(error);
            throw new Error(`Failed to load configuration instance: ${errorMessages.join(', ')}`);
        }
    }

    /**
     * Configure a quote by adding, updating, or deleting nodes
     * Returns context ID and any configuration rule messages
     * 
     * @param orgAlias - Salesforce org alias
     * @param request - Configure request with addedNodes/updatedNodes/deletedNodes
     * @returns ConfigureResponse with transactionContextId and messages
     */
    async configure(orgAlias: string, request: ConfigureRequest): Promise<ConfigureResponse> {
        try {
            Logger.debug(`Configuring Quote: ${request.transactionId}`, {
                addedNodesCount: request.addedNodes?.length || 0,
                updatedNodesCount: request.updatedNodes?.length || 0
            }, 'ConfiguratorService');
            
            ValidationService.validateSalesforceId(request.transactionId, 'Quote');
            
            if (!request.addedNodes && !request.updatedNodes && !request.deletedNodes) {
                throw new Error('Configure request must include addedNodes, updatedNodes, or deletedNodes');
            }

            const client = await this.getClient(orgAlias);

            const response = await client.post('/connect/cpq/configurator/actions/configure', request);
            
            // Accept both 200 OK and 201 Created as successful responses
            if (response.status !== 200 && response.status !== 201) {
                throw new Error(`API call failed with status: ${response.status}`);
            }

            const responseData = response.data;
            Logger.debug(`Configure successful for Quote: ${request.transactionId}`, {
                hasContextId: !!responseData.transactionContextId,
                messageCount: this.countMessages(responseData.messages)
            }, 'ConfiguratorService');
            
            return {
                success: responseData.success || true,
                transactionContextId: responseData.transactionContextId,
                messages: responseData.messages,
                transactionContext: responseData.transactionContext,
                errors: responseData.errors || []
            };

        } catch (error: any) {
            Logger.error(`Configure failed for Quote: ${request.transactionId}`, error, 'ConfiguratorService');
            
            const errorMessages = this.extractErrorMessages(error);
            throw new Error(`Failed to configure quote: ${errorMessages.join(', ')}`);
        }
    }

    /**
     * Save a configuration instance to persist changes to the database
     * This is the final step after successful configuration
     * 
     * **IMPORTANT:** Context IDs expire quickly (within minutes). 
     * Execute load→configure→save flow without delays.
     * 
     * @param orgAlias - Salesforce org alias
     * @param contextId - Context ID from load-instance or configure response
     * @returns SaveInstanceResponse
     */
    async saveInstance(orgAlias: string, contextId: string): Promise<SaveInstanceResponse> {
        try {
            Logger.debug(`Saving configuration instance with context: ${contextId}`, undefined, 'ConfiguratorService');
            
            if (!contextId || contextId.trim() === '') {
                throw new Error('Context ID is required');
            }

            const client = await this.getClient(orgAlias);
            const request: SaveInstanceRequest = {
                contextId: contextId
            };

            const response = await client.post('/connect/cpq/configurator/actions/save-instance', request);
            
            // Accept both 200 OK and 201 Created as successful responses
            if (response.status !== 200 && response.status !== 201) {
                throw new Error(`API call failed with status: ${response.status}`);
            }

            const responseData = response.data;
            Logger.debug(`Save instance successful`, undefined, 'ConfiguratorService');
            
            return {
                success: responseData.success || true,
                errors: responseData.errors || []
            };

        } catch (error: any) {
            Logger.error(`Save instance failed`, error, 'ConfiguratorService');
            
            const errorMessages = this.extractErrorMessages(error);
            throw new Error(`Failed to save configuration instance: ${errorMessages.join(', ')}`);
        }
    }

    /**
     * Check if a response contains configuration errors
     * 
     * **CRITICAL:** Configurator APIs return `success: true` even with error messages.
     * The tool MUST explicitly check for error messages to determine test failure.
     * 
     * @param response - Load instance or configure response
     * @returns true if error-level messages are present
     */
    hasConfigurationErrors(response: LoadInstanceResponse | ConfigureResponse): boolean {
        // Check errors array
        if (response.errors && response.errors.length > 0) {
            return true;
        }
        
        // Check configuratorMessages (load-instance)
        if ('configuratorMessages' in response && response.configuratorMessages) {
            for (const messages of Object.values(response.configuratorMessages)) {
                if (Array.isArray(messages) && messages.some(m => m.messageType === 'error')) {
                    return true;
                }
            }
        }
        
        // Check messages (configure)
        if ('messages' in response && response.messages) {
            for (const messages of Object.values(response.messages)) {
                if (Array.isArray(messages) && messages.some(m => m.messageType === 'error')) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Extract all configuration messages from response
     * Handles both configuratorMessages (load-instance) and messages (configure)
     * 
     * @param response - Load instance or configure response
     * @returns Flat array of all configuration messages
     */
    getAllConfigurationMessages(response: LoadInstanceResponse | ConfigureResponse): ConfigurationMessage[] {
        const allMessages: ConfigurationMessage[] = [];
        
        // Extract from configuratorMessages (load-instance)
        if ('configuratorMessages' in response && response.configuratorMessages) {
            for (const messages of Object.values(response.configuratorMessages)) {
                if (Array.isArray(messages)) {
                    allMessages.push(...messages);
                }
            }
        }
        
        // Extract from messages (configure)
        if ('messages' in response && response.messages) {
            for (const messages of Object.values(response.messages)) {
                if (Array.isArray(messages)) {
                    allMessages.push(...messages);
                }
            }
        }
        
        return allMessages;
    }

    /**
     * Count total configuration messages in response
     */
    private countMessages(messagesObj: Record<string, ConfigurationMessage[]> | undefined): number {
        if (!messagesObj) {
            return 0;
        }
        
        return Object.values(messagesObj).reduce((total, messages) => {
            return total + (Array.isArray(messages) ? messages.length : 0);
        }, 0);
    }

    /**
     * Extract meaningful error messages from API errors
     */
    private extractErrorMessages(error: any): string[] {
        const errors: string[] = [];
        
        if (error.response?.data) {
            const data = error.response.data;
            
            // Handle Connect API error format
            if (data.message) {
                errors.push(data.message);
            }
            
            // Handle errors array (standard Salesforce format)
            if (Array.isArray(data.errors)) {
                data.errors.forEach((err: any) => {
                    if (typeof err === 'string') {
                        errors.push(err);
                    } else if (err.message) {
                        errors.push(err.message);
                    }
                });
            }
            
            // Handle array response (e.g., [{ errorCode: "...", message: "..." }])
            if (Array.isArray(data)) {
                data.forEach((err: any) => {
                    if (err.message) {
                        errors.push(`${err.errorCode || 'ERROR'}: ${err.message}`);
                    }
                });
            }
        }
        
        // Fallback to basic error message
        if (errors.length === 0) {
            errors.push(error.message || 'Unknown API error');
        }
        
        return errors;
    }

    /**
     * Validate configure request structure
     * 
     * @param request - Configure request to validate
     * @returns Array of validation errors (empty if valid)
     */
    validateConfigureRequest(request: ConfigureRequest): string[] {
        const errors: string[] = [];
        
        if (!request.transactionId) {
            errors.push('Missing transactionId (Quote ID)');
        }
        
        if (!request.addedNodes && !request.updatedNodes && !request.deletedNodes) {
            errors.push('Request must include addedNodes, updatedNodes, or deletedNodes');
        }
        
        // Validate addedNodes structure
        if (request.addedNodes) {
            request.addedNodes.forEach((node, index) => {
                if (!node.path || !Array.isArray(node.path) || node.path.length < 2) {
                    errors.push(`addedNodes[${index}]: path must be an array with at least 2 elements`);
                }
                
                if (!node.addedObject) {
                    errors.push(`addedNodes[${index}]: missing addedObject`);
                } else {
                    if (!node.addedObject.businessObjectType) {
                        errors.push(`addedNodes[${index}]: addedObject missing businessObjectType`);
                    }
                    
                    if (node.addedObject.businessObjectType === 'QuoteLineItem') {
                        if (!node.addedObject.Product) {
                            errors.push(`addedNodes[${index}]: QuoteLineItem missing Product field`);
                        }
                        if (!node.addedObject.PricebookEntry) {
                            errors.push(`addedNodes[${index}]: QuoteLineItem missing PricebookEntry field`);
                        }
                    }
                }
            });
        }
        
        // Validate updatedNodes structure
        if (request.updatedNodes) {
            request.updatedNodes.forEach((node, index) => {
                if (!node.path || !Array.isArray(node.path) || node.path.length < 2) {
                    errors.push(`updatedNodes[${index}]: path must be an array with at least 2 elements`);
                }
                
                if (!node.updatedAttributes || Object.keys(node.updatedAttributes).length === 0) {
                    errors.push(`updatedNodes[${index}]: updatedAttributes must be a non-empty object`);
                }
            });
        }
        
        return errors;
    }

    /**
     * Build configure request for adding a QuoteLineItem
     * Helper method to construct properly formatted addedNodes
     * 
     * @param quoteId - Quote ID
     * @param referenceId - Unique reference ID for the new line item
     * @param productId - Product2Id
     * @param pricebookEntryId - PricebookEntryId
     * @param quantity - Line item quantity
     * @param additionalFields - Additional fields for the line item
     * @returns Configure request ready to use with configure()
     */
    buildAddLineItemRequest(
        quoteId: string,
        referenceId: string,
        productId: string,
        pricebookEntryId: string,
        quantity: number,
        additionalFields?: Record<string, any>
    ): ConfigureRequest {
        const addedObject: ConfigureAddedObject = {
            id: referenceId,
            SalesTransactionItemSource: referenceId,
            SalesTransactionItemParent: quoteId,
            Product: productId,
            PricebookEntry: pricebookEntryId,
            Quantity: quantity,
            businessObjectType: 'QuoteLineItem',
            ...additionalFields
        };

        return {
            transactionId: quoteId,
            configuratorOptions: {
                executePricing: false,
                returnProductCatalogData: false
            },
            addedNodes: [{
                path: [quoteId, referenceId],
                addedObject: addedObject
            }]
        };
    }

    /**
     * Build configure request for updating a QuoteLineItem
     * Helper method to construct properly formatted updatedNodes
     * 
     * @param quoteId - Quote ID
     * @param lineItemId - QuoteLineItem ID to update
     * @param updates - Field updates (e.g., { Quantity: 5 })
     * @returns Configure request ready to use with configure()
     */
    buildUpdateLineItemRequest(
        quoteId: string,
        lineItemId: string,
        updates: Record<string, any>
    ): ConfigureRequest {
        return {
            transactionId: quoteId,
            configuratorOptions: {
                executePricing: false,
                returnProductCatalogData: false
            },
            updatedNodes: [{
                path: [quoteId, lineItemId],
                updatedAttributes: updates
            }]
        };
    }

    /**
     * Clear cached HTTP clients
     */
    clearClients(): void {
        HttpClientFactory.clearAllClients();
    }
}

