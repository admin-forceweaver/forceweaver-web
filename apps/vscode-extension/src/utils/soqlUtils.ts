/**
 * SOQL Utilities for safe query construction
 * Prevents SOQL injection attacks by properly escaping values
 */
export class SoqlUtils {
    
    /**
     * Escape string values for SOQL queries
     * Handles single quotes and other special characters
     */
    static escapeString(value: string): string {
        if (value === null || value === undefined) {
            return 'null';
        }
        
        // Convert to string and escape single quotes
        return `'${value.toString().replace(/'/g, "\\'")}'`;
    }

    /**
     * Escape numeric values for SOQL queries
     */
    static escapeNumber(value: number | string): string {
        if (value === null || value === undefined) {
            return 'null';
        }
        
        const num = typeof value === 'string' ? parseFloat(value) : value;
        if (isNaN(num)) {
            throw new Error(`Invalid numeric value for SOQL: ${value}`);
        }
        
        return num.toString();
    }

    /**
     * Escape boolean values for SOQL queries
     */
    static escapeBoolean(value: boolean): string {
        if (value === null || value === undefined) {
            return 'null';
        }
        
        return value ? 'true' : 'false';
    }

    /**
     * Escape date values for SOQL queries
     */
    static escapeDate(value: Date | string): string {
        if (value === null || value === undefined) {
            return 'null';
        }
        
        let date: Date;
        if (typeof value === 'string') {
            date = new Date(value);
            if (isNaN(date.getTime())) {
                throw new Error(`Invalid date value for SOQL: ${value}`);
            }
        } else {
            date = value;
        }
        
        // Format as ISO date string
        return date.toISOString().split('T')[0];
    }

    /**
     * Escape datetime values for SOQL queries
     */
    static escapeDateTime(value: Date | string): string {
        if (value === null || value === undefined) {
            return 'null';
        }
        
        let date: Date;
        if (typeof value === 'string') {
            date = new Date(value);
            if (isNaN(date.getTime())) {
                throw new Error(`Invalid datetime value for SOQL: ${value}`);
            }
        } else {
            date = value;
        }
        
        // Format as ISO datetime string
        return date.toISOString();
    }

    /**
     * Escape array values for SOQL IN clauses
     */
    static escapeStringArray(values: string[]): string {
        if (!values || values.length === 0) {
            return "('')"; // Empty set that won't match anything
        }
        
        const escapedValues = values.map(value => this.escapeString(value).slice(1, -1)); // Remove outer quotes
        return `('${escapedValues.join("','")}')`;
    }

    /**
     * Escape numeric array values for SOQL IN clauses
     */
    static escapeNumberArray(values: (number | string)[]): string {
        if (!values || values.length === 0) {
            return "(0)"; // Empty set that won't match anything
        }
        
        const escapedValues = values.map(value => this.escapeNumber(value));
        return `(${escapedValues.join(',')})`;
    }

    /**
     * Build safe SOQL query with parameter substitution
     * Uses named parameters like :paramName
     * 
     * Example:
     * buildQuery("SELECT Id FROM Account WHERE Name = :accountName AND Type = :accountType", {
     *   accountName: "Test Account",
     *   accountType: "Customer"
     * })
     */
    static buildQuery(template: string, parameters: Record<string, any>): string {
        let query = template;
        
        for (const [paramName, paramValue] of Object.entries(parameters)) {
            const placeholder = `:${paramName}`;
            
            if (!query.includes(placeholder)) {
                continue; // Skip parameters not used in query
            }
            
            let escapedValue: string;
            
            // Determine how to escape based on value type
            if (paramValue === null || paramValue === undefined) {
                escapedValue = 'null';
            } else if (typeof paramValue === 'string') {
                escapedValue = this.escapeString(paramValue);
            } else if (typeof paramValue === 'number') {
                escapedValue = this.escapeNumber(paramValue);
            } else if (typeof paramValue === 'boolean') {
                escapedValue = this.escapeBoolean(paramValue);
            } else if (paramValue instanceof Date) {
                escapedValue = this.escapeDateTime(paramValue);
            } else if (Array.isArray(paramValue)) {
                // Determine array type from first element
                if (paramValue.length === 0) {
                    escapedValue = "('')";
                } else if (typeof paramValue[0] === 'string') {
                    escapedValue = this.escapeStringArray(paramValue);
                } else if (typeof paramValue[0] === 'number') {
                    escapedValue = this.escapeNumberArray(paramValue);
                } else {
                    throw new Error(`Unsupported array parameter type for ${paramName}: ${typeof paramValue[0]}`);
                }
            } else {
                // Try to convert to string as fallback
                escapedValue = this.escapeString(paramValue.toString());
            }
            
            // Replace all occurrences of the parameter
            query = query.replace(new RegExp(`:${paramName}\\b`, 'g'), escapedValue);
        }
        
        // Check for any remaining unresolved parameters
        const unresolvedParams = query.match(/:(\w+)/g);
        if (unresolvedParams) {
            throw new Error(`Unresolved SOQL parameters: ${unresolvedParams.join(', ')}`);
        }
        
        return query;
    }

    /**
     * Validate field names to prevent injection through field selection
     * Only allows alphanumeric characters, underscores, and dots (for relationships)
     */
    static validateFieldName(fieldName: string): boolean {
        if (!fieldName || typeof fieldName !== 'string') {
            return false;
        }
        
        // Allow alphanumeric, underscore, dot, and __c for custom fields
        const fieldRegex = /^[a-zA-Z][a-zA-Z0-9_.]*(__c|__r)?$/;
        return fieldRegex.test(fieldName);
    }

    /**
     * Validate object names to prevent injection through FROM clauses
     * Only allows alphanumeric characters and underscores
     */
    static validateObjectName(objectName: string): boolean {
        if (!objectName || typeof objectName !== 'string') {
            return false;
        }
        
        // Allow alphanumeric, underscore, and __c for custom objects
        const objectRegex = /^[a-zA-Z][a-zA-Z0-9_]*(__c)?$/;
        return objectRegex.test(objectName);
    }

    /**
     * Build safe SELECT clause with field validation
     */
    static buildSelectClause(fields: string[]): string {
        if (!fields || fields.length === 0) {
            throw new Error('SELECT clause requires at least one field');
        }
        
        const validFields = fields.filter(field => this.validateFieldName(field));
        
        if (validFields.length !== fields.length) {
            const invalidFields = fields.filter(field => !this.validateFieldName(field));
            throw new Error(`Invalid field names: ${invalidFields.join(', ')}`);
        }
        
        return `SELECT ${validFields.join(', ')}`;
    }

    /**
     * Build safe FROM clause with object validation
     */
    static buildFromClause(objectName: string): string {
        if (!this.validateObjectName(objectName)) {
            throw new Error(`Invalid object name: ${objectName}`);
        }
        
        return `FROM ${objectName}`;
    }

    /**
     * Comprehensive query builder with full validation
     */
    static buildSafeQuery(config: {
        select: string[];
        from: string;
        where?: string;
        orderBy?: string;
        limit?: number;
        parameters?: Record<string, any>;
    }): string {
        const selectClause = this.buildSelectClause(config.select);
        const fromClause = this.buildFromClause(config.from);
        
        let query = `${selectClause} ${fromClause}`;
        
        if (config.where) {
            query += ` WHERE ${config.where}`;
        }
        
        if (config.orderBy) {
            // Validate ORDER BY fields
            const orderByFields = config.orderBy.split(',').map(f => f.trim().split(' ')[0]);
            const invalidOrderFields = orderByFields.filter(field => !this.validateFieldName(field));
            if (invalidOrderFields.length > 0) {
                throw new Error(`Invalid ORDER BY field names: ${invalidOrderFields.join(', ')}`);
            }
            query += ` ORDER BY ${config.orderBy}`;
        }
        
        if (config.limit && config.limit > 0) {
            const limitNum = parseInt(config.limit.toString());
            if (isNaN(limitNum) || limitNum <= 0) {
                throw new Error(`Invalid LIMIT value: ${config.limit}`);
            }
            query += ` LIMIT ${limitNum}`;
        }
        
        // Apply parameter substitution if provided
        if (config.parameters) {
            query = this.buildQuery(query, config.parameters);
        }
        
        return query;
    }
}
