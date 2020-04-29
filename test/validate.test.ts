import { v4 as uid } from 'uuid';

import { AutomationProcess, AutomationTask } from '../src/types';
import { lastErrors, validateProcess, validateTask } from '../src/validation';

describe('object validation', () => {
  it('should validate tasks', () => {
    const task: AutomationTask = {
      id: uid(),
      ref: 'testing',
      title: 'Test Task',
      message: 'hello this is task',
      status: 'Created',
      processId: uid(),
      stepId: uid(),
      createdBy: 'User',
    };

    expect(validateTask(task)).toBe(true);
    expect(validateTask({} as any)).toBe(false);
    expect(validateTask({ ...task, extra: true } as any)).toBe(true);
  });

  it('should validate processes', () => {
    const procId = uid();
    const stepId = uid();
    const proc: AutomationProcess = {
      id: procId,
      title: 'Test Process',
      steps: [{
        id: stepId,
        title: 'Step One',
        preconditions: [{
          id: uid(),
          title: 'Precondition one',
          enabled: true,
          impl: {
            type: 'TaskStatus',
            ref: 'precondition-task',
            status: 'Finished',
          },
        }],
        actions: [{
          id: uid(),
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
          id: uid(),
          next: true,
          enabled: true,
          conditions: [
            {
              id: uid(),
              title: 'Wait until',
              enabled: false,
              impl: {
                type: 'TimeAbsolute',
                time: new Date().getTime(),
              },
            },
            {
              id: uid(),
              title: 'Wait for',
              enabled: true,
              impl: {
                type: 'TimeElapsed',
                start: 'Step',
                duration: 100,
              },
            },
          ],
        }],
      }],
      results: [{
        id: uid(),
        stepId: stepId,
        date: new Date().getTime(),
        phase: 'Created',
        status: 'Active',
      }],
    };

    validateProcess(proc);
    expect(lastErrors()).toEqual([]);
    expect(validateProcess(proc)).toBe(true);
    expect(validateProcess({} as any)).toBe(false);
    expect(validateProcess({ ...proc, extra: true } as any)).toBe(true);
  });
});
