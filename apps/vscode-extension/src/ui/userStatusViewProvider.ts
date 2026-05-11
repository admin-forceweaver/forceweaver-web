import * as vscode from 'vscode';
import * as path from 'path';
import { DeviceFlowService, DeviceFlowState } from '../services/deviceFlowService';
import { getLicenseState, clearLicenseCache } from '../services/licenseService';

/**
 * Represents the different states the User Status View can be in
 */
interface UserStatusState {
    type: 'unlicensed' | 'activating' | 'polling' | 'licensed' | 'error';
    data?: any;
}

export class UserStatusViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'revCloudBlueprint.userStatusView';

    private _view?: vscode.WebviewView;
    private _currentState: UserStatusState = { type: 'unlicensed' };
    private _deviceFlowService?: DeviceFlowService;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _context: vscode.ExtensionContext
    ) { }

    /**
     * Update the webview state and trigger re-render
     */
    public updateState(newState: UserStatusState): void {
        this._currentState = newState;
        if (this._view) {
            this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            // Allow scripts in the webview for the Done button
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        // Initialize device flow service
        this._deviceFlowService = new DeviceFlowService(this._context);
        
        // Subscribe to device flow state changes
        this._deviceFlowService.onStateChange(state => {
            this._handleDeviceFlowStateChange(state);
        });

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'activate':
                        await this._handleActivate();
                        break;
                    case 'cancelActivation':
                        this._deviceFlowService?.cancelActivation();
                        break;
                    case 'manage':
                        await this._handleManage();
                        break;
                    case 'refresh':
                        await this._handleRefresh();
                        break;
                    case 'retry':
                        await this._handleActivate();
                        break;
                    case 'done':
                        // Close the user status view by setting context to false
                        await this._context.workspaceState.update('revCloudBlueprint.showUserStatus', false);
                        await vscode.commands.executeCommand('setContext', 'revCloudBlueprint.showUserStatus', false);
                        return;
                }
            },
            undefined,
            []
        );

        // Initial render
        this._renderCurrentState();
    }

    /**
     * Handle activate command from webview
     */
    private async _handleActivate(): Promise<void> {
        try {
            await this._deviceFlowService?.initiateActivation();
        } catch (error: any) {
            vscode.window.showErrorMessage(`Activation failed: ${error.message}`);
        }
    }

    /**
     * Handle device flow state changes and update UI accordingly
     */
    private _handleDeviceFlowStateChange(state: DeviceFlowState): void {
        // Map device flow state to UI state
        switch (state.status) {
            case 'initiating':
                this.updateState({ type: 'activating' });
                break;
            case 'polling':
                this.updateState({ 
                    type: 'polling', 
                    data: {
                        userCode: state.userCode,
                        verificationUri: state.verificationUri,
                        expiresAt: state.expiresAt
                    }
                });
                break;
            case 'success':
                // Refresh license state and show licensed view
                this._refreshToLicensedState();
                break;
            case 'error':
                this.updateState({ 
                    type: 'error', 
                    data: { message: state.message }
                });
                break;
            case 'cancelled':
                this.updateState({ type: 'unlicensed' });
                break;
        }
    }

    /**
     * Refresh to licensed state after successful activation
     */
    private async _refreshToLicensedState(): Promise<void> {
        clearLicenseCache(this._context);
        const licenseState = await getLicenseState(this._context);
        this.updateState({ 
            type: 'licensed', 
            data: licenseState 
        });
    }

    /**
     * Handle manage license command
     */
    private async _handleManage(): Promise<void> {
        // Open license management page in browser
        vscode.env.openExternal(vscode.Uri.parse('https://sfapp.forceweaver.com/dashboard'));
    }

    /**
     * Handle refresh license status command
     */
    private async _handleRefresh(): Promise<void> {
        clearLicenseCache(this._context);
        await this._renderCurrentState();
        vscode.window.showInformationMessage('License status refreshed');
    }

    /**
     * Render the current state based on whether user has a token
     */
    private async _renderCurrentState(): Promise<void> {
        // Check if user has device token
        const hasToken = await this._context.secrets.get('revCloudBlueprint.deviceToken');
        
        if (!hasToken) {
            this.updateState({ type: 'unlicensed' });
        } else {
            const licenseState = await getLicenseState(this._context);
            this.updateState({ 
                type: 'licensed', 
                data: licenseState 
            });
        }
    }

    /**
     * Generate HTML based on current state
     */
    private _getHtmlForWebview(webview: vscode.Webview): string {
        switch (this._currentState.type) {
            case 'unlicensed':
                return this._renderUnlicensedState(webview);
            case 'activating':
                return this._renderActivatingState(webview);
            case 'polling':
                return this._renderPollingState(webview);
            case 'licensed':
                return this._renderLicensedState(webview);
            case 'error':
                return this._renderErrorState(webview);
            default:
                return this._renderUnlicensedState(webview);
        }
    }

    /**
     * Render the Unlicensed State - shown when no device token exists
     */
    private _renderUnlicensedState(webview: vscode.Webview): string {
        // Get the local path to the logo image
        const logoPath = vscode.Uri.joinPath(this._extensionUri, 'images', 'rcb_logo_color.png');
        const logoUri = webview.asWebviewUri(logoPath);

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Rev Cloud Blueprint - User Status</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        font-weight: var(--vscode-font-weight);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-sideBar-background);
                        margin: 0;
                        padding: 0;
                        line-height: 1.6;
                        height: 100vh;
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 12px 16px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                        background-color: var(--vscode-sideBar-background);
                    }
                    
                    .header-title {
                        font-size: 1.1em;
                        font-weight: 600;
                        color: var(--vscode-sideBarTitle-foreground);
                        margin: 0;
                    }
                    
                    .done-button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 6px 16px;
                        border-radius: 4px;
                        font-size: 0.9em;
                        font-weight: 500;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    }
                    
                    .done-button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    
                    .content {
                        flex: 1;
                        padding: 20px;
                        text-align: center;
                        overflow-y: auto;
                    }
                    
                    .logo {
                        width: 80px;
                        height: 80px;
                        margin: 0 auto 20px auto;
                        display: block;
                        border-radius: 8px;
                    }
                    
                    .welcome-title {
                        font-size: 1.4em;
                        font-weight: 600;
                        margin: 0 0 16px 0;
                        color: var(--vscode-titleBar-activeForeground);
                    }
                    
                    .beta-info {
                        background-color: var(--vscode-textBlockQuote-background);
                        border-left: 4px solid var(--vscode-textBlockQuote-border);
                        padding: 12px 16px;
                        margin: 16px 0;
                        border-radius: 4px;
                        text-align: left;
                    }
                    
                    .beta-info p {
                        margin: 0 0 8px 0;
                        color: var(--vscode-editor-foreground);
                    }
                    
                    .beta-info p:last-child {
                        margin-bottom: 0;
                    }
                    
                    .status-badge {
                        display: inline-block;
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        padding: 4px 12px;
                        border-radius: 12px;
                        font-size: 0.85em;
                        font-weight: 500;
                        margin: 8px 0;
                    }
                    
                    .description {
                        color: var(--vscode-descriptionForeground);
                        font-size: 0.95em;
                        margin: 16px 0;
                        text-align: left;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2 class="header-title">Profile</h2>
                    <button class="done-button" onclick="sendDone()">Done</button>
                </div>
                
                <div class="content">
                    <img src="${logoUri}" alt="Rev Cloud Blueprint Logo" class="logo" />
                    
                    <h1 class="welcome-title">Welcome to Rev Cloud Blueprint!</h1>
                    
                    <div class="status-badge">🎉 Public Beta - Free Access</div>
                    
                    <div class="beta-info">
                        <p><strong>Early Adopter Program</strong></p>
                        <p>All professional features are currently enabled for free during our Public Beta period. No sign-in is required at this time.</p>
                        <p>We invite you to use the tool and provide feedback to help shape its future development.</p>
                    </div>
                    
                    <div class="description">
                        <p>Rev Cloud Blueprint is a comprehensive testing framework for Salesforce Revenue Cloud, specializing in pricing validation and regression testing.</p>
                        <p>Get started by creating your first pricing snapshot using the ➕ button in the main view.</p>
                    </div>
                </div>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function sendDone() {
                        vscode.postMessage({ command: 'done' });
                    }
                </script>
            </body>
            </html>`;
    }

    /**
     * Render the Activating State - shown during API call to initiate activation
     */
    private _renderActivatingState(webview: vscode.Webview): string {
        const logoPath = vscode.Uri.joinPath(this._extensionUri, 'images', 'rcb_logo_color.png');
        const logoUri = webview.asWebviewUri(logoPath);

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Activating License</title>
                <style>
                    ${this._getCommonStyles()}
                    .spinner {
                        border: 4px solid var(--vscode-button-secondaryBackground);
                        border-top: 4px solid var(--vscode-button-background);
                        border-radius: 50%;
                        width: 50px;
                        height: 50px;
                        animation: spin 1s linear infinite;
                        margin: 20px auto;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    .activating-message {
                        font-size: 1.1em;
                        color: var(--vscode-foreground);
                        margin: 16px 0;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2 class="header-title">Activating License</h2>
                    <button class="done-button" onclick="sendDone()">Done</button>
                </div>
                <div class="content">
                    <img src="${logoUri}" alt="Rev Cloud Blueprint Logo" class="logo" />
                    <div class="spinner"></div>
                    <div class="activating-message">Connecting to activation server...</div>
                    <p class="description">Please wait while we initialize the license activation process.</p>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    function sendDone() {
                        vscode.postMessage({ command: 'done' });
                    }
                </script>
            </body>
            </html>`;
    }

    /**
     * Render the Polling State - shown with device code while waiting for authorization
     */
    private _renderPollingState(webview: vscode.Webview): string {
        const logoPath = vscode.Uri.joinPath(this._extensionUri, 'images', 'rcb_logo_color.png');
        const logoUri = webview.asWebviewUri(logoPath);
        
        const { userCode, verificationUri, expiresAt } = this._currentState.data || {};
        const remainingTime = expiresAt ? Math.ceil((expiresAt - Date.now()) / 1000 / 60) : 15;

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Device Authorization</title>
                <style>
                    ${this._getCommonStyles()}
                    .device-code {
                        font-size: 2.5em;
                        font-weight: 700;
                        letter-spacing: 8px;
                        color: var(--vscode-button-background);
                        background-color: var(--vscode-input-background);
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                        font-family: 'Courier New', monospace;
                        border: 2px solid var(--vscode-button-background);
                    }
                    .verification-link {
                        display: inline-block;
                        color: var(--vscode-textLink-foreground);
                        text-decoration: none;
                        font-size: 1.1em;
                        padding: 8px 16px;
                        border-radius: 4px;
                        margin: 16px 0;
                    }
                    .verification-link:hover {
                        text-decoration: underline;
                    }
                    .instructions {
                        background-color: var(--vscode-textBlockQuote-background);
                        border-left: 4px solid var(--vscode-textBlockQuote-border);
                        padding: 16px;
                        margin: 20px 0;
                        border-radius: 4px;
                        text-align: left;
                    }
                    .instructions ol {
                        margin: 8px 0;
                        padding-left: 20px;
                    }
                    .instructions li {
                        margin: 8px 0;
                    }
                    .timer {
                        color: var(--vscode-descriptionForeground);
                        font-size: 0.9em;
                        margin: 16px 0;
                    }
                    .button-group {
                        margin-top: 20px;
                    }
                    .cancel-button {
                        background-color: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                        border: none;
                        padding: 10px 24px;
                        border-radius: 4px;
                        font-size: 1em;
                        cursor: pointer;
                        margin: 8px;
                    }
                    .cancel-button:hover {
                        background-color: var(--vscode-button-secondaryHoverBackground);
                    }
                    .pulse {
                        animation: pulse 2s ease-in-out infinite;
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2 class="header-title">Authorize Device</h2>
                    <button class="done-button" onclick="sendDone()">Done</button>
                </div>
                <div class="content">
                    <img src="${logoUri}" alt="Rev Cloud Blueprint Logo" class="logo" />
                    
                    <h2 class="welcome-title pulse">Waiting for Authorization...</h2>
                    
                    <p>Enter this code in your browser:</p>
                    <div class="device-code">${userCode || 'XXXX-XXXX'}</div>
                    
                    <a href="${verificationUri || '#'}" class="verification-link" onclick="openBrowser()">
                        🌐 Open Browser (${verificationUri || 'loading...'})
                    </a>
                    
                    <div class="instructions">
                        <strong>To activate your license:</strong>
                        <ol>
                            <li>Copy the device code shown above</li>
                            <li>Click the link or paste this URL in your browser: <br><code>${verificationUri || 'loading...'}</code></li>
                            <li>Log in to your account</li>
                            <li>Enter the device code when prompted</li>
                            <li>Return here - activation will complete automatically!</li>
                        </ol>
                    </div>
                    
                    <div class="timer">⏱️ Code expires in ~${remainingTime} minutes</div>
                    
                    <div class="button-group">
                        <button class="cancel-button" onclick="cancelActivation()">Cancel Activation</button>
                    </div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function sendDone() {
                        vscode.postMessage({ command: 'done' });
                    }
                    
                    function openBrowser() {
                        // The external browser will already be opened by the extension
                        return true;
                    }
                    
                    function cancelActivation() {
                        vscode.postMessage({ command: 'cancelActivation' });
                    }
                </script>
            </body>
            </html>`;
    }

    /**
     * Render the Licensed State - shown when user has a valid license
     */
    private _renderLicensedState(webview: vscode.Webview): string {
        const logoPath = vscode.Uri.joinPath(this._extensionUri, 'images', 'rcb_logo_color.png');
        const logoUri = webview.asWebviewUri(logoPath);
        
        const licenseData = this._currentState.data || {};
        const tier = licenseData.tier || 'free';
        const isPro = licenseData.isPro || false;
        const expiresAt = licenseData.expiresAt;
        const lastValidated = licenseData.lastValidated;
        const statusMessage = licenseData.statusMessage || 'Licensed';

        const tierBadgeColor = isPro ? '#28a745' : '#6c757d';
        const tierEmoji = tier === 'enterprise' ? '💎' : tier === 'pro' ? '⭐' : '🆓';
        
        let expiryText = '';
        if (expiresAt) {
            const expiryDate = new Date(expiresAt);
            expiryText = `Expires: ${expiryDate.toLocaleDateString()}`;
        }

        let lastValidatedText = '';
        if (lastValidated) {
            const validatedDate = new Date(lastValidated);
            const minutesAgo = Math.floor((Date.now() - lastValidated) / 1000 / 60);
            lastValidatedText = minutesAgo < 60 
                ? `Last checked: ${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago`
                : `Last checked: ${validatedDate.toLocaleString()}`;
        }

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>License Active</title>
                <style>
                    ${this._getCommonStyles()}
                    .tier-badge {
                        display: inline-block;
                        background-color: ${tierBadgeColor};
                        color: white;
                        padding: 8px 20px;
                        border-radius: 20px;
                        font-size: 1.1em;
                        font-weight: 600;
                        margin: 16px 0;
                    }
                    .license-details {
                        background-color: var(--vscode-textBlockQuote-background);
                        border-left: 4px solid ${tierBadgeColor};
                        padding: 16px;
                        margin: 20px 0;
                        border-radius: 4px;
                        text-align: left;
                    }
                    .license-details p {
                        margin: 8px 0;
                    }
                    .feature-list {
                        text-align: left;
                        margin: 16px 0;
                    }
                    .feature-list h3 {
                        margin: 8px 0;
                    }
                    .feature-list ul {
                        margin: 8px 0;
                        padding-left: 20px;
                    }
                    .feature-list li {
                        margin: 6px 0;
                    }
                    .action-buttons {
                        margin-top: 24px;
                    }
                    .action-button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 10px 20px;
                        border-radius: 4px;
                        font-size: 0.95em;
                        cursor: pointer;
                        margin: 8px 4px;
                    }
                    .action-button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .secondary-button {
                        background-color: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                    }
                    .secondary-button:hover {
                        background-color: var(--vscode-button-secondaryHoverBackground);
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2 class="header-title">License Status</h2>
                    <button class="done-button" onclick="sendDone()">Done</button>
                </div>
                <div class="content">
                    <img src="${logoUri}" alt="Rev Cloud Blueprint Logo" class="logo" />
                    
                    <h2 class="welcome-title">✅ License Active</h2>
                    
                    <div class="tier-badge">${tierEmoji} ${tier.toUpperCase()} TIER</div>
                    
                    <div class="license-details">
                        <p><strong>Status:</strong> ${statusMessage}</p>
                        ${expiryText ? `<p><strong>${expiryText}</strong></p>` : ''}
                        ${lastValidatedText ? `<p style="color: var(--vscode-descriptionForeground); font-size: 0.9em;">${lastValidatedText}</p>` : ''}
                    </div>
                    
                    ${isPro ? `
                        <div class="feature-list">
                            <h3>🎉 Your Pro Features:</h3>
                            <ul>
                                <li>✅ Batch Testing - Run all tests at once</li>
                                <li>✅ Smart Group Management - Organize snapshots</li>
                                <li>✅ PDF Export - Professional reports</li>
                                <li>✅ Priority Support - Direct assistance</li>
                            </ul>
                        </div>
                    ` : `
                        <div class="feature-list">
                            <h3>Free Tier Features:</h3>
                            <ul>
                                <li>✅ Create pricing snapshots</li>
                                <li>✅ Run individual tests</li>
                                <li>✅ View detailed reports</li>
                                <li>✅ Export to HTML</li>
                            </ul>
                            <p style="margin-top: 16px;">
                                <a href="https://sfapp.forceweaver.com/pricing" style="color: var(--vscode-textLink-foreground);">
                                    Upgrade to Pro →
                                </a>
                            </p>
                        </div>
                    `}
                    
                    <div class="action-buttons">
                        <button class="action-button" onclick="manageLicense()">Manage License</button>
                        <button class="action-button secondary-button" onclick="refreshStatus()">Refresh Status</button>
                    </div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function sendDone() {
                        vscode.postMessage({ command: 'done' });
                    }
                    
                    function manageLicense() {
                        vscode.postMessage({ command: 'manage' });
                    }
                    
                    function refreshStatus() {
                        vscode.postMessage({ command: 'refresh' });
                    }
                </script>
            </body>
            </html>`;
    }

    /**
     * Render the Error State - shown when activation fails or errors occur
     */
    private _renderErrorState(webview: vscode.Webview): string {
        const logoPath = vscode.Uri.joinPath(this._extensionUri, 'images', 'rcb_logo_color.png');
        const logoUri = webview.asWebviewUri(logoPath);
        
        const errorData = this._currentState.data || {};
        const errorMessage = errorData.message || 'An unexpected error occurred during license activation.';

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Activation Error</title>
                <style>
                    ${this._getCommonStyles()}
                    .error-icon {
                        font-size: 4em;
                        margin: 20px 0;
                    }
                    .error-message {
                        background-color: var(--vscode-inputValidation-errorBackground);
                        border: 1px solid var(--vscode-inputValidation-errorBorder);
                        color: var(--vscode-foreground);
                        padding: 16px;
                        border-radius: 4px;
                        margin: 20px 0;
                        text-align: left;
                    }
                    .troubleshooting {
                        background-color: var(--vscode-textBlockQuote-background);
                        border-left: 4px solid var(--vscode-textBlockQuote-border);
                        padding: 16px;
                        margin: 20px 0;
                        border-radius: 4px;
                        text-align: left;
                    }
                    .troubleshooting h3 {
                        margin-top: 0;
                    }
                    .troubleshooting ul {
                        margin: 8px 0;
                        padding-left: 20px;
                    }
                    .troubleshooting li {
                        margin: 6px 0;
                    }
                    .button-group {
                        margin-top: 24px;
                    }
                    .retry-button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 10px 24px;
                        border-radius: 4px;
                        font-size: 1em;
                        cursor: pointer;
                        margin: 8px 4px;
                    }
                    .retry-button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    .cancel-button {
                        background-color: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                        border: none;
                        padding: 10px 24px;
                        border-radius: 4px;
                        font-size: 1em;
                        cursor: pointer;
                        margin: 8px 4px;
                    }
                    .cancel-button:hover {
                        background-color: var(--vscode-button-secondaryHoverBackground);
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2 class="header-title">Activation Error</h2>
                    <button class="done-button" onclick="sendDone()">Done</button>
                </div>
                <div class="content">
                    <img src="${logoUri}" alt="Rev Cloud Blueprint Logo" class="logo" />
                    
                    <div class="error-icon">⚠️</div>
                    <h2 class="welcome-title">Activation Failed</h2>
                    
                    <div class="error-message">
                        <strong>Error:</strong> ${this._escapeHtml(errorMessage)}
                    </div>
                    
                    <div class="troubleshooting">
                        <h3>💡 Troubleshooting Tips:</h3>
                        <ul>
                            <li>Check your internet connection</li>
                            <li>Ensure you're logged in to your account</li>
                            <li>Verify the device code hasn't expired</li>
                            <li>Try closing and reopening this view</li>
                            <li>Contact support if the issue persists</li>
                        </ul>
                    </div>
                    
                    <div class="button-group">
                        <button class="retry-button" onclick="retryActivation()">🔄 Retry Activation</button>
                        <button class="cancel-button" onclick="cancel()">Cancel</button>
                    </div>
                    
                    <p style="margin-top: 20px; color: var(--vscode-descriptionForeground); font-size: 0.9em;">
                        Need help? Visit <a href="https://sfapp.forceweaver.com/support" style="color: var(--vscode-textLink-foreground);">our support page</a>
                    </p>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    
                    function sendDone() {
                        vscode.postMessage({ command: 'done' });
                    }
                    
                    function retryActivation() {
                        vscode.postMessage({ command: 'retry' });
                    }
                    
                    function cancel() {
                        vscode.postMessage({ command: 'cancelActivation' });
                    }
                </script>
            </body>
            </html>`;
    }

    /**
     * Common styles shared across all states
     */
    private _getCommonStyles(): string {
        return `
            body {
                font-family: var(--vscode-font-family);
                font-size: var(--vscode-font-size);
                font-weight: var(--vscode-font-weight);
                color: var(--vscode-foreground);
                background-color: var(--vscode-sideBar-background);
                margin: 0;
                padding: 0;
                line-height: 1.6;
                height: 100vh;
                display: flex;
                flex-direction: column;
            }
            
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid var(--vscode-panel-border);
                background-color: var(--vscode-sideBar-background);
            }
            
            .header-title {
                font-size: 1.1em;
                font-weight: 600;
                color: var(--vscode-sideBarTitle-foreground);
                margin: 0;
            }
            
            .done-button {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 6px 16px;
                border-radius: 4px;
                font-size: 0.9em;
                font-weight: 500;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .done-button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
            
            .content {
                flex: 1;
                padding: 20px;
                text-align: center;
                overflow-y: auto;
            }
            
            .logo {
                width: 80px;
                height: 80px;
                margin: 0 auto 20px auto;
                display: block;
                border-radius: 8px;
            }
            
            .welcome-title {
                font-size: 1.4em;
                font-weight: 600;
                margin: 0 0 16px 0;
                color: var(--vscode-titleBar-activeForeground);
            }
            
            .description {
                color: var(--vscode-descriptionForeground);
                font-size: 0.95em;
                margin: 16px 0;
                text-align: left;
            }

            .primary-button {
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 12px 32px;
                border-radius: 4px;
                font-size: 1.1em;
                font-weight: 500;
                cursor: pointer;
                margin: 20px 0;
                transition: background-color 0.2s;
            }
            
            .primary-button:hover {
                background-color: var(--vscode-button-hoverBackground);
            }
        `;
    }

    /**
     * Escape HTML to prevent XSS
     */
    private _escapeHtml(text: string): string {
        const div = vscode.workspace.textDocuments[0] ? document.createElement('div') : { textContent: '' };
        if (typeof div === 'object' && 'textContent' in div) {
            div.textContent = text;
            return (div as any).innerHTML || text;
        }
        return text.replace(/[&<>"']/g, (char) => {
            const escapeMap: { [key: string]: string } = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            };
            return escapeMap[char];
        });
    }
}
