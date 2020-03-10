import { AutomationProcess, AutomationTask } from '../src/types';
import { lastErrors, validateProcess, validateTask } from '../src/validation';

describe('object validation', () => {
  it('should validate tasks', () => {
    const task: AutomationTask = {
      id: 'test-task',
      ref: 'testing',
      title: 'Test Task',
      message: 'hello this is task',
      status: 'Created',
      source: {
        runtimeId: 'testRT',
        stepId: 'test-step',
      },
    };

    expect(validateTask(task)).toBe(true);
    expect(validateTask({} as any)).toBe(false);
    expect(validateTask({ ...task, extra: true } as any)).toBe(true);
  });

  it('should validate processes', () => {
    const proc: AutomationProcess = {
      id: 'test-process',
      start: new Date().getTime(),
      end: null,
      status: 'Created',
      title: 'Test Process',
      steps: [{
        id: 'step-one',
        title: 'Step One',
        enabled: true,
        actions: [{
          id: 'action-one',
          title: 'Action one',
          enabled: true,
          impl: {
            type: 'TaskCreate',
            ref: 'tasky',
            title: 'Created task',
            message: 'Beep boop I am robot',
          },
        }],
        transitions: [{
          id: 'transition-one',
          next: true,
          enabled: true,
          conditions: [{
            id: 'condition-one',
            title: 'Condition one',
            enabled: false,
            impl: {
              type: 'TimeAbsolute',
              time: new Date().getTime(),
            },
          }],
        }],
      }],
      results: [{
        id: 'result-one',
        title: 'Result one',
        stepId: 'step-one',
        start: new Date().getTime(),
        end: null,
        status: 'Cancelled',
      }],
    };

    validateProcess(proc);
    expect(lastErrors()).toEqual([]);
    expect(validateProcess(proc)).toBe(true);
    expect(validateProcess({} as any)).toBe(false);
    expect(validateProcess({ ...proc, extra: true } as any)).toBe(true);
  });
});
