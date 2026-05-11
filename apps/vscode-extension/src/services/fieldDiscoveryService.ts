import * as vscode from 'vscode';
import { ConfigurationService } from './configurationService';
import { Logger } from '../utils/logger';
import { OrgFeatureService, OrgFeatures } from './orgFeatureService';

/**
 * Service for managing essential fields and configuration-driven field discovery
 * Simplified approach - no pattern matching, purely configuration-driven
 */
export class FieldDiscoveryService {
    
    /**
     * Get essential fields that are always required for Quote operations
     * Only includes the absolute minimum fields needed for basic functionality
     * Note: Feature-dependent fields like CurrencyIsoCode are handled separately
     */
    static getEssentialQuoteFields(): string[] {
        return [
            // Absolute minimum fields for Quote identification and basic operations
            'Id', 'Name', 'Status',
            // Account relationship (required for snapshot creation) - use direct AccountId field
            'AccountId', 'Account.Id', 'Account.Name',
            // Essential fields for snapshot creation and cross-org operations
            'Pricebook2Id', 'StartDate', 'OpportunityId',
            // Standard report fields that are always included (per FIELD_GUIDE.md)
            'GrandTotal', 'TotalPrice', 'Subtotal',
            // Amendment support - always fetch OriginalActionType
            'OriginalActionType'
        ];
    }

    /**
     * Get essential fields that are always required for QuoteLineItem operations
     * Only includes the absolute minimum fields needed for basic functionality
     * Note: Feature-dependent fields are handled separately via org feature detection
     */
    static getEssentialQuoteLineItemFields(): string[] {
        return [
            // Absolute minimum fields for QuoteLineItem identification and basic operations
            'Id', 'QuoteId', 'Product2Id', 'PricebookEntryId',
            // Product2 relationship (required for snapshot creation)
            'Product2.Id', 'Product2.Name', 'Product2.ProductCode',
            // Standard report fields that are always included (per FIELD_GUIDE.md)
            'UnitPrice', 'NetUnitPrice', 'TotalPrice', 'NetTotalPrice', 'Quantity',
            'Discount', 'ParentQuoteLineItemId', 
            // Additional pricing fields (per user requirements)
            'PartnerUnitPrice', 'UnitPriceUplift', 'ListPrice',
            // Revenue Cloud subscription fields that are commonly needed
            'PricingTerm', 'PricingTermUnit', 'BillingFrequency', 'StartDate', 'EndDate',
            'SubscriptionTerm', 'SubscriptionTermUnit', 'PricingTermCount',
            // Amendment support - always fetch StartQuantity
            'StartQuantity',
            // Advance Configurator support - always attempt to fetch ConstraintEngineNodeStatus__c
            // Note: If field doesn't exist in org, error handling in api.ts will retry without it
            'ConstraintEngineNodeStatus__c'
        ];
    }

    /**
     * Get configured fields from configuration with error handling
     */
    static getConfiguredFields(objectType: 'quote' | 'quoteLineItem', fieldType: 'snapFields' | 'reportFields'): string[] {
        try {
            Logger.debug(`🔧 Loading configured ${fieldType} for ${objectType}...`, undefined, 'FieldDiscoveryService');
            const config = ConfigurationService.getModuleConfig('pricing');
            Logger.debug(`🔧 Config structure check: ${fieldType} exists: ${!!config?.[fieldType]}, ${objectType} exists: ${!!config?.[fieldType]?.[objectType]}`, undefined, 'FieldDiscoveryService');
            
            const fields = config[fieldType][objectType].fields;
            Logger.debug(`🔧 ✅ Found ${fields.length} configured ${fieldType} fields for ${objectType}: [${fields.join(', ')}]`, undefined, 'FieldDiscoveryService');
            return fields;
        } catch (error: any) {
            console.error(`[ERROR] ❌ Could not load configured ${fieldType} for ${objectType}: ${error.message}`);
            console.error(`[ERROR] ❌ Error stack:`, error.stack);
            return [];
        }
    }

    /**
     * Get all fields needed for SOQL queries (essential + configured + feature-dependent)
     */
    static getAllRequiredFields(objectType: 'quote' | 'quoteLineItem', orgFeatures?: OrgFeatures): string[] {
        Logger.debug(`🚀 getAllRequiredFields(${objectType}): Starting field discovery...`, undefined, 'FieldDiscoveryService');
        
        const essentialFields = objectType === 'quote' 
            ? FieldDiscoveryService.getEssentialQuoteFields()
            : FieldDiscoveryService.getEssentialQuoteLineItemFields();
            
        const configuredSnapFields = FieldDiscoveryService.getConfiguredFields(objectType, 'snapFields');
        const configuredReportFields = FieldDiscoveryService.getConfiguredFields(objectType, 'reportFields');
        
        // Add feature-dependent fields if org features are provided
        let featureDependentFields: string[] = [];
        if (orgFeatures) {
            featureDependentFields = OrgFeatureService.getConditionalFields(orgFeatures, objectType);
            Logger.debug(`🎯 Feature-dependent fields for ${objectType}: [${featureDependentFields.join(', ')}]`, undefined, 'FieldDiscoveryService');
        } else {
            Logger.debug(`⚠️ No org features provided, skipping feature-dependent fields`, undefined, 'FieldDiscoveryService');
        }
        
        // Combine all fields and remove duplicates
        const allFields = [...essentialFields, ...configuredSnapFields, ...configuredReportFields, ...featureDependentFields];
        const uniqueFields = [...new Set(allFields)];
        
        
        return uniqueFields;
    }

    /**
     * Get fields that should be excluded from standard field lists (optional exclusion)
     */
    static getStandardFieldExclusions(): string[] {
        return [
            'Id', 'CreatedDate', 'LastModifiedDate', 
            'QuoteId', 'Product2Id', 'Product2', 'PricebookEntryId'
        ];
    }

    /**
     * Get fields that should never be written to (API protection)
     */
    static getNonWritableFields(): string[] {
        return [
            'ProrationPolicyId',    // Read-only Revenue Cloud field
            'CreatedDate',          // System managed
            'LastModifiedDate',     // System managed  
            'Id'                    // System managed
        ];
    }

    /**
     * Get fields that are always required for snapshots (regardless of configuration)
     * These fields MUST be present in every snapshot and used during test recreation
     * Note: Feature-dependent fields are handled separately via org feature detection
     */
    static getRequiredSnapshotFields(objectType: 'quote' | 'quoteLineItem'): string[] {
        if (objectType === 'quote') {
            return [
                // Basic Quote identification and pricing
                'Id', 'Name', 'GrandTotal', 
                'Pricebook2Id', 'OpportunityId', 'StartDate'
            ];
        } else {
            return [
                // Basic QuoteLineItem identification and relationships
                'Id', 'QuoteId', 'Product2Id', 'PricebookEntryId', 
                // Standard pricing fields
                'UnitPrice', 'Quantity', 'NetUnitPrice', 'NetTotalPrice',
                // Revenue Cloud subscription fields
                'StartDate', 'EndDate'
            ];
        }
    }

    /**
     * Get fields that should never be written to during test recreation (API protection)
     */
    static getWriteProtectedFields(): string[] {
        return [
            'ProrationPolicyId',    // Read-only Revenue Cloud field
            'CreatedDate',          // System managed
            'LastModifiedDate',     // System managed  
            'Id'                    // System managed
        ];
    }

    /**
     * Get Quote fields that should be excluded during creation (calculated by pricing engine)
     */
    static getQuoteCalculatedFields(): string[] {
        return [
            'GrandTotal',       // Calculated during pricing
            'TotalPrice',       // Calculated during pricing
            'Subtotal'          // Calculated during pricing
        ];
    }

    /**
     * Get Quote fields that must always be present in reports (regardless of configuration)
     * Per FIELD_GUIDE.md: Only these 2 fields are always included
     */
    static getRequiredQuoteReportFields(): string[] {
        return [
            'GrandTotal',       // Always verify pricing output
            'Subtotal',         // Always verify pricing output
            'TotalPrice'        // Always verify pricing output
        ];
    }

    /**
     * Get QuoteLineItem fields that are calculated during pricing and shouldn't be written during creation
     */
    static getQuoteLineItemCalculatedFields(): string[] {
        return [
            'TotalPrice',           // Calculated during pricing
            'PricingTermCount',     // Calculated during pricing
            'NetUnitPrice',         // Calculated during pricing
            'NetTotalPrice'         // Calculated during pricing
        ];
    }

    /**
     * Get QuoteLineItem fields that must always be present in reports (regardless of configuration)
     * Per FIELD_GUIDE.md: Only these 5 fields are always included
     */
    static getRequiredQuoteLineItemReportFields(): string[] {
        return [
            'UnitPrice',            // Always verify pricing output
            'NetUnitPrice',         // Always verify pricing output
            'TotalPrice',           // Always verify pricing output
            'NetTotalPrice',        // Always verify pricing output
            'Quantity'              // Always verify quantity in reports
        ];
    }

    /**
     * Get fields for QuoteLineItem creation (Required fields that must be applied)
     * Note: Feature-dependent fields are conditionally included based on org capabilities and source data availability
     */
    static getQuoteLineItemCreationRequiredFields(sourceData?: any, orgFeatures?: OrgFeatures): string[] {
        const requiredFields = [
            // Basic identification and relationships
            'QuoteId', 'Product2Id', 'PricebookEntryId',
            // Standard pricing fields - excluding calculated ones
            'UnitPrice', 'Quantity',
            // Revenue Cloud subscription fields
            'StartDate', 'EndDate'
        ];

        // Conditionally include feature-dependent fields only if they exist in source data AND org supports them
        if (sourceData && orgFeatures) {
            // Include ConstraintEngineNodeStatus__c if Advance Configurator is enabled and field exists in source
            if (orgFeatures.advanceConfiguratorEnabled && 'ConstraintEngineNodeStatus__c' in sourceData) {
                requiredFields.push('ConstraintEngineNodeStatus__c');
            }
        } else if (sourceData) {
            // Fallback: Include field if it exists in source data (backward compatibility)
            if ('ConstraintEngineNodeStatus__c' in sourceData) {
                requiredFields.push('ConstraintEngineNodeStatus__c');
            }
        }

        return requiredFields;
    }

    /**
     * Get fields for QuoteLineItem creation (Essential fields when available, excluding calculated ones)
     */
    static getQuoteLineItemCreationEssentialFields(): string[] {
        return [
            'LineNumber',
            'ServiceDate',
            'Discount',
            'Description',
            'SortOrder',
            'OpportunityLineItemId',
            'HasQuantitySchedule',
            'HasRevenueSchedule',
            'ParentQuoteLineItemId',
            'PartnerUnitPrice',
            'UnitPriceUplift',
            'ListPrice',
            'PricingTerm',
            'PricingTermUnit',
            'StartQuantity', // Essential for amendment scenarios
            'BillingFrequency',
            'StartDate',
            'EndDate',
            'SubscriptionTerm',
            'SubscriptionTermUnit',
            'PeriodBoundary',
            'PeriodBoundaryDay',
            'PeriodBoundaryStartMonth'
            // Note: TotalPrice and PricingTermCount excluded as they're calculated
        ];
    }
}
