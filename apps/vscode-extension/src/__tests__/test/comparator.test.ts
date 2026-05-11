import { Comparator, ComparisonResult } from '../../test/comparator';
import { PricingSnapshot } from '../../snapshot/creator';
import { QuoteData } from '../../salesforce/api';

describe('Comparator', () => {
  let comparator: Comparator;

  beforeEach(() => {
    comparator = new Comparator();
  });

  const mockPricingSnapshot: PricingSnapshot = {
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
        Discount: 500.00
      }
    },
    recreationPayload: {
      accountId: '001000000000001',
      quoteName: 'Test Quote',
      lineItems: [
        {
          productIdentifier: {
            type: 'externalId',
            externalIdField: 'ProductCode',
            value: 'SKU-001'
          },
          quantity: 2,
          expectedPricingFields: {
            TotalPrice: 8000.00,
            Discount: 200.00,
            UnitPrice: 4000.00,
            ListPrice: 4200.00
          }
        },
        {
          productIdentifier: {
            type: 'externalId',
            externalIdField: 'ProductCode',
            value: 'SKU-002'
          },
          quantity: 1,
          expectedPricingFields: {
            TotalPrice: 2000.00,
            Discount: 300.00,
            UnitPrice: 2000.00,
            ListPrice: 2300.00
          }
        }
      ]
    }
  };

  const mockActualQuoteData: QuoteData = {
    Id: '0Q0000000000001',
    Name: 'Test Quote',
    Account: {
      Id: '001000000000001',
      Name: 'Test Account'
    },
    GrandTotal: 10000.00,
    Discount: 500.00,
    QuoteLines: [
      {
        Id: '0QL000000000001',
        Product2: {
          Id: '01t000000000001',
          Name: 'Test Product 1',
          ProductCode: 'SKU-001'
        },
        Quantity: 2,
        UnitPrice: 4000.00,
        TotalPrice: 8000.00,
        Discount: 200.00,
        ListPrice: 4200.00
      },
      {
        Id: '0QL000000000002',
        Product2: {
          Id: '01t000000000002',
          Name: 'Test Product 2',
          ProductCode: 'SKU-002'
        },
        Quantity: 1,
        UnitPrice: 2000.00,
        TotalPrice: 2000.00,
        Discount: 300.00,
        ListPrice: 2300.00
      }
    ]
  };

  describe('compare', () => {
    it('should return matching comparison result for identical data', () => {
      const result = comparator.compare(mockPricingSnapshot, mockActualQuoteData);

      expect(result.overallMatch).toBe(true);
      expect(result.quote.overallMatch).toBe(true);
      expect(result.lineItems).toHaveLength(2);
      expect(result.lineItems[0].overallMatch).toBe(true);
      expect(result.lineItems[1].overallMatch).toBe(true);
      
      // Test hierarchical groups
      expect(result.hierarchicalGroups).toBeDefined();
      expect(result.hierarchicalGroups).toHaveLength(2); // Two standalone items
      expect(result.hierarchicalGroups[0].type).toBe('standalone');
      expect(result.hierarchicalGroups[1].type).toBe('standalone');
      expect(result.summary.totalBundles).toBe(0);
      expect(result.summary.totalStandalone).toBe(2);
    });

    it('should return non-matching comparison result for different quote data', () => {
      const differentActualData: QuoteData = {
        ...mockActualQuoteData,
        GrandTotal: 12000.00, // Different value
        Discount: 600.00      // Different value
      };

      const result = comparator.compare(mockPricingSnapshot, differentActualData);

      expect(result.overallMatch).toBe(false);
      expect(result.quote.overallMatch).toBe(false);
      expect(result.lineItems[0].overallMatch).toBe(true); // Line items should still match
      expect(result.lineItems[1].overallMatch).toBe(true);
      
      // Hierarchical groups should still be created even with quote mismatch
      expect(result.hierarchicalGroups).toBeDefined();
      expect(result.hierarchicalGroups).toHaveLength(2);
      expect(result.summary.totalBundles).toBe(0);
      expect(result.summary.totalStandalone).toBe(2);
    });

    it('should return non-matching comparison result for different line item data', () => {
      const differentActualData: QuoteData = {
        ...mockActualQuoteData,
        QuoteLines: [
          {
            ...mockActualQuoteData.QuoteLines[0],
            TotalPrice: 9000.00, // Different from expected 8000.00
            Discount: 300.00     // Different from expected 200.00
          },
          mockActualQuoteData.QuoteLines[1] // Keep second line item the same
        ]
      };

      const result = comparator.compare(mockPricingSnapshot, differentActualData);

      expect(result.overallMatch).toBe(false);
      expect(result.quote.overallMatch).toBe(true); // Quote fields should match
      expect(result.lineItems[0].overallMatch).toBe(false); // First line item should not match
      expect(result.lineItems[1].overallMatch).toBe(true);  // Second line item should match
      
      // Hierarchical groups should still be created
      expect(result.hierarchicalGroups).toBeDefined();
      expect(result.hierarchicalGroups).toHaveLength(2);
    });

    it('should handle missing line items in actual data', () => {
      const missingLineItemData: QuoteData = {
        ...mockActualQuoteData,
        QuoteLines: [
          mockActualQuoteData.QuoteLines[0] // Only include first line item
        ]
      };

      const result = comparator.compare(mockPricingSnapshot, missingLineItemData);

      expect(result.overallMatch).toBe(false);
      expect(result.lineItems).toHaveLength(2);
      expect(result.lineItems[0].found).toBe(true);
      expect(result.lineItems[0].overallMatch).toBe(true);
      expect(result.lineItems[1].found).toBe(false); // Second line item should not be found
      expect(result.lineItems[1].overallMatch).toBe(false);
    });

    it('should handle small floating point differences within tolerance', () => {
      const slightlyDifferentData: QuoteData = {
        ...mockActualQuoteData,
        GrandTotal: 10000.005 // Very small difference, within tolerance
      };

      const result = comparator.compare(mockPricingSnapshot, slightlyDifferentData);

      expect(result.overallMatch).toBe(true);
      expect(result.quote.overallMatch).toBe(true);
    });

    it('should handle null values in actual data', () => {
      const mockSnapshotWithNull: PricingSnapshot = {
        ...mockPricingSnapshot,
        expectedResults: {
          quoteFields: {
            GrandTotal: 10000.00,
            Discount: 0 // Expected null/zero value
          }
        }
      };

      const nullValueData: QuoteData = {
        ...mockActualQuoteData,
        Discount: 0 // Actual null/zero value
      };

      const result = comparator.compare(mockSnapshotWithNull, nullValueData);

      expect(result.overallMatch).toBe(true);
      expect(result.quote.overallMatch).toBe(true);
    });

    it('should handle complex line item comparison with multiple field types', () => {
      const complexSnapshot: PricingSnapshot = {
        ...mockPricingSnapshot,
        expectedResults: {
          quoteFields: { GrandTotal: 15000, Discount: 200 }
        },
        recreationPayload: {
          ...mockPricingSnapshot.recreationPayload,
          lineItems: [{
            productIdentifier: {
              type: 'externalId',
              externalIdField: 'ProductCode',
              value: 'COMPLEX-001'
            },
            quantity: 2,
            expectedPricingFields: {
              UnitPrice: 7500,
              TotalPrice: 15000,
              Discount: 100,
              ListPrice: 8000,
              CustomAmount__c: 500.50,
              CustomPercent__c: 10.5,
              CustomDate__c: '2023-01-01'
            }
          }]
        }
      };

      const complexActualData: QuoteData = {
        ...mockActualQuoteData,
        GrandTotal: 15000,
        Discount: 200,
        QuoteLines: [{
          Id: '0QL000000000001',
          Product2Id: '01t000000000001',
          Product2: {
            Id: '01t000000000001',
            Name: 'Complex Product',
            ProductCode: 'COMPLEX-001'
          },
          Quantity: 2,
          UnitPrice: 7500,
          TotalPrice: 15000,
          Discount: 100,
          ListPrice: 8000,
          CustomAmount__c: 500.50,
          CustomPercent__c: 10.5,
          CustomDate__c: '2023-01-01'
        }]
      };

      const result = comparator.compare(complexSnapshot, complexActualData);
      
      expect(result.overallMatch).toBe(true);
      expect(result.lineItems).toHaveLength(1);
      expect(result.lineItems[0].overallMatch).toBe(true);
      expect(result.lineItems[0].fieldComparisons.length).toBeGreaterThan(5);
    });

    it('should handle line item not found in actual data', () => {
      const snapshotWithMissingLine: PricingSnapshot = {
        ...mockPricingSnapshot,
        expectedResults: {
          quoteFields: { GrandTotal: 10000 }
        },
        recreationPayload: {
          ...mockPricingSnapshot.recreationPayload,
          lineItems: [{
            productIdentifier: {
              type: 'externalId',
              externalIdField: 'ProductCode',
              value: 'MISSING-PRODUCT'
            },
            quantity: 1,
            expectedPricingFields: { TotalPrice: 5000, Discount: 0, UnitPrice: 5000, ListPrice: 5000 }
          }]
        }
      };

      const result = comparator.compare(snapshotWithMissingLine, mockActualQuoteData);
      
      expect(result.overallMatch).toBe(false);
      expect(result.lineItems).toHaveLength(1);
      expect(result.lineItems[0].found).toBe(false);
      expect(result.lineItems[0].externalId).toBe('MISSING-PRODUCT');
    });

    it('should handle numeric tolerance edge cases', () => {
      const edgeCaseSnapshot: PricingSnapshot = {
        ...mockPricingSnapshot,
        expectedResults: {
          quoteFields: { GrandTotal: 10000.005 }
        },
        recreationPayload: {
          ...mockPricingSnapshot.recreationPayload,
          lineItems: [{
            productIdentifier: {
              type: 'externalId',
              externalIdField: 'ProductCode',
              value: 'TEST-001'
            },
            quantity: 1,
            expectedPricingFields: { TotalPrice: 1000.001, Discount: 0, UnitPrice: 1000, ListPrice: 1000 }
          }]
        }
      };

      const edgeCaseActualData: QuoteData = {
        ...mockActualQuoteData,
        GrandTotal: 10000.009, // Within tolerance
        QuoteLines: [{
          Id: '0QL000000000001',
          Product2Id: '01t000000000001',
          Product2: {
            Id: '01t000000000001',
            Name: 'Test Product',
            ProductCode: 'TEST-001'
          },
          Quantity: 1,
          UnitPrice: 1000,
          TotalPrice: 1000.002, // Within tolerance
          Discount: 0,
          ListPrice: 1000
        }]
      };

      const result = comparator.compare(edgeCaseSnapshot, edgeCaseActualData);
      expect(result.overallMatch).toBe(true);
    });

    it('should handle generateEnhancedReport with full test result', () => {
      const testResult = {
        success: true,
        snapshot: mockPricingSnapshot,
        targetOrg: { alias: 'test-org', username: 'test@example.com' },
        comparison: {
          quote: { fieldComparisons: [], overallMatch: true },
          lineItems: [],
          overallMatch: true,
          summary: {
            totalFields: 2,
            matchingFields: 2,
            totalLineItems: 0,
            matchingLineItems: 0,
            successRate: 100
          }
        },
        createdQuoteId: '0Q0000000000002',
        errors: [],
        executionTime: 1500
      };

      const comparison = {
        quote: { fieldComparisons: [], overallMatch: true },
        lineItems: [],
        hierarchicalGroups: [],
        overallMatch: true,
        summary: {
          totalFields: 2,
          matchingFields: 2,
          totalLineItems: 0,
          matchingLineItems: 0,
          successRate: 100,
          totalBundles: 0,
          totalStandalone: 0
        }
      };

      const html = comparator.generateEnhancedReport(
        comparison,
        mockPricingSnapshot,
        mockActualQuoteData,
        testResult
      );

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Test snapshot');
      expect(html).toContain('test-org');
      expect(html).toContain('100%');
    });

    it('should handle failed test result in enhanced report', () => {
      const failedTestResult = {
        success: false,
        snapshot: mockPricingSnapshot,
        targetOrg: { alias: 'test-org', username: 'test@example.com' },
        comparison: undefined,
        actualQuoteData: undefined,
        createdQuoteId: '',
        errors: ['Test failed', 'Quote creation failed'],
        executionTime: 500
      };

      const failedComparison = {
        quote: { fieldComparisons: [], overallMatch: false },
        lineItems: [],
        hierarchicalGroups: [],
        overallMatch: false,
        summary: {
          totalFields: 2,
          matchingFields: 0,
          totalLineItems: 0,
          matchingLineItems: 0,
          successRate: 0,
          totalBundles: 0,
          totalStandalone: 0
        }
      };

      const html = comparator.generateEnhancedReport(
        failedComparison,
        mockPricingSnapshot,
        undefined,
        failedTestResult
      );

      expect(html).toContain('Failed');
      expect(html).toContain('Overall Status');
      expect(html).toContain('N/A - Quote creation failed');
    });

    it('should handle bundle hierarchy with parent-child relationships', () => {
      // Create test data with bundle structure
      const bundleSnapshot: PricingSnapshot = {
        metadata: {
          snapshotVersion: '1.0',
          sourceOrgUsername: 'test@example.com',
          sourceOrgId: '00D000000000001',
          sourceQuoteId: '0Q0000000000001',
          sourceOpportunityId: '006000000000001',
          createdAt: '2025-01-01T00:00:00.000Z',
          description: 'Bundle test snapshot'
        },
        expectedResults: {
          quoteFields: {
            GrandTotal: 15000.00,
            Discount: 500.00
          }
        },
        recreationPayload: {
          accountId: '001000000000001',
          quoteName: 'Bundle Test Quote',
          lineItems: [
            {
              // Parent bundle item
              productIdentifier: {
                type: 'externalId',
                externalIdField: 'ProductCode',
                value: 'BUNDLE-001'
              },
              quantity: 1,
              expectedPricingFields: {
                TotalPrice: 10000.00,
                Discount: 300.00,
                UnitPrice: 10000.00,
                ListPrice: 10300.00
              }
            },
            {
              // Child item 1
              productIdentifier: {
                type: 'externalId',
                externalIdField: 'ProductCode',
                value: 'CHILD-001'
              },
              quantity: 2,
              expectedPricingFields: {
                TotalPrice: 3000.00,
                Discount: 100.00,
                UnitPrice: 1500.00,
                ListPrice: 1600.00
              },
              parentLineItemReference: {
                sourceParentLineItemId: '0QL000000000001',
                parentProductIdentifier: {
                  type: 'externalId',
                  externalIdField: 'ProductCode',
                  value: 'BUNDLE-001'
                }
              }
            },
            {
              // Child item 2
              productIdentifier: {
                type: 'externalId',
                externalIdField: 'ProductCode',
                value: 'CHILD-002'
              },
              quantity: 1,
              expectedPricingFields: {
                TotalPrice: 2000.00,
                Discount: 100.00,
                UnitPrice: 2000.00,
                ListPrice: 2100.00
              },
              parentLineItemReference: {
                sourceParentLineItemId: '0QL000000000001',
                parentProductIdentifier: {
                  type: 'externalId',
                  externalIdField: 'ProductCode',
                  value: 'BUNDLE-001'
                }
              }
            }
          ]
        }
      };

      const bundleActualQuoteData: QuoteData = {
        Id: '0Q0000000000001',
        Name: 'Bundle Test Quote',
        Account: {
          Id: '001000000000001',
          Name: 'Test Account'
        },
        GrandTotal: 15000.00,
        Discount: 500.00,
        QuoteLines: [
          {
            Id: '0QL000000000001',
            Product2: {
              Id: '01t000000000001',
              Name: 'Bundle Product',
              ProductCode: 'BUNDLE-001'
            },
            Quantity: 1,
            UnitPrice: 10000.00,
            TotalPrice: 10000.00,
            Discount: 300.00,
            ListPrice: 10300.00
          },
          {
            Id: '0QL000000000002',
            Product2: {
              Id: '01t000000000002',
              Name: 'Child Product 1',
              ProductCode: 'CHILD-001'
            },
            Quantity: 2,
            UnitPrice: 1500.00,
            TotalPrice: 3000.00,
            Discount: 100.00,
            ListPrice: 1600.00,
            ParentQuoteLineItemId: '0QL000000000001'
          },
          {
            Id: '0QL000000000003',
            Product2: {
              Id: '01t000000000003',
              Name: 'Child Product 2',
              ProductCode: 'CHILD-002'
            },
            Quantity: 1,
            UnitPrice: 2000.00,
            TotalPrice: 2000.00,
            Discount: 100.00,
            ListPrice: 2100.00,
            ParentQuoteLineItemId: '0QL000000000001'
          }
        ]
      };

      const result = comparator.compare(bundleSnapshot, bundleActualQuoteData);

      // Basic assertions
      expect(result.overallMatch).toBe(true);
      expect(result.quote.overallMatch).toBe(true);
      expect(result.lineItems).toHaveLength(3);
      expect(result.lineItems.every(li => li.overallMatch)).toBe(true);

      // Hierarchical structure assertions
      expect(result.hierarchicalGroups).toBeDefined();
      expect(result.hierarchicalGroups).toHaveLength(1); // One bundle group
      expect(result.summary.totalBundles).toBe(1);
      expect(result.summary.totalStandalone).toBe(0);

      // Bundle group structure
      const bundleGroup = result.hierarchicalGroups[0];
      expect(bundleGroup.type).toBe('bundle');
      expect(bundleGroup.parentItem).toBeDefined();
      expect(bundleGroup.parentItem!.externalId).toBe('BUNDLE-001');
      expect(bundleGroup.parentItem!.productName).toBe('Bundle Product');
      expect(bundleGroup.parentItem!.isParent).toBe(true);

      // Child items
      expect(bundleGroup.childItems).toHaveLength(2);
      expect(bundleGroup.childItems[0].externalId).toBe('CHILD-001');
      expect(bundleGroup.childItems[1].externalId).toBe('CHILD-002');
      expect(bundleGroup.childItems[0].parentExternalId).toBe('BUNDLE-001');
      expect(bundleGroup.childItems[1].parentExternalId).toBe('BUNDLE-001');
      expect(bundleGroup.childItems[0].isParent).toBe(false);
      expect(bundleGroup.childItems[1].isParent).toBe(false);

      // Bundle overall status
      expect(bundleGroup.overallMatch).toBe(true);
      expect(bundleGroup.bundleName).toBe('Bundle Product');
    });

    it('should handle mixed bundles and standalone items', () => {
      // Create test data with both bundle and standalone items
      const mixedSnapshot: PricingSnapshot = {
        metadata: {
          snapshotVersion: '1.0',
          sourceOrgUsername: 'test@example.com',
          sourceOrgId: '00D000000000001',
          sourceQuoteId: '0Q0000000000001',
          sourceOpportunityId: '006000000000001',
          createdAt: '2025-01-01T00:00:00.000Z',
          description: 'Mixed test snapshot'
        },
        expectedResults: {
          quoteFields: {
            GrandTotal: 15000.00,
            Discount: 500.00
          }
        },
        recreationPayload: {
          accountId: '001000000000001',
          quoteName: 'Mixed Test Quote',
          lineItems: [
            {
              // Standalone item
              productIdentifier: {
                type: 'externalId',
                externalIdField: 'ProductCode',
                value: 'STANDALONE-001'
              },
              quantity: 1,
              expectedPricingFields: {
                TotalPrice: 5000.00,
                Discount: 0.00,
                UnitPrice: 5000.00,
                ListPrice: 5000.00
              }
            },
            {
              // Parent bundle item
              productIdentifier: {
                type: 'externalId',
                externalIdField: 'ProductCode',
                value: 'BUNDLE-001'
              },
              quantity: 1,
              expectedPricingFields: {
                TotalPrice: 8000.00,
                Discount: 200.00,
                UnitPrice: 8000.00,
                ListPrice: 8200.00
              }
            },
            {
              // Child item
              productIdentifier: {
                type: 'externalId',
                externalIdField: 'ProductCode',
                value: 'CHILD-001'
              },
              quantity: 1,
              expectedPricingFields: {
                TotalPrice: 2000.00,
                Discount: 0.00,
                UnitPrice: 2000.00,
                ListPrice: 2000.00
              },
              parentLineItemReference: {
                sourceParentLineItemId: '0QL000000000002',
                parentProductIdentifier: {
                  type: 'externalId',
                  externalIdField: 'ProductCode',
                  value: 'BUNDLE-001'
                }
              }
            }
          ]
        }
      };

      const mixedActualQuoteData: QuoteData = {
        Id: '0Q0000000000001',
        Name: 'Mixed Test Quote',
        Account: {
          Id: '001000000000001',
          Name: 'Test Account'
        },
        GrandTotal: 15000.00,
        Discount: 500.00,
        QuoteLines: [
          {
            Id: '0QL000000000001',
            Product2: {
              Id: '01t000000000001',
              Name: 'Standalone Product',
              ProductCode: 'STANDALONE-001'
            },
            Quantity: 1,
            UnitPrice: 5000.00,
            TotalPrice: 5000.00,
            Discount: 0.00,
            ListPrice: 5000.00
          },
          {
            Id: '0QL000000000002',
            Product2: {
              Id: '01t000000000002',
              Name: 'Bundle Product',
              ProductCode: 'BUNDLE-001'
            },
            Quantity: 1,
            UnitPrice: 8000.00,
            TotalPrice: 8000.00,
            Discount: 200.00,
            ListPrice: 8200.00
          },
          {
            Id: '0QL000000000003',
            Product2: {
              Id: '01t000000000003',
              Name: 'Child Product',
              ProductCode: 'CHILD-001'
            },
            Quantity: 1,
            UnitPrice: 2000.00,
            TotalPrice: 2000.00,
            Discount: 0.00,
            ListPrice: 2000.00,
            ParentQuoteLineItemId: '0QL000000000002'
          }
        ]
      };

      const result = comparator.compare(mixedSnapshot, mixedActualQuoteData);

      // Basic assertions
      expect(result.overallMatch).toBe(true);
      expect(result.lineItems).toHaveLength(3);

      // Hierarchical structure assertions
      expect(result.hierarchicalGroups).toBeDefined();
      expect(result.hierarchicalGroups).toHaveLength(2); // One bundle, one standalone
      expect(result.summary.totalBundles).toBe(1);
      expect(result.summary.totalStandalone).toBe(1);

      // Find bundle and standalone groups
      const bundleGroup = result.hierarchicalGroups.find(g => g.type === 'bundle');
      const standaloneGroup = result.hierarchicalGroups.find(g => g.type === 'standalone');

      expect(bundleGroup).toBeDefined();
      expect(standaloneGroup).toBeDefined();

      // Bundle assertions
      expect(bundleGroup!.parentItem!.externalId).toBe('BUNDLE-001');
      expect(bundleGroup!.childItems).toHaveLength(1);
      expect(bundleGroup!.childItems[0].externalId).toBe('CHILD-001');

      // Standalone assertions
      expect(standaloneGroup!.childItems).toHaveLength(1);
      expect(standaloneGroup!.childItems[0].externalId).toBe('STANDALONE-001');
      expect(standaloneGroup!.childItems[0].isParent).toBe(false);
    });
  });

  // Note: HTML report generation is handled by the ReportView component
});