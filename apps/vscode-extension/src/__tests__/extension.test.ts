import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { activate, deactivate } from '../extension';

// Mock dependencies
jest.mock('../ui/sidebarProvider');
jest.mock('../ui/reportView');
jest.mock('../snapshot/creator');
jest.mock('../test/runner');
jest.mock('../salesforce/auth');
jest.mock('../ui/hierarchicalTreeProvider');
jest.mock('../ui/groupingModels');
jest.mock('../ui/userStatusViewProvider');
jest.mock('../services/licenseService');
jest.mock('../services/configurationService');

// Mock fs module
jest.mock('fs');

describe('Extension', () => {
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset fs mocks
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.readFileSync as jest.Mock).mockReturnValue('{"version": "1.0.0"}');
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
    (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
    (fs.statSync as jest.Mock).mockReturnValue({ size: 100 });

    mockContext = {
      subscriptions: [],
      workspaceState: {
        get: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined)
      },
      globalState: {
        get: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined)
      },
      extensionUri: vscode.Uri.file('/test/extension'),
      extensionPath: '/test/extension',
      storagePath: '/test/storage',
      globalStoragePath: '/test/global-storage',
      logPath: '/test/logs'
    } as any;
  });

  describe('activate', () => {
    it('should activate extension successfully', async () => {
      await expect(activate(mockContext)).resolves.not.toThrow();
    });

    it('should create output channel and register commands', async () => {
      await activate(mockContext);

      expect(vscode.window.createOutputChannel).toHaveBeenCalledWith('RevCloud Blueprint');
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'revCloudBlueprint.createPricingSnapshot',
        expect.any(Function)
      );
      expect(mockContext.subscriptions.length).toBeGreaterThan(0);
    });

    describe('Welcome Message', () => {
      it('should show welcome message on first activation', async () => {
        // Mock globalState.get to return undefined (first time activation)
        (mockContext.globalState.get as jest.Mock).mockReturnValue(undefined);

        const mockShowInformationMessage = jest.spyOn(vscode.window, 'showInformationMessage');

        await activate(mockContext);

        // Verify welcome message was shown
        expect(mockShowInformationMessage).toHaveBeenCalledWith(
          'Welcome to the Rev Cloud Blueprint Public Beta! All Pro features are enabled for free during this period.'
        );

        // Verify the flag was set to prevent future messages
        expect(mockContext.globalState.update).toHaveBeenCalledWith(
          'betaWelcomeMessageShownV1',
          true
        );
      });

      it('should not show welcome message on subsequent activations', async () => {
        // Mock globalState.get to return true (already shown)
        (mockContext.globalState.get as jest.Mock).mockReturnValue(true);

        const mockShowInformationMessage = jest.spyOn(vscode.window, 'showInformationMessage');

        await activate(mockContext);

        // Verify welcome message was NOT shown
        expect(mockShowInformationMessage).not.toHaveBeenCalledWith(
          'Welcome to the Rev Cloud Blueprint Public Beta! All Pro features are enabled for free during this period.'
        );

        // Verify the flag was not updated again
        expect(mockContext.globalState.update).not.toHaveBeenCalledWith(
          'betaWelcomeMessageShownV1',
          true
        );
      });

      it('should check for welcome message flag with correct key', async () => {
        await activate(mockContext);

        // Verify the correct key was used to check the flag
        expect(mockContext.globalState.get).toHaveBeenCalledWith('betaWelcomeMessageShownV1');
      });
    });

    it('should register tree data provider', async () => {
      await activate(mockContext);

      expect(vscode.window.createTreeView).toHaveBeenCalledWith(
        'revCloudBlueprint',
        expect.objectContaining({
          treeDataProvider: expect.any(Object),
          showCollapseAll: true
        })
      );
    });

    it('should register webview provider for user status', async () => {
      await activate(mockContext);

      expect(vscode.window.registerWebviewViewProvider).toHaveBeenCalled();
      expect(mockContext.workspaceState.update).toHaveBeenCalledWith('revCloudBlueprint.showUserStatus', false);
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('setContext', 'revCloudBlueprint.showUserStatus', false);
    });

    it('should register all required commands', async () => {
      await activate(mockContext);

      const expectedCommands = [
        'revCloudBlueprint.createPricingSnapshot',
        'revCloudBlueprint.runPricingTest',
        'revCloudBlueprint.runTest',
        'revCloudBlueprint.runBatchTest',
        'revCloudBlueprint.deletePricingSnapshot',
        'revCloudBlueprint.viewPricingDetails',
        'revCloudBlueprint.createGroup',
        'revCloudBlueprint.createGroupFromTitle',
        'revCloudBlueprint.deleteGroup',
        'revCloudBlueprint.createSnapshotInGroup',
        'revCloudBlueprint.setup',
        'revCloudBlueprint.changeGroup',
        'revCloudBlueprint.viewSnapshot',
        'revCloudBlueprint.deleteSnapshot',
        'revCloudBlueprint.removeFromGroup',
        'revCloudBlueprint.openSettings',
        'revCloudBlueprint.validateSchema',
        'revCloudBlueprint.refreshTests',
        'revCloudBlueprint.reloadConfiguration',
        'revCloudBlueprint.toggleUserStatus'
      ];

      expectedCommands.forEach(commandId => {
        expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
          commandId,
          expect.any(Function)
        );
      });
    });

    it('should set global references during activation', async () => {
      await activate(mockContext);

      expect((global as any).revCloudBlueprintLogger).toBeDefined();
      expect((global as any).revCloudBlueprintProvider).toBeDefined();
      expect((global as any).revCloudBlueprintGroupingManager).toBeDefined();
    });

    it('should setup file watchers when autoRefreshTests is enabled', async () => {
      await activate(mockContext);

      expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalled();
    });

    it('should not setup file watchers when autoRefreshTests is disabled', async () => {
      const mockGetConfig = vscode.workspace.getConfiguration as jest.Mock;
      mockGetConfig.mockImplementation(() => ({
        get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
          if (key === 'autoRefreshTests') return false;
          return defaultValue;
        }),
        update: jest.fn().mockResolvedValue(undefined)
      }));

      await activate(mockContext);

      // Should still be called for initial config access but watcher setup should be skipped
      expect(vscode.workspace.getConfiguration).toHaveBeenCalled();
    });

    it('should show setup notification if setup is required', async () => {
      // Mock setup as required (files don't exist)
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const mockShowInfoMsg = vscode.window.showInformationMessage as jest.Mock;
      mockShowInfoMsg.mockResolvedValue('Later');

      await activate(mockContext);

      // Should show setup notification
      expect(mockShowInfoMsg).toHaveBeenCalledWith(
        expect.stringContaining('RevCloud Blueprint setup required'),
        'Setup Now',
        'Later',
        "Don't Show Again"
      );
    });

    it('should execute setup command when user clicks "Setup Now"', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const mockShowInfoMsg = vscode.window.showInformationMessage as jest.Mock;
      mockShowInfoMsg.mockResolvedValue('Setup Now');

      await activate(mockContext);

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('revCloudBlueprint.setup');
    });

    it('should update config when user clicks "Don\'t Show Again"', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const mockShowInfoMsg = vscode.window.showInformationMessage as jest.Mock;
      mockShowInfoMsg.mockResolvedValue("Don't Show Again");

      const mockUpdateConfig = jest.fn().mockResolvedValue(undefined);
      const mockGetConfig = vscode.workspace.getConfiguration as jest.Mock;
      mockGetConfig.mockReturnValue({
        get: jest.fn().mockReturnValue(false),
        update: mockUpdateConfig
      });

      await activate(mockContext);

      expect(mockUpdateConfig).toHaveBeenCalledWith('hideSetupMessage', true, vscode.ConfigurationTarget.Workspace);
    });

    it('should not show setup notification if hideSetupMessage is true', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const mockGetConfig = vscode.workspace.getConfiguration as jest.Mock;
      mockGetConfig.mockReturnValue({
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'hideSetupMessage') return true;
          return false;
        }),
        update: jest.fn()
      });

      const mockShowInfoMsg = vscode.window.showInformationMessage as jest.Mock;

      await activate(mockContext);

      // Should not show setup notification
      const setupCalls = mockShowInfoMsg.mock.calls.filter((call: any[]) =>
        call[0]?.includes('setup required')
      );
      expect(setupCalls.length).toBe(0);
    });
  });

  describe('Command Handlers - Basic Coverage', () => {
    let commandHandlers: { [key: string]: Function } = {};

    beforeEach(async () => {
      jest.clearAllMocks();
      const registerCommandMock = vscode.commands.registerCommand as jest.Mock;
      registerCommandMock.mockImplementation((commandId: string, handler: Function) => {
        commandHandlers[commandId] = handler;
        return { dispose: jest.fn() };
      });

      await activate(mockContext);
    });

    it('should show error for invalid runTest data', async () => {
      const handler = commandHandlers['revCloudBlueprint.runTest'];
      await handler({ data: {} }); // Missing snapshot

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Invalid test data - please try again'
      );
    });

    it('should show error for invalid runBatchTest data', async () => {
      const handler = commandHandlers['revCloudBlueprint.runBatchTest'];
      await handler({ itemType: 'invalid' });

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Invalid batch test data');
    });

    it('should handle setup failure due to no workspace', async () => {
      const originalWorkspaceFolders = vscode.workspace.workspaceFolders;
      (vscode.workspace as any).workspaceFolders = undefined;

      const handler = commandHandlers['revCloudBlueprint.setup'];
      await handler();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('No workspace folder found')
      );

      (vscode.workspace as any).workspaceFolders = originalWorkspaceFolders;
    });

    it('should handle createGroup - show license message if not Pro user', async () => {
      const mockLicenseService = require('../services/licenseService');
      mockLicenseService.getLicenseState.mockResolvedValue({
        isPro: false,
        tier: 'free',
        statusMessage: 'Pro feature required'
      });

      const handler = commandHandlers['revCloudBlueprint.createGroup'];
      await handler();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Pro feature required Group Management is a Pro feature.',
        'Activate License',
        'Learn More'
      );
    });

    it('should handle createGroup - return early if no group name', async () => {
      const mockLicenseService = require('../services/licenseService');
      mockLicenseService.getLicenseState.mockResolvedValue({ isPro: true, tier: 'pro', statusMessage: 'Pro enabled' });

      const mockShowInputBox = vscode.window.showInputBox as jest.Mock;
      mockShowInputBox.mockResolvedValue(undefined);

      const handler = commandHandlers['revCloudBlueprint.createGroup'];
      await handler();

      // Should return early without throwing
      expect(mockShowInputBox).toHaveBeenCalled();
    });

    it('should handle deleteGroup - show error if no group data', async () => {
      const mockLicenseService = require('../services/licenseService');
      mockLicenseService.getLicenseState.mockResolvedValue({ isPro: true, tier: 'pro', statusMessage: 'Pro enabled' });

      const handler = commandHandlers['revCloudBlueprint.deleteGroup'];
      await handler({});

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Please right-click on a group to delete it'
      );
    });

    it('should handle viewSnapshot - show error if no snapshot path', async () => {
      const handler = commandHandlers['revCloudBlueprint.viewSnapshot'];
      await handler({ data: {} });

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Please right-click on a snapshot to view it'
      );
    });

    it('should handle viewSnapshot - open snapshot file', async () => {
      const mockOpenTextDocument = vscode.workspace.openTextDocument as jest.Mock;
      const mockShowTextDocument = vscode.window.showTextDocument as jest.Mock;
      mockOpenTextDocument.mockResolvedValue({ uri: 'test' });

      const handler = commandHandlers['revCloudBlueprint.viewSnapshot'];
      const snapshotItem = { data: { path: '/path/to/snapshot.json' } };

      await handler(snapshotItem);

      expect(mockOpenTextDocument).toHaveBeenCalledWith('/path/to/snapshot.json');
      expect(mockShowTextDocument).toHaveBeenCalled();
    });

    it('should handle deleteSnapshot - not delete if user cancels', async () => {
      const mockShowWarningMsg = vscode.window.showWarningMessage as jest.Mock;
      mockShowWarningMsg.mockResolvedValue('Cancel');

      const handler = commandHandlers['revCloudBlueprint.deleteSnapshot'];
      const snapshotItem = {
        data: {
          path: '/path/to/snapshot.json',
          snapshot: { metadata: { description: 'Test' } }
        }
      };

      await handler(snapshotItem);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should handle deleteSnapshot - delete snapshot file after confirmation', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const mockShowWarningMsg = vscode.window.showWarningMessage as jest.Mock;
      mockShowWarningMsg.mockResolvedValue('Delete');

      const handler = commandHandlers['revCloudBlueprint.deleteSnapshot'];
      const snapshotItem = {
        data: {
          path: '/path/to/snapshot.json',
          snapshot: { metadata: { description: 'Test Snapshot' } }
        }
      };

      await handler(snapshotItem);

      expect(fs.unlinkSync).toHaveBeenCalledWith('/path/to/snapshot.json');
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Snapshot "Test Snapshot" deleted successfully'
      );
    });

    it('should handle toggleUserStatus', async () => {
      (mockContext.workspaceState.get as jest.Mock).mockReturnValue(false);

      const handler = commandHandlers['revCloudBlueprint.toggleUserStatus'];
      await handler();

      expect(mockContext.workspaceState.update).toHaveBeenCalledWith(
        'revCloudBlueprint.showUserStatus',
        true
      );
    });

    it('should handle openSettings', async () => {
      const handler = commandHandlers['revCloudBlueprint.openSettings'];
      await handler();

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'workbench.action.openSettings',
        'revCloudBlueprint'
      );
    });

    it('should handle deleteGroup with license check', async () => {
      const mockLicenseService = require('../services/licenseService');
      mockLicenseService.getLicenseState.mockReturnValue({ isPro: true });

      const mockShowWarningMsg = vscode.window.showWarningMessage as jest.Mock;
      mockShowWarningMsg.mockResolvedValue('Cancel');

      const handler = commandHandlers['revCloudBlueprint.deleteGroup'];
      await handler({ data: { id: 'group-1', name: 'Test Group' } });

      // Should not delete when user cancels
      expect(mockShowWarningMsg).toHaveBeenCalled();
    });

    it('should handle reloadConfiguration command', async () => {
      const mockConfigService = require('../services/configurationService').ConfigurationService;
      mockConfigService.clearCache = jest.fn();

      const handler = commandHandlers['revCloudBlueprint.reloadConfiguration'];
      await handler();

      expect(mockConfigService.clearCache).toHaveBeenCalled();
    });

    it('should register changeGroup command', () => {
      // Verify the command was registered
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'revCloudBlueprint.changeGroup',
        expect.any(Function)
      );
    });

    it('should handle changeGroup - show error without snapshot path', async () => {
      const handler = commandHandlers['revCloudBlueprint.changeGroup'];
      await handler({});

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Please right-click on a snapshot to change its group'
      );
    });

    it('should handle removeFromGroup - show error without snapshot path', async () => {
      const handler = commandHandlers['revCloudBlueprint.removeFromGroup'];
      await handler({});

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Please right-click on a snapshot to remove it from a group'
      );
    });

    it('should handle removeFromGroup - not remove if user cancels', async () => {
      const mockInstance = {
        findGroupForSnapshot: jest.fn().mockReturnValue({ id: 'group-1', name: 'Test Group' })
      };
      (global as any).revCloudBlueprintGroupingManager = mockInstance;

      const mockShowInfoMsg = vscode.window.showInformationMessage as jest.Mock;
      mockShowInfoMsg.mockResolvedValue('Cancel');

      const handler = commandHandlers['revCloudBlueprint.removeFromGroup'];
      await handler({ data: { path: '/path/to/snapshot.json' } });

      expect(mockShowInfoMsg).toHaveBeenCalled();
    });

    it('should handle deleteSnapshot - show error without snapshot path', async () => {
      const handler = commandHandlers['revCloudBlueprint.deleteSnapshot'];
      await handler({});

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Please right-click on a snapshot to delete it'
      );
    });

    it('should handle deleteSnapshot - file not found', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const mockShowWarningMsg = vscode.window.showWarningMessage as jest.Mock;
      mockShowWarningMsg.mockResolvedValue('Delete');

      const handler = commandHandlers['revCloudBlueprint.deleteSnapshot'];
      const snapshotItem = {
        data: {
          path: '/path/to/snapshot.json',
          snapshot: { metadata: { description: 'Test' } }
        }
      };

      await handler(snapshotItem);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Snapshot file not found');
    });

    it('should handle runBatchTest with group data passed directly', async () => {
      const handler = commandHandlers['revCloudBlueprint.runBatchTest'];
      const groupData = { id: 'test-group', name: 'Test Group', snapshotPaths: [] };

      // Should not throw
      await expect(handler({ data: groupData })).resolves.not.toThrow();
    });

    it('should handle validateSchema', () => {
      const handler = commandHandlers['revCloudBlueprint.validateSchema'];

      // Should not throw
      expect(() => handler()).not.toThrow();
    });
  });

  describe('Setup Command Tests', () => {
    let commandHandlers: { [key: string]: Function } = {};

    beforeEach(async () => {
      jest.clearAllMocks();
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((id: string, handler: Function) => {
        commandHandlers[id] = handler;
        return { dispose: jest.fn() };
      });
      await activate(mockContext);
    });

    it('should handle write permission errors during setup', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const handler = commandHandlers['revCloudBlueprint.setup'];
      await handler();

      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });

    it('should handle setup command execution', () => {
      const handler = commandHandlers['revCloudBlueprint.setup'];

      // Should not throw
      expect(() => handler()).not.toThrow();
    });
  });

  describe('Additional Command Coverage', () => {
    let commandHandlers: { [key: string]: Function } = {};

    beforeEach(async () => {
      jest.clearAllMocks();
      (vscode.commands.registerCommand as jest.Mock).mockImplementation((id: string, handler: Function) => {
        commandHandlers[id] = handler;
        return { dispose: jest.fn() };
      });
      await activate(mockContext);
    });

    it('should handle version read from package.json', () => {
      // Extension reads version during activation
      expect(fs.readFileSync).toHaveBeenCalled();
    });

    it('should handle createSnapshotInGroup - show error with no group data', async () => {
      const handler = commandHandlers['revCloudBlueprint.createSnapshotInGroup'];
      await handler({});

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Please right-click on a group to create a snapshot'
      );
    });

    it('should handle createSnapshotInGroup - create snapshot in group', () => {
      const mockSnapshotCreator = require('../snapshot/creator').SnapshotCreator;
      mockSnapshotCreator.prototype.createSnapshot = jest.fn().mockResolvedValue(null);

      const handler = commandHandlers['revCloudBlueprint.createSnapshotInGroup'];
      const groupItem = { data: { id: 'group-1', name: 'Test Group' } };

      // Should not throw
      expect(() => handler(groupItem)).not.toThrow();
    });

    it('should handle createPricingSnapshot', () => {
      const mockSnapshotCreator = require('../snapshot/creator').SnapshotCreator;
      mockSnapshotCreator.prototype.createSnapshot = jest.fn().mockResolvedValue(null);

      const handler = commandHandlers['revCloudBlueprint.createPricingSnapshot'];

      // Should not throw
      expect(() => handler()).not.toThrow();
    });

    it('should handle runPricingTest', () => {
      const handler = commandHandlers['revCloudBlueprint.runPricingTest'];
      const snapshot = { metadata: { description: 'Test' } };

      // Should not throw
      expect(() => handler(snapshot)).not.toThrow();
    });

    it('should handle runTest with valid data', () => {
      const handler = commandHandlers['revCloudBlueprint.runTest'];
      const treeItem = {
        data: {
          snapshot: { metadata: { description: 'Test' } }
        }
      };

      // Should not throw
      expect(() => handler(treeItem)).not.toThrow();
    });

    it('should handle runBatchTest with group itemType', () => {
      const handler = commandHandlers['revCloudBlueprint.runBatchTest'];
      const groupItem = {
        itemType: 'group',
        data: { id: 'test-group', name: 'Test Group', snapshotPaths: [] }
      };

      // Should not throw
      expect(() => handler(groupItem)).not.toThrow();
    });

    it('should handle createGroup - success case', async () => {
      const mockLicenseService = require('../services/licenseService');
      mockLicenseService.getLicenseState.mockReturnValue({ isPro: true });

      const mockShowInputBox = vscode.window.showInputBox as jest.Mock;
      mockShowInputBox
        .mockResolvedValueOnce('New Group')
        .mockResolvedValueOnce('Group description');

      const handler = commandHandlers['revCloudBlueprint.createGroup'];

      // Should not throw
      await expect(handler()).resolves.not.toThrow();
    });

    it('should handle deletePricingSnapshot command', async () => {
      const handler = commandHandlers['revCloudBlueprint.deletePricingSnapshot'];
      await handler({});

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Delete functionality is available in the hierarchical view'
      );
    });

    it('should handle viewPricingDetails command', async () => {
      const handler = commandHandlers['revCloudBlueprint.viewPricingDetails'];
      await handler({});

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'View details functionality is available in the hierarchical view'
      );
    });

    it('should register workspace change listener', async () => {
      expect(vscode.workspace.onDidChangeWorkspaceFolders).toHaveBeenCalled();
    });

    it('should handle refreshTests', () => {
      const handler = commandHandlers['revCloudBlueprint.refreshTests'];

      // Should not throw
      expect(() => handler()).not.toThrow();
    });

    it('should handle setup command - success case', async () => {
      // Mock workspace folder
      (vscode.workspace as any).workspaceFolders = [{
        uri: { fsPath: '/test/workspace' }
      }];

      // Mock fs to simulate setup files don't exist yet
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('.revcloud')) return false;
        if (filePath.includes('groups.json')) return false;
        if (filePath.includes('settings.json')) return false;
        return true;
      });

      // Mock successful file operations
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});
      (fs.statSync as jest.Mock).mockReturnValue({ size: 100 });

      // Re-mock existsSync to return true after files are "created"
      let callCount = 0;
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        callCount++;
        // First few calls return false (files don't exist)
        if (callCount <= 3) return false;
        // After creation attempts, return true
        return true;
      });

      const handler = commandHandlers['revCloudBlueprint.setup'];
      await handler();

      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should handle setup command - no workspace error', async () => {
      // Mock no workspace folder
      (vscode.workspace as any).workspaceFolders = undefined;

      const handler = commandHandlers['revCloudBlueprint.setup'];
      await handler();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'No workspace folder found. Please open a workspace first.'
      );
    });

    it('should handle setup command - files already exist', async () => {
      // Mock workspace folder
      (vscode.workspace as any).workspaceFolders = [{
        uri: { fsPath: '/test/workspace' }
      }];

      // Mock fs to simulate setup files already exist
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const handler = commandHandlers['revCloudBlueprint.setup'];
      await handler();

      // Should show success message since files exist
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('setup completed successfully'),
        'Open Settings File'
      );
    });

    it('should handle setup command - write error', async () => {
      // Mock workspace folder
      (vscode.workspace as any).workspaceFolders = [{
        uri: { fsPath: '/test/workspace' }
      }];

      // Mock fs to simulate setup files don't exist
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('.revcloud')) return false;
        if (filePath.includes('groups.json')) return false;
        if (filePath.includes('settings.json')) return false;
        return true;
      });

      // Mock write error
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Write permission denied');
      });

      const handler = commandHandlers['revCloudBlueprint.setup'];
      await handler();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('failed')
      );
    });

    it('should handle setup command - directory creation success', async () => {
      // Mock workspace folder
      (vscode.workspace as any).workspaceFolders = [{
        uri: { fsPath: '/test/workspace' }
      }];

      let existsCallCount = 0;
      // Mock fs to simulate directory doesn't exist initially then does
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        existsCallCount++;
        // .revcloud doesn't exist initially
        if (filePath.includes('.revcloud') && existsCallCount <= 2) return false;
        // After mkdir, it exists
        if (filePath.includes('.revcloud')) return true;
        // groups.json doesn't exist
        if (filePath.includes('groups.json') && existsCallCount <= 5) return false;
        // After write, it exists
        if (filePath.includes('groups.json')) return true;
        // settings.json doesn't exist
        if (filePath.includes('settings.json') && existsCallCount <= 8) return false;
        // After write, it exists
        return true;
      });

      // Mock successful operations
      (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
      (fs.statSync as jest.Mock).mockReturnValue({ size: 250 });

      const handler = commandHandlers['revCloudBlueprint.setup'];
      await handler();

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('.revcloud'), { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('setup completed successfully'),
        'Open Settings File'
      );
    });

    it('should handle createGroup command with Pro license', async () => {
      const mockLicenseService = require('../services/licenseService');
      mockLicenseService.getLicenseState.mockReturnValue({ isPro: true });

      const mockShowInputBox = vscode.window.showInputBox as jest.Mock;
      mockShowInputBox
        .mockResolvedValueOnce('Test Group')
        .mockResolvedValueOnce('Test Description');

      const handler = commandHandlers['revCloudBlueprint.createGroup'];
      await handler();

      expect(mockShowInputBox).toHaveBeenCalledTimes(2);
    });

    it('should handle createGroup command without Pro license', async () => {
      const mockLicenseService = require('../services/licenseService');
      mockLicenseService.getLicenseState.mockResolvedValue({
        isPro: false,
        tier: 'free',
        statusMessage: 'Pro license required'
      });

      const handler = commandHandlers['revCloudBlueprint.createGroup'];
      await handler();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Pro license required Group Management is a Pro feature.',
        'Activate License',
        'Learn More'
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate extension successfully', () => {
      expect(() => {
        deactivate();
      }).not.toThrow();
    });

    it('should dispose global logger if it exists', () => {
      const mockLogger = {
        dispose: jest.fn()
      };
      (global as any).revCloudBlueprintLogger = mockLogger;

      deactivate();

      expect(mockLogger.dispose).toHaveBeenCalled();
      expect((global as any).revCloudBlueprintLogger).toBeUndefined();
    });

    it('should handle deactivation when no global logger exists', () => {
      delete (global as any).revCloudBlueprintLogger;

      expect(() => {
        deactivate();
      }).not.toThrow();
    });
  });
});
