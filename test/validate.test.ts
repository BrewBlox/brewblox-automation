import { AutomationProcess, AutomationRuntime, AutomationTask } from '../src/types';
import { validateProcess, validateRuntime, validateTask } from '../src/validation';

describe('object validation', () => {
  it('should validate tasks', () => {
    const task: AutomationTask = {
      id: 'test-task',
      ref: 'testing',
      title: 'Test Task',
      source: 'jesttasktest',
      message: 'hello this is task',
      status: 'Created',
    };

    expect(validateTask(task)).toBe(true);
    expect(validateTask({})).toBe(false);
    expect(validateTask({ ...task, extra: true })).toBe(true);
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
          type: 'ActionOneType',
          enabled: true,
          opts: {},
        }],
        conditions: [{
          id: 'condition-one',
          type: 'ConditionOneType',
          enabled: false,
          opts: {},
        }],
        notes: [{
          title: 'Very important note',
          message: 'Bring cookies',
        }],
      }],
    };

    expect(validateProcess(proc)).toBe(true);
    expect(validateProcess({})).toBe(false);
    expect(validateProcess({ ...proc, extra: true })).toBe(true);
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
    expect(validateRuntime({})).toBe(false);
    expect(validateRuntime({ ...rt, extra: true })).toBe(true);
  });
});
