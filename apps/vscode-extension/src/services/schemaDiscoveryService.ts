import * as vscode from 'vscode';
import { SalesforceAuth } from '../salesforce/auth';
import { FieldDiscoveryService } from './fieldDiscoveryService';
import { ApiUtilityService } from './apiUtilityService';

/**
 * Service for Salesforce schema discovery and field validation
 * Handles dynamic discovery of objects and fields in Revenue Cloud orgs
 */
export class SchemaDiscoveryService {
    private auth: SalesforceAuth;
    private schemaCache: Map<string, any> = new Map();

    constructor(auth: SalesforceAuth) {
        this.auth = auth;
    }

    /**
     * Discover available fields for a Salesforce object using CLI describe
     */
    async discoverObjectFields(orgAlias: string, objectName: string): Promise<any[]> {
        const cacheKey = `${orgAlias}_${objectName}`;
        
        // Check cache first
        if (this.schemaCache.has(cacheKey)) {
            return this.schemaCache.get(cacheKey);
        }

        try {
            console.log(`[DEBUG] 🔍 Discovering fields for ${objectName} in org: ${orgAlias}`);
            
            // Use Salesforce CLI to describe object
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            const command = `sfdx force:schema:sobject:describe -s ${objectName} -u ${orgAlias} --json`;
            const { stdout } = await execAsync(command);
            const result = JSON.parse(stdout);
            
            if (result.status !== 0) {
                throw new Error(`CLI command failed: ${result.message}`);
            }
            
            const fields = result.result.fields || [];
            console.log(`[DEBUG] ✅ Discovered ${fields.length} fields for ${objectName}`);
            
            // Cache the result
            this.schemaCache.set(cacheKey, fields);
            
            return fields;
        } catch (error: any) {
            console.error(`[ERROR] Failed to discover fields for ${objectName}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Detect the correct quote line object name (QuoteLine vs QuoteLineItem)
     */
    async detectQuoteLineObjectName(orgAlias: string): Promise<string> {
        const objectVariations = ApiUtilityService.getObjectNameVariations('QuoteLineItem');
        objectVariations.unshift('QuoteLine'); // Try QuoteLine first for Revenue Cloud core
        
        for (const objectName of objectVariations) {
            try {
                await this.discoverObjectFields(orgAlias, objectName);
                console.log(`[DEBUG] ✅ Found quote line object: ${objectName}`);
                return objectName;
            } catch (error: any) {
                console.log(`[DEBUG] ❌ Object ${objectName} not available`);
            }
        }
        
        throw new Error('No valid quote line object found. Revenue Cloud may not be configured properly.');
    }

    /**
     * Build comprehensive field lists for SOQL queries (essential + configured + Revenue Cloud)
     */
    async buildQueryFields(orgAlias: string, quoteLineObjectName: string): Promise<{
        quoteFields: string[],
        quoteLineFields: string[]
    }> {
        try {
            console.log(`[DEBUG] 🔍 Building optimized field lists for SOQL queries...`);
            
            // Essential standard fields that are always needed
            const essentialQuoteFields = [
                'Id', 'Name', 'Status', 'CreatedDate', 'LastModifiedDate',
                'Account.Id', 'Account.Name', 'Pricebook2Id', 
                'OpportunityId', 'ContactId', 'StartDate',
                'CurrencyIsoCode', 'GrandTotal', 'TotalPrice',
                'Subtotal', 'Tax', 'ShippingHandling', 'Discount'
            ];

            const essentialQuoteLineFields = [
                'Id', 'QuoteId', 'Product2Id', 'PricebookEntryId', 'LineNumber',
                'Quantity', 'UnitPrice', 'TotalPrice', 'NetUnitPrice', 'NetTotalPrice',
                'ServiceDate', 'Discount', 'Description',
                'Product2.Id', 'Product2.Name', 'Product2.ProductCode'
            ];

            const quoteFields = [...essentialQuoteFields];
            const quoteLineFields = [...essentialQuoteLineFields];
            
            // Add configured fields from settings.json
            try {
                const configuredQuoteSnapFields = FieldDiscoveryService.getConfiguredFields('quote', 'snapFields');
                const configuredQuoteReportFields = FieldDiscoveryService.getConfiguredFields('quote', 'reportFields');
                const configuredLineSnapFields = FieldDiscoveryService.getConfiguredFields('quoteLineItem', 'snapFields');
                const configuredLineReportFields = FieldDiscoveryService.getConfiguredFields('quoteLineItem', 'reportFields');
                
                quoteFields.push(...configuredQuoteSnapFields, ...configuredQuoteReportFields);
                quoteLineFields.push(...configuredLineSnapFields, ...configuredLineReportFields);
                
                console.log(`[DEBUG] 📥 Added configured fields from settings.json`);
            } catch (error: any) {
                console.warn(`[WARN] Failed to load configured fields: ${error.message}`);
            }

            // Add Revenue Cloud compatibility fields (pattern-based discovery for org compatibility)
            try {
                const quoteFields_schema = await this.discoverObjectFields(orgAlias, 'Quote');
                const quoteLineFields_schema = await this.discoverObjectFields(orgAlias, quoteLineObjectName);
                
                // Simplified: no pattern matching, all fields come from configuration
                const revCloudQuoteFields: string[] = [];
                const revCloudLineFields: string[] = [];
                
                quoteFields.push(...revCloudQuoteFields);
                quoteLineFields.push(...revCloudLineFields);
                
                console.log(`[DEBUG] 🔧 Added Revenue Cloud compatibility fields for org compatibility`);
            } catch (error: any) {
                console.warn(`[WARN] Failed to discover Revenue Cloud compatibility fields: ${error.message}`);
            }

            // Deduplicate fields
            const uniqueQuoteFields = [...new Set(quoteFields)];
            const uniqueQuoteLineFields = [...new Set(quoteLineFields)];
            
            console.log(`[DEBUG] ✅ Optimized field lists built:`);
            console.log(`[DEBUG]   Quote fields (${uniqueQuoteFields.length}): Essential + Configured + Revenue Cloud`);
            console.log(`[DEBUG]   QuoteLineItem fields (${uniqueQuoteLineFields.length}): Essential + Configured + Revenue Cloud`);
            
            return {
                quoteFields: uniqueQuoteFields,
                quoteLineFields: uniqueQuoteLineFields
            };
        } catch (error: any) {
            console.error(`[ERROR] Field list building failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Find currency and quantity related fields from field definitions
     */
    private findCurrencyAndQuantityFields(fields: any[]): string[] {
        const currencyQuantityFields: string[] = [];
        
        fields.forEach(field => {
            const fieldName = field.name;
            const fieldType = field.type?.toLowerCase() || '';
            const fieldLabel = field.label?.toLowerCase() || '';
            
            // Currency fields
            if (fieldType === 'currency' || 
                fieldName.toLowerCase().includes('currency') ||
                fieldLabel.includes('currency') ||
                fieldName === 'CurrencyIsoCode') {
                currencyQuantityFields.push(fieldName);
            }
            
            // Quantity fields
            if (fieldType === 'double' || fieldType === 'integer') {
                if (fieldName.toLowerCase().includes('quantity') ||
                    fieldName.toLowerCase().includes('amount') ||
                    fieldLabel.includes('quantity') ||
                    fieldLabel.includes('amount')) {
                    currencyQuantityFields.push(fieldName);
                }
            }
        });
        
        return currencyQuantityFields;
    }

    /**
     * Get Revenue Cloud specific fields that exist in the org
     */
    async getRevCloudRequiredFields(orgAlias: string, objectName: string): Promise<string[]> {
        const availableFields = await this.discoverObjectFields(orgAlias, objectName);
        console.log(`[DEBUG] 🔍 DYNAMIC FIELD DISCOVERY: Analyzing ${availableFields.length} available fields for Revenue Cloud patterns...`);
        
        const revCloudFields: string[] = []; // Simplified: no pattern matching
        
        // Also look for common date/subscription fields that might not match patterns
        const fieldNames = availableFields.map((field: any) => field.name);
        const commonFields = [
            'EndDate', 'StartDate', 'ServiceDate', 
            'SubscriptionTerm', 'SubscriptionType', 
            'BillingFrequency', 'ChargeType',
            'PeriodBoundary', 'PeriodBoundaryDay', 'PeriodBoundaryStartMonth'
        ];
        
        commonFields.forEach(commonField => {
            if (fieldNames.includes(commonField) && !revCloudFields.includes(commonField)) {
                revCloudFields.push(commonField);
                console.log(`[DEBUG] 📋 Found common Revenue Cloud field: ${commonField}`);
            }
        });
        
        // Log discovered fields with details
        availableFields.forEach((field: any) => {
            if (revCloudFields.includes(field.name)) {
                console.log(`[DEBUG] 📋 Found Revenue Cloud field: ${field.name} (Type: ${field.type}, Label: ${field.label})`);
            }
        });
        
        console.log(`[DEBUG] ✅ DISCOVERY COMPLETE: Found ${revCloudFields.length} Revenue Cloud fields in org:`, revCloudFields);
        
        return revCloudFields;
    }

    /**
     * Clear schema cache (useful for testing or when schema changes)
     */
    clearCache(): void {
        this.schemaCache.clear();
    }

    /**
     * Validate that an object exists and is accessible
     */
    async validateObjectAccess(orgAlias: string, objectName: string): Promise<boolean> {
        try {
            await this.discoverObjectFields(orgAlias, objectName);
            return true;
        } catch (error: any) {
            console.warn(`[WARN] Object ${objectName} not accessible in org ${orgAlias}: ${error.message}`);
            return false;
        }
    }
}
