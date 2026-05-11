import * as vscode from 'vscode';
import { SalesforceAuth, SalesforceOrg } from '../salesforce/auth';

export class ApexExecutor {
    private auth: SalesforceAuth;

    constructor(auth: SalesforceAuth) {
        this.auth = auth;
    }

    /**
     * Execute pricing Apex code using REST API executeAnonymous to force pricing calculation
     */
    async executePricingApex(quoteId: string, targetOrg: SalesforceOrg): Promise<void> {
        this.outputLog(`🔧 Executing pricing calculation for quote`);
        this.outputLog(`🎯 Target Org: ${targetOrg.alias || targetOrg.username}`);
        
        // Build the Apex script with the dynamic quote ID
        const apexScript = this.buildPricingApexScript(quoteId);
        
        try {
            // Get access token and org info for the target org
            this.outputLog(`🔑 Authenticating with Salesforce...`);
            const accessToken = await this.auth.getAccessToken(targetOrg.username);
            const orgInfo = await this.auth.getOrgInfo(targetOrg.username);
            const instanceUrl = orgInfo.instanceUrl;
            
            this.outputLog(`✅ Authentication successful`);
            this.outputLog(`🚀 Executing pricing calculation...`);
            
            // Execute Apex using GET method
            const response = await this.tryExecuteApexGET(instanceUrl, accessToken, apexScript);
            
            // Process the response
            await this.processApexResponse(response, quoteId);
            
        } catch (error: any) {
            this.errorLog(`💥 Pricing calculation failed: ${error.message}`);
            throw new Error(`Pricing Apex execution failed: ${error.message}`);
        }
    }

    /**
     * Process the Apex execution response
     */
    private async processApexResponse(response: Response, quoteId: string): Promise<void> {
        this.outputLog(`📡 Processing execution response...`);
        
        let result: any;
        try {
            result = await response.json();
        } catch (parseError) {
            this.errorLog(`💥 Failed to parse response`);
            throw new Error(`Failed to parse response: ${response.status} ${response.statusText}`);
        }
        
        if (!response.ok) {
            this.errorLog(`💥 Execution failed with status ${response.status}`);
            
            // Special handling for common errors
            if (response.status === 405) {
                this.errorLog(`🚨 API endpoint not available - check user permissions`);
            }
            
            throw new Error(`Apex execution failed: ${result.message || response.statusText} (HTTP ${response.status})`);
        }
        
        // Check execution results
        if (result.success) {
            this.outputLog(`✅ Execution request successful`);
            
            if (result.compiled) {
                this.outputLog(`✅ Code compiled successfully`);
            } else {
                this.errorLog(`❌ Compilation failed`);
                if (result.compileProblem) {
                    this.errorLog(`💥 Compilation error: ${result.compileProblem}`);
                    throw new Error(`Apex compilation failed: ${result.compileProblem}`);
                }
            }
            
            // Check for runtime exceptions
            if (result.exceptionMessage) {
                this.errorLog(`💥 Runtime exception: ${result.exceptionMessage}`);
                throw new Error(`Apex runtime exception: ${result.exceptionMessage}`);
            }
            
            // Success - pricing should now be calculated
            this.outputLog(`🎉 Pricing calculation completed successfully!`);
            
        } else {
            this.errorLog(`💥 Execution failed`);
            throw new Error(`Apex execution failed: ${result.exceptionMessage || 'Unknown error'}`);
        }
    }

    /**
     * Execute Apex using GET method with query parameters
     */
    private async tryExecuteApexGET(instanceUrl: string, accessToken: string, apexScript: string): Promise<Response> {
        const encodedApexScript = encodeURIComponent(apexScript);
        const executeUrl = `${instanceUrl}/services/data/v64.0/tooling/executeAnonymous/?anonymousBody=${encodedApexScript}`;
        
        return await fetch(executeUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });
    }

    /**
     * Build the pricing Apex script with dynamic quote ID replacement
     * Uses proper escaping to prevent injection
     */
    private buildPricingApexScript(quoteId: string): string {
        // Validate and escape the quote ID to prevent Apex injection
        if (!quoteId || typeof quoteId !== 'string') {
            throw new Error('Invalid quote ID provided');
        }
        
        // Salesforce ID validation (15 or 18 characters, alphanumeric)
        const sfIdRegex = /^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/;
        if (!sfIdRegex.test(quoteId)) {
            throw new Error(`Invalid Salesforce ID format: ${quoteId}`);
        }
        
        // Escape single quotes in the ID (though SF IDs shouldn't have them)
        const escapedQuoteId = quoteId.replace(/'/g, "\\'");
        
        return `
String qId = '${escapedQuoteId}';
PlaceQuote.PricingPreferenceEnum pricingPreference = PlaceQuote.PricingPreferenceEnum.FORCE;
PlaceQuote.ConfigurationInputEnum configEnum = PlaceQuote.ConfigurationInputEnum.RunAndAllowErrors;
PlaceQuote.ConfigurationOptionsInput config = new PlaceQuote.ConfigurationOptionsInput();
config.addDefaultConfiguration = true;
config.executeConfigurationRules = true;
config.validateAmendRenewCancel = true;
config.validateProductCatalog = true;

PlaceQuote.RecordResource quoteRecord = new PlaceQuote.RecordResource(Quote.getSobjectType(), 'PATCH', qId);
PlaceQuote.RecordWithReferenceRequest quoteObject = new PlaceQuote.RecordWithReferenceRequest('refQuote', quoteRecord);

// create the empty object graph w/only a reference to the quote
List<PlaceQuote.RecordWithReferenceRequest> records = new List<PlaceQuote.RecordWithReferenceRequest>();
records.add(quoteObject);

// Invoke the Place Quote API
PlaceQuote.GraphRequest graph = new PlaceQuote.GraphRequest('myGraphId', records);
PlaceQuote.PlaceQuoteResponse resp = PlaceQuote.PlaceQuoteRLMApexProcessor.execute(pricingPreference, graph, configEnum, config);

System.debug('Pricing execution completed for quote: ' + qId);
System.debug('PlaceQuote API executed successfully');
if (resp != null) {
    System.debug('Response object exists - pricing should be calculated');
} else {
    System.debug('WARNING: Response object is null');
}
`.trim();
    }

    /**
     * Generate curl command for testing Apex execution manually
     */
    async generateCurlCommand(quoteId: string, targetOrg: SalesforceOrg): Promise<string> {
        const apexScript = this.buildPricingApexScript(quoteId);
        const orgInfo = await this.auth.getOrgInfo(targetOrg.username);
        const instanceUrl = orgInfo.instanceUrl;

        const encodedApexScript = encodeURIComponent(apexScript);

        // Security: Redact access token in curl command to prevent exposure in logs
        // Users should retrieve the token separately from secure storage
        return `curl -X GET "${instanceUrl}/services/data/v64.0/tooling/executeAnonymous/?anonymousBody=${encodedApexScript}" \\
  -H "Authorization: Bearer [REDACTED]" \\
  -H "Accept: application/json" \\
  -v

# NOTE: Replace [REDACTED] with actual access token from secure storage
# To get the access token, run: sf org display --target-org ${targetOrg.username || targetOrg.alias || '<org-alias>'} --json | grep accessToken`;
    }

    /**
     * Log message to output channel
     */
    private outputLog(message: string): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}`;
        
        // Log to console for debugging
        console.log(logMessage);
        
        // Log to VS Code Output channel
        const outputChannel = (global as any).revCloudBlueprintLogger;
        if (outputChannel) {
            outputChannel.appendLine(logMessage);
        }
    }

    /**
     * Log error message to output channel
     */
    private errorLog(message: string): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [ERROR] ${message}`;
        
        // Log to console for debugging
        console.error(logMessage);
        
        // Log to VS Code Output channel
        const outputChannel = (global as any).revCloudBlueprintLogger;
        if (outputChannel) {
            outputChannel.appendLine(logMessage);
        }
    }
}
