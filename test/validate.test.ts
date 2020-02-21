import { AutomationProcess, AutomationRuntime, AutomationTask } from '../src/types';
import { lastErrors, validateProcess, validateRuntime, validateTask } from '../src/validation';

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
        conditions: [{
          id: 'condition-one',
          title: 'Condition one',
          enabled: false,
          impl: {
            type: 'TimeAbsolute',
            time: new Date().getTime(),
          },
        }],
        notes: [{
          id: 'note-one',
          title: 'Very important note',
          message: 'Bring cookies',
        }],
      }],
    };

    validateProcess(proc);
    expect(lastErrors()).toEqual([]);
    expect(validateProcess(proc)).toBe(true);
    expect(validateProcess({} as any)).toBe(false);
    expect(validateProcess({ ...proc, extra: true } as any)).toBe(true);
  });

  it('should validate runtimes', () => {
    const now = new Date().getTime();
    const rt: AutomationRuntime = {
      id: 'rt-one',
      title: 'Runtime one',
      start: now - 1000,
      end: null,
      status: 'Started',
      processId: 'test-process',
      results: [{
        id: 'result-1',
        title: 'Step one result',
        stepId: 'step-one',
        start: now - 1000,
        end: now - 100,
        status: 'Done',
      }],
    };

    expect(validateRuntime(rt)).toBe(true);
    expect(validateRuntime({} as any)).toBe(false);
    expect(validateRuntime({ ...rt, extra: true } as any)).toBe(true);
  });
});
