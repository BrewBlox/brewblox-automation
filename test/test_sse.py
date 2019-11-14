"""
Tests brewblox_automation.sse
"""

import asyncio
import json

import pytest
from aiohttp.client_exceptions import ContentTypeError
from asynctest import CoroutineMock
from brewblox_service import http_client, scheduler

from brewblox_automation import api, sse, store

TESTED = sse.__name__


async def response(request, status=200):
    retv = await request
    assert retv.status == status
    try:
        return await retv.json()
    except ContentTypeError:
        return await retv.text()


@pytest.fixture(autouse=True)
async def conditions_mock(mocker):
    m = mocker.patch(store.__name__ + '.conditions.check', CoroutineMock(return_value=False))
    return m


@pytest.fixture
async def publisher(app):
    return sse.get_publisher(app)


@pytest.fixture
async def short_interval(mocker):
    mocker.patch(TESTED + '.PUBLISH_INTERVAL_S', 0.001)


@pytest.fixture
async def app(app, loop):
    http_client.setup(app)
    scheduler.setup(app)
    store.setup(app)
    api.setup(app)
    sse.setup(app)

    return app


async def test_immediate_response(app, client, publisher, runtime):
    await response(client.post('/runtime', json=runtime))

    q1, q2 = asyncio.Queue(), asyncio.Queue()
    await publisher.subscribe(q1)
    await publisher.subscribe(q2)
    runtimes = await response(client.get('/runtime'))
    assert q1.get_nowait() == runtimes
    assert q2.get_nowait() == runtimes


async def test_empty_response(app, client, publisher):
    q = asyncio.Queue()
    await publisher.subscribe(q)
    assert q.get_nowait() == []


async def test_error_response(conditions_mock, app, client, publisher, runtime):
    await response(client.post('/runtime', json=runtime))

    conditions_mock.side_effect = RuntimeError
    q = asyncio.Queue()
    await publisher.subscribe(q)

    with pytest.raises(asyncio.QueueEmpty):
        q.get_nowait()


async def test_sse_response(app, client, runtime):
    async with client.get('/sse/runtime') as resp:
        expected = 'data: []'
        chunk = await resp.content.read(len(expected))
        assert chunk.decode() == expected


async def test_sse_updates(short_interval, app, client, runtime):
    async with client.get('/sse/runtime') as resp:
        expected = 'data: []\r\n\r\n'

        chunk = await resp.content.read(len(expected))
        assert chunk.decode() == expected

        chunk = await resp.content.read(len(expected))
        assert chunk.decode() == expected

    await response(client.post('/runtime', json=runtime))
    runtimes = await response(client.get('/runtime'))

    async with client.get('/sse/runtime') as resp:
        expected = f'data: {json.dumps(runtimes)}'
        chunk = await resp.content.read(len(expected))
        assert chunk.decode() == expected


async def test_sse_error(short_interval, app, client, runtime, conditions_mock):
    await response(client.post('/runtime', json=runtime))

    conditions_mock.side_effect = RuntimeError

    async with client.get('/sse/runtime') as resp:
        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(resp.content.read(1), 0.1)
