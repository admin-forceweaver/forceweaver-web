import * as vscode from 'vscode';
import { ConfigurationService } from '../services/configurationService';

export interface RevCloudConfig {
    pricing: {
        snapFields: {
            description: string;
            quote: {
                description: string;
                fields: string[];
            };
            quoteLineItem: {
                description: string;
                fields: string[];
            };
        };
        reportFields: {
            description: string;
            quote: {
                description: string;
                fields: string[];
            };
            quoteLineItem: {
                description: string;
                fields: string[];
            };
        };
    };
    configurator?: {
        snapFields?: {
            description?: string;
            quote?: {
                description?: string;
                fields?: string[];
            };
            quoteLineItem?: {
                description?: string;
                fields?: string[];
            };
        };
    };
}

export class ConfigReader {
    /**
     * Get the RevCloud pricing configuration (maintains backward compatibility)
     * @deprecated Use ConfigurationService.getModuleConfig('pricing') instead
     */
    static getConfig(): RevCloudConfig {
        console.warn('[WARN] ConfigReader.getConfig() is deprecated. Use ConfigurationService.getModuleConfig() instead.');
        
        const pricingConfig = ConfigurationService.getModuleConfig('pricing');
        
        // Convert to legacy format for backward compatibility
        return {
            pricing: pricingConfig
        };
    }

    /**
     * Get default configuration if .revcloud/settings.json is not found
     * Contains only standard Revenue Cloud fields for marketplace compatibility
     */
    private static getDefaultConfig(): RevCloudConfig {
        return {
            pricing: {
                snapFields: {
                    description: "Input fields captured in snapshots and used for pricing test recreation (configure your project-specific fields in .revcloud/settings.json)",
                    quote: {
                        description: "Standard Quote fields that are commonly used as inputs for pricing calculation",
                        fields: [
                            // Standard Revenue Cloud fields only - no project-specific customizations
                        ]
                    },
                    quoteLineItem: {
                        description: "Standard QuoteLineItem fields that are commonly used as inputs for pricing calculation", 
                        fields: [
                            // Standard Revenue Cloud fields only - no project-specific customizations
                        ]
                    }
                },
                reportFields: {
                    description: "Standard fields captured in snapshots and used for test report comparison (configure your project-specific calculated fields in .revcloud/settings.json)",
                    quote: {
                        description: "Standard Quote-level pricing outputs to verify in test reports",
                        fields: [
                            "GrandTotal",
                            "TotalPrice"
                        ]
                    },
                    quoteLineItem: {
                        description: "Standard QuoteLineItem-level pricing outputs to verify in test reports",
                        fields: [
                            "UnitPrice",
                            "NetUnitPrice",
                            "TotalPrice",
                            "NetTotalPrice",
                            "Quantity"
                        ]
                    }
                }
            }
        };
    }

    /**
     * Clear config cache to force reload (useful for testing)
     */
    static clearCache(): void {
        ConfigurationService.clearCache();
    }
}
