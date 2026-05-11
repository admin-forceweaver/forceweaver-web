import * as vscode from 'vscode';
import { SalesforceAuth, SalesforceOrg } from '../salesforce/auth';
import { SalesforceAPI } from '../salesforce/api';
import { FieldDiscoveryService } from './fieldDiscoveryService';
import { ValidationService } from './validationService';
import { OrgFeatureService, OrgFeatures } from './orgFeatureService';
import { ApiUtilityService } from './apiUtilityService';

/**
 * Service for Revenue Cloud specific operations and business logic
 * Encapsulates Revenue Cloud domain knowledge and provides reusable operations
 */
export class RevenueCloudService {
    private api: SalesforceAPI;

    constructor(auth: SalesforceAuth) {
        this.api = new SalesforceAPI(auth);
    }

    /**
     * Detect the appropriate quote line object for the org (QuoteLine vs QuoteLineItem)
     */
    async detectQuoteLineObjectName(orgAlias: string): Promise<string> {
        const objectVariations = ['QuoteLineItem', 'QuoteLine'];
        
        for (const objectName of objectVariations) {
            try {
                await this.api.query(orgAlias, `SELECT Id FROM ${objectName} LIMIT 1`);
                return objectName;
            } catch (error: any) {
            }
        }
        
        throw new Error('No valid quote line object found in org. Revenue Cloud may not be properly configured.');
    }

    /**
     * Resolve Pricebook2 by name with currency validation
     */
    async resolvePricebook2(orgAlias: string, pricebook2Name: string, expectedCurrency?: string): Promise<{ id: string; currency: string }> {
        if (!pricebook2Name) {
            throw new Error('Pricebook2 name is required for cross-org resolution');
        }

        // Get org features to check if multi-currency is enabled
        let orgFeatures: OrgFeatures | undefined;
        try {
            orgFeatures = await OrgFeatureService.getOrgFeatures(this.api, orgAlias);
        } catch (error: any) {
            console.log(`⚠️ Could not detect org features, assuming single-currency: ${error.message}`);
        }

        // Build query based on org features
        let selectFields = 'Id, Name';
        if (orgFeatures?.multiCurrencyEnabled) {
            selectFields += ', CurrencyIsoCode';
        }

        const query = `SELECT ${selectFields} FROM Pricebook2 WHERE Name = '${pricebook2Name}' LIMIT 1`;
        const result = await this.api.query(orgAlias, query);
        
        if (result.records.length === 0) {
            throw new Error(`Pricebook2 not found in target org: ${pricebook2Name}`);
        }
        
        const pricebook = result.records[0];
        
        // Handle currency validation based on org features
        let currency = 'N/A (single-currency)';
        if (orgFeatures?.multiCurrencyEnabled) {
            currency = pricebook.CurrencyIsoCode;
            // Validate currency if expected currency is provided
            if (expectedCurrency) {
                ValidationService.validateCurrencyConsistency(
                    expectedCurrency, 
                    pricebook.CurrencyIsoCode, 
                    `Pricebook2: ${pricebook2Name}`
                );
            }
        } else if (expectedCurrency) {
            console.log(`⚠️ Expected currency provided (${expectedCurrency}) but org doesn't support multi-currency - skipping currency validation`);
        }
        
        return {
            id: pricebook.Id,
            currency: currency
        };
    }

    /**
     * Resolve product by external ID with validation
     */
    async resolveProductByExternalId(orgAlias: string, externalIdValue: string, externalIdField: string = 'ProductCode'): Promise<any> {
        ValidationService.validateRequiredFields(
            { externalIdValue, externalIdField }, 
            ['externalIdValue', 'externalIdField'], 
            'Product resolution parameters'
        );

        const query = `SELECT Id, Name, ${externalIdField} FROM Product2 WHERE ${externalIdField} = '${externalIdValue}' LIMIT 1`;
        const result = await this.api.query(orgAlias, query);
        
        if (result.records.length === 0) {
            throw new Error(`Product not found with ${externalIdField}: ${externalIdValue}`);
        }
        
        return result.records[0];
    }

    /**
     * Get PricebookEntry with currency and product validation
     */
    async getPricebookEntry(orgAlias: string, productId: string, pricebook2Id: string, currencyCode?: string): Promise<any> {
        // Get org features to check if multi-currency is enabled
        let orgFeatures: OrgFeatures | undefined;
        try {
            orgFeatures = await OrgFeatureService.getOrgFeatures(this.api, orgAlias);
        } catch (error: any) {
            console.log(`⚠️ Could not detect org features, assuming single-currency: ${error.message}`);
        }

        // Build query based on org features
        let selectFields = 'Id, UnitPrice, Product2Id, Pricebook2Id';
        let whereCondition = `WHERE Product2Id = '${productId}' AND Pricebook2Id = '${pricebook2Id}'`;
        
        if (orgFeatures?.multiCurrencyEnabled) {
            selectFields += ', CurrencyIsoCode';
            if (currencyCode) {
                whereCondition += ` AND CurrencyIsoCode = '${currencyCode}'`;
            }
        } else if (currencyCode) {
            console.log(`⚠️ Currency code provided (${currencyCode}) but org doesn't support multi-currency - ignoring currency filter`);
        }

        const query = `SELECT ${selectFields} FROM PricebookEntry ${whereCondition} LIMIT 1`;
        
        const result = await this.api.query(orgAlias, query);
        
        if (result.records.length === 0) {
            const currencyInfo = orgFeatures?.multiCurrencyEnabled && currencyCode ? `, Currency: ${currencyCode}` : '';
            throw new Error(`PricebookEntry not found for Product: ${productId}, Pricebook: ${pricebook2Id}${currencyInfo}`);
        }
        
        return result.records[0];
    }

    /**
     * Validate Revenue Cloud prerequisites in org
     */
    async validateRevenueCloudPrerequisites(orgAlias: string): Promise<{ isValid: boolean; errors: string[] }> {
        const errors: string[] = [];
        
        try {
            // Check if Revenue Cloud objects are accessible
            const requiredObjects = ['Quote', 'Product2', 'Pricebook2', 'PricebookEntry'];
            
            for (const objectName of requiredObjects) {
                try {
                    await this.api.query(orgAlias, `SELECT Id FROM ${objectName} LIMIT 1`);
                } catch (error: any) {
                    errors.push(`Cannot access ${objectName}: ${error.message}`);
                }
            }
            
            // Check for quote line object
            try {
                await this.detectQuoteLineObjectName(orgAlias);
            } catch (error: any) {
                errors.push(`Quote line object validation failed: ${error.message}`);
            }
            
        } catch (error: any) {
            errors.push(`General validation error: ${error.message}`);
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get standard Revenue Cloud field mappings for discovery
     */
    static getStandardFieldMappings(): { [objectName: string]: string[] } {
        return {
            'Quote': [
                'GrandTotal', 
                'TotalPrice',
                'Subtotal',
                'Tax',
                'ShippingHandling',
                'StartDate',
                'CurrencyIsoCode'
            ],
            'QuoteLineItem': [
                'UnitPrice',
                'NetUnitPrice',
                'TotalPrice', 
                'NetTotalPrice',
                'Quantity',
                'Discount',
                'Description'
            ],
            'Product2': [
                'Name',
                'ProductCode',
                'Description',
                'IsActive'
            ],
            'PricebookEntry': [
                'UnitPrice',
                'Product2Id',
                'Pricebook2Id',
                'CurrencyIsoCode',
                'IsActive'
            ]
        };
    }

    /**
     * Build intelligent defaults for missing Revenue Cloud fields
     */
    static buildIntelligentDefaults(): { [fieldPattern: string]: any } {
        return {
            // Date field defaults
            'enddate': () => {
                const startDate = new Date();
                startDate.setFullYear(startDate.getFullYear() + 1); // 12 months from now
                return startDate.toISOString().split('T')[0];
            },
            'startdate': () => {
                return new Date().toISOString().split('T')[0];
            },
            
            // Boundary defaults
            'periodboundary': 'Anniversary',
            'proration': 'CalendarMonths',
            
            // Subscription defaults
            'subscriptionterm': 12,
            'subscriptiontype': 'Standard',
            'billingfrequency': 'Monthly',
            'chargetype': 'Recurring'
        };
    }

    /**
     * Apply intelligent defaults for common Revenue Cloud API requirements
     * Only applies minimal defaults for essential Revenue Cloud functionality
     */
    static applyIntelligentDefaults(obj: any, objectType: string): any {
        const updatedObj = { ...obj };
        
        // Apply minimal defaults only for critical Revenue Cloud API fields
        // These are standard Salesforce/Revenue Cloud fields that APIs commonly require
        
        if (objectType === 'QuoteLineItem') {
            // Ensure ServiceDate exists (required by many Revenue Cloud operations)
            if (!updatedObj.ServiceDate && !obj.ServiceDate) {
                updatedObj.ServiceDate = new Date().toISOString().split('T')[0];
            }
            
            // Ensure minimal required fields for Revenue Cloud APIs
            if (!updatedObj.PeriodBoundary && !obj.PeriodBoundary) {
                updatedObj.PeriodBoundary = 'Anniversary'; // Standard Revenue Cloud default
            }
        }
        
        return updatedObj;
    }

    /**
     * Format field value for API consumption
     */
    static formatFieldValue(value: any, fieldType: string): any {
        if (value === null || value === undefined) {
            return null;
        }
        
        switch (fieldType.toLowerCase()) {
            case 'date':
            case 'datetime':
                if (typeof value === 'string') {
                    // Ensure proper ISO format
                    return new Date(value).toISOString().split('T')[0];
                }
                break;
            case 'currency':
            case 'double':
            case 'percent':
                return parseFloat(value);
            case 'integer':
                return parseInt(value);
            case 'boolean':
                return Boolean(value);
            default:
                return value;
        }
        
        return value;
    }

    /**
     * Get essential Revenue Cloud fields that are always captured but have special handling
     */
    static getEssentialRevCloudFields(): { 
        snapOnly: string[], 
        reportOnly: string[], 
        description: string 
    } {
        return {
            snapOnly: [
                'ConstraintEngineNodeStatus__c' // Captured in snapshots & used for creation, but not compared
            ],
            reportOnly: [],
            description: "Essential Revenue Cloud fields with special handling - these are automatically included"
        };
    }

    /**
     * Validate that essential fields are not misconfigured in user settings
     */
    static validateFieldConfiguration(config: any): { isValid: boolean; warnings: string[] } {
        const warnings: string[] = [];
        const essentialFields = this.getEssentialRevCloudFields();
        
        try {
            // Check if snap-only fields are accidentally added to report fields
            const reportFields = config.pricing?.reportFields?.quoteLineItem?.fields || [];
            essentialFields.snapOnly.forEach(field => {
                if (reportFields.includes(field)) {
                    warnings.push(`${field} should not be in reportFields - it's automatically captured but not compared`);
                }
            });
            
            // Check if report-only fields are accidentally added to snap fields
            const snapFields = config.pricing?.snapFields?.quoteLineItem?.fields || [];
            essentialFields.reportOnly.forEach(field => {
                if (snapFields.includes(field)) {
                    warnings.push(`${field} should not be in snapFields - it's automatically included in reports only`);
                }
            });
            
        } catch (error: any) {
            warnings.push(`Configuration validation failed: ${error.message}`);
        }
        
        return {
            isValid: warnings.length === 0,
            warnings
        };
    }

    /**
     * Get recommended configuration template for a new project
     */
    static getConfigurationTemplate(): any {
        const essentialFields = this.getEssentialRevCloudFields();
        
        return {
            pricing: {
                snapFields: {
                    description: "Input fields captured in snapshots and used for pricing test recreation",
                    quote: {
                        description: "Custom Quote fields required for pricing calculation",
                        fields: [
                            // Add your project-specific Quote input fields here
                            // Example: "ContractTerm__c", "PricingModel__c"
                        ]
                    },
                    quoteLineItem: {
                        description: "Custom QuoteLineItem fields required for pricing calculation", 
                        fields: [
                            // Add your project-specific QuoteLineItem input fields here
                            // Example: "ServiceType__c", "PriceMethod__c"
                            // NOTE: ConstraintEngineNodeStatus__c is automatically included (essential Revenue Cloud field)
                        ]
                    }
                },
                reportFields: {
                    description: "Output fields captured and compared in test reports",
                    quote: {
                        description: "Quote-level pricing outputs to verify",
                        fields: [
                            "GrandTotal",
                            "TotalPrice"
                            // Add your project-specific Quote calculated fields here
                            // Example: "TotalACV__c", "TotalTCV__c"
                        ]
                    },
                    quoteLineItem: {
                        description: "QuoteLineItem-level pricing outputs to verify",
                        fields: [
                            "UnitPrice",
                            "NetUnitPrice", 
                            "TotalPrice",
                            "NetTotalPrice",
                            "Quantity"
                            // Add your project-specific QuoteLineItem calculated fields here
                            // Example: "CalculatedPrice__c", "ListPriceACV__c"
                            // NOTE: ConstraintEngineNodeStatus__c should NOT be added here (it's for internal state, not comparison)
                        ]
                    }
                }
            }
        };
    }
}
