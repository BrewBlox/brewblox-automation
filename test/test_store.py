"""
Tests brewblox_stepper.store
"""

import pytest
from asynctest import CoroutineMock
from brewblox_service import features, scheduler

from brewblox_stepper import store

TESTED = store.__name__


class DoccyStore(store.Datastore):

    @property
    def document(self):
        return 'doccy'


@pytest.fixture
async def couchdb_mock(mocker):
    m = mocker.patch(TESTED + '.couchdb_client.get_client')
    m.return_value.read = CoroutineMock(return_value=('rev_read', {'read': True}))
    m.return_value.write = CoroutineMock(return_value='rev_write')
    return m.return_value


@pytest.fixture
async def app(app, loop, couchdb_mock):
    app['config']['volatile'] = False
    scheduler.setup(app)
    features.add(app, DoccyStore(app))

    return app


async def test_read_write(app, client):
    ts: store.Datastore = features.get(app, DoccyStore)
    await ts.ready.wait()
    assert ts.config == {'read': True}

    await ts.read_store()
    assert ts.config == {'read': True}
    assert ts._rev == 'rev_read'

    await ts.write_store()
    assert ts._rev == 'rev_write'


async def test_read_write_errors(app, client, couchdb_mock):
    ts: store.Datastore = features.get(app, DoccyStore)
    couchdb_mock.read.side_effect = RuntimeError

    with pytest.raises(RuntimeError):
        await ts.read_store()

    ts._rev = None
    with pytest.raises(RuntimeError):
        await ts.write_store()
