import { Logger } from '../../utils/logger';

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let mockOutputChannel: any;

  beforeEach(() => {
    // Spy on console.log
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    // Mock output channel
    mockOutputChannel = {
      appendLine: jest.fn()
    };

    // Set up global output channel
    (global as any).revCloudBlueprintLogger = mockOutputChannel;
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    delete (global as any).revCloudBlueprintLogger;
  });

  describe('log', () => {
    it('should log message to console', () => {
      Logger.log('Test message');

      expect(consoleLogSpy).toHaveBeenCalled();
      const logMessage = consoleLogSpy.mock.calls[0][0];
      expect(logMessage).toContain('Test message');
    });

    it('should log message with data to console', () => {
      const testData = { key: 'value' };
      Logger.log('Test message', testData);

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenNthCalledWith(2, testData);
    });

    it('should log message with source prefix', () => {
      Logger.log('Test message', undefined, 'TestSource');

      const logMessage = consoleLogSpy.mock.calls[0][0];
      expect(logMessage).toContain('[TestSource]');
      expect(logMessage).toContain('Test message');
    });

    it('should log to output channel when available', () => {
      Logger.log('Test message');

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      const logMessage = mockOutputChannel.appendLine.mock.calls[0][0];
      expect(logMessage).toContain('Test message');
    });

    it('should log object data to output channel as JSON', () => {
      const testData = { key: 'value', nested: { prop: 123 } };
      Logger.log('Test message', testData);

      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining('Test message'));
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(JSON.stringify(testData, null, 2));
    });

    it('should log non-object data to output channel as string', () => {
      Logger.log('Test message', 42);

      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith(expect.stringContaining('Test message'));
      expect(mockOutputChannel.appendLine).toHaveBeenCalledWith('42');
    });

    it('should handle missing output channel gracefully', () => {
      delete (global as any).revCloudBlueprintLogger;

      expect(() => Logger.log('Test message')).not.toThrow();
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should include timestamp in log message', () => {
      Logger.log('Test message');

      const logMessage = consoleLogSpy.mock.calls[0][0];
      expect(logMessage).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });
  });

  describe('debug', () => {
    it('should not log anything (disabled for production)', () => {
      Logger.debug('Debug message');

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();
    });

    it('should not log even with data', () => {
      Logger.debug('Debug message', { data: 'test' });

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('info', () => {
    it('should log info message with INFO prefix', () => {
      Logger.info('Info message');

      const logMessage = consoleLogSpy.mock.calls[0][0];
      expect(logMessage).toContain('[INFO] Info message');
    });

    it('should log info message with data', () => {
      const testData = { status: 'ok' };
      Logger.info('Info message', testData);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
      expect(consoleLogSpy).toHaveBeenCalledWith(testData);
    });

    it('should log info message with source', () => {
      Logger.info('Info message', undefined, 'InfoSource');

      const logMessage = consoleLogSpy.mock.calls[0][0];
      expect(logMessage).toContain('[InfoSource]');
      expect(logMessage).toContain('[INFO]');
    });
  });

  describe('warn', () => {
    it('should log warning message with WARN prefix', () => {
      Logger.warn('Warning message');

      const logMessage = consoleLogSpy.mock.calls[0][0];
      expect(logMessage).toContain('[WARN] Warning message');
    });

    it('should log warning message with data', () => {
      const warnData = { issue: 'deprecation' };
      Logger.warn('Warning message', warnData);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN]'));
      expect(consoleLogSpy).toHaveBeenCalledWith(warnData);
    });

    it('should log warning message with source', () => {
      Logger.warn('Warning message', undefined, 'WarnSource');

      const logMessage = consoleLogSpy.mock.calls[0][0];
      expect(logMessage).toContain('[WarnSource]');
      expect(logMessage).toContain('[WARN]');
    });
  });

  describe('error', () => {
    it('should log error message with ERROR prefix', () => {
      Logger.error('Error message');

      const logMessage = consoleLogSpy.mock.calls[0][0];
      expect(logMessage).toContain('[ERROR] Error message');
    });

    it('should log error message with error object', () => {
      const error = new Error('Test error');
      Logger.error('Error occurred', error);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
      // Error objects are sanitized to prevent sensitive data leakage
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Error',
        message: 'Test error',
        stack: expect.stringContaining('Test error')
      }));
    });

    it('should log stack trace when error has stack', () => {
      const error = new Error('Test error');
      Logger.error('Error occurred', error);

      // Should log the error message and then the stack trace
      const calls = consoleLogSpy.mock.calls;
      const stackTraceLog = calls.find(call =>
        typeof call[0] === 'string' && call[0].includes('Stack trace:')
      );
      expect(stackTraceLog).toBeDefined();
    });

    it('should not log stack trace when error has no stack', () => {
      const error = { message: 'Error without stack' };
      Logger.error('Error occurred', error);

      const calls = consoleLogSpy.mock.calls;
      const stackTraceLog = calls.find(call =>
        typeof call[0] === 'string' && call[0].includes('Stack trace:')
      );
      expect(stackTraceLog).toBeUndefined();
    });

    it('should log error with source', () => {
      Logger.error('Error message', undefined, 'ErrorSource');

      const logMessage = consoleLogSpy.mock.calls[0][0];
      expect(logMessage).toContain('[ErrorSource]');
      expect(logMessage).toContain('[ERROR]');
    });
  });

  describe('console (deprecated)', () => {
    it('should call debug method', () => {
      const debugSpy = jest.spyOn(Logger, 'debug');

      Logger.console('Deprecated message');

      expect(debugSpy).toHaveBeenCalledWith('Deprecated message', undefined);

      debugSpy.mockRestore();
    });

    it('should pass data to debug method', () => {
      const debugSpy = jest.spyOn(Logger, 'debug');
      const testData = { old: 'data' };

      Logger.console('Deprecated message', testData);

      expect(debugSpy).toHaveBeenCalledWith('Deprecated message', testData);

      debugSpy.mockRestore();
    });
  });

  describe('circular reference handling', () => {
    it('should handle circular references in objects without stack overflow', () => {
      // Create an object with circular reference
      const obj: any = { name: 'test' };
      obj.self = obj; // Circular reference
      obj.nested = { parent: obj }; // Another circular reference

      // This should not throw "Maximum call stack size exceeded"
      expect(() => {
        Logger.log('Test circular', obj);
      }).not.toThrow();

      // Verify it was logged
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle circular references in error objects', () => {
      // Create an error with circular reference (like Axios errors)
      const error: any = new Error('Test error');
      error.config = { url: 'https://api.example.com' };
      error.config.error = error; // Circular reference

      // This should not throw "Maximum call stack size exceeded"
      expect(() => {
        Logger.error('Error with circular ref', error);
      }).not.toThrow();

      // Verify it was logged
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should replace circular references with placeholder text', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;

      Logger.log('Circular test', obj);

      // The second call should have the sanitized object
      const loggedData = consoleLogSpy.mock.calls[1][0];
      expect(JSON.stringify(loggedData)).toContain('[Circular Reference]');
    });
  });
});
