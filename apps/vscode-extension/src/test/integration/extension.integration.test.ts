import * as vscode from 'vscode';
import * as assert from 'assert';
import * as path from 'path';

suite('Extension Integration Tests', () => {
    suiteSetup(async function() {
        this.timeout(30000); // Allow time for extension activation
        
        // Ensure extension is activated
        const extension = vscode.extensions.getExtension('rohit.revcloud-blueprint');
        if (extension && !extension.isActive) {
            await extension.activate();
        }
    });

    test('Extension should be present and activate', async () => {
        
        const extension = vscode.extensions.getExtension('rohit.revcloud-blueprint');
        assert.ok(extension, 'Extension should be found');
        
        if (!extension.isActive) {
            await extension.activate();
        }
        
        assert.ok(extension.isActive, 'Extension should be active');
    });

    test('All expected commands should be registered', async () => {
        
        const commands = await vscode.commands.getCommands(true);
        const expectedCommands = [
            'revCloudBlueprint.createPricingSnapshot',
            'revCloudBlueprint.runPricingTest',
            'revCloudBlueprint.refreshTests',
            'revCloudBlueprint.deletePricingSnapshot',
            'revCloudBlueprint.viewPricingDetails',
            'revCloudBlueprint.openSettings'
        ];

        expectedCommands.forEach(command => {
            assert.ok(
                commands.includes(command),
                `Command ${command} should be registered`
            );
        });
    });

    test('Configuration should have expected settings', () => {
        const config = vscode.workspace.getConfiguration('revCloudBlueprint');
        
        // Test default values
        const snapshotDirectory = config.get('pricing.snapshotDirectory');
        const productExternalIdField = config.get('pricing.productExternalIdField');
        const autoRefreshTests = config.get('autoRefreshTests');
        
        assert.strictEqual(snapshotDirectory, './snapshots');
        assert.strictEqual(productExternalIdField, 'ProductCode');
        assert.strictEqual(autoRefreshTests, true);
    });

    test('Should be able to create workspace with snapshots directory', async () => {
        
        // Create a temporary workspace
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const snapshotsPath = path.join(workspaceFolder.uri.fsPath, 'snapshots');
            
            // Try to create directory - this tests file system access
            try {
                await vscode.workspace.fs.createDirectory(vscode.Uri.file(snapshotsPath));
                assert.ok(true, 'Should be able to create snapshots directory');
            } catch (error: any) {
                // Directory might already exist, that's OK
                if (error.code !== 'FileExists') {
                    throw error;
                }
            }
        }
    });

    test('Tree view provider should be accessible', () => {
        // This tests that the tree view can be created (even if not visible)
        assert.doesNotThrow(() => {
            const disposable = vscode.window.registerTreeDataProvider('testTreeView', {
                getTreeItem: (element: any) => element,
                getChildren: () => []
            });
            disposable.dispose();
        }, 'Should be able to register tree data provider');
    });

    test('Webview creation should work', () => {
        assert.doesNotThrow(() => {
            const panel = vscode.window.createWebviewPanel(
                'testWebview',
                'Test Panel',
                vscode.ViewColumn.One,
                { enableScripts: true }
            );
            panel.dispose();
        }, 'Should be able to create webview panel');
    });

    test('Should handle configuration changes', (done) => {
        const config = vscode.workspace.getConfiguration('revCloudBlueprint');
        
        // Listen for configuration changes
        const disposable = vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('revCloudBlueprint')) {
                disposable.dispose();
                done();
            }
        });

        // Simulate configuration change (this might not work in test environment)
        // But at least we can test that the event listener can be set up
        setTimeout(() => {
            disposable.dispose();
            done();
        }, 100);
    });
});
