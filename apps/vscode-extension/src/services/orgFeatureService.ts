import { SalesforceAPI } from '../salesforce/api';
import { Logger } from '../utils/logger';

/**
 * Service for detecting and caching org feature capabilities
 * Provides centralized feature detection to avoid field-related errors
 */
export class OrgFeatureService {
    private static featureCache = new Map<string, OrgFeatures>();

    /**
     * Get org features with caching
     */
    static async getOrgFeatures(api: SalesforceAPI, orgUsernameOrAlias: string): Promise<OrgFeatures> {
        const cacheKey = orgUsernameOrAlias;
        
        // Return cached features if available
        if (this.featureCache.has(cacheKey)) {
            const cached = this.featureCache.get(cacheKey)!;
            Logger.debug(`🎯 Using cached org features for ${orgUsernameOrAlias}`, cached, 'OrgFeatureService');
            return cached;
        }

        // Detect features and cache the result
        Logger.info(`🔍 Detecting org features for ${orgUsernameOrAlias}...`, undefined, 'OrgFeatureService');
        const features = await this.detectOrgFeatures(api, orgUsernameOrAlias);
        
        this.featureCache.set(cacheKey, features);
        Logger.info(`✅ Org features detected and cached for ${orgUsernameOrAlias}`, features, 'OrgFeatureService');
        
        return features;
    }

    /**
     * Clear feature cache for a specific org or all orgs
     */
    static clearCache(orgUsernameOrAlias?: string): void {
        if (orgUsernameOrAlias) {
            this.featureCache.delete(orgUsernameOrAlias);
            Logger.debug(`🗑️ Cleared feature cache for ${orgUsernameOrAlias}`, undefined, 'OrgFeatureService');
        } else {
            this.featureCache.clear();
            Logger.debug(`🗑️ Cleared all feature cache`, undefined, 'OrgFeatureService');
        }
    }

    /**
     * Detect org features using SOQL queries and Apex execution
     */
    private static async detectOrgFeatures(api: SalesforceAPI, orgUsernameOrAlias: string): Promise<OrgFeatures> {
        const features: OrgFeatures = {
            multiCurrencyEnabled: false,
            advanceConfiguratorEnabled: false,
            revenueCloudEnabled: false
        };

        try {
            // Check multi-currency using UserInfo.isMultiCurrencyOrganization()
            features.multiCurrencyEnabled = await this.checkMultiCurrencyEnabled(api, orgUsernameOrAlias);
            
            // Check Advance Configurator by testing ConstraintEngineNodeStatus__c field
            features.advanceConfiguratorEnabled = await this.checkAdvanceConfiguratorEnabled(api, orgUsernameOrAlias);
            
            // Check Revenue Cloud by testing basic Revenue Cloud objects
            features.revenueCloudEnabled = await this.checkRevenueCloudEnabled(api, orgUsernameOrAlias);

        } catch (error: any) {
            Logger.warn(`⚠️ Error detecting some org features: ${error.message}`, error, 'OrgFeatureService');
        }

        return features;
    }

    /**
     * Check if multi-currency is enabled using Apex
     * Anonymous Apex cannot return values, so we use System.debug() and parse the output
     */
    private static async checkMultiCurrencyEnabled(api: SalesforceAPI, orgUsernameOrAlias: string): Promise<boolean> {
        try {
            Logger.debug(`🔍 Checking multi-currency support for ${orgUsernameOrAlias}...`, undefined, 'OrgFeatureService');
            
            // Use Apex to check UserInfo.isMultiCurrencyOrganization()
            // Anonymous Apex cannot return values, so we use System.debug() and parse the output
            const apexCode = `
                Boolean isMultiCurrency = UserInfo.isMultiCurrencyOrganization();
                System.debug('MULTICURRENCY_CHECK:' + isMultiCurrency);
            `;
            
            const result = await api.executeApex(orgUsernameOrAlias, apexCode);
            
            // Parse the debug log output
            // The result should contain the entire response with debugLog
            const debugLog = result?.debugLog || result?.logs || '';
            const resultString = typeof result === 'string' ? result : JSON.stringify(result);
            const searchText = debugLog || resultString;
            
            Logger.debug(`📋 Apex execution result for multi-currency check:`, { debugLog, resultString: resultString.substring(0, 500) }, 'OrgFeatureService');
            
            // Look for our marker in the debug output
            const match = searchText.match(/MULTICURRENCY_CHECK:(true|false)/i);
            
            if (match) {
                const isEnabled = match[1].toLowerCase() === 'true';
                Logger.info(`💰 Multi-currency enabled: ${isEnabled}`, undefined, 'OrgFeatureService');
                return isEnabled;
            }
            
            // Fallback: assume disabled if we can't parse
            Logger.warn(`⚠️ Could not parse multi-currency result from debug log, assuming disabled`, undefined, 'OrgFeatureService');
            return false;
            
        } catch (error: any) {
            Logger.warn(`⚠️ Could not check multi-currency support, assuming disabled: ${error.message}`, error, 'OrgFeatureService');
            return false;
        }
    }

    /**
     * Check if Advance Configurator is enabled by querying TransactionProcessingType
     * Advance Configurator is enabled if TransactionProcessingType object exists 
     * and has a record with DeveloperName = 'AdvancedConfigurator'
     */
    private static async checkAdvanceConfiguratorEnabled(api: SalesforceAPI, orgUsernameOrAlias: string): Promise<boolean> {
        try {
            Logger.debug(`🔍 Checking Advance Configurator support for ${orgUsernameOrAlias}...`, undefined, 'OrgFeatureService');
            
            // Query TransactionProcessingType for AdvancedConfigurator record
            const query = `SELECT Id, DeveloperName FROM TransactionProcessingType WHERE DeveloperName = 'AdvancedConfigurator'`;
            const result = await api.query(orgUsernameOrAlias, query);
            
            if (result.records && result.records.length > 0) {
                Logger.info(`⚙️ Advance Configurator enabled: true (TransactionProcessingType record found)`, undefined, 'OrgFeatureService');
                return true;
            } else {
                Logger.info(`⚙️ Advance Configurator enabled: false (no AdvancedConfigurator record found)`, undefined, 'OrgFeatureService');
                return false;
            }
            
        } catch (error: any) {
            const errorMessage = error.message || '';
            
            // If TransactionProcessingType object doesn't exist, Advance Configurator is not available
            if (errorMessage.includes("sObject type 'TransactionProcessingType' is not supported") ||
                errorMessage.includes('TransactionProcessingType') && errorMessage.includes('not supported')) {
                Logger.info(`⚙️ Advance Configurator enabled: false (TransactionProcessingType object not available)`, undefined, 'OrgFeatureService');
                return false;
            }
            
            Logger.warn(`⚠️ Could not check Advance Configurator support, assuming disabled: ${errorMessage}`, error, 'OrgFeatureService');
            return false;
        }
    }

    /**
     * Check if Revenue Cloud is enabled by testing basic Revenue Cloud functionality
     */
    private static async checkRevenueCloudEnabled(api: SalesforceAPI, orgUsernameOrAlias: string): Promise<boolean> {
        try {
            Logger.debug(`🔍 Checking Revenue Cloud support for ${orgUsernameOrAlias}...`, undefined, 'OrgFeatureService');
            
            // Test basic Revenue Cloud objects/fields
            const testQuery = 'SELECT PricingTerm FROM QuoteLineItem LIMIT 1';
            await api.query(orgUsernameOrAlias, testQuery);
            
            Logger.info(`☁️ Revenue Cloud enabled: true`, undefined, 'OrgFeatureService');
            return true;
            
        } catch (error: any) {
            Logger.warn(`⚠️ Could not check Revenue Cloud support, assuming disabled: ${error.message}`, error, 'OrgFeatureService');
            return false;
        }
    }

    /**
     * Get fields that should be conditionally included based on org features
     */
    static getConditionalFields(features: OrgFeatures, objectType: 'quote' | 'quoteLineItem'): string[] {
        const conditionalFields: string[] = [];

        if (objectType === 'quote') {
            // Add currency field only if multi-currency is enabled
            if (features.multiCurrencyEnabled) {
                conditionalFields.push('CurrencyIsoCode');
            }
        } else if (objectType === 'quoteLineItem') {
            // Add Advance Configurator field only if enabled
            if (features.advanceConfiguratorEnabled) {
                conditionalFields.push('ConstraintEngineNodeStatus__c');
            }
        }

        return conditionalFields;
    }

    /**
     * Filter field list based on org capabilities
     */
    static filterFieldsByCapabilities(fields: string[], features: OrgFeatures): string[] {
        return fields.filter(field => {
            // Remove CurrencyIsoCode if multi-currency is not enabled
            if (field === 'CurrencyIsoCode' && !features.multiCurrencyEnabled) {
                Logger.debug(`🚫 Excluding CurrencyIsoCode field (multi-currency not enabled)`, undefined, 'OrgFeatureService');
                return false;
            }
            
            // Remove ConstraintEngineNodeStatus__c if Advance Configurator is not enabled
            if (field === 'ConstraintEngineNodeStatus__c' && !features.advanceConfiguratorEnabled) {
                Logger.debug(`🚫 Excluding ConstraintEngineNodeStatus__c field (Advance Configurator not enabled)`, undefined, 'OrgFeatureService');
                return false;
            }
            
            return true;
        });
    }
}

/**
 * Interface representing org feature capabilities
 */
export interface OrgFeatures {
    /** Whether multi-currency is enabled (affects CurrencyIsoCode field availability) */
    multiCurrencyEnabled: boolean;
    
    /** Whether Advance Configurator is enabled (affects ConstraintEngineNodeStatus__c field availability) */
    advanceConfiguratorEnabled: boolean;
    
    /** Whether Revenue Cloud is enabled (affects Revenue Cloud specific fields) */
    revenueCloudEnabled: boolean;
}
