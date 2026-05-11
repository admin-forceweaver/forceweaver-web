module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    collectCoverageFrom: [
        'src/salesforce/auth.ts',
        'src/apex/executor.ts',
        'src/test/comparator.ts',
        'src/salesforce/api.ts',
        'src/snapshot/creator.ts',
        'src/services/*.ts',
        'src/config/*.ts',
        'src/ui/*.ts',
        'src/test/runner.ts',
        'src/extension.ts',
        '!src/**/*.d.ts',
        '!src/__tests__/**',
        '!src/__mocks__/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
    moduleNameMapper: {
        '^vscode$': '<rootDir>/src/__mocks__/vscode.ts'
    },
    testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/out/',
        '<rootDir>/coverage/'
    ],
    transform: {
        '^.+\\.ts$': 'ts-jest'
    },
    collectCoverage: true,
    coverageThreshold: {
        global: {
            branches: 25,
            functions: 30,
            lines: 30,
            statements: 30
        }
    }
};