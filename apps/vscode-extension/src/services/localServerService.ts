import * as http from 'http';
import * as url from 'url';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Data received from the authentication callback
 */
export interface CallbackData {
    token: string;
    tier: 'free' | 'pro' | 'enterprise';
    expires_at?: string;
}

/**
 * LocalServerService manages a temporary HTTP server for OAuth callbacks.
 * 
 * This service:
 * - Starts a local server on a random available port (49152-65535)
 * - Listens for GET requests to /callback with token parameters
 * - Returns HTML success/error page to browser
 * - Automatically shuts down after receiving callback or timeout
 * 
 * Security:
 * - Only binds to 127.0.0.1 (localhost)
 * - Single-use server (closes after one callback)
 * - 5-minute timeout if no callback received
 */
export class LocalServerService {
    private _server?: http.Server;
    private _port?: number;
    private _resolveCallback?: (data: CallbackData) => void;
    private _rejectCallback?: (error: Error) => void;
    private _timeoutHandle?: NodeJS.Timeout;
    private _isServerRunning = false;
    private _extensionPath?: string;

    // Port range for random selection (IANA dynamic/private ports)
    private readonly MIN_PORT = 49152;
    private readonly MAX_PORT = 65535;
    private readonly MAX_PORT_ATTEMPTS = 10;

    constructor(extensionPath?: string) {
        this._extensionPath = extensionPath;
    }

    /**
     * Start the local HTTP server on an available port
     * @param timeoutMs Timeout in milliseconds (default: 5 minutes)
     * @returns The callback URL for the authentication redirect
     */
    async startServer(timeoutMs: number = 300000): Promise<string> {
        if (this._isServerRunning) {
            throw new Error('Server is already running');
        }

        // Find an available port
        const port = await this._findAvailablePort();
        this._port = port;

        // Create server
        return new Promise((resolve, reject) => {
            this._server = http.createServer((req, res) => {
                this._handleRequest(req, res);
            });

            // Set up error handling
            this._server.on('error', (error: Error) => {
                this._cleanup();
                reject(new Error(`Server error: ${error.message}`));
            });

            // Start listening on localhost only (127.0.0.1)
            this._server.listen(port, '127.0.0.1', () => {
                this._isServerRunning = true;
                const callbackUrl = `http://127.0.0.1:${port}/callback`;
                
                // Set up timeout
                this._timeoutHandle = setTimeout(() => {
                    this._handleTimeout();
                }, timeoutMs);

                resolve(callbackUrl);
            });
        });
    }

    /**
     * Wait for the authentication callback
     * @returns Promise that resolves with callback data when received
     */
    waitForCallback(): Promise<CallbackData> {
        return new Promise((resolve, reject) => {
            this._resolveCallback = resolve;
            this._rejectCallback = reject;
        });
    }

    /**
     * Stop the server and clean up resources
     */
    stopServer(): void {
        this._cleanup();
    }

    /**
     * Get the current callback URL if server is running
     * @returns The callback URL or null if server is not running
     */
    getCallbackUrl(): string | null {
        if (!this._isServerRunning || !this._port) {
            return null;
        }
        return `http://127.0.0.1:${this._port}/callback`;
    }

    /**
     * Check if server is currently running
     */
    isRunning(): boolean {
        return this._isServerRunning;
    }

    /**
     * Handle incoming HTTP requests
     */
    private _handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
        // Parse URL and query parameters
        const parsedUrl = url.parse(req.url || '', true);
        const pathname = parsedUrl.pathname;
        const query = parsedUrl.query;

        // Only handle GET requests to /callback
        if (req.method !== 'GET' || pathname !== '/callback') {
            this._sendErrorResponse(res, 404, 'Not Found');
            return;
        }

        // Extract token and tier from query parameters
        const token = query.token as string;
        const tier = query.tier as string;
        const expires_at = query.expires_at as string | undefined;

        // Validate required parameters
        if (!token || !tier) {
            this._sendErrorResponse(res, 400, 'Missing required parameters');
            if (this._rejectCallback) {
                this._rejectCallback(new Error('Missing token or tier parameter'));
                this._cleanup();
            }
            return;
        }

        // Validate tier value
        if (!['free', 'pro', 'enterprise'].includes(tier)) {
            this._sendErrorResponse(res, 400, 'Invalid tier value');
            if (this._rejectCallback) {
                this._rejectCallback(new Error(`Invalid tier: ${tier}`));
                this._cleanup();
            }
            return;
        }

        // Success! Send success page to browser
        this._sendSuccessResponse(res);

        // Resolve the promise with callback data
        if (this._resolveCallback) {
            const callbackData: CallbackData = {
                token,
                tier: tier as 'free' | 'pro' | 'enterprise',
                expires_at
            };
            this._resolveCallback(callbackData);
        }

        // Clean up server (single-use)
        this._cleanup();
    }

    /**
     * Send success HTML response to browser
     */
    private _sendSuccessResponse(res: http.ServerResponse): void {
        // Get the logo as base64
        const logoBase64 = this._getLogoBase64();
        
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Successful - Rev Cloud Blueprint</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 1rem;
        }
        .container {
            background: white;
            padding: 2rem 2.5rem;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.15);
            text-align: center;
            max-width: 360px;
            width: 100%;
        }
        .logo {
            width: 64px;
            height: auto;
            margin-bottom: 1rem;
        }
        h1 {
            color: #1a202c;
            font-size: 1.375rem;
            font-weight: 600;
            margin-bottom: 0.75rem;
            letter-spacing: -0.01em;
        }
        p {
            color: #4a5568;
            font-size: 0.9375rem;
            line-height: 1.5;
            margin-bottom: 0.5rem;
        }
        .success {
            color: #38a169;
            font-weight: 500;
            font-size: 0.875rem;
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid #e2e8f0;
        }
        .checkmark {
            display: inline-block;
            margin-right: 0.25rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <img src="${logoBase64}" alt="Rev Cloud Blueprint" class="logo" />
        <h1>Authentication Successful</h1>
        <p>You're all set! Your VS Code extension is now authenticated.</p>
        <p class="success"><span class="checkmark">✓</span> You can close this window and return to VS Code</p>
    </div>
</body>
</html>`;

        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Length': Buffer.byteLength(html)
        });
        res.end(html);
    }

    /**
     * Send error HTML response to browser
     */
    private _sendErrorResponse(res: http.ServerResponse, statusCode: number, message: string): void {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Error - Rev Cloud Blueprint</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            padding: 1rem;
        }
        .container {
            background: white;
            padding: 2rem 2.5rem;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.15);
            text-align: center;
            max-width: 360px;
            width: 100%;
        }
        .icon {
            font-size: 2.5rem;
            margin-bottom: 0.75rem;
            line-height: 1;
        }
        h1 {
            color: #1a202c;
            font-size: 1.375rem;
            font-weight: 600;
            margin-bottom: 0.75rem;
            letter-spacing: -0.01em;
        }
        p {
            color: #4a5568;
            font-size: 0.9375rem;
            line-height: 1.5;
            margin-bottom: 0.5rem;
        }
        .error {
            color: #e53e3e;
            font-weight: 500;
            font-size: 0.875rem;
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid #e2e8f0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">⚠️</div>
        <h1>Authentication Error</h1>
        <p>${this._escapeHtml(message)}</p>
        <p class="error">Please close this window and try again in VS Code</p>
    </div>
</body>
</html>`;

        res.writeHead(statusCode, {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Length': Buffer.byteLength(html)
        });
        res.end(html);
    }

    /**
     * Handle timeout (no callback received within timeout period)
     */
    private _handleTimeout(): void {
        if (this._rejectCallback) {
            this._rejectCallback(new Error('Authentication timed out. Please try again.'));
        }
        this._cleanup();
    }

    /**
     * Find an available port in the dynamic/private range
     */
    private async _findAvailablePort(): Promise<number> {
        for (let i = 0; i < this.MAX_PORT_ATTEMPTS; i++) {
            const port = this.MIN_PORT + Math.floor(Math.random() * (this.MAX_PORT - this.MIN_PORT));
            
            if (await this._isPortAvailable(port)) {
                return port;
            }
        }

        throw new Error(`Failed to find available port after ${this.MAX_PORT_ATTEMPTS} attempts`);
    }

    /**
     * Check if a port is available
     */
    private _isPortAvailable(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const testServer = http.createServer();
            
            testServer.once('error', () => {
                resolve(false);
            });

            testServer.once('listening', () => {
                testServer.close(() => {
                    resolve(true);
                });
            });

            testServer.listen(port, '127.0.0.1');
        });
    }

    /**
     * Clean up server and resources
     */
    private _cleanup(): void {
        // Clear timeout
        if (this._timeoutHandle) {
            clearTimeout(this._timeoutHandle);
            this._timeoutHandle = undefined;
        }

        // Close server
        if (this._server) {
            this._server.close();
            this._server = undefined;
        }

        // Reset state
        this._isServerRunning = false;
        this._port = undefined;
        this._resolveCallback = undefined;
        this._rejectCallback = undefined;
    }

    /**
     * Get the Rev Cloud Blueprint logo as a base64 data URI
     */
    private _getLogoBase64(): string {
        try {
            let logoPath: string;
            
            if (this._extensionPath) {
                // Use the extension path provided in constructor
                logoPath = path.join(this._extensionPath, 'images', 'rcb_logo_color.png');
                console.log('[LocalServerService] Using extension path for logo:', logoPath);
            } else {
                // Fallback: try to construct from __dirname
                // The structure is: dist/services/localServerService.js -> images/rcb_logo_color.png
                logoPath = path.join(__dirname, '..', '..', 'images', 'rcb_logo_color.png');
                console.log('[LocalServerService] Using __dirname for logo:', logoPath);
            }
            
            // Read the file and convert to base64
            const logoBuffer = fs.readFileSync(logoPath);
            const logoBase64 = logoBuffer.toString('base64');
            
            console.log('[LocalServerService] Logo loaded successfully');
            // Return as data URI
            return `data:image/png;base64,${logoBase64}`;
        } catch (error) {
            // If logo can't be loaded, return a fallback (empty data URI or a checkmark emoji in SVG)
            console.error('[LocalServerService] Failed to load logo:', error);
            // Return a simple SVG checkmark as fallback
            const checkmarkSvg = encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#48bb78">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
            `);
            return `data:image/svg+xml,${checkmarkSvg}`;
        }
    }

    /**
     * Escape HTML special characters
     */
    private _escapeHtml(text: string): string {
        const map: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }
}

