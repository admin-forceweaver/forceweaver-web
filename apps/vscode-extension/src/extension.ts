import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SidebarProvider } from './ui/sidebarProvider';
import { HierarchicalTreeProvider, HierarchicalTreeItem } from './ui/hierarchicalTreeProvider';
import { GroupingManager } from './ui/groupingModels';
import { ReportView } from './ui/reportView';
import { UserStatusViewProvider } from './ui/userStatusViewProvider';
import { SnapshotViewerProvider } from './ui/snapshotViewerProvider';
import { SnapshotCreator } from './snapshot/creator';
import { TestRunner } from './test/runner';
import { SalesforceAuth } from './salesforce/auth';
import { getLicenseState } from './services/licenseService';
import { ConfigurationService } from './services/configurationService';

// Constants for extension state management
const BETA_WELCOME_MESSAGE_SHOWN_KEY = 'betaWelcomeMessageShownV1';

/**
 * Show the welcome screen as a webview panel
 */
function showWelcomePanel(context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel(
        'revCloudBlueprintWelcome',
        'Welcome',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'images')]
        }
    );

    const logoUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, 'images', 'logo.png')
    );

    panel.webview.html = getWelcomeHtml(logoUri);

    // Handle messages from the webview
    panel.webview.onDidReceiveMessage(
        async (message) => {
            switch (message.command) {
                case 'openSettings':
                    await vscode.commands.executeCommand('revCloudBlueprint.openSettings');
                    break;
                case 'learnMore':
                    vscode.env.openExternal(vscode.Uri.parse('https://blueprint.forceweaver.com/setup-instructions'));
                    break;
            }
        },
        undefined,
        context.subscriptions
    );
}

/**
 * Get the HTML content for the welcome webview
 */
function getWelcomeHtml(logoUri: vscode.Uri): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Rev Cloud Blueprint</title>
    <link rel="stylesheet" href="https://microsoft.github.io/vscode-codicons/dist/codicon.css">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 30px;
            line-height: 1.5;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
        }

        .two-column-layout {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-top: 20px;
        }

        @media (max-width: 800px) {
            .two-column-layout {
                grid-template-columns: 1fr;
            }
        }

        .header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .logo {
            width: 60px;
            height: 60px;
        }

        .title-section h1 {
            font-size: 24px;
            font-weight: 600;
            color: var(--vscode-foreground);
            margin-bottom: 4px;
        }

        .title-section p {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
        }

        .beta-notice {
            background-color: var(--vscode-inputValidation-infoBackground);
            border-left: 3px solid var(--vscode-inputValidation-infoBorder);
            padding: 10px 14px;
            margin-bottom: 20px;
            font-size: 13px;
        }

        .beta-notice p {
            color: var(--vscode-foreground);
            margin: 0;
        }

        .section {
            margin-bottom: 20px;
        }

        .two-column-layout .section {
            margin-bottom: 0;
        }

        .section-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--vscode-foreground);
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .section-content {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
            line-height: 1.6;
        }

        .quick-start {
            display: grid;
            gap: 12px;
            margin-top: 12px;
        }

        .quick-start-item {
            display: flex;
            gap: 12px;
            align-items: flex-start;
            padding: 12px;
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }

        .icon-badge {
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 32px;
            height: 32px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-radius: 4px;
            font-size: 18px;
        }

        .quick-start-content {
            flex: 1;
        }

        .quick-start-title {
            font-weight: 600;
            font-size: 14px;
            color: var(--vscode-foreground);
            margin-bottom: 4px;
        }

        .quick-start-description {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            line-height: 1.5;
        }

        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 8px;
            margin-top: 12px;
        }

        .feature-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: var(--vscode-foreground);
            padding: 6px;
        }

        .feature-item::before {
            content: "✓";
            color: var(--vscode-charts-green);
            font-weight: bold;
            font-size: 14px;
        }

        .action-buttons {
            display: flex;
            gap: 10px;
            margin-top: 20px;
            flex-wrap: wrap;
        }

        .action-button {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: var(--vscode-button-foreground);
            background-color: var(--vscode-button-background);
            text-decoration: none;
            font-size: 13px;
            padding: 8px 14px;
            border-radius: 3px;
            cursor: pointer;
            border: none;
            font-family: var(--vscode-font-family);
            transition: background-color 0.2s;
        }

        .action-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .action-button.secondary {
            background-color: transparent;
            color: var(--vscode-textLink-foreground);
            border: 1px solid var(--vscode-panel-border);
        }

        .action-button.secondary:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .highlight {
            color: var(--vscode-textLink-activeForeground);
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${logoUri}" alt="Rev Cloud Blueprint" class="logo" />
            <div class="title-section">
                <h1>Welcome!</h1>
                <p>Automate Revenue Cloud pricing testing with zero-touch validation</p>
            </div>
        </div>

        <div class="beta-notice">
            <p><strong>What it does:</strong> Automated regression testing for Salesforce Revenue Cloud pricing using a snapshot-based approach. Capture a "golden master" from production, recreate it in your sandbox, and instantly validate field-by-field pricing accuracy.</p>
        </div>

        <div class="two-column-layout">
            <div class="section">
                <div class="section-title">
                    <span>🔄</span>
                    <span>How It Works</span>
                </div>
                <div class="quick-start">
                    <div class="quick-start-item">
                        <div class="icon-badge">
                            <i class="codicon codicon-file-code"></i>
                        </div>
                        <div class="quick-start-content">
                            <div class="quick-start-title">Capture</div>
                            <div class="quick-start-description">Establish a "golden master" snapshot from a trusted Salesforce environment—capturing all quote lines, pricing, and complex attributes as JSON</div>
                        </div>
                    </div>
                    <div class="quick-start-item">
                        <div class="icon-badge">
                            <i class="codicon codicon-run-all"></i>
                        </div>
                        <div class="quick-start-content">
                            <div class="quick-start-title">Run</div>
                            <div class="quick-start-description">Start regression suites with a single click—the tool recreates the exact scenario in your target environment via API and triggers pricing</div>
                        </div>
                    </div>
                    <div class="quick-start-item">
                        <div class="icon-badge">
                            <i class="codicon codicon-check-all"></i>
                        </div>
                        <div class="quick-start-content">
                            <div class="quick-start-title">Validate</div>
                            <div class="quick-start-description">Instantly compare new pricing against the benchmark, field-by-field—any discrepancies are highlighted in a detailed HTML report</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">
                    <span>🎯</span>
                    <span>Quick Start Guide</span>
                </div>
                <div class="quick-start">
                    <div class="quick-start-item">
                        <div class="icon-badge">
                            <i class="codicon codicon-add"></i>
                        </div>
                        <div class="quick-start-content">
                            <div class="quick-start-title">Create Your First Snapshot</div>
                            <div class="quick-start-description">Click the <strong>+ icon</strong> in the left panel to capture a pricing snapshot from your Salesforce org</div>
                        </div>
                    </div>
                    <div class="quick-start-item">
                        <div class="icon-badge">
                            <i class="codicon codicon-new-folder"></i>
                        </div>
                        <div class="quick-start-content">
                            <div class="quick-start-title">Organize with Groups</div>
                            <div class="quick-start-description">Click the <strong>folder+ icon</strong> in the left panel to create groups and organize your snapshots by feature or release</div>
                        </div>
                    </div>
                    <div class="quick-start-item">
                        <div class="icon-badge">
                            <i class="codicon codicon-play"></i>
                        </div>
                        <div class="quick-start-content">
                            <div class="quick-start-title">Run Your Tests</div>
                            <div class="quick-start-description">Click the <strong>play icon</strong> next to any snapshot or group to run pricing validation tests</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">
                <span>💎</span>
                <span>Key Features</span>
            </div>
            <div class="feature-grid">
                <div class="feature-item">Zero-touch pricing validation</div>
                <div class="feature-item">Smart test organization</div>
                <div class="feature-item">Batch testing & groups</div>
                <div class="feature-item">HTML/PDF reports</div>
                <div class="feature-item">Git integration</div>
            </div>
        </div>

        <div class="action-buttons">
            <button class="action-button" onclick="handleOpenSettings()">
                <span>⚙️</span>
                <span>Configure Settings</span>
            </button>
            <button class="action-button secondary" onclick="handleLearnMore()">
                <span>📚</span>
                <span>Documentation</span>
            </button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function handleOpenSettings() {
            vscode.postMessage({ command: 'openSettings' });
        }

        function handleLearnMore() {
            vscode.postMessage({ command: 'learnMore' });
        }
    </script>
</body>
</html>`;
}

// Function to get extension version from package.json
function getExtensionVersion(): string {
    try {
        const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        return packageJson.version || '1.0.0';
    } catch (error) {
        console.warn('[WARN] Could not read extension version from package.json:', error);
        return '1.0.0';
    }
}

// Setup-related functions
function getRevCloudDir(): string | null {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        console.log('[DEBUG] 📁 getRevCloudDir - No workspace folder found');
        return null;
    }
    const revCloudPath = path.join(workspaceFolder.uri.fsPath, '.revcloud');
    console.log(`[DEBUG] 📁 getRevCloudDir - Workspace: ${workspaceFolder.uri.fsPath}`);
    console.log(`[DEBUG] 📁 getRevCloudDir - RevCloud path: ${revCloudPath}`);
    return revCloudPath;
}

function checkSetupRequired(): boolean {
    const revCloudDir = getRevCloudDir();
    if (!revCloudDir) {
        return false; // No workspace, can't setup
    }
    
    const groupsFile = path.join(revCloudDir, 'groups.json');
    const settingsFile = path.join(revCloudDir, 'settings.json');
    
    return !fs.existsSync(groupsFile) || !fs.existsSync(settingsFile);
}

async function createSetupFiles(): Promise<boolean> {
    const revCloudDir = getRevCloudDir();
    console.log('[DEBUG] 🔧 createSetupFiles - revCloudDir:', revCloudDir);
    
    if (!revCloudDir) {
        console.error('[ERROR] ❌ No workspace folder found');
        vscode.window.showErrorMessage('No workspace folder found. Please open a workspace first.');
        return false;
    }
    
    try {
        console.log('[DEBUG] 🔧 createSetupFiles - Starting file creation');
        
        // Check if we have write permissions to the workspace directory
        const workspaceDir = path.dirname(revCloudDir);
        try {
            const testFile = path.join(workspaceDir, 'test-write-permissions.tmp');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            console.log('[DEBUG] ✅ Write permissions verified for workspace directory');
        } catch (permError) {
            console.error('[ERROR] ❌ No write permissions to workspace:', permError);
            throw new Error(`No write permissions to workspace directory: ${permError}`);
        }
        
        // Ensure .revcloud directory exists
        if (!fs.existsSync(revCloudDir)) {
            console.log('[DEBUG] 📁 createSetupFiles - Creating .revcloud directory');
            fs.mkdirSync(revCloudDir, { recursive: true });
            console.log('[DEBUG] ✅ .revcloud directory created successfully');
        } else {
            console.log('[DEBUG] 📁 .revcloud directory already exists');
        }
        
        // Verify directory was created/exists
        if (!fs.existsSync(revCloudDir)) {
            throw new Error('.revcloud directory could not be created or accessed');
        }
        
        // Create groups.json
        const groupsFile = path.join(revCloudDir, 'groups.json');
        const groupsContent = {
            "_comment": "This file stores snapshot grouping configuration for RevCloud Blueprint extension",
            "version": "1.0",
            "groups": [
                {
                    "id": "uncategorized",
                    "name": "Uncategorized", 
                    "description": "New snapshots will be placed here until moved to a specific group",
                    "snapshotPaths": [],
                    "createdAt": new Date().toISOString()
                }
            ]
        };
        
        console.log('[DEBUG] 📄 createSetupFiles - groups.json path:', groupsFile);
        if (!fs.existsSync(groupsFile)) {
            console.log('[DEBUG] 📝 createSetupFiles - Writing groups.json');
            fs.writeFileSync(groupsFile, JSON.stringify(groupsContent, null, 2), 'utf8');
            
            // Verify file was created
            if (fs.existsSync(groupsFile)) {
                const stats = fs.statSync(groupsFile);
                console.log('[DEBUG] ✅ groups.json created successfully - Size:', stats.size, 'bytes');
            } else {
                throw new Error('groups.json was not created successfully');
            }
        } else {
            console.log('[DEBUG] 📄 createSetupFiles - groups.json already exists');
        }
        
        // Create settings.json
        const settingsFile = path.join(revCloudDir, 'settings.json');
        console.log('[DEBUG] 📄 createSetupFiles - settings.json path:', settingsFile);
        const settingsContent = {
            "pricing": {
                "snapFields": {
                    "description": "Input fields captured in snapshots and used for pricing test recreation (these provide the data pricing procedures need to calculate correctly)",
                    "quote": {
                        "description": "Custom fields for Quote object that are required inputs for pricing calculation",
                        "fields": []
                    },
                    "quoteLineItem": {
                        "description": "Custom fields for QuoteLineItem object that are required inputs for pricing calculation", 
                        "fields": []
                    }
                },
                "reportFields": {
                    "description": "Output fields captured in snapshots and used for test report comparison (these are the calculated results from pricing procedures that we want to verify)",
                    "quote": {
                        "description": "Quote-level pricing outputs to verify in test reports",
                        "fields": [
                            "GrandTotal"
                        ]
                    },
                    "quoteLineItem": {
                        "description": "QuoteLineItem-level pricing outputs to verify in test reports",
                        "fields": [
                            "NetUnitPrice",
                            "NetTotalPrice",
                            "Quantity"
                        ]
                    }
                }
            }
        };
        
        if (!fs.existsSync(settingsFile)) {
            console.log('[DEBUG] 📝 createSetupFiles - Writing settings.json');
            fs.writeFileSync(settingsFile, JSON.stringify(settingsContent, null, 2), 'utf8');
            
            // Verify file was created
            if (fs.existsSync(settingsFile)) {
                const stats = fs.statSync(settingsFile);
                console.log('[DEBUG] ✅ settings.json created successfully - Size:', stats.size, 'bytes');
            } else {
                throw new Error('settings.json was not created successfully');
            }
        } else {
            console.log('[DEBUG] 📄 createSetupFiles - settings.json already exists');
        }
        
        // Final verification that both files exist
        const groupsExists = fs.existsSync(groupsFile);
        const settingsExists = fs.existsSync(settingsFile);
        
        console.log('[DEBUG] 🔍 Final verification:');
        console.log(`[DEBUG] 📄 groups.json exists: ${groupsExists}`);
        console.log(`[DEBUG] 📄 settings.json exists: ${settingsExists}`);
        
        if (groupsExists && settingsExists) {
            console.log('[DEBUG] ✅ createSetupFiles - All files processed successfully');
            return true;
        } else {
            throw new Error(`File creation verification failed - groups: ${groupsExists}, settings: ${settingsExists}`);
        }
        
    } catch (error: any) {
        console.error('[ERROR] ❌ createSetupFiles failed:', error);
        console.error('[ERROR] ❌ Stack trace:', error.stack);
        vscode.window.showErrorMessage(`Failed to create setup files: ${error.message}`);
        return false;
    }
}

function updateSetupContext() {
    const setupRequired = checkSetupRequired();
    vscode.commands.executeCommand('setContext', 'revCloudBlueprint.setupRequired', setupRequired);
}

export async function activate(context: vscode.ExtensionContext) {
    console.log('Revcloud Blueprint is now active!');

    let outputChannel: vscode.OutputChannel;
    
    // Show one-time welcome message for Public Beta
    const hasShownWelcomeMessage = context.globalState.get<boolean>(BETA_WELCOME_MESSAGE_SHOWN_KEY);
    
    if (!hasShownWelcomeMessage) {
        vscode.window.showInformationMessage(
            'Welcome to the Rev Cloud Blueprint Public Beta! All Pro features are enabled for free during this period.'
        );
        await context.globalState.update(BETA_WELCOME_MESSAGE_SHOWN_KEY, true);
    }
    
    // Check setup status on activation (notification will be shown after commands are registered)
    const setupRequired = checkSetupRequired();
    updateSetupContext();
    
    try {
        // Create output channel for debug logging
        outputChannel = vscode.window.createOutputChannel('RevCloud Blueprint');
        context.subscriptions.push(outputChannel);
        
        // Make output channel globally accessible early
        (global as any).revCloudBlueprintLogger = outputChannel;
        
        outputChannel.appendLine('🚀 Revcloud Blueprint Extension Activated');

        // Check for and dispose existing commands to prevent "already exists" error
        await disposeExistingCommands();
    } catch (error: any) {
        console.error('[CRITICAL] Failed to initialize basic extension components:', error);
        vscode.window.showErrorMessage(`Extension initialization failed: ${error.message}`);
        throw error;
    }

    try {
        // Get workspace information
        const workspaceFolders = vscode.workspace.workspaceFolders;
    } catch (error: any) {
        throw error;
    }

    let salesforceAuth: SalesforceAuth;
    let snapshotCreator: SnapshotCreator;
    let testRunner: TestRunner;
    let reportView: ReportView;

    try {
        // Initialize core services
        salesforceAuth = new SalesforceAuth();
        snapshotCreator = new SnapshotCreator(salesforceAuth);
        testRunner = new TestRunner(salesforceAuth);
        reportView = new ReportView(context);
    } catch (error: any) {
        outputChannel.appendLine(`[ERROR] Failed to initialize core services: ${error.message}`);
        outputChannel.appendLine(`[ERROR] Stack trace: ${error.stack}`);
        throw error;
    }
    
    // Initialize grouping manager and hierarchical tree provider
    let groupingManager: GroupingManager;
    let hierarchicalTreeProvider: HierarchicalTreeProvider;
    try {
        outputChannel.appendLine('[DEBUG] Initializing GroupingManager...');
        groupingManager = new GroupingManager();
        outputChannel.appendLine('[DEBUG] ✅ GroupingManager initialized successfully');
        
        outputChannel.appendLine('[DEBUG] Initializing HierarchicalTreeProvider...');
        hierarchicalTreeProvider = new HierarchicalTreeProvider(groupingManager, snapshotCreator, testRunner, reportView);
        outputChannel.appendLine('[DEBUG] ✅ HierarchicalTreeProvider initialized successfully');
        
        // Get extension version for display
        const extensionVersion = getExtensionVersion();
        console.log(`[DEBUG] Extension version: ${extensionVersion}`);
        outputChannel.appendLine(`[DEBUG] Extension version: ${extensionVersion}`);
        
        // Register hierarchical tree view with version in title
        console.log('[DEBUG] Extension activation: Registering HierarchicalTreeProvider as main tree data provider');
        outputChannel.appendLine('[DEBUG] 🔧 Registering tree data provider for view: revCloudBlueprint');
        
        let treeView: vscode.TreeView<HierarchicalTreeItem>;
        
        try {
            treeView = vscode.window.createTreeView('revCloudBlueprint', {
                treeDataProvider: hierarchicalTreeProvider,
                showCollapseAll: true
            });
            outputChannel.appendLine('[DEBUG] ✅ Tree view created successfully');
        } catch (treeError: any) {
            outputChannel.appendLine(`[ERROR] ❌ Failed to create tree view: ${treeError.message}`);
            outputChannel.appendLine(`[ERROR] ❌ Stack trace: ${treeError.stack}`);
            throw treeError;
        }
        
        // Update the tree view title
        try {
            treeView.title = `RevCloud Blueprint`;
            outputChannel.appendLine(`[DEBUG] ✅ Tree view title set to: ${treeView.title}`);
        } catch (titleError: any) {
            outputChannel.appendLine(`[ERROR] ❌ Failed to set tree view title: ${titleError.message}`);
        }
        
        outputChannel.appendLine(`[DEBUG] 🎉 Tree data provider successfully registered!`);
        
        // Add tree view to context subscriptions for proper cleanup
        context.subscriptions.push(treeView);
        
        // Store provider reference for debugging
        (global as any).revCloudBlueprintProvider = hierarchicalTreeProvider;
        (global as any).revCloudBlueprintGroupingManager = groupingManager;
        
        // Register the user status webview provider
        outputChannel.appendLine('[DEBUG] Registering UserStatusViewProvider...');
        const userStatusProvider = new UserStatusViewProvider(context.extensionUri, context);
        const userStatusDisposable = vscode.window.registerWebviewViewProvider(
            UserStatusViewProvider.viewType, 
            userStatusProvider
        );
        context.subscriptions.push(userStatusDisposable);
        outputChannel.appendLine('[DEBUG] ✅ UserStatusViewProvider registered successfully');
        
        // Initialize user status view visibility context (default to hidden)
        // Always start with the main tree view visible and user status hidden
        await context.workspaceState.update('revCloudBlueprint.showUserStatus', false);
        await vscode.commands.executeCommand('setContext', 'revCloudBlueprint.showUserStatus', false);
        outputChannel.appendLine(`[DEBUG] 👤 User status view initial state: false (main tree view shown)`);
    } catch (error: any) {
        outputChannel.appendLine(`[ERROR] Failed to create or register hierarchical tree provider: ${error.message}`);
        outputChannel.appendLine(`[ERROR] Stack trace: ${error.stack}`);
        vscode.window.showErrorMessage(`Extension activation failed: ${error.message}`);
        throw error;
    }

    // Register commands
    try {
        outputChannel.appendLine('[DEBUG] Starting command registration...');
        
        const commands = [
            vscode.commands.registerCommand('revCloudBlueprint.createPricingSnapshot', () => {
                console.log('[DEBUG] createPricingSnapshot command triggered');
                // outputChannel.appendLine('[DEBUG] 🚀 Create Pricing Snapshot command started');
                // outputChannel.appendLine('[DEBUG] 🚀 About to call snapshotCreator.createSnapshot()...');
                
                return snapshotCreator.createSnapshot().then((snapshotPath) => {
                    outputChannel.appendLine(`[DEBUG] 🚀 Snapshot creation completed. Path: ${snapshotPath || 'null'}`);
                    
                    // Add new snapshot to Uncategorized group
                    if (snapshotPath) {
                        // outputChannel.appendLine('[DEBUG] 🚀 Adding snapshot to Uncategorized group...');
                        groupingManager.addSnapshotToUncategorized(snapshotPath);
                        
                        // Open the snapshot viewer automatically
                        try {
                            const snapshotViewer = new SnapshotViewerProvider(context.extensionUri, context);
                            snapshotViewer.showSnapshotView(snapshotPath);
                        } catch (error: any) {
                            outputChannel.appendLine(`[ERROR] Failed to open snapshot viewer: ${error.message}`);
                        }
                    }
                    // Refresh the tree view after creating a snapshot
                    // outputChannel.appendLine('[DEBUG] 🚀 Refreshing tree view...');
                    hierarchicalTreeProvider.refresh();
                }).catch((error: any) => {
                    outputChannel.appendLine(`[ERROR] 🚀 Snapshot creation failed: ${error.message}`);
                    console.error('Snapshot creation error:', error);
                    throw error;
                });
            }),
            vscode.commands.registerCommand('revCloudBlueprint.runPricingTest', (snapshot) => 
                hierarchicalTreeProvider.runTest(snapshot)
            ),
            vscode.commands.registerCommand('revCloudBlueprint.runTest', (treeItem) => {
                // treeItem is the HierarchicalTreeItem from context menu
                // Extract the proper data structure that runTest expects
                if (treeItem && treeItem.data && treeItem.data.snapshot) {
                    return hierarchicalTreeProvider.runTest(treeItem.data);
                } else {
                    vscode.window.showErrorMessage('Invalid test data - please try again');
                }
            }),
            vscode.commands.registerCommand('revCloudBlueprint.runBatchTest', async (item) => {
                // Handle batch test for groups
                if (item?.itemType === 'group') {
                    // Running all tests in a group
                    const groupData = item.data;
                    return hierarchicalTreeProvider.runBatchTests(groupData);
                } else if (item?.data) {
                    // Direct group data passed
                    return hierarchicalTreeProvider.runBatchTests(item.data);
                } else {
                    vscode.window.showErrorMessage('Invalid batch test data');
                    return;
                }
            }),
            vscode.commands.registerCommand('revCloudBlueprint.deletePricingSnapshot', (snapshot) => {
                // This command is kept for backward compatibility but not used in hierarchical view
                vscode.window.showInformationMessage('Delete functionality is available in the hierarchical view');
            }),
            vscode.commands.registerCommand('revCloudBlueprint.viewPricingDetails', (snapshot) => {
                // This command is kept for backward compatibility but not used in hierarchical view  
                vscode.window.showInformationMessage('View details functionality is available in the hierarchical view');
            }),
            vscode.commands.registerCommand('revCloudBlueprint.createGroup', async () => {
                // Check license state before creating groups (Pro feature)
                const licenseState = await getLicenseState(context);
                if (!licenseState.isPro) {
                    const action = await vscode.window.showInformationMessage(
                        licenseState.statusMessage + ' Group Management is a Pro feature.',
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

                const groupName = await vscode.window.showInputBox({
                    prompt: 'Enter name for new group',
                    placeHolder: 'e.g., Basic Pricing Tests'
                });
                
                if (!groupName) return;
                
                const groupDescription = await vscode.window.showInputBox({
                    prompt: 'Enter description for the group (optional)',
                    placeHolder: 'e.g., Simple pricing scenarios for regression testing'
                });
                
                try {
                    await groupingManager.createGroup(groupName, groupDescription);
                    hierarchicalTreeProvider.refresh();
                    vscode.window.showInformationMessage(`Group "${groupName}" created successfully`);
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Failed to create group: ${error.message}`);
                }
            }),
            vscode.commands.registerCommand('revCloudBlueprint.createGroupFromTitle', async () => {
                // Check license state before creating groups (Pro feature)
                const licenseState = await getLicenseState(context);
                if (!licenseState.isPro) {
                    const action = await vscode.window.showInformationMessage(
                        licenseState.statusMessage + ' Group Management is a Pro feature.',
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

                const groupName = await vscode.window.showInputBox({
                    prompt: 'Enter name for new folder/group',
                    placeHolder: 'e.g., Basic Pricing Tests'
                });
                
                if (!groupName) return;
                
                const groupDescription = await vscode.window.showInputBox({
                    prompt: 'Enter description for the folder (optional)',
                    placeHolder: 'e.g., Simple pricing scenarios for regression testing'
                });
                
                try {
                    await groupingManager.createGroup(groupName, groupDescription);
                    hierarchicalTreeProvider.refresh();
                    vscode.window.showInformationMessage(`Folder "${groupName}" created successfully`);
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Failed to create folder: ${error.message}`);
                }
            }),
            vscode.commands.registerCommand('revCloudBlueprint.deleteGroup', async (groupItem) => {
                // Check license state before deleting groups (Pro feature)
                const licenseState = await getLicenseState(context);
                if (!licenseState.isPro) {
                    const action = await vscode.window.showInformationMessage(
                        licenseState.statusMessage + ' Group Management is a Pro feature.',
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

                const groupData = groupItem?.data;
                if (!groupData) {
                    vscode.window.showErrorMessage('Please right-click on a group to delete it');
                    return;
                }
                
                const confirm = await vscode.window.showWarningMessage(
                    `Delete group "${groupData.name}"? Snapshots will be moved back to individual tests.`,
                    'Delete', 'Cancel'
                );
                
                if (confirm === 'Delete') {
                    try {
                        await groupingManager.deleteGroup(groupData.id);
                        hierarchicalTreeProvider.refresh();
                        vscode.window.showInformationMessage(`Group "${groupData.name}" deleted`);
                    } catch (error: any) {
                        vscode.window.showErrorMessage(`Failed to delete group: ${error.message}`);
                    }
                }
            }),
            vscode.commands.registerCommand('revCloudBlueprint.createSnapshotInGroup', async (groupItem) => {
                const groupData = groupItem?.data;
                if (!groupData) {
                    vscode.window.showErrorMessage('Please right-click on a group to create a snapshot');
                    return;
                }
                
                try {
                    const snapshotPath = await snapshotCreator.createSnapshot();
                    if (snapshotPath) {
                        // Add snapshot directly to the selected group
                        await groupingManager.addSnapshotToGroup(groupData.id, snapshotPath);
                        hierarchicalTreeProvider.refresh();
                        vscode.window.showInformationMessage(`Snapshot created in group "${groupData.name}"`);
                    }
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Failed to create snapshot: ${error.message}`);
                }
            }),
            vscode.commands.registerCommand('revCloudBlueprint.setup', async () => {
                try {
                    console.log('[DEBUG] 🚀 Setup command triggered!');
                    // outputChannel.appendLine('[DEBUG] 🚀 Setup command started');
                    outputChannel.show(true); // Force show the output channel
                    
                    // Initial diagnostics
                    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                    outputChannel.appendLine(`[DEBUG] 📁 Workspace folder: ${workspaceFolder?.uri.fsPath || 'NONE'}`);
                    outputChannel.appendLine(`[DEBUG] ✅ Setup required check: ${checkSetupRequired()}`);
                    
                    vscode.window.showInformationMessage('Setup command received! Check the "RevCloud Blueprint" output panel for detailed logs.');
                    
                    const success = await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: 'Setting up RevCloud Blueprint...',
                        cancellable: false
                    }, async (progress) => {
                        outputChannel.appendLine('[DEBUG] 📋 Setup progress started');
                        progress.report({ message: 'Creating configuration files...', increment: 20 });
                        
                        try {
                            const result = await createSetupFiles();
                            outputChannel.appendLine(`[DEBUG] ✅ Setup files creation result: ${result}`);
                            
                            if (result) {
                                progress.report({ message: 'Files created successfully!', increment: 60 });
                                // Update context to hide setup UI
                                updateSetupContext();
                                progress.report({ message: 'Updating UI...', increment: 80 });
                                // Refresh the tree view to show the new uncategorized group
                                hierarchicalTreeProvider.refresh();
                                progress.report({ message: 'Setup completed!', increment: 100 });
                                // outputChannel.appendLine('[DEBUG] 🎉 All setup steps completed successfully!');
                            } else {
                                progress.report({ message: 'Setup failed - check output panel', increment: 100 });
                                outputChannel.appendLine('[ERROR] ❌ Setup files creation returned false');
                            }
                            
                            return result;
                        } catch (progressError: any) {
                            outputChannel.appendLine(`[ERROR] ❌ Error during progress execution: ${progressError.message}`);
                            outputChannel.appendLine(`[ERROR] Stack trace: ${progressError.stack}`);
                            progress.report({ message: 'Error occurred - check output panel', increment: 100 });
                            return false;
                        }
                    });
                    
                    outputChannel.appendLine(`[DEBUG] 🏁 Setup command finished with success: ${success}`);
                    
                    if (success) {
                        const message = 'RevCloud Blueprint setup completed successfully! Configuration files have been created in .revcloud directory.';
                        outputChannel.appendLine(`[DEBUG] 🎉 ${message}`);
                        vscode.window.showInformationMessage(
                            message,
                            'Open Settings File'
                        ).then(action => {
                            if (action === 'Open Settings File') {
                                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                                if (workspaceRoot) {
                                    const settingsPath = path.join(workspaceRoot, '.revcloud', 'settings.json');
                                    outputChannel.appendLine(`[DEBUG] 📂 Opening settings file: ${settingsPath}`);
                                    vscode.workspace.openTextDocument(settingsPath).then(
                                        doc => {
                                            vscode.window.showTextDocument(doc);
                                        },
                                        (err: any) => {
                                            outputChannel.appendLine(`[ERROR] ❌ Failed to open settings file: ${err.message}`);
                                        }
                                    );
                                }
                            }
                        });
                    } else {
                        const errorMessage = 'RevCloud Blueprint setup failed. Please check the "RevCloud Blueprint" output panel for details.';
                        outputChannel.appendLine(`[ERROR] ❌ ${errorMessage}`);
                        vscode.window.showErrorMessage(errorMessage);
                    }
                } catch (error: any) {
                    console.error('[ERROR] ❌ Setup command failed:', error);
                    outputChannel.appendLine(`[ERROR] ❌ Setup command failed: ${error.message}`);
                    outputChannel.appendLine(`[ERROR] Stack trace: ${error.stack}`);
                    outputChannel.show(true);
                    vscode.window.showErrorMessage(`Setup failed: ${error.message}. Check the 'RevCloud Blueprint' output panel for details.`);
                }
            }),
            vscode.commands.registerCommand('revCloudBlueprint.changeGroup', async (snapshotItem) => {
                const snapshotData = snapshotItem?.data;
                if (!snapshotData?.path) {
                    vscode.window.showErrorMessage('Please right-click on a snapshot to change its group');
                    return;
                }
                
                // Get available groups
                const groups = groupingManager.getGroups();
                const groupOptions = groups.map(group => ({
                    label: group.name,
                    description: `${group.snapshotPaths.length} tests`,
                    detail: group.description,
                    groupId: group.id
                }));
                
                if (groupOptions.length === 0) {
                    const createGroup = await vscode.window.showInformationMessage(
                        'No groups exist yet. Would you like to create one?',
                        'Create Group', 'Cancel'
                    );
                    if (createGroup === 'Create Group') {
                        vscode.commands.executeCommand('revCloudBlueprint.createGroup');
                    }
                    return;
                }
                
                const selectedGroup = await vscode.window.showQuickPick(groupOptions, {
                    placeHolder: 'Select group to move snapshot to'
                });
                
                if (!selectedGroup) return;
                
                try {
                    await groupingManager.addSnapshotToGroup(selectedGroup.groupId, snapshotData.path);
                    hierarchicalTreeProvider.refresh();
                    vscode.window.showInformationMessage(`Snapshot moved to group "${selectedGroup.label}"`);
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Failed to change group: ${error.message}`);
                }
            }),
            vscode.commands.registerCommand('revCloudBlueprint.viewSnapshot', async (snapshotItem) => {
                const snapshotData = snapshotItem?.data;
                if (!snapshotData?.path) {
                    vscode.window.showErrorMessage('Please right-click on a snapshot to view it');
                    return;
                }
                
                try {
                    // Open the JSON file
                    const document = await vscode.workspace.openTextDocument(snapshotData.path);
                    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Failed to open snapshot: ${error.message}`);
                }
            }),
            vscode.commands.registerCommand('revCloudBlueprint.visualizeSnapshot', async (snapshotItem) => {
                const snapshotData = snapshotItem?.data;
                if (!snapshotData?.path) {
                    vscode.window.showErrorMessage('Please right-click on a snapshot to visualize it');
                    return;
                }
                
                try {
                    const snapshotViewer = new SnapshotViewerProvider(context.extensionUri, context);
                    snapshotViewer.showSnapshotView(snapshotData.path);
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Failed to visualize snapshot: ${error.message}`);
                }
            }),
            vscode.commands.registerCommand('revCloudBlueprint.deleteSnapshot', async (snapshotItem) => {
                const snapshotData = snapshotItem?.data;
                if (!snapshotData?.path) {
                    vscode.window.showErrorMessage('Please right-click on a snapshot to delete it');
                    return;
                }
                
                try {
                    // Get snapshot details for confirmation
                    const snapshot = snapshotData.snapshot;
                    const displayName = snapshot?.metadata?.description || path.basename(snapshotData.path, '.json');
                    
                    // Confirm deletion
                    const confirmDelete = await vscode.window.showWarningMessage(
                        `Are you sure you want to delete snapshot "${displayName}"?`,
                        { modal: true },
                        'Delete',
                        'Cancel'
                    );
                    
                    if (confirmDelete === 'Delete') {
                        // Delete the file
                        if (fs.existsSync(snapshotData.path)) {
                            fs.unlinkSync(snapshotData.path);
                            
                            // Refresh the tree view (organizeSnapshots will automatically clean up missing files)
                            hierarchicalTreeProvider.refresh();
                            vscode.window.showInformationMessage(`Snapshot "${displayName}" deleted successfully`);
                        } else {
                            vscode.window.showErrorMessage('Snapshot file not found');
                        }
                    }
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Failed to delete snapshot: ${error.message}`);
                }
            }),
            vscode.commands.registerCommand('revCloudBlueprint.removeFromGroup', async (snapshotItem) => {
                const snapshotData = snapshotItem?.data;
                if (!snapshotData?.path) {
                    vscode.window.showErrorMessage('Please right-click on a snapshot to remove it from a group');
                    return;
                }
                
                // Find which group this snapshot is in
                const group = groupingManager.findGroupForSnapshot(snapshotData.path);
                if (!group) {
                    vscode.window.showInformationMessage('This snapshot is not in any group');
                    return;
                }
                
                const confirm = await vscode.window.showInformationMessage(
                    `Remove snapshot from group "${group.name}"?`,
                    'Remove', 'Cancel'
                );
                
                if (confirm === 'Remove') {
                    try {
                        await groupingManager.removeSnapshotFromGroup(group.id, snapshotData.path);
                        hierarchicalTreeProvider.refresh();
                        vscode.window.showInformationMessage(`Snapshot removed from group "${group.name}"`);
                    } catch (error: any) {
                        vscode.window.showErrorMessage(`Failed to remove from group: ${error.message}`);
                    }
                }
            }),
            vscode.commands.registerCommand('revCloudBlueprint.refreshSnapshot', async (snapshotItem) => {
                const snapshotData = snapshotItem?.data;
                if (!snapshotData?.path) {
                    vscode.window.showErrorMessage('Please right-click on a snapshot to refresh it');
                    return;
                }
                
                try {
                    const snapshot = snapshotData.snapshot;
                    const displayName = snapshot?.metadata?.description || path.basename(snapshotData.path, '.json');
                    
                    const confirmRefresh = await vscode.window.showInformationMessage(
                        `Refresh snapshot "${displayName}" with latest data from source org?`,
                        'Refresh', 'Cancel'
                    );
                    
                    if (confirmRefresh === 'Refresh') {
                        await vscode.window.withProgress({
                            location: vscode.ProgressLocation.Notification,
                            title: `Refreshing snapshot: ${displayName}...`,
                            cancellable: false
                        }, async () => {
                            const success = await snapshotCreator.refreshSnapshot(snapshotData.path);
                            if (success) {
                                hierarchicalTreeProvider.refresh();
                                vscode.window.showInformationMessage(`Snapshot "${displayName}" refreshed successfully`);
                            }
                        });
                    }
                } catch (error: any) {
                    vscode.window.showErrorMessage(`Failed to refresh snapshot: ${error.message}`);
                }
            }),
            vscode.commands.registerCommand('revCloudBlueprint.openSettings', () => 
                vscode.commands.executeCommand('workbench.action.openSettings', 'revCloudBlueprint')
            ),
            vscode.commands.registerCommand('revCloudBlueprint.validateSchema', () => {
                // Create a temporary sidebar provider for schema validation (reuse existing functionality)
                const tempSidebarProvider = new SidebarProvider(context.extensionUri, snapshotCreator, testRunner, reportView);
                return tempSidebarProvider.validateSchema();
            }),
            vscode.commands.registerCommand('revCloudBlueprint.refreshTests', () => {
                console.log('[DEBUG] Manual refresh triggered');
                console.log('[DEBUG] Refreshing hierarchicalTreeProvider...');
                hierarchicalTreeProvider.refresh();
                console.log('[DEBUG] Refresh completed');
                vscode.window.showInformationMessage('Revcloud Blueprint tests refreshed');
            }),
            vscode.commands.registerCommand('revCloudBlueprint.reloadConfiguration', () => {
                try {
                    // outputChannel.appendLine('[DEBUG] 🔄 Configuration reload command triggered');
                    
                    // Clear the configuration cache
                    ConfigurationService.clearCache();
                    
                    // outputChannel.appendLine('[DEBUG] ✅ Configuration cache cleared');
                    outputChannel.show(true);
                    
                    vscode.window.showInformationMessage(
                        'RevCloud Blueprint configuration reloaded successfully. Check the output panel for details.',
                        'View Output'
                    ).then(action => {
                        if (action === 'View Output') {
                            outputChannel.show(true);
                        }
                    }                    );
                } catch (error: any) {
                    // outputChannel.appendLine(`[ERROR] ❌ Failed to reload configuration: ${error.message}`);
                    vscode.window.showErrorMessage(`Failed to reload configuration: ${error.message}`);
                }
            }),
            vscode.commands.registerCommand('revCloudBlueprint.toggleUserStatus', async () => {
                try {
                    outputChannel.appendLine('[DEBUG] 👤 Toggle user status command triggered');
                    
                    // Get current state and toggle it
                    const currentState = context.workspaceState.get<boolean>('revCloudBlueprint.showUserStatus', false);
                    const newState = !currentState;
                    
                    // Store the new state
                    await context.workspaceState.update('revCloudBlueprint.showUserStatus', newState);
                    
                    // Set context for view visibility
                    await vscode.commands.executeCommand('setContext', 'revCloudBlueprint.showUserStatus', newState);
                    
                    // outputChannel.appendLine(`[DEBUG] ✅ User status view visibility set to: ${newState}`);
                    
                } catch (error: any) {
                    // outputChannel.appendLine(`[ERROR] ❌ Failed to toggle user status: ${error.message}`);
                    vscode.window.showErrorMessage(`Failed to toggle user status: ${error.message}`);
                }
            }),
            vscode.commands.registerCommand('revCloudBlueprint.showWelcome', () => {
                try {
                    outputChannel.appendLine('[DEBUG] 👋 Show welcome screen command triggered');
                    showWelcomePanel(context);
                } catch (error: any) {
                    outputChannel.appendLine(`[ERROR] ❌ Failed to show welcome screen: ${error.message}`);
                    vscode.window.showErrorMessage(`Failed to show welcome screen: ${error.message}`);
                }
            })
        ];
        
        outputChannel.appendLine(`[DEBUG] Registered ${commands.length} commands successfully`);
        
        // Add all commands to context subscriptions
        context.subscriptions.push(...commands);
        // outputChannel.appendLine('[DEBUG] Commands added to context subscriptions');
        
        // Now that commands are registered, show setup notification if needed
        outputChannel.appendLine('[DEBUG] Checking if setup notification should be shown...');
        if (setupRequired && vscode.workspace.workspaceFolders) {
            const hideSetupMessage = vscode.workspace.getConfiguration('revCloudBlueprint').get<boolean>('hideSetupMessage', false);
            
            if (!hideSetupMessage) {
                // outputChannel.appendLine('[DEBUG] Showing setup notification...');
                const setupAction = await vscode.window.showInformationMessage(
                    'RevCloud Blueprint setup required. Configuration files need to be initialized.',
                    'Setup Now',
                    'Later',
                    'Don\'t Show Again'
                );
                
                outputChannel.appendLine(`[DEBUG] User selected: ${setupAction || 'dismissed'}`);
                
                if (setupAction === 'Setup Now') {
                    // outputChannel.appendLine('[DEBUG] Executing setup command...');
                    await vscode.commands.executeCommand('revCloudBlueprint.setup');
                } else if (setupAction === 'Don\'t Show Again') {
                    outputChannel.appendLine('[DEBUG] User chose not to show setup message again');
                    // Store in workspace settings to not show again
                    await vscode.workspace.getConfiguration('revCloudBlueprint').update('hideSetupMessage', true, vscode.ConfigurationTarget.Workspace);
                }
            } else {
                // outputChannel.appendLine('[DEBUG] Setup notification hidden by user preference');
            }
        } else {
            outputChannel.appendLine('[DEBUG] Setup not required or no workspace folder');
        }
        
        // Show welcome panel on every activation (when user clicks activity bar icon)
        outputChannel.appendLine('[DEBUG] Extension activated - showing welcome panel');
        showWelcomePanel(context);
        
    } catch (error: any) {
        outputChannel.appendLine(`[ERROR] Failed to register commands: ${error.message}`);
        outputChannel.appendLine(`[ERROR] Stack trace: ${error.stack}`);
        throw error;
    }

    try {
        // Watch for snapshot file changes if auto-refresh is enabled
        outputChannel.appendLine('[DEBUG] Setting up file watchers...');
        const config = vscode.workspace.getConfiguration('revCloudBlueprint');
        if (config.get<boolean>('autoRefreshTests', true)) {
            // Use configured snapshot directory from settings
            const snapshotDir = config.get<string>('pricing.snapshotDirectory', 'revcloud_blueprint/pricing/snapshots');
            const watcher = vscode.workspace.createFileSystemWatcher(`**/${snapshotDir}/**/*.json`);
            
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || 'No workspace';
            console.log(`[DEBUG] Workspace root: ${workspaceRoot}`);
            console.log(`[DEBUG] File watcher set up for: **/${snapshotDir}/**/*.json`);
            
            watcher.onDidCreate((uri) => {
                console.log(`[DEBUG] File watcher detected creation: ${uri.fsPath}`);
                console.log(`[DEBUG] Refreshing hierarchicalTreeProvider due to file creation`);
                hierarchicalTreeProvider.refresh();
            });
            watcher.onDidDelete((uri) => {
                console.log(`[DEBUG] File watcher detected deletion: ${uri.fsPath}`);
                console.log(`[DEBUG] Refreshing hierarchicalTreeProvider due to file deletion`);
                hierarchicalTreeProvider.refresh();
            });
            watcher.onDidChange((uri) => {
                console.log(`[DEBUG] File watcher detected change: ${uri.fsPath}`);
                console.log(`[DEBUG] Refreshing hierarchicalTreeProvider due to file change`);
                hierarchicalTreeProvider.refresh();
            });
            
            context.subscriptions.push(watcher);
            outputChannel.appendLine('[DEBUG] File watcher setup completed');
        } else {
            // outputChannel.appendLine('[DEBUG] Auto-refresh disabled, skipping file watcher setup');
        }
        
        // Listen for workspace changes to reload snapshots if workspace opens after extension activation
        outputChannel.appendLine('[DEBUG] Setting up workspace change listener...');
        const workspaceListener = vscode.workspace.onDidChangeWorkspaceFolders(() => {
            outputChannel.appendLine('[DEBUG] Workspace folders changed - refreshing data provider');
            const provider = (global as any).revCloudBlueprintProvider;
            if (provider) {
                provider.refresh();
            }
        });
        context.subscriptions.push(workspaceListener);
        outputChannel.appendLine('[DEBUG] Workspace change listener setup completed');
    } catch (error: any) {
        outputChannel.appendLine(`[ERROR] Failed to setup file watchers: ${error.message}`);
        outputChannel.appendLine(`[ERROR] Stack trace: ${error.stack}`);
        // Don't throw here - file watchers are not critical for basic functionality
    }

    // Display welcome message
    try {
        outputChannel.appendLine('[DEBUG] Extension activation completed successfully!');
        vscode.window.showInformationMessage('Revcloud Blueprint is ready!');
    } catch (error: any) {
        // outputChannel.appendLine(`[ERROR] Failed to show welcome message: ${error.message}`);
    }
}


/**
 * Dispose any existing commands to prevent "already exists" errors
 */
async function disposeExistingCommands(): Promise<void> {
    const revCloudCommands = [
        'revCloudBlueprint.createPricingSnapshot',
        'revCloudBlueprint.runPricingTest',
        'revCloudBlueprint.runTest',
        'revCloudBlueprint.runBatchTest',
        'revCloudBlueprint.refreshTests',
        'revCloudBlueprint.deletePricingSnapshot',
        'revCloudBlueprint.viewPricingDetails',
        'revCloudBlueprint.createGroup',
        'revCloudBlueprint.createGroupFromTitle',
        'revCloudBlueprint.deleteGroup',
        'revCloudBlueprint.createSnapshotInGroup',
        'revCloudBlueprint.changeGroup',
        'revCloudBlueprint.viewSnapshot',
        'revCloudBlueprint.visualizeSnapshot',
        'revCloudBlueprint.deleteSnapshot',
        'revCloudBlueprint.addToGroup',
        'revCloudBlueprint.removeFromGroup',
        'revCloudBlueprint.setup',
        'revCloudBlueprint.openSettings',
        'revCloudBlueprint.validateSchema',
        'revCloudBlueprint.reloadConfiguration',
        'revCloudBlueprint.toggleUserStatus',
        'revCloudBlueprint.showWelcome'
    ];

    try {
        const existingCommands = await vscode.commands.getCommands(true);
        for (const commandId of revCloudCommands) {
            if (existingCommands.includes(commandId)) {
                console.log(`[DEBUG] Disposing existing command: ${commandId}`);
                // Commands are automatically disposed when context is disposed
                // This is just for logging existing commands
            }
        }
    } catch (error) {
        console.warn('[WARN] Could not check existing commands:', error);
    }
}

export function deactivate() {
    console.log('Revcloud Blueprint deactivated');
    
    // Clear global logger reference
    if ((global as any).revCloudBlueprintLogger) {
        (global as any).revCloudBlueprintLogger.dispose();
        delete (global as any).revCloudBlueprintLogger;
    }
}
