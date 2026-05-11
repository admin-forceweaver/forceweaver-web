import { ApiUtilityService } from '../../services/apiUtilityService';
import * as vscode from 'vscode';

describe('ApiUtilityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getApiVersion', () => {
    it('should return configured version when provided', () => {
      const mockConfig = {
        get: jest.fn().mockReturnValue('v62.0')
      };
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

      const version = ApiUtilityService.getApiVersion();

      expect(version).toBe('v62.0');
      expect(mockConfig.get).toHaveBeenCalledWith('salesforce.apiVersion', '');
    });

    it('should return default version when config is empty', () => {
      const mockConfig = {
        get: jest.fn().mockReturnValue('')
      };
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

      const version = ApiUtilityService.getApiVersion();

      expect(version).toBe('v64.0');
    });

    it('should return default version when config is whitespace only', () => {
      const mockConfig = {
        get: jest.fn().mockReturnValue('   ')
      };
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

      const version = ApiUtilityService.getApiVersion();

      expect(version).toBe('v64.0');
    });
  });

  describe('isValidSalesforceId', () => {
    it('should validate 15-character Salesforce IDs', () => {
      expect(ApiUtilityService.isValidSalesforceId('001000000000001')).toBe(true);
      expect(ApiUtilityService.isValidSalesforceId('0Q0000000000001')).toBe(true);
      expect(ApiUtilityService.isValidSalesforceId('006000000000001')).toBe(true);
    });

    it('should validate 18-character Salesforce IDs', () => {
      expect(ApiUtilityService.isValidSalesforceId('001000000000001AAA')).toBe(true);
      expect(ApiUtilityService.isValidSalesforceId('0Q0000000000001BBB')).toBe(true);
      expect(ApiUtilityService.isValidSalesforceId('006000000000001CCC')).toBe(true);
    });

    it('should reject invalid ID formats', () => {
      expect(ApiUtilityService.isValidSalesforceId('')).toBe(false);
      expect(ApiUtilityService.isValidSalesforceId('short')).toBe(false);
      expect(ApiUtilityService.isValidSalesforceId('001000000000001TOOLONG')).toBe(false);
      expect(ApiUtilityService.isValidSalesforceId('00100000000000')).toBe(false); // 14 chars
      expect(ApiUtilityService.isValidSalesforceId('0010000000000011')).toBe(false); // 16 chars
      expect(ApiUtilityService.isValidSalesforceId('001000000000001A')).toBe(false); // 16 chars
      expect(ApiUtilityService.isValidSalesforceId('001000000000001AA')).toBe(false); // 17 chars
      expect(ApiUtilityService.isValidSalesforceId('001-000-000-001')).toBe(false); // Special chars
    });

    it('should handle null and undefined', () => {
      expect(ApiUtilityService.isValidSalesforceId(null as any)).toBe(false);
      expect(ApiUtilityService.isValidSalesforceId(undefined as any)).toBe(false);
    });
  });

  describe('getExternalIdField', () => {
    it('should return configured product external ID field', () => {
      const mockConfig = {
        get: jest.fn().mockReturnValue('ProductCode')
      };
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

      const field = ApiUtilityService.getExternalIdField('product');

      expect(field).toBe('ProductCode');
      expect(mockConfig.get).toHaveBeenCalledWith('pricing.productExternalIdField', 'ProductCode');
    });

    it('should return configured attribute definition external ID field', () => {
      const mockConfig = {
        get: jest.fn().mockReturnValue('CustomCode__c')
      };
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

      const field = ApiUtilityService.getExternalIdField('attributeDefinition');

      expect(field).toBe('CustomCode__c');
      expect(mockConfig.get).toHaveBeenCalledWith('pricing.attributeDefinitionExternalIdField', 'Code');
    });

    it('should return configured attribute picklist value external ID field', () => {
      const mockConfig = {
        get: jest.fn().mockReturnValue('Value__c')
      };
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

      const field = ApiUtilityService.getExternalIdField('attributePicklistValue');

      expect(field).toBe('Value__c');
      expect(mockConfig.get).toHaveBeenCalledWith('pricing.attributePicklistValueExternalIdField', 'Code');
    });

    it('should return default Code for unknown object types', () => {
      const field = ApiUtilityService.getExternalIdField('unknown' as any);

      expect(field).toBe('Code');
    });
  });

  describe('getSnapshotDirectory', () => {
    it('should return configured directory when provided', () => {
      const mockConfig = {
        get: jest.fn().mockReturnValue('custom/snapshot/directory')
      };
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

      const directory = ApiUtilityService.getSnapshotDirectory();

      expect(directory).toBe('custom/snapshot/directory');
      expect(mockConfig.get).toHaveBeenCalledWith('pricing.snapshotDirectory', 'revcloud_blueprint/pricing/snapshots');
    });

    it('should return default directory when not configured', () => {
      const mockConfig = {
        get: jest.fn().mockReturnValue('revcloud_blueprint/pricing/snapshots')
      };
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

      const directory = ApiUtilityService.getSnapshotDirectory();

      expect(directory).toBe('revcloud_blueprint/pricing/snapshots');
    });
  });

  describe('createErrorMessage', () => {
    it('should create error message with context', () => {
      const error = new Error('Connection timeout');
      const message = ApiUtilityService.createErrorMessage('connect to org', error, 'test-org');

      expect(message).toBe('Failed to connect to org (test-org): Connection timeout');
    });

    it('should create error message without context', () => {
      const error = new Error('Invalid query');
      const message = ApiUtilityService.createErrorMessage('execute query', error);

      expect(message).toBe('Failed to execute query: Invalid query');
    });

    it('should handle string errors', () => {
      const message = ApiUtilityService.createErrorMessage('process data', 'String error message');

      expect(message).toBe('Failed to process data: String error message');
    });
  });

  describe('validateRequiredFields', () => {
    it('should pass validation when all required fields are present', () => {
      const obj = {
        field1: 'value1',
        field2: 'value2'
      };

      expect(() => {
        ApiUtilityService.validateRequiredFields(obj, ['field1', 'field2'], 'TestObject');
      }).not.toThrow();
    });

    it('should throw error when required fields are missing', () => {
      const obj = {
        field1: 'value1',
        field2: null,
        field3: undefined
        // field4 is missing entirely
      };

      expect(() => {
        ApiUtilityService.validateRequiredFields(obj, ['field1', 'field2', 'field3', 'field4'], 'TestObject');
      }).toThrow('Missing required fields in TestObject: field2, field3, field4');
    });
  });

  describe('cleanObject', () => {
    it('should remove null and undefined values', () => {
      const obj = {
        field1: 'value1',
        field2: null,
        field3: undefined,
        field4: 0,
        field5: false,
        field6: ''
      };

      const cleaned = ApiUtilityService.cleanObject(obj);

      expect(cleaned).toEqual({
        field1: 'value1',
        field4: 0,
        field5: false,
        field6: ''
      });
    });

    it('should handle empty object', () => {
      const cleaned = ApiUtilityService.cleanObject({});

      expect(cleaned).toEqual({});
    });
  });

  describe('buildSoqlQuery', () => {
    it('should build basic SOQL query', () => {
      const query = ApiUtilityService.buildSoqlQuery('Account', ['Id', 'Name']);

      expect(query).toBe('SELECT Id, Name FROM Account');
    });

    it('should build SOQL query with WHERE clause', () => {
      const query = ApiUtilityService.buildSoqlQuery('Account', ['Id', 'Name'], 'Type = \'Customer\'');

      expect(query).toBe('SELECT Id, Name FROM Account WHERE Type = \'Customer\'');
    });

    it('should build SOQL query with ORDER BY', () => {
      const query = ApiUtilityService.buildSoqlQuery('Account', ['Id', 'Name'], undefined, 'Name ASC');

      expect(query).toBe('SELECT Id, Name FROM Account ORDER BY Name ASC');
    });

    it('should build SOQL query with LIMIT', () => {
      const query = ApiUtilityService.buildSoqlQuery('Account', ['Id', 'Name'], undefined, undefined, 10);

      expect(query).toBe('SELECT Id, Name FROM Account LIMIT 10');
    });

    it('should build complete SOQL query with all parameters', () => {
      const query = ApiUtilityService.buildSoqlQuery(
        'Account', 
        ['Id', 'Name'], 
        'Type = \'Customer\'', 
        'Name ASC', 
        10
      );

      expect(query).toBe('SELECT Id, Name FROM Account WHERE Type = \'Customer\' ORDER BY Name ASC LIMIT 10');
    });
  });

  describe('getObjectNameVariations', () => {
    it('should return base object name only (no SBQQ__ variations for Revenue Cloud)', () => {
      const variations = ApiUtilityService.getObjectNameVariations('Quote');

      expect(variations).toEqual(['Quote']);
    });

    it('should return base object name as-is', () => {
      const variations = ApiUtilityService.getObjectNameVariations('QuoteLineItem');

      expect(variations).toEqual(['QuoteLineItem']);
    });
  });

  describe('safeGet', () => {
    it('should safely access nested properties', () => {
      const obj = {
        level1: {
          level2: {
            level3: 'value'
          }
        }
      };

      const result = ApiUtilityService.safeGet(obj, 'level1.level2.level3');

      expect(result).toBe('value');
    });

    it('should return default value for missing properties', () => {
      const obj = {
        level1: {
          level2: {}
        }
      };

      const result = ApiUtilityService.safeGet(obj, 'level1.level2.missing', 'default');

      expect(result).toBe('default');
    });

    it('should handle null objects gracefully', () => {
      const result = ApiUtilityService.safeGet(null, 'level1.level2', 'default');

      expect(result).toBe('default');
    });
  });
});
