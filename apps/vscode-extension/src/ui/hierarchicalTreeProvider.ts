import * as vscode from 'vscode';
import * as path from 'path';
import { SnapshotCreator } from '../snapshot/creator';
import { TestRunner } from '../test/runner';
import { ReportView } from './reportView';
import { GroupingManager, SnapshotGroup } from './groupingModels';
import { getLicenseState } from '../services/licenseService';

export class HierarchicalTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly itemType: 'group' | 'snapshot',
        public readonly data?: any
    ) {
        super(label, collapsibleState);
        this.contextValue = itemType;
        
        switch (itemType) {
            case 'group':
                this.iconPath = new vscode.ThemeIcon('folder-opened');
                this.description = `${data?.snapshotPaths?.length || 0} tests`;
                this.tooltip = `Group: ${label}${data?.description ? ` - ${data.description}` : ''}`;
                break;
            case 'snapshot':
                this.iconPath = new vscode.ThemeIcon('file-text');
                this.description = this.extractSnapshotInfo(data?.path);
                this.tooltip = this.generateSnapshotTooltip(data);
                // Removed automatic command - tests only run when clicking the play icon
                break;
        }
    }

    private extractSnapshotInfo(filePath: string): string {
        if (!filePath) return '';
        
        const filename = path.basename(filePath, '.json');
        const parts = filename.split('_');
        
        if (parts.length >= 3) {
            // Format: snapshot_orgAlias_quoteId_description
            return `${parts[1]} • ${parts[2]}`;
        }
        
        return filename;
    }

    private generateSnapshotTooltip(data: any): string {
        if (!data?.path) {
            return `Snapshot: ${path.basename(data?.path)}`;
        }

        const snapshot = data.snapshot;
        if (!snapshot?.metadata) {
            return `Snapshot: ${path.basename(data.path)}`;
        }

        const metadata = snapshot.metadata;
        const fileName = path.basename(data.path, '.json');
        const displayName = metadata.description || fileName;
        
        let tooltip = `Snapshot: ${displayName}\n`;
        tooltip += `Source: ${metadata.sourceOrgAlias || metadata.sourceOrgUsername}\n`;
        tooltip += `Quote ID: ${metadata.sourceQuoteId}\n`;
        tooltip += `Created: ${new Date(metadata.createdAt).toLocaleDateString()}`;
        
        if (metadata.lastRefreshedAt) {
            tooltip += `\nLast Refreshed: ${new Date(metadata.lastRefreshedAt).toLocaleDateString()}`;
        }
        
        return tooltip;
    }
}

export class HierarchicalTreeProvider implements vscode.TreeDataProvider<HierarchicalTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<HierarchicalTreeItem | undefined | null | void> = new vscode.EventEmitter<HierarchicalTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<HierarchicalTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    // Cache for snapshot files to avoid excessive file system calls
    private snapshotFilesCache: string[] = [];
    private lastCacheUpdate: number = 0;
    private readonly CACHE_DURATION = 5000; // 5 seconds cache

    constructor(
        private groupingManager: GroupingManager,
        private snapshotCreator: SnapshotCreator,
        private testRunner: TestRunner,
        private reportView: ReportView
    ) {}

    refresh(): void {
        // Clear cache on explicit refresh
        this.snapshotFilesCache = [];
        this.lastCacheUpdate = 0;
        this._onDidChangeTreeData.fire();
    }

    private getCachedSnapshotFiles(): string[] {
        const now = Date.now();
        
        // Use cache if it's still fresh
        if (this.snapshotFilesCache.length > 0 && (now - this.lastCacheUpdate) < this.CACHE_DURATION) {
            console.log(`[DEBUG] HierarchicalTreeProvider: Using cached snapshot files (${this.snapshotFilesCache.length} files)`);
            return this.snapshotFilesCache;
        }
        
        // Refresh cache
        console.log(`[DEBUG] HierarchicalTreeProvider: Refreshing snapshot files cache`);
        this.snapshotFilesCache = SnapshotCreator.getSnapshotFiles();
        this.lastCacheUpdate = now;
        
        console.log(`[DEBUG] HierarchicalTreeProvider: Cached ${this.snapshotFilesCache.length} snapshot files`);
        return this.snapshotFilesCache;
    }

    getTreeItem(element: HierarchicalTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: HierarchicalTreeItem): Promise<HierarchicalTreeItem[]> {
        if (!element) {
            // Root level - return groups directly
            return this.getGroupItems();
        }

        switch (element.itemType) {
            case 'group':
                return this.getGroupChildren(element.data);
            default:
                return [];
        }
    }

    private async getGroupItems(): Promise<HierarchicalTreeItem[]> {
        // First, organize all discovered snapshots using cached results
        const allSnapshots = this.getCachedSnapshotFiles();
        console.log(`[DEBUG] HierarchicalTreeProvider: Found ${allSnapshots.length} snapshots from cache`);
        
        await this.groupingManager.organizeSnapshots(allSnapshots);

        const groups = this.groupingManager.getGroups();
        console.log(`[DEBUG] HierarchicalTreeProvider: Groups:`, groups.map(g => ({
            name: g.name,
            snapshotCount: g.snapshotPaths.length
        })));
        
        return groups.map(group => {
            const collapsibleState = group.snapshotPaths.length > 0 ? 
                vscode.TreeItemCollapsibleState.Expanded : 
                vscode.TreeItemCollapsibleState.None;

            return new HierarchicalTreeItem(
                group.name,
                collapsibleState,
                'group',
                group
            );
        });
    }


    private async getGroupChildren(group: SnapshotGroup): Promise<HierarchicalTreeItem[]> {
        const children: HierarchicalTreeItem[] = [];
        
        // Add individual snapshots in group (show descriptions instead of filenames) 
        const allSnapshots = this.getCachedSnapshotFiles();
        for (const snapshotPath of group.snapshotPaths) {
            if (allSnapshots.includes(snapshotPath)) {
                try {
                    const snapshot = await SnapshotCreator.loadSnapshot(snapshotPath);
                    // Show description instead of filename for grouped snapshots
                    const displayName = snapshot.metadata.description || path.basename(snapshotPath, '.json');
                    children.push(new HierarchicalTreeItem(
                        displayName,
                        vscode.TreeItemCollapsibleState.None,
                        'snapshot',
                        {
                            path: snapshotPath,
                            snapshot: snapshot
                        }
                    ));
                } catch (error) {
                    console.warn(`Failed to load snapshot: ${snapshotPath}`, error);
                }
            }
        }

        return children;
    }

    /**
     * Run batch tests for a group
     * Uses source org for each snapshot automatically (no opportunity selection)
     */
    async runBatchTests(groupData: SnapshotGroup): Promise<void> {
        // Check license state before running batch tests (Pro feature)
        const licenseState = await getLicenseState();
        if (!licenseState.isPro) {
            const action = await vscode.window.showInformationMessage(
                licenseState.statusMessage + ' Batch Testing is a Pro feature.',
                'Activate License',
                'Learn More'
            );
            
            if (action === 'Activate License') {
                await vscode.commands.executeCommand('revCloudBlueprint.toggleUserStatus');
            } else if (action === 'Learn More') {
                vscode.env.openExternal(vscode.Uri.parse('https://sfapp.forceweaver.com/pricing'));
            }
            return;
        }

        const { name: groupName, snapshotPaths } = groupData;
        
        if (!snapshotPaths || snapshotPaths.length === 0) {
            vscode.window.showWarningMessage(`No tests found in group ${groupName}`);
            return;
        }

        // Load all snapshots (use cache to avoid repeated file system calls)
        const allSnapshotPaths = this.getCachedSnapshotFiles();
        const validPaths = snapshotPaths.filter((path: string) => allSnapshotPaths.includes(path));
        const testSnapshotsPromises = validPaths.map(async (path: string) => {
            try {
                return {
                    filePath: path,
                    snapshot: await SnapshotCreator.loadSnapshot(path)
                };
            } catch (error) {
                console.warn(`Failed to load snapshot: ${path}`, error);
                return null;
            }
        });
        
        const testSnapshotsResults = await Promise.all(testSnapshotsPromises);
        const testSnapshots = testSnapshotsResults.filter(Boolean);

        if (testSnapshots.length === 0) {
            vscode.window.showWarningMessage(`No valid snapshots found in group ${groupName}`);
            return;
        }

        // Run batch tests with progress (automated - no user prompts)
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Running ${testSnapshots.length} tests in ${groupName}...`,
            cancellable: false
        }, async (progress) => {
            console.log(`[DEBUG] Starting batch test for group: ${groupName} with ${testSnapshots.length} snapshots`);
            
            // Setup continuous progress animation
            let progressValue = 0;
            let currentMessage = 'Initializing batch test - no user input required...';
            
            const progressInterval = setInterval(() => {
                progressValue = (progressValue + 3) % 100;
                progress.report({ 
                    increment: progressValue === 0 ? -99 : 3,
                    message: currentMessage 
                });
            }, 150); // Update every 150ms for smooth continuous animation
            
            const results = [];
            let completed = 0;
            const totalTests = testSnapshots.length;

            try {

            for (const snapshotFile of testSnapshots) {
                const snapshot = snapshotFile!.snapshot;
                const testName = snapshot.metadata.description || path.basename(snapshotFile!.filePath, '.json');
                
                // Update progress message for continuous animation
                currentMessage = `Running test ${completed + 1}/${totalTests}: ${testName}`;

                try {
                    // For batch tests, automatically use source org with same opportunity (no user prompts)
                    const targetOrg = await this.testRunner.auth.useSourceOrgForBatchTest(
                        snapshot.metadata.sourceOrgId,
                        snapshot.metadata.sourceOpportunityId || undefined
                    );
                    
                    if (!targetOrg) {
                        console.error(`[ERROR] Batch test failed: Source org not available for snapshot ${snapshotFile!.filePath}`);
                        results.push({
                            snapshotName: snapshot.metadata.description || path.basename(snapshotFile!.filePath, '.json'),
                            result: {
                                success: false,
                                errors: [`Source org (${snapshot.metadata.sourceOrgId}) not available for automated batch test`]
                            }
                        });
                        completed++;
                        
                        // Update progress message after skipping test
                        currentMessage = `Completed test ${completed}/${totalTests}: ${testName} - ⚠️ Skipped (org unavailable)`;
                        continue;
                    }

                    console.log(`[DEBUG] Batch test using org: ${targetOrg.alias || targetOrg.username} with opportunity: ${targetOrg.testOpportunityId || 'none'}`);

                    const result = await this.testRunner.runTest(snapshot, targetOrg);
                    results.push({
                        snapshotName: snapshot.metadata.description || path.basename(snapshotFile!.filePath, '.json'),
                        result: result
                    });
                    completed++;
                    
                    // Update progress message after completing test
                    currentMessage = `Completed test ${completed}/${totalTests}: ${testName} - ${result.success ? '✅ Passed' : '❌ Failed'}`;
                } catch (error: any) {
                    results.push({
                        snapshotName: snapshot.metadata.description || path.basename(snapshotFile!.filePath, '.json'),
                        result: {
                            success: false,
                            errors: [error.message]
                        }
                    });
                    completed++;
                    
                    // Update progress message after error
                    currentMessage = `Completed test ${completed}/${totalTests}: ${testName} - ❌ Error: ${error.message}`;
                }
            }

            // Final progress message update
            currentMessage = `All ${totalTests} tests completed - Processing results...`;

            // Show batch results
            const successCount = results.filter(r => r.result.success).length;
            const failCount = results.length - successCount;

            const statusMessage = `Batch Test Complete: ${successCount} passed, ${failCount} failed`;
            
            if (failCount === 0) {
                vscode.window.showInformationMessage(`✅ ${statusMessage}`);
            } else {
                vscode.window.showWarningMessage(`⚠️  ${statusMessage}`);
            }

            // Show detailed results in report view
            await this.reportView.showBatchTestResults({
                batchName: groupName,
                results: results,
                summary: {
                    total: results.length,
                    passed: successCount,
                    failed: failCount
                }
            });

            } finally {
                // Allow the final message to be shown for a moment
                setTimeout(() => {
                    clearInterval(progressInterval);
                }, 500); // Show final message for 500ms
            }
        });
    }

    /**
     * Run individual test (allows user to choose opportunity)
     */
    async runTest(testData: any): Promise<void> {
        const { snapshot } = testData;
        
        // For individual tests, allow user to choose between source opportunity or new opportunity
        const targetOrg = await this.testRunner.auth.useSourceOrgWithOpportunity(
            snapshot.metadata.sourceOrgId,
            snapshot.metadata.sourceOpportunityId,
            snapshot.recreationPayload.sourceOpportunity?.Name
        );
        if (!targetOrg) {
            return;
        }

        // Run test with progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Running pricing test...',
            cancellable: false
        }, async (progress) => {
            let currentProgress = 0;
            
            const progressCallback = (increment: number, message: string) => {
                const progressIncrement = increment - currentProgress;
                progress.report({ increment: progressIncrement, message });
                currentProgress = increment;
            };

            progressCallback(5, 'Preparing test...');

            const result = await this.testRunner.runTest(snapshot, targetOrg, progressCallback);
            
            progressCallback(100, 'Generating report...');

            // Show results
            try {
                await this.reportView.showTestResult(result);
                console.log('[DEBUG] ✅ Report view display completed successfully');
                
                // Only show notification popup for failed tests - successful tests show the report directly
                if (!result.success) {
                    const statusMessage = `Test FAILED ❌ - ${result.errors?.join(', ') || 'Pricing discrepancies found'}`;
                    vscode.window.showWarningMessage(statusMessage);
                }
                
            } catch (reportError: any) {
                console.error('[ERROR] ❌ Report view failed:', reportError);
                console.error(`[ERROR] 📋 Report error details: ${reportError.message}`);
                console.error(`[ERROR] 📋 Report error stack: ${reportError.stack}`);
                
                // Show user-friendly error
                vscode.window.showErrorMessage(`Report generation failed: ${reportError.message}`);
                throw reportError;
            }
        });
    }
}
