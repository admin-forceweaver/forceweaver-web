import { PlaceQuoteService } from '../../services/placeQuoteService';
import { SalesforceAuth } from '../../salesforce/auth';
import { HttpClientFactory } from '../../services/httpClientFactory';
import axios from 'axios';

jest.mock('../../salesforce/auth');
jest.mock('../../services/httpClientFactory');
jest.mock('../../services/validationService');
jest.mock('vscode');
jest.mock('axios');

const mockAuth = new SalesforceAuth() as jest.Mocked<SalesforceAuth>;

describe('PlaceQuoteService', () => {
  let placeQuoteService: PlaceQuoteService;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock HTTP client
    mockClient = {
      post: jest.fn(),
      get: jest.fn()
    };

    (HttpClientFactory.getClient as jest.Mock).mockResolvedValue(mockClient);

    placeQuoteService = new PlaceQuoteService(mockAuth);
  });

  describe('constructor', () => {
    it('should create PlaceQuoteService instance', () => {
      expect(placeQuoteService).toBeInstanceOf(PlaceQuoteService);
    });
  });

  describe('placeQuote', () => {
    const validRequest = {
      records: [
        {
          sobjectType: 'Quote',
          referenceId: 'ref1',
          Name: 'Test Quote',
          AccountId: '001000000000001'
        }
      ]
    };

    beforeEach(() => {
      mockAuth.getOrgInfo = jest.fn().mockResolvedValue({
        username: 'test@example.com',
        instanceUrl: 'https://test.salesforce.com',
        orgId: '00D000000000001'
      } as any);
      mockAuth.getAccessToken = jest.fn().mockResolvedValue('mock-token');
    });

    it('should return error response for request without records', async () => {
      const invalidRequest = {} as any;

      const result = await placeQuoteService.placeQuote('test-org', invalidRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should return error response for request with empty records array', async () => {
      const invalidRequest = { records: [] };

      const result = await placeQuoteService.placeQuote('test-org', invalidRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Request must contain at least one record');
    });

    it('should successfully place quote and extract quote ID', async () => {
      const mockResponse = {
        status: 200,
        data: {
          results: [
            {
              sobjectType: 'Quote',
              id: '0Q0000000000001',
              referenceId: 'ref1'
            }
          ]
        }
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await placeQuoteService.placeQuote('test-org', validRequest);

      expect(result.success).toBe(true);
      expect(result.quoteId).toBe('0Q0000000000001');
      expect(result.apiResponse).toEqual(mockResponse.data);
      expect(mockClient.post).toHaveBeenCalledWith(
        '/connect/rev/sales-transaction/actions/place',
        validRequest
      );
    });

    it('should extract quote ID from fallback location', async () => {
      const mockResponse = {
        status: 200,
        data: {
          id: '0Q0000000000002'
        }
      };

      mockClient.post.mockResolvedValue(mockResponse);

      const result = await placeQuoteService.placeQuote('test-org', validRequest);

      expect(result.success).toBe(true);
      expect(result.quoteId).toBe('0Q0000000000002');
    });

    it('should handle API error responses with message', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            message: 'Invalid quote data'
          }
        },
        message: 'Request failed'
      };

      mockClient.post.mockRejectedValue(mockError);

      const result = await placeQuoteService.placeQuote('test-org', validRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid quote data');
    });

    it('should handle API error responses with field errors', async () => {
      const mockError = {
        response: {
          status: 400,
          data: {
            fieldErrors: {
              'AccountId': [{ message: 'Account not found' }],
              'Name': [{ message: 'Name is required' }]
            }
          }
        },
        message: 'Request failed'
      };

      mockClient.post.mockRejectedValue(mockError);

      const result = await placeQuoteService.placeQuote('test-org', validRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('AccountId: Account not found');
      expect(result.errors).toContain('Name: Name is required');
    });

    it('should handle API error responses with errors array', async () => {
      const mockError = {
        response: {
          status: 500,
          data: {
            errors: [
              { message: 'Internal server error' },
              'Database connection failed'
            ]
          }
        },
        message: 'Request failed'
      };

      mockClient.post.mockRejectedValue(mockError);

      const result = await placeQuoteService.placeQuote('test-org', validRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Internal server error');
      expect(result.errors).toContain('Database connection failed');
    });

    it('should handle errors with fallback message', async () => {
      const mockError = new Error('Network error');

      mockClient.post.mockRejectedValue(mockError);

      const result = await placeQuoteService.placeQuote('test-org', validRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Network error');
    });

    it('should handle non-200 status codes', async () => {
      mockClient.post.mockResolvedValue({
        status: 201,
        data: { id: '0Q0000000000003' }
      });

      const result = await placeQuoteService.placeQuote('test-org', validRequest);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('API call failed with status: 201');
    });

    it('should handle response without quote ID', async () => {
      mockClient.post.mockResolvedValue({
        status: 200,
        data: {
          results: [
            {
              sobjectType: 'Account',
              id: 'ACC123'
            }
          ]
        }
      });

      const result = await placeQuoteService.placeQuote('test-org', validRequest);

      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Could not extract Quote ID');
    });
  });

  describe('validatePlaceQuoteRequest', () => {
    it('should return no errors for valid request', () => {
      const validRequest = {
        records: [
          {
            sobjectType: 'Quote',
            referenceId: 'ref1',
            Name: 'Test Quote'
          }
        ]
      };

      const errors = placeQuoteService.validatePlaceQuoteRequest(validRequest);

      expect(errors).toEqual([]);
    });

    it('should return error for missing records', () => {
      const invalidRequest = {} as any;

      const errors = placeQuoteService.validatePlaceQuoteRequest(invalidRequest);

      expect(errors).toContain('Missing records array');
    });

    it('should return error for non-array records', () => {
      const invalidRequest = { records: 'not an array' } as any;

      const errors = placeQuoteService.validatePlaceQuoteRequest(invalidRequest);

      expect(errors).toContain('Records must be an array');
    });

    it('should return error for empty records array', () => {
      const invalidRequest = { records: [] };

      const errors = placeQuoteService.validatePlaceQuoteRequest(invalidRequest);

      expect(errors).toContain('Records array cannot be empty');
    });

    it('should return error for record missing sobjectType', () => {
      const invalidRequest = {
        records: [
          {
            referenceId: 'ref1',
            Name: 'Test'
          } as any
        ]
      };

      const errors = placeQuoteService.validatePlaceQuoteRequest(invalidRequest);

      expect(errors).toContain('Record 1: Missing sobjectType');
    });

    it('should return error for record missing referenceId', () => {
      const invalidRequest = {
        records: [
          {
            sobjectType: 'Quote',
            Name: 'Test'
          } as any
        ]
      };

      const errors = placeQuoteService.validatePlaceQuoteRequest(invalidRequest);

      expect(errors).toContain('Record 1: Missing referenceId');
    });

    it('should return multiple errors for multiple invalid records', () => {
      const invalidRequest = {
        records: [
          { Name: 'Test 1' } as any,
          { sobjectType: 'Quote' } as any,
          { referenceId: 'ref3' } as any
        ]
      };

      const errors = placeQuoteService.validatePlaceQuoteRequest(invalidRequest);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('Record 1'))).toBe(true);
      expect(errors.some(e => e.includes('Record 2'))).toBe(true);
      expect(errors.some(e => e.includes('Record 3'))).toBe(true);
    });
  });

  describe('buildPlaceQuoteRequest', () => {
    it('should build valid request', () => {
      const records = [
        {
          sobjectType: 'Quote',
          referenceId: 'ref1',
          Name: 'Test Quote'
        }
      ];

      const request = placeQuoteService.buildPlaceQuoteRequest(records);

      expect(request.records).toEqual(records);
    });

    it('should throw error for invalid records', () => {
      const invalidRecords = [
        {
          sobjectType: 'Quote',
          Name: 'Test'
        } as any
      ];

      expect(() => {
        placeQuoteService.buildPlaceQuoteRequest(invalidRecords);
      }).toThrow('Invalid Place Quote request');
    });
  });

  describe('clearClients', () => {
    it('should call HttpClientFactory.clearAllClients', () => {
      (HttpClientFactory.clearAllClients as jest.Mock) = jest.fn();

      placeQuoteService.clearClients();

      expect(HttpClientFactory.clearAllClients).toHaveBeenCalled();
    });
  });
});
