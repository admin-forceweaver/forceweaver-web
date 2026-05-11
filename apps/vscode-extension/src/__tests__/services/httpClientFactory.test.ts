import axios, { AxiosInstance } from 'axios';
import * as vscode from 'vscode';
import { HttpClientFactory } from '../../services/httpClientFactory';
import { SalesforceAuth, SalesforceOrg } from '../../salesforce/auth';
import { ApiUtilityService } from '../../services/apiUtilityService';

// Mock dependencies
jest.mock('axios');
jest.mock('vscode');
jest.mock('../../salesforce/auth');
jest.mock('../../services/apiUtilityService');

describe('HttpClientFactory', () => {
  let mockAuth: jest.Mocked<SalesforceAuth>;
  let mockOrg: SalesforceOrg;
  let mockAxiosInstance: jest.Mocked<AxiosInstance>;
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Clear the cached clients before each test
    HttpClientFactory.clearAllClients();

    // Mock org data
    mockOrg = {
      orgId: '00D000000000001',
      username: 'test@example.com',
      alias: 'TestOrg',
      instanceUrl: 'https://test.salesforce.com',
      isActive: true,
      type: 'Sandbox'
    };

    // Mock axios.create to return a new instance each time
    (axios.create as jest.Mock).mockImplementation(() => ({
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() }
      },
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      options: jest.fn(),
      head: jest.fn()
    }));

    // Mock auth
    mockAuth = new SalesforceAuth() as jest.Mocked<SalesforceAuth>;
    mockAuth.getOrgInfo = jest.fn().mockResolvedValue(mockOrg);
    mockAuth.getAccessToken = jest.fn().mockResolvedValue('mock-access-token');

    // Mock ApiUtilityService
    (ApiUtilityService.getApiVersion as jest.Mock).mockReturnValue('v64.0');

    // Mock vscode configuration
    mockConfig = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'verboseLogging') return false;
        return defaultValue;
      })
    };
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
  });

  describe('getClient', () => {
    it('should create and return a new HTTP client', async () => {
      const client = await HttpClientFactory.getClient('test@example.com', mockAuth);

      expect(client).toBeDefined();
      expect(client.interceptors).toBeDefined();
      expect(mockAuth.getOrgInfo).toHaveBeenCalledWith('test@example.com');
      expect(mockAuth.getAccessToken).toHaveBeenCalledWith('test@example.com');
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'https://test.salesforce.com/services/data/v64.0',
        headers: {
          'Authorization': 'Bearer mock-access-token',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
    });

    it('should return cached client for same org and timeout', async () => {
      const client1 = await HttpClientFactory.getClient('test@example.com', mockAuth);
      const client2 = await HttpClientFactory.getClient('test@example.com', mockAuth);

      expect(client1).toBe(client2);
      expect(axios.create).toHaveBeenCalledTimes(1);
    });

    it('should create different clients for different timeouts', async () => {
      const client1 = await HttpClientFactory.getClient('test@example.com', mockAuth, 30000);
      const client2 = await HttpClientFactory.getClient('test@example.com', mockAuth, 60000);

      expect(client1).not.toBe(client2);
      expect(axios.create).toHaveBeenCalledTimes(2);
    });

    it('should create different clients for different orgs', async () => {
      const client1 = await HttpClientFactory.getClient('org1@example.com', mockAuth);
      const client2 = await HttpClientFactory.getClient('org2@example.com', mockAuth);

      expect(client1).not.toBe(client2);
      expect(axios.create).toHaveBeenCalledTimes(2);
    });

    it('should use custom timeout when provided', async () => {
      await HttpClientFactory.getClient('test@example.com', mockAuth, 60000);

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 60000
        })
      );
    });

    it('should throw error when instance URL is missing', async () => {
      mockAuth.getOrgInfo = jest.fn().mockResolvedValue({
        ...mockOrg,
        instanceUrl: ''
      });

      await expect(HttpClientFactory.getClient('test@example.com', mockAuth))
        .rejects.toThrow('Instance URL not found for org: test@example.com');
    });

    it('should throw error when access token is missing', async () => {
      mockAuth.getAccessToken = jest.fn().mockResolvedValue('');

      await expect(HttpClientFactory.getClient('test@example.com', mockAuth))
        .rejects.toThrow('Access token not found for org: test@example.com');
    });

    it('should add interceptors when verbose logging is enabled', async () => {
      mockConfig.get = jest.fn((key: string) => {
        if (key === 'verboseLogging') return true;
        return false;
      });

      const client = await HttpClientFactory.getClient('test@example.com', mockAuth);

      expect(client.interceptors.request.use).toHaveBeenCalled();
      expect(client.interceptors.response.use).toHaveBeenCalled();
    });

    it('should not add interceptors when verbose logging is disabled', async () => {
      mockConfig.get = jest.fn((key: string) => {
        if (key === 'verboseLogging') return false;
        return false;
      });

      const client = await HttpClientFactory.getClient('test@example.com', mockAuth);

      expect(client.interceptors.request.use).not.toHaveBeenCalled();
      expect(client.interceptors.response.use).not.toHaveBeenCalled();
    });

    it('should log request when interceptor is triggered', async () => {
      mockConfig.get = jest.fn((key: string) => {
        if (key === 'verboseLogging') return true;
        return false;
      });

      const client = await HttpClientFactory.getClient('test@example.com', mockAuth);

      // Get the request interceptor function
      const requestInterceptor = (client.interceptors.request.use as jest.Mock).mock.calls[0][0];

      const mockRequest = {
        method: 'get',
        url: '/sobjects/Quote'
      };

      const result = requestInterceptor(mockRequest);
      expect(result).toBe(mockRequest);
    });

    it('should log response when interceptor is triggered', async () => {
      mockConfig.get = jest.fn((key: string) => {
        if (key === 'verboseLogging') return true;
        return false;
      });

      const client = await HttpClientFactory.getClient('test@example.com', mockAuth);

      // Get the response interceptor success function
      const responseInterceptor = (client.interceptors.response.use as jest.Mock).mock.calls[0][0];

      const mockResponse = {
        status: 200,
        config: { url: '/sobjects/Quote' }
      };

      const result = responseInterceptor(mockResponse);
      expect(result).toBe(mockResponse);
    });

    it('should log error when interceptor error is triggered', async () => {
      mockConfig.get = jest.fn((key: string) => {
        if (key === 'verboseLogging') return true;
        return false;
      });

      const client = await HttpClientFactory.getClient('test@example.com', mockAuth);

      // Get the response interceptor error function
      const errorInterceptor = (client.interceptors.response.use as jest.Mock).mock.calls[0][1];

      const mockError = {
        response: { status: 500 },
        config: { url: '/sobjects/Quote' },
        message: 'Server error'
      };

      await expect(errorInterceptor(mockError)).rejects.toBe(mockError);
    });
  });

  describe('clearClientForOrg', () => {
    it('should clear cached clients for specific org', async () => {
      // Create clients for the same org with different timeouts
      await HttpClientFactory.getClient('test@example.com', mockAuth, 30000);
      await HttpClientFactory.getClient('test@example.com', mockAuth, 60000);
      await HttpClientFactory.getClient('other@example.com', mockAuth, 30000);

      HttpClientFactory.clearClientForOrg('test@example.com');

      const stats = HttpClientFactory.getCacheStats();
      expect(stats.totalClients).toBe(1);
      expect(stats.clients).toContain('other@example.com_30000');
    });

    it('should handle clearing non-existent org', () => {
      HttpClientFactory.clearClientForOrg('nonexistent@example.com');

      const stats = HttpClientFactory.getCacheStats();
      expect(stats.totalClients).toBe(0);
    });

    it('should clear multiple clients for same org', async () => {
      await HttpClientFactory.getClient('test@example.com', mockAuth, 10000);
      await HttpClientFactory.getClient('test@example.com', mockAuth, 20000);
      await HttpClientFactory.getClient('test@example.com', mockAuth, 30000);

      const statsBefore = HttpClientFactory.getCacheStats();
      expect(statsBefore.totalClients).toBe(3);

      HttpClientFactory.clearClientForOrg('test@example.com');

      const statsAfter = HttpClientFactory.getCacheStats();
      expect(statsAfter.totalClients).toBe(0);
    });
  });

  describe('clearAllClients', () => {
    it('should clear all cached clients', async () => {
      await HttpClientFactory.getClient('org1@example.com', mockAuth);
      await HttpClientFactory.getClient('org2@example.com', mockAuth);
      await HttpClientFactory.getClient('org3@example.com', mockAuth);

      const statsBefore = HttpClientFactory.getCacheStats();
      expect(statsBefore.totalClients).toBe(3);

      HttpClientFactory.clearAllClients();

      const statsAfter = HttpClientFactory.getCacheStats();
      expect(statsAfter.totalClients).toBe(0);
    });

    it('should handle clearing when no clients exist', () => {
      HttpClientFactory.clearAllClients();

      const stats = HttpClientFactory.getCacheStats();
      expect(stats.totalClients).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    it('should return empty stats when no clients cached', () => {
      const stats = HttpClientFactory.getCacheStats();

      expect(stats.totalClients).toBe(0);
      expect(stats.orgCount).toBe(0);
      expect(stats.clients).toEqual([]);
    });

    it('should return correct stats for single client', async () => {
      await HttpClientFactory.getClient('test@example.com', mockAuth);

      const stats = HttpClientFactory.getCacheStats();

      expect(stats.totalClients).toBe(1);
      expect(stats.orgCount).toBe(1);
      expect(stats.clients).toContain('test@example.com_30000');
    });

    it('should return correct stats for multiple clients', async () => {
      await HttpClientFactory.getClient('org1@example.com', mockAuth, 30000);
      await HttpClientFactory.getClient('org1@example.com', mockAuth, 60000);
      await HttpClientFactory.getClient('org2@example.com', mockAuth, 30000);

      const stats = HttpClientFactory.getCacheStats();

      expect(stats.totalClients).toBe(3);
      expect(stats.orgCount).toBe(2);
      expect(stats.clients).toHaveLength(3);
      expect(stats.clients).toContain('org1@example.com_30000');
      expect(stats.clients).toContain('org1@example.com_60000');
      expect(stats.clients).toContain('org2@example.com_30000');
    });

    it('should count orgs correctly when same org has multiple timeouts', async () => {
      await HttpClientFactory.getClient('test@example.com', mockAuth, 10000);
      await HttpClientFactory.getClient('test@example.com', mockAuth, 20000);
      await HttpClientFactory.getClient('test@example.com', mockAuth, 30000);

      const stats = HttpClientFactory.getCacheStats();

      expect(stats.totalClients).toBe(3);
      expect(stats.orgCount).toBe(1);
    });
  });
});
