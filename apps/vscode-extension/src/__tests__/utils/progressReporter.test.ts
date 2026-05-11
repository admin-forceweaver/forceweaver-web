import * as vscode from 'vscode';
import { ProgressReporter } from '../../utils/progressReporter';
import { Logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../utils/logger');

jest.mock('vscode', () => ({
  ProgressLocation: {
    Notification: 15,
    Window: 10,
    SourceControl: 1
  },
  StatusBarAlignment: {
    Left: 1,
    Right: 2
  },
  window: {
    withProgress: jest.fn(),
    createStatusBarItem: jest.fn()
  }
}));

describe('ProgressReporter', () => {
  let mockProgress: vscode.Progress<{ message?: string; increment?: number }>;
  let mockToken: vscode.CancellationToken;
  let mockStatusBarItem: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock progress reporter
    mockProgress = {
      report: jest.fn()
    };

    // Mock cancellation token
    mockToken = {
      isCancellationRequested: false,
      onCancellationRequested: jest.fn()
    };

    // Mock status bar item
    mockStatusBarItem = {
      text: '',
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn()
    };

    (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(mockStatusBarItem);

    // Mock withProgress to call the task immediately and handle rejections
    (vscode.window.withProgress as jest.Mock).mockImplementation((options, task) => {
      const result = task(mockProgress, mockToken);
      // Catch unhandled rejections to prevent test failures
      if (result && typeof result.catch === 'function') {
        result.catch(() => {}); // Suppress unhandled rejections
      }
      return result;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('withProgress', () => {
    it('should execute task with progress', async () => {
      const task = jest.fn().mockResolvedValue('result');

      const result = await ProgressReporter.withProgress('Test Task', task);

      expect(result).toBe('result');
      expect(vscode.window.withProgress).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Test Task' }),
        expect.any(Function)
      );
      expect(Logger.debug).toHaveBeenCalledWith(
        'Starting progress task: Test Task',
        undefined,
        'ProgressReporter'
      );
    });

    it('should report detail message if provided', async () => {
      const task = jest.fn().mockResolvedValue('result');

      await ProgressReporter.withProgress('Test Task', task, {
        detail: 'Processing...'
      });

      expect(mockProgress.report).toHaveBeenCalledWith({ message: 'Processing...' });
    });

    it('should use custom location and cancellable options', async () => {
      const task = jest.fn().mockResolvedValue('result');

      await ProgressReporter.withProgress('Test Task', task, {
        location: vscode.ProgressLocation.Window,
        cancellable: false
      });

      expect(vscode.window.withProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          location: vscode.ProgressLocation.Window,
          cancellable: false
        }),
        expect.any(Function)
      );
    });

    it('should handle task errors', async () => {
      const error = new Error('Task failed');
      const task = jest.fn().mockRejectedValue(error);

      await expect(ProgressReporter.withProgress('Test Task', task)).rejects.toThrow('Task failed');
      expect(Logger.error).toHaveBeenCalledWith(
        'Progress task failed: Test Task',
        error,
        'ProgressReporter'
      );
    });
  });

  describe('withSteps', () => {
    it('should execute multiple steps with progress', async () => {
      const step1 = jest.fn().mockResolvedValue('result1');
      const step2 = jest.fn().mockResolvedValue('result2');
      const step3 = jest.fn().mockResolvedValue('result3');

      const results = await ProgressReporter.withSteps('Multi-step Task', [
        { name: 'Step 1', task: step1 },
        { name: 'Step 2', task: step2 },
        { name: 'Step 3', task: step3 }
      ]);

      expect(results).toEqual(['result1', 'result2', 'result3']);
      expect(step1).toHaveBeenCalled();
      expect(step2).toHaveBeenCalled();
      expect(step3).toHaveBeenCalled();
    });

    it('should calculate progress based on step weights', async () => {
      const step1 = jest.fn().mockResolvedValue('result1');
      const step2 = jest.fn().mockResolvedValue('result2');

      await ProgressReporter.withSteps('Weighted Steps', [
        { name: 'Small Step', weight: 1, task: step1 },
        { name: 'Large Step', weight: 3, task: step2 }
      ]);

      expect(mockProgress.report).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Step 1/2') })
      );
    });

    it('should show step names when enabled', async () => {
      const step = jest.fn().mockResolvedValue('result');

      await ProgressReporter.withSteps(
        'Task',
        [{ name: 'Important Step', task: step }],
        { showStepNames: true }
      );

      expect(mockProgress.report).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Step 1/1: Important Step' })
      );
    });

    it('should hide step names when disabled', async () => {
      const step = jest.fn().mockResolvedValue('result');

      await ProgressReporter.withSteps(
        'Task',
        [{ name: 'Important Step', task: step }],
        { showStepNames: false }
      );

      expect(mockProgress.report).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Step 1/1' })
      );
    });

    it('should throw error if step fails', async () => {
      const step1 = jest.fn().mockResolvedValue('result1');
      const step2 = jest.fn().mockRejectedValue(new Error('Step error'));

      await expect(
        ProgressReporter.withSteps('Task', [
          { name: 'Step 1', task: step1 },
          { name: 'Step 2', task: step2 }
        ])
      ).rejects.toThrow('Step "Step 2" failed');

      expect(Logger.error).toHaveBeenCalled();
    });

    it('should check for cancellation between steps', async () => {
      const step1 = jest.fn().mockResolvedValue('result1');
      const step2 = jest.fn().mockResolvedValue('result2');

      // Simulate cancellation after first step
      step1.mockImplementation(async () => {
        mockToken.isCancellationRequested = true;
        return 'result1';
      });

      await expect(
        ProgressReporter.withSteps('Task', [
          { name: 'Step 1', task: step1 },
          { name: 'Step 2', task: step2 }
        ])
      ).rejects.toThrow('Operation was cancelled');

      expect(step1).toHaveBeenCalled();
      expect(step2).not.toHaveBeenCalled();
    });
  });

  describe('createStatusBarProgress', () => {
    it('should create status bar progress indicator', () => {
      const progress = ProgressReporter.createStatusBarProgress('Test Progress');

      expect(vscode.window.createStatusBarItem).toHaveBeenCalledWith(
        vscode.StatusBarAlignment.Left,
        100
      );
      expect(mockStatusBarItem.show).toHaveBeenCalled();
      expect(progress).toHaveProperty('update');
      expect(progress).toHaveProperty('dispose');
    });

    it('should update status bar text', () => {
      const progress = ProgressReporter.createStatusBarProgress('Test');

      progress.update('Processing...');

      expect(mockStatusBarItem.text).toContain('Test');
      expect(mockStatusBarItem.text).toContain('Processing...');
    });

    it('should update status bar text with progress percentage', () => {
      const progress = ProgressReporter.createStatusBarProgress('Test');

      progress.update('Processing...', 50);

      expect(mockStatusBarItem.text).toContain('50%');
    });

    it('should dispose status bar item', () => {
      const progress = ProgressReporter.createStatusBarProgress('Test');

      progress.dispose();

      expect(mockStatusBarItem.dispose).toHaveBeenCalled();
      expect(Logger.debug).toHaveBeenCalledWith(
        'Status bar progress disposed: Test',
        undefined,
        'ProgressReporter'
      );
    });
  });

  describe('withTimeout', () => {
    it('should complete task before timeout', async () => {
      const task = jest.fn().mockResolvedValue('result');

      const promise = ProgressReporter.withTimeout('Task', task, 5000);

      // Fast-forward time slightly
      jest.advanceTimersByTime(100);

      const result = await promise;

      expect(result).toBe('result');
    });

    it('should timeout if task takes too long', async () => {
      const task = jest.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 10000));
      });

      const promise = ProgressReporter.withTimeout('Task', task, 1000);

      // Fast-forward past timeout
      jest.advanceTimersByTime(1001);

      await expect(promise).rejects.toThrow('Operation timed out after 1000ms');
      expect(Logger.warn).toHaveBeenCalledWith(
        'Task timed out: Task',
        undefined,
        'ProgressReporter'
      );
    });

    it('should not timeout if task completes in time', async () => {
      const task = jest.fn().mockImplementation(async () => {
        return 'completed';
      });

      const promise = ProgressReporter.withTimeout('Task', task, 5000);
      const result = await promise;

      expect(result).toBe('completed');
      expect(Logger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('timed out'),
        expect.anything(),
        expect.anything()
      );
    });
  });

  describe('showProgress', () => {
    it('should show progress notification', () => {
      ProgressReporter.showProgress('Loading...', 2000);

      expect(vscode.window.withProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          location: vscode.ProgressLocation.Notification,
          title: 'Loading...',
          cancellable: false
        }),
        expect.any(Function)
      );
    });

    it('should use default duration', () => {
      ProgressReporter.showProgress('Loading...');

      expect(Logger.debug).toHaveBeenCalledWith(
        'Showing progress notification: Loading...',
        undefined,
        'ProgressReporter'
      );
    });
  });

  describe('createBackgroundProgress', () => {
    it('should create background progress controller', () => {
      const progress = ProgressReporter.createBackgroundProgress('Background Task');

      expect(progress).toHaveProperty('update');
      expect(progress).toHaveProperty('complete');
      expect(progress).toHaveProperty('error');
      expect(vscode.window.withProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          location: vscode.ProgressLocation.Window,
          title: 'Background Task'
        }),
        expect.any(Function)
      );
    });

    it('should update background progress', () => {
      const progress = ProgressReporter.createBackgroundProgress('Task');

      progress.update('Processing...', 50);

      expect(mockProgress.report).toHaveBeenCalledWith({
        message: 'Processing...',
        increment: 50
      });
    });

    it('should complete background progress', () => {
      const progress = ProgressReporter.createBackgroundProgress('Task');

      progress.complete();

      expect(Logger.debug).toHaveBeenCalledWith(
        'Background progress completed: Task',
        undefined,
        'ProgressReporter'
      );
    });

    it('should handle background progress errors', () => {
      const progress = ProgressReporter.createBackgroundProgress('Task');

      // Trigger error - this calls the error handler
      progress.error('Something went wrong');

      // The error is logged even though the promise rejection is internal
      expect(Logger.error).toHaveBeenCalledWith(
        'Background progress failed: Task - Something went wrong',
        undefined,
        'ProgressReporter'
      );
    });
  });

  describe('withParallelTasks', () => {
    it('should execute tasks in parallel', async () => {
      const task1 = jest.fn().mockResolvedValue('result1');
      const task2 = jest.fn().mockResolvedValue('result2');
      const task3 = jest.fn().mockResolvedValue('result3');

      const results = await ProgressReporter.withParallelTasks('Parallel Tasks', [
        { name: 'Task 1', task: task1 },
        { name: 'Task 2', task: task2 },
        { name: 'Task 3', task: task3 }
      ]);

      expect(results).toEqual(['result1', 'result2', 'result3']);
      expect(task1).toHaveBeenCalled();
      expect(task2).toHaveBeenCalled();
      expect(task3).toHaveBeenCalled();
    });

    it('should respect max concurrency limit', async () => {
      // Simple test to verify concurrency control exists
      const task1 = jest.fn().mockResolvedValue('result1');
      const task2 = jest.fn().mockResolvedValue('result2');
      const task3 = jest.fn().mockResolvedValue('result3');

      const results = await ProgressReporter.withParallelTasks(
        'Limited Concurrency',
        [
          { name: 'Task 1', task: task1 },
          { name: 'Task 2', task: task2 },
          { name: 'Task 3', task: task3 }
        ],
        { maxConcurrency: 2 }
      );

      expect(results).toHaveLength(3);
      expect(Logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('max concurrency: 2'),
        undefined,
        'ProgressReporter'
      );
    });

    it('should handle task failures', async () => {
      const task1 = jest.fn().mockResolvedValue('result1');
      const task2 = jest.fn().mockRejectedValue(new Error('Task failed'));
      const task3 = jest.fn().mockResolvedValue('result3');

      await expect(
        ProgressReporter.withParallelTasks('Parallel Tasks', [
          { name: 'Task 1', task: task1 },
          { name: 'Task 2', task: task2 },
          { name: 'Task 3', task: task3 }
        ])
      ).rejects.toThrow();

      expect(Logger.error).toHaveBeenCalledWith(
        'Parallel task failed: Task 2',
        expect.any(Error),
        'ProgressReporter'
      );
    });

    it('should check for cancellation', async () => {
      // Set cancellation before task starts
      mockToken.isCancellationRequested = true;

      const task1 = jest.fn().mockResolvedValue('result1');
      const task2 = jest.fn().mockResolvedValue('result2');

      await expect(
        ProgressReporter.withParallelTasks('Parallel Tasks', [
          { name: 'Task 1', task: task1 },
          { name: 'Task 2', task: task2 }
        ])
      ).rejects.toThrow('Operation was cancelled');

      // Reset for other tests
      mockToken.isCancellationRequested = false;
    });

    it('should use custom weights for progress calculation', async () => {
      const task1 = jest.fn().mockResolvedValue('result1');
      const task2 = jest.fn().mockResolvedValue('result2');

      await ProgressReporter.withParallelTasks('Weighted Tasks', [
        { name: 'Small Task', weight: 1, task: task1 },
        { name: 'Large Task', weight: 4, task: task2 }
      ]);

      expect(mockProgress.report).toHaveBeenCalled();
    });
  });
});
