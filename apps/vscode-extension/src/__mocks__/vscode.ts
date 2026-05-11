// Mock implementation of VS Code API for testing

export const window = {
  showInformationMessage: jest.fn().mockResolvedValue(undefined),
  showWarningMessage: jest.fn().mockResolvedValue(undefined),
  showErrorMessage: jest.fn().mockResolvedValue(undefined),
  showInputBox: jest.fn().mockResolvedValue('test-input'),
  showQuickPick: jest.fn().mockResolvedValue(undefined),
  withProgress: jest.fn().mockImplementation(async (options, task) => {
    const progress = {
      report: jest.fn()
    };
    return task(progress);
  }),
  createWebviewPanel: jest.fn().mockReturnValue({
    webview: {
      html: '',
      postMessage: jest.fn(),
      onDidReceiveMessage: jest.fn(),
      asWebviewUri: jest.fn().mockImplementation((uri: any) => ({
        fsPath: uri.fsPath,
        scheme: 'vscode-webview',
        path: uri.path,
        toString: () => `vscode-webview://resource${uri.fsPath}`
      }))
    },
    onDidDispose: jest.fn(),
    dispose: jest.fn(),
    title: 'Test Panel'
  }),
  showTextDocument: jest.fn().mockResolvedValue(undefined),
  registerTreeDataProvider: jest.fn(),
  createTreeView: jest.fn().mockReturnValue({
    title: 'Test Tree View',
    onDidChangeSelection: jest.fn(),
    onDidChangeVisibility: jest.fn(),
    onDidCollapseElement: jest.fn(),
    onDidExpandElement: jest.fn(),
    selection: [],
    visible: true,
    reveal: jest.fn(),
    dispose: jest.fn()
  }),
  createOutputChannel: jest.fn().mockReturnValue({
    append: jest.fn(),
    appendLine: jest.fn(),
    clear: jest.fn(),
    dispose: jest.fn(),
    hide: jest.fn(),
    show: jest.fn(),
    name: 'Test Channel'
  }),
  registerWebviewViewProvider: jest.fn().mockReturnValue({
    dispose: jest.fn()
  })
};

export const workspace = {
  getConfiguration: jest.fn().mockImplementation((section?: string) => ({
    get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
      const config = {
        // When called with getConfiguration('revCloudBlueprint'), keys are like 'pricing.snapshotDirectory'
        'pricing.snapshotDirectory': 'revcloud_blueprint/pricing/snapshots',
        'pricing.productExternalIdField': 'Product_SKU__c',
        'salesforce.apiVersion': 'v64.0',
        'pricing.attributeDefinitionExternalIdField': 'Code',
        'pricing.attributePicklistValueExternalIdField': 'Code',
        'verboseLogging': false,
        'autoRefreshTests': true,
        'defaultSourceOrg': '',
        'defaultTargetOrg': '',
        // Also support full key names for backward compatibility
        'revCloudBlueprint.pricing.snapshotDirectory': 'revcloud_blueprint/pricing/snapshots',
        'revCloudBlueprint.pricing.productExternalIdField': 'Product_SKU__c',
        'revCloudBlueprint.verboseLogging': false,
        'revCloudBlueprint.autoRefreshTests': true
      };
      const value = config[key as keyof typeof config];
      return value !== undefined ? value : (defaultValue || '');
    }),
    update: jest.fn().mockResolvedValue(undefined)
  })),
  workspaceFolders: [{
    uri: { fsPath: '/test/workspace' },
    name: 'test-workspace',
    index: 0
  }],
  openTextDocument: jest.fn().mockResolvedValue({
    fileName: 'test.json',
    getText: jest.fn().mockReturnValue('{}')
  }),
  createFileSystemWatcher: jest.fn().mockReturnValue({
    onDidCreate: jest.fn(),
    onDidDelete: jest.fn(),
    onDidChange: jest.fn(),
    dispose: jest.fn()
  }),
  onDidChangeWorkspaceFolders: jest.fn().mockReturnValue({
    dispose: jest.fn()
  })
};

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3
};

export const commands = {
  registerCommand: jest.fn().mockReturnValue({ dispose: jest.fn() }),
  executeCommand: jest.fn().mockResolvedValue(undefined)
};

export const extensions = {
  getExtension: jest.fn().mockImplementation((id: string) => {
    // Mock the Salesforce extension as available but inactive
    if (id === 'salesforce.salesforcedx-vscode') {
      return {
        id: id,
        isActive: false,
        packageJSON: { name: 'Salesforce Extension Pack' },
        extensionPath: '/mock/path/to/salesforce/extension',
        activate: jest.fn().mockResolvedValue(undefined)
      };
    }
    return undefined;
  }),
  all: []
};

export const Uri = {
  file: jest.fn().mockImplementation((path: string) => ({
    fsPath: path,
    scheme: 'file',
    path: path
  })),
  parse: jest.fn(),
  joinPath: jest.fn().mockImplementation((base: any, ...pathSegments: string[]) => ({
    fsPath: `${base.fsPath}/${pathSegments.join('/')}`,
    scheme: 'file',
    path: `${base.fsPath}/${pathSegments.join('/')}`
  }))
};

export const ViewColumn = {
  One: 1,
  Two: 2,
  Three: 3,
  Active: -1,
  Beside: -2
};

export const ProgressLocation = {
  SourceControl: 1,
  Window: 10,
  Notification: 15
};

export const TreeItemCollapsibleState = {
  None: 0,
  Collapsed: 1,
  Expanded: 2
};

export const ThemeIcon = jest.fn().mockImplementation((id: string) => ({
  id: id
}));

export class TreeItem {
  constructor(public label: string, public collapsibleState?: number) {}
  tooltip?: string;
  description?: string;
  contextValue?: string;
  iconPath?: any;
  command?: any;
}

export class EventEmitter {
  private listeners: Array<(...args: any[]) => void> = [];
  
  get event() {
    return (listener: (...args: any[]) => void) => {
      this.listeners.push(listener);
      return { dispose: jest.fn() };
    };
  }
  
  fire(...args: any[]) {
    this.listeners.forEach(listener => listener(...args));
  }
  
  dispose() {
    this.listeners = [];
  }
}

export const CancellationToken = {
  isCancellationRequested: false,
  onCancellationRequested: jest.fn()
};

// Mock extension context
export const mockExtensionContext = {
  subscriptions: [],
  workspaceState: {
    get: jest.fn(),
    update: jest.fn()
  },
  globalState: {
    get: jest.fn(),
    update: jest.fn()
  },
  extensionUri: Uri.file('/test/extension'),
  extensionPath: '/test/extension',
  storagePath: '/test/storage',
  globalStoragePath: '/test/global-storage',
  logPath: '/test/logs'
};
