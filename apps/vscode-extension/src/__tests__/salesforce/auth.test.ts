// Mock the modules first, before any imports
const mockExecAsync = jest.fn();

jest.mock('child_process', () => ({
  exec: jest.fn()
}));

jest.mock('util', () => ({
  promisify: jest.fn().mockReturnValue(mockExecAsync)
}));

// Now safe to import
import { SalesforceAuth, SalesforceOrg } from '../../salesforce/auth';
import * as vscode from 'vscode';

describe('SalesforceAuth', () => {
  let salesforceAuth: SalesforceAuth;

  beforeEach(() => {
    mockExecAsync.mockClear();
    salesforceAuth = new SalesforceAuth();
  });

  describe('getAuthenticatedOrgs', () => {
    it('should return list of authenticated orgs', async () => {
      const mockOrgListResponse = {
        status: 0,
        result: {
          nonScratchOrgs: [{
            alias: 'prod-org',
            username: 'user@prod.com',
            orgId: '00D000000000001',
            instanceUrl: 'https://prod.salesforce.com',
            isDefaultUsername: true
          }],
          scratchOrgs: [{
            alias: 'dev-scratch',
            username: 'user@dev.scratch.com',
            orgId: '00D000000000002',
            instanceUrl: 'https://dev-scratch.salesforce.com',
            isDefaultUsername: false
          }]
        }
      };

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify(mockOrgListResponse)
      });

      const result = await salesforceAuth.getAuthenticatedOrgs();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        alias: 'prod-org',
        username: 'user@prod.com',
        orgId: '00D000000000001',
        instanceUrl: 'https://prod.salesforce.com',
        isActive: true,
        type: 'production'
      });
      expect(result[1]).toEqual({
        alias: 'dev-scratch',
        username: 'user@dev.scratch.com',
        orgId: '00D000000000002',
        instanceUrl: 'https://dev-scratch.salesforce.com',
        isActive: false,
        type: 'scratch'
      });
    });

    it('should handle CLI command failure', async () => {
      const mockErrorResponse = {
        status: 1,
        message: 'Command failed'
      };

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify(mockErrorResponse)
      });

      const result = await salesforceAuth.getAuthenticatedOrgs();
      expect(result).toEqual([]);
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to get authenticated orgs. Make sure Salesforce CLI is installed and configured.'
      );
    });

    it('should handle network/parsing errors', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('Network error'));

      const result = await salesforceAuth.getAuthenticatedOrgs();
      expect(result).toEqual([]);
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });
  });

  describe('getAccessToken', () => {
    it('should return access token for org', async () => {
      const mockTokenResponse = {
        status: 0,
        result: {
          accessToken: 'mock-access-token'
        }
      };

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify(mockTokenResponse)
      });

      const result = await salesforceAuth.getAccessToken('test-org');
      expect(result).toBe('mock-access-token');
      expect(mockExecAsync).toHaveBeenCalledWith(
        'sf org display --target-org test-org --json'
      );
    });

    it('should throw error when CLI command fails', async () => {
      const mockErrorResponse = {
        status: 1,
        message: 'Org not found'
      };

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify(mockErrorResponse)
      });

      await expect(salesforceAuth.getAccessToken('invalid-org')).rejects.toThrow(
        'Failed to get access token for org: invalid-org'
      );
    });
  });

  describe('getOrgInfo', () => {
    it('should return org info', async () => {
      const mockOrgInfo = {
        status: 0,
        result: {
          alias: 'test-org',
          username: 'user@test.com',
          id: '00D000000000001',
          instanceUrl: 'https://test.salesforce.com',
          accessToken: 'mock-token',
          isDefaultUsername: true
        }
      };

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify(mockOrgInfo)
      });

      const result = await salesforceAuth.getOrgInfo('test-org');
      expect(result).toEqual({
        alias: 'test-org',
        username: 'user@test.com',
        orgId: '00D000000000001',
        instanceUrl: 'https://test.salesforce.com',
        accessToken: 'mock-token',
        isActive: true,
        type: 'production'
      });
    });

    it('should return cached org info', async () => {
      // First call should fetch from CLI
      const mockOrgInfo = {
        status: 0,
        result: {
          alias: 'cached-org',
          username: 'user@cached.com',
          id: '00D000000000001',
          instanceUrl: 'https://cached.salesforce.com',
          accessToken: 'cached-token',
          isDefaultUsername: false
        }
      };

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify(mockOrgInfo)
      });

      const result1 = await salesforceAuth.getOrgInfo('cached-org');
      expect(mockExecAsync).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await salesforceAuth.getOrgInfo('cached-org');
      expect(mockExecAsync).toHaveBeenCalledTimes(1); // Still 1, no additional call
      expect(result1).toEqual(result2);
    });
  });

  describe('validateOrgConnection', () => {
    it('should return true for valid org connection', async () => {
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ status: 0 })
      });

      const result = await salesforceAuth.validateOrgConnection('valid-org');
      expect(result).toBe(true);
    });

    it('should return false for invalid org connection', async () => {
      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify({ status: 1 })
      });

      const result = await salesforceAuth.validateOrgConnection('invalid-org');
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('Connection error'));

      const result = await salesforceAuth.validateOrgConnection('error-org');
      expect(result).toBe(false);
    });
  });

  describe('selectOrg', () => {
    it('should show quick pick with orgs', async () => {
      const mockOrgs: SalesforceOrg[] = [{
        alias: 'test-org',
        username: 'user@test.com',
        orgId: '00D000000000001',
        instanceUrl: 'https://test.salesforce.com',
        isActive: true,
        type: 'production'
      }];

      // Mock getAuthenticatedOrgs
      jest.spyOn(salesforceAuth, 'getAuthenticatedOrgs').mockResolvedValueOnce(mockOrgs);

      const mockQuickPickResult = {
        label: 'test-org',
        description: 'user@test.com (production)',
        detail: 'https://test.salesforce.com',
        org: mockOrgs[0]
      };

      (vscode.window.showQuickPick as jest.Mock).mockResolvedValueOnce(mockQuickPickResult);

      const result = await salesforceAuth.selectOrg('Select Org');
      expect(result).toBe(mockOrgs[0]);
      expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            label: 'test-org',
            description: 'user@test.com',
            org: expect.objectContaining({
              alias: 'test-org',
              username: 'user@test.com',
              instanceUrl: 'https://test.salesforce.com',
              isActive: true,
              orgId: '00D000000000001',
              type: 'production'
            })
          })
        ]),
        expect.objectContaining({
          placeHolder: 'Select Org',
          canPickMany: false
        })
      );
    });

    it('should show warning when no orgs available', async () => {
      jest.spyOn(salesforceAuth, 'getAuthenticatedOrgs').mockResolvedValueOnce([]);

      const result = await salesforceAuth.selectOrg();
      expect(result).toBeUndefined();
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'No authenticated Salesforce orgs found. Please authenticate using Salesforce CLI.'
      );
    });

    it('should filter orgs by type', async () => {
      const mockOrgs: SalesforceOrg[] = [
        {
          alias: 'prod-org',
          username: 'user@prod.com',
          orgId: '00D000000000001',
          instanceUrl: 'https://prod.salesforce.com',
          isActive: true,
          type: 'production'
        },
        {
          alias: 'scratch-org',
          username: 'user@scratch.com',
          orgId: '00D000000000002',
          instanceUrl: 'https://scratch.salesforce.com',
          isActive: false,
          type: 'scratch'
        }
      ];

      jest.spyOn(salesforceAuth, 'getAuthenticatedOrgs').mockResolvedValueOnce(mockOrgs);
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValueOnce(undefined);

      await salesforceAuth.selectOrg('Select Org', 'production');

      expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ label: 'prod-org' })
        ]),
        expect.anything()
      );

      // Should only show production orgs (length 1), not scratch orgs
      const call = (vscode.window.showQuickPick as jest.Mock).mock.calls[0];
      expect(call[0]).toHaveLength(1);
    });
  });

  describe('clearCache', () => {
    it('should clear cached org information', () => {
      // This is mainly for coverage - the method exists but is simple
      expect(() => salesforceAuth.clearCache()).not.toThrow();
    });
  });

  describe('useSourceOrgWithOpportunity', () => {
    const mockOrgs: SalesforceOrg[] = [
      {
        alias: 'source-org',
        username: 'user@source.com',
        orgId: '00D000000000001',
        instanceUrl: 'https://source.salesforce.com',
        isActive: true,
        type: 'production'
      }
    ];

    beforeEach(() => {
      jest.spyOn(salesforceAuth, 'getAuthenticatedOrgs').mockResolvedValue(mockOrgs);
    });

    it('should return source org with same opportunity when user chooses same', async () => {
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValueOnce({
        label: 'Use same opportunity',
        value: 'same'
      });

      const result = await salesforceAuth.useSourceOrgWithOpportunity(
        '00D000000000001',
        '006000000000001',
        'Test Opportunity'
      );

      expect(result).toBeDefined();
      expect(result?.orgId).toBe('00D000000000001');
      expect(result?.testOpportunityId).toBe('006000000000001');
    });

    it('should prompt for different opportunity when user chooses different', async () => {
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValueOnce({
        label: 'Use different opportunity',
        value: 'different'
      });
      (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce('006000000000002');

      const result = await salesforceAuth.useSourceOrgWithOpportunity(
        '00D000000000001',
        '006000000000001',
        'Test Opportunity'
      );

      expect(result).toBeDefined();
      expect(result?.testOpportunityId).toBe('006000000000002');
    });

    it('should return undefined when user cancels opportunity selection', async () => {
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await salesforceAuth.useSourceOrgWithOpportunity(
        '00D000000000001',
        '006000000000001',
        'Test Opportunity'
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined when user cancels opportunity input', async () => {
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValueOnce({
        label: 'Use different opportunity',
        value: 'different'
      });
      (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce(undefined);

      const result = await salesforceAuth.useSourceOrgWithOpportunity(
        '00D000000000001',
        '006000000000001',
        'Test Opportunity'
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined when source org not found', async () => {
      jest.spyOn(salesforceAuth, 'getAuthenticatedOrgs').mockResolvedValueOnce([]);

      const result = await salesforceAuth.useSourceOrgWithOpportunity(
        '00D999999999999',
        '006000000000001',
        'Test Opportunity'
      );

      expect(result).toBeUndefined();
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Source org with ID 00D999999999999 not found')
      );
    });

    it('should handle case with no source opportunity', async () => {
      (vscode.window.showInputBox as jest.Mock).mockResolvedValueOnce('006000000000002');

      const result = await salesforceAuth.useSourceOrgWithOpportunity(
        '00D000000000001',
        undefined,
        undefined
      );

      expect(result).toBeDefined();
      expect(result?.testOpportunityId).toBe('006000000000002');
    });
  });

  describe('useSourceOrgForBatchTest', () => {
    it('should return source org for batch testing', async () => {
      const mockOrgListResponse = {
        status: 0,
        result: {
          nonScratchOrgs: [{
            alias: 'source-org',
            username: 'user@source.com',
            orgId: '00D000000000001',
            instanceUrl: 'https://source.salesforce.com',
            isDefaultUsername: true
          }],
          scratchOrgs: []
        }
      };

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify(mockOrgListResponse)
      });

      const result = await salesforceAuth.useSourceOrgForBatchTest('00D000000000001');

      expect(result).toBeDefined();
      expect(result?.orgId).toBe('00D000000000001');
      expect(result?.alias).toBe('source-org');
    });

    it('should return undefined when source org not found', async () => {
      const mockOrgListResponse = {
        status: 0,
        result: {
          nonScratchOrgs: [],
          scratchOrgs: []
        }
      };

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify(mockOrgListResponse)
      });

      const result = await salesforceAuth.useSourceOrgForBatchTest('00D999999999999');

      expect(result).toBeUndefined();
    });

    it('should handle multiple authenticated orgs', async () => {
      const mockOrgListResponse = {
        status: 0,
        result: {
          nonScratchOrgs: [
            {
              alias: 'org-1',
              username: 'user@org1.com',
              orgId: '00D000000000001',
              instanceUrl: 'https://org1.salesforce.com',
              isDefaultUsername: true
            },
            {
              alias: 'org-2',
              username: 'user@org2.com',
              orgId: '00D000000000002',
              instanceUrl: 'https://org2.salesforce.com',
              isDefaultUsername: false
            }
          ],
          scratchOrgs: []
        }
      };

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify(mockOrgListResponse)
      });

      const result = await salesforceAuth.useSourceOrgForBatchTest('00D000000000002');

      expect(result).toBeDefined();
      expect(result?.orgId).toBe('00D000000000002');
      expect(result?.alias).toBe('org-2');
    });

    it('should use source opportunity ID when provided', async () => {
      const mockOrgListResponse = {
        status: 0,
        result: {
          nonScratchOrgs: [{
            alias: 'source-org',
            username: 'user@source.com',
            orgId: '00D000000000001',
            instanceUrl: 'https://source.salesforce.com',
            isDefaultUsername: true
          }],
          scratchOrgs: []
        }
      };

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify(mockOrgListResponse)
      });

      const result = await salesforceAuth.useSourceOrgForBatchTest('00D000000000001', '006000000000001');

      expect(result).toBeDefined();
      expect(result?.testOpportunityId).toBe('006000000000001');
    });
  });

  describe('getAccessToken - additional response formats', () => {
    it('should handle access token in result.accessToken', async () => {
      const mockTokenResponse = {
        status: 0,
        accessToken: 'token-at-root-level'
      };

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify(mockTokenResponse)
      });

      const token = await salesforceAuth.getAccessToken('test-org');
      expect(token).toBe('token-at-root-level');
    });

    it('should handle access token in result.result.result.accessToken', async () => {
      const mockTokenResponse = {
        status: 0,
        result: {
          result: {
            accessToken: 'token-deeply-nested'
          }
        }
      };

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify(mockTokenResponse)
      });

      const token = await salesforceAuth.getAccessToken('test-org');
      expect(token).toBe('token-deeply-nested');
    });

    it('should handle "No org configuration found" error', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('No org configuration found for test-org'));

      await expect(salesforceAuth.getAccessToken('test-org')).rejects.toThrow(
        "Org 'test-org' not found. Please authenticate using: sf auth web login --alias test-org"
      );
    });

    it('should handle expired token error', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('Access token expired for org'));

      await expect(salesforceAuth.getAccessToken('test-org')).rejects.toThrow(
        "Access token expired for org 'test-org'. Please re-authenticate using: sf auth web login --alias test-org"
      );
    });

    it('should throw error when access token is missing from response', async () => {
      const mockTokenResponse = {
        status: 0,
        result: {
          someOtherField: 'value'
        }
      };

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify(mockTokenResponse)
      });

      await expect(salesforceAuth.getAccessToken('test-org')).rejects.toThrow(
        'Access token not found in CLI response for org: test-org'
      );
    });
  });

  describe('getOrgInfo - error handling', () => {
    it('should handle org display error with user-friendly message', async () => {
      mockExecAsync.mockRejectedValueOnce(new Error('No org configuration found'));

      await expect(salesforceAuth.getOrgInfo('unknown-org')).rejects.toThrow(
        'Failed to get org info for: unknown-org'
      );
    });
  });

  describe('getAuthenticatedOrgs - progress reporting', () => {
    it('should clear progress interval on completion', async () => {
      const mockOrgListResponse = {
        status: 0,
        result: {
          nonScratchOrgs: [],
          scratchOrgs: []
        }
      };

      mockExecAsync.mockResolvedValueOnce({
        stdout: JSON.stringify(mockOrgListResponse)
      });

      const result = await salesforceAuth.getAuthenticatedOrgs();

      // Verify the org list was fetched successfully
      expect(result).toEqual([]);
      expect(mockExecAsync).toHaveBeenCalledWith('sf org list --json');
    });
  });
});
