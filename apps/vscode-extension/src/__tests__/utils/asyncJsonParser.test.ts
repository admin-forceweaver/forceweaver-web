import { AsyncJsonParser } from '../../utils/asyncJsonParser';
import { Logger } from '../../utils/logger';

// Mock Logger
jest.mock('../../utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('AsyncJsonParser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('parseAsync', () => {
    it('should parse small JSON synchronously', async () => {
      const jsonString = '{"key":"value"}';
      const result = await AsyncJsonParser.parseAsync(jsonString);

      expect(result).toEqual({ key: 'value' });
      expect(Logger.debug).not.toHaveBeenCalled();
    });

    it('should parse large JSON asynchronously', async () => {
      // Create a large JSON string (>10000 characters)
      const largeObj = { data: 'x'.repeat(10000) };
      const jsonString = JSON.stringify(largeObj);

      const result = await AsyncJsonParser.parseAsync(jsonString);

      expect(result).toEqual(largeObj);
      expect(Logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Parsing large JSON asynchronously'),
        undefined,
        'AsyncJsonParser'
      );
    });

    it('should handle parsing errors', async () => {
      const invalidJson = '{ invalid json }';

      await expect(AsyncJsonParser.parseAsync(invalidJson)).rejects.toThrow('Failed to parse JSON');
      expect(Logger.error).toHaveBeenCalled();
    });

    it('should handle large JSON parsing errors', async () => {
      const largeInvalidJson = '{ invalid: '.repeat(2000);

      await expect(AsyncJsonParser.parseAsync(largeInvalidJson)).rejects.toThrow('JSON parsing failed');
    });
  });

  describe('stringifyAsync', () => {
    it('should stringify object', async () => {
      const obj = { key: 'value', number: 123 };
      const result = await AsyncJsonParser.stringifyAsync(obj);

      expect(result).toBe('{"key":"value","number":123}');
      expect(Logger.debug).toHaveBeenCalled();
    });

    it('should stringify with spacing', async () => {
      const obj = { key: 'value' };
      const result = await AsyncJsonParser.stringifyAsync(obj, 2);

      expect(result).toContain('  '); // Should have indentation
      expect(JSON.parse(result)).toEqual(obj);
    });

    it('should handle circular references', async () => {
      const obj: any = { key: 'value' };
      obj.circular = obj;

      await expect(AsyncJsonParser.stringifyAsync(obj)).rejects.toThrow('JSON stringification failed');
    });

    it('should handle stringify errors', async () => {
      // Create an object with a circular structure that will fail stringification
      const obj: any = {};
      obj.circular = obj;

      // Mock JSON.stringify to simulate an error during async stringification
      const originalStringify = JSON.stringify;
      jest.spyOn(JSON, 'stringify').mockImplementationOnce(() => {
        throw new Error('Stringify error');
      });

      await expect(AsyncJsonParser.stringifyAsync(obj)).rejects.toThrow('JSON stringification failed');

      // Restore original
      JSON.stringify = originalStringify;
    });
  });

  describe('parseWithProgress', () => {
    it('should parse small JSON with progress callback', async () => {
      const jsonString = '{"key":"value"}';
      const progressCallback = jest.fn();

      const result = await AsyncJsonParser.parseWithProgress(jsonString, progressCallback);

      expect(result).toEqual({ key: 'value' });
      expect(progressCallback).toHaveBeenCalledWith(0);
    });

    it('should parse small JSON without progress callback', async () => {
      const jsonString = '{"key":"value"}';

      const result = await AsyncJsonParser.parseWithProgress(jsonString);

      expect(result).toEqual({ key: 'value' });
    });

    it('should parse large JSON with progress updates', async () => {
      // Create very large JSON (>50000 characters)
      const largeObj = { data: 'x'.repeat(50000) };
      const jsonString = JSON.stringify(largeObj);
      const progressCallback = jest.fn();

      const result = await AsyncJsonParser.parseWithProgress(jsonString, progressCallback);

      expect(result).toEqual(largeObj);
      expect(progressCallback).toHaveBeenCalled();
      expect(Logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Parsing very large JSON with progress'),
        undefined,
        'AsyncJsonParser'
      );
    });

    it('should handle parsing errors with progress', async () => {
      const largeInvalidJson = '{ invalid: '.repeat(30000);
      const progressCallback = jest.fn();

      await expect(
        AsyncJsonParser.parseWithProgress(largeInvalidJson, progressCallback)
      ).rejects.toThrow('JSON parsing failed');
    });
  });

  describe('safeParse', () => {
    it('should parse valid JSON', async () => {
      const jsonString = '{"key":"value"}';
      const defaultValue = { default: true };

      const result = await AsyncJsonParser.safeParse(jsonString, defaultValue);

      expect(result).toEqual({ key: 'value' });
    });

    it('should return default value on parsing error', async () => {
      const invalidJson = '{ invalid }';
      const defaultValue = { default: true };

      const result = await AsyncJsonParser.safeParse(invalidJson, defaultValue);

      expect(result).toEqual(defaultValue);
      expect(Logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('JSON parsing failed'),
        expect.anything(),
        'AsyncJsonParser'
      );
    });

    it('should validate parsed object with validator', async () => {
      const jsonString = '{"key":"value"}';
      const defaultValue = { default: true };
      const validator = (obj: any) => obj.key === 'value';

      const result = await AsyncJsonParser.safeParse(jsonString, defaultValue, validator);

      expect(result).toEqual({ key: 'value' });
    });

    it('should return default value when validation fails', async () => {
      const jsonString = '{"key":"wrong"}';
      const defaultValue = { default: true };
      const validator = (obj: any) => obj.key === 'value';

      const result = await AsyncJsonParser.safeParse(jsonString, defaultValue, validator);

      expect(result).toEqual(defaultValue);
      expect(Logger.warn).toHaveBeenCalledWith(
        'Parsed JSON failed validation, using default value',
        undefined,
        'AsyncJsonParser'
      );
    });
  });

  describe('parseMultiple', () => {
    it('should parse multiple JSON strings in parallel', async () => {
      const jsonStrings = [
        '{"id":1}',
        '{"id":2}',
        '{"id":3}'
      ];

      const results = await AsyncJsonParser.parseMultiple(jsonStrings);

      expect(results).toEqual([
        { id: 1 },
        { id: 2 },
        { id: 3 }
      ]);
      expect(Logger.debug).toHaveBeenCalledWith(
        'Parsing 3 JSON strings in parallel',
        undefined,
        'AsyncJsonParser'
      );
    });

    it('should filter out failed parsing results', async () => {
      const jsonStrings = [
        '{"id":1}',
        '{ invalid }',
        '{"id":3}'
      ];

      const results = await AsyncJsonParser.parseMultiple(jsonStrings);

      expect(results).toEqual([
        { id: 1 },
        { id: 3 }
      ]);
      expect(Logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse JSON at index 1'),
        expect.anything(),
        'AsyncJsonParser'
      );
    });

    it('should handle empty array', async () => {
      const results = await AsyncJsonParser.parseMultiple([]);

      expect(results).toEqual([]);
    });
  });

  describe('deepCloneAsync', () => {
    it('should deep clone an object', async () => {
      const obj = {
        key: 'value',
        nested: {
          array: [1, 2, 3],
          deep: { value: 42 }
        }
      };

      const clone = await AsyncJsonParser.deepCloneAsync(obj);

      expect(clone).toEqual(obj);
      expect(clone).not.toBe(obj); // Different reference
      expect(clone.nested).not.toBe(obj.nested); // Deep clone
    });

    it('should handle cloning errors', async () => {
      const obj: any = { key: 'value' };
      obj.circular = obj;

      await expect(AsyncJsonParser.deepCloneAsync(obj)).rejects.toThrow('Failed to deep clone object');
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('isValidJson', () => {
    it('should return true for valid JSON', () => {
      expect(AsyncJsonParser.isValidJson('{"key":"value"}')).toBe(true);
      expect(AsyncJsonParser.isValidJson('[]')).toBe(true);
      expect(AsyncJsonParser.isValidJson('null')).toBe(true);
      expect(AsyncJsonParser.isValidJson('123')).toBe(true);
      expect(AsyncJsonParser.isValidJson('"string"')).toBe(true);
    });

    it('should return false for invalid JSON', () => {
      expect(AsyncJsonParser.isValidJson('{ invalid }')).toBe(false);
      expect(AsyncJsonParser.isValidJson('undefined')).toBe(false);
      expect(AsyncJsonParser.isValidJson('')).toBe(false);
      expect(AsyncJsonParser.isValidJson('{key: value}')).toBe(false);
    });
  });

  describe('getJsonSize', () => {
    it('should return size in bytes', () => {
      const jsonString = '{"key":"value"}';
      const size = AsyncJsonParser.getJsonSize(jsonString);

      expect(size.bytes).toBeGreaterThan(0);
      expect(size.readable).toContain('B');
    });

    it('should return size in KB', () => {
      const jsonString = 'x'.repeat(2000);
      const size = AsyncJsonParser.getJsonSize(jsonString);

      expect(size.readable).toContain('KB');
    });

    it('should return size in MB', () => {
      const jsonString = 'x'.repeat(2000000);
      const size = AsyncJsonParser.getJsonSize(jsonString);

      expect(size.readable).toContain('MB');
    });
  });

  describe('minifyAsync', () => {
    it('should minify JSON by removing whitespace', async () => {
      const jsonString = `{
        "key": "value",
        "number": 123
      }`;

      const minified = await AsyncJsonParser.minifyAsync(jsonString);

      expect(minified).toBe('{"key":"value","number":123}');
      expect(minified).not.toContain('\n');
      expect(minified).not.toContain('  ');
    });

    it('should handle minification errors', async () => {
      const invalidJson = '{ invalid }';

      await expect(AsyncJsonParser.minifyAsync(invalidJson)).rejects.toThrow('Failed to minify JSON');
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('prettifyAsync', () => {
    it('should prettify JSON with default indent', async () => {
      const jsonString = '{"key":"value","number":123}';

      const prettified = await AsyncJsonParser.prettifyAsync(jsonString);

      expect(prettified).toContain('\n');
      expect(prettified).toContain('  '); // Default indent is 2
      expect(JSON.parse(prettified)).toEqual({ key: 'value', number: 123 });
    });

    it('should prettify JSON with custom indent', async () => {
      const jsonString = '{"key":"value"}';

      const prettified = await AsyncJsonParser.prettifyAsync(jsonString, 4);

      expect(prettified).toContain('    '); // Indent of 4 spaces
    });

    it('should handle prettification errors', async () => {
      const invalidJson = '{ invalid }';

      await expect(AsyncJsonParser.prettifyAsync(invalidJson)).rejects.toThrow('Failed to prettify JSON');
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('extractPaths', () => {
    it('should extract specific paths from object', async () => {
      const obj = {
        user: {
          name: 'John',
          age: 30
        },
        settings: {
          theme: 'dark'
        }
      };

      const result = await AsyncJsonParser.extractPaths(obj, ['user.name', 'settings.theme']);

      expect(result).toEqual({
        'user.name': 'John',
        'settings.theme': 'dark'
      });
    });

    it('should handle missing paths gracefully', async () => {
      const obj = { key: 'value' };

      const result = await AsyncJsonParser.extractPaths(obj, ['missing.path', 'key']);

      // Missing paths simply don't appear in the result (no warning)
      expect(result).toEqual({
        'key': 'value'
      });
      // No warning is logged for undefined paths - they are silently skipped
    });

    it('should handle undefined values in path', async () => {
      const obj = { key: null };

      const result = await AsyncJsonParser.extractPaths(obj, ['key.nested']);

      expect(result).toEqual({});
    });

    it('should yield control periodically for large path lists', async () => {
      const obj = { key: 'value' };
      const paths = Array(250).fill('key'); // 250 paths to trigger yielding

      const result = await AsyncJsonParser.extractPaths(obj, paths);

      // All paths should return the same value
      expect(Object.keys(result).length).toBe(1);
      expect(result['key']).toBe('value');
    });
  });
});
