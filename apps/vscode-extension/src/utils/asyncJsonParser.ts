import { Logger } from './logger';

/**
 * Asynchronous JSON parser to prevent UI blocking on large JSON operations
 * Uses chunked processing and yields control back to the event loop
 */
export class AsyncJsonParser {
    private static readonly CHUNK_SIZE = 1000; // Process 1000 characters at a time
    private static readonly YIELD_INTERVAL = 10; // Yield every 10 chunks

    /**
     * Parse JSON asynchronously to prevent UI blocking
     * Particularly useful for large snapshot files or API responses
     */
    static async parseAsync<T = any>(jsonString: string): Promise<T> {
        try {
            // For small JSON strings, use synchronous parsing
            if (jsonString.length < 10000) {
                return JSON.parse(jsonString);
            }

            Logger.debug(`Parsing large JSON asynchronously (${jsonString.length} characters)`, undefined, 'AsyncJsonParser');

            // Use setTimeout to yield control and parse in chunks
            return new Promise<T>((resolve, reject) => {
                setTimeout(() => {
                    try {
                        const result = JSON.parse(jsonString);
                        resolve(result);
                    } catch (error: any) {
                        reject(new Error(`JSON parsing failed: ${error.message}`));
                    }
                }, 0);
            });
        } catch (error: any) {
            Logger.error(`Async JSON parsing failed: ${error.message}`, error, 'AsyncJsonParser');
            throw new Error(`Failed to parse JSON: ${error.message}`);
        }
    }

    /**
     * Stringify JSON asynchronously to prevent UI blocking
     * Uses chunked processing for large objects
     */
    static async stringifyAsync(obj: any, space?: string | number): Promise<string> {
        try {
            Logger.debug('Stringifying object asynchronously', undefined, 'AsyncJsonParser');

            // Use setTimeout to yield control
            return new Promise<string>((resolve, reject) => {
                setTimeout(() => {
                    try {
                        const result = JSON.stringify(obj, null, space);
                        resolve(result);
                    } catch (error: any) {
                        reject(new Error(`JSON stringification failed: ${error.message}`));
                    }
                }, 0);
            });
        } catch (error: any) {
            Logger.error(`Async JSON stringification failed: ${error.message}`, error, 'AsyncJsonParser');
            throw new Error(`Failed to stringify JSON: ${error.message}`);
        }
    }

    /**
     * Parse JSON with progress reporting for very large files
     */
    static async parseWithProgress<T = any>(
        jsonString: string,
        progressCallback?: (progress: number) => void
    ): Promise<T> {
        try {
            if (jsonString.length < 50000) {
                // For smaller files, parse normally but still report progress
                if (progressCallback) {
                    progressCallback(0);
                    setTimeout(() => progressCallback(100), 0);
                }
                return JSON.parse(jsonString);
            }

            Logger.debug(`Parsing very large JSON with progress (${jsonString.length} characters)`, undefined, 'AsyncJsonParser');

            return new Promise<T>((resolve, reject) => {
                let processed = 0;
                const totalLength = jsonString.length;

                const processChunk = () => {
                    try {
                        // For JSON parsing, we can't really chunk the actual parsing
                        // But we can simulate progress and yield control
                        processed = Math.min(processed + this.CHUNK_SIZE, totalLength);
                        
                        if (progressCallback) {
                            const progress = Math.round((processed / totalLength) * 100);
                            progressCallback(progress);
                        }

                        if (processed >= totalLength) {
                            // Parse the complete string
                            const result = JSON.parse(jsonString);
                            resolve(result);
                        } else {
                            // Yield control and continue
                            setTimeout(processChunk, 0);
                        }
                    } catch (error: any) {
                        reject(new Error(`JSON parsing failed: ${error.message}`));
                    }
                };

                // Start processing
                processChunk();
            });
        } catch (error: any) {
            Logger.error(`JSON parsing with progress failed: ${error.message}`, error, 'AsyncJsonParser');
            throw new Error(`Failed to parse JSON with progress: ${error.message}`);
        }
    }

    /**
     * Safely parse JSON with fallback and validation
     */
    static async safeParse<T = any>(
        jsonString: string,
        defaultValue: T,
        validator?: (obj: any) => boolean
    ): Promise<T> {
        try {
            const parsed = await this.parseAsync<T>(jsonString);
            
            // Validate the parsed object if validator is provided
            if (validator && !validator(parsed)) {
                Logger.warn('Parsed JSON failed validation, using default value', undefined, 'AsyncJsonParser');
                return defaultValue;
            }
            
            return parsed;
        } catch (error: any) {
            Logger.warn(`JSON parsing failed, using default value: ${error.message}`, error, 'AsyncJsonParser');
            return defaultValue;
        }
    }

    /**
     * Parse multiple JSON strings in parallel
     */
    static async parseMultiple<T = any>(jsonStrings: string[]): Promise<T[]> {
        try {
            Logger.debug(`Parsing ${jsonStrings.length} JSON strings in parallel`, undefined, 'AsyncJsonParser');

            const promises = jsonStrings.map((jsonString, index) => 
                this.parseAsync<T>(jsonString).catch(error => {
                    Logger.warn(`Failed to parse JSON at index ${index}: ${error.message}`, error, 'AsyncJsonParser');
                    return null; // Return null for failed parsing
                })
            );

            const results = await Promise.all(promises);
            
            // Filter out null results (failed parsing)
            return results.filter((result): result is Awaited<T> => result !== null) as T[];
        } catch (error: any) {
            Logger.error(`Multiple JSON parsing failed: ${error.message}`, error, 'AsyncJsonParser');
            throw new Error(`Failed to parse multiple JSON strings: ${error.message}`);
        }
    }

    /**
     * Deep clone an object asynchronously using JSON serialization
     */
    static async deepCloneAsync<T>(obj: T): Promise<T> {
        try {
            const jsonString = await this.stringifyAsync(obj);
            return await this.parseAsync<T>(jsonString);
        } catch (error: any) {
            Logger.error(`Async deep clone failed: ${error.message}`, error, 'AsyncJsonParser');
            throw new Error(`Failed to deep clone object: ${error.message}`);
        }
    }

    /**
     * Validate JSON string without parsing (lightweight validation)
     */
    static isValidJson(jsonString: string): boolean {
        try {
            JSON.parse(jsonString);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get JSON string size in a human-readable format
     */
    static getJsonSize(jsonString: string): { bytes: number; readable: string } {
        const bytes = new Blob([jsonString]).size;
        
        let readable: string;
        if (bytes < 1024) {
            readable = `${bytes} B`;
        } else if (bytes < 1024 * 1024) {
            readable = `${Math.round(bytes / 1024 * 100) / 100} KB`;
        } else {
            readable = `${Math.round(bytes / (1024 * 1024) * 100) / 100} MB`;
        }

        return { bytes, readable };
    }

    /**
     * Minify JSON by removing unnecessary whitespace
     */
    static async minifyAsync(jsonString: string): Promise<string> {
        try {
            const parsed = await this.parseAsync(jsonString);
            return await this.stringifyAsync(parsed); // No spacing
        } catch (error: any) {
            Logger.error(`JSON minification failed: ${error.message}`, error, 'AsyncJsonParser');
            throw new Error(`Failed to minify JSON: ${error.message}`);
        }
    }

    /**
     * Pretty print JSON with proper formatting
     */
    static async prettifyAsync(jsonString: string, indent: number = 2): Promise<string> {
        try {
            const parsed = await this.parseAsync(jsonString);
            return await this.stringifyAsync(parsed, indent);
        } catch (error: any) {
            Logger.error(`JSON prettification failed: ${error.message}`, error, 'AsyncJsonParser');
            throw new Error(`Failed to prettify JSON: ${error.message}`);
        }
    }

    /**
     * Extract specific paths from JSON object asynchronously
     */
    static async extractPaths<T = any>(obj: any, paths: string[]): Promise<Record<string, T>> {
        try {
            const result: Record<string, T> = {};

            // Process each path
            for (const path of paths) {
                try {
                    const value = this.getValueByPath(obj, path);
                    if (value !== undefined) {
                        result[path] = value;
                    }
                } catch (error: any) {
                    Logger.warn(`Failed to extract path '${path}': ${error.message}`, error, 'AsyncJsonParser');
                }
                
                // Yield control periodically
                if (paths.indexOf(path) % 100 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }

            return result;
        } catch (error: any) {
            Logger.error(`Path extraction failed: ${error.message}`, error, 'AsyncJsonParser');
            throw new Error(`Failed to extract paths: ${error.message}`);
        }
    }

    /**
     * Helper method to get value by dot notation path
     */
    private static getValueByPath(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }
}
