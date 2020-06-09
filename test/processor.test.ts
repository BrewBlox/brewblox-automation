import last from 'lodash/last';
import { v4 as uid } from 'uuid';

import { getHandler } from '../src/handlers';
import { nextUpdateResult } from '../src/processor';
import {
  AutomationAction,
  AutomationCondition,
  AutomationProcess,
  AutomationStepResult,
  AutomationTransition,
} from '../src/types';

const mockPrepare = jest.fn();
const mockApply = jest.fn();
const mockCheck = jest.fn();

const mockGetHandler = (getHandler as jest.MockedFunction<any>);

jest.mock('../src/handlers');

type PartialResult = Partial<AutomationStepResult>;

describe('Generate next update results (happy flow)', () => {
  beforeEach(() => {
    mockPrepare
      .mockResolvedValue(undefined)
      .mockClear();
    mockApply
      .mockResolvedValue(undefined)
      .mockClear();
    mockCheck
      .mockResolvedValue(true)
      .mockClear();
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

    expect(await nextUpdateResult(proc)).toBeNull();

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

  it('Should evaluate transitions', async () => {
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
    const fullTransition: AutomationTransition = {
      id: uid(),
      enabled: true,
      next: false,
      conditions: [condition],
    };
    const emptyTransition: AutomationTransition = {
      id: uid(),
      enabled: true,
      next: stepId,
      conditions: [],
    };
    const proc: AutomationProcess = {
      id: uid(),
      title: 'Test process',
      steps: [{
        id: stepId,
        title: 'steppy',
        preconditions: [],
        actions: [],
        transitions: [
          fullTransition,
          emptyTransition,
        ],
      }],
      results,
    };

    // full transition should first evaluate false
    // empty transition then restarts the step
    // full transition then ends the process
    mockCheck
      .mockReturnValueOnce(false)
      .mockReturnValue(true);

    // phase -> created
    results.push(await nextUpdateResult(proc));
    // phase -> preconditions
    results.push(await nextUpdateResult(proc));
    // phase -> actions
    results.push(await nextUpdateResult(proc));
    // phase -> transitions
    results.push(await nextUpdateResult(proc));
    expect(last(results)).toMatchObject<PartialResult>({
      phase: 'Transitions',
      status: 'Active',
    });

    // empty transition restarted the step
    results.push(await nextUpdateResult(proc));
    expect(mockCheck.mock.calls.length).toBe(1);
    expect(last(results)).toMatchObject<PartialResult>({
      stepId,
      phase: 'Created',
      status: 'Active',
    });

    // phase -> preconditions
    results.push(await nextUpdateResult(proc));
    // phase -> actions
    results.push(await nextUpdateResult(proc));
    // phase -> transitions
    results.push(await nextUpdateResult(proc));
    expect(last(results)).toMatchObject<PartialResult>({
      phase: 'Transitions',
      status: 'Active',
    });

    // check returns true again, full transition points towards proc end
    results.push(await nextUpdateResult(proc));
    expect(last(results)).toMatchObject<PartialResult>({
      phase: 'Finished',
      status: 'Finished',
    });
    expect(mockCheck.mock.calls.length).toBe(2);

    expect(await nextUpdateResult(proc)).toBeNull();
  });
});

describe('Generate next update results (error flow)', () => {
  beforeEach(() => {
    mockPrepare
      .mockResolvedValue(undefined)
      .mockClear();
    mockApply
      .mockResolvedValue(undefined)
      .mockClear();
    mockCheck
      .mockResolvedValue(true)
      .mockClear();
    mockGetHandler
      .mockReturnValue({
        prepare: mockPrepare,
        apply: mockApply,
        check: mockCheck,
      });
  });

  it('Should generate error results once', async () => {
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

    mockCheck.mockImplementation(() => {
      throw new Error('Implementation not here. Go away.');
    });

    // phase -> created
    results.push(await nextUpdateResult(proc));
    // phase -> preconditions
    results.push(await nextUpdateResult(proc));
    // phase -> preconditions (error)
    results.push(await nextUpdateResult(proc));
    expect(last(results)).toMatchObject<PartialResult>({
      phase: 'Preconditions',
      status: 'Active',
      error: 'Implementation not here. Go away.',
    });

    expect(await nextUpdateResult(proc)).toBeNull();

    // return to normal
    mockCheck.mockResolvedValue(true);

    // business as usual
    results.push(await nextUpdateResult(proc));
    expect(last(results)).toMatchObject<PartialResult>({
      phase: 'Actions',
      status: 'Active',
    });
  });
});
