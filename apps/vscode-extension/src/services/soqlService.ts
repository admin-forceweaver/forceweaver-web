import axios, { AxiosInstance } from 'axios';
import * as vscode from 'vscode';
import { SalesforceAuth, SalesforceOrg } from '../salesforce/auth';
import { ApiUtilityService } from './apiUtilityService';
import { ValidationService } from './validationService';
import { HttpClientFactory } from './httpClientFactory';
import { SoqlUtils } from '../utils/soqlUtils';

export interface SoqlResult {
    totalSize: number;
    done: boolean;
    records: any[];
}

/**
 * Service for SOQL query operations
 * Handles all Salesforce Object Query Language interactions
 */
export class SoqlService {
    private auth: SalesforceAuth;

    constructor(auth: SalesforceAuth) {
        this.auth = auth;
    }

    /**
     * Get or create HTTP client for org using centralized factory
     */
    private async getClient(orgAlias: string): Promise<AxiosInstance> {
        return await HttpClientFactory.getClient(orgAlias, this.auth, 30000);
    }

    /**
     * Execute SOQL query
     */
    async query(orgAlias: string, soql: string): Promise<SoqlResult> {
        try {
            ApiUtilityService.logApiOperation('SOQL Query', orgAlias, soql.substring(0, 100) + '...');
            
            const client = await this.getClient(orgAlias);
            const encodedQuery = encodeURIComponent(soql);
            const response = await client.get(`/query?q=${encodedQuery}`);
            
            console.log(`[DEBUG] ✅ SOQL query successful. Records returned: ${response.data.totalSize}`);
            
            return response.data;
        } catch (error: any) {
            const errorMessage = ApiUtilityService.createErrorMessage('execute SOQL query', error, orgAlias);
            console.error(`[ERROR] ${errorMessage}`);
            throw new Error(errorMessage);
        }
    }

    /**
     * Execute parameterized SOQL query with validation
     */
    async queryWithValidation(orgAlias: string, objectName: string, fields: string[], whereClause?: string, orderBy?: string, limit?: number, parameters?: Record<string, any>): Promise<SoqlResult> {
        // Validate parameters
        ValidationService.validateRequiredFields(
            { orgAlias, objectName, fields }, 
            ['orgAlias', 'objectName', 'fields'], 
            'SOQL query parameters'
        );

        if (fields.length === 0) {
            throw new Error('Fields array cannot be empty');
        }

        // Build safe query using SoqlUtils for security
        const soql = SoqlUtils.buildSafeQuery({
            select: fields,
            from: objectName,
            where: whereClause,
            orderBy: orderBy,
            limit: limit,
            parameters: parameters
        });
        
        return await this.query(orgAlias, soql);
    }

    /**
     * Query single record by ID
     */
    async queryById(orgAlias: string, objectName: string, recordId: string, fields: string[]): Promise<any> {
        ValidationService.validateRequiredFields(
            { objectName, recordId, fields }, 
            ['objectName', 'recordId', 'fields'], 
            'Query by ID parameters'
        );

        if (!ValidationService.isValidSalesforceId(recordId)) {
            throw new Error(`Invalid Salesforce ID format: ${recordId}`);
        }

        const result = await this.queryWithValidation(
            orgAlias, 
            objectName, 
            fields, 
            'Id = :recordId', 
            undefined, 
            1,
            { recordId }
        );

        if (result.records.length === 0) {
            throw new Error(`${objectName} record not found with ID: ${recordId}`);
        }

        return result.records[0];
    }

    /**
     * Query records by external ID field
     */
    async queryByExternalId(orgAlias: string, objectName: string, externalIdField: string, externalIdValue: string, fields: string[]): Promise<any[]> {
        ValidationService.validateRequiredFields(
            { objectName, externalIdField, externalIdValue, fields }, 
            ['objectName', 'externalIdField', 'externalIdValue', 'fields'], 
            'Query by external ID parameters'
        );

        const result = await this.queryWithValidation(
            orgAlias,
            objectName,
            fields,
            `${externalIdField} = :externalIdValue`,
            undefined,
            undefined,
            { externalIdValue }
        );

        return result.records;
    }

    /**
     * Check if records exist matching criteria
     */
    async recordsExist(orgAlias: string, objectName: string, whereClause: string): Promise<boolean> {
        try {
            const result = await this.queryWithValidation(orgAlias, objectName, ['Id'], whereClause, undefined, 1);
            return result.records.length > 0;
        } catch (error: any) {
            console.warn(`[WARN] Error checking record existence: ${error.message}`);
            return false;
        }
    }

    /**
     * Get record count for an object
     */
    async getRecordCount(orgAlias: string, objectName: string, whereClause?: string): Promise<number> {
        try {
            const result = await this.queryWithValidation(orgAlias, objectName, ['COUNT(Id)'], whereClause);
            return result.records[0]?.expr0 || 0;
        } catch (error: any) {
            console.warn(`[WARN] Error getting record count: ${error.message}`);
            return 0;
        }
    }

    /**
     * Build complex SOQL query with joins
     */
    buildQueryWithJoins(objectName: string, fields: string[], joins: Array<{ relationshipName: string; fields: string[] }>, whereClause?: string): string {
        let allFields = [...fields];
        
        // Add joined fields
        joins.forEach(join => {
            const joinFields = join.fields.map(field => `${join.relationshipName}.${field}`);
            allFields = allFields.concat(joinFields);
        });
        
        return ApiUtilityService.buildSoqlQuery(objectName, allFields, whereClause);
    }

    /**
     * Clear cached HTTP clients
     */
    clearClients(): void {
        HttpClientFactory.clearAllClients();
    }

    /**
     * Test connectivity to org
     */
    async testConnection(orgAlias: string): Promise<boolean> {
        try {
            await this.query(orgAlias, 'SELECT Id FROM Organization LIMIT 1');
            return true;
        } catch (error: any) {
            console.error(`[ERROR] Connection test failed for ${orgAlias}: ${error.message}`);
            return false;
        }
    }
}
