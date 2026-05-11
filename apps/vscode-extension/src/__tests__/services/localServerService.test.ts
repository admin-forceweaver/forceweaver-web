import { LocalServerService, CallbackData } from '../../services/localServerService';
import * as http from 'http';

describe('LocalServerService', () => {
    let service: LocalServerService;

    beforeEach(() => {
        service = new LocalServerService();
    });

    afterEach(() => {
        // Ensure server is stopped after each test
        service.stopServer();
    });

    describe('startServer', () => {
        it('should start server on an available port', async () => {
            const callbackUrl = await service.startServer();
            
            expect(callbackUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/callback$/);
            expect(service.isRunning()).toBe(true);
        });

        it('should return callback URL in correct format', async () => {
            const callbackUrl = await service.startServer();
            const url = new URL(callbackUrl);
            
            expect(url.protocol).toBe('http:');
            expect(url.hostname).toBe('127.0.0.1');
            expect(url.pathname).toBe('/callback');
            expect(parseInt(url.port)).toBeGreaterThanOrEqual(49152);
            expect(parseInt(url.port)).toBeLessThanOrEqual(65535);
        });

        it('should throw error if server is already running', async () => {
            await service.startServer();
            
            await expect(service.startServer()).rejects.toThrow('Server is already running');
        });

        it('should get callback URL after server starts', async () => {
            const startUrl = await service.startServer();
            const getUrl = service.getCallbackUrl();
            
            expect(getUrl).toBe(startUrl);
        });
    });

    describe('waitForCallback', () => {
        it('should receive token from GET request with valid parameters', async () => {
            const callbackUrl = await service.startServer();
            const callbackPromise = service.waitForCallback();

            // Extract port from callback URL
            const url = new URL(callbackUrl);
            const testUrl = `${callbackUrl}?token=test-token-123&tier=free`;

            // Simulate callback request
            http.get(testUrl, () => {});

            const result = await callbackPromise;
            
            expect(result.token).toBe('test-token-123');
            expect(result.tier).toBe('free');
        });

        it('should accept pro tier', async () => {
            const callbackUrl = await service.startServer();
            const callbackPromise = service.waitForCallback();

            const testUrl = `${callbackUrl}?token=pro-token&tier=pro`;
            http.get(testUrl, () => {});

            const result = await callbackPromise;
            
            expect(result.tier).toBe('pro');
        });

        it('should accept enterprise tier', async () => {
            const callbackUrl = await service.startServer();
            const callbackPromise = service.waitForCallback();

            const testUrl = `${callbackUrl}?token=ent-token&tier=enterprise`;
            http.get(testUrl, () => {});

            const result = await callbackPromise;
            
            expect(result.tier).toBe('enterprise');
        });

        it('should include expires_at when provided', async () => {
            const callbackUrl = await service.startServer();
            const callbackPromise = service.waitForCallback();

            const expiresAt = '2025-12-31T23:59:59Z';
            const testUrl = `${callbackUrl}?token=token&tier=pro&expires_at=${encodeURIComponent(expiresAt)}`;
            http.get(testUrl, () => {});

            const result = await callbackPromise;
            
            expect(result.expires_at).toBe(expiresAt);
        });

        it('should reject if token parameter is missing', async () => {
            const callbackUrl = await service.startServer();
            const callbackPromise = service.waitForCallback();

            const testUrl = `${callbackUrl}?tier=free`;
            http.get(testUrl, () => {});

            await expect(callbackPromise).rejects.toThrow('Missing token or tier parameter');
        });

        it('should reject if tier parameter is missing', async () => {
            const callbackUrl = await service.startServer();
            const callbackPromise = service.waitForCallback();

            const testUrl = `${callbackUrl}?token=test-token`;
            http.get(testUrl, () => {});

            await expect(callbackPromise).rejects.toThrow('Missing token or tier parameter');
        });

        it('should reject if tier is invalid', async () => {
            const callbackUrl = await service.startServer();
            const callbackPromise = service.waitForCallback();

            const testUrl = `${callbackUrl}?token=test-token&tier=invalid`;
            http.get(testUrl, () => {});

            await expect(callbackPromise).rejects.toThrow(/Invalid tier/);
        });
    });

    describe('stopServer', () => {
        it('should stop server and clean up resources', async () => {
            await service.startServer();
            expect(service.isRunning()).toBe(true);

            service.stopServer();
            
            expect(service.isRunning()).toBe(false);
            expect(service.getCallbackUrl()).toBeNull();
        });

        it('should be safe to call multiple times', async () => {
            await service.startServer();
            
            service.stopServer();
            service.stopServer();
            service.stopServer();
            
            expect(service.isRunning()).toBe(false);
        });

        it('should be safe to call without starting server', () => {
            expect(() => service.stopServer()).not.toThrow();
        });
    });

    describe('timeout behavior', () => {
        it('should timeout after specified duration', async () => {
            const shortTimeout = 100; // 100ms for testing
            await service.startServer(shortTimeout);
            const callbackPromise = service.waitForCallback();

            await expect(callbackPromise).rejects.toThrow('Authentication timed out');
        }, 1000);

        it('should stop server after timeout', async () => {
            const shortTimeout = 100;
            await service.startServer(shortTimeout);
            const callbackPromise = service.waitForCallback();

            try {
                await callbackPromise;
            } catch {
                // Expected to timeout
            }

            expect(service.isRunning()).toBe(false);
        }, 1000);
    });

    describe('HTTP request handling', () => {
        it('should return 404 for non-callback paths', async () => {
            const callbackUrl = await service.startServer();
            const url = new URL(callbackUrl);
            const testUrl = `http://127.0.0.1:${url.port}/other-path`;

            const response = await new Promise<http.IncomingMessage>((resolve) => {
                http.get(testUrl, resolve);
            });

            expect(response.statusCode).toBe(404);
        });

        it('should close server after successful callback', async () => {
            const callbackUrl = await service.startServer();
            const callbackPromise = service.waitForCallback();

            const testUrl = `${callbackUrl}?token=test&tier=free`;
            http.get(testUrl, () => {});

            await callbackPromise;
            
            expect(service.isRunning()).toBe(false);
        });

        it('should return success HTML on valid callback', async () => {
            const callbackUrl = await service.startServer();
            const testUrl = `${callbackUrl}?token=test&tier=free`;

            const response = await new Promise<http.IncomingMessage>((resolve) => {
                http.get(testUrl, resolve);
            });

            expect(response.statusCode).toBe(200);
            expect(response.headers['content-type']).toContain('text/html');
            
            // Read response body
            const chunks: Buffer[] = [];
            response.on('data', (chunk) => chunks.push(chunk));
            
            const html = await new Promise<string>((resolve) => {
                response.on('end', () => resolve(Buffer.concat(chunks).toString()));
            });

            expect(html).toContain('Authentication Successful');
            expect(html).toContain('return to VS Code');
        });
    });

    describe('getCallbackUrl', () => {
        it('should return null when server is not running', () => {
            expect(service.getCallbackUrl()).toBeNull();
        });

        it('should return URL when server is running', async () => {
            const startUrl = await service.startServer();
            const getUrl = service.getCallbackUrl();
            
            expect(getUrl).toBe(startUrl);
            expect(getUrl).not.toBeNull();
        });

        it('should return null after server is stopped', async () => {
            await service.startServer();
            service.stopServer();
            
            expect(service.getCallbackUrl()).toBeNull();
        });
    });

    describe('isRunning', () => {
        it('should return false initially', () => {
            expect(service.isRunning()).toBe(false);
        });

        it('should return true when server is running', async () => {
            await service.startServer();
            
            expect(service.isRunning()).toBe(true);
        });

        it('should return false after server is stopped', async () => {
            await service.startServer();
            service.stopServer();
            
            expect(service.isRunning()).toBe(false);
        });
    });
});

