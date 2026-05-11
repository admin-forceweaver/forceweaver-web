import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Logger } from './logger';

/**
 * Optimized file system service with caching and async operations
 * Reduces redundant file system calls and improves performance
 */
export class FileSystemService {
    private static fileCache: Map<string, { content: string; mtime: number; size: number }> = new Map();
    private static directoryCache: Map<string, { entries: string[]; mtime: number }> = new Map();
    private static existsCache: Map<string, boolean> = new Map(); // Cache for file/directory existence checks
    private static fileWatchers: Map<string, vscode.FileSystemWatcher> = new Map();
    private static readonly CACHE_TTL_MS = 30000; // 30 seconds cache TTL
    private static readonly MAX_CACHE_SIZE = 100; // Maximum cached files

    /**
     * Read file with intelligent caching
     */
    static async readFileAsync(filePath: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
        try {
            const absolutePath = path.resolve(filePath);
            const cacheKey = this.getCacheKey(absolutePath);
            
            // Get file stats (with fallback for test environments)
            const stats = fs.promises?.stat ? await fs.promises.stat(absolutePath) : await new Promise<fs.Stats>((resolve, reject) => {
                fs.stat(absolutePath, (err, stats) => {
                    if (err) reject(err);
                    else resolve(stats);
                });
            });
            const currentMtime = stats.mtime.getTime();
            
            // Check cache
            const cached = this.fileCache.get(cacheKey);
            if (cached && cached.mtime === currentMtime && cached.size === stats.size) {
                Logger.debug(`File cache hit: ${path.basename(filePath)}`, undefined, 'FileSystemService');
                return cached.content;
            }
            
            // Read file asynchronously
            Logger.debug(`Reading file: ${path.basename(filePath)}`, undefined, 'FileSystemService');
            const content = await fs.promises.readFile(absolutePath, encoding);
            
            // Update cache
            this.updateFileCache(cacheKey, content, currentMtime, stats.size);
            
            // Set up file watcher if not already watching
            this.setupFileWatcher(absolutePath, cacheKey);
            
            return content;
        } catch (error: any) {
            Logger.error(`Failed to read file: ${filePath}`, error, 'FileSystemService');
            throw new Error(`Failed to read file ${filePath}: ${error.message}`);
        }
    }

    /**
     * Write file asynchronously with cache invalidation
     */
    static async writeFileAsync(filePath: string, content: string, encoding: BufferEncoding = 'utf8'): Promise<void> {
        try {
            const absolutePath = path.resolve(filePath);
            const cacheKey = this.getCacheKey(absolutePath);
            
            // Ensure directory exists
            await this.ensureDirectoryExists(path.dirname(absolutePath));
            
            // Write file asynchronously
            Logger.debug(`Writing file: ${path.basename(filePath)}`, undefined, 'FileSystemService');
            await fs.promises.writeFile(absolutePath, content, encoding);
            
            // Update cache with new content
            const stats = await fs.promises.stat(absolutePath);
            this.updateFileCache(cacheKey, content, stats.mtime.getTime(), stats.size);
            
            Logger.debug(`File written successfully: ${path.basename(filePath)}`, undefined, 'FileSystemService');
        } catch (error: any) {
            Logger.error(`Failed to write file: ${filePath}`, error, 'FileSystemService');
            throw new Error(`Failed to write file ${filePath}: ${error.message}`);
        }
    }

    /**
     * Check if file exists with caching
     */
    static async fileExistsAsync(filePath: string): Promise<boolean> {
        try {
            const absolutePath = path.resolve(filePath);
            await fs.promises.access(absolutePath, fs.constants.F_OK);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Read directory with caching
     */
    static async readDirectoryAsync(dirPath: string): Promise<string[]> {
        try {
            const absolutePath = path.resolve(dirPath);
            const cacheKey = this.getCacheKey(absolutePath);
            
            // Get directory stats
            const stats = await fs.promises.stat(absolutePath);
            const currentMtime = stats.mtime.getTime();
            
            // Check cache
            const cached = this.directoryCache.get(cacheKey);
            if (cached && cached.mtime === currentMtime) {
                Logger.debug(`Directory cache hit: ${path.basename(dirPath)}`, undefined, 'FileSystemService');
                return cached.entries;
            }
            
            // Read directory asynchronously
            Logger.debug(`Reading directory: ${path.basename(dirPath)}`, undefined, 'FileSystemService');
            const entries = await fs.promises.readdir(absolutePath);
            
            // Update cache
            this.directoryCache.set(cacheKey, {
                entries,
                mtime: currentMtime
            });
            
            return entries;
        } catch (error: any) {
            Logger.error(`Failed to read directory: ${dirPath}`, error, 'FileSystemService');
            throw new Error(`Failed to read directory ${dirPath}: ${error.message}`);
        }
    }

    /**
     * Ensure directory exists, creating it if necessary
     */
    static async ensureDirectoryExists(dirPath: string): Promise<void> {
        try {
            await fs.promises.access(dirPath, fs.constants.F_OK);
        } catch {
            // Directory doesn't exist, create it
            await fs.promises.mkdir(dirPath, { recursive: true });
            Logger.debug(`Created directory: ${dirPath}`, undefined, 'FileSystemService');
        }
    }

    /**
     * Copy file asynchronously
     */
    static async copyFileAsync(sourcePath: string, destinationPath: string): Promise<void> {
        try {
            const absoluteSource = path.resolve(sourcePath);
            const absoluteDestination = path.resolve(destinationPath);
            
            // Ensure destination directory exists
            await this.ensureDirectoryExists(path.dirname(absoluteDestination));
            
            // Copy file
            await fs.promises.copyFile(absoluteSource, absoluteDestination);
            Logger.debug(`File copied: ${path.basename(sourcePath)} -> ${path.basename(destinationPath)}`, undefined, 'FileSystemService');
            
            // Invalidate cache for destination
            const destCacheKey = this.getCacheKey(absoluteDestination);
            this.fileCache.delete(destCacheKey);
        } catch (error: any) {
            Logger.error(`Failed to copy file: ${sourcePath} -> ${destinationPath}`, error, 'FileSystemService');
            throw new Error(`Failed to copy file: ${error.message}`);
        }
    }

    /**
     * Delete file with cache cleanup
     */
    static async deleteFileAsync(filePath: string): Promise<void> {
        try {
            const absolutePath = path.resolve(filePath);
            const cacheKey = this.getCacheKey(absolutePath);
            
            await fs.promises.unlink(absolutePath);
            
            // Clean up cache and watchers
            this.fileCache.delete(cacheKey);
            this.cleanupFileWatcher(absolutePath, cacheKey);
            
            Logger.debug(`File deleted: ${path.basename(filePath)}`, undefined, 'FileSystemService');
        } catch (error: any) {
            Logger.error(`Failed to delete file: ${filePath}`, error, 'FileSystemService');
            throw new Error(`Failed to delete file ${filePath}: ${error.message}`);
        }
    }

    /**
     * Check if file or directory exists with caching (synchronous)
     * Use this instead of fs.existsSync for better performance
     * @param filePath - Path to check
     * @returns true if file/directory exists
     */
    static existsSync(filePath: string): boolean {
        const absolutePath = path.resolve(filePath);
        const cacheKey = this.getCacheKey(absolutePath);

        // Check cache first
        if (this.existsCache.has(cacheKey)) {
            return this.existsCache.get(cacheKey)!;
        }

        // Check actual file system
        const exists = fs.existsSync(absolutePath);

        // Update cache
        this.existsCache.set(cacheKey, exists);

        return exists;
    }

    /**
     * Invalidate existence cache for a specific path
     * Call this when creating or deleting files
     * @param filePath - Path to invalidate
     */
    static invalidateExistsCache(filePath: string): void {
        const absolutePath = path.resolve(filePath);
        const cacheKey = this.getCacheKey(absolutePath);
        this.existsCache.delete(cacheKey);
    }

    /**
     * Check if file or directory exists (async)
     * @param filePath - Path to check
     * @returns Promise resolving to true if exists
     */
    static async existsAsync(filePath: string): Promise<boolean> {
        try {
            const absolutePath = path.resolve(filePath);
            await fs.promises.access(absolutePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get file stats with caching consideration
     */
    static async getFileStatsAsync(filePath: string): Promise<fs.Stats> {
        try {
            const absolutePath = path.resolve(filePath);
            return await fs.promises.stat(absolutePath);
        } catch (error: any) {
            Logger.error(`Failed to get file stats: ${filePath}`, error, 'FileSystemService');
            throw new Error(`Failed to get file stats ${filePath}: ${error.message}`);
        }
    }

    /**
     * Batch read multiple files efficiently
     */
    static async readFilesAsync(filePaths: string[], encoding: BufferEncoding = 'utf8'): Promise<Map<string, string>> {
        const results = new Map<string, string>();
        
        // Use Promise.allSettled for parallel reading with error handling
        const promises = filePaths.map(async (filePath) => {
            try {
                const content = await this.readFileAsync(filePath, encoding);
                results.set(filePath, content);
            } catch (error: any) {
                Logger.warn(`Failed to read file in batch: ${filePath} - ${error.message}`, undefined, 'FileSystemService');
                // Don't add to results map, effectively skipping failed files
            }
        });
        
        await Promise.allSettled(promises);
        Logger.debug(`Batch read completed: ${results.size}/${filePaths.length} files successful`, undefined, 'FileSystemService');
        
        return results;
    }

    /**
     * Clear all caches
     */
    static clearCache(): void {
        const fileCount = this.fileCache.size;
        const dirCount = this.directoryCache.size;
        const existsCount = this.existsCache.size;

        this.fileCache.clear();
        this.directoryCache.clear();
        this.existsCache.clear();

        Logger.debug(`Cache cleared: ${fileCount} files, ${dirCount} directories, ${existsCount} existence checks`, undefined, 'FileSystemService');
    }

    /**
     * Get cache statistics
     */
    static getCacheStats(): {
        fileCount: number;
        directoryCount: number;
        existsCount: number;
        watcherCount: number;
        totalMemoryMB: number;
    } {
        let totalMemory = 0;

        // Estimate memory usage
        for (const cached of this.fileCache.values()) {
            totalMemory += cached.content.length * 2; // Rough estimate: 2 bytes per character
        }

        for (const cached of this.directoryCache.values()) {
            totalMemory += cached.entries.join('').length * 2;
        }

        // Exists cache is minimal (just booleans)
        totalMemory += this.existsCache.size * 8; // Rough estimate: 8 bytes per entry

        return {
            fileCount: this.fileCache.size,
            directoryCount: this.directoryCache.size,
            existsCount: this.existsCache.size,
            watcherCount: this.fileWatchers.size,
            totalMemoryMB: Math.round(totalMemory / (1024 * 1024) * 100) / 100
        };
    }

    /**
     * Cleanup resources
     */
    static dispose(): void {
        // Dispose all file watchers
        for (const watcher of this.fileWatchers.values()) {
            watcher.dispose();
        }
        this.fileWatchers.clear();
        
        // Clear caches
        this.clearCache();
        
        Logger.debug('FileSystemService disposed', undefined, 'FileSystemService');
    }

    // Private helper methods

    private static getCacheKey(absolutePath: string): string {
        return absolutePath;
    }

    private static updateFileCache(cacheKey: string, content: string, mtime: number, size: number): void {
        // Implement LRU eviction if cache is too large
        if (this.fileCache.size >= this.MAX_CACHE_SIZE) {
            const firstKey = this.fileCache.keys().next().value;
            if (firstKey) {
                this.fileCache.delete(firstKey);
                Logger.debug(`Cache evicted: ${path.basename(firstKey)}`, undefined, 'FileSystemService');
            }
        }
        
        this.fileCache.set(cacheKey, {
            content,
            mtime,
            size
        });
    }

    private static setupFileWatcher(absolutePath: string, cacheKey: string): void {
        if (this.fileWatchers.has(cacheKey)) {
            return; // Already watching
        }
        
        try {
            const watcher = vscode.workspace.createFileSystemWatcher(absolutePath);
            
            watcher.onDidChange(() => {
                Logger.debug(`File changed, invalidating cache: ${path.basename(absolutePath)}`, undefined, 'FileSystemService');
                this.fileCache.delete(cacheKey);
            });
            
            watcher.onDidDelete(() => {
                Logger.debug(`File deleted, cleaning up cache: ${path.basename(absolutePath)}`, undefined, 'FileSystemService');
                this.fileCache.delete(cacheKey);
                this.cleanupFileWatcher(absolutePath, cacheKey);
            });
            
            this.fileWatchers.set(cacheKey, watcher);
            Logger.debug(`File watcher setup: ${path.basename(absolutePath)}`, undefined, 'FileSystemService');
        } catch (error: any) {
            Logger.warn(`Failed to setup file watcher: ${absolutePath} - ${error.message}`, undefined, 'FileSystemService');
        }
    }

    private static cleanupFileWatcher(absolutePath: string, cacheKey: string): void {
        const watcher = this.fileWatchers.get(cacheKey);
        if (watcher) {
            watcher.dispose();
            this.fileWatchers.delete(cacheKey);
            Logger.debug(`File watcher cleaned up: ${path.basename(absolutePath)}`, undefined, 'FileSystemService');
        }
    }
}
