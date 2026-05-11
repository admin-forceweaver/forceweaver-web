import * as vscode from 'vscode';
import { UserStatusViewProvider } from '../../ui/userStatusViewProvider';

// Mock vscode module
jest.mock('vscode', () => ({
    Uri: {
        joinPath: jest.fn((base: any, ...segments: string[]) => ({
            fsPath: `${base.fsPath}/${segments.join('/')}`,
            toString: () => `${base.fsPath}/${segments.join('/')}`
        }))
    },
    commands: {
        executeCommand: jest.fn().mockResolvedValue(undefined)
    },
    EventEmitter: jest.fn().mockImplementation(() => {
        const listeners: Array<(...args: any[]) => void> = [];
        return {
            event: (listener: (...args: any[]) => void) => {
                listeners.push(listener);
                return { dispose: jest.fn() };
            },
            fire: (...args: any[]) => {
                listeners.forEach(listener => listener(...args));
            },
            dispose: () => {
                listeners.length = 0;
            }
        };
    })
}));

describe('UserStatusViewProvider', () => {
    let provider: UserStatusViewProvider;
    let mockExtensionUri: vscode.Uri;
    let mockContext: vscode.ExtensionContext;
    let mockWebviewView: vscode.WebviewView;
    let mockWebview: vscode.Webview;
    let messageHandler: ((message: any) => Promise<void>) | undefined;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock extension URI
        mockExtensionUri = {
            fsPath: '/mock/extension/path',
            scheme: 'file',
            authority: '',
            path: '/mock/extension/path',
            query: '',
            fragment: '',
            with: jest.fn(),
            toJSON: jest.fn()
        } as any;

        // Mock workspace state
        const mockWorkspaceState = {
            get: jest.fn(),
            update: jest.fn().mockResolvedValue(undefined),
            keys: jest.fn().mockReturnValue([])
        };

        // Mock context
        mockContext = {
            workspaceState: mockWorkspaceState,
            globalState: {
                get: jest.fn(),
                update: jest.fn(),
                keys: jest.fn().mockReturnValue([]),
                setKeysForSync: jest.fn()
            },
            subscriptions: [],
            extensionUri: mockExtensionUri,
            extensionPath: '/mock/extension/path',
            asAbsolutePath: jest.fn((relativePath: string) => `/mock/extension/path/${relativePath}`),
            storagePath: '/mock/storage',
            globalStoragePath: '/mock/global/storage',
            logPath: '/mock/log',
            extensionMode: 3,
            storageUri: mockExtensionUri,
            globalStorageUri: mockExtensionUri,
            logUri: mockExtensionUri,
            secrets: {
                get: jest.fn().mockResolvedValue(undefined),
                store: jest.fn().mockResolvedValue(undefined),
                delete: jest.fn().mockResolvedValue(undefined),
                onDidChange: jest.fn()
            } as any,
            environmentVariableCollection: {} as any,
            extension: {} as any
        } as any;

        // Mock webview
        mockWebview = {
            options: {},
            html: '',
            onDidReceiveMessage: jest.fn((handler) => {
                messageHandler = handler;
                return { dispose: jest.fn() };
            }),
            postMessage: jest.fn(),
            asWebviewUri: jest.fn((uri: vscode.Uri) => ({
                ...uri,
                scheme: 'vscode-webview',
                toString: () => `vscode-webview://${uri.fsPath}`
            })),
            cspSource: 'vscode-webview:'
        } as any;

        // Mock webview view
        mockWebviewView = {
            webview: mockWebview,
            viewType: UserStatusViewProvider.viewType,
            title: 'User Status',
            description: '',
            visible: true,
            onDidDispose: jest.fn(),
            onDidChangeVisibility: jest.fn(),
            show: jest.fn(),
            badge: undefined
        } as any;

        provider = new UserStatusViewProvider(mockExtensionUri, mockContext);
    });

    describe('constructor', () => {
        it('should create an instance', () => {
            expect(provider).toBeDefined();
            expect(provider).toBeInstanceOf(UserStatusViewProvider);
        });

        it('should have correct viewType', () => {
            expect(UserStatusViewProvider.viewType).toBe('revCloudBlueprint.userStatusView');
        });
    });

    describe('resolveWebviewView', () => {
        it('should configure webview options correctly', () => {
            const mockResolveContext: vscode.WebviewViewResolveContext = {
                state: undefined
            };
            const mockToken: vscode.CancellationToken = {
                isCancellationRequested: false,
                onCancellationRequested: jest.fn()
            };

            provider.resolveWebviewView(mockWebviewView, mockResolveContext, mockToken);

            expect(mockWebview.options).toEqual({
                enableScripts: true,
                localResourceRoots: [mockExtensionUri]
            });
        });

        it('should set up message handler', () => {
            const mockResolveContext: vscode.WebviewViewResolveContext = {
                state: undefined
            };
            const mockToken: vscode.CancellationToken = {
                isCancellationRequested: false,
                onCancellationRequested: jest.fn()
            };

            provider.resolveWebviewView(mockWebviewView, mockResolveContext, mockToken);

            expect(mockWebview.onDidReceiveMessage).toHaveBeenCalled();
        });

        it('should set webview HTML', async () => {
            const mockResolveContext: vscode.WebviewViewResolveContext = {
                state: undefined
            };
            const mockToken: vscode.CancellationToken = {
                isCancellationRequested: false,
                onCancellationRequested: jest.fn()
            };

            provider.resolveWebviewView(mockWebviewView, mockResolveContext, mockToken);
            
            // Wait for async rendering to complete
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(mockWebview.html).toBeDefined();
            expect(mockWebview.html).toContain('<!DOCTYPE html>');
            expect(mockWebview.html).toContain('Rev Cloud Blueprint');
        });

        it('should handle "done" command message', async () => {
            const mockResolveContext: vscode.WebviewViewResolveContext = {
                state: undefined
            };
            const mockToken: vscode.CancellationToken = {
                isCancellationRequested: false,
                onCancellationRequested: jest.fn()
            };

            provider.resolveWebviewView(mockWebviewView, mockResolveContext, mockToken);

            // Trigger the done command
            await messageHandler!({ command: 'done' });

            expect(mockContext.workspaceState.update).toHaveBeenCalledWith('revCloudBlueprint.showUserStatus', false);
            expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', 'revCloudBlueprint.showUserStatus', false);
        });

        it('should ignore unknown command messages', async () => {
            const mockResolveContext: vscode.WebviewViewResolveContext = {
                state: undefined
            };
            const mockToken: vscode.CancellationToken = {
                isCancellationRequested: false,
                onCancellationRequested: jest.fn()
            };

            provider.resolveWebviewView(mockWebviewView, mockResolveContext, mockToken);

            // Trigger an unknown command
            await messageHandler!({ command: 'unknown' });

            expect(mockContext.workspaceState.update).not.toHaveBeenCalled();
            expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
        });
    });

    describe('HTML content generation', () => {
        beforeEach(() => {
            const mockResolveContext: vscode.WebviewViewResolveContext = {
                state: undefined
            };
            const mockToken: vscode.CancellationToken = {
                isCancellationRequested: false,
                onCancellationRequested: jest.fn()
            };

            provider.resolveWebviewView(mockWebviewView, mockResolveContext, mockToken);
        });

        it('should include logo image with correct path', () => {
            expect(vscode.Uri.joinPath).toHaveBeenCalledWith(mockExtensionUri, 'images', 'rcb_logo_color.png');
            expect(mockWebview.asWebviewUri).toHaveBeenCalled();
            expect(mockWebview.html).toContain('rcb_logo_color.png');
        });

        it('should include welcome title', () => {
            expect(mockWebview.html).toContain('Welcome to Rev Cloud Blueprint!');
        });

        it('should include public beta info', () => {
            expect(mockWebview.html).toContain('Currently in Public Beta');
        });

        it('should include sign in button', () => {
            expect(mockWebview.html).toContain('Sign In');
            expect(mockWebview.html).toContain('onclick="signIn()"');
        });

        it('should include sign up button', () => {
            expect(mockWebview.html).toContain('Create Account');
            expect(mockWebview.html).toContain('onclick="signUp()"');
        });

        it('should include product description', () => {
            expect(mockWebview.html).toContain('comprehensive testing framework for Salesforce Revenue Cloud');
            expect(mockWebview.html).toContain('pricing validation and regression testing');
        });

        it('should include getting started instructions', () => {
            expect(mockWebview.html).toContain('After signing in, you can create pricing snapshots');
        });

        it('should include Done button', () => {
            expect(mockWebview.html).toContain('<button class="done-button"');
            expect(mockWebview.html).toContain('Done</button>');
        });

        it('should include script for sending messages', () => {
            expect(mockWebview.html).toContain('acquireVsCodeApi()');
            expect(mockWebview.html).toContain('function sendDone()');
            expect(mockWebview.html).toContain('vscode.postMessage');
        });

        it('should include CSS styles', () => {
            expect(mockWebview.html).toContain('<style>');
            expect(mockWebview.html).toContain('var(--vscode-');
            expect(mockWebview.html).toContain('.done-button');
            expect(mockWebview.html).toContain('.beta-info');
        });

        it('should have proper HTML structure', () => {
            expect(mockWebview.html).toContain('<!DOCTYPE html>');
            expect(mockWebview.html).toContain('<html lang="en">');
            expect(mockWebview.html).toContain('<head>');
            expect(mockWebview.html).toContain('<body>');
            expect(mockWebview.html).toContain('</html>');
        });

        it('should include meta tags', () => {
            expect(mockWebview.html).toContain('<meta charset="UTF-8">');
            expect(mockWebview.html).toContain('<meta name="viewport"');
        });

        it('should have header with title and button', () => {
            expect(mockWebview.html).toContain('<div class="header">');
            expect(mockWebview.html).toContain('<h2 class="header-title">Profile</h2>');
        });

        it('should have content section', () => {
            expect(mockWebview.html).toContain('<div class="content">');
        });
    });

    describe('webview lifecycle', () => {
        it('should handle webview view with existing state', () => {
            const mockResolveContext: vscode.WebviewViewResolveContext = {
                state: { someState: 'value' }
            };
            const mockToken: vscode.CancellationToken = {
                isCancellationRequested: false,
                onCancellationRequested: jest.fn()
            };

            provider.resolveWebviewView(mockWebviewView, mockResolveContext, mockToken);

            expect(mockWebview.html).toBeDefined();
        });

        it('should handle cancellation token', () => {
            const mockResolveContext: vscode.WebviewViewResolveContext = {
                state: undefined
            };
            const mockToken: vscode.CancellationToken = {
                isCancellationRequested: false,
                onCancellationRequested: jest.fn()
            };

            provider.resolveWebviewView(mockWebviewView, mockResolveContext, mockToken);

            expect(mockWebview.html).toBeDefined();
        });
    });

    describe('message handling edge cases', () => {
        beforeEach(() => {
            const mockResolveContext: vscode.WebviewViewResolveContext = {
                state: undefined
            };
            const mockToken: vscode.CancellationToken = {
                isCancellationRequested: false,
                onCancellationRequested: jest.fn()
            };

            provider.resolveWebviewView(mockWebviewView, mockResolveContext, mockToken);
        });

        it('should handle message with no command', async () => {
            await messageHandler!({});

            expect(mockContext.workspaceState.update).not.toHaveBeenCalled();
        });

        it('should throw error on null message', async () => {
            await expect(messageHandler!(null)).rejects.toThrow();
        });

        it('should handle message with empty command', async () => {
            await messageHandler!({ command: '' });

            expect(mockContext.workspaceState.update).not.toHaveBeenCalled();
        });
    });
});
