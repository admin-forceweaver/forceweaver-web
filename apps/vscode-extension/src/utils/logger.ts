/**
 * Centralized logging utility for RevCloud Blueprint extension
 * Ensures all logs are visible in both development and production environments
 * Includes security features to redact sensitive data from logs
 */

export class Logger {
    // Patterns for sensitive data that should be redacted in logs
    private static readonly SENSITIVE_PATTERNS = [
        { pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, replacement: 'Bearer [REDACTED]' },
        { pattern: /accessToken["']?\s*[:=]\s*["']?[A-Za-z0-9\-._~+/]+=*/gi, replacement: 'accessToken: [REDACTED]' },
        { pattern: /access_token["']?\s*[:=]\s*["']?[A-Za-z0-9\-._~+/]+=*/gi, replacement: 'access_token: [REDACTED]' },
        { pattern: /password["']?\s*[:=]\s*["']?[^"'\s,}]+/gi, replacement: 'password: [REDACTED]' },
        { pattern: /api[_-]?key["']?\s*[:=]\s*["']?[A-Za-z0-9\-._~+/]+=*/gi, replacement: 'api_key: [REDACTED]' },
        { pattern: /client[_-]?secret["']?\s*[:=]\s*["']?[A-Za-z0-9\-._~+/]+=*/gi, replacement: 'client_secret: [REDACTED]' },
    ];

    // Salesforce ID fields that should be preserved (not considered sensitive)
    private static readonly SALESFORCE_ID_FIELDS = ['Id', 'QuoteId', 'OpportunityId', 'AccountId', 'Product2Id', 'PricebookEntryId'];

    /**
     * Get the global output channel instance
     */
    private static getOutputChannel(): any {
        return (global as any).revCloudBlueprintLogger;
    }

    /**
     * Sanitize sensitive data from log messages and data objects
     * @param value The value to sanitize (string or object)
     * @param seen Set to track circular references
     * @returns Sanitized value with sensitive data redacted
     */
    private static sanitize(value: any, seen: WeakSet<object> = new WeakSet()): any {
        if (value === null || value === undefined) {
            return value;
        }

        // Handle Error objects specially - preserve error info but sanitize nested config
        if (value instanceof Error) {
            // Check for circular reference
            if (seen.has(value)) {
                return '[Circular Reference]';
            }
            seen.add(value);
            const sanitizedError: any = {
                name: value.name,
                message: this.sanitize(value.message, seen),
                stack: value.stack ? this.sanitize(value.stack, seen) : undefined
            };

            // For AxiosError or errors with config, sanitize the config object
            if ((value as any).config) {
                sanitizedError.config = this.sanitize((value as any).config, seen);
            }

            // Include other error properties but sanitize them
            for (const key in value) {
                if (Object.prototype.hasOwnProperty.call(value, key) && !['name', 'message', 'stack', 'config'].includes(key)) {
                    sanitizedError[key] = this.sanitize((value as any)[key], seen);
                }
            }

            return sanitizedError;
        }

        // Handle strings
        if (typeof value === 'string') {
            let sanitized = value;
            for (const { pattern, replacement } of this.SENSITIVE_PATTERNS) {
                sanitized = sanitized.replace(pattern, replacement);
            }
            return sanitized;
        }

        // Handle objects and arrays
        if (typeof value === 'object') {
            // Check for circular reference
            if (seen.has(value)) {
                return '[Circular Reference]';
            }
            seen.add(value);

            if (Array.isArray(value)) {
                return value.map(item => this.sanitize(item, seen));
            }

            // Deep clone and sanitize object properties
            const sanitized: any = {};
            for (const key in value) {
                if (Object.prototype.hasOwnProperty.call(value, key)) {
                    // Check if this is a sensitive field
                    const lowerKey = key.toLowerCase();
                    if (lowerKey.includes('token') || lowerKey.includes('password') ||
                        lowerKey.includes('secret') || lowerKey.includes('apikey') ||
                        lowerKey === 'authorization') {  // Specifically catch Authorization header
                        sanitized[key] = '[REDACTED]';
                    } else if (lowerKey === 'headers') {
                        // Sanitize headers object specially
                        sanitized[key] = this.sanitizeHeaders(value[key]);
                    } else {
                        sanitized[key] = this.sanitize(value[key], seen);
                    }
                }
            }
            return sanitized;
        }

        return value;
    }

    /**
     * Sanitize HTTP headers object to redact sensitive headers
     */
    private static sanitizeHeaders(headers: any): any {
        if (!headers || typeof headers !== 'object') {
            return headers;
        }

        const sanitized: any = {};
        for (const key in headers) {
            if (Object.prototype.hasOwnProperty.call(headers, key)) {
                const lowerKey = key.toLowerCase();
                if (lowerKey === 'authorization' || lowerKey.includes('token') ||
                    lowerKey.includes('key') || lowerKey.includes('secret')) {
                    sanitized[key] = '[REDACTED]';
                } else {
                    sanitized[key] = headers[key];
                }
            }
        }
        return sanitized;
    }

    /**
     * Enhanced debug logging - writes to both console and VS Code output channel
     * Automatically sanitizes sensitive data before logging
     * @param message The main log message
     * @param data Optional data to log (will be JSON stringified)
     * @param source Optional source identifier (e.g., 'SnapshotCreator', 'API')
     */
    public static log(message: string, data?: any, source?: string): void {
        const timestamp = new Date().toISOString();
        const sourcePrefix = source ? `[${source}] ` : '';

        // Sanitize message and data to remove sensitive information
        const sanitizedMessage = this.sanitize(message);
        const sanitizedData = data !== undefined ? this.sanitize(data) : undefined;

        const logMessage = `[${timestamp}] ${sourcePrefix}${sanitizedMessage}`;

        // Always log to console (for development)
        console.log(logMessage);
        if (sanitizedData !== undefined) {
            console.log(sanitizedData);
        }

        // Also log to VS Code Output channel if available (for production)
        const outputChannel = this.getOutputChannel();
        if (outputChannel) {
            outputChannel.appendLine(logMessage);
            if (sanitizedData !== undefined) {
                if (typeof sanitizedData === 'object') {
                    outputChannel.appendLine(JSON.stringify(sanitizedData, null, 2));
                } else {
                    outputChannel.appendLine(String(sanitizedData));
                }
            }
        }
    }

    /**
     * Log debug information
     */
    public static debug(message: string, data?: any, source?: string): void {
        this.log(`[DEBUG] ${message}`, data, source);
    }

    /**
     * Log informational messages
     */
    public static info(message: string, data?: any, source?: string): void {
        this.log(`[INFO] ${message}`, data, source);
    }

    /**
     * Log warnings
     */
    public static warn(message: string, data?: any, source?: string): void {
        this.log(`[WARN] ${message}`, data, source);
    }

    /**
     * Log errors
     */
    public static error(message: string, error?: any, source?: string): void {
        this.log(`[ERROR] ${message}`, error, source);
        
        // Also log stack trace if error is provided
        if (error && error.stack) {
            this.log(`[ERROR] Stack trace: ${error.stack}`, undefined, source);
        }
    }

    /**
     * Legacy method for backward compatibility - gradually replace with specific methods
     * @deprecated Use debug(), info(), warn(), or error() instead
     */
    public static console(message: string, data?: any): void {
        this.debug(message, data);
    }
}
