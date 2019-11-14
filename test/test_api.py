"""
Tests brewblox_automation.api
"""

import pytest
from aiohttp.client_exceptions import ContentTypeError
from asynctest import CoroutineMock
from brewblox_service import http_client, scheduler

from brewblox_automation import api, store


async def response(request, status=200):
    retv = await request
    assert retv.status == status
    try:
        return await retv.json()
    except ContentTypeError:
        return await retv.text()


async def status(request):
    retv = await request
    return retv.status


@pytest.fixture
async def conditions_mock(mocker):
    m = mocker.patch(store.__name__ + '.conditions.check', CoroutineMock(return_value=False))
    return m


@pytest.fixture
async def app(app, loop):
    http_client.setup(app)
    scheduler.setup(app)
    store.setup(app)
    api.setup(app)

    return app


async def test_create(app, client, process, runtime, conditions_mock):
    await response(client.post('/runtime', json=process), 500)
    await response(client.post('/runtime', json=runtime))
    await response(client.post('/runtime', json=runtime), 500)


async def test_advance(app, client, runtime, conditions_mock):
    await response(client.post('/runtime', json=runtime))

    rt = await response(client.post('/advance/runtime-id', json={'pos': 1}))
    assert len(rt['results']) == 2
    rt = await response(client.post('/advance/runtime-id', json={'pos': 1}))
    assert len(rt['results']) == 3
    rt = await response(client.post('/advance/runtime-id', json={}))
    assert len(rt['results']) == 4

    await response(client.post('/advance/runtime-id', json={'pos': 100}), 500)
    await response(client.post('/advance/dummy', json={}), 500)


async def test_read(app, client, runtime, conditions_mock):
    await response(client.get('/runtime/runtime-id'), 500)
    await response(client.post('/runtime', json=runtime))

    resp = await response(client.get('/runtime/runtime-id'))
    assert [resp] == await response(client.get('/runtime'))
    assert resp['conditions'] == [False, False, False]

    await response(client.get('/runtime/dummy'), 500)


async def test_stop(app, client, runtime, conditions_mock):
    rt = await response(client.post('/runtime', json=runtime))
    assert 'conditions' not in rt

    rt = await response(client.get('/runtime/runtime-id'))
    assert 'conditions' in rt

    rt = await response(client.post('/stop/runtime-id'))
    assert rt['end'] is not None
    assert 'conditions' not in rt

    assert rt == await response(client.post('/stop/runtime-id'))
    assert rt == await response(client.get('/runtime/runtime-id'))

    await response(client.post('/stop/dummy'), 500)


async def test_remove(app, client, runtime, conditions_mock):
    await response(client.post('/runtime', json=runtime))

    await response(client.delete('/runtime/runtime-id', json={}))
    await response(client.delete('/runtime/runtime-id', json={}))
    await response(client.delete('/runtime/dummy', json={}))
    assert [] == await response(client.get('/runtime'))
