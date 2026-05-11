import * as vscode from 'vscode';
import * as path from 'path';

/**
 * WebviewViewProvider for the Welcome/Onboarding screen
 * This view serves as the default landing screen for new users
 */
export class WelcomeViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'revCloudBlueprint.welcomeView';

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void | Thenable<void> {
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'images')
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'done':
                    // Switch to the test tree view
                    await vscode.commands.executeCommand('setContext', 'revCloudBlueprint.treeViewVisible', true);
                    break;
                case 'openSettings':
                    // Open settings
                    await vscode.commands.executeCommand('revCloudBlueprint.openSettings');
                    break;
                case 'learnMore':
                    // Open external URL for learning more
                    vscode.env.openExternal(vscode.Uri.parse('https://sfapp.forceweaver.com/'));
                    break;
            }
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Get the logo URI
        const logoUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'images', 'logo.png')
        );

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Rev Cloud Blueprint</title>
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
            background-color: var(--vscode-sideBar-background);
            padding: 20px;
            line-height: 1.6;
        }

        .container {
            max-width: 100%;
            margin: 0 auto;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .header-title {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .logo {
            width: 48px;
            height: 48px;
        }

        .title-text h1 {
            font-size: 18px;
            font-weight: 600;
            color: var(--vscode-foreground);
            margin-bottom: 4px;
        }

        .title-text p {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        .done-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 14px;
            border-radius: 2px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: background-color 0.2s;
        }

        .done-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .done-button:active {
            background-color: var(--vscode-button-activeBackground);
        }

        .welcome-content {
            display: flex;
            flex-direction: column;
            gap: 25px;
        }

        .section {
            background-color: var(--vscode-sideBar-background);
            padding: 16px;
            border-radius: 4px;
            border: 1px solid var(--vscode-panel-border);
        }

        .section-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--vscode-foreground);
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .section-icon {
            font-size: 16px;
        }

        .section-content {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
            line-height: 1.6;
        }

        .beta-notice {
            background-color: var(--vscode-inputValidation-infoBackground);
            border: 1px solid var(--vscode-inputValidation-infoBorder);
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 20px;
        }

        .beta-notice p {
            font-size: 13px;
            color: var(--vscode-foreground);
            margin: 0;
        }

        .onboarding-steps {
            list-style: none;
            counter-reset: step-counter;
        }

        .onboarding-steps li {
            counter-increment: step-counter;
            position: relative;
            padding-left: 40px;
            margin-bottom: 16px;
            font-size: 13px;
            color: var(--vscode-foreground);
        }

        .onboarding-steps li::before {
            content: counter(step-counter);
            position: absolute;
            left: 0;
            top: 0;
            width: 28px;
            height: 28px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 12px;
        }

        .step-description {
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
            margin-top: 4px;
            line-height: 1.5;
        }

        .action-links {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 16px;
        }

        .action-link {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
            font-size: 13px;
            padding: 8px 12px;
            border-radius: 3px;
            transition: background-color 0.2s;
            cursor: pointer;
            border: none;
            background: transparent;
            text-align: left;
        }

        .action-link:hover {
            background-color: var(--vscode-list-hoverBackground);
            text-decoration: underline;
        }

        .highlight {
            color: var(--vscode-textLink-activeForeground);
            font-weight: 600;
        }

        .feature-list {
            list-style: none;
            margin-top: 12px;
        }

        .feature-list li {
            padding: 8px 0;
            padding-left: 20px;
            position: relative;
            font-size: 13px;
            color: var(--vscode-foreground);
        }

        .feature-list li::before {
            content: "✓";
            position: absolute;
            left: 0;
            color: var(--vscode-charts-green);
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-title">
                <img src="${logoUri}" alt="Rev Cloud Blueprint" class="logo" />
                <div class="title-text">
                    <h1>Welcome to Rev Cloud Blueprint!</h1>
                    <p>Your Salesforce Revenue Cloud Testing Companion</p>
                </div>
            </div>
            <button class="done-button" onclick="handleDone()">Done</button>
        </div>

        <div class="beta-notice">
            <p><strong>🚀 Public Beta:</strong> You are currently in the free Public Beta. All features are enabled!</p>
        </div>

        <div class="welcome-content">
            <div class="section">
                <div class="section-title">
                    <span class="section-icon">🎯</span>
                    <span>Getting Started</span>
                </div>
                <div class="section-content">
                    <p>Rev Cloud Blueprint helps you validate Salesforce Revenue Cloud pricing with zero-touch automation. Here's how to begin:</p>
                    <ol class="onboarding-steps">
                        <li>
                            <strong>Create Your First Snapshot</strong>
                            <div class="step-description">Click the <span class="highlight">+ button</span> in the main view to capture a pricing snapshot from your Salesforce org.</div>
                        </li>
                        <li>
                            <strong>Organize with Groups</strong>
                            <div class="step-description">Use the <span class="highlight">folder icon</span> to create groups and organize your test scenarios.</div>
                        </li>
                        <li>
                            <strong>Run Your Tests</strong>
                            <div class="step-description">Click the <span class="highlight">play icon</span> to run individual tests or batch tests on groups.</div>
                        </li>
                    </ol>
                </div>
            </div>

            <div class="section">
                <div class="section-title">
                    <span class="section-icon">💎</span>
                    <span>Key Features</span>
                </div>
                <div class="section-content">
                    <ul class="feature-list">
                        <li>Zero-touch pricing validation across environments</li>
                        <li>Smart test organization with hierarchical groups</li>
                        <li>Lightning-fast regression testing with Git integration</li>
                        <li>Executive-ready HTML reports with PDF export</li>
                        <li>Seamless multi-org workflows with CLI authentication</li>
                    </ul>
                </div>
            </div>

            <div class="section">
                <div class="section-title">
                    <span class="section-icon">📚</span>
                    <span>Quick Actions</span>
                </div>
                <div class="action-links">
                    <button class="action-link" onclick="handleOpenSettings()">
                        <span>⚙️</span>
                        <span>Configure Settings</span>
                    </button>
                    <button class="action-link" onclick="handleLearnMore()">
                        <span>🔗</span>
                        <span>Learn More & Documentation</span>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function handleDone() {
            vscode.postMessage({ command: 'done' });
        }

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
}

