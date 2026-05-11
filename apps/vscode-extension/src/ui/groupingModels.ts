import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface SnapshotGroup {
    id: string;
    name: string;
    description?: string;
    snapshotPaths: string[];
    createdAt: string;
    category?: 'pricing' | 'configurator'; // Category to separate pricing and configurator groups
}

export interface GroupingConfiguration {
    groups: SnapshotGroup[];
    version: string;
}

export class GroupingManager {
    private static readonly GROUPS_FILE_PATH = '.revcloud/groups.json';
    private grouping: GroupingConfiguration = this.getDefaultConfiguration();

    constructor() {
        try {
            console.log('[DEBUG] 🔧 GroupingManager constructor started');
            this.loadConfiguration();
            console.log('[DEBUG] ✅ GroupingManager constructor completed successfully');
        } catch (error: any) {
            console.error('[ERROR] ❌ GroupingManager constructor failed:', error);
            console.error('[ERROR] ❌ Stack trace:', error.stack);
            // Ensure we have valid default configuration even if loading fails
            this.grouping = this.getDefaultConfiguration();
            console.log('[DEBUG] 🔄 Fallback to default configuration applied');
        }
    }

    /**
     * Load grouping configuration from .revcloud/groups.json
     */
    private loadConfiguration(): void {
        try {
            console.log('[DEBUG] 📂 Loading grouping configuration...');
            
            const workspaceFolders = vscode.workspace.workspaceFolders;
            console.log(`[DEBUG] 📁 Workspace folders count: ${workspaceFolders?.length || 0}`);
            
            if (!workspaceFolders || workspaceFolders.length === 0) {
                console.warn('[WARN] ⚠️ No workspace folder found for grouping config, using defaults');
                this.grouping = this.getDefaultConfiguration();
                return;
            }

            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const groupsPath = path.join(workspaceRoot, GroupingManager.GROUPS_FILE_PATH);
            console.log(`[DEBUG] 📄 Looking for groups config at: ${groupsPath}`);

            if (!fs.existsSync(groupsPath)) {
                console.log(`[INFO] 📄 Groups config not found at ${groupsPath}, using defaults`);
                this.grouping = this.getDefaultConfiguration();
                console.log(`[DEBUG] ✅ Default configuration loaded with ${this.grouping.groups.length} groups`);
                return;
            }

            console.log(`[DEBUG] 📖 Reading groups config file...`);
            const groupsContent = fs.readFileSync(groupsPath, 'utf8');
            console.log(`[DEBUG] 📖 File content length: ${groupsContent.length} characters`);
            
            console.log(`[DEBUG] 🔧 Parsing JSON configuration...`);
            this.grouping = JSON.parse(groupsContent);
            
            // Migrate old groups without category to pricing
            let needsSave = false;
            for (const group of this.grouping.groups) {
                if (!group.category) {
                    console.log(`[DEBUG] 🔄 Migrating group "${group.name}" (${group.id}) to pricing category`);
                    group.category = 'pricing';
                    needsSave = true;
                }
            }
            
            // Ensure configurator uncategorized group exists
            const hasUncategorizedConfigurator = this.grouping.groups.some(g => g.id === 'uncategorized-configurator');
            
            if (!hasUncategorizedConfigurator) {
                console.log(`[DEBUG] 🆕 Creating uncategorized-configurator group`);
                this.grouping.groups.push({
                    id: 'uncategorized-configurator',
                    name: 'Uncategorized',
                    description: 'New configurator snapshots will be placed here until moved to a specific group',
                    snapshotPaths: [],
                    createdAt: new Date().toISOString(),
                    category: 'configurator'
                });
                needsSave = true;
            }
            
            // Clean up orphaned uncategorized groups (created before the fix)
            const orphanedGroups = this.grouping.groups.filter(g => 
                g.name === 'Uncategorized' && 
                g.category === 'configurator' && 
                g.id !== 'uncategorized-configurator' &&
                g.id.startsWith('group-')
            );
            
            if (orphanedGroups.length > 0) {
                console.log(`[DEBUG] 🧹 Cleaning up ${orphanedGroups.length} orphaned configurator uncategorized groups`);
                
                // Merge snapshots from orphaned groups into the correct uncategorized group
                const correctUncategorized = this.grouping.groups.find(g => g.id === 'uncategorized-configurator');
                if (correctUncategorized) {
                    for (const orphan of orphanedGroups) {
                        for (const snapshot of orphan.snapshotPaths) {
                            if (!correctUncategorized.snapshotPaths.includes(snapshot)) {
                                correctUncategorized.snapshotPaths.push(snapshot);
                            }
                        }
                    }
                }
                
                // Remove orphaned groups
                this.grouping.groups = this.grouping.groups.filter(g => 
                    !(g.name === 'Uncategorized' && 
                      g.category === 'configurator' && 
                      g.id !== 'uncategorized-configurator' &&
                      g.id.startsWith('group-'))
                );
                needsSave = true;
            }
            
            if (needsSave) {
                console.log(`[DEBUG] 💾 Saving migrated groups configuration`);
                fs.writeFileSync(groupsPath, JSON.stringify(this.grouping, null, 2), 'utf8');
            }
            
            console.log(`[DEBUG] ✅ Successfully loaded groups config from ${groupsPath}`);
            console.log(`[DEBUG] 📊 Groups loaded: ${this.grouping.groups?.length || 0}`);
            
        } catch (error: any) {
            console.error(`[ERROR] ❌ Failed to read groups config: ${error.message}`);
            console.error(`[ERROR] ❌ Stack trace: ${error.stack}`);
            console.log(`[DEBUG] 🔄 Falling back to default configuration...`);
            this.grouping = this.getDefaultConfiguration();
            console.log(`[DEBUG] ✅ Default configuration applied with ${this.grouping.groups.length} groups`);
        }
    }

    /**
     * Save grouping configuration to .revcloud/groups.json
     */
    private async saveConfiguration(): Promise<void> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                throw new Error('No workspace folder found');
            }

            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const groupsPath = path.join(workspaceRoot, GroupingManager.GROUPS_FILE_PATH);
            const configDir = path.dirname(groupsPath);

            // Create .revcloud directory if it doesn't exist
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            // Write groups configuration directly to groups.json
            fs.writeFileSync(groupsPath, JSON.stringify(this.grouping, null, 2));
            console.log(`[DEBUG] 💾 Saved groups config to ${groupsPath}`);
            
        } catch (error: any) {
            console.error(`[ERROR] Failed to save groups config: ${error.message}`);
            vscode.window.showErrorMessage(`Failed to save groups configuration: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get default configuration with built-in "Uncategorized" groups for both categories
     */
    private getDefaultConfiguration(): GroupingConfiguration {
        return {
            version: '1.0',
            groups: [
                {
                    id: 'uncategorized',
                    name: 'Uncategorized',
                    description: 'New pricing snapshots will be placed here until moved to a specific group',
                    snapshotPaths: [],
                    createdAt: new Date().toISOString(),
                    category: 'pricing'
                },
                {
                    id: 'uncategorized-configurator',
                    name: 'Uncategorized',
                    description: 'New configurator snapshots will be placed here until moved to a specific group',
                    snapshotPaths: [],
                    createdAt: new Date().toISOString(),
                    category: 'configurator'
                }
            ]
        };
    }

    /**
     * Get all groups, optionally filtered by category
     */
    getGroups(category?: 'pricing' | 'configurator'): SnapshotGroup[] {
        if (!category) {
            return this.grouping.groups;
        }
        // Filter by category, treating groups without category as 'pricing' for backward compatibility
        return this.grouping.groups.filter(group => {
            const groupCategory = group.category || 'pricing'; // Default to pricing if no category
            return groupCategory === category;
        });
    }

    /**
     * Get group by ID
     */
    getGroup(groupId: string): SnapshotGroup | undefined {
        return this.grouping.groups.find(group => group.id === groupId);
    }

    /**
     * Create a new group
     */
    async createGroup(groupName: string, description?: string, category?: 'pricing' | 'configurator', customId?: string): Promise<SnapshotGroup> {
        const newGroup: SnapshotGroup = {
            id: customId || `group-${Date.now()}`,
            name: groupName,
            description: description,
            snapshotPaths: [],
            createdAt: new Date().toISOString(),
            category: category || 'pricing' // Default to pricing for backward compatibility
        };

        this.grouping.groups.push(newGroup);
        await this.saveConfiguration();
        
        return newGroup;
    }

    /**
     * Delete a group (move snapshots to Uncategorized)
     */
    async deleteGroup(groupId: string): Promise<void> {
        const groupIndex = this.grouping.groups.findIndex(group => group.id === groupId);
        if (groupIndex === -1) {
            throw new Error(`Group not found: ${groupId}`);
        }

        const group = this.grouping.groups[groupIndex];
        
        // Don't allow deleting the Uncategorized group
        if (group.id === 'uncategorized') {
            throw new Error('Cannot delete the Uncategorized group');
        }

        // Move snapshots to Uncategorized group
        const uncategorizedGroup = this.getGroup('uncategorized');
        if (uncategorizedGroup) {
            uncategorizedGroup.snapshotPaths.push(...group.snapshotPaths);
        }

        this.grouping.groups.splice(groupIndex, 1);
        await this.saveConfiguration();
    }

    /**
     * Add snapshot to group
     */
    async addSnapshotToGroup(groupId: string, snapshotPath: string): Promise<void> {
        const group = this.getGroup(groupId);
        if (!group) {
            throw new Error(`Group not found: ${groupId}`);
        }

        // Remove from any other group first
        await this.removeSnapshotFromAllGroups(snapshotPath);

        // Add to target group if not already there
        if (!group.snapshotPaths.includes(snapshotPath)) {
            group.snapshotPaths.push(snapshotPath);
        }

        await this.saveConfiguration();
    }

    /**
     * Remove snapshot from a specific group
     */
    async removeSnapshotFromGroup(groupId: string, snapshotPath: string): Promise<void> {
        const group = this.getGroup(groupId);
        if (!group) {
            throw new Error(`Group not found: ${groupId}`);
        }

        const snapshotIndex = group.snapshotPaths.indexOf(snapshotPath);
        if (snapshotIndex !== -1) {
            group.snapshotPaths.splice(snapshotIndex, 1);
            
            // Move to Uncategorized group if not already there
            const uncategorizedGroup = this.getGroup('uncategorized');
            if (uncategorizedGroup && !uncategorizedGroup.snapshotPaths.includes(snapshotPath)) {
                uncategorizedGroup.snapshotPaths.push(snapshotPath);
            }
        }

        await this.saveConfiguration();
    }

    /**
     * Remove snapshot from all groups (helper method)
     */
    private async removeSnapshotFromAllGroups(snapshotPath: string): Promise<void> {
        for (const group of this.grouping.groups) {
            const index = group.snapshotPaths.indexOf(snapshotPath);
            if (index !== -1) {
                group.snapshotPaths.splice(index, 1);
            }
        }
    }

    /**
     * Add snapshot to category-specific Uncategorized group (for new snapshots)
     */
    async addSnapshotToUncategorized(snapshotPath: string, category: 'pricing' | 'configurator' = 'pricing'): Promise<void> {
        const uncategorizedId = category === 'pricing' ? 'uncategorized' : 'uncategorized-configurator';
        let uncategorizedGroup = this.getGroup(uncategorizedId);
        if (!uncategorizedGroup) {
            // Create category-specific Uncategorized group with the correct ID
            await this.createGroup('Uncategorized', `New ${category} snapshots will be placed here until moved to a specific group`, category, uncategorizedId);
            uncategorizedGroup = this.getGroup(uncategorizedId);
        }

        if (uncategorizedGroup && !uncategorizedGroup.snapshotPaths.includes(snapshotPath)) {
            uncategorizedGroup.snapshotPaths.push(snapshotPath);
            await this.saveConfiguration();
        }
    }

    /**
     * Get all snapshots in a group
     */
    getSnapshotsInGroup(groupId: string): string[] {
        const group = this.getGroup(groupId);
        return group ? [...group.snapshotPaths] : [];
    }

    /**
     * Find which group (if any) contains a snapshot
     */
    findGroupForSnapshot(snapshotPath: string): SnapshotGroup | undefined {
        for (const group of this.grouping.groups) {
            if (group.snapshotPaths.includes(snapshotPath)) {
                return group;
            }
        }
        return undefined;
    }

    /**
     * Get all snapshots across all groups
     */
    getAllSnapshots(): string[] {
        const allSnapshots: string[] = [];
        for (const group of this.grouping.groups) {
            allSnapshots.push(...group.snapshotPaths);
        }
        return [...new Set(allSnapshots)]; // Remove duplicates
    }

    /**
     * Organize all discovered snapshots into the grouping structure
     */
    async organizeSnapshots(allSnapshotPaths: string[], category: 'pricing' | 'configurator'): Promise<void> {
        console.log(`[DEBUG] GroupingManager: organizeSnapshots called with ${allSnapshotPaths.length} ${category} snapshots:`, allSnapshotPaths);
        
        // Ensure category-specific Uncategorized group exists
        const uncategorizedId = category === 'pricing' ? 'uncategorized' : 'uncategorized-configurator';
        let uncategorizedGroup = this.getGroup(uncategorizedId);
        if (!uncategorizedGroup) {
            await this.createGroup('Uncategorized', `New ${category} snapshots will be placed here until moved to a specific group`, category, uncategorizedId);
            uncategorizedGroup = this.getGroup(uncategorizedId);
        }
        
        for (const snapshotPath of allSnapshotPaths) {
            // Check if snapshot is already in a group
            const existingGroup = this.findGroupForSnapshot(snapshotPath);
            
            console.log(`[DEBUG] GroupingManager: Snapshot ${snapshotPath} - existingGroup: ${existingGroup?.name || 'none'}`);
            
            if (!existingGroup) {
                // New snapshot - add to category-specific Uncategorized group
                console.log(`[DEBUG] GroupingManager: Adding new snapshot to ${category} Uncategorized: ${snapshotPath}`);
                await this.addSnapshotToUncategorized(snapshotPath, category);
            }
        }

        // Remove any snapshots that no longer exist from category-specific groups only
        for (const group of this.grouping.groups) {
            if (group.category === category) {
                group.snapshotPaths = group.snapshotPaths.filter(path => 
                    allSnapshotPaths.includes(path)
                );
            }
        }

        await this.saveConfiguration();
    }
}
