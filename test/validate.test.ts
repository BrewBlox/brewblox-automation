import { v4 as uid } from 'uuid';

import { AutomationProcess, AutomationTask } from '../src/types';
import { lastErrors, schemas, validate } from '../src/validation';

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

    const schema = schemas.AutomationTask;

    expect(validate(schema, task)).toBe(true);
    expect(validate(schema, {} as any)).toBe(false);
    expect(validate(schema, { ...task, extra: true } as any)).toBe(true);
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
            resetStatus: null,
          },
        }],
        actions: [{
          id: uid(),
          title: 'Action one',
          enabled: true,
          impl: {
            type: 'TaskEdit',
            ref: 'tasky',
            title: 'Created task',
            message: 'Beep boop I am robot',
            status: 'Active',
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

    const schema = schemas.AutomationProcess;

    validate(schema, proc);
    expect(lastErrors()).toEqual([]);
    expect(validate(schema, proc)).toBe(true);
    expect(validate(schema, {} as any)).toBe(false);
    expect(validate(schema, { ...proc, extra: true } as any)).toBe(true);
  });
});
