import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { ValidationService } from '../services/validationService';

const execAsync = promisify(exec);

export interface SalesforceOrg {
    alias?: string;
    username: string;
    orgId: string;
    instanceUrl: string;
    accessToken?: string;
    isActive: boolean;
    type: string;
    testOpportunityId?: string; // OpportunityId for test quote creation
}

export class SalesforceAuth {
    private orgs: Map<string, SalesforceOrg> = new Map();

    /**
     * Get list of authenticated Salesforce orgs from CLI
     */
    async getAuthenticatedOrgs(): Promise<SalesforceOrg[]> {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Loading Salesforce orgs...',
            cancellable: false
        }, async (progress) => {
            let progressInterval: NodeJS.Timeout | undefined;
            try {
                console.log('[DEBUG] Fetching authenticated orgs from Salesforce CLI...');
                
                // Use indeterminate progress - keeps bar moving continuously
                let progressValue = 0;
                progressInterval = setInterval(() => {
                    progressValue = (progressValue + 10) % 100;
                    progress.report({ message: 'Executing CLI command...' });
                }, 200);

                const { stdout } = await execAsync('sf org list --json');
                
                progress.report({ message: 'Processing org data...' });
                const result = JSON.parse(stdout);
                
                // sf CLI returns result directly, not wrapped in status/result
                if (result.status && result.status !== 0) {
                    throw new Error(`CLI command failed: ${result.message}`);
                }

                const orgs: SalesforceOrg[] = [];
                
                // Handle both sf CLI formats: direct result or wrapped in result
                const orgData = result.result || result;
                
                // Process both scratch orgs and non-scratch orgs
                if (orgData.nonScratchOrgs) {
                    orgData.nonScratchOrgs.forEach((org: any) => {
                        const sfOrg: SalesforceOrg = {
                            alias: org.alias,
                            username: org.username,
                            orgId: org.orgId,
                            instanceUrl: org.instanceUrl,
                            isActive: org.isDefaultUsername || false,
                            type: 'production'
                        };
                        orgs.push(sfOrg);
                        this.orgs.set(org.username, sfOrg);
                    });
                }

                if (orgData.scratchOrgs) {
                    orgData.scratchOrgs.forEach((org: any) => {
                        const sfOrg: SalesforceOrg = {
                            alias: org.alias,
                            username: org.username,
                            orgId: org.orgId,
                            instanceUrl: org.instanceUrl,
                            isActive: org.isDefaultUsername || false,
                            type: 'scratch'
                        };
                        orgs.push(sfOrg);
                        this.orgs.set(org.username, sfOrg);
                    });
                }

                console.log(`[DEBUG] Found ${orgs.length} authenticated orgs`);
                progress.report({ message: `Found ${orgs.length} orgs` });
                
                return orgs;
            } catch (error) {
                console.error('[ERROR] Error getting authenticated orgs:', error);
                vscode.window.showErrorMessage('Failed to get authenticated orgs. Make sure Salesforce CLI is installed and configured.');
                return [];
            } finally {
                // Ensure interval is always cleared
                if (progressInterval) {
                    clearInterval(progressInterval);
                }
            }
        });
    }

    /**
     * Get access token for a specific org
     */
    async getAccessToken(orgUsernameOrAlias: string): Promise<string> {
        try {
            console.log(`[DEBUG] getAccessToken - Input org identifier: ${orgUsernameOrAlias}`);
            // Sanitize org alias to prevent command injection
            const sanitizedOrg = ValidationService.sanitizeOrgAlias(orgUsernameOrAlias);
            console.log(`[DEBUG] getAccessToken - Sanitized org identifier: ${sanitizedOrg}`);
            const { stdout } = await execAsync(`sf org display --target-org ${sanitizedOrg} --json`);
            const result = JSON.parse(stdout);
            
            console.log(`[DEBUG] CLI response structure:`, Object.keys(result));
            
            // sf CLI returns result directly, not wrapped in status/result
            if (result.status && result.status !== 0) {
                throw new Error(`CLI command failed: ${result.message}`);
            }

            // Handle different SF CLI response formats
            let accessToken: string | undefined;
            
            // Try multiple possible locations for access token
            if (result.accessToken) {
                accessToken = result.accessToken;
                console.log(`[DEBUG] Found access token in result.accessToken`);
            } else if (result.result?.accessToken) {
                accessToken = result.result.accessToken;
                console.log(`[DEBUG] Found access token in result.result.accessToken`);
            } else if (result.result?.result?.accessToken) {
                accessToken = result.result.result.accessToken;
                console.log(`[DEBUG] Found access token in result.result.result.accessToken`);
            }
            
            if (!accessToken) {
                console.error('[ERROR] Access token not found in CLI response:', result);
                throw new Error(`Access token not found in CLI response for org: ${orgUsernameOrAlias}. Please re-authenticate using: sf auth web login --alias ${orgUsernameOrAlias}`);
            }
            
            console.log(`[DEBUG] Successfully retrieved access token for org: ${orgUsernameOrAlias}`);
            return accessToken;
        } catch (error: any) {
            console.error('[ERROR] Error getting access token:', error);
            
            // Provide more specific error messages
            if (error.message.includes('No org configuration found')) {
                throw new Error(`Org '${orgUsernameOrAlias}' not found. Please authenticate using: sf auth web login --alias ${orgUsernameOrAlias}`);
            } else if (error.message.includes('expired')) {
                throw new Error(`Access token expired for org '${orgUsernameOrAlias}'. Please re-authenticate using: sf auth web login --alias ${orgUsernameOrAlias}`);
            }
            
            throw new Error(`Failed to get access token for org: ${orgUsernameOrAlias}. ${error.message}`);
        }
    }

    /**
     * Get org info including instance URL
     */
    async getOrgInfo(orgUsernameOrAlias: string): Promise<SalesforceOrg> {
        console.log(`[DEBUG] getOrgInfo - Input org identifier: ${orgUsernameOrAlias}`);
        // Sanitize org alias to prevent command injection
        const sanitizedOrg = ValidationService.sanitizeOrgAlias(orgUsernameOrAlias);
        console.log(`[DEBUG] getOrgInfo - Sanitized org identifier: ${sanitizedOrg}`);

        // Check if we already have this org cached
        const cachedOrg = this.orgs.get(sanitizedOrg);
        if (cachedOrg) {
            console.log(`[DEBUG] getOrgInfo - Using cached org info for: ${sanitizedOrg}`);
            return cachedOrg;
        }

        // No progress notification here - let the calling function handle UI
        try {
            console.log(`[DEBUG] getOrgInfo - Fetching org info from CLI for: ${sanitizedOrg}`);
            const { stdout } = await execAsync(`sf org display --target-org ${sanitizedOrg} --json`);
            console.log(`[DEBUG] Org info retrieved for: ${sanitizedOrg}`);
            
            const result = JSON.parse(stdout);
                
            // sf CLI returns result directly, not wrapped in status/result
            if (result.status && result.status !== 0) {
                throw new Error(`CLI command failed: ${result.message}`);
            }

            // Handle both sf CLI formats: direct result or wrapped in result
            const orgData = result.result || result;
            
            const orgInfo: SalesforceOrg = {
                alias: orgData.alias,
                username: orgData.username,
                orgId: orgData.id,
                instanceUrl: orgData.instanceUrl,
                accessToken: orgData.accessToken,
                isActive: orgData.isDefaultUsername || false,
                type: orgData.devHubOrgId ? 'scratch' : 'production'
            };

            console.log(`[DEBUG] Successfully retrieved org info for: ${sanitizedOrg}`);

            this.orgs.set(sanitizedOrg, orgInfo);
            return orgInfo;
        } catch (error) {
            console.error('[ERROR] Error getting org info:', error);
            throw new Error(`Failed to get org info for: ${sanitizedOrg}`);
        }
    }

    /**
     * Validate org connection
     */
    async validateOrgConnection(orgUsernameOrAlias: string): Promise<boolean> {
        console.log(`[DEBUG] validateOrgConnection - Input org identifier: ${orgUsernameOrAlias}`);
        // Sanitize org alias to prevent command injection
        const sanitizedOrg = ValidationService.sanitizeOrgAlias(orgUsernameOrAlias);
        console.log(`[DEBUG] validateOrgConnection - Sanitized org identifier: ${sanitizedOrg}`);

        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Validating connection to ${sanitizedOrg}...`,
            cancellable: false
        }, async (progress) => {
            let progressInterval: NodeJS.Timeout | undefined;
            try {
                console.log(`[DEBUG] validateOrgConnection - Testing connection for: ${sanitizedOrg}`);

                // Use indeterminate progress
                progressInterval = setInterval(() => {
                    progress.report({ message: 'Testing connection...' });
                }, 400);

                const { stdout } = await execAsync(`sf org open --target-org ${sanitizedOrg} --urlonly --json`);
                
                const result = JSON.parse(stdout);
                // sf CLI returns result directly, not wrapped in status/result
                const isValid = !result.status || result.status === 0;
                
                progress.report({ 
                    message: isValid ? 'Connection valid' : 'Connection failed' 
                });
                
                console.log(`[DEBUG] Org connection validation result: ${isValid}`);
                return isValid;
            } catch (error) {
                console.error('[ERROR] Error validating org connection:', error);
                return false;
            } finally {
                // Ensure interval is always cleared
                if (progressInterval) {
                    clearInterval(progressInterval);
                }
            }
        });
    }

    /**
     * Use source org for pricing tests with opportunity selection (no cross-org testing)
     */
    async useSourceOrgWithOpportunity(
        sourceOrgId: string,
        sourceOpportunityId?: string,
        sourceOpportunityName?: string
    ): Promise<SalesforceOrg | undefined> {
        // Find the source org by ID
        const orgs = await this.getAuthenticatedOrgs();
        const sourceOrg = orgs.find(org => org.orgId === sourceOrgId);
        
        if (!sourceOrg) {
            vscode.window.showErrorMessage(`Source org with ID ${sourceOrgId} not found in authenticated orgs. Please re-authenticate.`);
            return undefined;
        }

        console.log(`[DEBUG] Using source org as target org: ${sourceOrg.alias || sourceOrg.username}`);

        // Since we're using the same org, ask about opportunity preference if source has one
        let useSourceOpportunity = false;
        
        if (sourceOpportunityId) {
            const choice = await vscode.window.showQuickPick([
                {
                    label: 'Use same opportunity',
                    description: sourceOpportunityName ? `${sourceOpportunityName} (${sourceOpportunityId})` : sourceOpportunityId,
                    detail: 'Use the opportunity from the source snapshot',
                    value: 'same'
                },
                {
                    label: 'Use different opportunity',
                    description: 'Enter a different opportunity ID',
                    detail: 'Specify a different opportunity for testing',
                    value: 'different'
                }
            ], {
                placeHolder: 'Choose opportunity for pricing test in the same org',
                title: 'Opportunity Selection'
            });

            if (!choice) {
                return undefined; // User cancelled
            }

            useSourceOpportunity = choice.value === 'same';
        }

        if (useSourceOpportunity && sourceOpportunityId) {
            // Use the source opportunity ID
            sourceOrg.testOpportunityId = sourceOpportunityId;
            console.log(`[DEBUG] Using source opportunity: ${sourceOpportunityId}`);
        } else {
            // Ask for a different opportunity ID
            const opportunityId = await vscode.window.showInputBox({
                placeHolder: 'Enter OpportunityId (e.g., 006000000000001)',
                prompt: `Enter different OpportunityId for testing in ${sourceOrg.alias || sourceOrg.username}. The quote will be associated with this opportunity.`,
                ignoreFocusOut: true,
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'OpportunityId is required for pricing tests';
                    }
                    // Basic Salesforce ID validation
                    if (!/^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/.test(value.trim())) {
                        return 'Invalid OpportunityId format. Must be a valid 15 or 18 character Salesforce ID.';
                    }
                    return undefined;
                }
            });

            if (!opportunityId) {
                return undefined; // User cancelled
            }

            sourceOrg.testOpportunityId = opportunityId.trim();
        }

        return sourceOrg;
    }

    /**
     * Use source org with same opportunity automatically for batch tests (no user prompts)
     */
    async useSourceOrgForBatchTest(
        sourceOrgId: string,
        sourceOpportunityId?: string
    ): Promise<SalesforceOrg | undefined> {
        console.log(`[DEBUG] useSourceOrgForBatchTest: Finding org with ID ${sourceOrgId}`);
        
        // Find source org
        let sourceOrg = Array.from(this.orgs.values()).find(org => org.orgId === sourceOrgId);
        
        if (!sourceOrg) {
            console.log(`[DEBUG] Org not found in cache, refreshing org list...`);
            await this.getAuthenticatedOrgs();
            sourceOrg = Array.from(this.orgs.values()).find(org => org.orgId === sourceOrgId);
        }

        if (!sourceOrg) {
            console.error(`[ERROR] Source org not found: ${sourceOrgId}`);
            return undefined;
        }

        console.log(`[DEBUG] Found source org: ${sourceOrg.alias || sourceOrg.username}`);

        // For batch tests, automatically use the source opportunity without any prompts
        if (sourceOpportunityId) {
            sourceOrg.testOpportunityId = sourceOpportunityId;
            console.log(`[DEBUG] Batch test using source opportunity: ${sourceOpportunityId}`);
        } else {
            console.log(`[DEBUG] No source opportunity ID provided for batch test`);
        }

        return sourceOrg;
    }

    /**
     * Select org and opportunity for pricing tests with smart prompts
     */
    async selectOrgWithOpportunity(
        title: string = 'Select Target Org for Pricing Test',
        sourceOrgId?: string,
        sourceOpportunityId?: string,
        sourceOpportunityName?: string
    ): Promise<SalesforceOrg | undefined> {
        const selectedOrg = await this.selectOrg(title);
        if (!selectedOrg) {
            return undefined;
        }

        // Determine if we need to ask about opportunity
        const isSameOrg = sourceOrgId && selectedOrg.orgId === sourceOrgId;
        let useSourceOpportunity = false;

        if (isSameOrg && sourceOpportunityId) {
            // Same org and source has opportunity - ask user preference
            const choice = await vscode.window.showQuickPick([
                {
                    label: 'Use same opportunity',
                    description: sourceOpportunityName ? `${sourceOpportunityName} (${sourceOpportunityId})` : sourceOpportunityId,
                    detail: 'Use the opportunity from the source snapshot',
                    value: 'same'
                },
                {
                    label: 'Use different opportunity',
                    description: 'Enter a different opportunity ID',
                    detail: 'Specify a different opportunity for testing',
                    value: 'different'
                }
            ], {
                placeHolder: 'Choose opportunity for pricing test',
                title: 'Opportunity Selection'
            });

            if (!choice) {
                return undefined; // User cancelled
            }

            useSourceOpportunity = choice.value === 'same';
        }

        if (useSourceOpportunity && sourceOpportunityId) {
            // Use the source opportunity ID
            selectedOrg.testOpportunityId = sourceOpportunityId;
            console.log(`[DEBUG] Using source opportunity: ${sourceOpportunityId}`);
        } else {
            // Ask for opportunity ID (either different org or user chose different opportunity)
            const promptMessage = isSameOrg 
                ? 'Enter different OpportunityId for this test'
                : `Enter OpportunityId for ${selectedOrg.alias || selectedOrg.username}`;

            const opportunityId = await vscode.window.showInputBox({
                placeHolder: 'Enter OpportunityId (e.g., 006000000000001)',
                prompt: `${promptMessage}. The quote will be associated with this opportunity.`,
                ignoreFocusOut: true,
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'OpportunityId is required for pricing tests';
                    }
                    // Basic Salesforce ID validation
                    if (!/^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/.test(value.trim())) {
                        return 'Invalid OpportunityId format. Must be a valid 15 or 18 character Salesforce ID.';
                    }
                    return undefined;
                }
            });

            if (!opportunityId) {
                return undefined; // User cancelled
            }

            selectedOrg.testOpportunityId = opportunityId.trim();
        }

        return selectedOrg;
    }

    /**
     * Show org selector quick pick
     */
    async selectOrg(title: string = 'Select Salesforce Org', filterType?: string, needsOpportunityId: boolean = false): Promise<SalesforceOrg | undefined> {
        const orgs = await this.getAuthenticatedOrgs();
        
        if (orgs.length === 0) {
            vscode.window.showWarningMessage('No authenticated Salesforce orgs found. Please authenticate using Salesforce CLI.');
            return undefined;
        }

        const filteredOrgs = filterType ? orgs.filter(org => org.type === filterType) : orgs;
        
        const items = filteredOrgs.map(org => ({
            label: org.alias || org.username,
            description: org.username,
            org: org
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: title,
            canPickMany: false
        });

        if (!selected?.org) {
            return undefined;
        }

        const selectedOrg = selected.org;

        // If OpportunityId is needed, ask for it
        if (needsOpportunityId) {
            const opportunityId = await vscode.window.showInputBox({
                placeHolder: 'Enter OpportunityId (e.g., 006000000000001)',
                prompt: 'OpportunityId is required to create test quotes. The quote will be associated with this opportunity.',
                ignoreFocusOut: true,
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'OpportunityId is required for pricing tests';
                    }
                    // Basic Salesforce ID validation
                    if (!/^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/.test(value.trim())) {
                        return 'Invalid OpportunityId format. Must be a valid 15 or 18 character Salesforce ID.';
                    }
                    return undefined;
                }
            });

            if (!opportunityId) {
                return undefined; // User cancelled
            }

            // Add OpportunityId to the selected org
            selectedOrg.testOpportunityId = opportunityId.trim();
        }

        return selectedOrg;
    }

    /**
     * Clear cached org information
     */
    clearCache(): void {
        this.orgs.clear();
    }
}
