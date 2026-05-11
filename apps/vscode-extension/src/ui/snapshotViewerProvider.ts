import * as vscode from 'vscode';
import * as fs from 'fs';

/**
 * Provider for visualizing snapshot JSON in a hierarchical card view
 */
export class SnapshotViewerProvider {
    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly context: vscode.ExtensionContext
    ) {}

    public showSnapshotView(snapshotPath: string): void {
        // Create webview panel
        const panel = vscode.window.createWebviewPanel(
            'snapshotVisualizer',
            'Snapshot Viewer',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'images')]
            }
        );

        try {
            // Load and parse snapshot JSON
            const snapshotContent = fs.readFileSync(snapshotPath, 'utf8');
            const snapshot = JSON.parse(snapshotContent);

            const logoUri = panel.webview.asWebviewUri(
                vscode.Uri.joinPath(this.extensionUri, 'images', 'logo.png')
            );

            // Detect snapshot type and render appropriate HTML
            const snapshotType = this.detectSnapshotType(snapshot);
            panel.webview.html = snapshotType === 'configurator'
                ? this.getHtmlForConfiguratorSnapshot(snapshot, logoUri, snapshotPath)
                : this.getHtmlForPricingSnapshot(snapshot, logoUri, snapshotPath);

            // Handle messages from webview
            panel.webview.onDidReceiveMessage(
                async (message) => {
                    switch (message.command) {
                        case 'updateField':
                            await this.updateSnapshotField(snapshotPath, message.itemIndex, message.field, message.value);
                            break;
                    }
                },
                undefined,
                this.context.subscriptions
            );
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to load snapshot: ${error.message}`);
        }
    }

    /**
     * Detect snapshot type based on structure
     */
    private detectSnapshotType(snapshot: any): 'pricing' | 'configurator' {
        // Configurator snapshots have 'snapshotMetadata' and 'expectedQuoteState'
        if (snapshot.snapshotMetadata && snapshot.expectedQuoteState) {
            return 'configurator';
        }
        // Pricing snapshots have 'metadata' and 'recreationPayload'
        return 'pricing';
    }

    private getHtmlForPricingSnapshot(snapshot: any, logoUri: vscode.Uri, snapshotPath: string): string {
        const metadata = snapshot.metadata || {};
        const expectedResults = snapshot.expectedResults || {};
        const recreationPayload = snapshot.recreationPayload || {};
        const lineItems = recreationPayload.lineItems || [];

        // Build parent-child map
        const childrenMap = new Map<string, any[]>();
        const rootItems: any[] = [];

        lineItems.forEach((item: any, index: number) => {
            item._index = index; // Add index for reference
            if (item.parentLineItemReference) {
                const parentProductId = item.parentLineItemReference.parentProductIdentifier.value;
                if (!childrenMap.has(parentProductId)) {
                    childrenMap.set(parentProductId, []);
                }
                childrenMap.get(parentProductId)!.push(item);
            } else {
                rootItems.push(item);
            }
        });

        const lineItemsHtml = rootItems.map(item => this.renderLineItem(item, 0, childrenMap)).join('');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Snapshot Viewer</title>
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
            padding: 20px;
            line-height: 1.5;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        .page-header {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .page-title {
            font-size: 22px;
            font-weight: 700;
            color: var(--vscode-foreground);
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .page-subtitle {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 4px;
            font-weight: 500;
        }

        .page-filename {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            font-family: var(--vscode-editor-font-family);
            margin-bottom: 12px;
            opacity: 0.8;
        }

        .page-meta {
            display: flex;
            gap: 24px;
            font-size: 12px;
            padding-top: 12px;
            border-top: 1px solid var(--vscode-panel-border);
        }

        .page-meta-item {
            display: flex;
            align-items: center;
            gap: 6px;
            color: var(--vscode-descriptionForeground);
        }

        .quote-details {
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 20px;
        }

        .section-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--vscode-foreground);
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .quote-summary {
            display: flex;
            gap: 32px;
            align-items: center;
        }

        .summary-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
        }

        .summary-label {
            color: var(--vscode-descriptionForeground);
            font-weight: 500;
        }

        .summary-value {
            color: var(--vscode-foreground);
            font-weight: 600;
        }

        .grand-total {
            font-size: inherit;
            font-weight: 600;
            color: var(--vscode-textLink-activeForeground);
        }

        .line-items-section {
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 16px;
        }

        .line-items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-top: 12px;
        }

        .line-items-table thead {
            background-color: var(--vscode-editor-background);
            border-bottom: 2px solid var(--vscode-panel-border);
        }

        .line-items-table th {
            padding: 10px 12px;
            text-align: left;
            font-weight: 600;
            color: var(--vscode-foreground);
            border-bottom: 2px solid var(--vscode-panel-border);
        }

        .line-items-table th:nth-child(2),
        .line-items-table th:nth-child(3),
        .line-items-table th:nth-child(4),
        .line-items-table th:nth-child(5),
        .line-items-table th:nth-child(6) {
            text-align: right;
        }

        .line-items-table tbody tr {
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .line-items-table tbody tr:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .line-items-table tbody tr:last-child {
            border-bottom: none;
        }

        .line-items-table td {
            padding: 10px 12px;
            color: var(--vscode-foreground);
        }

        .line-items-table td:nth-child(2),
        .line-items-table td:nth-child(3),
        .line-items-table td:nth-child(4),
        .line-items-table td:nth-child(5),
        .line-items-table td:nth-child(6) {
            text-align: right;
        }

        .product-name-cell {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .product-name-cell.indented {
            padding-left: 32px;
        }

        .product-name-text {
            flex: 1;
        }

        .indent-marker {
            color: var(--vscode-descriptionForeground);
            margin-right: 4px;
        }

        .attributes-toggle {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            color: var(--vscode-textLink-foreground);
            font-size: 11px;
            margin-left: 8px;
            user-select: none;
            text-decoration: none;
        }

        .attributes-toggle:hover {
            text-decoration: underline;
        }

        .attributes-toggle .codicon {
            font-size: 11px;
            transition: transform 0.2s;
        }

        .attributes-toggle.expanded .codicon {
            transform: rotate(90deg);
        }

        .attributes-row {
            display: none;
        }

        .attributes-row.show {
            display: table-row;
        }

        .attributes-cell {
            padding: 8px 12px !important;
            background-color: var(--vscode-editor-background);
            border-top: 1px solid var(--vscode-panel-border);
        }

        .attribute-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 8px;
            font-size: 11px;
        }

        .attribute-item {
            display: flex;
            gap: 4px;
        }

        .attribute-name {
            color: var(--vscode-descriptionForeground);
            font-weight: 500;
        }

        .attribute-value {
            color: var(--vscode-foreground);
        }

        .badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 600;
            margin-left: 8px;
        }

        .subscription-badge {
            background-color: var(--vscode-inputValidation-infoBackground);
            color: var(--vscode-inputValidation-infoForeground);
        }

        /* Editable cell styles */
        .editable-cell {
            cursor: pointer;
            padding: 10px 12px;
            position: relative;
        }

        .editable-cell:hover {
            background-color: var(--vscode-list-hoverBackground);
            outline: 1px solid var(--vscode-focusBorder);
        }

        .editable-cell.editing {
            padding: 0;
        }

        .editable-cell.editing .edit-icon {
            display: none;
        }

        .edit-icon {
            opacity: 0;
            margin-left: 6px;
            color: var(--vscode-descriptionForeground);
            font-size: 11px;
            transition: opacity 0.2s;
            vertical-align: middle;
        }

        .editable-cell:hover .edit-icon {
            opacity: 1;
        }

        .editable-input {
            width: 100%;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-focusBorder);
            padding: 8px;
            font-family: var(--vscode-font-family);
            font-size: 13px;
            text-align: right;
        }

        .editable-input:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .save-indicator {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 10px;
            color: var(--vscode-charts-green);
            margin-left: 4px;
            opacity: 0;
            transition: opacity 0.3s;
        }

        .save-indicator.show {
            opacity: 1;
        }

        .editable-hint {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            opacity: 0;
            transition: opacity 0.2s;
        }

        .editable-cell:hover .editable-hint {
            opacity: 1;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Page Header -->
        <div class="page-header">
            <div class="page-title">
                <i class="codicon codicon-list-selection"></i>
                ${this.escapeHtml(recreationPayload.quoteName || metadata.description || 'Untitled Snapshot')}
            </div>
            <div class="page-subtitle">${this.escapeHtml(metadata.description || '')}</div>
            <div class="page-filename">${this.escapeHtml(snapshotPath.split('/').pop() || '')}</div>
            <div class="page-meta">
                <div class="page-meta-item">
                    <i class="codicon codicon-cloud"></i>
                    <span>Source Org: ${this.escapeHtml(metadata.sourceOrgAlias || metadata.sourceOrgUsername || 'Unknown')}</span>
                </div>
                <div class="page-meta-item">
                    <i class="codicon codicon-calendar"></i>
                    <span>Created: ${this.formatDate(metadata.createdAt)}</span>
                </div>
            </div>
        </div>

        <!-- Quote Details -->
        <div class="quote-details">
            <div class="section-title">Quote Details</div>
            <div class="quote-summary">
                <div class="summary-item">
                    <i class="codicon codicon-dashboard"></i>
                    <span class="summary-label">Grand Total:</span>
                    <span class="summary-value grand-total">$${this.formatNumber(expectedResults.quoteFields?.GrandTotal || 0)}</span>
                </div>
                <div class="summary-item">
                    <i class="codicon codicon-list-unordered"></i>
                    <span class="summary-label">Line Items:</span>
                    <span class="summary-value">${lineItems.length}</span>
                </div>
            </div>
        </div>

        <!-- Quote Line Items Table -->
        <div class="line-items-section">
            <div class="section-title">Quote Line Items</div>
            <table class="line-items-table">
                <thead>
                    <tr>
                        <th>Product Name</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Discount</th>
                        <th>Net Unit Price</th>
                        <th>Net Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${lineItemsHtml}
                </tbody>
            </table>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentEditingCell = null;

        function toggleAttributes(index) {
            const toggle = document.querySelector(\`[data-toggle-index="\${index}"]\`);
            const row = document.querySelector(\`[data-attributes-index="\${index}"]\`);
            
            if (toggle && row) {
                toggle.classList.toggle('expanded');
                row.classList.toggle('show');
            }
        }

        function editCell(cell) {
            // Prevent multiple edits at once
            if (currentEditingCell) {
                return;
            }

            currentEditingCell = cell;
            const field = cell.dataset.field;
            const itemIndex = cell.dataset.itemIndex;
            const currentValue = cell.dataset.value;

            // Store original content (remove edit icon for storage)
            const editIcon = cell.querySelector('.edit-icon');
            const originalContent = cell.innerHTML;
            cell.classList.add('editing');

            // Create input element
            const input = document.createElement('input');
            input.type = field === 'Quantity' ? 'number' : 'text';
            input.className = 'editable-input';
            input.value = field === 'Discount' ? parseFloat(currentValue) || 0 : currentValue;
            
            if (field === 'Quantity') {
                input.min = '1';
                input.step = '1';
            } else if (field === 'Discount') {
                input.min = '0';
                input.max = '100';
                input.step = '0.01';
            }

            // Replace cell content with input
            cell.innerHTML = '';
            cell.appendChild(input);
            input.focus();
            input.select();

            // Handle save
            const saveValue = () => {
                const newValue = input.value.trim();
                
                // Validate
                if (newValue === '' || (field === 'Quantity' && parseFloat(newValue) < 1)) {
                    // Restore original if invalid
                    cell.innerHTML = originalContent;
                    cell.classList.remove('editing');
                    currentEditingCell = null;
                    return;
                }

                const parsedValue = field === 'Quantity' ? parseInt(newValue) : parseFloat(newValue);
                
                // Check if value changed
                if (parsedValue.toString() !== currentValue) {
                    // Update display with the value and icon
                    const displayValue = field === 'Discount' 
                        ? (parsedValue > 0 ? \`\${parsedValue}%\` : '-')
                        : parsedValue;
                    
                    cell.innerHTML = displayValue + ' <i class="codicon codicon-edit edit-icon"></i>';
                    cell.dataset.value = parsedValue;
                    
                    // Send update message to extension
                    vscode.postMessage({
                        command: 'updateField',
                        itemIndex: parseInt(itemIndex),
                        field: field,
                        value: parsedValue
                    });

                    // Show success indicator briefly
                    showSaveSuccess(cell);
                } else {
                    // No change, restore original
                    cell.innerHTML = originalContent;
                }
                
                cell.classList.remove('editing');
                currentEditingCell = null;
            };

            // Save on blur
            input.addEventListener('blur', saveValue);

            // Save on Enter, cancel on Escape
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    input.blur();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cell.innerHTML = originalContent;
                    cell.classList.remove('editing');
                    currentEditingCell = null;
                }
            });
        }

        function showSaveSuccess(cell) {
            // Create temporary success indicator
            const indicator = document.createElement('span');
            indicator.className = 'save-indicator';
            indicator.innerHTML = '<i class="codicon codicon-check"></i> Saved';
            cell.appendChild(indicator);
            
            // Show it
            setTimeout(() => indicator.classList.add('show'), 10);
            
            // Hide and remove after 2 seconds
            setTimeout(() => {
                indicator.classList.remove('show');
                setTimeout(() => indicator.remove(), 300);
            }, 2000);
        }
    </script>
</body>
</html>`;
    }

    /**
     * Generate HTML for configurator snapshots
     */
    private getHtmlForConfiguratorSnapshot(snapshot: any, logoUri: vscode.Uri, snapshotPath: string): string {
        const metadata = snapshot.snapshotMetadata || {};
        const quoteContext = snapshot.quoteContext || {};
        const expectedQuoteState = snapshot.expectedQuoteState || {};
        const lineItems = expectedQuoteState.QuoteLineItem || [];
        const attributes = expectedQuoteState.QuoteLineItemAttribute || [];
        const relationships = expectedQuoteState.QuoteLineItemRelationship || [];
        const messages = expectedQuoteState.messages || [];

        // Build attribute map: lineItemReferenceId -> attributes[]
        const attributeMap = new Map<string, any[]>();
        attributes.forEach((attr: any) => {
            const lineItemRef = attr.QuoteLineItemId;
            if (!attributeMap.has(lineItemRef)) {
                attributeMap.set(lineItemRef, []);
            }
            attributeMap.get(lineItemRef)!.push(attr);
        });

        // Build relationship map for bundle structure
        const childrenMap = new Map<string, any[]>();
        const childRefs = new Set<string>();
        relationships.forEach((rel: any) => {
            const mainRef = rel.mainItemReferenceId;
            const assocRef = rel.associatedItemReferenceId;
            if (!childrenMap.has(mainRef)) {
                childrenMap.set(mainRef, []);
            }
            childrenMap.get(mainRef)!.push({
                associatedItemReferenceId: assocRef,
                relationship: rel
            });
            childRefs.add(assocRef);
        });

        // Root items are those not in childRefs
        const rootItems = lineItems.filter((item: any) => !childRefs.has(item.referenceId));

        const lineItemsHtml = rootItems.map((item: any, index: number) => 
            this.renderConfiguratorLineItem(item, 0, childrenMap, attributeMap, lineItems, index)
        ).join('');

        // Messages section
        const messagesHtml = messages.length > 0 ? `
            <div class="messages-section">
                <div class="section-title">Configuration Messages</div>
                <div class="messages-list">
                    ${messages.map((msg: any) => `
                        <div class="message-item message-${msg.messageType || 'info'}">
                            <i class="codicon codicon-${this.getMessageIcon(msg.messageType)}"></i>
                            <div class="message-content">
                                <div class="message-text">${this.escapeHtml(msg.message || '')}</div>
                                ${msg.category ? `<div class="message-category">${this.escapeHtml(msg.category)}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configurator Snapshot Viewer</title>
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
            padding: 20px;
            line-height: 1.5;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        .page-header {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 20px;
        }

        .page-title {
            font-size: 22px;
            font-weight: 700;
            color: var(--vscode-foreground);
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .page-subtitle {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 4px;
            font-weight: 500;
        }

        .page-filename {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            font-family: var(--vscode-editor-font-family);
            margin-bottom: 12px;
            opacity: 0.8;
        }

        .page-meta {
            display: flex;
            gap: 24px;
            font-size: 12px;
            padding-top: 12px;
            border-top: 1px solid var(--vscode-panel-border);
        }

        .page-meta-item {
            display: flex;
            align-items: center;
            gap: 6px;
            color: var(--vscode-descriptionForeground);
        }

        .quote-context {
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 20px;
        }

        .section-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--vscode-foreground);
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .context-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 12px;
            font-size: 13px;
        }

        .context-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .context-label {
            color: var(--vscode-descriptionForeground);
            font-weight: 500;
            font-size: 11px;
            text-transform: uppercase;
        }

        .context-value {
            color: var(--vscode-foreground);
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
        }

        .line-items-section {
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 20px;
        }

        .line-items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-top: 12px;
        }

        .line-items-table thead {
            background-color: var(--vscode-editor-background);
            border-bottom: 2px solid var(--vscode-panel-border);
        }

        .line-items-table th {
            padding: 10px 12px;
            text-align: left;
            font-weight: 600;
            color: var(--vscode-foreground);
            border-bottom: 2px solid var(--vscode-panel-border);
        }

        .line-items-table th:nth-child(2),
        .line-items-table th:nth-child(3) {
            text-align: center;
        }

        .line-items-table tbody tr {
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .line-items-table tbody tr:hover {
            background-color: var(--vscode-list-hoverBackground);
        }

        .line-items-table tbody tr:last-child {
            border-bottom: none;
        }

        .line-items-table td {
            padding: 10px 12px;
            color: var(--vscode-foreground);
        }

        .line-items-table td:nth-child(2),
        .line-items-table td:nth-child(3) {
            text-align: center;
        }

        .product-name-cell {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .product-name-cell.indented {
            padding-left: 32px;
        }

        .product-name-text {
            flex: 1;
        }

        .indent-marker {
            color: var(--vscode-descriptionForeground);
            margin-right: 4px;
        }

        .attributes-toggle {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            color: var(--vscode-textLink-foreground);
            font-size: 11px;
            margin-left: 8px;
            user-select: none;
            text-decoration: none;
        }

        .attributes-toggle:hover {
            text-decoration: underline;
        }

        .attributes-toggle .codicon {
            font-size: 11px;
            transition: transform 0.2s;
        }

        .attributes-toggle.expanded .codicon {
            transform: rotate(90deg);
        }

        .attributes-row {
            display: none;
        }

        .attributes-row.show {
            display: table-row;
        }

        .attributes-cell {
            padding: 8px 12px !important;
            background-color: var(--vscode-editor-background);
            border-top: 1px solid var(--vscode-panel-border);
        }

        .attribute-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 8px;
            font-size: 11px;
        }

        .attribute-item {
            display: flex;
            gap: 4px;
        }

        .attribute-name {
            color: var(--vscode-descriptionForeground);
            font-weight: 500;
        }

        .attribute-value {
            color: var(--vscode-foreground);
        }

        .badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 600;
            margin-left: 8px;
        }

        .subscription-badge {
            background-color: var(--vscode-inputValidation-infoBackground);
            color: var(--vscode-inputValidation-infoForeground);
        }

        .bundle-badge {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }

        /* Messages section */
        .messages-section {
            background-color: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 20px;
        }

        .messages-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 12px;
        }

        .message-item {
            display: flex;
            gap: 10px;
            padding: 10px;
            border-radius: 4px;
            font-size: 12px;
        }

        .message-item.message-error {
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
        }

        .message-item.message-warning {
            background-color: var(--vscode-inputValidation-warningBackground);
            border: 1px solid var(--vscode-inputValidation-warningBorder);
        }

        .message-item.message-info {
            background-color: var(--vscode-inputValidation-infoBackground);
            border: 1px solid var(--vscode-inputValidation-infoBorder);
        }

        .message-content {
            flex: 1;
        }

        .message-text {
            margin-bottom: 4px;
        }

        .message-category {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Page Header -->
        <div class="page-header">
            <div class="page-title">
                <i class="codicon codicon-symbol-property"></i>
                ${this.escapeHtml(quoteContext.quoteName || metadata.description || 'Untitled Snapshot')}
            </div>
            <div class="page-subtitle">${this.escapeHtml(metadata.description || 'Configurator Test Snapshot')}</div>
            <div class="page-filename">${this.escapeHtml(snapshotPath.split('/').pop() || '')}</div>
            <div class="page-meta">
                <div class="page-meta-item">
                    <i class="codicon codicon-cloud"></i>
                    <span>Source Org: ${this.escapeHtml(metadata.sourceOrgAlias || metadata.sourceOrgUsername || 'Unknown')}</span>
                </div>
                <div class="page-meta-item">
                    <i class="codicon codicon-calendar"></i>
                    <span>Created: ${this.formatDate(metadata.createdAt)}</span>
                </div>
                <div class="page-meta-item">
                    <i class="codicon codicon-beaker"></i>
                    <span>Test Type: ${this.escapeHtml(metadata.testType || 'positiveConfiguration')}</span>
                </div>
            </div>
        </div>

        <!-- Quote Context -->
        <div class="quote-context">
            <div class="section-title">Quote Context</div>
            <div class="context-grid">
                <div class="context-item">
                    <div class="context-label">Account ID</div>
                    <div class="context-value">${this.escapeHtml(quoteContext.accountId || quoteContext.AccountId || 'N/A')}</div>
                </div>
                <div class="context-item">
                    <div class="context-label">Opportunity ID</div>
                    <div class="context-value">${this.escapeHtml(quoteContext.opportunityId || quoteContext.OpportunityId || 'N/A')}</div>
                </div>
                <div class="context-item">
                    <div class="context-label">Pricebook ID</div>
                    <div class="context-value">${this.escapeHtml(quoteContext.Pricebook2Id || quoteContext.pricebookId || 'N/A')}</div>
                </div>
                ${quoteContext.CurrencyIsoCode ? `
                <div class="context-item">
                    <div class="context-label">Currency</div>
                    <div class="context-value">${this.escapeHtml(quoteContext.CurrencyIsoCode)}</div>
                </div>
                ` : ''}
                <div class="context-item">
                    <div class="context-label">Line Items</div>
                    <div class="context-value">${lineItems.length}</div>
                </div>
                ${relationships.length > 0 ? `
                <div class="context-item">
                    <div class="context-label">Relationships</div>
                    <div class="context-value">${relationships.length}</div>
                </div>
                ` : ''}
            </div>
        </div>

        ${messagesHtml}

        <!-- Quote Line Items Table -->
        <div class="line-items-section">
            <div class="section-title">Quote Line Items</div>
            <table class="line-items-table">
                <thead>
                    <tr>
                        <th>Product Name</th>
                        <th>Qty</th>
                        <th>Sort Order</th>
                        <th>Subscription Details</th>
                    </tr>
                </thead>
                <tbody>
                    ${lineItemsHtml}
                </tbody>
            </table>
        </div>
    </div>

    <script>
        function toggleAttributes(index) {
            const toggle = document.querySelector(\`[data-toggle-index="\${index}"]\`);
            const row = document.querySelector(\`[data-attributes-index="\${index}"]\`);
            
            if (toggle && row) {
                toggle.classList.toggle('expanded');
                row.classList.toggle('show');
            }
        }
    </script>
</body>
</html>`;
    }

    /**
     * Render configurator line item with bundle hierarchy
     */
    private renderConfiguratorLineItem(
        item: any, 
        level: number, 
        childrenMap: Map<string, any[]>, 
        attributeMap: Map<string, any[]>,
        allLineItems: any[],
        index: number
    ): string {
        const productName = item.Product2?.Name || item.Product2Id || 'Unknown Product';
        const productCode = item.Product2?.ProductCode || '';
        const quantity = item.Quantity || 1;
        const sortOrder = item.SortOrder !== null && item.SortOrder !== undefined ? item.SortOrder : '-';
        const referenceId = item.referenceId;
        
        // Subscription details
        const isSubscription = item.BillingFrequency && item.BillingFrequency !== null;
        let subscriptionDetails = '-';
        if (isSubscription) {
            const parts = [];
            if (item.BillingFrequency) parts.push(item.BillingFrequency);
            if (item.StartDate) parts.push(`Start: ${item.StartDate}`);
            if (item.EndDate) parts.push(`End: ${item.EndDate}`);
            subscriptionDetails = parts.join(', ');
        }
        
        // Get attributes for this line item
        const itemAttributes = attributeMap.get(referenceId) || [];
        
        // Check if this item has children (is a bundle parent)
        const children = childrenMap.get(referenceId) || [];
        const hasChildren = children.length > 0;
        
        const indentClass = level > 0 ? 'indented' : '';
        const indentMarker = level > 0 ? '<span class="indent-marker">→</span>' : '';
        
        // Badges
        let badges = '';
        if (isSubscription) {
            badges += `<span class="badge subscription-badge"><i class="codicon codicon-sync"></i> ${item.BillingFrequency}</span>`;
        }
        if (hasChildren) {
            badges += `<span class="badge bundle-badge"><i class="codicon codicon-package"></i> Bundle</span>`;
        }
        
        // Attributes toggle
        const attributesToggle = itemAttributes.length > 0 
            ? `<span class="attributes-toggle" data-toggle-index="${index}" onclick="toggleAttributes(${index})">
                <i class="codicon codicon-chevron-right"></i>
                <span>${itemAttributes.length} attr</span>
               </span>` 
            : '';
        
        // Build table row
        let html = `
            <tr data-item-index="${index}">
                <td>
                    <div class="product-name-cell ${indentClass}">
                        ${indentMarker}
                        <span class="product-name-text">
                            ${this.escapeHtml(productName)}
                            ${productCode ? `<span style="color: var(--vscode-descriptionForeground); font-size: 11px;"> (${this.escapeHtml(productCode)})</span>` : ''}
                        </span>
                        ${badges}
                        ${attributesToggle}
                    </div>
                </td>
                <td>${quantity}</td>
                <td>${sortOrder}</td>
                <td style="font-size: 11px;">${this.escapeHtml(subscriptionDetails)}</td>
            </tr>
        `;
        
        // Add attributes row if there are attributes
        if (itemAttributes.length > 0) {
            html += `
                <tr class="attributes-row" data-attributes-index="${index}">
                    <td colspan="4" class="attributes-cell">
                        <div class="attribute-list">
                            ${itemAttributes.map((attr: any) => `
                                <div class="attribute-item">
                                    <span class="attribute-name">${this.escapeHtml(attr.AttributeDefinitionName || 'Unknown')}:</span>
                                    <span class="attribute-value">${this.escapeHtml(attr.AttributePicklistValueName || attr.AttributeValue || 'N/A')}</span>
                                </div>
                            `).join('')}
                        </div>
                    </td>
                </tr>
            `;
        }
        
        // Add children rows (bundle components)
        if (hasChildren) {
            children.forEach((childRef: any) => {
                const childItem = allLineItems.find((li: any) => li.referenceId === childRef.associatedItemReferenceId);
                if (childItem) {
                    html += this.renderConfiguratorLineItem(childItem, level + 1, childrenMap, attributeMap, allLineItems, index);
                }
            });
        }
        
        return html;
    }

    /**
     * Get icon for message type
     */
    private getMessageIcon(messageType: string): string {
        switch (messageType?.toLowerCase()) {
            case 'error':
                return 'error';
            case 'warning':
                return 'warning';
            case 'info':
            default:
                return 'info';
        }
    }

    private renderLineItem(item: any, level: number, childrenMap: Map<string, any[]>): string {
        const productId = item.productIdentifier?.value || 'Unknown';
        const productName = item.productIdentifier?.productName || productId;
        const expectedPricing = item.expectedPricingFields || {};
        const sourceData = item.sourceData || {};
        const attributes = item.attributes || [];
        const adjustments = item.adjustments || [];
        const hasDiscount = adjustments.length > 0 || (expectedPricing.Discount && expectedPricing.Discount > 0);
        const isSubscription = sourceData.BillingFrequency && sourceData.BillingFrequency !== null;
        
        const children = childrenMap.get(productId) || [];
        const hasChildren = children.length > 0;

        const indentClass = level > 0 ? 'indented' : '';
        const indentMarker = level > 0 ? '<span class="indent-marker">→</span>' : '';
        
        // Subscription badge (kept for important info)
        let badges = '';
        if (isSubscription) {
            badges += `<span class="badge subscription-badge"><i class="codicon codicon-sync"></i> ${sourceData.BillingFrequency}</span>`;
        }
        
        // Attributes toggle (expandable)
        const attributesToggle = attributes.length > 0 
            ? `<span class="attributes-toggle" data-toggle-index="${item._index}" onclick="toggleAttributes(${item._index})">
                <i class="codicon codicon-chevron-right"></i>
                <span>${attributes.length} attr</span>
               </span>` 
            : '';

        // Format discount column
        const discountDisplay = hasDiscount 
            ? `${adjustments[0]?.value || expectedPricing.Discount || 0}%` 
            : '-';

        // Build table row
        let html = `
            <tr data-item-index="${item._index}">
                <td>
                    <div class="product-name-cell ${indentClass}">
                        ${indentMarker}
                        <span class="product-name-text">${this.escapeHtml(productName)}</span>
                        ${badges}
                        ${attributesToggle}
                    </div>
                </td>
                <td class="editable-cell" 
                    data-field="Quantity" 
                    data-item-index="${item._index}" 
                    data-value="${expectedPricing.Quantity || 1}"
                    ondblclick="editCell(this)"
                    title="Double-click to edit">
                    ${expectedPricing.Quantity || 1}
                    <i class="codicon codicon-edit edit-icon"></i>
                </td>
                <td>$${this.formatNumber(expectedPricing.UnitPrice || 0)}</td>
                <td class="editable-cell" 
                    data-field="Discount" 
                    data-item-index="${item._index}" 
                    data-value="${hasDiscount ? (adjustments[0]?.value || expectedPricing.Discount || 0) : 0}"
                    ondblclick="editCell(this)"
                    title="Double-click to edit">
                    ${discountDisplay}
                    <i class="codicon codicon-edit edit-icon"></i>
                </td>
                <td>$${this.formatNumber(expectedPricing.NetUnitPrice || 0)}</td>
                <td>$${this.formatNumber(expectedPricing.NetTotalPrice || 0)}</td>
            </tr>
        `;

        // Add attributes row if there are attributes
        if (attributes.length > 0) {
            html += `
                <tr class="attributes-row" data-attributes-index="${item._index}">
                    <td colspan="6" class="attributes-cell">
                        <div class="attribute-list">
                            ${attributes.map((attr: any) => `
                                <div class="attribute-item">
                                    <span class="attribute-name">${this.escapeHtml(attr.attributeDefinitionName || 'Unknown')}:</span>
                                    <span class="attribute-value">${this.escapeHtml(attr.attributePicklistValueName || attr.value || 'N/A')}</span>
                                </div>
                            `).join('')}
                        </div>
                    </td>
                </tr>
            `;
        }

        // Add children rows
        if (hasChildren) {
            html += children.map(child => this.renderLineItem(child, level + 1, childrenMap)).join('');
        }

        return html;
    }

    private formatNumber(num: number): string {
        return num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    private formatDate(dateString: string | null | undefined): string {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return dateString;
        }
    }

    private escapeHtml(text: string): string {
        if (!text) return '';
        return text.replace(/[&<>"']/g, (char) => {
            const entities: { [key: string]: string } = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            };
            return entities[char] || char;
        });
    }

    /**
     * Update a field in the snapshot JSON file
     */
    private async updateSnapshotField(snapshotPath: string, itemIndex: number, field: string, value: number): Promise<void> {
        try {
            // Read the current snapshot
            const snapshotContent = fs.readFileSync(snapshotPath, 'utf8');
            const snapshot = JSON.parse(snapshotContent);

            // Get the line item to update
            const lineItems = snapshot.recreationPayload?.lineItems || [];
            if (itemIndex < 0 || itemIndex >= lineItems.length) {
                throw new Error(`Invalid item index: ${itemIndex}`);
            }

            const lineItem = lineItems[itemIndex];

            // Update the appropriate field
            if (field === 'Quantity') {
                // Update quantity in both expectedPricingFields and quantity field
                lineItem.quantity = value;
                if (lineItem.expectedPricingFields) {
                    lineItem.expectedPricingFields.Quantity = value;
                }
            } else if (field === 'Discount') {
                // Update discount in adjustments and expectedPricingFields
                if (value > 0) {
                    // Add or update adjustment
                    if (!lineItem.adjustments) {
                        lineItem.adjustments = [];
                    }
                    if (lineItem.adjustments.length > 0) {
                        lineItem.adjustments[0].value = value;
                    } else {
                        lineItem.adjustments.push({
                            type: 'Amount',
                            value: value
                        });
                    }
                    
                    // Update expectedPricingFields
                    if (lineItem.expectedPricingFields) {
                        lineItem.expectedPricingFields.Discount = value;
                    }
                } else {
                    // Remove discount
                    lineItem.adjustments = [];
                    if (lineItem.expectedPricingFields) {
                        lineItem.expectedPricingFields.Discount = null;
                    }
                }
            }

            // Write the updated snapshot back to file
            const updatedContent = JSON.stringify(snapshot, null, 2);
            fs.writeFileSync(snapshotPath, updatedContent, 'utf8');

        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to update snapshot: ${error.message}`);
            throw error;
        }
    }
}

