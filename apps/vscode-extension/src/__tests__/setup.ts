// Test setup file - runs before each test suite

import * as vscode from '../__mocks__/vscode';

// Mock Node.js built-in modules
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue('{"test": "data"}'),
  readdirSync: jest.fn().mockReturnValue([]),
  statSync: jest.fn().mockReturnValue({
    mtime: new Date(),
    isDirectory: jest.fn().mockReturnValue(false)
  }),
  unlinkSync: jest.fn()
}));

jest.mock('path', () => ({
  resolve: jest.fn().mockImplementation((...paths) => paths.join('/')),
  join: jest.fn().mockImplementation((...paths) => paths.join('/')),
  basename: jest.fn().mockImplementation((path: string) => path.split('/').pop()),
  dirname: jest.fn().mockImplementation((path: string) => path.split('/').slice(0, -1).join('/'))
}));

// Mock child_process and util - these will be properly configured in individual test files
jest.mock('child_process');
jest.mock('util');

jest.mock('axios', () => ({
  create: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({ data: { totalSize: 0, done: true, records: [] } }),
    post: jest.fn().mockResolvedValue({ data: { success: true, id: 'test-id' } }),
    interceptors: {
      request: {
        use: jest.fn()
      },
      response: {
        use: jest.fn()
      }
    }
  }),
  get: jest.fn(),
  post: jest.fn()
}));

// Global test utilities
(global as any).mockVscode = vscode;

// Suppress console logs during tests unless needed
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
};

// Set test environment variables
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(10000);
