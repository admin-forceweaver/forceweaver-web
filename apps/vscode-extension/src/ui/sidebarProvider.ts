import * as vscode from 'vscode';
import * as path from 'path';
import { SnapshotCreator, PricingSnapshot } from '../snapshot/creator';
import { TestRunner, TestResult } from '../test/runner';
import { ReportView } from './reportView';

export class SnapshotItem extends vscode.TreeItem {
    constructor(
        public readonly filePath: string,
        public readonly snapshot: PricingSnapshot,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        const fileName = path.basename(filePath, '.json');
        const displayName = snapshot.metadata.description || fileName;
        
        super(displayName, collapsibleState);
        
        this.tooltip = this.generateTooltip();
        this.description = this.generateDescription();
        this.contextValue = 'pricingSnapshot';
        this.iconPath = new vscode.ThemeIcon('file-code');
        
        // Make items clickable to open the file
        this.command = {
            command: 'vscode.open',
            title: 'Open Snapshot',
            arguments: [vscode.Uri.file(filePath)]
        };
    }

    private generateTooltip(): string {
        const metadata = this.snapshot.metadata;
        return `Source: ${metadata.sourceOrgAlias || metadata.sourceOrgUsername}
Quote ID: ${metadata.sourceQuoteId}
Created: ${new Date(metadata.createdAt).toLocaleDateString()}
Line Items: ${this.snapshot.recreationPayload.lineItems.length}
Grand Total: $${this.snapshot.expectedResults.quoteFields.GrandTotal.toFixed(2)}`;
    }

    private generateDescription(): string {
        const orgAlias = this.snapshot.metadata.sourceOrgAlias || this.snapshot.metadata.sourceOrgUsername;
        const lineItemCount = this.snapshot.recreationPayload.lineItems.length;
        return `${orgAlias} • ${lineItemCount} items • $${this.snapshot.expectedResults.quoteFields.GrandTotal.toFixed(2)}`;
    }
}

export class SidebarProvider implements vscode.TreeDataProvider<SnapshotItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SnapshotItem | undefined | null | void> = new vscode.EventEmitter<SnapshotItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SnapshotItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private snapshotItems: SnapshotItem[] = [];

    constructor(
        private workspaceRoot: vscode.Uri,
        private snapshotCreator: SnapshotCreator,
        private testRunner: TestRunner,
        private reportView: ReportView
    ) {
        this.loadSnapshots().catch(error => console.error('Failed to load snapshots:', error));
    }

    refresh(): void {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Refreshing test snapshots...',
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 50, message: 'Scanning snapshot files...' });
            this.loadSnapshots().catch(error => console.error('Failed to load snapshots:', error));
            progress.report({ increment: 100, message: 'Snapshots refreshed' });
        });
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SnapshotItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SnapshotItem): Thenable<SnapshotItem[]> {
        const logger = (global as any).revCloudBlueprintLogger;
        
        if (!element) {
            // Return root items (snapshot files)
            logger?.appendLine(`[DEBUG] getChildren() called - returning ${this.snapshotItems.length} root items`);
            
            // Check workspace state
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                logger?.appendLine('[WARNING] getChildren() - No workspace folders available');
                // Try to reload snapshots in case workspace became available
                this.loadSnapshots().catch(error => console.error('Failed to load snapshots:', error));
            }
            
            return Promise.resolve(this.snapshotItems);
        }
        
        // No child items for now (flat structure)
        return Promise.resolve([]);
    }

    /**
     * Load all snapshot files from the workspace
     */
    private async loadSnapshots(): Promise<void> {
        const logger = (global as any).revCloudBlueprintLogger;
        try {
            console.log('[DEBUG] Loading snapshot files...');
            logger?.appendLine('[DEBUG] SidebarProvider.loadSnapshots() called');
            
            // Debug workspace state
            const workspaceFolders = vscode.workspace.workspaceFolders;
            logger?.appendLine(`[DEBUG] Workspace folders in loadSnapshots: ${workspaceFolders?.length || 0}`);
            
            if (!workspaceFolders || workspaceFolders.length === 0) {
                logger?.appendLine('[WARNING] No workspace folders available for snapshot loading');
                this.snapshotItems = [];
                return;
            }
            
            const snapshotFiles = SnapshotCreator.getSnapshotFiles();
            logger?.appendLine(`[DEBUG] SnapshotCreator.getSnapshotFiles() returned ${snapshotFiles.length} files`);
            
            this.snapshotItems = [];

            console.log(`[DEBUG] Found ${snapshotFiles.length} snapshot files`);

            if (snapshotFiles.length === 0) {
                logger?.appendLine('[DEBUG] No snapshot files found - checking directory existence and permissions');
                
                // Additional debugging for directory issues
                const config = vscode.workspace.getConfiguration('revCloudBlueprint');
                const snapshotDir = config.get<string>('pricing.snapshotDirectory', 'revcloud_blueprint/pricing/snapshots');
                const fullPath = require('path').resolve(workspaceFolders[0].uri.fsPath, snapshotDir);
                
                logger?.appendLine(`[DEBUG] Expected snapshot directory: ${fullPath}`);
                logger?.appendLine(`[DEBUG] Directory exists: ${require('fs').existsSync(fullPath)}`);
                
                if (require('fs').existsSync(fullPath)) {
                    try {
                        const allFiles = require('fs').readdirSync(fullPath);
                        logger?.appendLine(`[DEBUG] All files in directory: ${allFiles.join(', ')}`);
                        const jsonFiles = allFiles.filter((f: string) => f.endsWith('.json'));
                        logger?.appendLine(`[DEBUG] JSON files in directory: ${jsonFiles.join(', ')}`);
                        const snapshotJsonFiles = jsonFiles.filter((f: string) => f.startsWith('snapshot_'));
                        logger?.appendLine(`[DEBUG] Snapshot JSON files: ${snapshotJsonFiles.join(', ')}`);
                    } catch (dirError: any) {
                        logger?.appendLine(`[ERROR] Failed to read directory contents: ${dirError.message}`);
                    }
                }
            }

            // Load snapshots in parallel for better performance
            const snapshotPromises = snapshotFiles.map(async (filePath, index) => {
                try {
                    console.log(`[DEBUG] Loading snapshot ${index + 1}/${snapshotFiles.length}: ${filePath}`);
                    logger?.appendLine(`[DEBUG] Loading snapshot file: ${filePath}`);
                    const snapshot = await SnapshotCreator.loadSnapshot(filePath);
                    const item = new SnapshotItem(filePath, snapshot, vscode.TreeItemCollapsibleState.None);
                    logger?.appendLine(`[DEBUG] Successfully loaded snapshot: ${snapshot.metadata.description || 'unnamed'}`);
                    return item;
                } catch (error: any) {
                    console.warn(`[WARN] Failed to load snapshot file ${filePath}:`, error);
                    logger?.appendLine(`[ERROR] Failed to load snapshot ${filePath}: ${error.message}`);
                    return null;
                }
            });
            
            const snapshotResults = await Promise.all(snapshotPromises);
            this.snapshotItems = snapshotResults.filter(item => item !== null) as SnapshotItem[];

            console.log(`[DEBUG] Successfully loaded ${this.snapshotItems.length} snapshots`);
            logger?.appendLine(`[DEBUG] Total snapshots loaded into tree: ${this.snapshotItems.length}`);
        } catch (error: any) {
            console.error('[ERROR] Error loading snapshots:', error);
            logger?.appendLine(`[ERROR] Critical error in loadSnapshots: ${error.message}`);
            logger?.appendLine(`[ERROR] Stack trace: ${error.stack}`);
            vscode.window.showErrorMessage(`Failed to load snapshots from workspace: ${error.message}`);
        }
    }

    /**
     * Create a new pricing snapshot
     */
    async createSnapshot(): Promise<void> {
        console.log(`[DEBUG] 🚀🚀🚀 SIDEBAR: createSnapshot called from sidebar + button`);
        try {
            console.log(`[DEBUG] 🚀 SIDEBAR: About to call this.snapshotCreator.createSnapshot()`);
            await this.snapshotCreator.createSnapshot();
            console.log(`[DEBUG] 🚀 SIDEBAR: snapshotCreator.createSnapshot() completed successfully`);
            console.log(`[DEBUG] 🚀 SIDEBAR: About to refresh sidebar`);
            this.refresh();
            console.log(`[DEBUG] 🚀 SIDEBAR: Sidebar refresh completed`);
        } catch (error: any) {
            console.error(`[ERROR] 🚀 SIDEBAR: createSnapshot failed:`, error);
            console.error('Error creating snapshot:', error);
            vscode.window.showErrorMessage(`Failed to create snapshot: ${error.message}`);
        }
    }

    /**
     * Run test for a specific snapshot
     */
    async runTest(snapshotItem: SnapshotItem): Promise<void> {
        try {
            // Step 1: Load snapshot to get source org information
            const snapshot = await SnapshotCreator.loadSnapshot(snapshotItem.filePath);
            
            // Step 2: Use source org as target org (no cross-org testing)
            const targetOrg = await (this.testRunner as any).auth.useSourceOrgWithOpportunity(
                snapshot.metadata.sourceOrgId,
                snapshot.metadata.sourceOpportunityId,
                snapshot.recreationPayload.sourceOpportunity?.Name
            );
            
            if (!targetOrg) {
                return; // User cancelled
            }

            // Step 3: Run the actual test with selected target org
            try {
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

                const result = await this.testRunner.runTest(snapshotItem.snapshot, targetOrg, progressCallback);
                
                progressCallback(100, 'Generating report...');

                // Show the results in the report view('[DEBUG] 📋 Calling reportView.showTestResult...');
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
                
                progress.report({ increment: 100, message: 'Test completed!' });
                });
                
                console.log('[DEBUG] ✅ withProgress block completed successfully');
                
            } catch (error: any) {
                console.error('[ERROR] 💥 Top-level test execution failed:', error);
                console.error(`[ERROR] 📋 Error type: ${error.constructor.name}`);
                console.error(`[ERROR] 📋 Error message: ${error.message}`);
                console.error(`[ERROR] 📋 Error stack: ${error.stack}`);
                
                // Show detailed error to user
                const errorMessage = `Test execution failed: ${error.message}`;
                console.log(`[DEBUG] 🚨 Showing error message to user: ${errorMessage}`);
                vscode.window.showErrorMessage(errorMessage);
                
                throw error; // Re-throw to ensure calling code knows it failed
            }
        } catch (outerError: any) {
            console.error('[ERROR] 💥💥 Outer-level test execution failed:', outerError);
            console.error(`[ERROR] 📋 Outer error type: ${outerError.constructor.name}`);
            console.error(`[ERROR] 📋 Outer error message: ${outerError.message}`);
            console.error(`[ERROR] 📋 Outer error stack: ${outerError.stack}`);
            
            vscode.window.showErrorMessage(`Critical test failure: ${outerError.message}`);
        }
    }

    /**
     * Run tests for multiple snapshots
     */
    async runBatchTests(): Promise<void> {
        if (this.snapshotItems.length === 0) {
            vscode.window.showInformationMessage('No snapshots available for testing.');
            return;
        }

        // Select target org
        const targetOrg = await this.testRunner['auth'].selectOrg('Select Target Org for Batch Testing');
        if (!targetOrg) {
            return;
        }

        // Select snapshots to test
        const selectedSnapshots = await this.selectSnapshotsForBatchTest();
        if (!selectedSnapshots || selectedSnapshots.length === 0) {
            return;
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Running ${selectedSnapshots.length} pricing tests...`,
                cancellable: false
            }, async (progress) => {
                const snapshots = selectedSnapshots.map(item => item.snapshot);
                const results = await this.testRunner.runBatchTests(snapshots, targetOrg);
                
                progress.report({ increment: 90, message: 'Generating batch report...' });

                // Show batch results
                await this.reportView.showBatchTestResults(results);

                progress.report({ increment: 100, message: 'Batch testing completed!' });

                // Show summary message
                const passedCount = results.filter(r => r.success).length;
                const totalCount = results.length;
                const successRate = ((passedCount / totalCount) * 100).toFixed(1);
                
                const summaryMessage = `Batch test completed: ${passedCount}/${totalCount} passed (${successRate}%)`;
                
                if (passedCount === totalCount) {
                    vscode.window.showInformationMessage(`${summaryMessage} ✅`);
                } else {
                    vscode.window.showWarningMessage(`${summaryMessage} ⚠️`);
                }
            });

        } catch (error: any) {
            console.error('Error running batch tests:', error);
            vscode.window.showErrorMessage(`Batch test failed: ${error.message}`);
        }
    }

    /**
     * Select snapshots for batch testing
     */
    private async selectSnapshotsForBatchTest(): Promise<SnapshotItem[] | undefined> {
        interface SnapshotPickItem extends vscode.QuickPickItem {
            item: SnapshotItem;
        }

        const items: SnapshotPickItem[] = this.snapshotItems.map(item => ({
            label: item.label as string,
            description: typeof item.description === 'string' ? item.description : undefined,
            detail: typeof item.tooltip === 'string' ? item.tooltip : undefined,
            picked: true, // Default to all selected
            item: item
        }));

        const selected = await vscode.window.showQuickPick(items, {
            canPickMany: true,
            placeHolder: 'Select snapshots to test',
            title: 'Batch Test Selection'
        });

        return selected?.map(s => s.item);
    }

    /**
     * View snapshot details in a read-only editor
     */
    async viewSnapshotDetails(snapshotItem: SnapshotItem): Promise<void> {
        try {
            const doc = await vscode.workspace.openTextDocument(snapshotItem.filePath);
            await vscode.window.showTextDocument(doc, {
                viewColumn: vscode.ViewColumn.One,
                preview: false
            });
        } catch (error: any) {
            console.error('Error viewing snapshot details:', error);
            vscode.window.showErrorMessage(`Failed to open snapshot: ${error.message}`);
        }
    }

    /**
     * Delete a snapshot file
     */
    async deleteSnapshot(snapshotItem: SnapshotItem): Promise<void> {
        try {
            await SnapshotCreator.deleteSnapshot(snapshotItem.filePath);
            this.refresh();
        } catch (error: any) {
            console.error('Error deleting snapshot:', error);
            vscode.window.showErrorMessage(`Failed to delete snapshot: ${error.message}`);
        }
    }

    /**
     * Show welcome message when no snapshots exist
     */
    getWelcomeContent(): string {
        return `
# Welcome to Pricing Test Framework

No pricing snapshots found in your workspace.

## Getting Started

1. **Create a Snapshot**: Click the ➕ button to create your first pricing snapshot from a quote in your source org
2. **Run Tests**: Use snapshots to test pricing logic against target orgs
3. **View Results**: Get detailed comparison reports showing pricing differences

## Prerequisites

- Salesforce CLI installed and configured
- Authenticated orgs available via \`sfdx force:org:list\`
- Revenue Cloud enabled in your orgs

Click the ➕ button above to create your first snapshot!
        `;
    }

    /**
     * Validate schema for debugging purposes
     */
    async validateSchema(): Promise<void> {
        try {
            // Access auth through snapshotCreator (which has private auth property)
            const sourceOrg = await (this.snapshotCreator as any).auth.selectOrg('Select Org to Validate Schema');
            if (!sourceOrg) {
                return;
            }

            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Validating schema in ${sourceOrg.alias || sourceOrg.username}...`,
                cancellable: false
            }, async (progress) => {
                try {
                    progress.report({ message: 'Testing Quote object...' });
                    
                    // Access API through snapshotCreator (which has private api property)
                    const api = (this.snapshotCreator as any).api;
                    
                    // Test Quote object
                    await api.query(sourceOrg.username, 'SELECT Id FROM Quote LIMIT 1');
                    console.log('[DEBUG] ✅ Quote object found');

                    progress.report({ message: 'Testing Quote Line objects...' });
                    
                    // Test different quote line object names
                    const quoteLineObjects = ['QuoteLineItem', 'QuoteLine'];
                    let foundQuoteLineObject = null;
                    
                    for (const obj of quoteLineObjects) {
                        try {
                            await api.query(sourceOrg.username, `SELECT Id FROM ${obj} LIMIT 1`);
                            foundQuoteLineObject = obj;
                            console.log(`[DEBUG] ✅ Found quote line object: ${obj}`);
                            break;
                        } catch (error: any) {
                            console.log(`[DEBUG] ❌ ${obj} not found:`, error.message);
                        }
                    }

                    progress.report({ message: 'Testing Product external ID fields...' });
                    
                    // Test Product external ID fields
                    const config = vscode.workspace.getConfiguration('revCloudBlueprint');
                    const configuredField = config.get<string>('pricing.productExternalIdField', 'Product_SKU__c');
                    const testFields = [configuredField, 'ProductCode', 'Product_SKU__c', 'External_Id__c', 'SKU__c'];
                    const workingFields: string[] = [];
                    
                    for (const field of testFields) {
                        try {
                            await api.query(sourceOrg.username, `SELECT ${field} FROM Product2 WHERE ${field} != null LIMIT 1`);
                            workingFields.push(field);
                            console.log(`[DEBUG] ✅ Product field ${field} has data`);
                        } catch (error: any) {
                            console.log(`[DEBUG] ❌ Product field ${field} failed:`, error.message);
                        }
                    }

                    progress.report({ message: 'Schema validation complete' });

                    // Show results
                    const results = [
                        '🔍 **Schema Validation Results**',
                        '',
                        `**Org**: ${sourceOrg.alias || sourceOrg.username} (${sourceOrg.username})`,
                        '',
                        '**Quote Objects:**',
                        '✅ Quote object found',
                        foundQuoteLineObject ? `✅ Quote Line object: ${foundQuoteLineObject}` : '❌ No quote line object found',
                        '',
                        '**Product External ID Fields:**',
                        workingFields.length > 0 ? 
                            workingFields.map(field => `✅ ${field} (has data)`).join('\n') :
                            '❌ No working external ID fields found',
                        '',
                        '**Recommendations:**',
                        foundQuoteLineObject ? 
                            `✅ Revcloud Blueprint will use: ${foundQuoteLineObject}` :
                            '⚠️  You may encounter quote line errors. Check SCHEMA_DISCOVERY.md for help.',
                        workingFields.length > 0 ?
                            `✅ Recommended external ID field: ${workingFields[0]}` :
                            '⚠️  Consider using ProductCode as external ID field.',
                        '',
                        'See SCHEMA_DISCOVERY.md for manual SF CLI commands.'
                    ].join('\n');

                    const panel = vscode.window.createWebviewPanel(
                        'schemaValidation',
                        'Schema Validation Results',
                        vscode.ViewColumn.One,
                        { enableScripts: false }
                    );

                    panel.webview.html = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <style>
                                body { font-family: var(--vscode-font-family); padding: 20px; }
                                code { background: var(--vscode-textCodeBlock-background); padding: 2px 4px; border-radius: 3px; }
                                .success { color: #4caf50; }
                                .warning { color: #ff9800; }
                                .error { color: #f44336; }
                            </style>
                        </head>
                        <body>
                            <pre>${results}</pre>
                        </body>
                        </html>
                    `;

                } catch (error: any) {
                    console.error('[ERROR] Schema validation failed:', error);
                    vscode.window.showErrorMessage(`Schema validation failed: ${error.message}`);
                }
            });

        } catch (error: any) {
            console.error('[ERROR] Error in validateSchema:', error);
            vscode.window.showErrorMessage(`Schema validation error: ${error.message}`);
        }
    }
}
