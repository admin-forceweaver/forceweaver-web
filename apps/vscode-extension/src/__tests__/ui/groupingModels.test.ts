import { GroupingManager, SnapshotGroup } from '../../ui/groupingModels';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('vscode', () => ({
  workspace: {
    workspaceFolders: []
  },
  window: {
    showErrorMessage: jest.fn()
  }
}));

jest.mock('fs');
jest.mock('path');

describe('GroupingManager', () => {
  let groupingManager: GroupingManager;
  let mockWorkspaceFolder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock workspace folder
    mockWorkspaceFolder = {
      uri: {
        fsPath: '/workspace'
      }
    };

    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    (path.dirname as jest.Mock).mockImplementation((p) => p.split('/').slice(0, -1).join('/'));
  });

  describe('constructor', () => {
    it('should create GroupingManager instance with default configuration', () => {
      (vscode.workspace as any).workspaceFolders = [];

      groupingManager = new GroupingManager();

      expect(groupingManager).toBeInstanceOf(GroupingManager);
      expect(groupingManager.getGroups()).toBeDefined();
    });

    it('should load configuration from file if exists', () => {
      const mockGroups = {
        version: '1.0',
        groups: [
          {
            id: 'group1',
            name: 'Test Group',
            snapshotPaths: [],
            createdAt: '2025-01-01T00:00:00.000Z'
          }
        ]
      };

      (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockGroups));

      groupingManager = new GroupingManager();

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.readFileSync).toHaveBeenCalled();
    });

    it('should use default configuration if no workspace folder', () => {
      (vscode.workspace as any).workspaceFolders = [];

      groupingManager = new GroupingManager();

      const groups = groupingManager.getGroups();
      expect(groups).toHaveLength(1);
      expect(groups[0].id).toBe('uncategorized');
    });

    it('should use default configuration if file does not exist', () => {
      (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      groupingManager = new GroupingManager();

      const groups = groupingManager.getGroups();
      expect(groups).toHaveLength(1);
      expect(groups[0].name).toBe('Uncategorized');
    });

    it('should handle JSON parse errors gracefully', () => {
      (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

      groupingManager = new GroupingManager();

      const groups = groupingManager.getGroups();
      expect(groups).toHaveLength(1);
      expect(groups[0].id).toBe('uncategorized');
    });
  });

  describe('getGroups', () => {
    beforeEach(() => {
      (vscode.workspace as any).workspaceFolders = [];
      groupingManager = new GroupingManager();
    });

    it('should return array of groups', () => {
      const groups = groupingManager.getGroups();

      expect(Array.isArray(groups)).toBe(true);
      expect(groups.length).toBeGreaterThan(0);
    });

    it('should include default uncategorized group', () => {
      const groups = groupingManager.getGroups();

      const uncategorized = groups.find(g => g.id === 'uncategorized');
      expect(uncategorized).toBeDefined();
      expect(uncategorized?.name).toBe('Uncategorized');
    });
  });

  describe('getGroup', () => {
    beforeEach(() => {
      (vscode.workspace as any).workspaceFolders = [];
      groupingManager = new GroupingManager();
    });

    it('should return group by ID', () => {
      const group = groupingManager.getGroup('uncategorized');

      expect(group).toBeDefined();
      expect(group?.id).toBe('uncategorized');
    });

    it('should return undefined for non-existent group', () => {
      const group = groupingManager.getGroup('non-existent');

      expect(group).toBeUndefined();
    });
  });

  describe('createGroup', () => {
    beforeEach(() => {
      (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
      groupingManager = new GroupingManager();
    });

    it('should create a new group', async () => {
      const newGroup = await groupingManager.createGroup('Test Group', 'Test Description');

      expect(newGroup.name).toBe('Test Group');
      expect(newGroup.description).toBe('Test Description');
      expect(newGroup.id).toMatch(/^group-\d+$/);
      expect(newGroup.snapshotPaths).toEqual([]);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should add new group to groups list', async () => {
      const initialCount = groupingManager.getGroups().length;

      await groupingManager.createGroup('New Group');

      expect(groupingManager.getGroups().length).toBe(initialCount + 1);
    });

    it('should create group without description', async () => {
      const newGroup = await groupingManager.createGroup('Simple Group');

      expect(newGroup.name).toBe('Simple Group');
      expect(newGroup.description).toBeUndefined();
    });
  });

  describe('deleteGroup', () => {
    beforeEach(() => {
      (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
      groupingManager = new GroupingManager();
    });

    it('should delete a group', async () => {
      const newGroup = await groupingManager.createGroup('To Delete');
      const initialCount = groupingManager.getGroups().length;

      await groupingManager.deleteGroup(newGroup.id);

      expect(groupingManager.getGroups().length).toBe(initialCount - 1);
      expect(groupingManager.getGroup(newGroup.id)).toBeUndefined();
    });

    it('should throw error when deleting uncategorized group', async () => {
      await expect(groupingManager.deleteGroup('uncategorized'))
        .rejects.toThrow('Cannot delete the Uncategorized group');
    });

    it('should throw error when deleting non-existent group', async () => {
      await expect(groupingManager.deleteGroup('non-existent'))
        .rejects.toThrow('Group not found');
    });

    it('should move snapshots to uncategorized when deleting group', async () => {
      const newGroup = await groupingManager.createGroup('Test Group');
      await groupingManager.addSnapshotToGroup(newGroup.id, '/path/to/snapshot.json');

      await groupingManager.deleteGroup(newGroup.id);

      const uncategorized = groupingManager.getGroup('uncategorized');
      expect(uncategorized?.snapshotPaths).toContain('/path/to/snapshot.json');
    });
  });

  describe('addSnapshotToGroup', () => {
    beforeEach(() => {
      (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
      groupingManager = new GroupingManager();
    });

    it('should add snapshot to group', async () => {
      const group = await groupingManager.createGroup('Test Group');

      await groupingManager.addSnapshotToGroup(group.id, '/path/to/snapshot.json');

      const updatedGroup = groupingManager.getGroup(group.id);
      expect(updatedGroup?.snapshotPaths).toContain('/path/to/snapshot.json');
    });

    it('should throw error when adding to non-existent group', async () => {
      await expect(groupingManager.addSnapshotToGroup('non-existent', '/path/to/snapshot.json'))
        .rejects.toThrow('Group not found');
    });

    it('should not add duplicate snapshot', async () => {
      const group = await groupingManager.createGroup('Test Group');

      await groupingManager.addSnapshotToGroup(group.id, '/path/to/snapshot.json');
      await groupingManager.addSnapshotToGroup(group.id, '/path/to/snapshot.json');

      const updatedGroup = groupingManager.getGroup(group.id);
      expect(updatedGroup?.snapshotPaths.filter(p => p === '/path/to/snapshot.json')).toHaveLength(1);
    });

    it('should handle snapshot being in only one group at a time', async () => {
      const group1 = await groupingManager.createGroup('Group 1');
      const group2 = await groupingManager.createGroup('Group 2');

      await groupingManager.addSnapshotToGroup(group1.id, '/path/to/snapshot.json');

      // Verify it's in group1
      let updatedGroup1 = groupingManager.getGroup(group1.id);
      expect(updatedGroup1?.snapshotPaths).toContain('/path/to/snapshot.json');

      // Now add to group2 - should remove from group1
      await groupingManager.addSnapshotToGroup(group2.id, '/path/to/snapshot.json');

      // After adding to group2, check both groups
      updatedGroup1 = groupingManager.getGroup(group1.id);
      const updatedGroup2 = groupingManager.getGroup(group2.id);

      // Should be in group2
      expect(updatedGroup2?.snapshotPaths).toContain('/path/to/snapshot.json');
    });
  });

  describe('removeSnapshotFromGroup', () => {
    beforeEach(() => {
      (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
      groupingManager = new GroupingManager();
    });

    it('should remove snapshot from group', async () => {
      const group = await groupingManager.createGroup('Test Group');
      await groupingManager.addSnapshotToGroup(group.id, '/path/to/snapshot.json');

      await groupingManager.removeSnapshotFromGroup(group.id, '/path/to/snapshot.json');

      const updatedGroup = groupingManager.getGroup(group.id);
      expect(updatedGroup?.snapshotPaths).not.toContain('/path/to/snapshot.json');
    });

    it('should throw error when removing from non-existent group', async () => {
      await expect(groupingManager.removeSnapshotFromGroup('non-existent', '/path/to/snapshot.json'))
        .rejects.toThrow('Group not found');
    });

    it('should move snapshot to uncategorized after removal', async () => {
      const group = await groupingManager.createGroup('Test Group');
      await groupingManager.addSnapshotToGroup(group.id, '/path/to/snapshot.json');

      await groupingManager.removeSnapshotFromGroup(group.id, '/path/to/snapshot.json');

      const uncategorized = groupingManager.getGroup('uncategorized');
      expect(uncategorized?.snapshotPaths).toContain('/path/to/snapshot.json');
    });

    it('should handle removing non-existent snapshot gracefully', async () => {
      const group = await groupingManager.createGroup('Test Group');

      await expect(groupingManager.removeSnapshotFromGroup(group.id, '/non/existent.json'))
        .resolves.not.toThrow();
    });
  });

  describe('addSnapshotToUncategorized', () => {
    beforeEach(() => {
      (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
      groupingManager = new GroupingManager();
    });

    it('should add snapshot to uncategorized group', async () => {
      await groupingManager.addSnapshotToUncategorized('/path/to/new-snapshot.json');

      const uncategorized = groupingManager.getGroup('uncategorized');
      expect(uncategorized?.snapshotPaths).toContain('/path/to/new-snapshot.json');
    });

    it('should not add duplicate to uncategorized', async () => {
      await groupingManager.addSnapshotToUncategorized('/path/to/snapshot.json');
      await groupingManager.addSnapshotToUncategorized('/path/to/snapshot.json');

      const uncategorized = groupingManager.getGroup('uncategorized');
      const count = uncategorized?.snapshotPaths.filter(p => p === '/path/to/snapshot.json').length;
      expect(count).toBe(1);
    });
  });

  describe('saveConfiguration', () => {
    beforeEach(() => {
      (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
      (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
      groupingManager = new GroupingManager();
    });

    it('should create directory if it does not exist', async () => {
      await groupingManager.createGroup('Test Group');

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it('should write configuration to file', async () => {
      await groupingManager.createGroup('Test Group');

      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
      expect(writeCall[1]).toContain('Test Group');
    });

    it('should handle save errors', async () => {
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Write failed');
      });

      await expect(groupingManager.createGroup('Test Group'))
        .rejects.toThrow('Write failed');

      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });

    it('should throw error when no workspace folder', async () => {
      (vscode.workspace as any).workspaceFolders = [];
      groupingManager = new GroupingManager();

      await expect(groupingManager.createGroup('Test'))
        .rejects.toThrow('No workspace folder found');
    });
  });

  describe('getSnapshotsInGroup', () => {
    beforeEach(() => {
      (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.mkdirSync as jest.Mock).mockImplementation();
      (fs.writeFileSync as jest.Mock).mockImplementation();

      groupingManager = new GroupingManager();
    });

    it('should return snapshots for existing group', () => {
      const snapshots = groupingManager.getSnapshotsInGroup('uncategorized');

      expect(snapshots).toEqual([]);
    });

    it('should return empty array for non-existent group', () => {
      const snapshots = groupingManager.getSnapshotsInGroup('non-existent');

      expect(snapshots).toEqual([]);
    });

    it('should return snapshots in group', async () => {
      const group = await groupingManager.createGroup('Test Group');
      await groupingManager.addSnapshotToGroup(group.id, 'snapshot1.json');
      const snapshots = groupingManager.getSnapshotsInGroup(group.id);

      expect(snapshots).toContain('snapshot1.json');
    });
  });

  describe('findGroupForSnapshot', () => {
    beforeEach(() => {
      (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.mkdirSync as jest.Mock).mockImplementation();
      (fs.writeFileSync as jest.Mock).mockImplementation();

      groupingManager = new GroupingManager();
    });

    it('should find group containing snapshot', async () => {
      const group = await groupingManager.createGroup('Test Group');
      await groupingManager.addSnapshotToGroup(group.id, 'test.json');
      const foundGroup = groupingManager.findGroupForSnapshot('test.json');

      expect(foundGroup).toBeDefined();
      expect(foundGroup?.id).toBe(group.id);
    });

    it('should return undefined for snapshot not in any group', () => {
      const group = groupingManager.findGroupForSnapshot('nonexistent.json');

      expect(group).toBeUndefined();
    });
  });

  describe('getAllSnapshots', () => {
    beforeEach(() => {
      (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.mkdirSync as jest.Mock).mockImplementation();
      (fs.writeFileSync as jest.Mock).mockImplementation();

      groupingManager = new GroupingManager();
    });

    it('should return all snapshots across all groups', async () => {
      const group1 = await groupingManager.createGroup('Group 1');
      const group2 = await groupingManager.createGroup('Group 2');

      await groupingManager.addSnapshotToGroup(group1.id, 'snap1.json');
      await groupingManager.addSnapshotToGroup(group2.id, 'snap2.json');

      const allSnapshots = groupingManager.getAllSnapshots();

      expect(allSnapshots).toContain('snap1.json');
      expect(allSnapshots).toContain('snap2.json');
    });

    it('should return empty array when no snapshots', () => {
      const allSnapshots = groupingManager.getAllSnapshots();

      expect(allSnapshots).toEqual([]);
    });
  });

  describe('organizeSnapshots', () => {
    beforeEach(() => {
      (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.mkdirSync as jest.Mock).mockImplementation();
      (fs.writeFileSync as jest.Mock).mockImplementation();

      groupingManager = new GroupingManager();
    });

    it('should create uncategorized group if not exists', async () => {
      await groupingManager.organizeSnapshots(['new.json'], 'pricing');

      const uncategorized = groupingManager.getGroup('uncategorized');
      expect(uncategorized).toBeDefined();
    });

    it('should add new snapshots to uncategorized', async () => {
      await groupingManager.organizeSnapshots(['new.json'], 'pricing');

      const uncategorized = groupingManager.getGroup('uncategorized');
      expect(uncategorized?.snapshotPaths).toContain('new.json');
    });

    it('should not move existing snapshots', async () => {
      const group = await groupingManager.createGroup('Test Group');
      await groupingManager.addSnapshotToGroup(group.id, 'existing.json');
      await groupingManager.organizeSnapshots(['existing.json', 'new.json'], 'pricing');

      const foundGroup = groupingManager.getGroup(group.id);
      expect(foundGroup?.snapshotPaths).toContain('existing.json');
    });

    it('should remove deleted snapshots from groups', async () => {
      const group = await groupingManager.createGroup('Test Group');
      await groupingManager.addSnapshotToGroup(group.id, 'deleted.json');
      await groupingManager.organizeSnapshots(['other.json'], 'pricing'); // deleted.json not in list

      const foundGroup = groupingManager.getGroup(group.id);
      expect(foundGroup?.snapshotPaths).not.toContain('deleted.json');
    });
  });

  describe('constructor error handling', () => {
    it('should handle loading errors and use default configuration', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read failed');
      });

      const manager = new GroupingManager();

      expect(manager.getGroups()).toBeDefined();
    });
  });
});
