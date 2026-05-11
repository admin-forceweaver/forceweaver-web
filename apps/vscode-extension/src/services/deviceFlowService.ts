import * as vscode from 'vscode';
import axios from 'axios';

// API base URL - will be environment-specific
const API_BASE_URL = 'https://sfapp.forceweaver.com'; // Production URL

interface DeviceAuthResponse {
    user_code: string;        // User-friendly code (e.g., "WXYZ-1234")
    device_code: string;      // Long-lived code for polling
    verification_uri: string; // URL user visits to authorize
    interval: number;         // Polling interval in seconds
    expires_in: number;       // Code expiry time in seconds
}

interface TokenResponse {
    device_token: string;
    tier: 'free' | 'pro' | 'enterprise';
    expires_at: string;
}

export type DeviceFlowState = 
    | { status: 'idle' }
    | { status: 'initiating' }
    | { status: 'polling'; userCode: string; verificationUri: string; expiresAt: number }
    | { status: 'success'; deviceToken: string; tier: string }
    | { status: 'error'; message: string; code?: string }
    | { status: 'cancelled' };

export class DeviceFlowService {
    private _onStateChange = new vscode.EventEmitter<DeviceFlowState>();
    public readonly onStateChange = this._onStateChange.event;
    
    private _currentState: DeviceFlowState = { status: 'idle' };
    private _pollingTimer?: NodeJS.Timeout;
    private _shouldContinuePolling = false;

    constructor(private readonly context: vscode.ExtensionContext) {}

    /**
     * Initiate the device authorization flow
     * Returns the device auth response for display to user
     */
    public async initiateActivation(): Promise<DeviceAuthResponse> {
        try {
            this._updateState({ status: 'initiating' });
            
            const response = await axios.post<DeviceAuthResponse>(
                `${API_BASE_URL}/api/license/activate`,
                {},
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 10000
                }
            );

            const authData = response.data;
            const expiresAt = Date.now() + (authData.expires_in * 1000);

            this._updateState({
                status: 'polling',
                userCode: authData.user_code,
                verificationUri: authData.verification_uri,
                expiresAt
            });

            // Automatically open browser
            vscode.env.openExternal(vscode.Uri.parse(authData.verification_uri));

            // Start polling for token
            this._startPolling(authData.device_code, authData.interval, expiresAt);

            return authData;
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || 'Failed to initiate activation';
            this._updateState({ status: 'error', message: errorMessage });
            throw new Error(errorMessage);
        }
    }

    /**
     * Start polling the backend for token exchange
     */
    private _startPolling(deviceCode: string, intervalSeconds: number, expiresAt: number): void {
        this._shouldContinuePolling = true;
        
        const poll = async () => {
            if (!this._shouldContinuePolling) {
                return;
            }

            // Check if code has expired
            if (Date.now() >= expiresAt) {
                this._updateState({ 
                    status: 'error', 
                    message: 'Device code expired. Please try activating again.',
                    code: 'expired_token'
                });
                return;
            }

            try {
                const response = await axios.post<TokenResponse | { error: string }>(
                    `${API_BASE_URL}/api/license/token`,
                    { device_code: deviceCode },
                    {
                        headers: { 'Content-Type': 'application/json' },
                        timeout: 10000
                    }
                );

                const data = response.data;

                // Check if still pending
                if ('error' in data) {
                    if (data.error === 'authorization_pending') {
                        // Continue polling
                        this._pollingTimer = setTimeout(poll, intervalSeconds * 1000);
                        return;
                    } else if (data.error === 'slow_down') {
                        // Increase polling interval
                        this._pollingTimer = setTimeout(poll, (intervalSeconds + 5) * 1000);
                        return;
                    } else {
                        // Other error
                        throw new Error(data.error);
                    }
                }

                // Success! We have a token
                await this._storeDeviceToken(data.device_token);
                this._updateState({ 
                    status: 'success', 
                    deviceToken: data.device_token,
                    tier: data.tier
                });
                
                vscode.window.showInformationMessage(
                    `Rev Cloud Blueprint activated successfully! License: ${data.tier}`
                );

            } catch (error: any) {
                const errorMessage = error.response?.data?.message || error.message || 'Polling failed';
                this._updateState({ status: 'error', message: errorMessage });
            }
        };

        // Start first poll immediately
        poll();
    }

    /**
     * Store device token securely using VS Code's SecretStorage
     */
    private async _storeDeviceToken(token: string): Promise<void> {
        await this.context.secrets.store('revCloudBlueprint.deviceToken', token);
    }

    /**
     * Cancel the activation flow
     */
    public cancelActivation(): void {
        this._shouldContinuePolling = false;
        if (this._pollingTimer) {
            clearTimeout(this._pollingTimer);
            this._pollingTimer = undefined;
        }
        this._updateState({ status: 'cancelled' });
    }

    /**
     * Get current state
     */
    public getCurrentState(): DeviceFlowState {
        return this._currentState;
    }

    /**
     * Update state and emit event
     */
    private _updateState(newState: DeviceFlowState): void {
        this._currentState = newState;
        this._onStateChange.fire(newState);
    }

    /**
     * Cleanup resources
     */
    public dispose(): void {
        this.cancelActivation();
        this._onStateChange.dispose();
    }
}

