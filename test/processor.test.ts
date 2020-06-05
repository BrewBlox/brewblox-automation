import last from 'lodash/last';
import { v4 as uid } from 'uuid';

import { getHandler } from '../src/handlers';
import { nextUpdateResult } from '../src/processor';
import { AutomationAction, AutomationCondition, AutomationProcess, AutomationStepResult } from '../src/types';

const mockPrepare = jest.fn().mockResolvedValue(undefined);
const mockApply = jest.fn().mockResolvedValue(undefined);
const mockCheck = jest.fn().mockResolvedValue(true);

const mockGetHandler = (getHandler as jest.MockedFunction<any>);

jest.mock('../src/handlers');

type PartialResult = Partial<AutomationStepResult>;

describe('Generate next update results', () => {
  beforeEach(() => {
    mockPrepare.mockClear();
    mockApply.mockClear();
    mockCheck.mockClear();
    mockGetHandler
      .mockReturnValue({
        prepare: mockPrepare,
        apply: mockApply,
        check: mockCheck,
      });
  });

  it('Should complete empty process', async () => {
    const stepId = uid();
    const results: AutomationStepResult[] = [];
    const proc: AutomationProcess = {
      id: uid(),
      title: 'Test process',
      steps: [{
        id: stepId,
        title: 'steppy',
        preconditions: [],
        actions: [],
        transitions: [],
      }],
      results,
    };

    results.push(await nextUpdateResult(proc));
    expect(last(results)).toMatchObject<PartialResult>({
      stepId,
      phase: 'Created',
      status: 'Active',
    });

    results.push(await nextUpdateResult(proc));
    expect(last(results)).toMatchObject<PartialResult>({
      stepId,
      phase: 'Preconditions',
      status: 'Active',
    });

    results.push(await nextUpdateResult(proc));
    expect(last(results)).toMatchObject<PartialResult>({
      stepId,
      phase: 'Actions',
      status: 'Active',
    });

    results.push(await nextUpdateResult(proc));
    expect(last(results)).toMatchObject<PartialResult>({
      stepId,
      phase: 'Transitions',
      status: 'Active',
    });

    results.push(await nextUpdateResult(proc));
    expect(last(results)).toMatchObject<PartialResult>({
      stepId,
      phase: 'Finished',
      status: 'Finished',
    });

    results.push(await nextUpdateResult(proc));
    expect(last(results)).toBeNull();

    expect(mockPrepare.mock.calls.length).toBe(0);
    expect(mockApply.mock.calls.length).toBe(0);
    expect(mockCheck.mock.calls.length).toBe(0);
  });

  it('Should check preconditions', async () => {
    const stepId = uid();
    const results: AutomationStepResult[] = [];
    const condition: AutomationCondition = {
      id: uid(),
      enabled: true,
      title: 'condition',
      impl: {
        type: 'TaskStatus',
        ref: '',
        resetStatus: null,
        status: 'Finished',
      },
    };
    const proc: AutomationProcess = {
      id: uid(),
      title: 'Test process',
      steps: [{
        id: stepId,
        title: 'steppy',
        preconditions: [condition],
        actions: [],
        transitions: [],
      }],
      results,
    };

    results.push(await nextUpdateResult(proc));
    expect(last(results)).toMatchObject<PartialResult>({
      phase: 'Created',
      status: 'Active',
    });

    expect(mockPrepare.mock.calls.length).toBe(0);

    results.push(await nextUpdateResult(proc));
    expect(last(results)).toMatchObject<PartialResult>({
      phase: 'Preconditions',
      status: 'Active',
    });


    expect(mockPrepare.mock.calls.length).toBe(1);
    expect(mockPrepare.mock.calls[0]).toMatchObject([
      condition,
      {
        proc,
        activeStep: proc.steps[0],
        activeResult: proc.results[proc.results.length - 2],
      },
    ]);

    results.push(await nextUpdateResult(proc));
    expect(last(results)).toMatchObject<PartialResult>({
      phase: 'Actions',
      status: 'Active',
    });

    const [checkCall] = mockCheck.mock.calls;
    expect(checkCall).toMatchObject([
      condition,
      {
        proc,
        activeStep: proc.steps[0],
        activeResult: proc.results[proc.results.length - 2],
      },
    ]);
  });

  it('Should apply actions', async () => {
    const stepId = uid();
    const results: AutomationStepResult[] = [];
    const action: AutomationAction = {
      id: uid(),
      title: 'action',
      enabled: true,
      impl: {
        type: 'BlockPatch',
        blockId: 'blocko',
        blockType: 'PID',
        serviceId: 'sparkey',
        data: {},
      },
    };
    const proc: AutomationProcess = {
      id: uid(),
      title: 'Test process',
      steps: [{
        id: stepId,
        title: 'steppy',
        preconditions: [],
        actions: [action],
        transitions: [],
      }],
      results,
    };

    results.push(await nextUpdateResult(proc));
    expect(last(results)).toMatchObject<PartialResult>({
      phase: 'Created',
      status: 'Active',
    });

    expect(mockPrepare.mock.calls.length).toBe(0);

    results.push(await nextUpdateResult(proc));
    expect(last(results)).toMatchObject<PartialResult>({
      phase: 'Preconditions',
      status: 'Active',
    });

    expect(mockPrepare.mock.calls.length).toBe(1);
    expect(mockPrepare.mock.calls[0]).toMatchObject([
      action,
      {
        proc,
        activeStep: proc.steps[0],
        activeResult: proc.results[proc.results.length - 2],
      },
    ]);

    results.push(await nextUpdateResult(proc));
    expect(last(results)).toMatchObject<PartialResult>({
      phase: 'Actions',
      status: 'Active',
    });

    expect(mockCheck.mock.calls.length).toBe(0);
    expect(mockApply.mock.calls.length).toBe(0);

    results.push(await nextUpdateResult(proc));
    expect(last(results)).toMatchObject<PartialResult>({
      phase: 'Transitions',
      status: 'Active',
    });

    expect(mockApply.mock.calls.length).toBe(1);
    expect(mockApply.mock.calls[0]).toMatchObject([
      action,
      {
        proc,
        activeStep: proc.steps[0],
        activeResult: proc.results[proc.results.length - 2],
      },
    ]);
  });
});
