import * as vscode from 'vscode';

/**
 * Utility service for common API operations and validation
 * Provides reusable functions for Salesforce API interactions
 */
export class ApiUtilityService {
    
    /**
     * Get API version from configuration with fallback
     */
    static getApiVersion(): string {
        const config = vscode.workspace.getConfiguration('revCloudBlueprint');
        const configuredVersion = config.get<string>('salesforce.apiVersion', '');
        
        if (configuredVersion && configuredVersion.trim() !== '') {
            return configuredVersion;
        }
        
        return 'v64.0'; // Default fallback
    }

    /**
     * Validate Salesforce ID format (15 or 18 characters)
     */
    static isValidSalesforceId(id: string): boolean {
        return /^[a-zA-Z0-9]{15}$|^[a-zA-Z0-9]{18}$/.test(id);
    }

    /**
     * Get external ID field from configuration with fallback
     */
    static getExternalIdField(objectType: 'product' | 'attributeDefinition' | 'attributePicklistValue'): string {
        const config = vscode.workspace.getConfiguration('revCloudBlueprint');
        
        switch (objectType) {
            case 'product':
                return config.get<string>('pricing.productExternalIdField', 'ProductCode');
            case 'attributeDefinition':
                return config.get<string>('pricing.attributeDefinitionExternalIdField', 'Code');
            case 'attributePicklistValue':
                return config.get<string>('pricing.attributePicklistValueExternalIdField', 'Code');
            default:
                return 'Code';
        }
    }

    /**
     * Get snapshot directory from configuration (Pricing)
     */
    static getSnapshotDirectory(): string {
        const config = vscode.workspace.getConfiguration('revCloudBlueprint');
        return config.get<string>('pricing.snapshotDirectory', 'revcloud_blueprint/pricing/snapshots');
    }

    /**
     * Get configurator snapshot directory from configuration
     */
    static getConfiguratorSnapshotDirectory(): string {
        const config = vscode.workspace.getConfiguration('revCloudBlueprint');
        return config.get<string>('configurator.snapshotDirectory', 'revcloud_blueprint/configurator/snapshots');
    }

    /**
     * Create standardized error message with context
     */
    static createErrorMessage(operation: string, error: any, context?: string): string {
        const contextMsg = context ? ` (${context})` : '';
        return `Failed to ${operation}${contextMsg}: ${error.message || error}`;
    }

    /**
     * Log API operation with consistent formatting
     */
    static logApiOperation(operation: string, orgAlias: string, details?: string): void {
        const detailsMsg = details ? ` - ${details}` : '';
        console.log(`[DEBUG] 🔗 API ${operation} for org: ${orgAlias}${detailsMsg}`);
    }

    /**
     * Validate required fields are present in an object
     */
    static validateRequiredFields(obj: any, requiredFields: string[], objectName: string): void {
        const missingFields = requiredFields.filter(field => !obj[field]);
        
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields in ${objectName}: ${missingFields.join(', ')}`);
        }
    }

    /**
     * Clean object by removing null/undefined values
     */
    static cleanObject(obj: any): any {
        const cleaned: any = {};
        
        Object.keys(obj).forEach(key => {
            const value = obj[key];
            if (value !== null && value !== undefined) {
                cleaned[key] = value;
            }
        });
        
        return cleaned;
    }

    /**
     * Build SOQL query with dynamic field list
     */
    static buildSoqlQuery(objectName: string, fields: string[], whereClause?: string, orderBy?: string, limit?: number): string {
        const fieldsStr = fields.join(', ');
        let query = `SELECT ${fieldsStr} FROM ${objectName}`;
        
        if (whereClause) {
            query += ` WHERE ${whereClause}`;
        }
        
        if (orderBy) {
            query += ` ORDER BY ${orderBy}`;
        }
        
        if (limit) {
            query += ` LIMIT ${limit}`;
        }
        
        return query;
    }

    /**
     * Extract object name variations for Revenue Cloud compatibility
     */
    static getObjectNameVariations(baseObjectName: string): string[] {
        const variations = [baseObjectName];
        return variations;
    }

    /**
     * Safely access nested object properties
     */
    static safeGet(obj: any, path: string, defaultValue: any = null): any {
        return path.split('.').reduce((current, key) => {
            return (current && current[key] !== undefined) ? current[key] : defaultValue;
        }, obj);
    }
}
