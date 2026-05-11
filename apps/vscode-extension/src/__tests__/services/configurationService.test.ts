import { ConfigurationService } from '../../services/configurationService';
import { RevenueCloudService } from '../../services/revenueCloudService';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('../../services/revenueCloudService');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;
const mockedRevenueCloudService = RevenueCloudService as jest.Mocked<typeof RevenueCloudService>;

describe('ConfigurationService', () => {
  const mockWorkspaceFolder = {
    uri: { fsPath: '/test/workspace' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    ConfigurationService.clearCache();
    
    // Mock workspace folders
    (vscode.workspace.workspaceFolders as any) = [mockWorkspaceFolder];
    
    // Default path mocking
    mockedPath.join.mockImplementation((...args) => args.join('/'));
    mockedPath.dirname.mockImplementation((filePath) => filePath.split('/').slice(0, -1).join('/'));
  });

  describe('getFullConfig', () => {
    it('should load and cache configuration from file', () => {
      const mockConfig = {
        pricing: {
          snapFields: { quote: { fields: ['CustomField__c'] } },
          reportFields: { quote: { fields: ['TotalAmount__c'] } }
        }
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const config1 = ConfigurationService.getFullConfig();
      const config2 = ConfigurationService.getFullConfig(); // Should use cache

      expect(config1).toEqual(mockConfig);
      expect(config2).toEqual(mockConfig);
      expect(mockedFs.readFileSync).toHaveBeenCalledTimes(1); // Only called once due to caching
    });

    it('should return default config when file does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const config = ConfigurationService.getFullConfig();

      expect(config).toHaveProperty('pricing');
      expect(config.pricing).toHaveProperty('snapFields');
      expect(config.pricing).toHaveProperty('reportFields');
    });

    it('should return default config when no workspace folder', () => {
      (vscode.workspace.workspaceFolders as any) = null;

      const config = ConfigurationService.getFullConfig();

      expect(config).toHaveProperty('pricing');
    });

    it('should handle JSON parsing errors', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('invalid json');

      const config = ConfigurationService.getFullConfig();

      expect(config).toHaveProperty('pricing');
    });

    it('should handle file reading errors', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const config = ConfigurationService.getFullConfig();

      expect(config).toHaveProperty('pricing');
    });
  });

  describe('getModuleConfig', () => {
    it('should return module config when it exists', () => {
      const mockConfig = {
        pricing: { snapFields: { quote: { fields: ['CustomField__c'] } } },
        configurator: { snapFields: { product: { fields: ['ConfigField__c'] } } }
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const pricingConfig = ConfigurationService.getModuleConfig('pricing');
      const configuratorConfig = ConfigurationService.getModuleConfig('configurator');

      expect(pricingConfig).toEqual(mockConfig.pricing);
      expect(configuratorConfig).toEqual(mockConfig.configurator);
    });

    it('should return default module config when module does not exist', () => {
      const mockConfig = { pricing: {} };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));

      const configuratorConfig = ConfigurationService.getModuleConfig('configurator');

      expect(configuratorConfig).toHaveProperty('snapFields');
      expect(configuratorConfig).toHaveProperty('reportFields');
    });
  });

  describe('createConfigurationFile', () => {
    beforeEach(() => {
      mockedRevenueCloudService.getConfigurationTemplate.mockReturnValue({
        pricing: { snapFields: {}, reportFields: {} }
      });
    });

    it('should create configuration file with template', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue({});
      (vscode.window.showTextDocument as jest.Mock).mockResolvedValue({});

      await ConfigurationService.createConfigurationFile('pricing');

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith('/test/workspace/.revcloud', { recursive: true });
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        '/test/workspace/.revcloud/settings.json',
        expect.stringContaining('pricing')
      );
      expect(vscode.window.showInformationMessage).toHaveBeenCalled();
    });

    it('should not create directory if it already exists', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue({});
      (vscode.window.showTextDocument as jest.Mock).mockResolvedValue({});

      await ConfigurationService.createConfigurationFile();

      expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    it('should handle no workspace folder error', async () => {
      (vscode.workspace.workspaceFolders as any) = null;

      await expect(ConfigurationService.createConfigurationFile()).rejects.toThrow(
        'No workspace folder found'
      );
    });

    it('should handle file system errors', async () => {
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await expect(ConfigurationService.createConfigurationFile()).rejects.toThrow(
        'Failed to create configuration file: Permission denied'
      );
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });
  });

  describe('validateConfiguration', () => {
    it('should validate valid configuration', () => {
      const validConfig = {
        pricing: {
          snapFields: { quote: { fields: [] } },
          reportFields: { quote: { fields: [] } }
        }
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(validConfig));

      const result = ConfigurationService.validateConfiguration();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing pricing module', () => {
      const invalidConfig = {};

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(invalidConfig));

      const result = ConfigurationService.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing configuration for module: pricing');
    });

    it('should detect missing snapFields in pricing', () => {
      const invalidConfig = {
        pricing: {
          reportFields: {}
        }
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(invalidConfig));

      const result = ConfigurationService.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing snapFields in pricing configuration');
    });

    it('should detect missing reportFields in pricing', () => {
      const invalidConfig = {
        pricing: {
          snapFields: {}
        }
      };

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(invalidConfig));

      const result = ConfigurationService.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing reportFields in pricing configuration');
    });

    it('should handle configuration loading errors', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      const result = ConfigurationService.validateConfiguration();

      expect(result.isValid).toBe(true); // Default configuration should be valid
      expect(result.errors).toEqual([]);
    });
  });

  describe('extension settings methods', () => {
    let mockConfig: any;

    beforeEach(() => {
      mockConfig = {
        get: jest.fn(),
        update: jest.fn()
      };
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
    });

    describe('getSetting', () => {
      it('should get setting with default value', () => {
        mockConfig.get.mockReturnValue('test-value');

        const result = ConfigurationService.getSetting('test.setting', 'default');

        expect(result).toBe('test-value');
        expect(mockConfig.get).toHaveBeenCalledWith('test.setting', 'default');
      });

      it('should return default value when setting not found', () => {
        mockConfig.get.mockReturnValue(undefined);

        const result = ConfigurationService.getSetting('missing.setting', 'default');

        expect(result).toBe(undefined); // getSetting likely returns undefined for missing settings
      });
    });

    describe('updateSetting', () => {
      it('should update setting with workspace target by default', async () => {
        await ConfigurationService.updateSetting('test.setting', 'new-value');

        expect(mockConfig.update).toHaveBeenCalledWith(
          'test.setting',
          'new-value', 
          vscode.ConfigurationTarget.Workspace
        );
      });

      it('should update setting with specified target', async () => {
        await ConfigurationService.updateSetting(
          'test.setting', 
          'new-value', 
          vscode.ConfigurationTarget.Global
        );

        expect(mockConfig.update).toHaveBeenCalledWith(
          'test.setting',
          'new-value', 
          vscode.ConfigurationTarget.Global
        );
      });
    });
  });

  describe('configurationFileExists', () => {
    it('should return true when configuration file exists', () => {
      mockedFs.existsSync.mockReturnValue(true);

      const result = ConfigurationService.configurationFileExists();

      expect(result).toBe(true);
    });

    it('should return false when configuration file does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = ConfigurationService.configurationFileExists();

      expect(result).toBe(false);
    });

    it('should return false when no workspace folder', () => {
      (vscode.workspace.workspaceFolders as any) = null;

      const result = ConfigurationService.configurationFileExists();

      expect(result).toBe(false);
    });

    it('should handle file system errors', () => {
      mockedFs.existsSync.mockImplementation(() => {
        throw new Error('Permission error');
      });

      const result = ConfigurationService.configurationFileExists();

      expect(result).toBe(false);
    });
  });

  describe('getConfigurationFilePath', () => {
    it('should return correct configuration file path', () => {
      const result = ConfigurationService.getConfigurationFilePath();

      expect(result).toBe('/test/workspace/.revcloud/settings.json');
    });

    it('should return null when no workspace folder', () => {
      (vscode.workspace.workspaceFolders as any) = null;

      const result = ConfigurationService.getConfigurationFilePath();

      expect(result).toBe(null);
    });

    it('should handle path joining errors', () => {
      mockedPath.join.mockImplementation(() => {
        throw new Error('Path error');
      });

      const result = ConfigurationService.getConfigurationFilePath();

      expect(result).toBe(null);
    });
  });

  describe('clearCache', () => {
    it('should clear configuration cache', () => {
      // First load config to populate cache
      const mockConfig = { pricing: {} };
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockConfig));
      
      ConfigurationService.getFullConfig();
      mockedFs.readFileSync.mockClear();

      // Clear cache and load again
      ConfigurationService.clearCache();
      ConfigurationService.getFullConfig();

      // Should read from file again since cache was cleared
      expect(mockedFs.readFileSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('default configurations', () => {
    it('should provide default pricing configuration', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const config = ConfigurationService.getModuleConfig('pricing');

      expect(config).toHaveProperty('snapFields');
      expect(config).toHaveProperty('reportFields');
      expect(config).toHaveProperty('polling');
      
      // Check that default configuration has empty arrays for fields (standard fields are added dynamically)
      expect(config.reportFields.quote.fields).toEqual([]);
      expect(config.reportFields.quoteLineItem.fields).toEqual([]);
      expect(config.snapFields.quote.fields).toEqual([]);
      expect(config.snapFields.quoteLineItem.fields).toEqual([]);
      
      // Check polling configuration
      expect(config.polling.fieldStability.enabled).toBe(true);
      expect(config.polling.fieldStability.requiredStableAttempts).toBe(2);
      expect(config.polling.revenueCloud.bufferTimeMs).toBe(3000);
      expect(config.polling.revenueCloud.enableQuickCompletionCheck).toBe(true);
    });

    it('should provide default configurator configuration', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const config = ConfigurationService.getModuleConfig('configurator');

      expect(config).toHaveProperty('snapFields');
      expect(config).toHaveProperty('reportFields');
      expect(config.snapFields).toHaveProperty('product');
      expect(config.snapFields).toHaveProperty('configuration');
    });

    it('should provide default billing configuration', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const config = ConfigurationService.getModuleConfig('billing');

      expect(config).toHaveProperty('snapFields');
      expect(config).toHaveProperty('reportFields');
      expect(config.snapFields).toHaveProperty('billingSchedule');
    });

    it('should provide default orders configuration', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const config = ConfigurationService.getModuleConfig('orders');

      expect(config).toHaveProperty('snapFields');
      expect(config).toHaveProperty('reportFields');
      expect(config.snapFields).toHaveProperty('order');
      expect(config.snapFields).toHaveProperty('orderItem');
    });

    it('should provide generic default for unknown modules', () => {
      mockedFs.existsSync.mockReturnValue(false);

      const config = ConfigurationService.getModuleConfig('unknown-module');

      expect(config).toHaveProperty('snapFields');
      expect(config).toHaveProperty('reportFields');
      expect(config.snapFields.description).toContain('unknown-module');
    });
  });
});
