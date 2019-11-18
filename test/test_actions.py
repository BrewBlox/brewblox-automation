"""
Tests brewblox_automation.actions
"""

from brewblox_automation import actions


async def test_task_create(app, runtime):
    opts = {
        'ref': 'test-task',
        'title': 'Test Task',
        'message': 'Please test this task',
    }
    assert actions.TaskCreate.is_valid(opts)
    await actions.TaskCreate.run(app, opts, runtime)
    assert runtime['tasks'][-1] == {
        **opts,
        'done': False
    }
