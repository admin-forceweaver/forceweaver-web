import * as vscode from 'vscode';
import { SalesforceAuth, SalesforceOrg } from '../salesforce/auth';

/**
 * Shared test utilities to reduce code duplication across test files
 * Provides common mocks, fixtures, and helper functions
 */
export class TestUtils {
    
    /**
     * Create mock SalesforceAuth instance
     */
    static createMockAuth(): jest.Mocked<SalesforceAuth> {
        const mockAuth = {
            getAccessToken: jest.fn(),
            getOrgInfo: jest.fn(),
            clearCache: jest.fn(),
            getAuthenticatedOrgs: jest.fn(),
            validateOrgConnection: jest.fn(),
            selectOrg: jest.fn(),
            selectOrgWithOpportunity: jest.fn(),
            useSourceOrgWithOpportunity: jest.fn(),
            useSourceOrgForBatchTest: jest.fn()
        } as unknown as jest.Mocked<SalesforceAuth>;

        // Set up default mock implementations
        mockAuth.getAccessToken.mockResolvedValue('mock-access-token');
        mockAuth.getOrgInfo.mockResolvedValue(this.createMockOrgInfo());
        mockAuth.getAuthenticatedOrgs.mockResolvedValue([this.createMockOrgInfo()]);
        mockAuth.validateOrgConnection.mockResolvedValue(true);
        mockAuth.selectOrg.mockResolvedValue(this.createMockOrgInfo());
        mockAuth.selectOrgWithOpportunity.mockResolvedValue(this.createMockOrgInfo());
        mockAuth.useSourceOrgWithOpportunity.mockResolvedValue(this.createMockOrgInfo());
        mockAuth.useSourceOrgForBatchTest.mockResolvedValue(this.createMockOrgInfo());

        return mockAuth;
    }

    /**
     * Create mock SalesforceOrg instance
     */
    static createMockOrgInfo(overrides: Partial<SalesforceOrg> = {}): SalesforceOrg {
        return {
            alias: 'test-org',
            username: 'test@example.com',
            orgId: '00D000000000000EAA',
            instanceUrl: 'https://test.salesforce.com',
            isActive: true,
            type: 'production',
            accessToken: 'mock-access-token',
            ...overrides
        };
    }

    /**
     * Create mock VSCode configuration
     */
    static createMockVSCodeConfig(configValues: Record<string, any> = {}): jest.Mocked<vscode.WorkspaceConfiguration> {
        const mockConfig = {
            get: jest.fn(),
            has: jest.fn(),
            inspect: jest.fn(),
            update: jest.fn()
        } as jest.Mocked<vscode.WorkspaceConfiguration>;

        mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
            return configValues[key] ?? defaultValue;
        });
        
        mockConfig.has.mockImplementation((key: string) => {
            return key in configValues;
        });

        return mockConfig;
    }

    /**
     * Create mock axios instance for HTTP client testing
     */
    static createMockAxiosInstance() {
        const mockAxiosInstance = {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            patch: jest.fn(),
            delete: jest.fn(),
            request: jest.fn(),
            interceptors: {
                request: {
                    use: jest.fn(),
                    eject: jest.fn()
                },
                response: {
                    use: jest.fn(),
                    eject: jest.fn()
                }
            },
            defaults: {
                headers: {}
            }
        };

        // Set up default successful responses
        const defaultResponse = { data: { success: true }, status: 200 };
        mockAxiosInstance.get.mockResolvedValue(defaultResponse);
        mockAxiosInstance.post.mockResolvedValue(defaultResponse);
        mockAxiosInstance.put.mockResolvedValue(defaultResponse);
        mockAxiosInstance.patch.mockResolvedValue(defaultResponse);
        mockAxiosInstance.delete.mockResolvedValue(defaultResponse);

        return mockAxiosInstance;
    }

    /**
     * Create mock SOQL result
     */
    static createMockSoqlResult(records: any[] = [], totalSize?: number) {
        return {
            totalSize: totalSize ?? records.length,
            done: true,
            records: records
        };
    }

    /**
     * Create mock Quote data
     */
    static createMockQuoteData(overrides: Partial<any> = {}) {
        return {
            Id: '0Q0000000000001',
            Name: 'Test Quote',
            Status: 'Draft',
            OpportunityId: '006000000000001',
            AccountId: '001000000000001',
            Pricebook2Id: '01s000000000001',
            CurrencyIsoCode: 'USD',
            TotalPrice: 1000.00,
            LineItemCount: 2,
            ...overrides
        };
    }

    /**
     * Create mock QuoteLine data
     */
    static createMockQuoteLineData(overrides: Partial<any> = {}) {
        return {
            Id: '0QL000000000001',
            QuoteId: '0Q0000000000001',
            Product2Id: '01t000000000001',
            Quantity: 1,
            UnitPrice: 500.00,
            TotalPrice: 500.00,
            ListPrice: 500.00,
            Discount: 0,
            Description: 'Test Product',
            ...overrides
        };
    }

    /**
     * Create mock Opportunity data
     */
    static createMockOpportunityData(overrides: Partial<any> = {}) {
        return {
            Id: '006000000000001',
            Name: 'Test Opportunity',
            AccountId: '001000000000001',
            StageName: 'Prospecting',
            CloseDate: '2024-12-31',
            Amount: 1000.00,
            Probability: 50,
            Type: 'New Customer',
            ...overrides
        };
    }

    /**
     * Create mock snapshot metadata
     */
    static createMockSnapshotMetadata(overrides: Partial<any> = {}) {
        return {
            snapshotVersion: '1.0',
            sourceOrgAlias: 'test-org',
            sourceOrgUsername: 'test@example.com',
            sourceOrgId: '00D000000000000EAA',
            sourceQuoteId: '0Q0000000000001',
            sourceOpportunityId: '006000000000001',
            createdAt: new Date().toISOString(),
            description: 'Test snapshot',
            ...overrides
        };
    }

    /**
     * Create mock pricing snapshot
     */
    static createMockPricingSnapshot(overrides: Partial<any> = {}) {
        return {
            metadata: this.createMockSnapshotMetadata(overrides.metadata),
            expectedResults: {
                quoteFields: this.createMockQuoteData(),
                quoteLineFields: [this.createMockQuoteLineData()],
                opportunityFields: this.createMockOpportunityData()
            },
            recreationPayload: {
                records: [
                    {
                        sobjectType: 'Quote',
                        referenceId: 'refQuote',
                        Name: 'Test Quote'
                    }
                ]
            },
            ...overrides
        };
    }

    /**
     * Setup common VSCode workspace mocks
     */
    static setupWorkspaceMocks() {
        const mockWorkspaceFolder = {
            uri: { fsPath: '/mock/workspace' },
            name: 'test-workspace',
            index: 0
        };

        (vscode.workspace.workspaceFolders as any) = [mockWorkspaceFolder];
        
        const mockGetConfiguration = jest.fn().mockReturnValue(this.createMockVSCodeConfig({
            'revCloudBlueprint.verboseLogging': false,
            'revCloudBlueprint.apiVersion': '61.0'
        }));
        
        (vscode.workspace.getConfiguration as jest.Mock) = mockGetConfiguration;

        return { mockWorkspaceFolder, mockGetConfiguration };
    }

    /**
     * Create mock progress reporter
     */
    static createMockProgress() {
        return {
            report: jest.fn(),
            token: {
                isCancellationRequested: false,
                onCancellationRequested: jest.fn()
            }
        };
    }

    /**
     * Create mock VSCode window methods
     */
    static setupWindowMocks() {
        const mocks = {
            showInformationMessage: jest.fn(),
            showWarningMessage: jest.fn(),
            showErrorMessage: jest.fn(),
            showInputBox: jest.fn(),
            showQuickPick: jest.fn(),
            showOpenDialog: jest.fn(),
            showSaveDialog: jest.fn(),
            withProgress: jest.fn(),
            showTextDocument: jest.fn(),
            createStatusBarItem: jest.fn()
        };

        // Set up default return values
        mocks.showInputBox.mockResolvedValue('test input');
        mocks.showQuickPick.mockResolvedValue('test selection');
        mocks.withProgress.mockImplementation(async (options, task) => {
            return await task(this.createMockProgress());
        });

        Object.assign(vscode.window, mocks);

        return mocks;
    }

    /**
     * Wait for a specified number of milliseconds (useful for async testing)
     */
    static async wait(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Assert that a function throws an error with a specific message
     */
    static async assertThrowsAsync(asyncFn: () => Promise<any>, expectedMessage?: string): Promise<Error> {
        try {
            await asyncFn();
            throw new Error('Expected function to throw an error, but it did not');
        } catch (error: any) {
            if (expectedMessage && !error.message.includes(expectedMessage)) {
                throw new Error(`Expected error message to contain "${expectedMessage}", but got "${error.message}"`);
            }
            return error;
        }
    }

    /**
     * Create a deep clone of an object (useful for test data isolation)
     */
    static deepClone<T>(obj: T): T {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Verify that all mocks have been called as expected
     */
    static verifyMockCalls(mocks: Record<string, jest.Mock>, expectedCalls: Record<string, number>) {
        for (const [mockName, expectedCount] of Object.entries(expectedCalls)) {
            const mock = mocks[mockName];
            if (!mock) {
                throw new Error(`Mock "${mockName}" not found`);
            }
            expect(mock).toHaveBeenCalledTimes(expectedCount);
        }
    }

    /**
     * Reset all mocks in an object
     */
    static resetMocks(mocks: Record<string, jest.Mock>): void {
        Object.values(mocks).forEach(mock => {
            if (mock && typeof mock.mockReset === 'function') {
                mock.mockReset();
            }
        });
    }

    /**
     * Create a mock file system structure for testing
     */
    static createMockFileSystem(): Record<string, string> {
        return {
            '/mock/workspace/.revcloud/settings.json': JSON.stringify({
                pricing: {
                    snapFields: {
                        description: 'Test snap fields',
                        quote: { fields: ['Id', 'Name'] },
                        quoteLineItem: { fields: ['Id', 'Product2Id'] }
                    }
                }
            }),
            '/mock/workspace/snapshots/test-snapshot.json': JSON.stringify(this.createMockPricingSnapshot()),
            '/mock/workspace/package.json': JSON.stringify({
                name: 'test-project',
                version: '1.0.0'
            })
        };
    }

    /**
     * Validate Salesforce ID format
     */
    static isValidSalesforceId(id: string): boolean {
        if (!id || typeof id !== 'string') return false;
        return /^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/.test(id);
    }

    /**
     * Generate a random Salesforce ID for testing
     */
    static generateTestSalesforceId(length: 15 | 18 = 15): string {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Create test data with consistent relationships
     */
    static createRelatedTestData() {
        const accountId = this.generateTestSalesforceId();
        const opportunityId = this.generateTestSalesforceId();
        const quoteId = this.generateTestSalesforceId();
        const productId = this.generateTestSalesforceId();
        const quoteLineId = this.generateTestSalesforceId();

        return {
            account: { Id: accountId, Name: 'Test Account' },
            opportunity: { 
                Id: opportunityId, 
                Name: 'Test Opportunity', 
                AccountId: accountId 
            },
            quote: { 
                Id: quoteId, 
                Name: 'Test Quote', 
                OpportunityId: opportunityId, 
                AccountId: accountId 
            },
            product: { 
                Id: productId, 
                Name: 'Test Product' 
            },
            quoteLine: { 
                Id: quoteLineId, 
                QuoteId: quoteId, 
                Product2Id: productId 
            }
        };
    }
}
