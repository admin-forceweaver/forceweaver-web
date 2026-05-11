import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { RevenueCloudService } from './revenueCloudService';

/**
 * Service for managing extension configuration
 * Handles workspace-specific settings and provides extensible configuration management
 */
export class ConfigurationService {
    private static readonly CONFIG_FILE_PATH = '.revcloud/settings.json';
    private static configCache: any = null;

    /**
     * Get configuration for a specific module (pricing, configurator, billing, etc.)
     */
    static getModuleConfig(moduleName: string): any {
        const fullConfig = this.getFullConfig();
        return fullConfig[moduleName] || this.getDefaultModuleConfig(moduleName);
    }

    /**
     * Get the complete RevCloud configuration
     */
    static getFullConfig(): any {
        if (this.configCache) {
            return this.configCache;
        }

        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                console.warn('[WARN] No workspace folder found, using default config');
                return this.getDefaultConfig();
            }

            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const configPath = path.join(workspaceRoot, this.CONFIG_FILE_PATH);

            if (!fs.existsSync(configPath)) {
                console.log(`[INFO] Config file not found at ${configPath}, using default config`);
                return this.getDefaultConfig();
            }

            const configContent = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configContent);
            
            const outputChannel = (global as any).revCloudBlueprintLogger;
            console.log(`[DEBUG] 📋 ✅ Loaded RevCloud config from ${configPath}`);
            console.log(`[DEBUG] 📋 Config content:`, JSON.stringify(config, null, 2));
            outputChannel?.appendLine(`[DEBUG] 📋 ✅ Loaded RevCloud config from ${configPath}`);
            outputChannel?.appendLine(`[DEBUG] 📋 Config content: ${JSON.stringify(config, null, 2)}`);
            
            // Validate the structure
            if (config.pricing && config.pricing.snapFields) {
                console.log(`[DEBUG] 📋 ✅ Config has pricing.snapFields structure`);
                outputChannel?.appendLine(`[DEBUG] 📋 ✅ Config has pricing.snapFields structure`);
                if (config.pricing.snapFields.quote && config.pricing.snapFields.quote.fields) {
                    console.log(`[DEBUG] 📋 ✅ Quote snap fields found: ${config.pricing.snapFields.quote.fields.join(', ')}`);
                    outputChannel?.appendLine(`[DEBUG] 📋 ✅ Quote snap fields found: ${config.pricing.snapFields.quote.fields.join(', ')}`);
                } else {
                    console.log(`[DEBUG] 📋 ⚠️ No quote snap fields found in config`);
                    outputChannel?.appendLine(`[DEBUG] 📋 ⚠️ No quote snap fields found in config`);
                }
                if (config.pricing.snapFields.quoteLineItem && config.pricing.snapFields.quoteLineItem.fields) {
                    console.log(`[DEBUG] 📋 ✅ QuoteLineItem snap fields found: ${config.pricing.snapFields.quoteLineItem.fields.join(', ')}`);
                    outputChannel?.appendLine(`[DEBUG] 📋 ✅ QuoteLineItem snap fields found: ${config.pricing.snapFields.quoteLineItem.fields.join(', ')}`);
                } else {
                    console.log(`[DEBUG] 📋 ⚠️ No QuoteLineItem snap fields found in config`);
                    outputChannel?.appendLine(`[DEBUG] 📋 ⚠️ No QuoteLineItem snap fields found in config`);
                }
            } else {
                console.log(`[DEBUG] 📋 ❌ Config missing pricing.snapFields structure`);
                outputChannel?.appendLine(`[DEBUG] 📋 ❌ Config missing pricing.snapFields structure`);
            }

            // Validate reportFields structure as well
            if (config.pricing && config.pricing.reportFields) {
                console.log(`[DEBUG] 📊 ✅ Config has pricing.reportFields structure`);
                outputChannel?.appendLine(`[DEBUG] 📊 ✅ Config has pricing.reportFields structure`);
                if (config.pricing.reportFields.quote && config.pricing.reportFields.quote.fields) {
                    console.log(`[DEBUG] 📊 ✅ Quote report fields found: ${config.pricing.reportFields.quote.fields.join(', ')}`);
                    outputChannel?.appendLine(`[DEBUG] 📊 ✅ Quote report fields found: ${config.pricing.reportFields.quote.fields.join(', ')}`);
                } else {
                    console.log(`[DEBUG] 📊 ⚠️ No quote report fields found in config`);
                    outputChannel?.appendLine(`[DEBUG] 📊 ⚠️ No quote report fields found in config`);
                }
                if (config.pricing.reportFields.quoteLineItem && config.pricing.reportFields.quoteLineItem.fields) {
                    console.log(`[DEBUG] 📊 ✅ QuoteLineItem report fields found: ${config.pricing.reportFields.quoteLineItem.fields.join(', ')}`);
                    outputChannel?.appendLine(`[DEBUG] 📊 ✅ QuoteLineItem report fields found: ${config.pricing.reportFields.quoteLineItem.fields.join(', ')}`);
                } else {
                    console.log(`[DEBUG] 📊 ⚠️ No QuoteLineItem report fields found in config`);
                    outputChannel?.appendLine(`[DEBUG] 📊 ⚠️ No QuoteLineItem report fields found in config`);
                }
            } else {
                console.log(`[DEBUG] 📊 ❌ Config missing pricing.reportFields structure`);
                outputChannel?.appendLine(`[DEBUG] 📊 ❌ Config missing pricing.reportFields structure`);
            }
            
            this.configCache = config;
            return config;

        } catch (error: any) {
            console.warn(`[WARN] Failed to read RevCloud config: ${error.message}, using default config`);
            return this.getDefaultConfig();
        }
    }

    /**
     * Get default configuration for all modules
     */
    private static getDefaultConfig(): any {
        return {
            pricing: this.getDefaultModuleConfig('pricing'),
            // Future modules will be added here
            // configurator: this.getDefaultModuleConfig('configurator'),
            // billing: this.getDefaultModuleConfig('billing'),
            // orders: this.getDefaultModuleConfig('orders')
        };
    }

    /**
     * Get default configuration for a specific module
     */
    private static getDefaultModuleConfig(moduleName: string): any {
        switch (moduleName) {
            case 'pricing':
                return {
                    snapFields: {
                        description: "Input fields captured in snapshots and used for test recreation",
                        quote: {
                            description: "Standard Quote fields for pricing calculation",
                            fields: []
                        },
                        quoteLineItem: {
                            description: "Standard QuoteLineItem fields for pricing calculation", 
                            fields: []
                        }
                    },
                    reportFields: {
                        description: "Additional fields captured and compared in test reports (these are added to the standard fields: Quote=[GrandTotal, TotalPrice], LineItem=[UnitPrice, NetUnitPrice, TotalPrice, NetTotalPrice, Quantity])",
                        quote: {
                            description: "Additional Quote-level pricing outputs (added to standard fields GrandTotal, TotalPrice)",
                            fields: []
                        },
                        quoteLineItem: {
                            description: "Additional QuoteLineItem-level pricing outputs (added to standard fields UnitPrice, NetUnitPrice, TotalPrice, NetTotalPrice, Quantity)",
                            fields: []
                        }
                    },
                    polling: {
                        description: "Configuration for intelligent polling to detect Revenue Cloud calculation completion",
                        fieldStability: {
                            enabled: true,
                            requiredStableAttempts: 2,
                            stabilityCheckFields: 'reportFields'
                        },
                        revenueCloud: {
                            bufferTimeMs: 3000,
                            enableQuickCompletionCheck: true
                        }
                    }
                };
            
            case 'configurator':
                return {
                    snapFields: {
                        description: "Input fields for product configuration testing",
                        product: {
                            description: "Product configuration fields",
                            fields: []
                        },
                        configuration: {
                            description: "Configuration rule fields",
                            fields: []
                        }
                    },
                    reportFields: {
                        description: "Configuration validation fields",
                        product: {
                            description: "Product validation outputs",
                            fields: []
                        },
                        configuration: {
                            description: "Configuration validation outputs", 
                            fields: []
                        }
                    }
                };
            
            case 'billing':
                return {
                    snapFields: {
                        description: "Input fields for billing testing",
                        billingSchedule: {
                            description: "Billing schedule input fields",
                            fields: []
                        }
                    },
                    reportFields: {
                        description: "Billing validation fields",
                        billingSchedule: {
                            description: "Billing schedule outputs",
                            fields: []
                        }
                    }
                };
            
            case 'orders':
                return {
                    snapFields: {
                        description: "Input fields for order testing",
                        order: {
                            description: "Order input fields",
                            fields: []
                        },
                        orderItem: {
                            description: "Order item input fields",
                            fields: []
                        }
                    },
                    reportFields: {
                        description: "Order validation fields", 
                        order: {
                            description: "Order validation outputs",
                            fields: []
                        },
                        orderItem: {
                            description: "Order item validation outputs",
                            fields: []
                        }
                    }
                };
            
            default:
                return {
                    snapFields: { description: `Input fields for ${moduleName} testing` },
                    reportFields: { description: `Validation fields for ${moduleName} testing` }
                };
        }
    }

    /**
     * Create configuration file with template for a specific module
     */
    static async createConfigurationFile(moduleName: string = 'pricing'): Promise<void> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                throw new Error('No workspace folder found');
            }

            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const configDir = path.dirname(path.join(workspaceRoot, this.CONFIG_FILE_PATH));
            const configPath = path.join(workspaceRoot, this.CONFIG_FILE_PATH);

            // Create .revcloud directory if it doesn't exist
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            // Get template configuration
            const template = RevenueCloudService.getConfigurationTemplate();
            
            // Write configuration file
            fs.writeFileSync(configPath, JSON.stringify(template, null, 2));
            
            console.log(`[INFO] Created configuration file: ${configPath}`);
            
            // Open the file for editing
            const document = await vscode.workspace.openTextDocument(configPath);
            await vscode.window.showTextDocument(document);
            
            vscode.window.showInformationMessage(
                `Configuration file created at ${this.CONFIG_FILE_PATH}. Please customize the fields for your project.`
            );

        } catch (error: any) {
            const errorMessage = `Failed to create configuration file: ${error.message}`;
            console.error(`[ERROR] ${errorMessage}`);
            vscode.window.showErrorMessage(errorMessage);
            throw new Error(errorMessage);
        }
    }

    /**
     * Validate configuration file structure
     */
    static validateConfiguration(): { isValid: boolean; errors: string[] } {
        try {
            const config = this.getFullConfig();
            
            const errors: string[] = [];
            
            // Check for required modules
            const requiredModules = ['pricing'];
            requiredModules.forEach(module => {
                if (!config[module]) {
                    errors.push(`Missing configuration for module: ${module}`);
                }
            });
            
            // Validate pricing module structure if present
            if (config.pricing) {
                if (!config.pricing.snapFields) {
                    errors.push('Missing snapFields in pricing configuration');
                }
                if (!config.pricing.reportFields) {
                    errors.push('Missing reportFields in pricing configuration');
                }
            }
            
            return {
                isValid: errors.length === 0,
                errors
            };
        } catch (error: any) {
            return {
                isValid: false,
                errors: [`Configuration validation failed: ${error.message}`]
            };
        }
    }

    /**
     * Get VS Code extension settings
     */
    static getExtensionSettings(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration('revCloudBlueprint');
    }

    /**
     * Get setting with type safety and default value
     */
    static getSetting<T>(settingPath: string, defaultValue: T): T {
        const config = this.getExtensionSettings();
        return config.get<T>(settingPath, defaultValue);
    }

    /**
     * Update extension setting
     */
    static async updateSetting(settingPath: string, value: any, target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace): Promise<void> {
        const config = this.getExtensionSettings();
        await config.update(settingPath, value, target);
    }

    /**
     * Clear configuration cache to force reload
     */
    static clearCache(): void {
        this.configCache = null;
        console.log('[DEBUG] 🔄 Configuration cache cleared - will reload on next access');
        const outputChannel = (global as any).revCloudBlueprintLogger;
        outputChannel?.appendLine('[DEBUG] 🔄 Configuration cache cleared - will reload on next access');
    }

    /**
     * Check if configuration file exists
     */
    static configurationFileExists(): boolean {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                return false;
            }

            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const configPath = path.join(workspaceRoot, this.CONFIG_FILE_PATH);
            
            return fs.existsSync(configPath);
        } catch (error: any) {
            return false;
        }
    }

    /**
     * Get configuration file path
     */
    static getConfigurationFilePath(): string | null {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                return null;
            }

            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            return path.join(workspaceRoot, this.CONFIG_FILE_PATH);
        } catch (error: any) {
            return null;
        }
    }
}
