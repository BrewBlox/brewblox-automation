"""
Tests brewblox_stepper.updater
"""

import asyncio

import pytest
from asynctest import CoroutineMock
from brewblox_service import scheduler

from brewblox_stepper import store, updates

TESTED = updates.__name__


@pytest.fixture
async def app(app, loop):
    app['config']['update_interval'] = 0.01
    scheduler.setup(app)
    store.setup(app)
    updates.setup(app)

    return app


@pytest.fixture
async def update_spy(app, mocker):
    updater = updates.get_updater(app)
    s = mocker.spy(updater, '_update')
    return s


@pytest.fixture
async def update_mock(app, mocker):
    updater = updates.get_updater(app)
    m = mocker.patch.object(updater, '_update', CoroutineMock())
    return m


async def test_updates(app, client, update_spy, process):
    process_store = store.get_process_store(app)
    runtime_store = store.get_runtime_store(app)
    updater = updates.get_updater(app)

    await runtime_store.ready.wait()
    await asyncio.sleep(0.1)
    assert updater.active
    assert update_spy.call_count == 0

    await process_store.create(process)
    await runtime_store.start('test-process')
    await asyncio.sleep(0.1)
    assert updater.active
    assert update_spy.call_count > 0


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


async def test_update_errors(app, client, update_mock, process):
    process_store = store.get_process_store(app)
    runtime_store = store.get_runtime_store(app)
    updater = updates.get_updater(app)

    await process_store.create(process)
    await runtime_store.start('test-process')

    update_mock.side_effect = RuntimeError
    await asyncio.sleep(0.1)
    assert updater.active
