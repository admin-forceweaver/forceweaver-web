import { SchemaDiscoveryService } from '../../services/schemaDiscoveryService';
import { SalesforceAuth } from '../../salesforce/auth';
import { FieldDiscoveryService } from '../../services/fieldDiscoveryService';
import { ApiUtilityService } from '../../services/apiUtilityService';

jest.mock('../../salesforce/auth');
jest.mock('vscode');
jest.mock('../../services/fieldDiscoveryService');
jest.mock('../../services/apiUtilityService');

const mockAuth = new SalesforceAuth() as jest.Mocked<SalesforceAuth>;

describe('SchemaDiscoveryService', () => {
  let schemaService: SchemaDiscoveryService;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    schemaService = new SchemaDiscoveryService(mockAuth);

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create SchemaDiscoveryService instance', () => {
      expect(schemaService).toBeInstanceOf(SchemaDiscoveryService);
    });

    it('should initialize with empty cache', () => {
      expect((schemaService as any).schemaCache.size).toBe(0);
    });

    it('should store auth instance', () => {
      expect((schemaService as any).auth).toBe(mockAuth);
    });
  });

  describe('clearCache', () => {
    it('should clear schema cache', () => {
      (schemaService as any).schemaCache.set('test-key', 'test-value');
      (schemaService as any).schemaCache.set('test-key2', 'test-value2');
      expect((schemaService as any).schemaCache.size).toBe(2);

      schemaService.clearCache();

      expect((schemaService as any).schemaCache.size).toBe(0);
    });

    it('should work on already empty cache', () => {
      expect((schemaService as any).schemaCache.size).toBe(0);

      schemaService.clearCache();

      expect((schemaService as any).schemaCache.size).toBe(0);
    });
  });

  describe('buildQueryFields', () => {
    beforeEach(() => {
      (FieldDiscoveryService.getConfiguredFields as jest.Mock).mockReturnValue([]);

      // Mock discoverObjectFields to avoid CLI calls
      jest.spyOn(schemaService as any, 'discoverObjectFields').mockResolvedValue([]);
    });

    it('should return query fields object with essential fields', async () => {
      const result = await schemaService.buildQueryFields('test-org', 'QuoteLineItem');

      expect(result).toHaveProperty('quoteFields');
      expect(result).toHaveProperty('quoteLineFields');
      expect(Array.isArray(result.quoteFields)).toBe(true);
      expect(Array.isArray(result.quoteLineFields)).toBe(true);

      // Check for essential fields
      expect(result.quoteFields).toContain('Id');
      expect(result.quoteFields).toContain('Name');
      expect(result.quoteFields).toContain('Status');
      expect(result.quoteLineFields).toContain('QuoteId');
      expect(result.quoteLineFields).toContain('Product2Id');
      expect(result.quoteLineFields).toContain('Quantity');
    });

    it('should include configured fields from settings', async () => {
      (FieldDiscoveryService.getConfiguredFields as jest.Mock)
        .mockReturnValueOnce(['CustomQuoteField__c'])
        .mockReturnValueOnce(['CustomQuoteReportField__c'])
        .mockReturnValueOnce(['CustomLineField__c'])
        .mockReturnValueOnce(['CustomLineReportField__c']);

      const result = await schemaService.buildQueryFields('test-org', 'QuoteLineItem');

      expect(result.quoteFields).toContain('CustomQuoteField__c');
      expect(result.quoteFields).toContain('CustomQuoteReportField__c');
      expect(result.quoteLineFields).toContain('CustomLineField__c');
      expect(result.quoteLineFields).toContain('CustomLineReportField__c');
    });

    it('should handle configured fields errors gracefully', async () => {
      (FieldDiscoveryService.getConfiguredFields as jest.Mock).mockImplementation(() => {
        throw new Error('Config not found');
      });

      const result = await schemaService.buildQueryFields('test-org', 'QuoteLineItem');

      expect(result.quoteFields.length).toBeGreaterThan(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load configured fields')
      );
    });

    it('should deduplicate fields', async () => {
      (FieldDiscoveryService.getConfiguredFields as jest.Mock)
        .mockReturnValue(['Id', 'Name']); // Duplicates of essential fields

      const result = await schemaService.buildQueryFields('test-org', 'QuoteLineItem');

      const idCount = result.quoteFields.filter(f => f === 'Id').length;
      expect(idCount).toBe(1);
    });

    it('should handle schema discovery errors gracefully', async () => {
      jest.spyOn(schemaService as any, 'discoverObjectFields').mockRejectedValue(
        new Error('Schema discovery failed')
      );

      const result = await schemaService.buildQueryFields('test-org', 'QuoteLineItem');

      expect(result.quoteFields.length).toBeGreaterThan(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to discover Revenue Cloud compatibility fields')
      );
    });

    it('should log field count after building', async () => {
      await schemaService.buildQueryFields('test-org', 'QuoteLineItem');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Building optimized field lists')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Optimized field lists built')
      );
    });
  });

  describe('detectQuoteLineObjectName', () => {
    it('should detect QuoteLine object first', async () => {
      (ApiUtilityService.getObjectNameVariations as jest.Mock).mockReturnValue([
        'QuoteLineItem',
        'SBQQ__QuoteLine__c'
      ]);

      jest.spyOn(schemaService as any, 'discoverObjectFields').mockResolvedValue([]);

      const result = await schemaService.detectQuoteLineObjectName('test-org');

      expect(result).toBe('QuoteLine');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found quote line object: QuoteLine')
      );
    });

    it('should try variations if QuoteLine not found', async () => {
      (ApiUtilityService.getObjectNameVariations as jest.Mock).mockReturnValue([
        'QuoteLineItem',
        'SBQQ__QuoteLine__c'
      ]);

      jest.spyOn(schemaService as any, 'discoverObjectFields')
        .mockRejectedValueOnce(new Error('QuoteLine not found'))
        .mockResolvedValueOnce([]);

      const result = await schemaService.detectQuoteLineObjectName('test-org');

      expect(result).toBe('QuoteLineItem');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Object QuoteLine not available')
      );
    });

    it('should throw error if no valid object found', async () => {
      (ApiUtilityService.getObjectNameVariations as jest.Mock).mockReturnValue([
        'QuoteLineItem',
        'SBQQ__QuoteLine__c'
      ]);

      jest.spyOn(schemaService as any, 'discoverObjectFields').mockRejectedValue(
        new Error('Not found')
      );

      await expect(
        schemaService.detectQuoteLineObjectName('test-org')
      ).rejects.toThrow('No valid quote line object found');
    });
  });

  describe('getRevCloudRequiredFields', () => {
    const mockFields = [
      { name: 'Id', type: 'id', label: 'ID' },
      { name: 'StartDate', type: 'date', label: 'Start Date' },
      { name: 'EndDate', type: 'date', label: 'End Date' },
      { name: 'SubscriptionTerm', type: 'number', label: 'Subscription Term' },
      { name: 'BillingFrequency', type: 'picklist', label: 'Billing Frequency' },
      { name: 'CustomField__c', type: 'string', label: 'Custom Field' }
    ];

    beforeEach(() => {
      jest.spyOn(schemaService as any, 'discoverObjectFields').mockResolvedValue(mockFields);
    });

    it('should find common Revenue Cloud fields', async () => {
      const result = await schemaService.getRevCloudRequiredFields('test-org', 'QuoteLine');

      expect(result).toContain('StartDate');
      expect(result).toContain('EndDate');
      expect(result).toContain('SubscriptionTerm');
      expect(result).toContain('BillingFrequency');
    });

    it('should not include fields not in common list', async () => {
      const result = await schemaService.getRevCloudRequiredFields('test-org', 'QuoteLine');

      expect(result).not.toContain('Id');
      expect(result).not.toContain('CustomField__c');
    });

    it('should avoid duplicates in result', async () => {
      const fieldsWithDups = [
        ...mockFields,
        { name: 'StartDate', type: 'date', label: 'Start Date Duplicate' }
      ];

      jest.spyOn(schemaService as any, 'discoverObjectFields').mockResolvedValue(fieldsWithDups);

      const result = await schemaService.getRevCloudRequiredFields('test-org', 'QuoteLine');

      const startDateCount = result.filter(f => f === 'StartDate').length;
      expect(startDateCount).toBe(1);
    });

    it('should log discovered fields', async () => {
      const result = await schemaService.getRevCloudRequiredFields('test-org', 'QuoteLine');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('DYNAMIC FIELD DISCOVERY')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(`DISCOVERY COMPLETE: Found ${result.length} Revenue Cloud fields in org`),
        expect.any(Array)
      );
    });
  });

  describe('validateObjectAccess', () => {
    it('should return true for accessible object', async () => {
      jest.spyOn(schemaService as any, 'discoverObjectFields').mockResolvedValue([]);

      const result = await schemaService.validateObjectAccess('test-org', 'Account');

      expect(result).toBe(true);
    });

    it('should return false for inaccessible object', async () => {
      jest.spyOn(schemaService as any, 'discoverObjectFields').mockRejectedValue(
        new Error('Object not found')
      );

      const result = await schemaService.validateObjectAccess('test-org', 'InvalidObject');

      expect(result).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Object InvalidObject not accessible')
      );
    });

    it('should handle network errors', async () => {
      jest.spyOn(schemaService as any, 'discoverObjectFields').mockRejectedValue(
        new Error('Network error')
      );

      const result = await schemaService.validateObjectAccess('test-org', 'Account');

      expect(result).toBe(false);
    });
  });

  describe('private methods', () => {
    describe('findCurrencyAndQuantityFields', () => {
      it('should find currency fields', () => {
        const fields = [
          { name: 'Amount', type: 'currency', label: 'Amount' },
          { name: 'Price', type: 'currency', label: 'Price' },
          { name: 'CurrencyIsoCode', type: 'picklist', label: 'Currency' },
          { name: 'Description', type: 'string', label: 'Description' }
        ];

        const result = (schemaService as any).findCurrencyAndQuantityFields(fields);

        expect(result).toContain('Amount');
        expect(result).toContain('Price');
        expect(result).toContain('CurrencyIsoCode');
        expect(result).not.toContain('Description');
      });

      it('should find quantity fields by type and name', () => {
        const fields = [
          { name: 'Quantity', type: 'double', label: 'Quantity' },
          { name: 'TotalAmount', type: 'integer', label: 'Total Amount' },
          { name: 'Name', type: 'string', label: 'Name' }
        ];

        const result = (schemaService as any).findCurrencyAndQuantityFields(fields);

        expect(result).toContain('Quantity');
        expect(result).toContain('TotalAmount');
        expect(result).not.toContain('Name');
      });

      it('should handle fields with missing properties', () => {
        const fields = [
          { name: 'Field1', type: null, label: null },
          { name: 'Field2', type: undefined, label: undefined },
          { name: 'Field3', label: 'Some Label' }
        ];

        const result = (schemaService as any).findCurrencyAndQuantityFields(fields);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0); // None of these should match currency/quantity patterns
      });

      it('should find fields by label containing currency', () => {
        const fields = [
          { name: 'CustomField__c', type: 'string', label: 'Currency Code' }
        ];

        const result = (schemaService as any).findCurrencyAndQuantityFields(fields);

        expect(result).toContain('CustomField__c');
      });

      it('should find fields by name containing currency', () => {
        const fields = [
          { name: 'CurrencyField__c', type: 'string', label: 'Some Field' }
        ];

        const result = (schemaService as any).findCurrencyAndQuantityFields(fields);

        expect(result).toContain('CurrencyField__c');
      });
    });
  });
});
