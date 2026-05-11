import * as vscode from 'vscode';
import { Logger } from './logger';

/**
 * Centralized progress reporting utility for consistent UX
 * Provides standardized progress reporting across all long-running operations
 */
export class ProgressReporter {
    private static readonly DEFAULT_LOCATION = vscode.ProgressLocation.Notification;
    private static readonly DEFAULT_CANCELLABLE = true;

    /**
     * Execute a task with progress reporting
     */
    static async withProgress<T>(
        title: string,
        task: (progress: vscode.Progress<{ message?: string; increment?: number }>, token: vscode.CancellationToken) => Promise<T>,
        options: {
            location?: vscode.ProgressLocation;
            cancellable?: boolean;
            detail?: string;
        } = {}
    ): Promise<T> {
        const {
            location = this.DEFAULT_LOCATION,
            cancellable = this.DEFAULT_CANCELLABLE,
            detail
        } = options;

        Logger.debug(`Starting progress task: ${title}`, undefined, 'ProgressReporter');

        return vscode.window.withProgress(
            {
                location,
                title,
                cancellable
            },
            async (progress, token) => {
                try {
                    if (detail) {
                        progress.report({ message: detail });
                    }

                    const result = await task(progress, token);
                    
                    Logger.debug(`Progress task completed: ${title}`, undefined, 'ProgressReporter');
                    return result;
                } catch (error: any) {
                    Logger.error(`Progress task failed: ${title}`, error, 'ProgressReporter');
                    throw error;
                }
            }
        );
    }

    /**
     * Execute a multi-step task with automatic progress calculation
     */
    static async withSteps<T>(
        title: string,
        steps: Array<{
            name: string;
            weight?: number; // Relative weight of this step (default: 1)
            task: (progress: vscode.Progress<{ message?: string; increment?: number }>, token: vscode.CancellationToken) => Promise<any>;
        }>,
        options: {
            location?: vscode.ProgressLocation;
            cancellable?: boolean;
            showStepNames?: boolean;
        } = {}
    ): Promise<T[]> {
        const {
            location = this.DEFAULT_LOCATION,
            cancellable = this.DEFAULT_CANCELLABLE,
            showStepNames = true
        } = options;

        // Calculate total weight
        const totalWeight = steps.reduce((sum, step) => sum + (step.weight || 1), 0);
        let completedWeight = 0;

        Logger.debug(`Starting multi-step task: ${title} (${steps.length} steps)`, undefined, 'ProgressReporter');

        return vscode.window.withProgress(
            {
                location,
                title,
                cancellable
            },
            async (progress, token) => {
                const results: T[] = [];

                for (let i = 0; i < steps.length; i++) {
                    const step = steps[i];
                    const stepWeight = step.weight || 1;
                    
                    // Check for cancellation
                    if (token.isCancellationRequested) {
                        throw new Error('Operation was cancelled');
                    }

                    try {
                        // Report step start
                        const stepMessage = showStepNames 
                            ? `Step ${i + 1}/${steps.length}: ${step.name}`
                            : `Step ${i + 1}/${steps.length}`;
                        
                        progress.report({ message: stepMessage });
                        Logger.debug(`Executing step: ${step.name}`, undefined, 'ProgressReporter');

                        // Create a sub-progress reporter for this step
                        const stepProgressReporter: vscode.Progress<{ message?: string; increment?: number }> = {
                            report: (value) => {
                                const stepIncrement = value.increment 
                                    ? (value.increment / 100) * (stepWeight / totalWeight) * 100
                                    : 0;
                                
                                progress.report({
                                    message: value.message ? `${stepMessage} - ${value.message}` : stepMessage,
                                    increment: stepIncrement
                                });
                            }
                        };

                        // Execute the step
                        const result = await step.task(stepProgressReporter, token);
                        results.push(result);

                        // Update completed weight
                        completedWeight += stepWeight;
                        const totalProgress = (completedWeight / totalWeight) * 100;
                        
                        Logger.debug(`Step completed: ${step.name} (${Math.round(totalProgress)}%)`, undefined, 'ProgressReporter');

                    } catch (error: any) {
                        Logger.error(`Step failed: ${step.name}`, error, 'ProgressReporter');
                        throw new Error(`Step "${step.name}" failed: ${error.message}`);
                    }
                }

                Logger.debug(`Multi-step task completed: ${title}`, undefined, 'ProgressReporter');
                return results;
            }
        );
    }

    /**
     * Show progress in status bar
     */
    static createStatusBarProgress(title: string): {
        update: (message: string, progress?: number) => void;
        dispose: () => void;
    } {
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        statusBarItem.show();

        Logger.debug(`Status bar progress created: ${title}`, undefined, 'ProgressReporter');

        return {
            update: (message: string, progress?: number) => {
                const progressText = progress !== undefined ? ` (${Math.round(progress)}%)` : '';
                statusBarItem.text = `$(sync~spin) ${title}: ${message}${progressText}`;
                Logger.debug(`Status bar updated: ${message}${progressText}`, undefined, 'ProgressReporter');
            },
            dispose: () => {
                statusBarItem.dispose();
                Logger.debug(`Status bar progress disposed: ${title}`, undefined, 'ProgressReporter');
            }
        };
    }

    /**
     * Execute a task with timeout and progress
     */
    static async withTimeout<T>(
        title: string,
        task: (progress: vscode.Progress<{ message?: string; increment?: number }>, token: vscode.CancellationToken) => Promise<T>,
        timeoutMs: number,
        options: {
            location?: vscode.ProgressLocation;
            cancellable?: boolean;
        } = {}
    ): Promise<T> {
        const {
            location = this.DEFAULT_LOCATION,
            cancellable = this.DEFAULT_CANCELLABLE
        } = options;

        Logger.debug(`Starting task with timeout: ${title} (${timeoutMs}ms)`, undefined, 'ProgressReporter');

        return new Promise<T>((resolve, reject) => {
            let completed = false;
            
            // Set up timeout
            const timeoutHandle = setTimeout(() => {
                if (!completed) {
                    completed = true;
                    Logger.warn(`Task timed out: ${title}`, undefined, 'ProgressReporter');
                    reject(new Error(`Operation timed out after ${timeoutMs}ms`));
                }
            }, timeoutMs);

            // Execute task with progress
            this.withProgress(title, task, { location, cancellable })
                .then(result => {
                    if (!completed) {
                        completed = true;
                        clearTimeout(timeoutHandle);
                        resolve(result);
                    }
                })
                .catch(error => {
                    if (!completed) {
                        completed = true;
                        clearTimeout(timeoutHandle);
                        reject(error);
                    }
                });
        });
    }

    /**
     * Show a simple progress notification
     */
    static showProgress(message: string, durationMs: number = 3000): void {
        Logger.debug(`Showing progress notification: ${message}`, undefined, 'ProgressReporter');
        
        vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: message,
                cancellable: false
            },
            async (progress) => {
                return new Promise<void>(resolve => {
                    setTimeout(() => {
                        resolve();
                    }, durationMs);
                });
            }
        );
    }

    /**
     * Create a long-running background task progress
     */
    static createBackgroundProgress(title: string): {
        update: (message?: string, increment?: number) => void;
        complete: () => void;
        error: (errorMessage: string) => void;
    } {
        let progressResolve: (() => void) | null = null;
        let progressReject: ((error: Error) => void) | null = null;
        let currentProgress: vscode.Progress<{ message?: string; increment?: number }> | null = null;

        // Start the progress
        const progressPromise = vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Window,
                title,
                cancellable: false
            },
            async (progress) => {
                currentProgress = progress;
                return new Promise<void>((resolve, reject) => {
                    progressResolve = resolve;
                    progressReject = reject;
                });
            }
        );

        Logger.debug(`Background progress created: ${title}`, undefined, 'ProgressReporter');

        return {
            update: (message?: string, increment?: number) => {
                if (currentProgress) {
                    currentProgress.report({ message, increment });
                    if (message) {
                        Logger.debug(`Background progress updated: ${message}`, undefined, 'ProgressReporter');
                    }
                }
            },
            complete: () => {
                if (progressResolve) {
                    progressResolve();
                    Logger.debug(`Background progress completed: ${title}`, undefined, 'ProgressReporter');
                }
            },
            error: (errorMessage: string) => {
                if (progressReject) {
                    progressReject(new Error(errorMessage));
                    Logger.error(`Background progress failed: ${title} - ${errorMessage}`, undefined, 'ProgressReporter');
                }
            }
        };
    }

    /**
     * Execute multiple tasks in parallel with combined progress
     */
    static async withParallelTasks<T>(
        title: string,
        tasks: Array<{
            name: string;
            weight?: number;
            task: () => Promise<T>;
        }>,
        options: {
            location?: vscode.ProgressLocation;
            cancellable?: boolean;
            maxConcurrency?: number;
        } = {}
    ): Promise<T[]> {
        const {
            location = this.DEFAULT_LOCATION,
            cancellable = this.DEFAULT_CANCELLABLE,
            maxConcurrency = 5
        } = options;

        const totalWeight = tasks.reduce((sum, task) => sum + (task.weight || 1), 0);
        let completedWeight = 0;

        Logger.debug(`Starting parallel tasks: ${title} (${tasks.length} tasks, max concurrency: ${maxConcurrency})`, undefined, 'ProgressReporter');

        return vscode.window.withProgress(
            {
                location,
                title,
                cancellable
            },
            async (progress, token) => {
                const results: T[] = new Array(tasks.length);
                const executing = new Set<number>();
                let nextTaskIndex = 0;

                const executeTask = async (taskIndex: number): Promise<void> => {
                    const task = tasks[taskIndex];
                    const taskWeight = task.weight || 1;

                    try {
                        executing.add(taskIndex);
                        
                        if (token.isCancellationRequested) {
                            throw new Error('Operation was cancelled');
                        }

                        progress.report({ 
                            message: `Executing ${task.name} (${executing.size} active)` 
                        });

                        Logger.debug(`Starting parallel task: ${task.name}`, undefined, 'ProgressReporter');
                        const result = await task.task();
                        results[taskIndex] = result;

                        completedWeight += taskWeight;
                        const progressPercent = (completedWeight / totalWeight) * 100;
                        
                        progress.report({ 
                            message: `Completed ${task.name}`,
                            increment: (taskWeight / totalWeight) * 100
                        });

                        Logger.debug(`Completed parallel task: ${task.name} (${Math.round(progressPercent)}%)`, undefined, 'ProgressReporter');

                    } catch (error: any) {
                        Logger.error(`Parallel task failed: ${task.name}`, error, 'ProgressReporter');
                        throw error;
                    } finally {
                        executing.delete(taskIndex);
                    }
                };

                // Execute tasks with concurrency control
                const promises: Promise<void>[] = [];
                
                while (nextTaskIndex < tasks.length || executing.size > 0) {
                    // Start new tasks up to concurrency limit
                    while (executing.size < maxConcurrency && nextTaskIndex < tasks.length) {
                        promises.push(executeTask(nextTaskIndex));
                        nextTaskIndex++;
                    }

                    // Wait for at least one task to complete
                    if (promises.length > 0) {
                        await Promise.race(promises.filter(p => p !== undefined));
                    }
                }

                // Wait for all remaining tasks
                await Promise.all(promises);

                Logger.debug(`All parallel tasks completed: ${title}`, undefined, 'ProgressReporter');
                return results;
            }
        );
    }
}
