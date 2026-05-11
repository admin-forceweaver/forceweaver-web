import { SnapshotCreator, PricingSnapshot } from '../../snapshot/creator';
import { SalesforceAuth, SalesforceOrg } from '../../salesforce/auth';
import { SalesforceAPI, QuoteData } from '../../salesforce/api';
import { FileSystemService } from '../../utils/fileSystemService';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('../../utils/fileSystemService');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;
const mockedFileSystemService = FileSystemService as jest.Mocked<typeof FileSystemService>;

describe('SnapshotCreator', () => {
  let snapshotCreator: SnapshotCreator;
  let mockAuth: jest.Mocked<SalesforceAuth>;
  let mockAPI: jest.Mocked<SalesforceAPI>;

  const mockOrg: SalesforceOrg = {
    alias: 'test-org',
    username: 'user@test.com',
    orgId: '00D000000000001',
    instanceUrl: 'https://test.salesforce.com',
    isActive: true,
    type: 'production'
  };

  const mockQuoteData: QuoteData = {
    Id: '0Q0000000000001',
    Name: 'Test Quote',
    Account: {
      Id: '001000000000001',
      Name: 'Test Account'
    },
    GrandTotal: 10000,
    Discount: 500,
    QuoteLines: [{
      Id: '0QL000000000001',
      Product2: {
        Id: '01t000000000001',
        Name: 'Test Product',
        ProductCode: 'TEST-001',
        Product_SKU__c: 'SKU-001'
      },
      Quantity: 2,
      UnitPrice: 5000,
      TotalPrice: 10000,
      Discount: 0,
      ListPrice: 5500
    }]
  };

  beforeEach(() => {
    mockAuth = {
      getOrgInfo: jest.fn(),
      getAccessToken: jest.fn(),
      getAuthenticatedOrgs: jest.fn(),
      validateOrgConnection: jest.fn(),
      selectOrg: jest.fn(),
      clearCache: jest.fn()
    } as unknown as jest.Mocked<SalesforceAuth>;

    snapshotCreator = new SnapshotCreator(mockAuth);

    // Mock the API instance that gets created internally
    mockAPI = {
      query: jest.fn(),
      getQuoteData: jest.fn(),
      validateProducts: jest.fn(),
      placeQuote: jest.fn(),
      getOrCreateTestAccount: jest.fn(),
      clearClients: jest.fn()
    } as unknown as jest.Mocked<SalesforceAPI>;

    // Replace the internal API instance
    (snapshotCreator as any).api = mockAPI;

    jest.clearAllMocks();
  });

  describe('createSnapshot', () => {
    beforeEach(() => {
      mockAuth.selectOrg.mockResolvedValue(mockOrg);
      mockAPI.getQuoteData.mockResolvedValue(mockQuoteData);
      
      // Mock workspace folder
      (vscode.workspace.workspaceFolders as any) = [{
        uri: { fsPath: '/test/workspace' }
      }];
      
      mockedFs.existsSync.mockReturnValue(true);
      mockedPath.resolve.mockReturnValue('/test/workspace/snapshots');
      mockedPath.join.mockReturnValue('/test/workspace/snapshots/test-snapshot.json');
      
      (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue({});
      (vscode.window.showTextDocument as jest.Mock).mockResolvedValue({});
    });

    it('should create snapshot successfully', async () => {
      // Mock the internal methods instead of just showInputBox
      jest.spyOn(snapshotCreator as any, 'getQuoteIdWithRetry').mockResolvedValue('0Q0000000000001');
      jest.spyOn(snapshotCreator as any, 'getDescriptionWithRetry').mockResolvedValue('Test snapshot description');
      jest.spyOn(snapshotCreator as any, 'buildSnapshot').mockResolvedValue({
        metadata: {
          sourceQuoteId: '0Q0000000000001',
          sourceOrgAlias: 'test-org',
          sourceOrgUsername: 'user@test.com',
          sourceOrgId: '00D000000000001',
          sourceOpportunityId: '006000000000001',
          description: 'Test snapshot description',
          createdAt: new Date(),
          snapshotVersion: '1.0.0'
        },
        expectedResults: {
          quoteFields: { GrandTotal: 10000, Discount: 500 }
        },
        recreationPayload: {
          pricebook2Name: 'Standard Price Book',
          accountId: '001000000000001',
          quoteName: 'Test Quote Snapshot',
          lineItems: []
        }
      });
      jest.spyOn(snapshotCreator as any, 'saveSnapshot').mockResolvedValue(undefined);

      await snapshotCreator.createSnapshot();

      expect(mockAuth.selectOrg).toHaveBeenCalledWith(
        'Select Source Org (where the correct quote exists)'
      );
      expect(mockAPI.getQuoteData).toHaveBeenCalledWith('user@test.com', '0Q0000000000001');
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Pricing snapshot created successfully for Quote: Test Quote'
      );
    });

    it('should handle user canceling org selection', async () => {
      mockAuth.selectOrg.mockResolvedValue(undefined);

      await snapshotCreator.createSnapshot();

      expect(vscode.window.showInputBox).not.toHaveBeenCalled();
      expect(mockAPI.getQuoteData).not.toHaveBeenCalled();
    });

    it('should handle user canceling quote ID input', async () => {
      // Reset the org selection mock to return the org, then cancel at quote ID input
      mockAuth.selectOrg.mockResolvedValue(mockOrg);
      (vscode.window.showInputBox as jest.Mock)
        .mockResolvedValueOnce(undefined); // Canceled quote ID

      await snapshotCreator.createSnapshot();

      expect(mockAPI.getQuoteData).not.toHaveBeenCalled();
    });

    it('should validate quote ID format', async () => {
      const mockValidateInput = jest.fn();
      (vscode.window.showInputBox as jest.Mock).mockImplementation((options: any) => {
        if (options.validateInput) {
          // Test validation function
          expect(options.validateInput('')).toBe('Quote ID is required');
          expect(options.validateInput('invalid')).toBe('Invalid Quote ID format');
          expect(options.validateInput('0Q0000000000001')).toBe(null);
        }
        return Promise.resolve('0Q0000000000001');
      });

      await snapshotCreator.createSnapshot();
    });

    it('should handle API errors', async () => {
      (vscode.window.showInputBox as jest.Mock)
        .mockResolvedValueOnce('0Q0000000000001') // Quote ID
        .mockResolvedValueOnce('Test description'); // Description

      mockAPI.getQuoteData.mockRejectedValue(new Error('Quote not found'));

      await snapshotCreator.createSnapshot();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create snapshot: Quote not found')
      );
    });

    it('should create snapshots directory if it doesn\'t exist', async () => {
      // Mock the internal methods instead of just showInputBox
      jest.spyOn(snapshotCreator as any, 'getQuoteIdWithRetry').mockResolvedValue('0Q0000000000001');
      jest.spyOn(snapshotCreator as any, 'getDescriptionWithRetry').mockResolvedValue('Test description');
      jest.spyOn(snapshotCreator as any, 'buildSnapshot').mockResolvedValue({
        metadata: {
          sourceQuoteId: '0Q0000000000001',
          sourceOrgAlias: 'test-org',
          sourceOrgUsername: 'user@test.com',
          sourceOrgId: '00D000000000001',
          sourceOpportunityId: '006000000000001',
          description: 'Test description',
          createdAt: new Date(),
          snapshotVersion: '1.0.0'
        },
        expectedResults: { quoteFields: { GrandTotal: 10000, Discount: 500 } },
        recreationPayload: {
          pricebook2Name: 'Standard Price Book',
          accountId: '001000000000001',
          quoteName: 'Test Quote Snapshot',
          lineItems: []
        }
      });
        
      mockedFs.existsSync.mockReturnValue(false);

      await snapshotCreator.createSnapshot();

      expect(mockedFileSystemService.ensureDirectoryExists).toHaveBeenCalledWith('/test/workspace/snapshots');
    });
  });

  describe('buildSnapshot', () => {
    it('should build proper snapshot structure', async () => {
      // Mock the API queries that buildSnapshot makes
      mockAPI.query.mockResolvedValue({
        totalSize: 1,
        done: true,
        records: [{
          Id: '01t000000000001',
          ProductCode: 'TEST-001',
          Product_SKU__c: 'SKU-001'
        }]
      });

      // Call private method through type assertion
      const snapshot = await (snapshotCreator as any).buildSnapshot(
        mockOrg,
        mockQuoteData,
        'Test description'
      );

      // Validate snapshot structure with dynamic configuration
      expect(snapshot).toMatchObject({
        metadata: {
          snapshotVersion: '1.0',
          sourceOrgAlias: 'test-org',
          sourceOrgUsername: 'user@test.com',
          sourceOrgId: '00D000000000001',
          sourceQuoteId: '0Q0000000000001',
          description: 'Test description'
        },
        expectedResults: expect.objectContaining({
          quoteFields: expect.any(Object),
          lineItems: expect.arrayContaining([
            expect.objectContaining({
              externalId: 'SKU-001',
              pricingFields: expect.any(Object)
            })
          ])
        }),
        recreationPayload: {
          accountId: '001000000000001',
          quoteName: 'Regression Test - Test Quote',
          lineItems: [{
            productIdentifier: {
              type: 'externalId',
              externalIdField: 'Product_SKU__c',
              value: 'SKU-001'
            },
            quantity: 2,
            expectedPricingFields: expect.any(Object)
          }]
        }
      });

      // Validate that required structures exist
      expect(snapshot.expectedResults).toHaveProperty('quoteFields');
      expect(snapshot.expectedResults).toHaveProperty('lineItems');
      expect(snapshot.expectedResults.lineItems).toHaveLength(1);
      expect(snapshot.expectedResults.lineItems![0]).toHaveProperty('externalId', 'SKU-001');
      expect(snapshot.expectedResults.lineItems![0]).toHaveProperty('pricingFields');
      expect(snapshot.recreationPayload.lineItems[0]).toHaveProperty('expectedPricingFields');
    });

    it('should handle manual discounts in recreation payload', async () => {
      // Mock the API queries that buildSnapshot makes
      mockAPI.query.mockResolvedValue({
        totalSize: 1,
        done: true,
        records: [{
          Id: '01t000000000001',
          ProductCode: 'TEST-001',
          Product_SKU__c: 'SKU-001'
        }]
      });

      const quoteWithDiscounts: QuoteData = {
        ...mockQuoteData,
        QuoteLines: [{
          ...mockQuoteData.QuoteLines[0],
          Discount: 100
        }]
      };

      const snapshot = await (snapshotCreator as any).buildSnapshot(
        mockOrg,
        quoteWithDiscounts,
        'Test with discounts'
      );

      expect(snapshot.recreationPayload.lineItems[0]).toMatchObject({
        productIdentifier: {
          type: 'externalId',
          externalIdField: 'Product_SKU__c',
          value: 'SKU-001'
        },
        quantity: 2,
        adjustments: [{
          type: 'Amount',
          value: 100
        }]
      });
    });
  });

  describe('loadSnapshot', () => {
    it('should load valid snapshot file', async () => {
      const mockSnapshot: PricingSnapshot = {
        metadata: {
          snapshotVersion: '1.0',
          sourceOrgUsername: 'user@test.com',
          sourceOrgId: '00D000000000001',
          sourceQuoteId: '0Q0000000000001',
          sourceOpportunityId: '006000000000001',
          createdAt: new Date().toISOString()
        },
        expectedResults: {
          quoteFields: { GrandTotal: 10000 }
        },
        recreationPayload: {
          accountId: '001000000000001',
          quoteName: 'Test',
          lineItems: []
        }
      };

      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockSnapshot));

      const result = await SnapshotCreator.loadSnapshot('/test/snapshot.json');

      expect(result).toEqual(mockSnapshot);
      expect(mockedFs.readFileSync).toHaveBeenCalledWith('/test/snapshot.json', 'utf8');
    });

    it('should throw error for invalid snapshot structure', async () => {
      mockedFs.readFileSync.mockReturnValue('{"invalid": "structure"}');

      await expect(SnapshotCreator.loadSnapshot('/test/invalid.json')).rejects.toThrow(
        'Failed to load snapshot: Invalid snapshot file structure'
      );
    });

    it('should handle file read errors', async () => {
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      await expect(SnapshotCreator.loadSnapshot('/test/missing.json')).rejects.toThrow(
        'Failed to load snapshot: File not found'
      );
    });
  });

  describe('getSnapshotFiles', () => {
    beforeEach(() => {
      (vscode.workspace.workspaceFolders as any) = [{
        uri: { fsPath: '/test/workspace' }
      }];
      mockedPath.resolve.mockReturnValue('/test/workspace/snapshots');
    });

    it('should return sorted snapshot files', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([
        'snapshot_test_001.json',
        'other_file.txt',
        'snapshot_test_002.json',
        'not_snapshot.json'
      ] as any);

      mockedPath.join.mockImplementation((...paths) => paths.join('/'));
      mockedFs.statSync.mockImplementation((file: any) => ({
        mtime: new Date(file.includes('002') ? '2023-02-01' : '2023-01-01')
      }) as any);

      const result = SnapshotCreator.getSnapshotFiles();

      expect(result).toEqual([
        '/test/workspace/snapshots/snapshot_test_002.json',
        '/test/workspace/snapshots/snapshot_test_001.json'
      ]);
    });

    it('should return empty array when directory doesn\'t exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = SnapshotCreator.getSnapshotFiles();

      expect(result).toEqual([]);
    });

    it('should return empty array when no workspace folders', () => {
      (vscode.workspace.workspaceFolders as any) = undefined;

      const result = SnapshotCreator.getSnapshotFiles();

      expect(result).toEqual([]);
    });

    it('should handle directory read errors', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = SnapshotCreator.getSnapshotFiles();

      expect(result).toEqual([]);
    });
  });

  describe('deleteSnapshot', () => {
    beforeEach(() => {
      mockedPath.basename.mockReturnValue('test-snapshot.json');
    });

    it('should delete snapshot after user confirmation', async () => {
      (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue('Delete');

      await SnapshotCreator.deleteSnapshot('/test/snapshot.json');

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'Are you sure you want to delete snapshot "test-snapshot.json"?',
        { modal: true },
        'Delete'
      );
      expect(mockedFs.unlinkSync).toHaveBeenCalledWith('/test/snapshot.json');
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Snapshot "test-snapshot.json" deleted successfully.'
      );
    });

    it('should not delete when user cancels', async () => {
      (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(undefined);

      await SnapshotCreator.deleteSnapshot('/test/snapshot.json');

      expect(mockedFs.unlinkSync).not.toHaveBeenCalled();
      expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    it('should handle delete errors', async () => {
      (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue('Delete');
      mockedFs.unlinkSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await SnapshotCreator.deleteSnapshot('/test/snapshot.json');

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete snapshot: Permission denied')
      );
    });
  });

  describe('hierarchical sorting', () => {
    it('should sort line items hierarchically in snapshots', () => {
      // Create test data with mixed order: child, standalone, parent, another child
      const mixedOrderLineItems: any[] = [
        {
          productIdentifier: { value: 'CHILD-A' },
          parentLineItemReference: {
            parentProductIdentifier: { value: 'BUNDLE-001' }
          },
          quantity: 1,
          expectedPricingFields: { TotalPrice: 1000 }
        },
        {
          productIdentifier: { value: 'STANDALONE-001' },
          quantity: 1,
          expectedPricingFields: { TotalPrice: 2000 }
        },
        {
          productIdentifier: { value: 'BUNDLE-001' },
          quantity: 1,
          expectedPricingFields: { TotalPrice: 5000 }
        },
        {
          productIdentifier: { value: 'CHILD-B' },
          parentLineItemReference: {
            parentProductIdentifier: { value: 'BUNDLE-001' }
          },
          quantity: 1,
          expectedPricingFields: { TotalPrice: 1500 }
        },
        {
          productIdentifier: { value: 'BUNDLE-002' },
          quantity: 1,
          expectedPricingFields: { TotalPrice: 3000 }
        },
        {
          productIdentifier: { value: 'CHILD-Z' },
          parentLineItemReference: {
            parentProductIdentifier: { value: 'BUNDLE-002' }
          },
          quantity: 1,
          expectedPricingFields: { TotalPrice: 800 }
        }
      ];

      // Access the private method using bracket notation
      const sortedItems = (snapshotCreator as any).sortLineItemsHierarchically(mixedOrderLineItems);

      // Expected hierarchical order:
      // 1. BUNDLE-001 (parent)
      // 2. CHILD-A (child of BUNDLE-001, sorted alphabetically first)
      // 3. CHILD-B (child of BUNDLE-001, sorted alphabetically second)
      // 4. BUNDLE-002 (parent)
      // 5. CHILD-Z (child of BUNDLE-002)
      // 6. STANDALONE-001 (standalone item)
      
      expect(sortedItems).toHaveLength(6);
      expect(sortedItems[0].productIdentifier.value).toBe('BUNDLE-001'); // First parent
      expect(sortedItems[1].productIdentifier.value).toBe('CHILD-A'); // First child (alphabetical)
      expect(sortedItems[2].productIdentifier.value).toBe('CHILD-B'); // Second child (alphabetical)
      expect(sortedItems[3].productIdentifier.value).toBe('BUNDLE-002'); // Second parent
      expect(sortedItems[4].productIdentifier.value).toBe('CHILD-Z'); // Child of second parent
      expect(sortedItems[5].productIdentifier.value).toBe('STANDALONE-001'); // Standalone at end
    });

    it('should handle standalone items only', () => {
      const standaloneOnlyItems: any[] = [
        {
          productIdentifier: { value: 'PRODUCT-Z' },
          quantity: 1,
          expectedPricingFields: { TotalPrice: 1000 }
        },
        {
          productIdentifier: { value: 'PRODUCT-A' },
          quantity: 1,
          expectedPricingFields: { TotalPrice: 2000 }
        },
        {
          productIdentifier: { value: 'PRODUCT-M' },
          quantity: 1,
          expectedPricingFields: { TotalPrice: 1500 }
        }
      ];

      const sortedItems = (snapshotCreator as any).sortLineItemsHierarchically(standaloneOnlyItems);

      expect(sortedItems).toHaveLength(3);
      // Should be sorted alphabetically: A, M, Z
      expect(sortedItems[0].productIdentifier.value).toBe('PRODUCT-A');
      expect(sortedItems[1].productIdentifier.value).toBe('PRODUCT-M');
      expect(sortedItems[2].productIdentifier.value).toBe('PRODUCT-Z');
    });

    it('should handle bundles with multiple children in correct order', () => {
      const bundleWithManyChildren: any[] = [
        {
          productIdentifier: { value: 'CHILD-003' },
          parentLineItemReference: {
            parentProductIdentifier: { value: 'PARENT-BUNDLE' }
          },
          quantity: 1,
          expectedPricingFields: { TotalPrice: 300 }
        },
        {
          productIdentifier: { value: 'CHILD-001' },
          parentLineItemReference: {
            parentProductIdentifier: { value: 'PARENT-BUNDLE' }
          },
          quantity: 1,
          expectedPricingFields: { TotalPrice: 100 }
        },
        {
          productIdentifier: { value: 'PARENT-BUNDLE' },
          quantity: 1,
          expectedPricingFields: { TotalPrice: 1000 }
        },
        {
          productIdentifier: { value: 'CHILD-002' },
          parentLineItemReference: {
            parentProductIdentifier: { value: 'PARENT-BUNDLE' }
          },
          quantity: 1,
          expectedPricingFields: { TotalPrice: 200 }
        }
      ];

      const sortedItems = (snapshotCreator as any).sortLineItemsHierarchically(bundleWithManyChildren);

      expect(sortedItems).toHaveLength(4);
      expect(sortedItems[0].productIdentifier.value).toBe('PARENT-BUNDLE'); // Parent first
      expect(sortedItems[1].productIdentifier.value).toBe('CHILD-001'); // Children in alphabetical order
      expect(sortedItems[2].productIdentifier.value).toBe('CHILD-002');
      expect(sortedItems[3].productIdentifier.value).toBe('CHILD-003');
    });
  });
});
