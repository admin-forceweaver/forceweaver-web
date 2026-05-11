import * as vscode from 'vscode';
import * as licenseService from '../../services/licenseService';
import * as fs from 'fs';
import * as path from 'path';
import { ReportView } from '../../ui/reportView';
import { TestResult } from '../../test/runner';
import { Comparator } from '../../test/comparator';
import { ApiUtilityService } from '../../services/apiUtilityService';

// Mock dependencies
jest.mock('vscode', () => ({
    window: {
        showInformationMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        createWebviewPanel: jest.fn(() => ({
            webview: {
                html: '',
                options: {},
                onDidReceiveMessage: jest.fn((callback) => ({
                    dispose: jest.fn()
                })),
                postMessage: jest.fn()
            },
            title: '',
            reveal: jest.fn(),
            onDidDispose: jest.fn((callback) => {
                callback();
                return { dispose: jest.fn() };
            }),
            dispose: jest.fn()
        })),
        showTextDocument: jest.fn(),
        openTextDocument: jest.fn()
    },
    workspace: {
        workspaceFolders: [{
            uri: { fsPath: '/test/workspace' }
        }],
        openTextDocument: jest.fn(),
        showTextDocument: jest.fn()
    },
    ViewColumn: {
        One: 1
    },
    Uri: {
        file: jest.fn((path: string) => ({ fsPath: path, scheme: 'file', path }))
    },
    env: {
        openExternal: jest.fn()
    },
    commands: {
        executeCommand: jest.fn()
    }
}));

jest.mock('../../services/licenseService');
jest.mock('../../services/apiUtilityService');
jest.mock('../../test/comparator');
jest.mock('fs');
jest.mock('path');

describe('ReportView - License Gating', () => {
    describe('License Service Integration', () => {
        
        beforeEach(() => {
            // Clear all mocks before each test
            jest.clearAllMocks();
        });

        it('should verify license service is properly imported and can be mocked', async () => {
            // Test basic license service functionality
            const mockLicenseState = {
                isPro: true,
                tier: 'pro' as const,
                statusMessage: 'Welcome to the Rev Cloud Blueprint Public Beta! All features are enabled.'
            };
            
            jest.spyOn(licenseService, 'getLicenseState').mockResolvedValue(mockLicenseState);
            
            const result = await licenseService.getLicenseState();
            
            expect(result.isPro).toBe(true);
            expect(result.statusMessage).toContain('Public Beta');
            expect(licenseService.getLicenseState).toHaveBeenCalledTimes(1);
        });

        it('should verify license service returns correct structure for non-Pro state', async () => {
            const mockLicenseState = {
                isPro: false,
                tier: 'free' as const,
                statusMessage: 'Your free beta period has ended. Please purchase a license to continue using Pro features.'
            };
            
            jest.spyOn(licenseService, 'getLicenseState').mockResolvedValue(mockLicenseState);
            
            const result = await licenseService.getLicenseState();
            
            expect(result.isPro).toBe(false);
            expect(result.statusMessage).toContain('free beta period has ended');
            expect(licenseService.getLicenseState).toHaveBeenCalledTimes(1);
        });
    });

    describe('Compact Batch Report', () => {
        let reportView: ReportView;
        let mockPanel: any;

        beforeEach(() => {
            jest.clearAllMocks();
            reportView = new ReportView({} as any);
            mockPanel = {
                webview: { html: '' },
                title: '',
                reveal: jest.fn(),
                onDidDispose: jest.fn(),
                dispose: jest.fn()
            };
        });

        it('should generate compact batch report with expandable rows and line item details', () => {
            const mockBatchResults = {
                batchName: 'Test Group',
                results: [
                    {
                        snapshotName: 'Test Snapshot 1',
                        result: {
                            success: true,
                            executionTime: 2500,
                            snapshot: {
                                expectedResults: {
                                    quoteFields: { GrandTotal: 1000.00 }
                                }
                            },
                            actualQuoteData: { GrandTotal: 1000.00 },
                            comparison: {
                                summary: {
                                    matchingLineItems: 5,
                                    totalLineItems: 5
                                },
                                quote: {
                                    fieldComparisons: [
                                        {
                                            fieldName: 'GrandTotal',
                                            expected: 1000.00,
                                            actual: 1000.00,
                                            match: true
                                        }
                                    ]
                                },
                                lineItems: [
                                    {
                                        externalId: 'PROD-001',
                                        productName: 'Test Product 1',
                                        fieldComparisons: [
                                            {
                                                fieldName: 'NetUnitPrice',
                                                expected: 100.00,
                                                actual: 100.00,
                                                match: true
                                            },
                                            {
                                                fieldName: 'NetTotalPrice',
                                                expected: 500.00,
                                                actual: 500.00,
                                                match: true
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    },
                    {
                        snapshotName: 'Test Snapshot 2',
                        result: {
                            success: false,
                            executionTime: 1800,
                            snapshot: {
                                expectedResults: {
                                    quoteFields: { GrandTotal: 2000.00 }
                                }
                            },
                            actualQuoteData: { GrandTotal: 2100.00 },
                            comparison: {
                                summary: {
                                    matchingLineItems: 3,
                                    totalLineItems: 5
                                },
                                quote: {
                                    fieldComparisons: [
                                        {
                                            fieldName: 'GrandTotal',
                                            expected: 2000.00,
                                            actual: 2100.00,
                                            match: false,
                                            variance: 100.00
                                        }
                                    ]
                                },
                                lineItems: [
                                    {
                                        externalId: 'PROD-002',
                                        productName: 'Test Product 2',
                                        fieldComparisons: [
                                            {
                                                fieldName: 'NetUnitPrice',
                                                expected: 200.00,
                                                actual: 210.00,
                                                match: false,
                                                variance: 10.00
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                ],
                summary: {
                    total: 2,
                    passed: 1,
                    failed: 1
                }
            };

            // Mock the getOrCreatePanel method
            jest.spyOn(reportView as any, 'getOrCreatePanel').mockReturnValue(mockPanel);

            // Call the method
            reportView.showBatchTestResults(mockBatchResults);

            // Verify the panel was created with correct title
            expect(reportView['getOrCreatePanel']).toHaveBeenCalledWith('Batch Test Results: Test Group');

            // Verify HTML content was generated
            expect(mockPanel.webview.html).toContain('📊 Batch Test Results: Test Group');
            expect(mockPanel.webview.html).toContain('✅');
            expect(mockPanel.webview.html).toContain('❌');
            expect(mockPanel.webview.html).toContain('Test Snapshot 1');
            expect(mockPanel.webview.html).toContain('Test Snapshot 2');
            expect(mockPanel.webview.html).toContain('$1000.00');
            expect(mockPanel.webview.html).toContain('$2000.00');
            expect(mockPanel.webview.html).toContain('$2100.00');
            expect(mockPanel.webview.html).toContain('5/5');
            expect(mockPanel.webview.html).toContain('3/5');
            
            // Verify expandable functionality
            expect(mockPanel.webview.html).toContain('toggleDetails');
            expect(mockPanel.webview.html).toContain('toggleAllDetails');
            expect(mockPanel.webview.html).toContain('saveReport');
            expect(mockPanel.webview.html).toContain('exportToPDF');
            
            // Verify line item details
            expect(mockPanel.webview.html).toContain('Line Item Details');
            expect(mockPanel.webview.html).toContain('Quote Fields');
            expect(mockPanel.webview.html).toContain('NetUnitPrice');
            expect(mockPanel.webview.html).toContain('NetTotalPrice');
            
            // Verify quote fields are included
            expect(mockPanel.webview.html).toContain('GrandTotal');
            expect(mockPanel.webview.html).toContain('1000.00');
            expect(mockPanel.webview.html).toContain('2000.00');
            expect(mockPanel.webview.html).toContain('2100.00');
        });

        it('should handle missing data gracefully', () => {
            const mockBatchResults = {
                batchName: 'Empty Test Group',
                results: [],
                summary: {
                    total: 0,
                    passed: 0,
                    failed: 0
                }
            };

            jest.spyOn(reportView as any, 'getOrCreatePanel').mockReturnValue(mockPanel);

            reportView.showBatchTestResults(mockBatchResults);

            expect(mockPanel.webview.html).toContain('📊 Batch Test Results: Empty Test Group');
            expect(mockPanel.webview.html).toContain('0');
            expect(mockPanel.webview.html).toContain('0%');
        });
    });

    describe('showTestResult', () => {
        let reportView: ReportView;
        let mockPanel: any;
        let mockContext: any;
        let mockComparator: any;

        beforeEach(() => {
            jest.clearAllMocks();
            mockContext = {
                extensionPath: '/test/extension',
                extensionUri: { fsPath: '/test/extension' },
                subscriptions: []
            };
            mockPanel = {
                webview: {
                    html: '',
                    options: {},
                    onDidReceiveMessage: jest.fn((callback) => {
                        return { dispose: jest.fn() };
                    })
                },
                title: '',
                reveal: jest.fn(),
                onDidDispose: jest.fn((callback) => {
                    return { dispose: jest.fn() };
                }),
                dispose: jest.fn()
            };

            mockComparator = {
                generateEnhancedReport: jest.fn().mockReturnValue('<html>Enhanced Report</html>')
            };

            reportView = new ReportView(mockContext);
            (reportView as any).comparator = mockComparator;
        });

        it('should show test result with comparison data (success case)', async () => {
            const mockTestResult: TestResult = {
                success: true,
                comparison: {
                    overallMatch: true,
                    quote: { overallMatch: true, fieldComparisons: [] },
                    lineItems: [],
                    summary: {
                        totalFields: 10,
                        matchingFields: 10,
                        successRate: 100,
                        totalLineItems: 5,
                        matchingLineItems: 5
                    }
                },
                actualQuoteData: {
                    Id: 'Q001',
                    Name: 'Test Quote',
                    GrandTotal: 1000,
                    QuoteLines: []
                },
                snapshot: {
                    metadata: {
                        description: 'Test Snapshot',
                        sourceQuoteId: 'Q001',
                        sourceOrgAlias: 'source-org',
                        sourceOrgUsername: 'user@example.com'
                    },
                    expectedResults: {
                        quoteFields: { GrandTotal: 1000 }
                    },
                    recreationPayload: {
                        lineItems: []
                    }
                },
                targetOrg: {
                    alias: 'target-org',
                    username: 'target@example.com'
                },
                executionTime: 2500,
                errors: [],
                createdQuoteId: 'Q002'
            } as any;

            jest.spyOn(reportView as any, 'getOrCreatePanel').mockReturnValue(mockPanel);

            await reportView.showTestResult(mockTestResult);

            expect(mockComparator.generateEnhancedReport).toHaveBeenCalledWith(
                mockTestResult.comparison,
                mockTestResult.snapshot,
                mockTestResult.actualQuoteData,
                mockTestResult
            );
            expect(mockPanel.webview.html).toBe('<html>Enhanced Report</html>');
            // Note: reveal is called via setTimeout, not directly testable in sync tests
        });

        it('should show test result with comparison data (failure case)', async () => {
            const mockTestResult: TestResult = {
                success: false,
                comparison: {
                    overallMatch: false,
                    quote: { overallMatch: false, fieldComparisons: [] },
                    lineItems: [],
                    summary: {
                        totalFields: 10,
                        matchingFields: 7,
                        successRate: 70,
                        totalLineItems: 5,
                        matchingLineItems: 4
                    }
                },
                actualQuoteData: {
                    Id: 'Q001',
                    Name: 'Test Quote',
                    GrandTotal: 1100,
                    QuoteLines: []
                },
                snapshot: {
                    metadata: {
                        description: 'Test Snapshot',
                        sourceQuoteId: 'Q001',
                        sourceOrgAlias: 'source-org',
                        sourceOrgUsername: 'user@example.com'
                    },
                    expectedResults: {
                        quoteFields: { GrandTotal: 1000 }
                    },
                    recreationPayload: {
                        lineItems: []
                    }
                },
                targetOrg: {
                    alias: 'target-org',
                    username: 'target@example.com'
                },
                executionTime: 2500,
                errors: ['Pricing mismatch detected'],
                createdQuoteId: 'Q002'
            } as any;

            jest.spyOn(reportView as any, 'getOrCreatePanel').mockReturnValue(mockPanel);

            await reportView.showTestResult(mockTestResult);

            expect(mockComparator.generateEnhancedReport).toHaveBeenCalled();
            expect(mockPanel.webview.html).toBe('<html>Enhanced Report</html>');
        });

        it('should show error report when comparison data is missing', async () => {
            const mockTestResult: TestResult = {
                success: false,
                comparison: null,
                actualQuoteData: null,
                snapshot: {
                    metadata: {
                        description: 'Test Snapshot',
                        sourceQuoteId: 'Q001',
                        sourceOrgAlias: 'source-org',
                        sourceOrgUsername: 'user@example.com'
                    },
                    expectedResults: {
                        quoteFields: { GrandTotal: 1000 }
                    },
                    recreationPayload: {
                        lineItems: [{ externalId: 'PROD-001' }]
                    }
                },
                targetOrg: {
                    alias: 'target-org',
                    username: 'target@example.com'
                },
                executionTime: 1500,
                errors: ['Failed to create quote', 'Authentication error'],
                createdQuoteId: null
            } as any;

            jest.spyOn(reportView as any, 'getOrCreatePanel').mockReturnValue(mockPanel);

            await reportView.showTestResult(mockTestResult);

            expect(mockPanel.webview.html).toContain('TEST FAILED');
            expect(mockPanel.webview.html).toContain('Test Snapshot');
            expect(mockPanel.webview.html).toContain('Failed to create quote');
            expect(mockPanel.webview.html).toContain('Authentication error');
            // Note: reveal is called via setTimeout
        });

        it('should handle report generation error gracefully', async () => {
            const mockTestResult: TestResult = {
                success: true,
                comparison: {
                    overallMatch: true,
                    quote: { overallMatch: true, fieldComparisons: [] },
                    lineItems: [],
                    summary: {
                        totalFields: 10,
                        matchingFields: 10,
                        successRate: 100,
                        totalLineItems: 5,
                        matchingLineItems: 5
                    }
                },
                actualQuoteData: {
                    Id: 'Q001',
                    Name: 'Test Quote',
                    GrandTotal: 1000,
                    QuoteLines: []
                },
                snapshot: {
                    metadata: {
                        description: 'Test Snapshot',
                        sourceQuoteId: 'Q001',
                        sourceOrgAlias: 'source-org',
                        sourceOrgUsername: 'user@example.com'
                    },
                    expectedResults: {
                        quoteFields: { GrandTotal: 1000 }
                    },
                    recreationPayload: {
                        lineItems: []
                    }
                },
                targetOrg: {
                    alias: 'target-org',
                    username: 'target@example.com'
                },
                executionTime: 2500,
                errors: []
            } as any;

            mockComparator.generateEnhancedReport.mockImplementation(() => {
                throw new Error('Report generation failed');
            });

            jest.spyOn(reportView as any, 'getOrCreatePanel').mockReturnValue(mockPanel);

            await reportView.showTestResult(mockTestResult);

            expect(mockPanel.webview.html).toContain('TEST FAILED');
            expect(mockPanel.webview.html).toContain('Report generation failed');
        });

        it('should handle detailed errors in test result', async () => {
            const mockTestResult: TestResult = {
                success: false,
                comparison: null,
                actualQuoteData: null,
                snapshot: {
                    metadata: {
                        description: 'Test Snapshot',
                        sourceQuoteId: 'Q001',
                        sourceOrgAlias: 'source-org',
                        sourceOrgUsername: 'user@example.com'
                    },
                    expectedResults: {
                        quoteFields: { GrandTotal: 1000 }
                    },
                    recreationPayload: {
                        lineItems: []
                    }
                },
                targetOrg: {
                    alias: 'target-org',
                    username: 'target@example.com'
                },
                executionTime: 1500,
                errors: ['System error occurred'],
                detailedErrors: [
                    {
                        category: 'authentication',
                        errorCode: 'AUTH_001',
                        message: 'Invalid session',
                        userFriendlyMessage: 'Your session has expired. Please re-authenticate.',
                        troubleshootingSteps: ['Re-authenticate with Salesforce CLI'],
                        referenceId: 'REF-12345'
                    },
                    {
                        category: 'validation',
                        errorCode: 'VAL_002',
                        message: 'Product not found',
                        userFriendlyMessage: 'Required products are missing in target org.',
                        troubleshootingSteps: ['Verify products exist in target org']
                    }
                ]
            } as any;

            jest.spyOn(reportView as any, 'getOrCreatePanel').mockReturnValue(mockPanel);

            await reportView.showTestResult(mockTestResult);

            expect(mockPanel.webview.html).toContain('Authentication');
            expect(mockPanel.webview.html).toContain('AUTH_001');
            expect(mockPanel.webview.html).toContain('session has expired');
            expect(mockPanel.webview.html).toContain('VAL_002');
            expect(mockPanel.webview.html).toContain('Re-authenticate with Salesforce CLI');
        });
    });

    describe('showWelcome', () => {
        let reportView: ReportView;
        let mockPanel: any;

        beforeEach(() => {
            jest.clearAllMocks();
            mockPanel = {
                webview: {
                    html: '',
                    options: {}
                },
                title: '',
                reveal: jest.fn(),
                onDidDispose: jest.fn((callback) => {
                    return { dispose: jest.fn() };
                }),
                dispose: jest.fn()
            };

            reportView = new ReportView({
                extensionPath: '/test/extension',
                extensionUri: { fsPath: '/test/extension' },
                subscriptions: []
            } as any);
        });

        it('should show welcome page with getting started content', () => {
            jest.spyOn(reportView as any, 'getOrCreatePanel').mockReturnValue(mockPanel);

            reportView.showWelcome();

            expect(reportView['getOrCreatePanel']).toHaveBeenCalledWith('Pricing Test Framework - Getting Started');
            expect(mockPanel.webview.html).toContain('Revenue Cloud Pricing Test Framework');
            expect(mockPanel.webview.html).toContain('Getting Started');
            expect(mockPanel.webview.html).toContain('Prerequisites Check');
            expect(mockPanel.webview.html).toContain('Create Your First Snapshot');
            expect(mockPanel.webview.html).toContain('Run Your First Test');
            expect(mockPanel.webview.html).toContain('Key Features');
            expect(mockPanel.webview.html).toContain('Pricing Snapshots');
            expect(mockPanel.webview.html).toContain('Cross-Org Testing');
        });
    });

    describe('generateBatchReport', () => {
        let reportView: ReportView;
        let mockPanel: any;

        beforeEach(() => {
            jest.clearAllMocks();
            mockPanel = {
                webview: {
                    html: '',
                    options: {},
                    onDidReceiveMessage: jest.fn()
                },
                title: '',
                reveal: jest.fn(),
                onDidDispose: jest.fn((callback) => {
                    return { dispose: jest.fn() };
                }),
                dispose: jest.fn()
            };

            reportView = new ReportView({
                extensionPath: '/test/extension',
                extensionUri: { fsPath: '/test/extension' },
                subscriptions: []
            } as any);
        });

        it('should generate batch report for legacy format', async () => {
            const testResults: TestResult[] = [
                {
                    success: true,
                    snapshot: {
                        metadata: {
                            description: 'Test 1',
                            sourceQuoteId: 'Q001',
                            sourceOrgAlias: 'source-org'
                        },
                        expectedResults: {
                            quoteFields: { GrandTotal: 1000 }
                        }
                    },
                    actualQuoteData: { GrandTotal: 1000 },
                    comparison: {
                        summary: { successRate: 100 }
                    },
                    executionTime: 2000,
                    errors: []
                },
                {
                    success: false,
                    snapshot: {
                        metadata: {
                            description: 'Test 2',
                            sourceQuoteId: 'Q002',
                            sourceOrgUsername: 'user@example.com'
                        },
                        expectedResults: {
                            quoteFields: { GrandTotal: 2000 }
                        }
                    },
                    actualQuoteData: { GrandTotal: 2100 },
                    comparison: {
                        summary: { successRate: 85 }
                    },
                    executionTime: 3000,
                    errors: ['Pricing mismatch']
                }
            ] as any[];

            jest.spyOn(reportView as any, 'getOrCreatePanel').mockReturnValue(mockPanel);

            await reportView.showBatchTestResults(testResults);

            // Legacy format uses generateBatchReport which shows partial success
            expect(mockPanel.webview.html).toContain('PARTIAL SUCCESS');
            expect(mockPanel.webview.html).toContain('Batch Test Summary');
            expect(mockPanel.webview.html).toContain('Test 1');
            expect(mockPanel.webview.html).toContain('Test 2');
            expect(mockPanel.webview.html).toContain('$1000.00');
            expect(mockPanel.webview.html).toContain('$2000.00');
            expect(mockPanel.webview.html).toContain('$2100.00');
        });
    });

    describe('Panel Management', () => {
        let reportView: ReportView;
        let mockContext: any;

        beforeEach(() => {
            jest.clearAllMocks();
            mockContext = {
                extensionPath: '/test/extension',
                extensionUri: { fsPath: '/test/extension' },
                subscriptions: []
            };
            reportView = new ReportView(mockContext);
        });

        it('should create new panel when none exists', () => {
            // Reset mock to avoid interference from previous tests
            (vscode.window.createWebviewPanel as jest.Mock).mockClear();
            (vscode.window.createWebviewPanel as jest.Mock).mockImplementation(() => ({
                webview: {
                    html: '',
                    options: {},
                    onDidReceiveMessage: jest.fn((callback) => ({
                        dispose: jest.fn()
                    }))
                },
                title: '',
                reveal: jest.fn(),
                onDidDispose: jest.fn((callback) => ({
                    dispose: jest.fn()
                })),
                dispose: jest.fn()
            }));

            const panel = (reportView as any).getOrCreatePanel('Test Title');

            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
                'pricingTestReport',
                'Test Title',
                vscode.ViewColumn.One,
                expect.objectContaining({
                    enableScripts: true,
                    retainContextWhenHidden: true
                })
            );
            expect(panel).toBeDefined();
        });

        it('should reuse existing panel and update title', () => {
            // Setup mock to prevent auto-disposal
            (vscode.window.createWebviewPanel as jest.Mock).mockImplementation(() => ({
                webview: {
                    html: '',
                    options: {},
                    onDidReceiveMessage: jest.fn((callback) => ({
                        dispose: jest.fn()
                    }))
                },
                title: '',
                reveal: jest.fn(),
                onDidDispose: jest.fn((callback) => ({
                    dispose: jest.fn()
                })),
                dispose: jest.fn()
            }));

            const panel1 = (reportView as any).getOrCreatePanel('First Title');
            const panel2 = (reportView as any).getOrCreatePanel('Second Title');

            expect(panel2).toBe(panel1);
            expect(panel2.title).toBe('Second Title');
            expect(panel2.reveal).toHaveBeenCalled();
        });

        it('should dispose panel properly', () => {
            (vscode.window.createWebviewPanel as jest.Mock).mockImplementation(() => ({
                webview: {
                    html: '',
                    options: {},
                    onDidReceiveMessage: jest.fn((callback) => ({
                        dispose: jest.fn()
                    }))
                },
                title: '',
                reveal: jest.fn(),
                onDidDispose: jest.fn((callback) => ({
                    dispose: jest.fn()
                })),
                dispose: jest.fn()
            }));

            const panel = (reportView as any).getOrCreatePanel('Test');

            reportView.dispose();

            expect(panel.dispose).toHaveBeenCalled();
        });

        it('should clear panel reference on dispose callback', () => {
            // This test is checking that onDidDispose clears the panel reference
            // We need to setup a mock that doesn't call the callback immediately
            const onDidDisposeCallback = jest.fn();
            (vscode.window.createWebviewPanel as jest.Mock).mockImplementation(() => {
                const mockPanel = {
                    webview: {
                        html: '',
                        options: {},
                        onDidReceiveMessage: jest.fn((callback) => ({
                            dispose: jest.fn()
                        }))
                    },
                    title: '',
                    reveal: jest.fn(),
                    onDidDispose: jest.fn((callback) => {
                        onDidDisposeCallback.mockImplementation(callback);
                        return { dispose: jest.fn() };
                    }),
                    dispose: jest.fn()
                };
                return mockPanel;
            });

            (reportView as any).getOrCreatePanel('Test');

            // Panel should exist
            expect((reportView as any).panel).toBeDefined();

            // Call the dispose callback
            onDidDisposeCallback();

            // Panel should now be undefined
            expect((reportView as any).panel).toBeUndefined();
        });
    });

    describe('Save and Export Functionality', () => {
        let reportView: ReportView;
        let mockContext: any;

        beforeEach(() => {
            jest.clearAllMocks();
            mockContext = {
                extensionPath: '/test/extension',
                extensionUri: { fsPath: '/test/extension' },
                subscriptions: []
            };
            reportView = new ReportView(mockContext);

            (ApiUtilityService.getSnapshotDirectory as jest.Mock).mockReturnValue('revcloud_blueprint/pricing/snapshots');
            (path.dirname as jest.Mock).mockReturnValue('revcloud_blueprint/pricing');
            (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
            (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
        });

        it('should handle save report request', async () => {
            const saveData = {
                type: 'batch',
                content: '<html>Report Content</html>'
            };

            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Open File');
            (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue({});
            (vscode.window.showTextDocument as jest.Mock).mockResolvedValue({});

            await (reportView as any).handleSaveReport(saveData);

            expect(fs.writeFileSync).toHaveBeenCalled();
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('Batch report saved successfully'),
                'Open File',
                'Show in Explorer'
            );
        });

        it('should handle save report with show in explorer action', async () => {
            const saveData = {
                type: 'batch',
                content: '<html>Report Content</html>'
            };

            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Show in Explorer');

            await (reportView as any).handleSaveReport(saveData);

            expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
                'revealFileInOS',
                expect.anything()
            );
        });

        it('should handle save report error when no workspace', async () => {
            (vscode.workspace as any).workspaceFolders = undefined;

            const saveData = {
                type: 'batch',
                content: '<html>Report Content</html>'
            };

            await (reportView as any).handleSaveReport(saveData);

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No workspace folder found');
        });

        it('should handle export to PDF request', async () => {
            // Ensure workspace is available
            (vscode.workspace as any).workspaceFolders = [{
                uri: { fsPath: '/test/workspace' }
            }];

            const exportData = {
                type: 'batch',
                content: '<html>Report Content</html>'
            };

            await (reportView as any).handleExportToPDF(exportData);

            expect(fs.writeFileSync).toHaveBeenCalled();
            expect(vscode.env.openExternal).toHaveBeenCalled();
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                expect.stringContaining('PDF-ready file opened in browser'),
                'OK'
            );
        });

        it('should create results directory if not exists', async () => {
            // Ensure workspace is available
            (vscode.workspace as any).workspaceFolders = [{
                uri: { fsPath: '/test/workspace' }
            }];

            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const saveData = {
                type: 'batch',
                content: '<html>Report Content</html>'
            };

            await (reportView as any).handleSaveReport(saveData);

            expect(fs.mkdirSync).toHaveBeenCalledWith(
                expect.stringContaining('results'),
                { recursive: true }
            );
        });
    });

    describe('Helper Methods', () => {
        let reportView: ReportView;

        beforeEach(() => {
            reportView = new ReportView({
                extensionPath: '/test/extension',
                extensionUri: { fsPath: '/test/extension' },
                subscriptions: []
            } as any);
        });

        it('should format values correctly', () => {
            expect((reportView as any).formatValue(null)).toBe('null');
            expect((reportView as any).formatValue(undefined)).toBe('undefined');
            expect((reportView as any).formatValue(123.456)).toBe('123.46');
            expect((reportView as any).formatValue('test')).toBe('test');
            expect((reportView as any).formatValue(true)).toBe('true');
        });

        it('should get correct category icon', () => {
            expect((reportView as any).getCategoryIcon('authentication')).toBe('🔐');
            expect((reportView as any).getCategoryIcon('permissions')).toBe('🚫');
            expect((reportView as any).getCategoryIcon('validation')).toBe('⚠️');
            expect((reportView as any).getCategoryIcon('configuration')).toBe('⚙️');
            expect((reportView as any).getCategoryIcon('data')).toBe('📊');
            expect((reportView as any).getCategoryIcon('system')).toBe('🔧');
            expect((reportView as any).getCategoryIcon('unknown')).toBe('❓');
        });

        it('should get correct category display name', () => {
            expect((reportView as any).getCategoryDisplayName('authentication')).toBe('Authentication');
            expect((reportView as any).getCategoryDisplayName('permissions')).toBe('Permissions');
            expect((reportView as any).getCategoryDisplayName('validation')).toBe('Data Validation');
            expect((reportView as any).getCategoryDisplayName('configuration')).toBe('Configuration');
            expect((reportView as any).getCategoryDisplayName('data')).toBe('Data');
            expect((reportView as any).getCategoryDisplayName('system')).toBe('System');
            expect((reportView as any).getCategoryDisplayName('unknown')).toBe('Unknown');
        });
    });

    describe('exportReportToPDF - License Check', () => {
        let reportView: ReportView;
        let mockContext: any;

        beforeEach(() => {
            jest.clearAllMocks();
            mockContext = {
                extensionPath: '/test/extension',
                extensionUri: { fsPath: '/test/extension' },
                subscriptions: []
            };
            reportView = new ReportView(mockContext);

            (ApiUtilityService.getSnapshotDirectory as jest.Mock).mockReturnValue('revcloud_blueprint/pricing/snapshots');
            (path.dirname as jest.Mock).mockReturnValue('revcloud_blueprint/pricing');
            (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
        });

        it('should block PDF export when license is not Pro', async () => {
            const mockLicenseState = {
                isPro: false,
                tier: 'free' as const,
                statusMessage: 'Please upgrade to Pro for PDF export'
            };
            jest.spyOn(licenseService, 'getLicenseState').mockResolvedValue(mockLicenseState);

            const htmlContent = '<html>Test Content</html>';
            const testResult = {
                targetOrg: { alias: 'test-org' },
                createdQuoteId: 'Q001',
                snapshot: { metadata: { description: 'test' } }
            } as any;

            await (reportView as any).exportReportToPDF(htmlContent, testResult);

            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
                'Please upgrade to Pro for PDF export PDF Export is a Pro feature.',
                'Activate License',
                'Learn More'
            );
            expect(fs.writeFileSync).not.toHaveBeenCalled();
        });

        it('should allow PDF export when license is Pro', async () => {
            // Ensure workspace is available
            (vscode.workspace as any).workspaceFolders = [{
                uri: { fsPath: '/test/workspace' }
            }];

            const mockLicenseState = {
                isPro: true,
                tier: 'pro' as const,
                statusMessage: 'Pro features enabled'
            };
            jest.spyOn(licenseService, 'getLicenseState').mockResolvedValue(mockLicenseState);

            const htmlContent = '<html>Test Content</html>';
            const testResult = {
                targetOrg: { alias: 'test-org' },
                createdQuoteId: 'Q001',
                snapshot: { metadata: { description: 'test' } }
            } as any;

            await (reportView as any).exportReportToPDF(htmlContent, testResult);

            expect(fs.writeFileSync).toHaveBeenCalled();
            expect(vscode.env.openExternal).toHaveBeenCalled();
        });
    });

    describe('generateLineItemDetails', () => {
        let reportView: ReportView;

        beforeEach(() => {
            reportView = new ReportView({
                extensionPath: '/test/extension',
                extensionUri: { fsPath: '/test/extension' },
                subscriptions: []
            } as any);
        });

        it('should generate line item details with quote fields', () => {
            const result = {
                comparison: {
                    quote: {
                        fieldComparisons: [
                            {
                                fieldName: 'GrandTotal',
                                expected: 1000,
                                actual: 1000,
                                match: true
                            }
                        ]
                    },
                    lineItems: [
                        {
                            productName: 'Product A',
                            externalId: 'PROD-A',
                            fieldComparisons: [
                                {
                                    fieldName: 'NetPrice',
                                    expected: 100,
                                    actual: 100,
                                    match: true
                                }
                            ]
                        }
                    ]
                }
            };

            const html = (reportView as any).generateLineItemDetails(result, 0);

            expect(html).toContain('Line Item Details');
            expect(html).toContain('Quote Fields');
            expect(html).toContain('GrandTotal');
            expect(html).toContain('Product A');
            expect(html).toContain('NetPrice');
        });

        it('should handle missing comparison data', () => {
            const result = {
                comparison: null
            };

            const html = (reportView as any).generateLineItemDetails(result, 0);

            expect(html).toContain('No line item details available');
        });

        it('should handle missing line items', () => {
            const result = {
                comparison: {
                    lineItems: []
                }
            };

            const html = (reportView as any).generateLineItemDetails(result, 0);

            expect(html).toContain('No line items found');
        });

        it('should show fallback quote fields when structured comparison missing', () => {
            const result = {
                comparison: {
                    quote: null,
                    lineItems: [
                        {
                            productName: 'Product A',
                            externalId: 'PROD-A',
                            fieldComparisons: []
                        }
                    ]
                },
                snapshot: {
                    expectedResults: {
                        quoteFields: { GrandTotal: 1000 }
                    }
                },
                actualQuoteData: {
                    GrandTotal: 1000
                }
            };

            const html = (reportView as any).generateLineItemDetails(result, 0);

            expect(html).toContain('Quote Fields');
            expect(html).toContain('GrandTotal');
            expect(html).toContain('1000.00');
        });

        it('should handle line items with variance', () => {
            const result = {
                comparison: {
                    quote: {
                        fieldComparisons: [
                            {
                                fieldName: 'GrandTotal',
                                expected: 1000,
                                actual: 1100,
                                match: false,
                                variance: 100,
                                percentageVariance: 10
                            }
                        ]
                    },
                    lineItems: [
                        {
                            productName: 'Product A',
                            externalId: 'PROD-A',
                            fieldComparisons: [
                                {
                                    fieldName: 'NetPrice',
                                    expected: 100,
                                    actual: 110,
                                    match: false,
                                    variance: 10,
                                    percentageVariance: 10
                                }
                            ]
                        }
                    ]
                }
            };

            const html = (reportView as any).generateLineItemDetails(result, 0);

            expect(html).toContain('Line Item Details');
            expect(html).toContain('Mismatch');
            expect(html).toContain('10.00');
        });
    });

    describe('saveReportToFile', () => {
        let reportView: ReportView;

        beforeEach(() => {
            jest.clearAllMocks();
            reportView = new ReportView({
                extensionPath: '/test/extension',
                extensionUri: { fsPath: '/test/extension' },
                subscriptions: []
            } as any);

            (vscode.workspace as any).workspaceFolders = [{
                uri: { fsPath: '/test/workspace' }
            }];
            (ApiUtilityService.getSnapshotDirectory as jest.Mock).mockReturnValue('revcloud_blueprint/pricing/snapshots');
            (path.dirname as jest.Mock).mockReturnValue('revcloud_blueprint/pricing');
            (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
        });

        it('should save report with open file action', async () => {
            const htmlContent = '<html>Test Report</html>';
            const testResult = {
                targetOrg: { alias: 'myorg' },
                createdQuoteId: 'Q001',
                snapshot: { metadata: { description: 'Test Snapshot' } }
            } as any;

            (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Open File');
            (vscode.env.openExternal as jest.Mock).mockResolvedValue(true);

            await (reportView as any).saveReportToFile(htmlContent, testResult);

            expect(fs.writeFileSync).toHaveBeenCalled();
            expect(vscode.env.openExternal).toHaveBeenCalled();
        });

        it('should handle save report error', async () => {
            (vscode.workspace as any).workspaceFolders = undefined;

            const htmlContent = '<html>Test Report</html>';
            const testResult = {} as any;

            await (reportView as any).saveReportToFile(htmlContent, testResult);

            expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No workspace folder found');
        });
    });

    describe('generateBatchTestErrorDisplay', () => {
        let reportView: ReportView;

        beforeEach(() => {
            reportView = new ReportView({
                extensionPath: '/test/extension',
                extensionUri: { fsPath: '/test/extension' },
                subscriptions: []
            } as any);
        });

        it('should display detailed errors', () => {
            const result = {
                detailedErrors: [
                    {
                        category: 'authentication',
                        errorCode: 'AUTH_001',
                        userFriendlyMessage: 'Session expired',
                        referenceId: 'REF-123'
                    }
                ]
            };

            const html = (reportView as any).generateBatchTestErrorDisplay(result);

            expect(html).toContain('Error Details');
            expect(html).toContain('AUTH_001');
            expect(html).toContain('Session expired');
            expect(html).toContain('REF-123');
        });

        it('should fall back to basic errors when no detailed errors', () => {
            const result = {
                errors: ['Basic error message']
            };

            const html = (reportView as any).generateBatchTestErrorDisplay(result);

            expect(html).toContain('Technical Errors');
            expect(html).toContain('Basic error message');
        });
    });

    describe('generateDetailedErrorSection', () => {
        let reportView: ReportView;

        beforeEach(() => {
            reportView = new ReportView({
                extensionPath: '/test/extension',
                extensionUri: { fsPath: '/test/extension' },
                subscriptions: []
            } as any);
        });

        it('should group errors by category', () => {
            const testResult = {
                detailedErrors: [
                    {
                        category: 'authentication',
                        errorCode: 'AUTH_001',
                        message: 'Invalid session',
                        userFriendlyMessage: 'Session expired',
                        referenceId: 'REF-001'
                    },
                    {
                        category: 'validation',
                        errorCode: 'VAL_001',
                        message: 'Invalid data',
                        userFriendlyMessage: 'Data validation failed'
                    }
                ]
            } as any;

            const html = (reportView as any).generateDetailedErrorSection(testResult);

            expect(html).toContain('Authentication Issues');
            expect(html).toContain('Data Validation Issues');
            expect(html).toContain('AUTH_001');
            expect(html).toContain('VAL_001');
        });

        it('should handle errors without category', () => {
            const testResult = {
                detailedErrors: [
                    {
                        errorCode: 'ERR_001',
                        message: 'Generic error',
                        userFriendlyMessage: 'An error occurred'
                    }
                ]
            } as any;

            const html = (reportView as any).generateDetailedErrorSection(testResult);

            expect(html).toContain('System Issues');
            expect(html).toContain('ERR_001');
        });

        it('should use fallback when no detailed errors', () => {
            const testResult = {
                errors: ['Error 1', 'Error 2']
            } as any;

            const html = (reportView as any).generateDetailedErrorSection(testResult);

            expect(html).toContain('Error 1');
            expect(html).toContain('Error 2');
        });
    });

    describe('generateTroubleshootingSection', () => {
        let reportView: ReportView;

        beforeEach(() => {
            reportView = new ReportView({
                extensionPath: '/test/extension',
                extensionUri: { fsPath: '/test/extension' },
                subscriptions: []
            } as any);
        });

        it('should collect troubleshooting steps from detailed errors', () => {
            const testResult = {
                detailedErrors: [
                    {
                        troubleshootingSteps: ['Step 1', 'Step 2']
                    },
                    {
                        troubleshootingSteps: ['Step 3']
                    }
                ]
            } as any;

            const html = (reportView as any).generateTroubleshootingSection(testResult);

            expect(html).toContain('Troubleshooting Steps');
            expect(html).toContain('Step 1');
            expect(html).toContain('Step 2');
            expect(html).toContain('Step 3');
        });

        it('should use generic steps when no specific steps available', () => {
            const testResult = {} as any;

            const html = (reportView as any).generateTroubleshootingSection(testResult);

            expect(html).toContain('Troubleshooting Steps');
            expect(html).toContain('Verify org connection');
            expect(html).toContain('Check products');
        });
    });
});
