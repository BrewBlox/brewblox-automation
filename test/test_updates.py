"""
Tests brewblox_stepper.updater
"""

import asyncio

import pytest
from aiohttp import web
from aresponses import ResponsesMockServer
from asynctest import CoroutineMock
from brewblox_service import http_client, scheduler

from brewblox_stepper import store, updates, utils, validation

TESTED = updates.__name__


@pytest.fixture
async def app(app, loop):
    app['config']['update_interval'] = 0.01
    http_client.setup(app)
    scheduler.setup(app)
    store.setup(app)
    updates.setup(app)

    return app


@pytest.fixture
async def update_spy(mocker):
    s = mocker.spy(updates, 'update')
    return s


@pytest.fixture
async def update_mock(mocker):
    m = mocker.patch(TESTED + '.update', CoroutineMock())
    return m


async def test_updates(app, client, update_mock, process):
    process_store = store.get_process_store(app)
    runtime_store = store.get_runtime_store(app)
    updater = updates.get_updater(app)

    await runtime_store.ready.wait()
    await asyncio.sleep(0.1)
    assert updater.active
    assert update_mock.call_count == 0

    await process_store.create(process)
    await runtime_store.start('test-process')
    await asyncio.sleep(0.1)
    assert updater.active
    assert update_mock.call_count > 0


async def test_mocked_update(app, client, mocker, update_mock, process):
    process_store = store.get_process_store(app)
    runtime_store = store.get_runtime_store(app)
    updater = updates.get_updater(app)

    s = mocker.spy(runtime_store, 'write_store')

    await process_store.create(process)
    await runtime_store.start('test-process')
    await asyncio.sleep(0.1)
    assert updater.active
    assert s.call_count > 2  # start, and updates


async def test_updater_errors(app, client, update_mock, process):
    process_store = store.get_process_store(app)
    runtime_store = store.get_runtime_store(app)
    updater = updates.get_updater(app)

    await process_store.create(process)
    await runtime_store.start('test-process')

    update_mock.side_effect = RuntimeError
    await asyncio.sleep(0.1)
    assert updater.active


async def test_update_func(app, client, process, aresponses: ResponsesMockServer):
    runtime = {
        'id': process['id'],
        'start': utils.now(),
        'end': None,
        'results': [
            {
                'name': 'step-one',
                'index': 0,
                'start': None,
                'end': None,
                'logs': []
            }
        ]
    }
    # Sanity check to update tests when data model changes
    validation.validate_runtime(runtime)

    # Action requests
    aresponses.add(
        'sparkey:5000', '/sparkey/objects/pwm-1', 'GET',
        web.json_response({'data': {'value[degC]': 20}})
    )
    aresponses.add(
        'sparkey:5000', '/sparkey/objects/pwm-1', 'PUT',
        web.json_response({})
    )
    # Run initial actions for this step
    assert await updates.update(app, process, runtime) is True
    assert runtime['results'][0]['start'] > 1e11

    # No changes
    assert await updates.update(app, process, runtime) is False

    # Satisfy the TimeElapsed and BlockValue conditions
    # Note we did not have to add a response for earlier block gets
    # Conditions are short-circuited, and stopped after TimeElapsed
    aresponses.add(
        'sparkey:5000', '/sparkey/objects/pwm-1', 'GET',
        web.json_response({'data': {'value[degC]': 60}})
    )
    runtime['results'][0]['start'] -= 2000

    # Update - will automatically advance to next step
    assert await updates.update(app, process, runtime) is True
    assert len(runtime['results']) == 2

    # This step contains a ManualAdvance condition
    assert await updates.update(app, process, runtime) is True  # set start, run actions
    assert await updates.update(app, process, runtime) is False
    assert await updates.update(app, process, runtime) is False
    assert len(runtime['results']) == 2

    # simulate manual advance
    runtime['results'][1]['end'] = runtime['results'][1]['start'] + 100
    runtime['results'].append({
        'name': process['steps'][2]['name'],
        'index': 2,
        'start': None,
        'end': None,
        'logs': [],
    })

    # The next step is empty - runtime should end
    assert await updates.update(app, process, runtime) is True
    assert runtime['end'] is not None

    # Done, no changes
    assert await updates.update(app, process, runtime) is False
