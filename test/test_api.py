"""
Tests brewblox_stepper.api
"""

from copy import deepcopy
from unittest.mock import ANY

import pytest
from aiohttp.client_exceptions import ContentTypeError
from asynctest import CoroutineMock
from brewblox_service import http_client, scheduler

from brewblox_stepper import api, store


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


async def test_crud(app, client, process):
    assert process == await response(client.post('/process', json=process))
    await response(client.post('/process', json=process), 500)

    assert [process] == await response(client.get('/process'))
    assert process == await response(client.get('/process/test-process'))

    edited = deepcopy(process)
    edited['steps'].append({
        'id': 'step-three-id',
        'title': 'step-three',
        'actions': [],
        'conditions': [],
        'annotations': [],
    })
    assert edited == await response(client.put('/process/test-process', json=edited))
    assert [edited] == await response(client.get('/process'))
    await response(client.put('/process/dummy', json=edited), 500)

    secondary = deepcopy(process)
    secondary['id'] = 'secondary'
    assert secondary == await response(client.post('/process', json=secondary))
    assert secondary == await response(client.get('/process/secondary'))
    resp = await response(client.get('/process'))
    assert len(resp) == 2

    await response(client.delete('/process/secondary'))
    assert [edited] == await response(client.get('/process'))
    await response(client.delete('/process/secondary'), 500)

    await response(client.delete('/process'))
    assert [] == await response(client.get('/process'))
    await response(client.delete('/process'))


async def test_process_start(app, client, process, conditions_mock):
    await response(client.post('/start/test-process'), 500)
    await response(client.post('/start/dummy'), 500)

    await response(client.post('/process', json=process))
    rt = await response(client.post('/start/test-process'))
    rt2 = await response(client.post('/start/test-process'))
    assert rt['id'] != rt2['id']


async def test_process_advance(app, client, process, conditions_mock):
    await response(client.post('/process', json=process))  # create
    await response(client.post('/advance/test-process', json={'pos': 1}), 500)  # not started -> error
    rt = await response(client.post('/start/test-process'))  # start
    id = rt['id']

    rt = await response(client.post(f'/advance/{id}', json={'pos': 1}))
    assert len(rt['results']) == 2
    rt = await response(client.post(f'/advance/{id}', json={'pos': 1}))
    assert len(rt['results']) == 3

    await response(client.post(f'/advance/{id}', json={'pos': 100}), 500)
    await response(client.post('/advance/dummy', json={}), 500)


async def test_process_read(app, client, process, conditions_mock):
    await response(client.post('/process', json=process))
    rt = await response(client.post('/start/test-process'))
    id = rt['id']
    rt = await response(client.post(f'/advance/{id}', json={'pos': 1}))
    rt['conditions'] = ANY

    assert rt == await response(client.get(f'/runtime/{id}'))
    await response(client.get('/runtime/dummy'), 500)
    assert [rt] == await response(client.get('/runtime'))


async def test_runtime_read(app, client, process, conditions_mock):
    await response(client.post('/process', json=process))
    await response(client.get('/runtime/test-process'), 500)
    rt = await response(client.post('/start/test-process'))
    id = rt['id']

    resp = await response(client.get(f'/runtime/{id}'))
    assert [resp] == await response(client.get('/runtime'))
    assert resp['conditions'] == [False, False, False]

    await response(client.get('/runtime/dummy'), 500)


async def test_process_stop(app, client, process, conditions_mock):
    await response(client.post('/process', json=process))
    rt = await response(client.post('/start/test-process'))
    id = rt['id']
    assert 'conditions' not in rt

    rt = await response(client.get(f'/runtime/{id}'))
    assert 'conditions' in rt

    rt = await response(client.post(f'/stop/{id}'))
    assert rt['end'] is not None
    assert 'conditions' not in rt

    assert rt == await response(client.post(f'/stop/{id}'))
    assert rt == await response(client.get(f'/runtime/{id}'))

    await response(client.post('/stop/dummy'), 500)


async def test_process_exit(app, client, process, conditions_mock):
    await response(client.post('/process', json=process))
    rt = await response(client.post('/start/test-process'))
    id = rt['id']

    await response(client.delete(f'/runtime/{id}', json={}))
    await response(client.delete(f'/runtime/{id}', json={}))
    await response(client.delete('/runtime/dummy', json={}))
    assert [] == await response(client.get('/runtime'))
