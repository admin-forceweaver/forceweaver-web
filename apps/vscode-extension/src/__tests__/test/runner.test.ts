import { TestRunner, TestResult } from '../../test/runner';
import { SalesforceAuth, SalesforceOrg } from '../../salesforce/auth';
import { SalesforceAPI, QuoteData, PlaceQuoteRequest } from '../../salesforce/api';
import { Comparator, ComparisonResult } from '../../test/comparator';
import { ApexExecutor } from '../../apex/executor';
import { PricingSnapshot } from '../../snapshot/creator';
import { FieldDiscoveryService } from '../../services/fieldDiscoveryService';
import { RevenueCloudService } from '../../services/revenueCloudService';
import * as vscode from 'vscode';

// Mock vscode module
jest.mock('vscode');

// Mock dependencies
jest.mock('../../salesforce/auth');
jest.mock('../../salesforce/api');
jest.mock('../../test/comparator');
jest.mock('../../apex/executor');
jest.mock('../../config/configReader');
jest.mock('../../services/fieldDiscoveryService');
jest.mock('../../services/revenueCloudService');

describe('TestRunner', () => {
  let testRunner: TestRunner;
  let mockAuth: jest.Mocked<SalesforceAuth>;
  let mockApi: jest.Mocked<SalesforceAPI>;
  let mockComparator: jest.Mocked<Comparator>;
  let mockApexExecutor: jest.Mocked<ApexExecutor>;
  let mockTargetOrg: SalesforceOrg;
  let mockSnapshot: PricingSnapshot;
  let mockConfig: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock configuration
    mockConfig = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const configValues: any = {
          'pricingPollingEnabled': true,
          'pricingPollingMaxRetries': 3,
          'pricingPollingInitialDelayMs': 100,
          'polling.fieldStability.enabled': true,
          'polling.fieldStability.requiredStableAttempts': 2,
          'polling.revenueCloud.bufferTimeMs': 100,
          'polling.revenueCloud.enableQuickCompletionCheck': true,
          'polling.fieldStability.stabilityCheckFields': 'reportFields',
          'pricing.productExternalIdField': 'ProductCode',
          'pricing.attributeDefinitionExternalIdField': 'Code',
          'pricing.attributePicklistValueExternalIdField': 'Code'
        };
        return configValues[key] !== undefined ? configValues[key] : defaultValue;
      })
    };

    (vscode.workspace.getConfiguration as jest.Mock) = jest.fn(() => mockConfig);

    // Mock target org
    mockTargetOrg = {
      orgId: '00D000000000002',
      username: 'test-target@example.com',
      alias: 'TestTarget',
      instanceUrl: 'https://test.salesforce.com',
      accessToken: 'mock-token',
      testOpportunityId: '006000000000002',
      isActive: true,
      type: 'Sandbox'
    };

    // Mock pricing snapshot
    mockSnapshot = {
      metadata: {
        snapshotVersion: '1.0',
        sourceOrgUsername: 'test@example.com',
        sourceOrgId: '00D000000000001',
        sourceQuoteId: '0Q0000000000001',
        sourceOpportunityId: '006000000000001',
        createdAt: '2025-01-01T00:00:00.000Z',
        description: 'Test snapshot'
      },
      expectedResults: {
        quoteFields: {
          GrandTotal: 10000.00,
          Discount: 500.00,
          Tax: 100.00,
          ShippingHandling: 50.00,
          StartDate: '2025-01-01',
          CurrencyIsoCode: 'USD'
        }
      },
      recreationPayload: {
        accountId: '001000000000001',
        quoteName: 'Test Quote',
        pricebook2Name: 'Standard Price Book',
        quoteSnapFields: {},
        lineItems: [
          {
            productIdentifier: {
              type: 'externalId',
              externalIdField: 'ProductCode',
              value: 'SKU-001'
            },
            quantity: 2,
            sourceData: {
              UnitPrice: 5000.00,
              PricebookEntryId: '01u000000000001'
            },
            expectedPricingFields: {
              TotalPrice: 10000.00,
              UnitPrice: 5000.00
            }
          }
        ]
      }
    };

    // Create mock auth
    mockAuth = new SalesforceAuth() as jest.Mocked<SalesforceAuth>;
    mockAuth.getAuthenticatedOrgs = jest.fn().mockResolvedValue([mockTargetOrg]);
    mockAuth.validateOrgConnection = jest.fn().mockResolvedValue(true);

    // Create mock API
    mockApi = new SalesforceAPI(mockAuth) as jest.Mocked<SalesforceAPI>;
    mockApi.getQuoteData = jest.fn().mockResolvedValue({
      Id: '0Q0000000000002',
      Name: 'Test Quote',
      Account: { Id: '001000000000001', Name: 'Test Account' },
      GrandTotal: 10000.00,
      TotalPrice: 9950.00,
      CurrencyIsoCode: 'USD',
      QuoteLines: [
        {
          Id: '0QL000000000001',
          Product2: { Id: '01t000000000001', Name: 'Test Product', ProductCode: 'SKU-001' },
          Quantity: 2,
          UnitPrice: 5000.00,
          TotalPrice: 10000.00,
          NetUnitPrice: 4975.00,
          NetTotalPrice: 9950.00,
          Discount: 0,
          ListPrice: 5000.00
        }
      ]
    } as QuoteData);

    mockApi.validateProducts = jest.fn().mockResolvedValue([]);
    mockApi.resolvePricebook2IdByName = jest.fn().mockResolvedValue('01s000000000001');
    mockApi.getPricebookEntriesWithSnapshotPreference = jest.fn().mockResolvedValue(new Map([['01t000000000001', '01u000000000001']]));
    mockApi.query = jest.fn().mockResolvedValue({
      records: [{ Id: '01t000000000001' }],
      totalSize: 1,
      done: true
    });
    mockApi.placeQuote = jest.fn().mockResolvedValue({
      success: true,
      quoteId: '0Q0000000000002',
      errors: []
    });
    mockApi.resolveAttributeDefinitionIds = jest.fn().mockResolvedValue(new Map());
    mockApi.resolveAttributePicklistValueIds = jest.fn().mockResolvedValue(new Map());

    // Create mock comparator
    mockComparator = new Comparator() as jest.Mocked<Comparator>;
    mockComparator.compare = jest.fn().mockReturnValue({
      overallMatch: true,
      quote: {
        overallMatch: true,
        fieldComparisons: []
      },
      lineItems: [],
      hierarchicalGroups: [],
      summary: {
        totalFields: 10,
        matchingFields: 10,
        totalLineItems: 1,
        matchingLineItems: 1,
        successRate: 100
      }
    } as ComparisonResult);

    // Create mock apex executor
    mockApexExecutor = new ApexExecutor(mockAuth) as jest.Mocked<ApexExecutor>;
    mockApexExecutor.executePricingApex = jest.fn().mockResolvedValue(undefined);
    mockApexExecutor.generateCurlCommand = jest.fn().mockResolvedValue('curl command');

    // Override constructor mocks
    (SalesforceAPI as jest.MockedClass<typeof SalesforceAPI>).mockImplementation(() => mockApi);
    (Comparator as jest.MockedClass<typeof Comparator>).mockImplementation(() => mockComparator);
    (ApexExecutor as jest.MockedClass<typeof ApexExecutor>).mockImplementation(() => mockApexExecutor);

    // Mock static methods from services
    (FieldDiscoveryService.getQuoteLineItemCreationRequiredFields as jest.Mock) = jest.fn().mockReturnValue([]);
    (FieldDiscoveryService.getQuoteLineItemCreationEssentialFields as jest.Mock) = jest.fn().mockReturnValue([]);
    (FieldDiscoveryService.getQuoteLineItemCalculatedFields as jest.Mock) = jest.fn().mockReturnValue([]);
    (FieldDiscoveryService.getQuoteCalculatedFields as jest.Mock) = jest.fn().mockReturnValue([]);
    (FieldDiscoveryService.getWriteProtectedFields as jest.Mock) = jest.fn().mockReturnValue([]);
    (RevenueCloudService.applyIntelligentDefaults as jest.Mock) = jest.fn().mockReturnValue({});

    // Create test runner instance
    testRunner = new TestRunner(mockAuth);
  });

  describe('constructor', () => {
    it('should initialize with auth and create dependencies', () => {
      expect(testRunner).toBeDefined();
      expect(testRunner.auth).toBe(mockAuth);
    });
  });

  describe('runTest', () => {
    it('should successfully run a pricing test with all steps', async () => {
      const progressCallback = jest.fn();
      const result = await testRunner.runTest(mockSnapshot, mockTargetOrg, progressCallback);

      expect(result.success).toBe(true);
      expect(result.createdQuoteId).toBe('0Q0000000000002');
      expect(result.snapshot).toBe(mockSnapshot);
      expect(result.targetOrg).toBe(mockTargetOrg);
      expect(mockAuth.validateOrgConnection).toHaveBeenCalledWith(mockTargetOrg.username);
      expect(mockApi.placeQuote).toHaveBeenCalled();
      // Apex execution is temporarily disabled when pricingPref='force'
      // expect(mockApexExecutor.executePricingApex).toHaveBeenCalled();
      expect(mockComparator.compare).toHaveBeenCalled();
    });

    it('should use source org as target when targetOrg is not provided', async () => {
      mockAuth.getAuthenticatedOrgs = jest.fn().mockResolvedValue([
        { ...mockTargetOrg, orgId: mockSnapshot.metadata.sourceOrgId }
      ]);

      const result = await testRunner.runTest(mockSnapshot);

      expect(result.success).toBe(true);
      expect(mockAuth.getAuthenticatedOrgs).toHaveBeenCalled();
    });

    it('should fail when source org is not found in authenticated orgs', async () => {
      mockAuth.getAuthenticatedOrgs = jest.fn().mockResolvedValue([]);

      const result = await testRunner.runTest(mockSnapshot);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(`Source org with ID ${mockSnapshot.metadata.sourceOrgId} not found in authenticated orgs. Please re-authenticate.`);
    });

    it('should fail when org connection validation fails', async () => {
      mockAuth.validateOrgConnection = jest.fn().mockResolvedValue(false);

      const result = await testRunner.runTest(mockSnapshot, mockTargetOrg);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(`Cannot connect to target org: ${mockTargetOrg.username}`);
    });

    it('should return error when place quote fails', async () => {
      mockApi.placeQuote = jest.fn().mockResolvedValue({
        success: false,
        errors: ['API Error'],
        detailedErrors: []
      });

      const result = await testRunner.runTest(mockSnapshot, mockTargetOrg);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('API Error');
    });

    // TEMPORARILY SKIPPED: Apex execution is disabled when pricingPref='force'
    // This test can be re-enabled if we switch back to pricingPref='skip'
    it.skip('should handle apex execution failure gracefully', async () => {
      mockApexExecutor.executePricingApex = jest.fn().mockRejectedValue(new Error('Apex failed'));

      const result = await testRunner.runTest(mockSnapshot, mockTargetOrg);

      expect(result.success).toBe(false);
      expect(mockApexExecutor.generateCurlCommand).toHaveBeenCalled();
    });

    it('should handle comparison failure', async () => {
      mockComparator.compare = jest.fn().mockImplementation(() => {
        throw new Error('Comparison error');
      });

      const result = await testRunner.runTest(mockSnapshot, mockTargetOrg);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Failed to compare results');
    });

    it('should call progress callback with appropriate messages', async () => {
      const progressCallback = jest.fn();

      await testRunner.runTest(mockSnapshot, mockTargetOrg, progressCallback);

      expect(progressCallback).toHaveBeenCalledWith(10, 'Initializing test...');
      expect(progressCallback).toHaveBeenCalledWith(15, 'Validating org connection...');
      expect(progressCallback).toHaveBeenCalledWith(25, 'Validating products in target org...');
    });
  });

  describe('runBatchTests', () => {
    it('should run multiple tests and return all results', async () => {
      const snapshots = [mockSnapshot, { ...mockSnapshot, metadata: { ...mockSnapshot.metadata, sourceQuoteId: '0Q0000000000002' } }];

      const results = await testRunner.runBatchTests(snapshots, mockTargetOrg);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should handle mixed success and failure results', async () => {
      const snapshots = [mockSnapshot, mockSnapshot];

      let callCount = 0;
      mockApi.placeQuote = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ success: true, quoteId: '0Q0000000000002', errors: [] });
        } else {
          return Promise.resolve({ success: false, errors: ['Error'], detailedErrors: [] });
        }
      });

      const results = await testRunner.runBatchTests(snapshots, mockTargetOrg);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });
  });

  describe('cleanupTestData', () => {
    it('should log created quote IDs', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const testResults: TestResult[] = [
        {
          success: true,
          snapshot: mockSnapshot,
          targetOrg: mockTargetOrg,
          createdQuoteId: '0Q0000000000002',
          executionTime: 1000
        }
      ];

      await testRunner.cleanupTestData(testResults);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test quote created'));
      consoleSpy.mockRestore();
    });

    it('should handle missing quote IDs', async () => {
      const testResults: TestResult[] = [
        {
          success: false,
          snapshot: mockSnapshot,
          targetOrg: mockTargetOrg,
          executionTime: 1000
        }
      ];

      await expect(testRunner.cleanupTestData(testResults)).resolves.not.toThrow();
    });
  });

  describe('generateSummaryReport', () => {
    it('should generate summary for all passed tests', () => {
      const testResults: TestResult[] = [
        { success: true, snapshot: mockSnapshot, targetOrg: mockTargetOrg, executionTime: 1000 },
        { success: true, snapshot: mockSnapshot, targetOrg: mockTargetOrg, executionTime: 2000 }
      ];

      const summary = testRunner.generateSummaryReport(testResults);

      expect(summary).toContain('Total Tests:** 2');
      expect(summary).toContain('Passed:** 2');
      expect(summary).toContain('Failed:** 0');
      expect(summary).toContain('Success Rate:** 100.0%');
    });

    it('should generate summary with failed tests section', () => {
      const testResults: TestResult[] = [
        { success: true, snapshot: mockSnapshot, targetOrg: mockTargetOrg, executionTime: 1000 },
        { success: false, snapshot: mockSnapshot, targetOrg: mockTargetOrg, errors: ['Test error'], executionTime: 2000 }
      ];

      const summary = testRunner.generateSummaryReport(testResults);

      expect(summary).toContain('Total Tests:** 2');
      expect(summary).toContain('Passed:** 1');
      expect(summary).toContain('Failed:** 1');
      expect(summary).toContain('Success Rate:** 50.0%');
      expect(summary).toContain('Failed Tests');
      expect(summary).toContain('Test error');
    });

    it('should calculate average execution time correctly', () => {
      const testResults: TestResult[] = [
        { success: true, snapshot: mockSnapshot, targetOrg: mockTargetOrg, executionTime: 1000 },
        { success: true, snapshot: mockSnapshot, targetOrg: mockTargetOrg, executionTime: 3000 }
      ];

      const summary = testRunner.generateSummaryReport(testResults);

      expect(summary).toContain('Average Execution Time:** 2.00s');
    });
  });

  // Apex functionality has been removed - pricing is now handled inline with pricingPref='force'
  describe.skip('generateApexCurlCommand', () => {
    it('should delegate to apex executor', async () => {
      const quoteId = '0Q0000000000002';
      // Method removed - pricing is now inline
      // const result = await testRunner.generateApexCurlCommand(quoteId, mockTargetOrg);
      // expect(result).toBe('curl command');
      // expect(mockApexExecutor.generateCurlCommand).toHaveBeenCalledWith(quoteId, mockTargetOrg);
    });
  });

  describe('waitForPricingCompletion - private method testing', () => {
    it('should poll and return quote data when pricing is complete', async () => {
      // This tests the private method through runTest
      const result = await testRunner.runTest(mockSnapshot, mockTargetOrg);

      expect(result.success).toBe(true);
      expect(mockApi.getQuoteData).toHaveBeenCalled();
    });

    it('should handle polling disabled configuration', async () => {
      mockConfig.get = jest.fn((key: string, defaultValue?: any) => {
        if (key === 'pricingPollingEnabled') return false;
        if (key === 'pricingPollingInitialDelayMs') return 10;
        return defaultValue;
      });

      const result = await testRunner.runTest(mockSnapshot, mockTargetOrg);

      expect(result.success).toBe(true);
    });

    it('should handle field stability monitoring', async () => {
      let callCount = 0;
      mockApi.getQuoteData = jest.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          Id: '0Q0000000000002',
          Name: 'Test Quote',
          Account: { Id: '001000000000001', Name: 'Test Account' },
          GrandTotal: callCount === 1 ? 9000.00 : 10000.00, // Simulate price change
          TotalPrice: 9950.00,
          QuoteLines: [
            {
              Id: '0QL000000000001',
              Product2: { Id: '01t000000000001', Name: 'Test Product', ProductCode: 'SKU-001' },
              Quantity: 2,
              UnitPrice: 5000.00,
              TotalPrice: 10000.00,
              NetUnitPrice: 4975.00,
              NetTotalPrice: 9950.00,
              Discount: 0,
              ListPrice: 5000.00
            }
          ]
        } as QuoteData);
      });

      const result = await testRunner.runTest(mockSnapshot, mockTargetOrg);

      expect(result.success).toBe(true);
      expect(mockApi.getQuoteData).toHaveBeenCalled();
    });

    it('should apply revenue cloud buffer time when enabled', async () => {
      mockConfig.get = jest.fn((key: string, defaultValue?: any) => {
        const values: any = {
          'pricingPollingEnabled': true,
          'pricingPollingMaxRetries': 3,
          'pricingPollingInitialDelayMs': 10,
          'polling.fieldStability.enabled': true,
          'polling.fieldStability.requiredStableAttempts': 1,
          'polling.revenueCloud.bufferTimeMs': 10,
          'polling.revenueCloud.enableQuickCompletionCheck': true
        };
        return values[key] !== undefined ? values[key] : defaultValue;
      });

      const result = await testRunner.runTest(mockSnapshot, mockTargetOrg);

      expect(result.success).toBe(true);
    });
  });

  describe('validateProductsInTargetOrg - private method', () => {
    it('should pass validation when all products exist', async () => {
      mockApi.validateProducts = jest.fn().mockResolvedValue([]);

      const result = await testRunner.runTest(mockSnapshot, mockTargetOrg);

      expect(result.success).toBe(true);
      expect(mockApi.validateProducts).toHaveBeenCalled();
    });

    it('should fail when products are missing', async () => {
      mockApi.validateProducts = jest.fn().mockResolvedValue(['SKU-MISSING']);

      const result = await testRunner.runTest(mockSnapshot, mockTargetOrg);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Products not found in target org');
      expect(result.errors?.[0]).toContain('SKU-MISSING');
    });
  });

  describe('prepareQuoteRequest - private method', () => {
    it('should build complete place quote request', async () => {
      const result = await testRunner.runTest(mockSnapshot, mockTargetOrg);

      expect(result.success).toBe(true);
      expect(mockApi.resolvePricebook2IdByName).toHaveBeenCalled();
      expect(mockApi.getPricebookEntriesWithSnapshotPreference).toHaveBeenCalled();
    });

    it('should handle missing pricebook entries', async () => {
      mockApi.getPricebookEntriesWithSnapshotPreference = jest.fn().mockResolvedValue(new Map());

      const result = await testRunner.runTest(mockSnapshot, mockTargetOrg);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Missing PricebookEntries');
    });

    it('should handle line items with attributes', async () => {
      const snapshotWithAttributes = {
        ...mockSnapshot,
        recreationPayload: {
          ...mockSnapshot.recreationPayload,
          lineItems: [
            {
              ...mockSnapshot.recreationPayload.lineItems[0],
              attributes: [
                {
                  attributeDefinition: { type: 'externalId' as const, value: 'ATTR-001' },
                  attributeDefinitionName: 'Color',
                  dataType: 'Picklist',
                  attributePicklistValue: { type: 'externalId' as const, value: 'BLUE' },
                  attributePicklistValueName: 'Blue'
                }
              ],
              expectedPricingFields: {
                TotalPrice: 10000.00,
                UnitPrice: 5000.00
              }
            }
          ]
        }
      };

      mockApi.resolveAttributeDefinitionIds = jest.fn().mockResolvedValue(new Map([['ATTR-001', 'attrdef001']]));
      mockApi.resolveAttributePicklistValueIds = jest.fn().mockResolvedValue(new Map([['BLUE', 'pickval001']]));

      const result = await testRunner.runTest(snapshotWithAttributes, mockTargetOrg);

      expect(result.success).toBe(true);
      expect(mockApi.resolveAttributeDefinitionIds).toHaveBeenCalled();
      expect(mockApi.resolveAttributePicklistValueIds).toHaveBeenCalled();
    });

    it('should handle bundle line items with parent-child relationships', async () => {
      const bundleSnapshot = {
        ...mockSnapshot,
        recreationPayload: {
          ...mockSnapshot.recreationPayload,
          lineItems: [
            {
              productIdentifier: { type: 'externalId' as const, externalIdField: 'ProductCode', value: 'PARENT-001' },
              quantity: 1,
              sourceData: { UnitPrice: 10000 },
              expectedPricingFields: { TotalPrice: 10000, UnitPrice: 10000 }
            },
            {
              productIdentifier: { type: 'externalId' as const, externalIdField: 'ProductCode', value: 'CHILD-001' },
              quantity: 2,
              sourceData: { UnitPrice: 2000 },
              expectedPricingFields: { TotalPrice: 4000, UnitPrice: 2000 },
              parentLineItemReference: {
                parentProductIdentifier: { type: 'externalId' as const, value: 'PARENT-001' },
                sourceParentLineItemId: 'parent-line-id',
                productRelationshipTypeId: 'rel-type-id',
                productRelatedComponentId: 'rel-comp-id',
                bundleConfiguration: {
                  doesBundlePriceIncludeChild: true,
                  quantityScaleMethod: 'Proportional'
                }
              }
            }
          ]
        }
      };

      mockApi.query = jest.fn()
        .mockResolvedValueOnce({ records: [{ Id: 'parent-product-id' }], totalSize: 1, done: true })
        .mockResolvedValueOnce({ records: [{ Id: 'child-product-id' }], totalSize: 1, done: true });

      mockApi.getPricebookEntriesWithSnapshotPreference = jest.fn().mockResolvedValue(
        new Map([
          ['parent-product-id', 'pbe-parent'],
          ['child-product-id', 'pbe-child']
        ])
      );

      const result = await testRunner.runTest(bundleSnapshot, mockTargetOrg);

      expect(result.success).toBe(true);
    });
  });

  describe('resolveAttributeIds - private method', () => {
    it('should fail when attribute definitions are missing', async () => {
      const snapshotWithAttributes = {
        ...mockSnapshot,
        recreationPayload: {
          ...mockSnapshot.recreationPayload,
          lineItems: [
            {
              ...mockSnapshot.recreationPayload.lineItems[0],
              attributes: [
                {
                  attributeDefinition: { type: 'externalId' as const, value: 'MISSING-ATTR' },
                  attributeDefinitionName: 'MissingAttr',
                  dataType: 'Text',
                  attributeTextValue: 'value'
                }
              ],
              expectedPricingFields: {
                TotalPrice: 10000.00,
                UnitPrice: 5000.00
              }
            }
          ]
        }
      };

      mockApi.resolveAttributeDefinitionIds = jest.fn().mockResolvedValue(new Map());

      const result = await testRunner.runTest(snapshotWithAttributes, mockTargetOrg);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('AttributeDefinition records not found');
    });

    it('should fail when picklist values are missing', async () => {
      const snapshotWithAttributes = {
        ...mockSnapshot,
        recreationPayload: {
          ...mockSnapshot.recreationPayload,
          lineItems: [
            {
              ...mockSnapshot.recreationPayload.lineItems[0],
              attributes: [
                {
                  attributeDefinition: { type: 'externalId' as const, value: 'ATTR-001' },
                  attributeDefinitionName: 'Color',
                  dataType: 'Picklist',
                  attributePicklistValue: { type: 'externalId' as const, value: 'MISSING-COLOR' }
                }
              ],
              expectedPricingFields: {
                TotalPrice: 10000.00,
                UnitPrice: 5000.00
              }
            }
          ]
        }
      };

      mockApi.resolveAttributeDefinitionIds = jest.fn().mockResolvedValue(new Map([['ATTR-001', 'attrdef001']]));
      mockApi.resolveAttributePicklistValueIds = jest.fn().mockResolvedValue(new Map());

      const result = await testRunner.runTest(snapshotWithAttributes, mockTargetOrg);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('AttributePicklistValue records not found');
    });
  });

  describe('resolveProduct2Ids - private method', () => {
    it('should handle product ID type', async () => {
      const snapshotWithProductId = {
        ...mockSnapshot,
        recreationPayload: {
          ...mockSnapshot.recreationPayload,
          lineItems: [
            {
              productIdentifier: { type: 'productId' as const, value: '01t000000000001' },
              quantity: 1,
              sourceData: { UnitPrice: 5000 },
              expectedPricingFields: { TotalPrice: 5000, UnitPrice: 5000 }
            }
          ]
        }
      };

      const result = await testRunner.runTest(snapshotWithProductId, mockTargetOrg);

      expect(result.success).toBe(true);
    });

    it('should fail when product cannot be resolved', async () => {
      mockApi.query = jest.fn().mockResolvedValue({ records: [], totalSize: 0, done: true });

      const result = await testRunner.runTest(mockSnapshot, mockTargetOrg);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Failed to resolve product');
    });
  });
});
