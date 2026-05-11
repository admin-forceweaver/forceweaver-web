import * as vscode from 'vscode';
import { SidebarProvider, SnapshotItem } from '../../ui/sidebarProvider';
import { SnapshotCreator, PricingSnapshot } from '../../snapshot/creator';
import { TestRunner, TestResult } from '../../test/runner';
import { ReportView } from '../../ui/reportView';
import { SalesforceAuth, SalesforceOrg } from '../../salesforce/auth';

// Mock vscode
jest.mock('vscode', () => ({
  TreeItem: class TreeItem {
    label: string | undefined;
    description: string | undefined;
    tooltip: string | undefined;
    contextValue: string | undefined;
    iconPath: any;
    command: any;
    collapsibleState: any;

    constructor(label: string, collapsibleState?: any) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  },
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2
  },
  ThemeIcon: jest.fn().mockImplementation((id: string) => ({ id })),
  Uri: {
    file: jest.fn().mockImplementation((path: string) => ({ fsPath: path, scheme: 'file' }))
  },
  EventEmitter: jest.fn().mockImplementation(function(this: any) {
    this.event = jest.fn();
    this.fire = jest.fn();
  }),
  ProgressLocation: {
    Notification: 15
  },
  window: {
    withProgress: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn()
  },
  workspace: {
    workspaceFolders: [],
    getConfiguration: jest.fn()
  },
  commands: {
    executeCommand: jest.fn()
  }
}));

// Mock path module
jest.mock('path', () => ({
  basename: jest.fn((filePath: string, ext?: string) => {
    const name = filePath.split('/').pop() || '';
    if (ext && name.endsWith(ext)) {
      return name.substring(0, name.length - ext.length);
    }
    return name;
  })
}));

// Mock dependencies
jest.mock('../../snapshot/creator');
jest.mock('../../test/runner');
jest.mock('../../ui/reportView');

describe('SnapshotItem', () => {
  let mockSnapshot: PricingSnapshot;
  const testFilePath = '/workspace/revcloud_blueprint/pricing/snapshots/snapshot_test.json';

  beforeEach(() => {
    mockSnapshot = {
      metadata: {
        snapshotVersion: '1.0',
        sourceOrgUsername: 'test@example.com',
        sourceOrgAlias: 'TestOrg',
        sourceOrgId: '00D000000000001',
        sourceQuoteId: '0Q0000000000001',
        sourceOpportunityId: '006000000000001',
        createdAt: '2025-01-01T00:00:00.000Z',
        description: 'Test Snapshot'
      },
      expectedResults: {
        quoteFields: {
          GrandTotal: 10000.00
        }
      },
      recreationPayload: {
        accountId: '001000000000001',
        quoteName: 'Test Quote',
        lineItems: [
          {
            productIdentifier: {
              type: 'externalId' as const,
              externalIdField: 'ProductCode',
              value: 'SKU-001'
            },
            quantity: 2,
            expectedPricingFields: {
              TotalPrice: 10000.00
            }
          }
        ]
      }
    };
  });

  describe('constructor', () => {
    it('should create snapshot item with correct properties', () => {
      const item = new SnapshotItem(testFilePath, mockSnapshot, vscode.TreeItemCollapsibleState.None);

      expect(item.label).toBe('Test Snapshot');
      expect(item.contextValue).toBe('pricingSnapshot');
      expect(item.collapsibleState).toBe(vscode.TreeItemCollapsibleState.None);
    });

    it('should use filename when description is not available', () => {
      const snapshotWithoutDesc = {
        ...mockSnapshot,
        metadata: { ...mockSnapshot.metadata, description: undefined }
      };

      const item = new SnapshotItem(testFilePath, snapshotWithoutDesc, vscode.TreeItemCollapsibleState.None);

      expect(item.label).toBe('snapshot_test');
    });

    it('should generate tooltip with snapshot details', () => {
      const item = new SnapshotItem(testFilePath, mockSnapshot, vscode.TreeItemCollapsibleState.None);

      expect(item.tooltip).toContain('Source: TestOrg');
      expect(item.tooltip).toContain('Quote ID: 0Q0000000000001');
      expect(item.tooltip).toContain('Line Items: 1');
      expect(item.tooltip).toContain('Grand Total: $10000.00');
    });

    it('should generate description with org and line items', () => {
      const item = new SnapshotItem(testFilePath, mockSnapshot, vscode.TreeItemCollapsibleState.None);

      expect(item.description).toContain('TestOrg');
      expect(item.description).toContain('1 items');
      expect(item.description).toContain('$10000.00');
    });

    it('should use username when alias is not available', () => {
      const snapshotWithoutAlias = {
        ...mockSnapshot,
        metadata: { ...mockSnapshot.metadata, sourceOrgAlias: undefined }
      };

      const item = new SnapshotItem(testFilePath, snapshotWithoutAlias, vscode.TreeItemCollapsibleState.None);

      expect(item.description).toContain('test@example.com');
    });

    it('should have command to open file', () => {
      const item = new SnapshotItem(testFilePath, mockSnapshot, vscode.TreeItemCollapsibleState.None);

      expect(item.command).toBeDefined();
      expect(item.command?.command).toBe('vscode.open');
      expect(item.command?.arguments).toHaveLength(1);
    });
  });
});

describe('SidebarProvider', () => {
  let sidebarProvider: SidebarProvider;
  let mockWorkspaceRoot: vscode.Uri;
  let mockSnapshotCreator: jest.Mocked<SnapshotCreator>;
  let mockTestRunner: jest.Mocked<TestRunner>;
  let mockReportView: jest.Mocked<ReportView>;
  let mockAuth: jest.Mocked<SalesforceAuth>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock workspace
    mockWorkspaceRoot = {
      fsPath: '/workspace',
      scheme: 'file',
      authority: '',
      path: '/workspace',
      query: '',
      fragment: '',
      with: jest.fn(),
      toJSON: jest.fn()
    } as any;

    (vscode.workspace as any).workspaceFolders = [{ uri: mockWorkspaceRoot }];

    // Mock snapshot creator
    mockSnapshotCreator = new SnapshotCreator({} as any) as jest.Mocked<SnapshotCreator>;
    (SnapshotCreator.getSnapshotFiles as jest.Mock) = jest.fn().mockReturnValue([]);
    (SnapshotCreator.loadSnapshot as jest.Mock) = jest.fn();

    // Mock test runner
    mockAuth = new SalesforceAuth() as jest.Mocked<SalesforceAuth>;
    mockTestRunner = new TestRunner(mockAuth) as jest.Mocked<TestRunner>;
    (mockTestRunner as any).auth = {
      useSourceOrgWithOpportunity: jest.fn()
    };

    // Mock report view
    mockReportView = new ReportView({} as any) as jest.Mocked<ReportView>;
    mockReportView.showTestResult = jest.fn().mockResolvedValue(undefined);

    // Mock window.withProgress
    (vscode.window.withProgress as jest.Mock) = jest.fn((options, task) => {
      const mockProgress = {
        report: jest.fn()
      };
      return task(mockProgress);
    });

    // Mock window.showErrorMessage
    (vscode.window.showErrorMessage as jest.Mock) = jest.fn();
    (vscode.window.showWarningMessage as jest.Mock) = jest.fn();

    sidebarProvider = new SidebarProvider(
      mockWorkspaceRoot,
      mockSnapshotCreator,
      mockTestRunner,
      mockReportView
    );
  });

  describe('constructor', () => {
    it('should initialize with dependencies', () => {
      expect(sidebarProvider).toBeDefined();
      expect(SnapshotCreator.getSnapshotFiles).toHaveBeenCalled();
    });

    it('should handle errors during initial load', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (SnapshotCreator.getSnapshotFiles as jest.Mock).mockImplementation(() => {
        throw new Error('Load error');
      });

      new SidebarProvider(mockWorkspaceRoot, mockSnapshotCreator, mockTestRunner, mockReportView);

      await new Promise(resolve => setTimeout(resolve, 10));
      consoleSpy.mockRestore();
    });
  });

  describe('refresh', () => {
    it('should reload snapshots and fire tree data change event', async () => {
      const fireMethod = sidebarProvider['_onDidChangeTreeData'].fire as jest.Mock;

      await sidebarProvider.refresh();

      expect(fireMethod).toHaveBeenCalled();
    });

    it('should show progress notification', async () => {
      await sidebarProvider.refresh();

      expect(vscode.window.withProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          location: vscode.ProgressLocation.Notification,
          title: 'Refreshing test snapshots...'
        }),
        expect.any(Function)
      );
    });
  });

  describe('getTreeItem', () => {
    it('should return the element as is', () => {
      const mockItem = new SnapshotItem('/test.json', {
        metadata: {
          snapshotVersion: '1.0',
          sourceOrgUsername: 'test@example.com',
          sourceOrgId: '00D000000000001',
          sourceQuoteId: '0Q0000000000001',
          createdAt: '2025-01-01T00:00:00.000Z'
        },
        expectedResults: { quoteFields: { GrandTotal: 1000 } },
        recreationPayload: { accountId: '001', quoteName: 'Test', lineItems: [] }
      }, vscode.TreeItemCollapsibleState.None);

      const result = sidebarProvider.getTreeItem(mockItem);

      expect(result).toBe(mockItem);
    });
  });

  describe('getChildren', () => {
    it('should return snapshot items for root', async () => {
      const mockSnapshot = {
        metadata: {
          snapshotVersion: '1.0',
          sourceOrgUsername: 'test@example.com',
          sourceOrgId: '00D000000000001',
          sourceQuoteId: '0Q0000000000001',
          createdAt: '2025-01-01T00:00:00.000Z'
        },
        expectedResults: { quoteFields: { GrandTotal: 1000 } },
        recreationPayload: { accountId: '001', quoteName: 'Test', lineItems: [] }
      };

      (SnapshotCreator.getSnapshotFiles as jest.Mock).mockReturnValue(['/test1.json']);
      (SnapshotCreator.loadSnapshot as jest.Mock).mockResolvedValue(mockSnapshot);

      await sidebarProvider['loadSnapshots']();
      const result = await sidebarProvider.getChildren();

      expect(result).toHaveLength(1);
    });

    it('should return empty array when no workspace folders', async () => {
      (vscode.workspace as any).workspaceFolders = [];

      const result = await sidebarProvider.getChildren();

      expect(result).toEqual([]);
    });

    it('should return empty array for child elements', async () => {
      const mockItem = new SnapshotItem('/test.json', {
        metadata: {
          snapshotVersion: '1.0',
          sourceOrgUsername: 'test@example.com',
          sourceOrgId: '00D000000000001',
          sourceQuoteId: '0Q0000000000001',
          createdAt: '2025-01-01T00:00:00.000Z'
        },
        expectedResults: { quoteFields: { GrandTotal: 1000 } },
        recreationPayload: { accountId: '001', quoteName: 'Test', lineItems: [] }
      }, vscode.TreeItemCollapsibleState.None);

      const result = await sidebarProvider.getChildren(mockItem);

      expect(result).toEqual([]);
    });
  });

  describe('loadSnapshots', () => {
    it('should load snapshots successfully', async () => {
      const mockSnapshot = {
        metadata: {
          snapshotVersion: '1.0',
          sourceOrgUsername: 'test@example.com',
          sourceOrgId: '00D000000000001',
          sourceQuoteId: '0Q0000000000001',
          createdAt: '2025-01-01T00:00:00.000Z',
          description: 'Test'
        },
        expectedResults: { quoteFields: { GrandTotal: 1000 } },
        recreationPayload: { accountId: '001', quoteName: 'Test', lineItems: [] }
      };

      (SnapshotCreator.getSnapshotFiles as jest.Mock).mockReturnValue(['/test1.json', '/test2.json']);
      (SnapshotCreator.loadSnapshot as jest.Mock).mockResolvedValue(mockSnapshot);

      await sidebarProvider['loadSnapshots']();

      expect(sidebarProvider['snapshotItems']).toHaveLength(2);
    });

    it('should handle snapshot loading errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      (SnapshotCreator.getSnapshotFiles as jest.Mock).mockReturnValue(['/test1.json', '/test2.json']);
      (SnapshotCreator.loadSnapshot as jest.Mock)
        .mockResolvedValueOnce({
          metadata: {
            snapshotVersion: '1.0',
            sourceOrgUsername: 'test@example.com',
            sourceOrgId: '00D000000000001',
            sourceQuoteId: '0Q0000000000001',
            createdAt: '2025-01-01T00:00:00.000Z'
          },
          expectedResults: { quoteFields: { GrandTotal: 1000 } },
          recreationPayload: { accountId: '001', quoteName: 'Test', lineItems: [] }
        })
        .mockRejectedValueOnce(new Error('Load failed'));

      await sidebarProvider['loadSnapshots']();

      expect(sidebarProvider['snapshotItems']).toHaveLength(1);
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should show error message when loading fails critically', async () => {
      (SnapshotCreator.getSnapshotFiles as jest.Mock).mockImplementation(() => {
        throw new Error('Critical error');
      });

      await sidebarProvider['loadSnapshots']();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load snapshots')
      );
    });

    it('should handle empty workspace folders', async () => {
      (vscode.workspace as any).workspaceFolders = [];

      await sidebarProvider['loadSnapshots']();

      expect(sidebarProvider['snapshotItems']).toEqual([]);
    });
  });

  describe('createSnapshot', () => {
    it('should create snapshot and refresh', async () => {
      mockSnapshotCreator.createSnapshot = jest.fn().mockResolvedValue('/new-snapshot.json');
      const refreshSpy = jest.spyOn(sidebarProvider, 'refresh').mockImplementation();

      await sidebarProvider.createSnapshot();

      expect(mockSnapshotCreator.createSnapshot).toHaveBeenCalled();
      expect(refreshSpy).toHaveBeenCalled();
      refreshSpy.mockRestore();
    });

    it('should show error message when snapshot creation fails', async () => {
      mockSnapshotCreator.createSnapshot = jest.fn().mockRejectedValue(new Error('Creation failed'));

      await sidebarProvider.createSnapshot();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create snapshot')
      );
    });
  });

  describe('runTest', () => {
    let mockSnapshotItem: SnapshotItem;
    let mockSnapshot: PricingSnapshot;
    let mockTargetOrg: SalesforceOrg;
    let mockTestResult: TestResult;

    beforeEach(() => {
      mockSnapshot = {
        metadata: {
          snapshotVersion: '1.0',
          sourceOrgUsername: 'test@example.com',
          sourceOrgId: '00D000000000001',
          sourceQuoteId: '0Q0000000000001',
          sourceOpportunityId: '006000000000001',
          createdAt: '2025-01-01T00:00:00.000Z',
          description: 'Test'
        },
        expectedResults: { quoteFields: { GrandTotal: 1000 } },
        recreationPayload: {
          accountId: '001',
          quoteName: 'Test',
          lineItems: [],
          sourceOpportunity: {
            Id: '006000000000001',
            Name: 'Test Opp',
            AccountId: '001',
            Account: { Id: '001', Name: 'Test' }
          }
        }
      };

      mockSnapshotItem = new SnapshotItem('/test.json', mockSnapshot, vscode.TreeItemCollapsibleState.None);

      mockTargetOrg = {
        orgId: '00D000000000001',
        username: 'test@example.com',
        alias: 'TestOrg',
        instanceUrl: 'https://test.salesforce.com',
        isActive: true,
        type: 'Sandbox',
        testOpportunityId: '006000000000001'
      };

      mockTestResult = {
        success: true,
        snapshot: mockSnapshot,
        targetOrg: mockTargetOrg,
        createdQuoteId: '0Q0000000000002',
        executionTime: 1000
      };

      (SnapshotCreator.loadSnapshot as jest.Mock).mockResolvedValue(mockSnapshot);
      ((mockTestRunner as any).auth.useSourceOrgWithOpportunity as jest.Mock).mockResolvedValue(mockTargetOrg);
      mockTestRunner.runTest = jest.fn().mockResolvedValue(mockTestResult);
    });

    it('should run test successfully', async () => {
      await sidebarProvider.runTest(mockSnapshotItem);

      expect(SnapshotCreator.loadSnapshot).toHaveBeenCalledWith('/test.json');
      expect((mockTestRunner as any).auth.useSourceOrgWithOpportunity).toHaveBeenCalled();
      expect(mockTestRunner.runTest).toHaveBeenCalledWith(
        mockSnapshot,
        mockTargetOrg,
        expect.any(Function)
      );
      expect(mockReportView.showTestResult).toHaveBeenCalledWith(mockTestResult);
    });

    it('should handle user cancellation', async () => {
      ((mockTestRunner as any).auth.useSourceOrgWithOpportunity as jest.Mock).mockResolvedValue(null);

      await sidebarProvider.runTest(mockSnapshotItem);

      expect(mockTestRunner.runTest).not.toHaveBeenCalled();
    });

    it('should show warning for failed tests', async () => {
      const failedResult = {
        ...mockTestResult,
        success: false,
        errors: ['Test error']
      };

      mockTestRunner.runTest = jest.fn().mockResolvedValue(failedResult);

      await sidebarProvider.runTest(mockSnapshotItem);

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('Test FAILED')
      );
    });

    it('should handle test execution errors', async () => {
      mockTestRunner.runTest = jest.fn().mockRejectedValue(new Error('Test execution failed'));

      await sidebarProvider.runTest(mockSnapshotItem);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Test execution failed')
      );
    });

    it('should handle report view errors', async () => {
      mockReportView.showTestResult = jest.fn().mockRejectedValue(new Error('Report error'));

      await sidebarProvider.runTest(mockSnapshotItem);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Report generation failed')
      );
    });
  });

  describe('deleteSnapshot', () => {
    let mockSnapshotItem: SnapshotItem;

    beforeEach(() => {
      mockSnapshotItem = new SnapshotItem('/test.json', {
        metadata: {
          snapshotVersion: '1.0',
          sourceOrgUsername: 'test@example.com',
          sourceOrgId: '00D000000000001',
          sourceQuoteId: '0Q0000000000001',
          createdAt: '2025-01-01T00:00:00.000Z',
          description: 'Test'
        },
        expectedResults: { quoteFields: { GrandTotal: 1000 } },
        recreationPayload: { accountId: '001', quoteName: 'Test', lineItems: [] }
      }, vscode.TreeItemCollapsibleState.None);

      (SnapshotCreator.deleteSnapshot as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    });

    it('should delete snapshot and refresh', async () => {
      const refreshSpy = jest.spyOn(sidebarProvider, 'refresh').mockImplementation();

      await sidebarProvider.deleteSnapshot(mockSnapshotItem);

      expect(SnapshotCreator.deleteSnapshot).toHaveBeenCalledWith('/test.json');
      expect(refreshSpy).toHaveBeenCalled();
      refreshSpy.mockRestore();
    });

    it('should handle deletion errors', async () => {
      (SnapshotCreator.deleteSnapshot as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      await sidebarProvider.deleteSnapshot(mockSnapshotItem);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete snapshot')
      );
    });
  });

  // Note: viewSnapshot method does not exist in SidebarProvider, removing this test

  describe('runBatchTests', () => {
    const testSnapshot = {
      metadata: {
        snapshotVersion: '1.0',
        sourceOrgUsername: 'test@example.com',
        sourceOrgId: '00D000000000001',
        sourceQuoteId: '0Q0000000000001',
        createdAt: '2025-01-01T00:00:00.000Z'
      },
      expectedResults: { quoteFields: { GrandTotal: 1000 } },
      recreationPayload: { accountId: '001', quoteName: 'Test', lineItems: [] }
    };

    beforeEach(() => {
      (mockTestRunner as any).auth = {
        selectOrg: jest.fn()
      };
      (mockTestRunner as any).runBatchTests = jest.fn();
      (vscode.window as any).showQuickPick = jest.fn();
    });

    it('should show message when no snapshots available', async () => {
      (vscode.window as any).showInformationMessage = jest.fn();
      (sidebarProvider as any).snapshotItems = [];

      await sidebarProvider.runBatchTests();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('No snapshots available for testing.');
    });

    it('should return early if no target org selected', async () => {
      (sidebarProvider as any).snapshotItems = [
        { snapshot: testSnapshot, filePath: '/test.json' }
      ];
      (mockTestRunner as any).auth.selectOrg.mockResolvedValue(undefined);

      await sidebarProvider.runBatchTests();

      expect(mockTestRunner.runBatchTests).not.toHaveBeenCalled();
    });

    it('should return early if no snapshots selected', async () => {
      (sidebarProvider as any).snapshotItems = [
        { snapshot: testSnapshot, filePath: '/test.json' }
      ];
      const mockOrg = { alias: 'TestOrg', username: 'test@example.com' };
      (mockTestRunner as any).auth.selectOrg.mockResolvedValue(mockOrg);
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

      await sidebarProvider.runBatchTests();

      expect(mockTestRunner.runBatchTests).not.toHaveBeenCalled();
    });

    it('should run batch tests and show success message when all pass', async () => {
      (sidebarProvider as any).snapshotItems = [
        { snapshot: testSnapshot, filePath: '/test.json' }
      ];
      const mockOrg = { alias: 'TestOrg', username: 'test@example.com' };
      const mockResults = [{ success: true }];

      (mockTestRunner as any).auth.selectOrg.mockResolvedValue(mockOrg);
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue([
        { label: 'snapshot_test', item: { snapshot: testSnapshot, filePath: '/test.json' } }
      ]);
      (mockTestRunner as any).runBatchTests.mockResolvedValue(mockResults);
      (mockReportView.showBatchTestResults as jest.Mock) = jest.fn().mockResolvedValue(undefined);
      (vscode.window as any).showInformationMessage = jest.fn();

      await sidebarProvider.runBatchTests();

      expect(mockTestRunner.runBatchTests).toHaveBeenCalled();
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('1/1 passed')
      );
    });

    it('should show warning message when some tests fail', async () => {
      (sidebarProvider as any).snapshotItems = [
        { snapshot: testSnapshot, filePath: '/test1.json' },
        { snapshot: testSnapshot, filePath: '/test2.json' }
      ];
      const mockOrg = { alias: 'TestOrg', username: 'test@example.com' };
      const mockResults = [
        { success: true },
        { success: false }
      ];

      (mockTestRunner as any).auth.selectOrg.mockResolvedValue(mockOrg);
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue([
        { label: 'test1', item: { snapshot: testSnapshot, filePath: '/test1.json' } },
        { label: 'test2', item: { snapshot: testSnapshot, filePath: '/test2.json' } }
      ]);
      (mockTestRunner as any).runBatchTests.mockResolvedValue(mockResults);
      (mockReportView.showBatchTestResults as jest.Mock) = jest.fn().mockResolvedValue(undefined);
      (vscode.window as any).showWarningMessage = jest.fn();

      await sidebarProvider.runBatchTests();

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('1/2 passed')
      );
    });

    it('should handle batch test errors', async () => {
      (sidebarProvider as any).snapshotItems = [
        { snapshot: testSnapshot, filePath: '/test.json' }
      ];
      const mockOrg = { alias: 'TestOrg', username: 'test@example.com' };

      (mockTestRunner as any).auth.selectOrg.mockResolvedValue(mockOrg);
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue([
        { label: 'snapshot_test', item: { snapshot: testSnapshot, filePath: '/test.json' } }
      ]);
      (mockTestRunner as any).runBatchTests.mockRejectedValue(new Error('Batch test failed'));
      (vscode.window as any).showErrorMessage = jest.fn();

      await sidebarProvider.runBatchTests();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Batch test failed')
      );
    });
  });

  describe('getWelcomeContent', () => {
    it('should return welcome content with instructions', () => {
      const content = sidebarProvider.getWelcomeContent();

      expect(content).toContain('Welcome to Pricing Test Framework');
      expect(content).toContain('No pricing snapshots found');
      expect(content).toContain('Getting Started');
      expect(content).toContain('Create a Snapshot');
      expect(content).toContain('Prerequisites');
    });
  });

  describe('validateSchema', () => {
    beforeEach(() => {
      (mockSnapshotCreator as any).auth = {
        selectOrg: jest.fn()
      };
      (mockSnapshotCreator as any).api = {
        query: jest.fn()
      };
    });

    it('should return early if no org selected', async () => {
      (mockSnapshotCreator as any).auth.selectOrg.mockResolvedValue(undefined);

      await sidebarProvider.validateSchema();

      expect((mockSnapshotCreator as any).api.query).not.toHaveBeenCalled();
    });

    it('should validate Quote and QuoteLine objects', async () => {
      const mockOrg = { alias: 'TestOrg', username: 'test@example.com' };
      (mockSnapshotCreator as any).auth.selectOrg.mockResolvedValue(mockOrg);
      (mockSnapshotCreator as any).api.query.mockResolvedValue({ records: [] });

      await sidebarProvider.validateSchema();

      expect((mockSnapshotCreator as any).api.query).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringContaining('Quote')
      );
    });
  });
});
