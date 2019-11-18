"""
Tests brewblox_automation.conditions
"""

from brewblox_automation import actions, conditions


async def test_task_done(app, runtime):
    action_opts = {
        'ref': 'test-task',
        'title': 'Test Task',
        'message': 'Please test this task',
    }
    opts = {
        'ref': 'test-task',
    }
    await actions.TaskCreate.run(app, action_opts, runtime)

    assert conditions.TaskDone.is_valid(opts)
    assert not await conditions.TaskDone.check(app, opts, runtime)
    runtime['tasks'][-1]['done'] = True
    assert await conditions.TaskDone.check(app, opts, runtime)

    # Check not-created task
    opts['ref'] = 'nope'
    assert not await conditions.TaskDone.check(app, opts, runtime)
