"""
Tests brewblox_stepper.api
"""

from copy import deepcopy

import pytest
from aiohttp.client_exceptions import ContentTypeError
from brewblox_service import scheduler

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
async def app(app, loop):
    scheduler.setup(app)
    store.setup(app)
    api.setup(app)

    return app


async def test_crud(app, client, process):
    assert process == await response(client.post('/edit', json=process))
    await response(client.post('/edit', json=process), 500)

    assert [process] == await response(client.get('/edit'))
    assert process == await response(client.get('/edit/test-process'))

    edited = deepcopy(process)
    edited['steps'].append({
        'name': 'step-three',
        'actions': [],
        'responses': [],
        'conditions': []
    })
    assert edited == await response(client.put('/edit/test-process', json=edited))
    assert [edited] == await response(client.get('/edit'))
    await response(client.put('/edit/dummy', json=edited), 500)

    secondary = deepcopy(process)
    secondary['id'] = 'secondary'
    assert secondary == await response(client.post('/edit', json=secondary))
    assert secondary == await response(client.get('/edit/secondary'))
    resp = await response(client.get('/edit'))
    assert len(resp) == 2

    await response(client.delete('/edit/secondary'))
    assert [edited] == await response(client.get('/edit'))
    await response(client.delete('/edit/secondary'), 500)

    await response(client.delete('/edit'))
    assert [] == await response(client.get('/edit'))
    await response(client.delete('/edit'))


async def test_runtime_basics(app, client, process):
    # Start
    await response(client.post('/start/test-process'), 500)
    await response(client.post('/edit', json=process))
    await response(client.post('/start/test-process'))
    await response(client.post('/start/test-process'), 500)
    await response(client.post('/start/dummy'), 500)

    # Advance
    await response(client.post('/advance/test-process', json={'index': 1}))
    await response(client.post('/advance/test-process', json={'index': 1}))
    await response(client.post('/advance/dummy', json={}), 500)

    # Status
    await response(client.post('/status/test-process', json={}))
    await response(client.post('/status/dummy', json={}), 500)

    # Exit
    await response(client.post('/exit/test-process', json={}))
    await response(client.post('/exit/test-process', json={}))
    await response(client.post('/exit/dummy', json={}), 500)
