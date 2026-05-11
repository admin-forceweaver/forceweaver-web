import { ApexExecutor } from '../../apex/executor';
import { SalesforceAuth, SalesforceOrg } from '../../salesforce/auth';
import * as vscode from 'vscode';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('ApexExecutor', () => {
  let apexExecutor: ApexExecutor;
  let mockAuth: jest.Mocked<SalesforceAuth>;
  let mockOutputChannel: any;

  const mockOrg: SalesforceOrg = {
    alias: 'test-org',
    username: 'user@test.com',
    orgId: '00D000000000001',
    instanceUrl: 'https://test.salesforce.com',
    isActive: true,
    type: 'production'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAuth = {
      getOrgInfo: jest.fn(),
      getAccessToken: jest.fn(),
      getAuthenticatedOrgs: jest.fn(),
      validateOrgConnection: jest.fn(),
      selectOrg: jest.fn(),
      clearCache: jest.fn()
    } as unknown as jest.Mocked<SalesforceAuth>;

    mockOutputChannel = {
      appendLine: jest.fn(),
      show: jest.fn(),
      clear: jest.fn(),
      dispose: jest.fn()
    };

    (global as any).revCloudBlueprintLogger = mockOutputChannel;
    
    mockAuth.getOrgInfo.mockResolvedValue(mockOrg);
    mockAuth.getAccessToken.mockResolvedValue('mock-access-token');

    apexExecutor = new ApexExecutor(mockAuth);
  });

  afterEach(() => {
    delete (global as any).revCloudBlueprintLogger;
  });

  describe('executePricingApex', () => {
    it('should execute apex successfully with POST method', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          compiled: true
        })
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

      await apexExecutor.executePricingApex('0Q0000000000001', mockOrg);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('executeAnonymous/?anonymousBody='),
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer mock-access-token',
            'Accept': 'application/json'
          }
        }
      );

      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('Pricing calculation completed successfully!')
      );
    });

    it('should execute pricing apex using GET method', async () => {
      const getResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          compiled: true
        })
      };

      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce(getResponse as any);

      await apexExecutor.executePricingApex('0Q0000000000001', mockOrg);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('executeAnonymous/?anonymousBody='), expect.objectContaining({ method: 'GET' }));
    });

    it('should handle compilation errors', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          compiled: false,
          compileProblem: 'Syntax error on line 1'
        })
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

      await expect(apexExecutor.executePricingApex('0Q0000000000001', mockOrg))
        .rejects.toThrow('Apex compilation failed: Syntax error on line 1');
    });

    it('should handle runtime exceptions', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          compiled: true,
          exceptionMessage: 'NullPointerException'
        })
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

      await expect(apexExecutor.executePricingApex('0Q0000000000001', mockOrg))
        .rejects.toThrow('Apex runtime exception: NullPointerException');
    });

    it('should handle HTTP errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          get: jest.fn().mockImplementation((name: string) => {
            if (name === 'content-type') return 'application/json';
            if (name === 'server') return 'nginx';
            return null;
          })
        },
        json: jest.fn().mockResolvedValue({
          message: 'Server error'
        })
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

      await expect(apexExecutor.executePricingApex('0Q0000000000001', mockOrg))
        .rejects.toThrow('Apex execution failed: Server error (HTTP 500)');
    });

    it('should handle JSON parsing errors', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
        text: jest.fn().mockResolvedValue('Invalid response body')
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

      await expect(apexExecutor.executePricingApex('0Q0000000000001', mockOrg))
        .rejects.toThrow('Failed to parse response');
    });

    it('should handle auth failures', async () => {
      mockAuth.getAccessToken.mockRejectedValue(new Error('Auth failed'));

      await expect(apexExecutor.executePricingApex('0Q0000000000001', mockOrg))
        .rejects.toThrow('Pricing Apex execution failed: Auth failed');
    });
  });

  describe('generateCurlCommand', () => {
    it('should generate valid curl command with redacted token', async () => {
      const curlCommand = await apexExecutor.generateCurlCommand('0Q0000000000001', mockOrg);

      expect(curlCommand).toContain('curl -X GET');
      expect(curlCommand).toContain('https://test.salesforce.com/services/data/v64.0/tooling/executeAnonymous');
      // Security: Token should be redacted to prevent exposure in logs
      expect(curlCommand).toContain('Authorization: Bearer [REDACTED]');
      expect(curlCommand).toContain('anonymousBody=');
      expect(curlCommand).toContain('0Q0000000000001');
      // Should include instructions for getting the actual token
      expect(curlCommand).toContain('Replace [REDACTED] with actual access token');
    });

    it('should reject invalid Salesforce ID format', async () => {
      await expect(apexExecutor.generateCurlCommand("0Q0'test'001", mockOrg)).rejects.toThrow('Invalid Salesforce ID format');
    });
  });

  describe('logging', () => {
    it('should log to output channel', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          compiled: true
        })
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

      await apexExecutor.executePricingApex('0Q0000000000001', mockOrg);

      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('Executing pricing calculation for quote')
      );
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(
        expect.stringContaining('Target Org: test-org')
      );
    });

    it('should handle missing output channel gracefully', async () => {
      delete (global as any).revCloudBlueprintLogger;
      
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          compiled: true
        })
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(mockResponse as any);

      // Should not throw even without output channel
      await apexExecutor.executePricingApex('0Q0000000000001', mockOrg);

      // Should still work without the output channel
      expect(fetch).toHaveBeenCalled();
    });
  });
});
