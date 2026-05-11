import { getLicenseState, isProFeatureEnabled, getMonetizationStartDate, isInBetaPeriod, LicenseState } from '../../services/licenseService';

describe('LicenseService', () => {
    // Store original Date constructor
    const OriginalDate = Date;
    
    afterEach(() => {
        // Restore original Date after each test
        global.Date = OriginalDate;
    });

    describe('getLicenseState()', () => {
        it('should return isPro: true and beta message when current date is before MONETIZATION_START_DATE', async () => {
            // Mock current date to be before monetization start date (e.g., 2025-06-01)
            const mockDate = new Date('2025-06-01T00:00:00Z');
            global.Date = jest.fn(() => mockDate) as any;
            global.Date.now = jest.fn(() => mockDate.getTime());

            const result: LicenseState = await getLicenseState();

            expect(result.isPro).toBe(true);
            expect(result.statusMessage).toBe('Welcome to the Rev Cloud Blueprint Public Beta! All features are enabled.');
        });

        it('should return isPro: false and upgrade message when current date is after MONETIZATION_START_DATE', async () => {
            // Mock current date to be after monetization start date (e.g., 2026-02-01)
            const mockDate = new Date('2026-02-01T00:00:00Z');
            global.Date = jest.fn(() => mockDate) as any;
            global.Date.now = jest.fn(() => mockDate.getTime());

            const result: LicenseState = await getLicenseState();

            expect(result.isPro).toBe(false);
            expect(result.statusMessage).toBe('License validation unavailable. Please restart VS Code.');
        });

        it('should return isPro: false when current date exactly equals MONETIZATION_START_DATE', async () => {
            // Mock current date to be exactly the monetization start date
            const mockDate = new Date('2026-01-31T00:00:00Z');
            global.Date = jest.fn(() => mockDate) as any;
            global.Date.now = jest.fn(() => mockDate.getTime());

            const result: LicenseState = await getLicenseState();

            expect(result.isPro).toBe(false);
            expect(result.statusMessage).toBe('License validation unavailable. Please restart VS Code.');
        });

        it('should return isPro: true when current date is one second before MONETIZATION_START_DATE', async () => {
            // Mock current date to be one second before monetization start date
            const monetizationDate = new Date('2026-01-31T00:00:00Z');
            const mockDate = new Date(monetizationDate.getTime() - 1000); // 1 second before
            global.Date = jest.fn(() => mockDate) as any;
            global.Date.now = jest.fn(() => mockDate.getTime());

            const result: LicenseState = await getLicenseState();

            expect(result.isPro).toBe(true);
            expect(result.statusMessage).toBe('Welcome to the Rev Cloud Blueprint Public Beta! All features are enabled.');
        });
    });

    describe('isProFeatureEnabled()', () => {
        it('should return true when current date is before MONETIZATION_START_DATE', () => {
            // Mock current date to be before monetization start date
            const mockDate = new Date('2025-06-01T00:00:00Z');
            global.Date = jest.fn(() => mockDate) as any;
            global.Date.now = jest.fn(() => mockDate.getTime());

            const result = isProFeatureEnabled();

            expect(result).toBe(true);
        });

        it('should return false when current date is after MONETIZATION_START_DATE', () => {
            // Mock current date to be after monetization start date
            const mockDate = new Date('2026-02-01T00:00:00Z');
            global.Date = jest.fn(() => mockDate) as any;
            global.Date.now = jest.fn(() => mockDate.getTime());

            const result = isProFeatureEnabled();

            expect(result).toBe(false);
        });

        it('should return false when current date exactly equals MONETIZATION_START_DATE', () => {
            // Mock current date to be exactly the monetization start date
            const mockDate = new Date('2026-01-31T00:00:00Z');
            global.Date = jest.fn(() => mockDate) as any;
            global.Date.now = jest.fn(() => mockDate.getTime());

            const result = isProFeatureEnabled();

            expect(result).toBe(false);
        });
    });

    describe('getMonetizationStartDate()', () => {
        it('should return the correct monetization start date', () => {
            const result = getMonetizationStartDate();
            
            expect(result).toBeInstanceOf(Date);
            expect(result.toISOString()).toBe('2026-01-31T00:00:00.000Z');
        });
    });

    describe('isInBetaPeriod()', () => {
        it('should return true when current date is before MONETIZATION_START_DATE', () => {
            // Mock current date to be before monetization start date
            const mockDate = new Date('2025-06-01T00:00:00Z');
            global.Date = jest.fn(() => mockDate) as any;
            global.Date.now = jest.fn(() => mockDate.getTime());

            const result = isInBetaPeriod();

            expect(result).toBe(true);
        });

        it('should return false when current date is after MONETIZATION_START_DATE', () => {
            // Mock current date to be after monetization start date
            const mockDate = new Date('2026-02-01T00:00:00Z');
            global.Date = jest.fn(() => mockDate) as any;
            global.Date.now = jest.fn(() => mockDate.getTime());

            const result = isInBetaPeriod();

            expect(result).toBe(false);
        });

        it('should return false when current date exactly equals MONETIZATION_START_DATE', () => {
            // Mock current date to be exactly the monetization start date
            const mockDate = new Date('2026-01-31T00:00:00Z');
            global.Date = jest.fn(() => mockDate) as any;
            global.Date.now = jest.fn(() => mockDate.getTime());

            const result = isInBetaPeriod();

            expect(result).toBe(false);
        });
    });

    describe('LicenseState interface', () => {
        it('should have the correct structure', async () => {
            const mockDate = new Date('2025-06-01T00:00:00Z');
            global.Date = jest.fn(() => mockDate) as any;
            global.Date.now = jest.fn(() => mockDate.getTime());

            const result = await getLicenseState();

            // Verify the interface structure
            expect(result).toHaveProperty('isPro');
            expect(result).toHaveProperty('statusMessage');
            expect(typeof result.isPro).toBe('boolean');
            expect(typeof result.statusMessage).toBe('string');
        });
    });
});
