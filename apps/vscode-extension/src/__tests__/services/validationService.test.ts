import { ValidationService } from '../../services/validationService';
import { SalesforceAuth, SalesforceOrg } from '../../salesforce/auth';

// Mock dependencies
jest.mock('../../salesforce/auth');

describe('ValidationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isValidSalesforceId', () => {
    it('should validate 15-character Salesforce IDs', () => {
      expect(ValidationService.isValidSalesforceId('001000000000001')).toBe(true);
      expect(ValidationService.isValidSalesforceId('0Q0000000000001')).toBe(true);
      expect(ValidationService.isValidSalesforceId('006000000000001')).toBe(true);
    });

    it('should validate 18-character Salesforce IDs', () => {
      expect(ValidationService.isValidSalesforceId('001000000000001AAA')).toBe(true);
      expect(ValidationService.isValidSalesforceId('0Q0000000000001BBB')).toBe(true);
      expect(ValidationService.isValidSalesforceId('006000000000001CCC')).toBe(true);
    });

    it('should reject invalid ID formats', () => {
      expect(ValidationService.isValidSalesforceId('')).toBe(false);
      expect(ValidationService.isValidSalesforceId('short')).toBe(false);
      expect(ValidationService.isValidSalesforceId('001000000000001TOOLONG')).toBe(false);
      expect(ValidationService.isValidSalesforceId('00100000000000')).toBe(false); // 14 chars
      expect(ValidationService.isValidSalesforceId('001-000-000-001')).toBe(false); // Special chars
    });

    it('should handle null and undefined', () => {
      expect(ValidationService.isValidSalesforceId(null)).toBe(false);
      expect(ValidationService.isValidSalesforceId(undefined)).toBe(false);
    });
  });

  describe('validateRequiredFields', () => {
    it('should pass validation when all required fields are present', () => {
      const obj = {
        field1: 'value1',
        field2: 'value2',
        field3: 0,
        field4: false
      };

      expect(() => {
        ValidationService.validateRequiredFields(obj, ['field1', 'field2', 'field3', 'field4'], 'TestObject');
      }).not.toThrow();
    });

    it('should throw error when required fields are missing', () => {
      const obj = {
        field1: 'value1',
        field2: null,
        field3: undefined,
        field4: ''
      };

      expect(() => {
        ValidationService.validateRequiredFields(obj, ['field1', 'field2', 'field3', 'field4'], 'TestObject');
      }).toThrow('Missing required fields in TestObject: field2, field3, field4');
    });

    it('should handle empty required fields array', () => {
      const obj = { field1: 'value1' };

      expect(() => {
        ValidationService.validateRequiredFields(obj, [], 'TestObject');
      }).not.toThrow();
    });

    it('should handle missing object properties', () => {
      const obj = { field1: 'value1' };

      expect(() => {
        ValidationService.validateRequiredFields(obj, ['field1', 'nonexistent'], 'TestObject');
      }).toThrow('Missing required fields in TestObject: nonexistent');
    });

    it('should accept zero and false as valid values', () => {
      const obj = {
        numField: 0,
        boolField: false
      };

      expect(() => {
        ValidationService.validateRequiredFields(obj, ['numField', 'boolField'], 'TestObject');
      }).not.toThrow();
    });
  });

  describe('validateCurrencyConsistency', () => {
    it('should pass when currencies match', () => {
      expect(() => {
        ValidationService.validateCurrencyConsistency('USD', 'USD', 'test context');
      }).not.toThrow();
    });

    it('should throw error when currencies do not match', () => {
      expect(() => {
        ValidationService.validateCurrencyConsistency('USD', 'EUR', 'test context');
      }).toThrow('Currency mismatch in test context: source=USD, target=EUR');
    });

    it('should pass when either currency is empty', () => {
      expect(() => {
        ValidationService.validateCurrencyConsistency('', 'EUR', 'test context');
      }).not.toThrow();

      expect(() => {
        ValidationService.validateCurrencyConsistency('USD', '', 'test context');
      }).not.toThrow();

      expect(() => {
        ValidationService.validateCurrencyConsistency('', '', 'test context');
      }).not.toThrow();
    });

    it('should handle null and undefined currencies', () => {
      expect(() => {
        ValidationService.validateCurrencyConsistency(null as any, 'EUR', 'test context');
      }).not.toThrow();

      expect(() => {
        ValidationService.validateCurrencyConsistency('USD', undefined as any, 'test context');
      }).not.toThrow();
    });
  });

  describe('validateProductExternalId', () => {
    it('should return true for valid external ID values', () => {
      const product1 = { ProductCode: 'PROD-001' };
      const product2 = { Product_SKU__c: 'SKU-001' };
      const product3 = { ExternalId: 0 }; // Zero is valid
      const product4 = { ExternalId: false }; // False is valid

      expect(ValidationService.validateProductExternalId(product1, 'ProductCode')).toBe(true);
      expect(ValidationService.validateProductExternalId(product2, 'Product_SKU__c')).toBe(true);
      expect(ValidationService.validateProductExternalId(product3, 'ExternalId')).toBe(true);
      expect(ValidationService.validateProductExternalId(product4, 'ExternalId')).toBe(true);
    });

    it('should return false for invalid external ID values', () => {
      const product1 = { ProductCode: null };
      const product2 = { Product_SKU__c: undefined };
      const product3 = { ExternalId: '' };
      const product4 = {}; // Missing field

      expect(ValidationService.validateProductExternalId(product1, 'ProductCode')).toBe(false);
      expect(ValidationService.validateProductExternalId(product2, 'Product_SKU__c')).toBe(false);
      expect(ValidationService.validateProductExternalId(product3, 'ExternalId')).toBe(false);
      expect(ValidationService.validateProductExternalId(product4, 'MissingField')).toBe(false);
    });
  });

  describe('validateOrgAccess', () => {
    it('should return true for valid org access', async () => {
      const result = await ValidationService.validateOrgAccess('test-org');

      expect(result).toBe(true);
    });

    it('should return true with required objects', async () => {
      const result = await ValidationService.validateOrgAccess('test-org', ['Account', 'Contact']);

      expect(result).toBe(true);
    });
  });

  describe('validateSnapshotIntegrity', () => {
    it('should validate complete snapshot', () => {
      const validSnapshot = {
        metadata: {
          sourceOrgId: '00D000000000001',
          sourceQuoteId: '0Q0000000000001'
        },
        expectedResults: {
          quoteFields: { GrandTotal: 1000 }
        },
        recreationPayload: {
          lineItems: [{
            productIdentifier: { type: 'externalId', value: 'SKU-001' },
            quantity: 1
          }]
        }
      };

      const errors = ValidationService.validateSnapshotIntegrity(validSnapshot);

      expect(errors).toEqual([]);
    });

    it('should detect missing metadata', () => {
      const invalidSnapshot = {
        expectedResults: {},
        recreationPayload: { lineItems: [] }
      };

      const errors = ValidationService.validateSnapshotIntegrity(invalidSnapshot);

      expect(errors).toContain('Missing snapshot metadata');
    });

    it('should detect missing source org ID', () => {
      const invalidSnapshot = {
        metadata: {
          sourceQuoteId: '0Q0000000000001'
          // Missing sourceOrgId
        },
        expectedResults: {},
        recreationPayload: { lineItems: [] }
      };

      const errors = ValidationService.validateSnapshotIntegrity(invalidSnapshot);

      expect(errors).toContain('Missing source org ID in metadata');
    });

    it('should detect missing expected results', () => {
      const invalidSnapshot = {
        metadata: {
          sourceOrgId: '00D000000000001',
          sourceQuoteId: '0Q0000000000001'
        },
        recreationPayload: { lineItems: [] }
      };

      const errors = ValidationService.validateSnapshotIntegrity(invalidSnapshot);

      expect(errors).toContain('Missing expected results');
    });

    it('should detect missing recreation payload', () => {
      const invalidSnapshot = {
        metadata: {
          sourceOrgId: '00D000000000001',
          sourceQuoteId: '0Q0000000000001'
        },
        expectedResults: {}
      };

      const errors = ValidationService.validateSnapshotIntegrity(invalidSnapshot);

      expect(errors).toContain('Missing recreation payload');
    });

    it('should detect empty line items', () => {
      const invalidSnapshot = {
        metadata: {
          sourceOrgId: '00D000000000001',
          sourceQuoteId: '0Q0000000000001'
        },
        expectedResults: {},
        recreationPayload: {
          lineItems: []
        }
      };

      const errors = ValidationService.validateSnapshotIntegrity(invalidSnapshot);

      expect(errors).toContain('Missing or empty line items in recreation payload');
    });
  });

  describe('validateConfiguration', () => {
    it('should pass for valid configuration', () => {
      const validConfig = {
        pricing: {
          snapFields: ['Field1', 'Field2'],
          reportFields: ['Field3', 'Field4']
        }
      };

      const errors = ValidationService.validateConfiguration(validConfig);

      expect(errors).toEqual([]);
    });

    it('should detect null or undefined config', () => {
      expect(ValidationService.validateConfiguration(null)).toContain('Configuration is null or undefined');
      expect(ValidationService.validateConfiguration(undefined)).toContain('Configuration is null or undefined');
    });

    it('should detect missing pricing configuration', () => {
      const invalidConfig = { other: 'data' };

      const errors = ValidationService.validateConfiguration(invalidConfig);

      expect(errors).toContain('Missing pricing configuration');
    });

    it('should detect missing snapFields', () => {
      const invalidConfig = {
        pricing: {
          reportFields: ['Field1']
        }
      };

      const errors = ValidationService.validateConfiguration(invalidConfig);

      expect(errors).toContain('Missing snapFields configuration');
    });

    it('should detect missing reportFields', () => {
      const invalidConfig = {
        pricing: {
          snapFields: ['Field1']
        }
      };

      const errors = ValidationService.validateConfiguration(invalidConfig);

      expect(errors).toContain('Missing reportFields configuration');
    });

    it('should detect multiple configuration issues', () => {
      const invalidConfig = { pricing: {} };

      const errors = ValidationService.validateConfiguration(invalidConfig);

      expect(errors).toContain('Missing snapFields configuration');
      expect(errors).toContain('Missing reportFields configuration');
    });
  });

  describe('validateTestPrerequisites', () => {
    it('should pass for valid snapshot and target org', () => {
      const validSnapshot = {
        metadata: {
          sourceOrgId: '00D000000000001',
          sourceQuoteId: '0Q0000000000001'
        },
        expectedResults: { quoteFields: {} },
        recreationPayload: {
          lineItems: [{ productIdentifier: { type: 'externalId', value: 'SKU-001' }, quantity: 1 }]
        }
      };

      const errors = ValidationService.validateTestPrerequisites(validSnapshot, 'test-org');

      expect(errors).toEqual([]);
    });

    it('should detect invalid snapshot', () => {
      const invalidSnapshot = { metadata: {} };

      const errors = ValidationService.validateTestPrerequisites(invalidSnapshot, 'test-org');

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect empty target org alias', () => {
      const validSnapshot = {
        metadata: {
          sourceOrgId: '00D000000000001',
          sourceQuoteId: '0Q0000000000001'
        },
        expectedResults: {},
        recreationPayload: { lineItems: [{}] }
      };

      const errors = ValidationService.validateTestPrerequisites(validSnapshot, '');

      expect(errors).toContain('Target org alias cannot be empty');
    });

    it('should detect whitespace-only target org alias', () => {
      const validSnapshot = {
        metadata: {
          sourceOrgId: '00D000000000001',
          sourceQuoteId: '0Q0000000000001'
        },
        expectedResults: {},
        recreationPayload: { lineItems: [{}] }
      };

      const errors = ValidationService.validateTestPrerequisites(validSnapshot, '   ');

      expect(errors).toContain('Target org alias cannot be empty');
    });

    it('should combine snapshot and org errors', () => {
      const invalidSnapshot = { metadata: {} };

      const errors = ValidationService.validateTestPrerequisites(invalidSnapshot, '');

      expect(errors.length).toBeGreaterThan(1);
      expect(errors).toContain('Target org alias cannot be empty');
    });
  });

  describe('sanitizeInput', () => {
    it('should remove dangerous characters', () => {
      const input = '<script>alert("xss")</script>';
      const sanitized = ValidationService.sanitizeInput(input);

      expect(sanitized).toBe('scriptalert(xss)/script');
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });

    it('should remove quotes', () => {
      const input = 'Test "quoted" and \'single\' quotes';
      const sanitized = ValidationService.sanitizeInput(input);

      expect(sanitized).not.toContain('"');
      expect(sanitized).not.toContain("'");
    });

    it('should preserve alphanumeric and spaces', () => {
      const input = 'Test 123 ABC xyz';
      const sanitized = ValidationService.sanitizeInput(input);

      expect(sanitized).toBe('Test 123 ABC xyz');
    });

    it('should trim whitespace', () => {
      const input = '  Test Input  ';
      const sanitized = ValidationService.sanitizeInput(input);

      expect(sanitized).toBe('Test Input');
    });

    it('should handle empty string', () => {
      expect(ValidationService.sanitizeInput('')).toBe('');
    });

    it('should handle null and undefined', () => {
      expect(ValidationService.sanitizeInput(null as any)).toBe('');
      expect(ValidationService.sanitizeInput(undefined as any)).toBe('');
    });
  });

  describe('validateApiResponse', () => {
    it('should pass for valid API response', () => {
      const response = {
        field1: 'value1',
        field2: 'value2',
        field3: 0
      };

      expect(() => {
        ValidationService.validateApiResponse(response, ['field1', 'field2', 'field3'], 'TestOperation');
      }).not.toThrow();
    });

    it('should throw error for null response', () => {
      expect(() => {
        ValidationService.validateApiResponse(null, ['field1'], 'TestOperation');
      }).toThrow('TestOperation: API response is null or undefined');
    });

    it('should throw error for undefined response', () => {
      expect(() => {
        ValidationService.validateApiResponse(undefined, ['field1'], 'TestOperation');
      }).toThrow('TestOperation: API response is null or undefined');
    });

    it('should detect missing fields', () => {
      const response = {
        field1: 'value1'
      };

      expect(() => {
        ValidationService.validateApiResponse(response, ['field1', 'field2', 'field3'], 'TestOperation');
      }).toThrow('TestOperation: Missing expected fields in API response: field2, field3');
    });

    it('should allow fields with falsy values', () => {
      const response = {
        field1: 0,
        field2: false,
        field3: ''
      };

      expect(() => {
        ValidationService.validateApiResponse(response, ['field1', 'field2', 'field3'], 'TestOperation');
      }).not.toThrow();
    });
  });

  describe('sanitizeOrgAlias', () => {
    it('should accept valid org aliases', () => {
      expect(ValidationService.sanitizeOrgAlias('myorg')).toBe('myorg');
      expect(ValidationService.sanitizeOrgAlias('my-org')).toBe('my-org');
      expect(ValidationService.sanitizeOrgAlias('my_org')).toBe('my_org');
      expect(ValidationService.sanitizeOrgAlias('my.org')).toBe('my.org');
      expect(ValidationService.sanitizeOrgAlias('MyOrg123')).toBe('MyOrg123');
    });

    it('should accept valid Salesforce usernames (email addresses)', () => {
      expect(ValidationService.sanitizeOrgAlias('user@example.com')).toBe('user@example.com');
      expect(ValidationService.sanitizeOrgAlias('rohit.radhakrishnan@finastra.com.entdev')).toBe('rohit.radhakrishnan@finastra.com.entdev');
      expect(ValidationService.sanitizeOrgAlias('test-user@domain.co.uk')).toBe('test-user@domain.co.uk');
      expect(ValidationService.sanitizeOrgAlias('admin_user@salesforce.com')).toBe('admin_user@salesforce.com');
    });

    it('should trim whitespace', () => {
      expect(ValidationService.sanitizeOrgAlias('  myorg  ')).toBe('myorg');
      expect(ValidationService.sanitizeOrgAlias('  user@example.com  ')).toBe('user@example.com');
    });

    it('should reject aliases with dangerous shell metacharacters', () => {
      expect(() => ValidationService.sanitizeOrgAlias('myorg && rm -rf /')).toThrow('forbidden characters');
      expect(() => ValidationService.sanitizeOrgAlias('myorg || echo bad')).toThrow('forbidden characters');
      expect(() => ValidationService.sanitizeOrgAlias('myorg; ls')).toThrow('forbidden characters');
      expect(() => ValidationService.sanitizeOrgAlias('myorg | cat')).toThrow('forbidden characters');
      expect(() => ValidationService.sanitizeOrgAlias('myorg`whoami`')).toThrow('forbidden characters');
      expect(() => ValidationService.sanitizeOrgAlias('$(malicious)')).toThrow('forbidden characters');
      expect(() => ValidationService.sanitizeOrgAlias('org<script>')).toThrow('forbidden characters');
      expect(() => ValidationService.sanitizeOrgAlias('org>file')).toThrow('forbidden characters');
      expect(() => ValidationService.sanitizeOrgAlias('org\\escape')).toThrow('forbidden characters');
    });

    it('should reject empty or whitespace-only aliases', () => {
      expect(() => ValidationService.sanitizeOrgAlias('')).toThrow('Org alias cannot be empty');
      expect(() => ValidationService.sanitizeOrgAlias('   ')).toThrow('Org alias cannot be empty');
    });

    it('should reject aliases with spaces', () => {
      expect(() => ValidationService.sanitizeOrgAlias('my org')).toThrow('forbidden characters');
      expect(() => ValidationService.sanitizeOrgAlias('user @example.com')).toThrow('forbidden characters');
    });

    it('should reject aliases with invalid characters', () => {
      expect(() => ValidationService.sanitizeOrgAlias('org#name')).toThrow('Invalid org alias format');
      expect(() => ValidationService.sanitizeOrgAlias('org%name')).toThrow('Invalid org alias format');
      expect(() => ValidationService.sanitizeOrgAlias('org!name')).toThrow('Invalid org alias format');
    });
  });


});
