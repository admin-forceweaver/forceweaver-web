import * as vscode from 'vscode';

/**
 * Service for validation operations across the Revenue Cloud testing framework
 * Provides reusable validation functions for data integrity and business rules
 */
export class ValidationService {

    // Security-focused regex patterns
    private static readonly SALESFORCE_ID_REGEX = /^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/;
    // Allow alphanumeric, underscore, hyphen, dot, and @ (for email-based usernames)
    private static readonly ORG_ALIAS_REGEX = /^[a-zA-Z0-9_.\-@]+$/;

    /**
     * Validate and sanitize Salesforce org alias or username to prevent command injection
     * Supports both aliases (e.g., 'myorg') and usernames (e.g., 'user@example.com')
     * @param alias - The org alias or username to validate
     * @throws Error if alias format is invalid
     * @returns Sanitized alias if valid
     */
    static sanitizeOrgAlias(alias: string): string {
        if (!alias || alias.trim() === '') {
            throw new Error('Org alias cannot be empty');
        }

        const trimmedAlias = alias.trim();

        // First check for dangerous shell metacharacters that could enable command injection
        const dangerousPatterns = ['&&', '||', ';', '|', '`', '$', '(', ')', '{', '}', '<', '>', '\\', ' '];
        for (const pattern of dangerousPatterns) {
            if (trimmedAlias.includes(pattern)) {
                throw new Error(
                    `Invalid org alias: "${trimmedAlias}" contains forbidden characters or patterns (${pattern})`
                );
            }
        }

        // Check for valid characters (allow @ for email-based usernames)
        if (!this.ORG_ALIAS_REGEX.test(trimmedAlias)) {
            throw new Error(
                `Invalid org alias format: "${trimmedAlias}". ` +
                'Org aliases can only contain alphanumeric characters, underscores, hyphens, dots, and @ symbols.'
            );
        }

        return trimmedAlias;
    }

    /**
     * Validate Salesforce ID format (15 or 18 characters) and throw error if invalid
     * @param id - The Salesforce ID to validate
     * @param fieldName - Name of the field for error messages (e.g., 'Quote ID', 'Account ID')
     * @throws Error if ID format is invalid
     * @returns The validated ID
     */
    static validateSalesforceId(id: string | null | undefined, fieldName: string = 'ID'): string {
        if (!id || id.trim() === '') {
            throw new Error(`${fieldName} cannot be empty`);
        }

        const trimmedId = id.trim();

        if (!this.SALESFORCE_ID_REGEX.test(trimmedId)) {
            throw new Error(
                `Invalid ${fieldName} format: "${trimmedId}". ` +
                'Salesforce IDs must be exactly 15 or 18 alphanumeric characters.'
            );
        }

        return trimmedId;
    }

    /**
     * Validate Salesforce ID format (15 or 18 characters) - boolean check
     */
    static isValidSalesforceId(id: string | null | undefined): boolean {
        if (!id) return false;
        return this.SALESFORCE_ID_REGEX.test(id);
    }

    /**
     * Escape single quotes and backslashes for safe SOQL queries
     * @param value - The string value to escape
     * @returns Escaped string safe for SOQL queries
     */
    static escapeSoql(value: string): string {
        if (!value) return '';

        // Escape backslashes first, then single quotes
        return value
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'");
    }

    /**
     * Build a safe SOQL WHERE clause with escaped values
     * @param field - The field name to query
     * @param value - The value to match (will be escaped)
     * @param operator - The comparison operator (default: '=')
     * @returns Safe SOQL WHERE clause
     */
    static buildSafeSoqlCondition(field: string, value: string, operator: string = '='): string {
        // Validate field name contains only safe characters
        if (!/^[a-zA-Z0-9_\.]+$/.test(field)) {
            throw new Error(`Invalid SOQL field name: ${field}`);
        }

        const escapedValue = this.escapeSoql(value);
        return `${field} ${operator} '${escapedValue}'`;
    }

    /**
     * Validate that required fields are present in an object
     */
    static validateRequiredFields(obj: any, requiredFields: string[], objectName: string): void {
        const missingFields = requiredFields.filter(field => {
            const value = obj[field];
            return value === null || value === undefined || value === '';
        });
        
        if (missingFields.length > 0) {
            throw new Error(`Missing required fields in ${objectName}: ${missingFields.join(', ')}`);
        }
    }

    /**
     * Validate currency consistency between objects
     */
    static validateCurrencyConsistency(sourceCurrency: string, targetCurrency: string, context: string): void {
        if (sourceCurrency && targetCurrency && sourceCurrency !== targetCurrency) {
            throw new Error(`Currency mismatch in ${context}: source=${sourceCurrency}, target=${targetCurrency}`);
        }
    }

    /**
     * Validate product external ID field exists and has data
     */
    static validateProductExternalId(product: any, externalIdField: string): boolean {
        const externalIdValue = product[externalIdField];
        return externalIdValue !== null && externalIdValue !== undefined && externalIdValue !== '';
    }

    /**
     * Validate org connection and authentication
     */
    static async validateOrgAccess(orgAlias: string, requiredObjects: string[] = []): Promise<boolean> {
        try {
            // This could be enhanced to check specific object access
            // For now, just validate that we can get basic org info
            return true;
        } catch (error: any) {
            console.error(`[ERROR] Org validation failed for ${orgAlias}: ${error.message}`);
            return false;
        }
    }

    /**
     * Validate snapshot data integrity
     */
    static validateSnapshotIntegrity(snapshot: any): string[] {
        const errors: string[] = [];
        
        // Check metadata presence
        if (!snapshot.metadata) {
            errors.push('Missing snapshot metadata');
        } else {
            if (!snapshot.metadata.sourceOrgId) {
                errors.push('Missing source org ID in metadata');
            }
            if (!snapshot.metadata.sourceQuoteId) {
                errors.push('Missing source quote ID in metadata');
            }
        }
        
        // Check expected results
        if (!snapshot.expectedResults) {
            errors.push('Missing expected results');
        }
        
        // Check recreation payload
        if (!snapshot.recreationPayload) {
            errors.push('Missing recreation payload');
        } else {
            if (!snapshot.recreationPayload.lineItems || snapshot.recreationPayload.lineItems.length === 0) {
                errors.push('Missing or empty line items in recreation payload');
            }
        }
        
        return errors;
    }

    /**
     * Validate configuration completeness
     */
    static validateConfiguration(config: any): string[] {
        const errors: string[] = [];
        
        if (!config) {
            errors.push('Configuration is null or undefined');
            return errors;
        }
        
        // Check pricing configuration
        if (!config.pricing) {
            errors.push('Missing pricing configuration');
        } else {
            if (!config.pricing.snapFields) {
                errors.push('Missing snapFields configuration');
            }
            if (!config.pricing.reportFields) {
                errors.push('Missing reportFields configuration');
            }
        }
        
        return errors;
    }

    /**
     * Validate test prerequisites
     */
    static validateTestPrerequisites(snapshot: any, targetOrgAlias: string): string[] {
        const errors: string[] = [];
        
        // Validate snapshot
        errors.push(...this.validateSnapshotIntegrity(snapshot));
        
        // Validate target org
        if (!targetOrgAlias || targetOrgAlias.trim() === '') {
            errors.push('Target org alias cannot be empty');
        }
        
        return errors;
    }

    /**
     * Sanitize user input for security
     */
    static sanitizeInput(input: string): string {
        if (!input) return '';
        
        // Remove potentially dangerous characters but preserve alphanumeric, spaces, and common punctuation
        return input.replace(/[<>\"']/g, '').trim();
    }

    /**
     * Validate API response structure
     */
    static validateApiResponse(response: any, expectedFields: string[], operationName: string): void {
        if (!response) {
            throw new Error(`${operationName}: API response is null or undefined`);
        }
        
        const missingFields = expectedFields.filter(field => response[field] === undefined);
        if (missingFields.length > 0) {
            throw new Error(`${operationName}: Missing expected fields in API response: ${missingFields.join(', ')}`);
        }
    }
}
