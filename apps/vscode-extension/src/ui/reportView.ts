import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TestResult } from '../test/runner';
import { Comparator } from '../test/comparator';
import { ApiUtilityService } from '../services/apiUtilityService';
import { getLicenseState } from '../services/licenseService';

export class ReportView {
    private panel: vscode.WebviewPanel | undefined;
    private context: vscode.ExtensionContext;
    private comparator: Comparator;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.comparator = new Comparator();
    }

    /**
     * Show test result in webview panel
     */
    async showTestResult(testResult: TestResult): Promise<void> {
        console.log('[DEBUG] 🎯 reportView.showTestResult called');
        console.log(`[DEBUG] 📋 Input testResult validation:`);
        console.log(`[DEBUG]    - testResult present: ${!!testResult}`);
        console.log(`[DEBUG]    - testResult type: ${typeof testResult}`);
        console.log(`[DEBUG]    - testResult.success: ${testResult?.success}`);
        console.log(`[DEBUG]    - testResult.comparison: ${!!testResult?.comparison}`);
        console.log(`[DEBUG]    - testResult.actualQuoteData: ${!!testResult?.actualQuoteData}`);
        console.log(`[DEBUG]    - testResult.snapshot: ${!!testResult?.snapshot}`);
        console.log(`[DEBUG]    - testResult.errors count: ${testResult?.errors?.length || 0}`);
        
        if (testResult?.errors && testResult.errors.length > 0) {
            console.log('[DEBUG] ⚠️ Test result contains errors:');
            testResult.errors.forEach((error, index) => {
                console.log(`[DEBUG]    ${index + 1}. ${error}`);
            });
        }
        
        const panel = this.getOrCreatePanel('Pricing Test Result');
        console.log('[DEBUG] 📋 Webview panel created');
        
        // Enable JavaScript and local resource access for save functionality
        panel.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, 'src'))]
        };
        console.log('[DEBUG] 📋 Webview options configured');
        
        // Show detailed comparison report if we have comparison data, regardless of success/failure
        // (Failed tests with pricing discrepancies should still show side-by-side comparison)
        if (testResult.comparison && testResult.actualQuoteData) {
            try {
                // Generate the enhanced report with proper error handling
                console.log('[DEBUG] 📊 Generating enhanced comparison report (success or failure with comparison data)...');
                console.log(`[DEBUG] 🎯 Report generation inputs validation:`);
                console.log(`[DEBUG]    - testResult.success: ${testResult.success}`);
                console.log(`[DEBUG]    - testResult.comparison present: ${!!testResult.comparison}`);
                console.log(`[DEBUG]    - testResult.actualQuoteData present: ${!!testResult.actualQuoteData}`);
                console.log(`[DEBUG]    - testResult.snapshot present: ${!!testResult.snapshot}`);
                console.log(`[DEBUG]    - testResult.createdQuoteId: ${testResult.createdQuoteId || 'N/A'}`);
                
                if (testResult.comparison) {
                    console.log(`[DEBUG] 🔍 Comparison structure validation:`);
                    console.log(`[DEBUG]    - comparison.overallMatch: ${testResult.comparison.overallMatch}`);
                    console.log(`[DEBUG]    - comparison.quote present: ${!!testResult.comparison.quote}`);
                    console.log(`[DEBUG]    - comparison.lineItems present: ${!!testResult.comparison.lineItems}`);
                    console.log(`[DEBUG]    - comparison.summary present: ${!!testResult.comparison.summary}`);
                }
                
                if (testResult.actualQuoteData) {
                    console.log(`[DEBUG] 🔍 Actual quote data validation:`);
                    console.log(`[DEBUG]    - actualQuoteData.Id: ${testResult.actualQuoteData.Id || 'N/A'}`);
                    console.log(`[DEBUG]    - actualQuoteData.Name: ${testResult.actualQuoteData.Name || 'N/A'}`);
                    console.log(`[DEBUG]    - actualQuoteData.QuoteLines count: ${testResult.actualQuoteData.QuoteLines?.length || 0}`);
                }
                
                console.log(`[DEBUG] 🚀 Calling generateEnhancedReport with validated inputs...`);
                const htmlContent = this.comparator.generateEnhancedReport(
                    testResult.comparison,
                    testResult.snapshot,
                    testResult.actualQuoteData,
                    testResult
                );
                console.log('[DEBUG] ✅ Report generation successful');
                console.log(`[DEBUG] 📄 Generated HTML content length: ${htmlContent?.length || 0} characters`);
                panel.webview.html = htmlContent;
                
                // Ensure the panel is revealed and brought to the front
                setTimeout(() => {
                    panel.reveal(vscode.ViewColumn.One, false); // false = don't take focus from editor if it's the active document
                }, 100);
                
                // Handle webview messages (for save button functionality)
                panel.webview.onDidReceiveMessage(
                    message => {
                        switch (message.command) {
                            case 'saveReport':
                                this.saveReportToFile(message.htmlContent, testResult);
                                break;
                            case 'exportPDF':
                                this.exportReportToPDF(message.htmlContent, testResult);
                                break;
                        }
                    },
                    undefined,
                    this.context.subscriptions
                );
            } catch (error: any) {
                // Handle report generation errors properly
                console.error('[ERROR] ❌ Report generation failed:', error);
                console.error(`[ERROR] 📋 Report generation error type: ${error.constructor?.name || 'Unknown'}`);
                console.error(`[ERROR] 📋 Report generation error message: ${error.message || 'No message'}`);
                console.error(`[ERROR] 📋 Report generation error stack: ${error.stack || 'No stack trace'}`);
                
                // Additional debugging for the error context
                console.log(`[DEBUG] 🔬 Error context analysis:`);
                console.log(`[DEBUG]    - testResult type: ${typeof testResult}`);
                console.log(`[DEBUG]    - testResult.comparison type: ${typeof testResult.comparison}`);
                console.log(`[DEBUG]    - testResult.snapshot type: ${typeof testResult.snapshot}`);
                console.log(`[DEBUG]    - testResult.actualQuoteData type: ${typeof testResult.actualQuoteData}`);
                
                if (error.message?.includes('Cannot read properties of')) {
                    console.log(`[DEBUG] 🔍 Property access error detected - this is likely the root cause!`);
                    console.log(`[DEBUG] 🔍 Checking object structures...`);
                    
                    if (testResult.comparison) {
                        console.log(`[DEBUG]    - comparison.quote exists: ${!!testResult.comparison.quote}`);
                        console.log(`[DEBUG]    - comparison.lineItems exists: ${!!testResult.comparison.lineItems}`);
                        console.log(`[DEBUG]    - comparison.summary exists: ${!!testResult.comparison.summary}`);
                    }
                }
                
                // Create a modified test result with the error for proper error display
                const errorTestResult: TestResult = {
                    ...testResult,
                    success: false,
                    errors: [
                        'Report generation failed: ' + (error.message || 'Unknown error during report generation'),
                        'The pricing test execution completed successfully, but the results could not be displayed.',
                        'Check the console output for detailed comparison results.',
                        '',
                        `Technical details: ${error.constructor?.name || 'Error'} - ${error.message || 'No details'}`
                    ]
                };
                
                console.log('[DEBUG] 🔧 Generating error report as fallback...');
                try {
                    panel.webview.html = this.generateErrorReport(errorTestResult);
                    console.log('[DEBUG] ✅ Error report generated successfully');
                } catch (errorReportError: any) {
                    console.error('[ERROR] 💥💥 Even error report generation failed:', errorReportError);
                    console.error(`[ERROR] 📋 Error report error: ${errorReportError.message}`);
                    
                    // Fallback to basic error message
                    panel.webview.html = `
                        <html><body>
                            <h1>Critical Error</h1>
                            <p>Both primary and error report generation failed.</p>
                            <p>Primary error: ${error.message}</p>
                            <p>Error report error: ${errorReportError.message}</p>
                            <p>Check VS Code Output Console for details.</p>
                        </body></html>
                    `;
                }
            }
        } else {
            // Show error report - only when we don't have comparison data (test execution failed)
            console.log('[DEBUG] ❌ Test execution failed or missing comparison data, showing error report');
            console.log(`[DEBUG] 📊 Error report context:`);
            console.log(`[DEBUG]    - testResult.success: ${testResult?.success}`);
            console.log(`[DEBUG]    - testResult.comparison: ${!!testResult?.comparison}`);
            console.log(`[DEBUG]    - testResult.actualQuoteData: ${!!testResult?.actualQuoteData}`);
            
            try {
                console.log('[DEBUG] 🔧 Generating error report...');
                panel.webview.html = this.generateErrorReport(testResult);
                console.log('[DEBUG] ✅ Error report generated successfully');
                
                // Ensure the panel is revealed and brought to the front
                setTimeout(() => {
                    panel.reveal(vscode.ViewColumn.One, false);
                }, 100);
                
            } catch (errorReportError: any) {
                console.error('[ERROR] 💥💥 Error report generation failed:', errorReportError);
                console.error(`[ERROR] 📋 Error report error: ${errorReportError.message}`);
                
                // Ultimate fallback
                panel.webview.html = `
                    <html><body>
                        <h1>Critical Error</h1>
                        <p>Error report generation failed.</p>
                        <p>Error: ${errorReportError.message}</p>
                        <p>Check VS Code Output Console for full details.</p>
                    </body></html>
                `;
                
                // Still reveal the panel even for error case
                setTimeout(() => {
                    panel.reveal(vscode.ViewColumn.One, false);
                }, 100);
            }
        }
    }

    /**
     * Show batch test results
     */
    async showBatchTestResults(batchResults: any): Promise<void> {
        console.log('[DEBUG] 🎯 showBatchTestResults called');
        console.log('[DEBUG] 📊 Batch results data:', {
            batchName: batchResults.batchName,
            hasResults: !!batchResults.results,
            resultsLength: batchResults.results?.length || 0,
            hasSummary: !!batchResults.summary
        });
        
        const panel = this.getOrCreatePanel(`Batch Test Results: ${batchResults.batchName}`);
        console.log('[DEBUG] 📋 Panel created/retrieved:', {
            panelExists: !!panel,
            panelTitle: panel.title,
            webviewExists: !!panel.webview
        });
        
        // Ensure webview options are properly configured for message handling
        panel.webview.options = {
            enableScripts: true,
            localResourceRoots: this.context.extensionPath 
                ? [vscode.Uri.file(path.join(this.context.extensionPath, 'src'))]
                : [this.context.extensionUri]
        };
        console.log('[DEBUG] ⚙️ Webview options configured:', panel.webview.options);
        
        if (batchResults.results && Array.isArray(batchResults.results)) {
            // New format from hierarchical tree provider - use compact table view
            console.log('[DEBUG] 📊 Using compact batch report format');
            panel.webview.html = this.generateCompactBatchReport(batchResults);
            console.log('[DEBUG] ✅ Compact batch report HTML set');
        } else {
            // Legacy format - assume it's TestResult[]
            console.log('[DEBUG] 📊 Using legacy batch report format');
            panel.webview.html = this.generateBatchReport(batchResults);
            console.log('[DEBUG] ✅ Legacy batch report HTML set');
        }
        
        // Set up message handlers AFTER setting HTML content (like individual reports)
        console.log('[DEBUG] 🔧 Setting up batch message handlers...');
        this.setupBatchMessageHandlers(panel, batchResults);
        console.log('[DEBUG] ✅ Batch message handlers setup completed');
    }

    /**
     * Get or create webview panel
     */
    private getOrCreatePanel(title: string): vscode.WebviewPanel {
        if (this.panel) {
            this.panel.title = title;
            // Clear existing content to show loading state while new content is being generated
            this.panel.webview.html = this.getLoadingHTML();
            this.panel.reveal(vscode.ViewColumn.One); // Bring existing panel to front
            return this.panel;
        }

        this.panel = vscode.window.createWebviewPanel(
            'pricingTestReport',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [this.context.extensionUri]
            }
        );

        // Handle panel disposal
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        }, null, this.context.subscriptions);

        // Set up message handlers
        this.setupMessageHandlers(this.panel);

        return this.panel;
    }

    /**
     * Generate loading HTML to show while new content is being prepared
     */
    private getLoadingHTML(): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Loading...</title>
                <style>
                    body {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        font-family: var(--vscode-font-family);
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                    }
                    .loading-container {
                        text-align: center;
                    }
                    .spinner {
                        border: 4px solid var(--vscode-progressBar-background);
                        border-top: 4px solid var(--vscode-progressBar-foreground);
                        border-radius: 50%;
                        width: 50px;
                        height: 50px;
                        animation: spin 1s linear infinite;
                        margin: 0 auto 20px;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                    .loading-text {
                        font-size: 16px;
                        color: var(--vscode-foreground);
                        margin-top: 10px;
                    }
                    .loading-subtext {
                        font-size: 14px;
                        color: var(--vscode-descriptionForeground);
                        margin-top: 5px;
                    }
                </style>
            </head>
            <body>
                <div class="loading-container">
                    <div class="spinner"></div>
                    <div class="loading-text">Loading Test Results...</div>
                    <div class="loading-subtext">Generating comparison report</div>
                </div>
            </body>
            </html>
        `;
    }

    /**
     * Set up message handlers for webview communication
     */
    private setupMessageHandlers(panel: vscode.WebviewPanel): void {
        // Check if the webview has the onDidReceiveMessage method (for testing compatibility)
        if (panel.webview && typeof panel.webview.onDidReceiveMessage === 'function') {
            // Set up message handlers (VS Code will handle duplicates automatically)
            panel.webview.onDidReceiveMessage(
                async (message) => {
                    console.log(`[DEBUG] 📨 Received message from webview:`, message);
                    switch (message.command) {
                        case 'saveReport':
                            console.log(`[DEBUG] 💾 Handling save report request`);
                            await this.handleSaveReport(message.data);
                            break;
                        case 'exportToPDF':
                            console.log(`[DEBUG] 📄 Handling export to PDF request`);
                            await this.handleExportToPDF(message.data);
                            break;
                        default:
                            console.log(`[DEBUG] ❓ Unknown message command: ${message.command}`);
                    }
                },
                null,
                this.context.subscriptions
            );
        } else {
            console.log(`[DEBUG] ⚠️ Webview does not support message handling (likely in test environment)`);
        }
    }

    /**
     * Set up message handlers specifically for batch reports
     */
    private setupBatchMessageHandlers(panel: vscode.WebviewPanel, batchResults: any): void {
        console.log(`[DEBUG] 🔧 setupBatchMessageHandlers called`);
        console.log(`[DEBUG] 📋 Panel details:`, {
            panelExists: !!panel,
            webviewExists: !!panel.webview,
            hasOnDidReceiveMessage: typeof panel.webview?.onDidReceiveMessage === 'function'
        });
        
        // Check if the webview has the onDidReceiveMessage method (for testing compatibility)
        if (panel.webview && typeof panel.webview.onDidReceiveMessage === 'function') {
            console.log(`[DEBUG] 🔧 Setting up batch message handlers - webview supports message handling`);
            
            // Set up message handlers for batch reports
            const messageHandler = panel.webview.onDidReceiveMessage(
                async (message) => {
                    console.log(`[DEBUG] 📨 Batch report received message:`, message);
                    console.log(`[DEBUG] 📨 Message command: ${message.command}`);
                    console.log(`[DEBUG] 📨 Message data:`, message.data);
                    
                    switch (message.command) {
                        case 'test':
                            console.log(`[DEBUG] ✅ Batch report test message received:`, message.data);
                            break;
                        case 'saveReport':
                            console.log(`[DEBUG] 💾 Handling batch save report request`);
                            await this.handleSaveReport(message.data);
                            break;
                        case 'exportPDF':
                            console.log(`[DEBUG] 📄 Handling batch export to PDF request`);
                            await this.handleExportToPDF(message.data);
                            break;
                        default:
                            console.log(`[DEBUG] ❓ Unknown batch message command: ${message.command}`);
                    }
                },
                null,
                this.context.subscriptions
            );
            
            console.log(`[DEBUG] ✅ Batch message handler registered:`, !!messageHandler);
        } else {
            console.log(`[DEBUG] ⚠️ Webview does not support message handling (likely in test environment)`);
            console.log(`[DEBUG] ⚠️ Webview details:`, {
                webview: !!panel.webview,
                onDidReceiveMessage: typeof panel.webview?.onDidReceiveMessage
            });
        }
    }

    /**
     * Generate error report HTML
     */
    private generateErrorReport(testResult: TestResult): string {
        const executionTimeFormatted = (testResult.executionTime / 1000).toFixed(2);
        
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test Failed</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 20px; 
            background-color: var(--vscode-editor-background); 
            color: var(--vscode-editor-foreground); 
        }
        .header { margin-bottom: 30px; }
        .status { font-size: 24px; font-weight: bold; margin-bottom: 10px; color: #F44336; }
        .error-box { 
            background-color: #ffebee; 
            border-left: 4px solid #F44336; 
            padding: 15px; 
            border-radius: 5px; 
            margin-bottom: 20px; 
        }
        .error-message { color: #d32f2f; font-weight: bold; margin-bottom: 15px; }
        .error-category { margin-bottom: 20px; }
        .error-category h4 { 
            color: #d32f2f; 
            margin: 0 0 10px 0; 
            font-size: 1.1em; 
            border-bottom: 1px solid #ffcdd2; 
            padding-bottom: 5px; 
        }
        .detailed-error { 
            background-color: #fff; 
            border: 1px solid #ffcdd2; 
            border-radius: 4px; 
            padding: 12px; 
            margin-bottom: 10px; 
        }
        .error-code { 
            font-weight: bold; 
            color: #c62828; 
            font-size: 0.9em; 
            margin-bottom: 5px; 
        }
        .error-user-message { 
            color: #d32f2f; 
            font-weight: 500; 
            margin-bottom: 5px; 
        }
        .error-technical { 
            color: #666; 
            font-size: 0.85em; 
            font-style: italic; 
            margin-bottom: 3px; 
        }
        .error-reference { 
            color: #888; 
            font-size: 0.8em; 
        }
        .metadata { font-size: 0.9em; color: var(--vscode-descriptionForeground); margin-bottom: 20px; }
        .section { margin-bottom: 20px; }
        .section h3 { color: var(--vscode-textLink-foreground); }
    </style>
</head>
<body>
    <div class="header">
        <div class="status">❌ TEST FAILED</div>
        <div class="metadata">
            <strong>Snapshot:</strong> ${testResult.snapshot.metadata.description || testResult.snapshot.metadata.sourceQuoteId}<br>
            <strong>Target Org:</strong> ${testResult.targetOrg.alias || testResult.targetOrg.username}<br>
            <strong>Execution Time:</strong> ${executionTimeFormatted}s
        </div>
    </div>

    ${this.generateDetailedErrorSection(testResult)}

    ${this.generateTroubleshootingSection(testResult)}

    <div class="section">
        <h3>Snapshot Information:</h3>
        <ul>
            <li><strong>Source Org:</strong> ${testResult.snapshot.metadata.sourceOrgAlias || testResult.snapshot.metadata.sourceOrgUsername}</li>
            <li><strong>Source Quote ID:</strong> ${testResult.snapshot.metadata.sourceQuoteId}</li>
            <li><strong>Line Items:</strong> ${testResult.snapshot.recreationPayload.lineItems.length}</li>
            <li><strong>Expected Total:</strong> $${testResult.snapshot.expectedResults.quoteFields.GrandTotal.toFixed(2)}</li>
        </ul>
    </div>
</body>
</html>
        `;
    }

    /**
     * Generate batch test report HTML
     */
    private generateBatchReport(testResults: TestResult[]): string {
        const totalTests = testResults.length;
        const passedTests = testResults.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;
        const successRate = ((passedTests / totalTests) * 100).toFixed(1);
        const avgExecutionTime = (testResults.reduce((sum, r) => sum + r.executionTime, 0) / totalTests / 1000).toFixed(2);

        let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Batch Test Results</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 20px; 
            background-color: var(--vscode-editor-background); 
            color: var(--vscode-editor-foreground); 
        }
        .header { margin-bottom: 30px; }
        .status { font-size: 24px; font-weight: bold; margin-bottom: 15px; }
        .status.passed { color: #4CAF50; }
        .status.partial { color: #FF9800; }
        .status.failed { color: #F44336; }
        .summary { 
            background-color: var(--vscode-editor-inlayHint-background); 
            padding: 20px; 
            border-radius: 5px; 
            margin-bottom: 30px; 
        }
        .summary-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 15px; 
        }
        .summary-item { text-align: center; }
        .summary-number { font-size: 32px; font-weight: bold; display: block; }
        .summary-label { font-size: 14px; color: var(--vscode-descriptionForeground); }
        .test-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); 
            gap: 20px; 
        }
        .test-card { 
            border: 1px solid var(--vscode-panel-border); 
            border-radius: 5px; 
            padding: 15px; 
        }
        .test-card.passed { border-color: #4CAF50; }
        .test-card.failed { border-color: #F44336; }
        .test-header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 10px; 
        }
        .test-title { font-weight: bold; }
        .test-status { font-size: 18px; }
        .test-details { font-size: 0.9em; color: var(--vscode-descriptionForeground); }
        .section-title { 
            color: var(--vscode-textLink-foreground); 
            border-bottom: 2px solid var(--vscode-textLink-foreground); 
            padding-bottom: 5px; 
            margin: 30px 0 20px 0; 
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="status ${passedTests === totalTests ? 'passed' : failedTests === totalTests ? 'failed' : 'partial'}">
            ${passedTests === totalTests ? '✅ ALL TESTS PASSED' : failedTests === totalTests ? '❌ ALL TESTS FAILED' : '⚠️ PARTIAL SUCCESS'}
        </div>
    </div>

    <div class="summary">
        <h3 style="margin-top: 0;">Batch Test Summary</h3>
        <div class="summary-grid">
            <div class="summary-item">
                <span class="summary-number" style="color: #4CAF50;">${passedTests}</span>
                <span class="summary-label">Passed</span>
            </div>
            <div class="summary-item">
                <span class="summary-number" style="color: #F44336;">${failedTests}</span>
                <span class="summary-label">Failed</span>
            </div>
            <div class="summary-item">
                <span class="summary-number">${successRate}%</span>
                <span class="summary-label">Success Rate</span>
            </div>
            <div class="summary-item">
                <span class="summary-number">${avgExecutionTime}s</span>
                <span class="summary-label">Avg Time</span>
            </div>
        </div>
    </div>

    <h2 class="section-title">Test Results (${totalTests} tests)</h2>
    <div class="test-grid">
`;

        // Add individual test cards
        testResults.forEach((result, index) => {
            const cardClass = result.success ? 'passed' : 'failed';
            const statusIcon = result.success ? '✅' : '❌';
            const executionTime = (result.executionTime / 1000).toFixed(2);
            
            html += `
        <div class="test-card ${cardClass}">
            <div class="test-header">
                <div class="test-title">${result.snapshot.metadata.description || `Test ${index + 1}`}</div>
                <div class="test-status">${statusIcon}</div>
            </div>
            <div class="test-details">
                <div><strong>Snapshot:</strong> ${result.snapshot.metadata.sourceQuoteId}</div>
                <div><strong>Source:</strong> ${result.snapshot.metadata.sourceOrgAlias || result.snapshot.metadata.sourceOrgUsername}</div>
                <div><strong>Expected Total:</strong> $${result.snapshot.expectedResults.quoteFields.GrandTotal.toFixed(2)}</div>
                ${result.actualQuoteData ? `<div><strong>Actual Total:</strong> $${result.actualQuoteData.GrandTotal.toFixed(2)}</div>` : ''}
                ${result.comparison ? `<div><strong>Field Match Rate:</strong> ${result.comparison.summary.successRate.toFixed(1)}%</div>` : ''}
                <div><strong>Execution Time:</strong> ${executionTime}s</div>
                ${result.errors && result.errors.length > 0 ? `<div style="color: #F44336;"><strong>Error:</strong> ${result.errors[0]}</div>` : ''}
            </div>
        </div>
`;
        });

        html += `
    </div>
</body>
</html>
        `;

        return html;
    }

    /**
     * Show welcome/getting started content
     */
    showWelcome(): void {
        const panel = this.getOrCreatePanel('Pricing Test Framework - Getting Started');
        panel.webview.html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Pricing Test Framework</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 20px; 
            background-color: var(--vscode-editor-background); 
            color: var(--vscode-editor-foreground);
            line-height: 1.6;
        }
        .header { margin-bottom: 30px; text-align: center; }
        .title { font-size: 28px; font-weight: bold; color: var(--vscode-textLink-foreground); margin-bottom: 10px; }
        .subtitle { font-size: 16px; color: var(--vscode-descriptionForeground); }
        .section { margin-bottom: 30px; }
        .section h2 { color: var(--vscode-textLink-foreground); border-bottom: 2px solid var(--vscode-textLink-foreground); padding-bottom: 5px; }
        .step { 
            background-color: var(--vscode-editor-inlayHint-background); 
            padding: 15px; 
            border-radius: 5px; 
            margin-bottom: 15px; 
        }
        .step-number { 
            background-color: var(--vscode-textLink-foreground); 
            color: var(--vscode-editor-background); 
            width: 25px; 
            height: 25px; 
            border-radius: 50%; 
            display: inline-flex; 
            align-items: center; 
            justify-content: center; 
            font-weight: bold; 
            margin-right: 10px; 
        }
        .feature-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; 
            margin-top: 20px; 
        }
        .feature-card { 
            background-color: var(--vscode-editor-inlayHint-background); 
            padding: 20px; 
            border-radius: 5px; 
        }
        .feature-icon { font-size: 24px; margin-bottom: 10px; }
        .feature-title { font-weight: bold; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">Revenue Cloud Pricing Test Framework</div>
        <div class="subtitle">Automated regression testing for Salesforce Revenue Cloud pricing logic</div>
    </div>

    <div class="section">
        <h2>Getting Started</h2>
        
        <div class="step">
            <span class="step-number">1</span>
            <strong>Prerequisites Check:</strong><br>
            • Salesforce CLI installed and authenticated<br>
            • Revenue Cloud enabled in your orgs<br>
            • Quotes with correct pricing in source org
        </div>

        <div class="step">
            <span class="step-number">2</span>
            <strong>Create Your First Snapshot:</strong><br>
            Click the ➕ button in the sidebar to capture a pricing snapshot from a correctly priced quote
        </div>

        <div class="step">
            <span class="step-number">3</span>
            <strong>Run Your First Test:</strong><br>
            Select a snapshot and click the ▶️ button to test pricing logic against a target org
        </div>

        <div class="step">
            <span class="step-number">4</span>
            <strong>Review Results:</strong><br>
            View detailed comparison reports showing field-by-field pricing differences
        </div>
    </div>

    <div class="section">
        <h2>Key Features</h2>
        <div class="feature-grid">
            <div class="feature-card">
                <div class="feature-icon">📸</div>
                <div class="feature-title">Pricing Snapshots</div>
                <div>Capture quote pricing as JSON files for version control and reusability</div>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">🔄</div>
                <div class="feature-title">Cross-Org Testing</div>
                <div>Test pricing changes across different Salesforce orgs using external IDs</div>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">📊</div>
                <div class="feature-title">Detailed Reports</div>
                <div>Get comprehensive comparison reports with field-level analysis</div>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">⚡</div>
                <div class="feature-title">Automated Execution</div>
                <div>Uses Revenue Cloud Place Quote API for accurate pricing recreation</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Next Steps</h2>
        <p>Start by creating your first pricing snapshot from a quote in your source org. The sidebar will show all available snapshots and allow you to run tests against target orgs.</p>
        <p><strong>Need help?</strong> Check the extension settings to configure product external ID fields and default org aliases.</p>
    </div>
</body>
</html>
        `;
    }

    /**
     * Generate detailed error section with user-friendly messages
     */
    private generateDetailedErrorSection(testResult: TestResult): string {
        const hasDetailedErrors = testResult.detailedErrors && testResult.detailedErrors.length > 0;
        
        let errorHtml = `
    <div class="error-box">
        <div class="error-message">Error Details:</div>`;
        
        if (hasDetailedErrors) {
            // Group errors by category for better organization
            const errorsByCategory = new Map<string, any[]>();
            testResult.detailedErrors!.forEach(error => {
                const category = error.category || 'system';
                if (!errorsByCategory.has(category)) {
                    errorsByCategory.set(category, []);
                }
                errorsByCategory.get(category)!.push(error);
            });
            
            errorsByCategory.forEach((errors, category) => {
                const categoryIcon = this.getCategoryIcon(category);
                const categoryName = this.getCategoryDisplayName(category);
                
                errorHtml += `
        <div class="error-category">
            <h4>${categoryIcon} ${categoryName} Issues</h4>`;
                
                errors.forEach(error => {
                    errorHtml += `
            <div class="detailed-error">
                <div class="error-code">${error.errorCode}</div>
                <div class="error-user-message">${error.userFriendlyMessage}</div>
                <div class="error-technical">Technical: ${error.message}</div>
                ${error.referenceId ? `<div class="error-reference">Reference: ${error.referenceId}</div>` : ''}
            </div>`;
                });
                
                errorHtml += `
        </div>`;
            });
        } else {
            // Fallback to basic error display
            errorHtml += `
        <ul>
${testResult.errors?.map(error => `            <li>${error}</li>`).join('\n') || '            <li>Unknown error occurred</li>'}
        </ul>`;
        }
        
        errorHtml += `
    </div>`;
        
        return errorHtml;
    }

    /**
     * Generate troubleshooting section with context-specific steps
     */
    private generateTroubleshootingSection(testResult: TestResult): string {
        const hasDetailedErrors = testResult.detailedErrors && testResult.detailedErrors.length > 0;
        let troubleshootingSteps: string[] = [];
        
        if (hasDetailedErrors) {
            // Collect all troubleshooting steps from detailed errors
            const allSteps = new Set<string>();
            testResult.detailedErrors!.forEach(error => {
                if (error.troubleshootingSteps) {
                    error.troubleshootingSteps.forEach(step => allSteps.add(step));
                }
            });
            troubleshootingSteps = Array.from(allSteps);
        }
        
        // Add generic troubleshooting steps if no specific ones available
        if (troubleshootingSteps.length === 0) {
            troubleshootingSteps = [
                'Verify org connection: Ensure the target org is properly authenticated via Salesforce CLI',
                'Check products: Verify that all products from the snapshot exist in the target org with matching external IDs',
                'Review permissions: Ensure your user has necessary permissions to create quotes and access Revenue Cloud APIs',
                'Validate configuration: Check that the external ID field setting matches your org\'s product configuration'
            ];
        }
        
        return `
    <div class="section">
        <h3>🔧 Troubleshooting Steps:</h3>
        <ol>
${troubleshootingSteps.map(step => `            <li>${step}</li>`).join('\n')}
        </ol>
    </div>`;
    }

    /**
     * Get category icon for error display
     */
    private getCategoryIcon(category: string): string {
        switch (category) {
            case 'authentication': return '🔐';
            case 'permissions': return '🚫';
            case 'validation': return '⚠️';
            case 'configuration': return '⚙️';
            case 'data': return '📊';
            case 'system': return '🔧';
            default: return '❓';
        }
    }

    /**
     * Get user-friendly category display name
     */
    private getCategoryDisplayName(category: string): string {
        switch (category) {
            case 'authentication': return 'Authentication';
            case 'permissions': return 'Permissions';
            case 'validation': return 'Data Validation';
            case 'configuration': return 'Configuration';
            case 'data': return 'Data';
            case 'system': return 'System';
            default: return 'Unknown';
        }
    }

    /**
     * Generate hierarchical batch test report HTML
     */
    private generateHierarchicalBatchReport(batchResults: any): string {
        const { batchName, results, summary } = batchResults;
        const passedTests = results.filter((r: any) => r.result.success);
        const failedTests = results.filter((r: any) => !r.result.success);

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Batch Test Results</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 20px;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            line-height: 1.6;
        }
        .header {
            border-bottom: 2px solid var(--vscode-panel-border);
            padding-bottom: 15px;
            margin-bottom: 25px;
        }
        .batch-title {
            font-size: 24px;
            font-weight: 600;
            color: var(--vscode-foreground);
            margin-bottom: 8px;
        }
        .summary {
            display: flex;
            gap: 20px;
            margin: 15px 0;
        }
        .summary-item {
            padding: 12px 16px;
            border-radius: 6px;
            font-weight: 500;
            min-width: 80px;
            text-align: center;
        }
        .total { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
        .passed { background: var(--vscode-testing-iconPassed); color: white; }
        .failed { background: var(--vscode-testing-iconFailed); color: white; }
        .section {
            margin: 25px 0;
        }
        .section-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .test-item {
            background: var(--vscode-list-hoverBackground);
            margin: 8px 0;
            padding: 15px;
            border-radius: 6px;
            border-left: 4px solid transparent;
        }
        .test-item.passed {
            border-left-color: var(--vscode-testing-iconPassed);
        }
        .test-item.failed {
            border-left-color: var(--vscode-testing-iconFailed);
        }
        .test-name {
            font-weight: 600;
            font-size: 16px;
            margin-bottom: 8px;
        }
        .test-status {
            font-size: 14px;
            font-weight: 500;
        }
        .test-status.passed { color: var(--vscode-testing-iconPassed); }
        .test-status.failed { color: var(--vscode-testing-iconFailed); }
        .test-details {
            margin-top: 12px;
            padding: 12px;
            background: var(--vscode-editor-inlayHint-background);
            border-radius: 4px;
            border-left: 3px solid var(--vscode-testing-iconFailed);
        }
        .test-details.passed {
            border-left-color: var(--vscode-testing-iconPassed);
        }
        .detail-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            font-size: 14px;
        }
        .detail-item:last-child {
            margin-bottom: 0;
        }
        .detail-label {
            font-weight: 600;
            color: var(--vscode-foreground);
            margin-right: 10px;
        }
        .detail-value {
            color: var(--vscode-descriptionForeground);
            text-align: right;
            flex: 1;
        }
        .detail-value.failed {
            color: var(--vscode-testing-iconFailed);
            font-weight: 500;
        }
        .detail-value.passed {
            color: var(--vscode-testing-iconPassed);
            font-weight: 500;
        }
        .test-errors {
            margin-top: 10px;
            padding: 10px;
            background: var(--vscode-inputValidation-errorBackground);
            border-radius: 4px;
            font-size: 14px;
            border: 1px solid var(--vscode-inputValidation-errorBorder);
        }
        .error-title {
            font-weight: 600;
            margin-bottom: 6px;
            color: var(--vscode-inputValidation-errorForeground);
        }
        .batch-detailed-error {
            margin-bottom: 8px;
            padding: 8px;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 3px;
        }
        .batch-error-header {
            font-weight: 600;
            color: var(--vscode-errorForeground);
            font-size: 13px;
        }
        .batch-error-message {
            color: var(--vscode-foreground);
            margin-top: 3px;
            font-size: 12px;
        }
        .batch-error-ref {
            color: var(--vscode-descriptionForeground);
            font-size: 11px;
            margin-top: 2px;
        }
        .test-metadata {
            margin-top: 10px;
            padding: 8px 10px;
            background: var(--vscode-list-inactiveSelectionBackground);
            border-radius: 4px;
            font-size: 13px;
            display: flex;
            justify-content: space-between;
        }
        .metadata-label {
            font-weight: 500;
            color: var(--vscode-descriptionForeground);
        }
        .metadata-value {
            color: var(--vscode-foreground);
            font-family: 'Courier New', monospace;
        }
        .empty-section {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            padding: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="batch-title">📊 ${batchName}</div>
        <div class="summary">
            <div class="summary-item total">
                <div>${summary.total}</div>
                <div>Total</div>
            </div>
            <div class="summary-item passed">
                <div>${summary.passed}</div>
                <div>Passed</div>
            </div>
            <div class="summary-item failed">
                <div>${summary.failed}</div>
                <div>Failed</div>
            </div>
        </div>
    </div>

    ${passedTests.length > 0 ? `
    <div class="section">
        <div class="section-title">✅ Passed Tests (${passedTests.length})</div>
        ${passedTests.map((test: any) => {
            const result = test.result;
            const hasComparison = result.comparison && typeof result.comparison === 'object';
            
            let successDetails = '';
            if (hasComparison) {
                const comp = result.comparison;
                const successRate = comp.summary ? comp.summary.successRate.toFixed(1) : 'N/A';
                const matchingFields = comp.summary ? comp.summary.matchingFields : 0;
                const totalFields = comp.summary ? comp.summary.totalFields : 0;
                const totalLineItems = comp.summary ? comp.summary.totalLineItems : 0;
                
                successDetails = `
                    <div class="test-details passed">
                        <div class="detail-item">
                            <span class="detail-label">Success Rate:</span>
                            <span class="detail-value passed">✅ ${successRate}% (${matchingFields}/${totalFields} fields matched)</span>
                        </div>
                        ${totalLineItems > 0 ? `
                            <div class="detail-item">
                                <span class="detail-label">Line Items:</span>
                                <span class="detail-value passed">✅ All ${totalLineItems} line items passed</span>
                            </div>
                        ` : ''}
                    </div>
                `;
            }
            
            return `
                <div class="test-item passed">
                    <div class="test-name">${test.snapshotName}</div>
                    <div class="test-status passed">✅ Test Passed - All pricing matches expected results</div>
                    ${successDetails}
                    ${result.createdQuoteId ? `
                        <div class="test-metadata">
                            <span class="metadata-label">Created Quote ID:</span>
                            <span class="metadata-value">${result.createdQuoteId}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('')}
    </div>
    ` : ''}

    ${failedTests.length > 0 ? `
    <div class="section">
        <div class="section-title">❌ Failed Tests (${failedTests.length})</div>
        ${failedTests.map((test: any) => {
            const result = test.result;
            const hasComparison = result.comparison && typeof result.comparison === 'object';
            const hasErrors = result.errors && result.errors.length > 0;
            
            let failureDetails = '';
            if (hasComparison) {
                const comp = result.comparison;
                const successRate = comp.summary ? comp.summary.successRate.toFixed(1) : 'N/A';
                const matchingFields = comp.summary ? comp.summary.matchingFields : 0;
                const totalFields = comp.summary ? comp.summary.totalFields : 0;
                
                failureDetails = `
                    <div class="test-details">
                        <div class="detail-item">
                            <span class="detail-label">Success Rate:</span>
                            <span class="detail-value">${successRate}% (${matchingFields}/${totalFields} fields matched)</span>
                        </div>
                        ${comp.quote && !comp.quote.overallMatch ? `
                            <div class="detail-item">
                                <span class="detail-label">Quote Fields:</span>
                                <span class="detail-value failed">❌ Some quote-level fields don't match expected values</span>
                            </div>
                        ` : ''}
                        ${comp.lineItems && comp.lineItems.some((li: any) => !li.overallMatch) ? `
                            <div class="detail-item">
                                <span class="detail-label">Line Items:</span>
                                <span class="detail-value failed">❌ ${comp.lineItems.filter((li: any) => !li.overallMatch).length}/${comp.lineItems.length} line items have pricing mismatches</span>
                            </div>
                        ` : ''}
                        ${comp.summary && comp.summary.matchingLineItems !== undefined ? `
                            <div class="detail-item">
                                <span class="detail-label">Line Item Match:</span>
                                <span class="detail-value">${comp.summary.matchingLineItems}/${comp.summary.totalLineItems} line items passed</span>
                            </div>
                        ` : ''}
                    </div>
                `;
            }
            
            return `
                <div class="test-item failed">
                    <div class="test-name">${test.snapshotName}</div>
                    <div class="test-status failed">❌ Test Failed - Pricing doesn't match expected results</div>
                    ${failureDetails}
                    ${hasErrors ? this.generateBatchTestErrorDisplay(result) : ''}
                    ${result.createdQuoteId ? `
                        <div class="test-metadata">
                            <span class="metadata-label">Created Quote ID:</span>
                            <span class="metadata-value">${result.createdQuoteId}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('')}
    </div>
    ` : ''}

    ${results.length === 0 ? `
        <div class="empty-section">
            <div>No test results to display</div>
        </div>
    ` : ''}
</body>
</html>
        `;
    }

    /**
     * Generate error display for batch test results
     */
    private generateBatchTestErrorDisplay(result: any): string {
        const hasDetailedErrors = result.detailedErrors && result.detailedErrors.length > 0;
        
        if (hasDetailedErrors) {
            // Show user-friendly error messages
            let errorHtml = `
                        <div class="test-errors">
                            <div class="error-title">Error Details:</div>`;
            
            result.detailedErrors.forEach((error: any) => {
                const categoryIcon = this.getCategoryIcon(error.category || 'system');
                errorHtml += `
                            <div class="batch-detailed-error">
                                <div class="batch-error-header">${categoryIcon} ${error.errorCode}</div>
                                <div class="batch-error-message">${error.userFriendlyMessage}</div>
                                ${error.referenceId ? `<div class="batch-error-ref">Reference: ${error.referenceId}</div>` : ''}
                            </div>`;
            });
            
            errorHtml += `
                        </div>`;
            
            return errorHtml;
        } else {
            // Fallback to basic error display
            return `
                        <div class="test-errors">
                            <div class="error-title">Technical Errors:</div>
                            ${result.errors.map((error: string) => `<div>• ${error}</div>`).join('')}
                        </div>`;
        }
    }

    /**
     * Generate compact batch test report HTML with expandable rows
     */
    private generateCompactBatchReport(batchResults: any): string {
        const { batchName, results, summary } = batchResults;
        const passedTests = results.filter((r: any) => r.result.success);
        const failedTests = results.filter((r: any) => !r.result.success);
        const totalTests = results.length;
        const successRate = ((passedTests.length / totalTests) * 100).toFixed(1);

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Batch Test Results</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 20px;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            line-height: 1.6;
        }
        
        /* Header Styles */
        .header {
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        .header-left {
            flex: 1;
        }
        .header-right {
            flex-shrink: 0;
        }
        .main-title {
            font-size: 24px;
            font-weight: 600;
            color: var(--vscode-foreground);
            margin-bottom: 20px;
        }
        
        /* Action Buttons */
        .action-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .action-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            white-space: nowrap;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .action-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .action-button.secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .action-button.secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        /* Section Styles */
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            color: var(--vscode-textLink-foreground);
            border-bottom: 2px solid var(--vscode-textLink-foreground);
            padding-bottom: 8px;
            font-size: 22px;
            margin-bottom: 15px;
        }
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .section-header h2 {
            margin-bottom: 0;
            flex: 1;
        }
        
        /* Summary Box Styles */
        .summary-box {
            background-color: var(--vscode-editor-inlayHint-background);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border: 1px solid var(--vscode-panel-border);
        }
        .summary-content {
            display: flex;
            gap: 30px;
            align-items: center;
            flex-wrap: wrap;
        }
        .summary-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 16px;
            font-weight: 500;
        }
        .summary-icon {
            font-size: 18px;
        }
        .summary-number {
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        .summary-label {
            color: var(--vscode-descriptionForeground);
        }
        
        /* Results Table Styles */
        .results-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 14px;
        }
        .results-table th {
            background-color: var(--vscode-editor-inlayHint-background);
            color: var(--vscode-foreground);
            font-weight: 600;
            padding: 12px 16px;
            text-align: left;
            border-bottom: 2px solid var(--vscode-panel-border);
            font-size: 13px;
        }
        .results-table td {
            padding: 12px 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
            vertical-align: top;
        }
        .results-table tbody tr:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        
        /* Expandable Row Styles */
        .expandable-row {
            cursor: pointer;
        }
        .expandable-row:hover {
            background-color: var(--vscode-list-hoverBackground) !important;
        }
        .expand-icon {
            font-size: 16px;
            transition: transform 0.3s ease;
            color: var(--vscode-textLink-foreground);
        }
        .expand-icon.expanded {
            transform: rotate(90deg);
        }
        
        /* Line Item Details Styles */
        .line-item-details {
            background-color: var(--vscode-editor-inlayHint-background);
            padding: 16px;
            border-left: 4px solid var(--vscode-textLink-foreground);
            margin: 8px 0;
            border-radius: 4px;
        }
        .line-item-details h4 {
            margin: 0 0 12px 0;
            color: var(--vscode-textLink-foreground);
            font-size: 14px;
        }
        .line-item-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        .line-item-table th {
            background-color: var(--vscode-list-inactiveSelectionBackground);
            color: var(--vscode-foreground);
            font-weight: 600;
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .line-item-table td {
            padding: 8px 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .line-item-table tbody tr:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        .field-match {
            color: var(--vscode-testing-iconPassed);
            font-weight: 500;
        }
        .field-mismatch {
            color: var(--vscode-testing-iconFailed);
            font-weight: bold;
        }
        
        /* Status Column */
        .status-cell {
            text-align: center;
            font-weight: 600;
        }
        .status-passed {
            color: var(--vscode-testing-iconPassed);
        }
        .status-failed {
            color: var(--vscode-testing-iconFailed);
        }
        
        /* Test Description Column */
        .test-description {
            font-weight: 500;
            color: var(--vscode-foreground);
        }
        
        /* Execution Time Column */
        .execution-time {
            font-family: 'Courier New', monospace;
            color: var(--vscode-descriptionForeground);
            text-align: right;
        }
        
        /* Quote Grand Total Columns */
        .quote-total {
            font-family: 'Courier New', monospace;
            text-align: right;
            font-weight: 500;
        }
        .quote-total-expected {
            color: var(--vscode-descriptionForeground);
        }
        .quote-total-actual {
            color: var(--vscode-foreground);
        }
        .quote-total-actual.mismatch {
            color: var(--vscode-testing-iconFailed);
            font-weight: bold;
        }
        
        /* Line Items Match Column */
        .line-items-match {
            text-align: center;
            font-weight: 500;
        }
        .line-items-match.passed {
            color: var(--vscode-testing-iconPassed);
        }
        .line-items-match.failed {
            color: var(--vscode-testing-iconFailed);
        }
        
        /* Failed Row Styling */
        .failed-row {
            background-color: rgba(244, 67, 54, 0.1);
        }
        .failed-row:hover {
            background-color: rgba(244, 67, 54, 0.15);
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
            .header {
                flex-direction: column;
                align-items: flex-start;
            }
            .summary-content {
                flex-direction: column;
                align-items: flex-start;
                gap: 15px;
            }
            .results-table {
                font-size: 12px;
            }
            .results-table th,
            .results-table td {
                padding: 8px 12px;
            }
        }
        
        @media print {
            .action-buttons {
                display: none;
            }
            .line-item-details {
                display: block !important;
            }
            .expand-icon {
                display: none;
            }
        }
    </style>
</head>
<body>
    <!-- Main Header -->
    <div class="header">
        <div class="header-left">
            <div class="main-title">📊 Batch Test Results: ${batchName}</div>
        </div>
        <div class="header-right">
            <div class="action-buttons">
                <button class="action-button" onclick="saveReport()">💾 Save Report</button>
                <button class="action-button secondary" onclick="exportToPDF()">📄 Export to PDF</button>
            </div>
        </div>
    </div>

    <!-- Summary Box -->
    <div class="summary-box">
        <div class="summary-content">
            <div class="summary-item">
                <span class="summary-icon">✅</span>
                <span class="summary-number">${passedTests.length}</span>
                <span class="summary-label">Tests Passed</span>
            </div>
            <div class="summary-item">
                <span class="summary-icon">❌</span>
                <span class="summary-number">${failedTests.length}</span>
                <span class="summary-label">Tests Failed</span>
            </div>
            <div class="summary-item">
                <span class="summary-icon">📊</span>
                <span class="summary-number">${successRate}%</span>
                <span class="summary-label">Success Rate</span>
            </div>
        </div>
    </div>

    <!-- Results Table -->
    <div class="section">
        <div class="section-header">
            <h2>Test Results</h2>
            <button class="action-button secondary" onclick="toggleAllDetails()">📋 Expand/Collapse All</button>
        </div>
        <table class="results-table">
            <thead>
                <tr>
                    <th>Status</th>
                    <th>Test Description</th>
                    <th>Execution Time</th>
                    <th>Quote Grand Total (Expected)</th>
                    <th>Quote Grand Total (Actual)</th>
                    <th>Line Items Match</th>
                    <th>Details</th>
                </tr>
            </thead>
        <tbody>
            ${results.map((test: any, index: number) => {
                const result = test.result;
                const isFailed = !result.success;
                const rowClass = isFailed ? 'failed-row' : '';
                
                // Get execution time
                const executionTime = result.executionTime ? (result.executionTime / 1000).toFixed(2) + 's' : 'N/A';
                
                // Get expected grand total
                const expectedGrandTotal = result.snapshot?.expectedResults?.quoteFields?.GrandTotal;
                const expectedTotalFormatted = expectedGrandTotal ? `$${expectedGrandTotal.toFixed(2)}` : 'N/A';
                
                // Get actual grand total
                const actualGrandTotal = result.actualQuoteData?.GrandTotal;
                const actualTotalFormatted = actualGrandTotal ? `$${actualGrandTotal.toFixed(2)}` : 'N/A';
                const actualTotalClass = (isFailed && expectedGrandTotal && actualGrandTotal && 
                    Math.abs(expectedGrandTotal - actualGrandTotal) > 0.01) ? 'mismatch' : '';
                
                // Get line items match info
                let lineItemsMatch = 'N/A';
                let lineItemsClass = '';
                if (result.comparison?.summary) {
                    const matching = result.comparison.summary.matchingLineItems || 0;
                    const total = result.comparison.summary.totalLineItems || 0;
                    lineItemsMatch = `${matching}/${total}`;
                    lineItemsClass = matching === total ? 'passed' : 'failed';
                }
                
                return `
                    <tr class="${rowClass} expandable-row" onclick="toggleDetails(${index})">
                        <td class="status-cell">
                            <span class="${isFailed ? 'status-failed' : 'status-passed'}">
                                ${isFailed ? '❌' : '✅'}
                            </span>
                        </td>
                        <td class="test-description">${test.snapshotName}</td>
                        <td class="execution-time">${executionTime}</td>
                        <td class="quote-total quote-total-expected">${expectedTotalFormatted}</td>
                        <td class="quote-total quote-total-actual ${actualTotalClass}">${actualTotalFormatted}</td>
                        <td class="line-items-match ${lineItemsClass}">${lineItemsMatch}</td>
                        <td class="status-cell">
                            <span class="expand-icon" id="expand-${index}">▶</span>
                        </td>
                    </tr>
                    <tr id="details-${index}" style="display: none;">
                        <td colspan="7">
                            ${this.generateLineItemDetails(result, index)}
                        </td>
                    </tr>
                `;
            }).join('')}
        </tbody>
        </table>
    </div>

    <script>
        // VS Code API for communication with the extension
        const vscode = acquireVsCodeApi();
        
        // Test webview communication on page load
        console.log('🚀 Batch report page loaded');
        console.log('🔍 vscode available:', typeof vscode);
        console.log('🔍 vscode.postMessage available:', typeof vscode?.postMessage);
        
        // Send a test message to verify communication
        if (vscode && vscode.postMessage) {
            console.log('📤 Sending test message to verify communication');
            try {
                vscode.postMessage({
                    command: 'test',
                    data: { message: 'Batch report loaded successfully' }
                });
                console.log('✅ Test message sent successfully');
            } catch (error) {
                console.error('❌ Error sending test message:', error);
            }
        }
        
        function toggleDetails(index) {
            const detailsRow = document.getElementById('details-' + index);
            const expandIcon = document.getElementById('expand-' + index);
            
            if (detailsRow.style.display === 'none') {
                detailsRow.style.display = 'table-row';
                expandIcon.classList.add('expanded');
            } else {
                detailsRow.style.display = 'none';
                expandIcon.classList.remove('expanded');
            }
        }
        
        function toggleAllDetails() {
            const allDetails = document.querySelectorAll('[id^="details-"]');
            const allIcons = document.querySelectorAll('[id^="expand-"]');
            const firstDetails = allDetails[0];
            const shouldExpand = firstDetails.style.display === 'none';
            
            allDetails.forEach(details => {
                details.style.display = shouldExpand ? 'table-row' : 'none';
            });
            
            allIcons.forEach(icon => {
                if (shouldExpand) {
                    icon.classList.add('expanded');
                } else {
                    icon.classList.remove('expanded');
                }
            });
        }
        
        function saveReport() {
            console.log('💾 Save report button clicked');
            console.log('🔍 Checking vscode availability:', typeof vscode);
            console.log('🔍 Checking vscode.postMessage:', typeof vscode?.postMessage);
            console.log('🔍 Document ready state:', document.readyState);
            console.log('🔍 Document title:', document.title);
            
            // This will be handled by the VS Code extension
            if (vscode && vscode.postMessage) {
                console.log('📤 Sending save report message to VS Code');
                try {
                    const message = {
                        command: 'saveReport',
                        data: {
                            type: 'batch',
                            content: document.documentElement.outerHTML
                        }
                    };
                    console.log('📤 Message to send:', message);
                    vscode.postMessage(message);
                    console.log('✅ Message sent successfully');
                } catch (error) {
                    console.error('❌ Error sending message:', error);
                    alert('Error sending save request: ' + error.message);
                }
            } else {
                console.log('❌ vscode not available or postMessage not found');
                console.log('❌ vscode type:', typeof vscode);
                console.log('❌ vscode.postMessage type:', typeof vscode?.postMessage);
                alert('Save functionality requires VS Code extension context. vscode: ' + typeof vscode);
            }
        }
        
        function exportToPDF() {
            console.log('📄 Export to PDF button clicked');
            console.log('🔍 Checking vscode availability:', typeof vscode);
            console.log('🔍 Checking vscode.postMessage:', typeof vscode?.postMessage);
            console.log('🔍 Document ready state:', document.readyState);
            console.log('🔍 Document title:', document.title);
            
            // Expand all details for PDF export
            const allDetails = document.querySelectorAll('[id^="details-"]');
            const allIcons = document.querySelectorAll('[id^="expand-"]');
            
            console.log('📋 Found ' + allDetails.length + ' detail rows to expand');
            
            allDetails.forEach(details => {
                details.style.display = 'table-row';
            });
            
            allIcons.forEach(icon => {
                icon.classList.add('expanded');
            });
            
            // Send message to VS Code extension to handle PDF export
            if (vscode && vscode.postMessage) {
                console.log('📤 Sending export to PDF message to VS Code');
                try {
                    const message = {
                        command: 'exportPDF',
                        data: {
                            type: 'batch',
                            content: document.documentElement.outerHTML
                        }
                    };
                    console.log('📤 Message to send:', message);
                    vscode.postMessage(message);
                    console.log('✅ Message sent successfully');
                } catch (error) {
                    console.error('❌ Error sending message:', error);
                    alert('Error sending PDF export request: ' + error.message);
                }
            } else {
                console.log('❌ vscode not available or postMessage not found');
                console.log('❌ vscode type:', typeof vscode);
                console.log('❌ vscode.postMessage type:', typeof vscode?.postMessage);
                alert('PDF export functionality requires VS Code extension context. vscode: ' + typeof vscode);
            }
        }
    </script>
</body>
</html>
        `;
    }

    /**
     * Generate line item details for expandable rows
     */
    private generateLineItemDetails(result: any, testIndex: number): string {
        if (!result.comparison || !result.comparison.lineItems) {
            return '<div class="line-item-details"><p>No line item details available</p></div>';
        }

        const lineItems = result.comparison.lineItems;
        const hasLineItems = lineItems && lineItems.length > 0;

        if (!hasLineItems) {
            return '<div class="line-item-details"><p>No line items found</p></div>';
        }

        let html = '<div class="line-item-details">';
        html += '<h4>📋 Line Item Details</h4>';
        
        // Quote-level fields comparison
        if (result.comparison && result.comparison.quote && result.comparison.quote.fieldComparisons) {
            html += '<h5>Quote Fields</h5>';
            html += '<table class="line-item-table">';
            html += '<thead><tr><th>Field</th><th>Expected</th><th>Actual</th><th>Status</th></tr></thead>';
            html += '<tbody>';
            
            result.comparison.quote.fieldComparisons.forEach((fc: any) => {
                const statusClass = fc.match ? 'field-match' : 'field-mismatch';
                const statusText = fc.match ? '✅ Match' : '❌ Mismatch';
                
                html += `
                    <tr>
                        <td><strong>${fc.fieldName}</strong></td>
                        <td>${this.formatValue(fc.expected)}</td>
                        <td>${this.formatValue(fc.actual)}</td>
                        <td class="${statusClass}">${statusText}</td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
        } else {
            // Fallback: Show basic quote field comparison if structured comparison is not available
            html += '<h5>Quote Fields</h5>';
            html += '<table class="line-item-table">';
            html += '<thead><tr><th>Field</th><th>Expected</th><th>Actual</th><th>Status</th></tr></thead>';
            html += '<tbody>';
            
            // Show GrandTotal comparison as fallback
            const expectedGrandTotal = result.snapshot?.expectedResults?.quoteFields?.GrandTotal;
            const actualGrandTotal = result.actualQuoteData?.GrandTotal;
            
            if (expectedGrandTotal !== undefined && actualGrandTotal !== undefined) {
                const match = Math.abs(expectedGrandTotal - actualGrandTotal) < 0.01;
                const statusClass = match ? 'field-match' : 'field-mismatch';
                const statusText = match ? '✅ Match' : '❌ Mismatch';
                
                html += `
                    <tr>
                        <td><strong>GrandTotal</strong></td>
                        <td>${this.formatValue(expectedGrandTotal)}</td>
                        <td>${this.formatValue(actualGrandTotal)}</td>
                        <td class="${statusClass}">${statusText}</td>
                    </tr>
                `;
            }
            
            html += '</tbody></table>';
        }

        // Line item details
        html += '<h5>Line Items</h5>';
        html += '<table class="line-item-table">';
        html += '<thead><tr><th>Product</th><th>Field</th><th>Expected</th><th>Actual</th><th>Status</th></tr></thead>';
        html += '<tbody>';
        
        lineItems.forEach((lineItem: any, itemIndex: number) => {
            const productName = lineItem.productName || lineItem.externalId || 'Unknown Product';
            const isFirstField = true;
            
            lineItem.fieldComparisons.forEach((fc: any, fieldIndex: number) => {
                const statusClass = fc.match ? 'field-match' : 'field-mismatch';
                const statusText = fc.match ? '✅ Match' : '❌ Mismatch';
                
                html += `
                    <tr>
                        <td>${fieldIndex === 0 ? productName : ''}</td>
                        <td><strong>${fc.fieldName}</strong></td>
                        <td>${this.formatValue(fc.expected)}</td>
                        <td>${this.formatValue(fc.actual)}</td>
                        <td class="${statusClass}">${statusText}</td>
                    </tr>
                `;
            });
        });
        
        html += '</tbody></table>';
        html += '</div>';
        
        return html;
    }

    /**
     * Format value for display
     */
    private formatValue(value: any): string {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'number') {
            return value.toFixed(2);
        }
        return String(value);
    }

    /**
     * Handle save report request from webview
     */
    private async handleSaveReport(data: any): Promise<void> {
        console.log('[DEBUG] 💾 handleSaveReport called');
        console.log('[DEBUG] 💾 Save data received:', {
            hasData: !!data,
            hasContent: !!data?.content,
            contentType: typeof data?.content,
            contentLength: data?.content?.length || 0
        });
        
        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            console.log('[DEBUG] 💾 Workspace root:', workspaceRoot);
            
            if (!workspaceRoot) {
                console.log('[DEBUG] ❌ No workspace folder found');
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            // Create the results directory path using configured snapshot directory
            const snapshotDir = ApiUtilityService.getSnapshotDirectory();
            console.log('[DEBUG] 💾 Snapshot directory:', snapshotDir);
            
            // Reports go to the parent directory of snapshots (e.g., revcloud_blueprint/pricing/results)
            const pricingDir = path.dirname(snapshotDir);
            const resultsDir = path.join(workspaceRoot, pricingDir, 'results');
            console.log('[DEBUG] 💾 Results directory:', resultsDir);
            
            // Ensure directory exists
            if (!fs.existsSync(resultsDir)) {
                console.log('[DEBUG] 💾 Creating results directory');
                fs.mkdirSync(resultsDir, { recursive: true });
            }

            // Generate filename for batch report
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `batch_test_results_${timestamp}.html`;
            const filePath = path.join(resultsDir, filename);
            console.log('[DEBUG] 💾 File path:', filePath);

            // Write the HTML content to file
            console.log('[DEBUG] 💾 Writing file...');
            fs.writeFileSync(filePath, data.content, 'utf8');
            console.log('[DEBUG] ✅ File written successfully');

            // Show success message with option to open the file
            console.log('[DEBUG] 💾 Showing success message');
            const action = await vscode.window.showInformationMessage(
                `Batch report saved successfully: ${filename}`,
                'Open File',
                'Show in Explorer'
            );

            if (action === 'Open File') {
                console.log('[DEBUG] 💾 Opening file');
                const document = await vscode.workspace.openTextDocument(filePath);
                await vscode.window.showTextDocument(document);
            } else if (action === 'Show in Explorer') {
                console.log('[DEBUG] 💾 Showing in explorer');
                vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(filePath));
            }
        } catch (error: any) {
            console.error('[DEBUG] ❌ Error saving batch report:', error);
            vscode.window.showErrorMessage(`Failed to save batch report: ${error.message}`);
        }
    }

    /**
     * Handle export to PDF request from webview
     */
    private async handleExportToPDF(data: any): Promise<void> {
        console.log('[DEBUG] 📄 handleExportToPDF called');
        console.log('[DEBUG] 📄 Export data received:', {
            hasData: !!data,
            hasContent: !!data?.content,
            contentType: typeof data?.content,
            contentLength: data?.content?.length || 0
        });
        
        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            console.log('[DEBUG] 📄 Workspace root:', workspaceRoot);
            
            if (!workspaceRoot) {
                console.log('[DEBUG] ❌ No workspace folder found');
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            // Create the results directory path using configured snapshot directory
            const snapshotDir = ApiUtilityService.getSnapshotDirectory();
            console.log('[DEBUG] 📄 Snapshot directory:', snapshotDir);
            
            // Reports go to the parent directory of snapshots (e.g., revcloud_blueprint/pricing/results)
            const pricingDir = path.dirname(snapshotDir);
            const resultsDir = path.join(workspaceRoot, pricingDir, 'results');
            console.log('[DEBUG] 📄 Results directory:', resultsDir);
            
            // Ensure directory exists
            if (!fs.existsSync(resultsDir)) {
                console.log('[DEBUG] 📄 Creating results directory');
                fs.mkdirSync(resultsDir, { recursive: true });
            }

            // Generate filename for PDF export
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `batch_test_results_${timestamp}_pdf.html`;
            const filePath = path.join(resultsDir, filename);
            console.log('[DEBUG] 📄 File path:', filePath);

            // Write the expanded HTML content to file
            console.log('[DEBUG] 📄 Writing file...');
            fs.writeFileSync(filePath, data.content, 'utf8');
            console.log('[DEBUG] ✅ File written successfully');

            // Open the file in browser using VS Code's external API
            console.log('[DEBUG] 📄 Opening file in browser...');
            const uri = vscode.Uri.file(filePath);
            await vscode.env.openExternal(uri);
            console.log('[DEBUG] ✅ File opened in browser');
            
            vscode.window.showInformationMessage(
                'PDF-ready file opened in browser. Use Ctrl+P (Cmd+P on Mac) and select "Save as PDF" to export.',
                'OK'
            );

        } catch (error: any) {
            console.error('[DEBUG] ❌ Error exporting batch report to PDF:', error);
            vscode.window.showErrorMessage(`Failed to export to PDF: ${error.message}`);
        }
    }

    /**
     * Close the report panel
     */
    dispose(): void {
        if (this.panel) {
            this.panel.dispose();
        }
    }

    /**
     * Save report to HTML file
     */
    private async saveReportToFile(htmlContent: string, testResult: TestResult): Promise<void> {
        try {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            // Create the results directory path using configured snapshot directory
            const snapshotDir = ApiUtilityService.getSnapshotDirectory();
            // Reports go to the parent directory of snapshots (e.g., revcloud_blueprint/pricing/results)
            const pricingDir = path.dirname(snapshotDir);
            const resultsDir = path.join(workspaceRoot, pricingDir, 'results');
            
            // Ensure directory exists
            if (!fs.existsSync(resultsDir)) {
                fs.mkdirSync(resultsDir, { recursive: true });
            }

            // Generate filename: snapshot_myentdev_<Created_Quote_Id>_fti.html
            const targetOrgAlias = testResult.targetOrg.alias || 'unknown_org';
            const quoteId = testResult.createdQuoteId || 'unknown_quote';
            const description = testResult.snapshot.metadata.description || 'test';
            const safeDescription = (description || 'test').toLowerCase().replace(/[^a-z0-9]/g, '_');
            
            const filename = `snapshot_${targetOrgAlias}_${quoteId}_${safeDescription}.html`;
            const filePath = path.join(resultsDir, filename);

            // Write the HTML content to file
            fs.writeFileSync(filePath, htmlContent, 'utf8');

            // Show success message with option to open the file
            const action = await vscode.window.showInformationMessage(
                `Report saved successfully: ${filename}`,
                'Open File',
                'Show in Explorer'
            );

            if (action === 'Open File') {
                const uri = vscode.Uri.file(filePath);
                await vscode.env.openExternal(uri);
            } else if (action === 'Show in Explorer') {
                vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(filePath));
            }

        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to save report: ${error.message}`);
        }
    }

    /**
     * Export report to PDF (using HTML content)
     */
    private async exportReportToPDF(htmlContent: string, testResult: TestResult): Promise<void> {
        // Check license state before exporting to PDF (Pro feature)
        const licenseState = await getLicenseState();
        if (!licenseState.isPro) {
            const action = await vscode.window.showInformationMessage(
                licenseState.statusMessage + ' PDF Export is a Pro feature.',
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

        try {
            // For PDF export, we'll create an expanded HTML version (no collapsed accordions)
            // and let the user know they can print to PDF from the browser
            
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                vscode.window.showErrorMessage('No workspace folder found');
                return;
            }

            // Create the results directory path using configured snapshot directory
            const snapshotDir = ApiUtilityService.getSnapshotDirectory();
            // Reports go to the parent directory of snapshots (e.g., revcloud_blueprint/pricing/results)
            const pricingDir = path.dirname(snapshotDir);
            const resultsDir = path.join(workspaceRoot, pricingDir, 'results');
            
            // Ensure directory exists
            if (!fs.existsSync(resultsDir)) {
                fs.mkdirSync(resultsDir, { recursive: true });
            }

            // Generate expanded HTML for PDF (all accordions open)
            const expandedHtml = htmlContent.replace(/style="display:\s*none"/g, 'style="display: block"');
            
            const targetOrgAlias = testResult.targetOrg.alias || 'unknown_org';
            const quoteId = testResult.createdQuoteId || 'unknown_quote';
            const description = testResult.snapshot.metadata.description || 'test';
            const safeDescription = (description || 'test').toLowerCase().replace(/[^a-z0-9]/g, '_');
            
            const filename = `snapshot_${targetOrgAlias}_${quoteId}_${safeDescription}_pdf.html`;
            const filePath = path.join(resultsDir, filename);

            // Write the expanded HTML content
            fs.writeFileSync(filePath, expandedHtml, 'utf8');

            // Open the file and show instructions
            const uri = vscode.Uri.file(filePath);
            await vscode.env.openExternal(uri);
            
            vscode.window.showInformationMessage(
                'PDF-ready file opened in browser. Use Ctrl+P (Cmd+P on Mac) and select "Save as PDF" to export.',
                'OK'
            );

        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to export to PDF: ${error.message}`);
        }
    }
}
