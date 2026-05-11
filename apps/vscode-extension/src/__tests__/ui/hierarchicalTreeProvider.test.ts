import * as vscode from 'vscode';
import { HierarchicalTreeProvider, HierarchicalTreeItem } from '../../ui/hierarchicalTreeProvider';
import { GroupingManager, SnapshotGroup } from '../../ui/groupingModels';
import { SnapshotCreator } from '../../snapshot/creator';
import { TestRunner } from '../../test/runner';
import { ReportView } from '../../ui/reportView';
import * as licenseService from '../../services/licenseService';

// Mock dependencies
jest.mock('vscode');
jest.mock('../../ui/groupingModels');
jest.mock('../../snapshot/creator');
jest.mock('../../test/runner');
jest.mock('../../ui/reportView');
jest.mock('../../services/licenseService');

describe('HierarchicalTreeProvider - License Gating', () => {
    let provider: HierarchicalTreeProvider;
    let mockGroupingManager: jest.Mocked<GroupingManager>;
    let mockSnapshotCreator: jest.Mocked<SnapshotCreator>;
    let mockTestRunner: jest.Mocked<TestRunner>;
    let mockReportView: jest.Mocked<ReportView>;
    let mockShowInformationMessage: jest.Mock;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock vscode.window.showInformationMessage
        mockShowInformationMessage = jest.fn();
        (vscode.window as any).showInformationMessage = mockShowInformationMessage;
        (vscode.window as any).showWarningMessage = jest.fn();

        // Create mock instances
        mockGroupingManager = new GroupingManager() as jest.Mocked<GroupingManager>;
        mockSnapshotCreator = new SnapshotCreator({} as any) as jest.Mocked<SnapshotCreator>;
        mockTestRunner = new TestRunner({} as any) as jest.Mocked<TestRunner>;
        mockReportView = new ReportView({} as any) as jest.Mocked<ReportView>;

        // Create provider instance
        provider = new HierarchicalTreeProvider(
            mockGroupingManager,
            mockSnapshotCreator,
            mockTestRunner,
            mockReportView
        );
    });

    describe('runBatchTests - License Gating', () => {
        const mockGroupData: SnapshotGroup = {
            id: 'test-group',
            name: 'Test Group',
            description: 'Test group for license testing',
            snapshotPaths: ['test1.json', 'test2.json'],
            createdAt: '2024-01-01T00:00:00Z'
        };

        it('should execute batch tests when license state is Pro (isPro: true)', async () => {
            // Mock license state to return Pro access
            const mockLicenseState = {
                isPro: true,
                tier: 'pro' as const,
                statusMessage: 'Welcome to the Rev Cloud Blueprint Public Beta! All features are enabled.'
            };
            jest.spyOn(licenseService, 'getLicenseState').mockResolvedValue(mockLicenseState);

            // Mock the progress and other dependencies
            const mockProgress = {
                report: jest.fn()
            };
            (vscode.window as any).withProgress = jest.fn().mockImplementation((options, callback) => {
                return callback(mockProgress);
            });

            // Mock the getCachedSnapshotFiles method to return test files
            jest.spyOn(provider as any, 'getCachedSnapshotFiles').mockReturnValue(['test1.json', 'test2.json']);
            
            // Mock SnapshotCreator.loadSnapshot to return valid snapshots
            (SnapshotCreator.loadSnapshot as jest.Mock).mockReturnValue({
                metadata: { description: 'Test snapshot' },
                expectedResults: {},
                recreationPayload: {}
            });

            // Call runBatchTests
            await provider.runBatchTests(mockGroupData);

            // Verify license check was called
            expect(licenseService.getLicenseState).toHaveBeenCalledTimes(1);

            // Verify no blocking message was shown
            expect(mockShowInformationMessage).not.toHaveBeenCalledWith(mockLicenseState.statusMessage);

            // Verify progress was initiated (indicating batch test started)
            expect((vscode.window as any).withProgress).toHaveBeenCalled();
        });

        it('should block batch tests and show message when license state is not Pro (isPro: false)', async () => {
            // Mock license state to return non-Pro access
            const mockLicenseState = {
                isPro: false,
                tier: 'free' as const,
                statusMessage: 'Your free beta period has ended. Please purchase a license to continue using Pro features.'
            };
            jest.spyOn(licenseService, 'getLicenseState').mockResolvedValue(mockLicenseState);

            // Mock withProgress to track if it was called
            (vscode.window as any).withProgress = jest.fn();

            // Call runBatchTests
            await provider.runBatchTests(mockGroupData);

            // Verify license check was called
            expect(licenseService.getLicenseState).toHaveBeenCalledTimes(1);

            // Verify blocking message was shown with correct message
            expect(mockShowInformationMessage).toHaveBeenCalledTimes(1);
            expect(mockShowInformationMessage).toHaveBeenCalledWith(
                mockLicenseState.statusMessage + ' Batch Testing is a Pro feature.',
                'Activate License',
                'Learn More'
            );

            // Verify batch test was not started (withProgress not called)
            expect((vscode.window as any).withProgress).not.toHaveBeenCalled();
        });

        it('should handle empty snapshot paths with license check', async () => {
            // Mock license state to return Pro access
            const mockLicenseState = {
                isPro: true,
                tier: 'pro' as const,
                statusMessage: 'Welcome to the Rev Cloud Blueprint Public Beta! All features are enabled.'
            };
            jest.spyOn(licenseService, 'getLicenseState').mockResolvedValue(mockLicenseState);

            // Mock showWarningMessage
            const mockShowWarningMessage = jest.fn();
            (vscode.window as any).showWarningMessage = mockShowWarningMessage;

            // Test with empty snapshot paths
            const emptyGroupData: SnapshotGroup = {
                ...mockGroupData,
                snapshotPaths: []
            };

            await provider.runBatchTests(emptyGroupData);

            // Verify license check was still called first
            expect(licenseService.getLicenseState).toHaveBeenCalledTimes(1);

            // Verify warning message was shown for empty group
            expect(mockShowWarningMessage).toHaveBeenCalledWith('No tests found in group Test Group');
        });

        it('should prioritize license check over empty group validation', async () => {
            // Mock license state to return non-Pro access
            const mockLicenseState = {
                isPro: false,
                tier: 'free' as const,
                statusMessage: 'Your free beta period has ended. Please purchase a license to continue using Pro features.'
            };
            jest.spyOn(licenseService, 'getLicenseState').mockResolvedValue(mockLicenseState);

            // Mock showWarningMessage
            const mockShowWarningMessage = jest.fn();
            (vscode.window as any).showWarningMessage = mockShowWarningMessage;

            // Test with empty snapshot paths but non-Pro license
            const emptyGroupData: SnapshotGroup = {
                ...mockGroupData,
                snapshotPaths: []
            };

            await provider.runBatchTests(emptyGroupData);

            // Verify license check was called
            expect(licenseService.getLicenseState).toHaveBeenCalledTimes(1);

            // Verify license message was shown, not the empty group warning
            expect(mockShowInformationMessage).toHaveBeenCalledWith(
                mockLicenseState.statusMessage + ' Batch Testing is a Pro feature.',
                'Activate License',
                'Learn More'
            );
            expect(mockShowWarningMessage).not.toHaveBeenCalled();
        });
    });
});

describe('HierarchicalTreeItem', () => {
    describe('group item', () => {
        it('should create group item with proper icon and description', () => {
            const mockGroup = {
                id: 'group-1',
                name: 'Test Group',
                description: 'Test Description',
                snapshotPaths: ['snap1.json', 'snap2.json'],
                createdAt: '2024-01-01'
            };

            const item = new HierarchicalTreeItem(
                'Test Group',
                vscode.TreeItemCollapsibleState.Expanded,
                'group',
                mockGroup
            );

            expect(item.label).toBe('Test Group');
            expect(item.contextValue).toBe('group');
            expect(item.description).toBe('2 tests');
            expect(item.tooltip).toBe('Group: Test Group - Test Description');
        });

        it('should handle group with no description', () => {
            const mockGroup = {
                id: 'group-1',
                name: 'Test Group',
                snapshotPaths: ['snap1.json'],
                createdAt: '2024-01-01'
            };

            const item = new HierarchicalTreeItem(
                'Test Group',
                vscode.TreeItemCollapsibleState.Expanded,
                'group',
                mockGroup
            );

            expect(item.tooltip).toBe('Group: Test Group');
        });

        it('should handle group with no snapshots', () => {
            const mockGroup = {
                id: 'group-1',
                name: 'Empty Group',
                snapshotPaths: [],
                createdAt: '2024-01-01'
            };

            const item = new HierarchicalTreeItem(
                'Empty Group',
                vscode.TreeItemCollapsibleState.None,
                'group',
                mockGroup
            );

            expect(item.description).toBe('0 tests');
        });
    });

    describe('snapshot item', () => {
        beforeEach(() => {
            // Mock path.basename
            jest.mock('path', () => ({
                basename: jest.fn((filePath: string, ext?: string) => {
                    const name = filePath.split('/').pop() || '';
                    if (ext && name.endsWith(ext)) {
                        return name.substring(0, name.length - ext.length);
                    }
                    return name;
                })
            }));
        });

        it('should create snapshot item with extracted info', () => {
            const mockData = {
                path: '/path/to/snapshot_OrgAlias_QuoteId_Description.json'
            };

            const item = new HierarchicalTreeItem(
                'Test Snapshot',
                vscode.TreeItemCollapsibleState.None,
                'snapshot',
                mockData
            );

            expect(item.label).toBe('Test Snapshot');
            expect(item.contextValue).toBe('snapshot');
        });

        it('should handle snapshot with empty path', () => {
            const mockData = {
                path: ''
            };

            const item = new HierarchicalTreeItem(
                'Test Snapshot',
                vscode.TreeItemCollapsibleState.None,
                'snapshot',
                mockData
            );

            expect(item.description).toBe('');
        });
    });
});

describe('HierarchicalTreeProvider - Core Functionality', () => {
    let provider: HierarchicalTreeProvider;
    let mockGroupingManager: jest.Mocked<GroupingManager>;
    let mockSnapshotCreator: jest.Mocked<SnapshotCreator>;
    let mockTestRunner: jest.Mocked<TestRunner>;
    let mockReportView: jest.Mocked<ReportView>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock EventEmitter
        (vscode as any).EventEmitter = jest.fn().mockImplementation(() => ({
            event: jest.fn(),
            fire: jest.fn()
        }));

        mockGroupingManager = {
            getGroups: jest.fn(),
            organizeSnapshots: jest.fn(),
            createGroup: jest.fn(),
            deleteGroup: jest.fn(),
            addSnapshotToGroup: jest.fn(),
            removeSnapshotFromGroup: jest.fn()
        } as any;

        mockSnapshotCreator = {} as any;
        const mockUseSourceOrgWithOpportunity = jest.fn();
        const mockUseSourceOrgForBatchTest = jest.fn();
        mockTestRunner = {
            auth: {
                useSourceOrgForBatchTest: mockUseSourceOrgForBatchTest,
                useSourceOrgWithOpportunity: mockUseSourceOrgWithOpportunity
            },
            runTest: jest.fn()
        } as any;
        mockReportView = {
            showTestResult: jest.fn(),
            showBatchTestResults: jest.fn()
        } as any;

        (SnapshotCreator as any).getSnapshotFiles = jest.fn().mockReturnValue([]);
        (SnapshotCreator as any).loadSnapshot = jest.fn();

        provider = new HierarchicalTreeProvider(
            mockGroupingManager,
            mockSnapshotCreator,
            mockTestRunner,
            mockReportView
        );
    });

    describe('refresh', () => {
        it('should clear cache and fire tree data change event', () => {
            const fireSpy = jest.spyOn((provider as any)._onDidChangeTreeData, 'fire');

            provider.refresh();

            expect((provider as any).snapshotFilesCache).toEqual([]);
            expect((provider as any).lastCacheUpdate).toBe(0);
            expect(fireSpy).toHaveBeenCalled();
        });
    });

    describe('getCachedSnapshotFiles', () => {
        it('should return cached files when cache is fresh', () => {
            const mockFiles = ['file1.json', 'file2.json'];
            (provider as any).snapshotFilesCache = mockFiles;
            (provider as any).lastCacheUpdate = Date.now();

            const result = (provider as any).getCachedSnapshotFiles();

            expect(result).toEqual(mockFiles);
            expect(SnapshotCreator.getSnapshotFiles).not.toHaveBeenCalled();
        });

        it('should refresh cache when cache is stale', () => {
            const mockFiles = ['file1.json', 'file2.json'];
            (SnapshotCreator as any).getSnapshotFiles.mockReturnValue(mockFiles);
            (provider as any).snapshotFilesCache = [];
            (provider as any).lastCacheUpdate = Date.now() - 10000; // 10 seconds ago

            const result = (provider as any).getCachedSnapshotFiles();

            expect(result).toEqual(mockFiles);
            expect(SnapshotCreator.getSnapshotFiles).toHaveBeenCalled();
        });

        it('should refresh cache when cache is empty', () => {
            const mockFiles = ['file1.json'];
            (SnapshotCreator as any).getSnapshotFiles.mockReturnValue(mockFiles);

            const result = (provider as any).getCachedSnapshotFiles();

            expect(result).toEqual(mockFiles);
            expect(SnapshotCreator.getSnapshotFiles).toHaveBeenCalled();
        });
    });

    describe('getTreeItem', () => {
        it('should return the element itself', () => {
            const mockItem = { label: 'Test' } as any;

            const result = provider.getTreeItem(mockItem);

            expect(result).toBe(mockItem);
        });
    });

    describe('getChildren', () => {
        it('should return group items when no element provided', async () => {
            const mockGroups = [
                { id: 'g1', name: 'Group 1', snapshotPaths: ['s1.json'], createdAt: '2024-01-01' }
            ];
            mockGroupingManager.getGroups.mockReturnValue(mockGroups);
            (SnapshotCreator as any).getSnapshotFiles.mockReturnValue(['s1.json']);

            const result = await provider.getChildren();

            expect(mockGroupingManager.organizeSnapshots).toHaveBeenCalled();
            expect(result).toHaveLength(1);
        });

        it('should return group children for group element', async () => {
            const mockGroup = {
                id: 'g1',
                name: 'Group 1',
                snapshotPaths: ['s1.json'],
                createdAt: '2024-01-01'
            };
            const mockElement = {
                itemType: 'group',
                data: mockGroup
            } as any;

            (SnapshotCreator as any).getSnapshotFiles.mockReturnValue(['s1.json']);
            (SnapshotCreator as any).loadSnapshot.mockResolvedValue({
                metadata: { description: 'Test Snapshot' }
            });

            const result = await provider.getChildren(mockElement);

            expect(result).toHaveLength(1);
        });

        it('should return empty array for snapshot element', async () => {
            const mockElement = {
                itemType: 'snapshot',
                data: {}
            } as any;

            const result = await provider.getChildren(mockElement);

            expect(result).toEqual([]);
        });
    });

    describe('getGroupChildren', () => {
        it('should load and return snapshot children', async () => {
            const mockGroup = {
                id: 'g1',
                name: 'Group 1',
                snapshotPaths: ['s1.json', 's2.json'],
                createdAt: '2024-01-01'
            };

            (SnapshotCreator as any).getSnapshotFiles.mockReturnValue(['s1.json', 's2.json']);
            (SnapshotCreator as any).loadSnapshot.mockResolvedValue({
                metadata: { description: 'Test Snapshot' }
            });

            const result = await (provider as any).getGroupChildren(mockGroup);

            expect(result).toHaveLength(2);
            expect(SnapshotCreator.loadSnapshot).toHaveBeenCalledTimes(2);
        });

        it('should skip snapshots that fail to load', async () => {
            const mockGroup = {
                id: 'g1',
                name: 'Group 1',
                snapshotPaths: ['s1.json', 's2.json'],
                createdAt: '2024-01-01'
            };

            (SnapshotCreator as any).getSnapshotFiles.mockReturnValue(['s1.json', 's2.json']);
            (SnapshotCreator as any).loadSnapshot
                .mockResolvedValueOnce({ metadata: { description: 'Test 1' } })
                .mockRejectedValueOnce(new Error('Load failed'));

            const result = await (provider as any).getGroupChildren(mockGroup);

            expect(result).toHaveLength(1);
        });

        it('should skip snapshots not in cache', async () => {
            const mockGroup = {
                id: 'g1',
                name: 'Group 1',
                snapshotPaths: ['s1.json', 's2.json'],
                createdAt: '2024-01-01'
            };

            (SnapshotCreator as any).getSnapshotFiles.mockReturnValue(['s1.json']); // Only s1 in cache

            const result = await (provider as any).getGroupChildren(mockGroup);

            expect(result).toHaveLength(0); // s2 skipped, s1 not loaded due to error
        });
    });

    describe('runTest', () => {
        beforeEach(() => {
            (vscode.window as any).withProgress = jest.fn().mockImplementation(async (options, callback) => {
                const mockProgress = { report: jest.fn() };
                return await callback(mockProgress);
            });
        });

        it('should run individual test successfully', async () => {
            const mockSnapshot = {
                metadata: {
                    sourceOrgId: 'org-123',
                    sourceOpportunityId: 'opp-123'
                },
                recreationPayload: {
                    sourceOpportunity: { Name: 'Test Opp' }
                }
            };
            const testData = { snapshot: mockSnapshot };
            const mockOrg = { alias: 'TestOrg', testOpportunityId: 'opp-123' };
            const mockResult = { success: true, errors: [] };

            (mockTestRunner.auth.useSourceOrgWithOpportunity as jest.Mock).mockResolvedValue(mockOrg as any);
            (mockTestRunner.runTest as jest.Mock).mockResolvedValue(mockResult as any);
            (mockReportView.showTestResult as jest.Mock).mockResolvedValue(undefined);

            await provider.runTest(testData);

            expect(mockTestRunner.auth.useSourceOrgWithOpportunity).toHaveBeenCalledWith(
                'org-123',
                'opp-123',
                'Test Opp'
            );
            expect(mockTestRunner.runTest).toHaveBeenCalledWith(mockSnapshot, mockOrg, expect.any(Function));
            expect(mockReportView.showTestResult).toHaveBeenCalledWith(mockResult);
        });

        it('should return early if no target org selected', async () => {
            const mockSnapshot = {
                metadata: {
                    sourceOrgId: 'org-123',
                    sourceOpportunityId: 'opp-123'
                },
                recreationPayload: {
                    sourceOpportunity: { Name: 'Test Opp' }
                }
            };
            const testData = { snapshot: mockSnapshot };

            (mockTestRunner.auth.useSourceOrgWithOpportunity as jest.Mock).mockResolvedValue(undefined);

            await provider.runTest(testData);

            expect(mockTestRunner.runTest).not.toHaveBeenCalled();
        });

        it('should show warning for failed test', async () => {
            const mockSnapshot = {
                metadata: {
                    sourceOrgId: 'org-123'
                },
                recreationPayload: {}
            };
            const testData = { snapshot: mockSnapshot };
            const mockOrg = { alias: 'TestOrg' };
            const mockResult = { success: false, errors: ['Pricing mismatch'] };

            (vscode.window as any).showWarningMessage = jest.fn();
            (mockTestRunner.auth.useSourceOrgWithOpportunity as jest.Mock).mockResolvedValue(mockOrg as any);
            (mockTestRunner.runTest as jest.Mock).mockResolvedValue(mockResult as any);
            (mockReportView.showTestResult as jest.Mock).mockResolvedValue(undefined);

            await provider.runTest(testData);

            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('Test FAILED ❌ - Pricing mismatch');
        });

        it('should handle report view errors', async () => {
            const mockSnapshot = {
                metadata: {
                    sourceOrgId: 'org-123'
                },
                recreationPayload: {}
            };
            const testData = { snapshot: mockSnapshot };
            const mockOrg = { alias: 'TestOrg' };
            const mockResult = { success: true };
            const reportError = new Error('Report failed');

            (vscode.window as any).showErrorMessage = jest.fn();
            (mockTestRunner.auth.useSourceOrgWithOpportunity as jest.Mock).mockResolvedValue(mockOrg as any);
            (mockTestRunner.runTest as jest.Mock).mockResolvedValue(mockResult as any);
            (mockReportView.showTestResult as jest.Mock).mockRejectedValue(reportError);

            await expect(provider.runTest(testData)).rejects.toThrow('Report failed');
            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Report generation failed: Report failed');
        });
    });

    describe('runBatchTests - Complete Scenarios', () => {
        beforeEach(() => {
            jest.spyOn(licenseService, 'getLicenseState').mockResolvedValue({
                isPro: true,
                tier: 'pro',
                statusMessage: 'Pro access enabled'
            });

            (vscode.window as any).withProgress = jest.fn().mockImplementation(async (options, callback) => {
                const mockProgress = { report: jest.fn() };
                return await callback(mockProgress);
            });
            (vscode.window as any).showInformationMessage = jest.fn();
            (vscode.window as any).showWarningMessage = jest.fn();
        });

        it('should handle successful batch test with all passing', async () => {
            const mockGroup = {
                id: 'g1',
                name: 'Test Group',
                snapshotPaths: ['s1.json', 's2.json'],
                createdAt: '2024-01-01'
            };

            (SnapshotCreator as any).getSnapshotFiles.mockReturnValue(['s1.json', 's2.json']);
            (SnapshotCreator as any).loadSnapshot.mockResolvedValue({
                metadata: { description: 'Test', sourceOrgId: 'org-123', sourceOpportunityId: 'opp-123' }
            });

            const mockOrg = { alias: 'TestOrg', testOpportunityId: 'opp-123' };
            (mockTestRunner.auth.useSourceOrgForBatchTest as jest.Mock).mockResolvedValue(mockOrg);
            (mockTestRunner.runTest as jest.Mock).mockResolvedValue({ success: true });
            (mockReportView.showBatchTestResults as jest.Mock).mockResolvedValue(undefined);

            await provider.runBatchTests(mockGroup);

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('✅ Batch Test Complete: 2 passed, 0 failed');
            expect(mockReportView.showBatchTestResults).toHaveBeenCalled();
        });

        it('should handle batch test with some failures', async () => {
            const mockGroup = {
                id: 'g1',
                name: 'Test Group',
                snapshotPaths: ['s1.json', 's2.json'],
                createdAt: '2024-01-01'
            };

            (SnapshotCreator as any).getSnapshotFiles.mockReturnValue(['s1.json', 's2.json']);
            (SnapshotCreator as any).loadSnapshot.mockResolvedValue({
                metadata: { description: 'Test', sourceOrgId: 'org-123', sourceOpportunityId: 'opp-123' }
            });

            const mockOrg = { alias: 'TestOrg', testOpportunityId: 'opp-123' };
            (mockTestRunner.auth.useSourceOrgForBatchTest as jest.Mock).mockResolvedValue(mockOrg);
            (mockTestRunner.runTest as jest.Mock)
                .mockResolvedValueOnce({ success: true })
                .mockResolvedValueOnce({ success: false, errors: ['Pricing mismatch'] });
            (mockReportView.showBatchTestResults as jest.Mock).mockResolvedValue(undefined);

            await provider.runBatchTests(mockGroup);

            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('⚠️  Batch Test Complete: 1 passed, 1 failed');
        });

        it('should handle batch test when source org not available', async () => {
            const mockGroup = {
                id: 'g1',
                name: 'Test Group',
                snapshotPaths: ['s1.json'],
                createdAt: '2024-01-01'
            };

            (SnapshotCreator as any).getSnapshotFiles.mockReturnValue(['s1.json']);
            (SnapshotCreator as any).loadSnapshot.mockResolvedValue({
                metadata: { description: 'Test', sourceOrgId: 'org-123', sourceOpportunityId: 'opp-123' }
            });

            (mockTestRunner.auth.useSourceOrgForBatchTest as jest.Mock).mockResolvedValue(null);
            (mockReportView.showBatchTestResults as jest.Mock).mockResolvedValue(undefined);

            await provider.runBatchTests(mockGroup);

            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('⚠️  Batch Test Complete: 0 passed, 1 failed');
        });

        it('should handle batch test with runtime errors', async () => {
            const mockGroup = {
                id: 'g1',
                name: 'Test Group',
                snapshotPaths: ['s1.json'],
                createdAt: '2024-01-01'
            };

            (SnapshotCreator as any).getSnapshotFiles.mockReturnValue(['s1.json']);
            (SnapshotCreator as any).loadSnapshot.mockResolvedValue({
                metadata: { description: 'Test', sourceOrgId: 'org-123' }
            });

            const mockOrg = { alias: 'TestOrg' };
            (mockTestRunner.auth.useSourceOrgForBatchTest as jest.Mock).mockResolvedValue(mockOrg);
            (mockTestRunner.runTest as jest.Mock).mockRejectedValue(new Error('Test execution failed'));
            (mockReportView.showBatchTestResults as jest.Mock).mockResolvedValue(undefined);

            await provider.runBatchTests(mockGroup);

            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('⚠️  Batch Test Complete: 0 passed, 1 failed');
        });

        it('should handle batch test with no valid snapshots after loading', async () => {
            const mockGroup = {
                id: 'g1',
                name: 'Test Group',
                snapshotPaths: ['s1.json'],
                createdAt: '2024-01-01'
            };

            (SnapshotCreator as any).getSnapshotFiles.mockReturnValue(['s1.json']);
            (SnapshotCreator as any).loadSnapshot.mockRejectedValue(new Error('Load failed'));

            await provider.runBatchTests(mockGroup);

            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('No valid snapshots found in group Test Group');
        });
    });
});
