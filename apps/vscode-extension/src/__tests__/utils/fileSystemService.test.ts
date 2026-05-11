import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { FileSystemService } from '../../utils/fileSystemService';
import { Logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../utils/logger');

// Mock fs with promises API
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
    readdir: jest.fn(),
    copyFile: jest.fn(),
    unlink: jest.fn()
  },
  constants: {
    F_OK: 0
  }
}));

jest.mock('vscode', () => ({
  workspace: {
    createFileSystemWatcher: jest.fn()
  }
}));

describe('FileSystemService', () => {
  let mockFileWatcher: any;

  beforeEach(() => {
    jest.clearAllMocks();
    FileSystemService.clearCache();

    // Setup file watcher mock
    mockFileWatcher = {
      onDidChange: jest.fn((callback) => {
        mockFileWatcher._onChangeCallback = callback;
        return { dispose: jest.fn() };
      }),
      onDidDelete: jest.fn((callback) => {
        mockFileWatcher._onDeleteCallback = callback;
        return { dispose: jest.fn() };
      }),
      dispose: jest.fn()
    };

    (vscode.workspace.createFileSystemWatcher as jest.Mock).mockReturnValue(mockFileWatcher);
  });

  afterEach(() => {
    FileSystemService.dispose();
  });

  describe('readFileAsync', () => {
    it('should read file successfully', async () => {
      const testContent = 'test file content';
      const mockStats = { mtime: new Date('2024-01-01'), size: testContent.length };

      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);
      (fs.promises.readFile as jest.Mock).mockResolvedValue(testContent);

      const result = await FileSystemService.readFileAsync('/test/file.txt');

      expect(result).toBe(testContent);
      expect(fs.promises.stat).toHaveBeenCalled();
      expect(fs.promises.readFile).toHaveBeenCalled();
      expect(Logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Reading file'),
        undefined,
        'FileSystemService'
      );
    });

    it('should use cached content on second read with same mtime', async () => {
      const testContent = 'cached content';
      const mockStats = { mtime: new Date('2024-01-01'), size: testContent.length };

      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);
      (fs.promises.readFile as jest.Mock).mockResolvedValue(testContent);

      // First read - should hit file system
      const result1 = await FileSystemService.readFileAsync('/test/file.txt');
      expect(result1).toBe(testContent);

      // Clear mocks
      jest.clearAllMocks();
      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);

      // Second read - should hit cache
      const result2 = await FileSystemService.readFileAsync('/test/file.txt');
      expect(result2).toBe(testContent);
      expect(fs.promises.readFile).not.toHaveBeenCalled(); // Cache hit
      expect(Logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('File cache hit'),
        undefined,
        'FileSystemService'
      );
    });

    it('should re-read file if mtime changed', async () => {
      const oldContent = 'old content';
      const newContent = 'new content';
      const oldStats = { mtime: new Date('2024-01-01'), size: oldContent.length };
      const newStats = { mtime: new Date('2024-01-02'), size: newContent.length };

      (fs.promises.stat as jest.Mock).mockResolvedValue(oldStats);
      (fs.promises.readFile as jest.Mock).mockResolvedValue(oldContent);

      // First read
      await FileSystemService.readFileAsync('/test/file.txt');

      // File modified
      (fs.promises.stat as jest.Mock).mockResolvedValue(newStats);
      (fs.promises.readFile as jest.Mock).mockResolvedValue(newContent);

      // Second read - should re-read due to mtime change
      const result = await FileSystemService.readFileAsync('/test/file.txt');
      expect(result).toBe(newContent);
    });

    it('should handle read errors', async () => {
      const error = new Error('File not found');
      (fs.promises.stat as jest.Mock).mockRejectedValue(error);

      await expect(FileSystemService.readFileAsync('/test/missing.txt')).rejects.toThrow('Failed to read file');
      expect(Logger.error).toHaveBeenCalled();
    });

    it('should setup file watcher', async () => {
      const testContent = 'test';
      const mockStats = { mtime: new Date(), size: testContent.length };

      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);
      (fs.promises.readFile as jest.Mock).mockResolvedValue(testContent);

      await FileSystemService.readFileAsync('/test/file.txt');

      expect(vscode.workspace.createFileSystemWatcher).toHaveBeenCalled();
    });
  });

  describe('writeFileAsync', () => {
    it('should write file successfully', async () => {
      const testContent = 'new content';
      const mockStats = { mtime: new Date(), size: testContent.length };

      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);

      await FileSystemService.writeFileAsync('/test/file.txt', testContent);

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        testContent,
        'utf8'
      );
      expect(Logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('File written successfully'),
        undefined,
        'FileSystemService'
      );
    });

    it('should create directory if it does not exist', async () => {
      const testContent = 'content';
      const mockStats = { mtime: new Date(), size: testContent.length };

      (fs.promises.access as jest.Mock).mockRejectedValue(new Error('Not found'));
      (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);

      await FileSystemService.writeFileAsync('/test/new/file.txt', testContent);

      expect(fs.promises.mkdir).toHaveBeenCalled();
    });

    it('should handle write errors', async () => {
      const error = new Error('Write failed');
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockRejectedValue(error);

      await expect(FileSystemService.writeFileAsync('/test/file.txt', 'content')).rejects.toThrow('Failed to write file');
      expect(Logger.error).toHaveBeenCalled();
    });

    it('should update cache after write', async () => {
      const testContent = 'content';
      const mockStats = { mtime: new Date(), size: testContent.length };

      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);

      await FileSystemService.writeFileAsync('/test/file.txt', testContent);

      // Verify cache is updated by checking stats
      const cacheStats = FileSystemService.getCacheStats();
      expect(cacheStats.fileCount).toBe(1);
    });
  });

  describe('fileExistsAsync', () => {
    it('should return true if file exists', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);

      const exists = await FileSystemService.fileExistsAsync('/test/file.txt');

      expect(exists).toBe(true);
      expect(fs.promises.access).toHaveBeenCalledWith(
        expect.any(String),
        fs.constants.F_OK
      );
    });

    it('should return false if file does not exist', async () => {
      (fs.promises.access as jest.Mock).mockRejectedValue(new Error('Not found'));

      const exists = await FileSystemService.fileExistsAsync('/test/missing.txt');

      expect(exists).toBe(false);
    });
  });

  describe('readDirectoryAsync', () => {
    it('should read directory successfully', async () => {
      const entries = ['file1.txt', 'file2.txt', 'subdir'];
      const mockStats = { mtime: new Date() };

      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);
      (fs.promises.readdir as jest.Mock).mockResolvedValue(entries);

      const result = await FileSystemService.readDirectoryAsync('/test/dir');

      expect(result).toEqual(entries);
      expect(fs.promises.readdir).toHaveBeenCalled();
    });

    it('should use cached directory entries', async () => {
      const entries = ['file1.txt'];
      const mockStats = { mtime: new Date() };

      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);
      (fs.promises.readdir as jest.Mock).mockResolvedValue(entries);

      // First read
      await FileSystemService.readDirectoryAsync('/test/dir');

      // Clear mocks
      jest.clearAllMocks();
      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);

      // Second read - should hit cache
      const result = await FileSystemService.readDirectoryAsync('/test/dir');
      expect(result).toEqual(entries);
      expect(fs.promises.readdir).not.toHaveBeenCalled();
    });

    it('should handle read directory errors', async () => {
      const error = new Error('Directory not found');
      (fs.promises.stat as jest.Mock).mockRejectedValue(error);

      await expect(FileSystemService.readDirectoryAsync('/test/missing')).rejects.toThrow('Failed to read directory');
    });
  });

  describe('ensureDirectoryExists', () => {
    it('should not create directory if it exists', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);

      await FileSystemService.ensureDirectoryExists('/test/dir');

      expect(fs.promises.mkdir).not.toHaveBeenCalled();
    });

    it('should create directory if it does not exist', async () => {
      (fs.promises.access as jest.Mock).mockRejectedValue(new Error('Not found'));
      (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);

      await FileSystemService.ensureDirectoryExists('/test/new/dir');

      expect(fs.promises.mkdir).toHaveBeenCalledWith(
        '/test/new/dir',
        { recursive: true }
      );
    });
  });

  describe('copyFileAsync', () => {
    it('should copy file successfully', async () => {
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.copyFile as jest.Mock).mockResolvedValue(undefined);

      await FileSystemService.copyFileAsync('/test/source.txt', '/test/dest.txt');

      expect(fs.promises.copyFile).toHaveBeenCalled();
      expect(Logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('File copied'),
        undefined,
        'FileSystemService'
      );
    });

    it('should create destination directory if needed', async () => {
      (fs.promises.access as jest.Mock).mockRejectedValue(new Error('Not found'));
      (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.copyFile as jest.Mock).mockResolvedValue(undefined);

      await FileSystemService.copyFileAsync('/test/source.txt', '/test/new/dest.txt');

      expect(fs.promises.mkdir).toHaveBeenCalled();
    });

    it('should handle copy errors', async () => {
      const error = new Error('Copy failed');
      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.copyFile as jest.Mock).mockRejectedValue(error);

      await expect(
        FileSystemService.copyFileAsync('/test/source.txt', '/test/dest.txt')
      ).rejects.toThrow('Failed to copy file');
    });
  });

  describe('deleteFileAsync', () => {
    it('should delete file successfully', async () => {
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      await FileSystemService.deleteFileAsync('/test/file.txt');

      expect(fs.promises.unlink).toHaveBeenCalled();
      expect(Logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('File deleted'),
        undefined,
        'FileSystemService'
      );
    });

    it('should clean up cache and watchers', async () => {
      // First read a file to cache it and setup watcher
      const mockStats = { mtime: new Date(), size: 10 };
      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);
      (fs.promises.readFile as jest.Mock).mockResolvedValue('content');
      await FileSystemService.readFileAsync('/test/file.txt');

      // Now delete it
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);
      await FileSystemService.deleteFileAsync('/test/file.txt');

      // Verify watcher was disposed
      expect(mockFileWatcher.dispose).toHaveBeenCalled();
    });

    it('should handle delete errors', async () => {
      const error = new Error('Delete failed');
      (fs.promises.unlink as jest.Mock).mockRejectedValue(error);

      await expect(FileSystemService.deleteFileAsync('/test/file.txt')).rejects.toThrow('Failed to delete file');
    });
  });

  describe('getFileStatsAsync', () => {
    it('should return file stats', async () => {
      const mockStats = {
        mtime: new Date(),
        size: 1024,
        isFile: () => true,
        isDirectory: () => false
      };
      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);

      const result = await FileSystemService.getFileStatsAsync('/test/file.txt');

      expect(result).toEqual(mockStats);
    });

    it('should handle stats errors', async () => {
      const error = new Error('Stats failed');
      (fs.promises.stat as jest.Mock).mockRejectedValue(error);

      await expect(FileSystemService.getFileStatsAsync('/test/file.txt')).rejects.toThrow('Failed to get file stats');
    });
  });

  describe('readFilesAsync', () => {
    it('should read multiple files successfully', async () => {
      const mockStats = { mtime: new Date(), size: 10 };
      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);
      (fs.promises.readFile as jest.Mock)
        .mockResolvedValueOnce('content1')
        .mockResolvedValueOnce('content2')
        .mockResolvedValueOnce('content3');

      const result = await FileSystemService.readFilesAsync([
        '/test/file1.txt',
        '/test/file2.txt',
        '/test/file3.txt'
      ]);

      expect(result.size).toBe(3);
      expect(result.get('/test/file1.txt')).toBe('content1');
      expect(result.get('/test/file2.txt')).toBe('content2');
      expect(result.get('/test/file3.txt')).toBe('content3');
    });

    it('should handle partial failures gracefully', async () => {
      const mockStats = { mtime: new Date(), size: 10 };
      (fs.promises.stat as jest.Mock)
        .mockResolvedValueOnce(mockStats)
        .mockRejectedValueOnce(new Error('File not found'))
        .mockResolvedValueOnce(mockStats);

      (fs.promises.readFile as jest.Mock)
        .mockResolvedValueOnce('content1')
        .mockResolvedValueOnce('content3');

      const result = await FileSystemService.readFilesAsync([
        '/test/file1.txt',
        '/test/missing.txt',
        '/test/file3.txt'
      ]);

      expect(result.size).toBe(2);
      expect(result.has('/test/missing.txt')).toBe(false);
      expect(Logger.warn).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear all caches', async () => {
      // Populate cache
      const mockStats = { mtime: new Date(), size: 10 };
      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);
      (fs.promises.readFile as jest.Mock).mockResolvedValue('content');
      (fs.promises.readdir as jest.Mock).mockResolvedValue(['file.txt']);

      await FileSystemService.readFileAsync('/test/file.txt');
      await FileSystemService.readDirectoryAsync('/test/dir');

      // Verify cache has entries
      let stats = FileSystemService.getCacheStats();
      expect(stats.fileCount).toBeGreaterThan(0);

      // Clear cache
      FileSystemService.clearCache();

      // Verify cache is empty
      stats = FileSystemService.getCacheStats();
      expect(stats.fileCount).toBe(0);
      expect(stats.directoryCount).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      const stats = FileSystemService.getCacheStats();

      expect(stats).toHaveProperty('fileCount');
      expect(stats).toHaveProperty('directoryCount');
      expect(stats).toHaveProperty('watcherCount');
      expect(stats).toHaveProperty('totalMemoryMB');
      expect(typeof stats.totalMemoryMB).toBe('number');
    });

    it('should calculate memory usage', async () => {
      const testContent = 'x'.repeat(10000); // Large content
      const mockStats = { mtime: new Date(), size: testContent.length };

      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);
      (fs.promises.readFile as jest.Mock).mockResolvedValue(testContent);

      await FileSystemService.readFileAsync('/test/large.txt');

      const stats = FileSystemService.getCacheStats();
      expect(stats.totalMemoryMB).toBeGreaterThan(0);
    });
  });

  describe('dispose', () => {
    it('should dispose all watchers and clear caches', async () => {
      // Setup some watchers and cache
      const mockStats = { mtime: new Date(), size: 10 };
      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);
      (fs.promises.readFile as jest.Mock).mockResolvedValue('content');

      await FileSystemService.readFileAsync('/test/file1.txt');
      await FileSystemService.readFileAsync('/test/file2.txt');

      // Dispose
      FileSystemService.dispose();

      // Verify watchers disposed
      expect(mockFileWatcher.dispose).toHaveBeenCalled();

      // Verify caches cleared
      const stats = FileSystemService.getCacheStats();
      expect(stats.fileCount).toBe(0);
      expect(stats.watcherCount).toBe(0);
    });
  });

  describe('file watcher integration', () => {
    it('should invalidate cache when file changes', async () => {
      const mockStats = { mtime: new Date('2024-01-01'), size: 10 };
      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);
      (fs.promises.readFile as jest.Mock).mockResolvedValue('old content');

      // Read file to setup watcher
      await FileSystemService.readFileAsync('/test/file.txt');

      // Verify cache has entry
      let stats = FileSystemService.getCacheStats();
      expect(stats.fileCount).toBe(1);

      // Trigger file change event
      if (mockFileWatcher._onChangeCallback) {
        mockFileWatcher._onChangeCallback();
      }

      // Verify cache was invalidated
      stats = FileSystemService.getCacheStats();
      expect(stats.fileCount).toBe(0);
    });

    it('should cleanup watcher when file is deleted', async () => {
      const mockStats = { mtime: new Date(), size: 10 };
      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);
      (fs.promises.readFile as jest.Mock).mockResolvedValue('content');

      await FileSystemService.readFileAsync('/test/file.txt');

      // Trigger file delete event
      if (mockFileWatcher._onDeleteCallback) {
        mockFileWatcher._onDeleteCallback();
      }

      // Watcher should be cleaned up
      expect(mockFileWatcher.dispose).toHaveBeenCalled();
    });

    it('should handle watcher setup errors gracefully', async () => {
      const mockStats = { mtime: new Date(), size: 10 };
      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);
      (fs.promises.readFile as jest.Mock).mockResolvedValue('content');

      // Mock watcher creation to throw error
      (vscode.workspace.createFileSystemWatcher as jest.Mock).mockImplementation(() => {
        throw new Error('Watcher failed');
      });

      // Should not throw - error is handled gracefully
      const result = await FileSystemService.readFileAsync('/test/file.txt');
      expect(result).toBe('content');
      expect(Logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to setup file watcher'),
        undefined,
        'FileSystemService'
      );
    });
  });

  describe('cache eviction', () => {
    it('should evict oldest entry when cache is full', async () => {
      const mockStats = { mtime: new Date(), size: 10 };
      (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);

      // Fill cache to MAX_CACHE_SIZE (100)
      for (let i = 0; i < 101; i++) {
        (fs.promises.readFile as jest.Mock).mockResolvedValue(`content${i}`);
        await FileSystemService.readFileAsync(`/test/file${i}.txt`);
      }

      // Cache should be at max size due to eviction
      const stats = FileSystemService.getCacheStats();
      expect(stats.fileCount).toBeLessThanOrEqual(100);
      expect(Logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Cache evicted'),
        undefined,
        'FileSystemService'
      );
    });
  });
});
