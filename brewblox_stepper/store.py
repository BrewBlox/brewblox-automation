"""
Manages processes and their corresponding runtimes
"""

import asyncio
import time
from abc import abstractmethod
from functools import wraps

from aiohttp import web
from brewblox_service import brewblox_logger, couchdb_client, features, strex

DB_NAME = 'brewblox-stepper'
PROCESS_DOCUMENT = 'stepper-process'
RUNTIME_DOCUMENT = 'stepper-runtime'
READY_WAIT_TIMEOUT_S = 20

LOGGER = brewblox_logger(__name__)


def setup(app: web.Application):
    features.add(app, ProcessStore(app))
    features.add(app, RuntimeStore(app))


def get_process_store(app: web.Application) -> 'ProcessStore':
    return features.get(app, ProcessStore)


def get_runtime_store(app: web.Application) -> 'RuntimeStore':
    return features.get(app, RuntimeStore)


def now():
    return int(round(time.time() * 1000))


def when_ready(func):
    @wraps(func)
    async def wrapper(self, *args, **kwargs):
        await asyncio.wait_for(self.ready.wait(), READY_WAIT_TIMEOUT_S)
        return await func(self, *args, **kwargs)
    return wrapper


class Datastore(features.ServiceFeature):

    def __init__(self, app):
        super().__init__(app)
        self._volatile = app['config']['volatile']
        self._lock: asyncio.Lock = None
        self._ready: asyncio.Event = None
        self._rev: str = None

        self._config: dict = {}

    def __str__(self):
        return f'<{type(self).__name__} for {DB_NAME}/{self.document}>'

    @property
    @abstractmethod
    def document(self):
        """Should be implemented to set correct store doc"""

    @property
    def config(self):
        return self._config

    @property
    def ready(self) -> asyncio.Event:
        return self._ready

    async def startup(self, app: web.Application):
        self._ready = asyncio.Event()
        self._lock = asyncio.Lock()
        await self.read_store()
        self._ready.set()

    async def shutdown(self, app: web.Application):
        self._ready = None

    async def read_store(self):
        if self._volatile:
            return

        async with self._lock:
            try:
                self._rev = None
                client = couchdb_client.get_client(self.app)
                self._rev, self._config = await client.read(DB_NAME, self.document, {})
                LOGGER.info(f'{self} Read {len(self._config)} setting(s). Rev = {self._rev}')

            except asyncio.CancelledError:  # pragma: no cover
                raise

            except Exception as ex:
                LOGGER.error(f'{self} read error {strex(ex)}')
                raise ex

    @when_ready
    async def write_store(self):
        if self._volatile:
            return

        async with self._lock:
            try:
                if self._rev is None or self.document is None:
                    raise RuntimeError('Document or revision unknown - did read() fail?')
                client = couchdb_client.get_client(self.app)
                self._rev = await client.write(DB_NAME, self.document, self._rev, self._config)
                LOGGER.info(f'{self} data saved. Rev = {self._rev}')

            except asyncio.CancelledError:  # pragma: no cover
                raise

            except Exception as ex:
                LOGGER.error(f'{self} write error {strex(ex)}')
                raise ex


class ProcessStore(Datastore):

    @property
    def document(self):
        return PROCESS_DOCUMENT

    @when_ready
    async def create(self, process_data):
        id = process_data['id']
        if id in self.config:
            raise KeyError(f'Process with ID {id} already exists')

        self.config[id] = process_data
        await self.write_store()
        return process_data

    @when_ready
    async def all(self):
        return [v for v in self.config.values()]

    @when_ready
    async def clear(self):
        self.config.clear()
        await self.write_store()

    @when_ready
    async def read(self, id: str):
        return self.config[id]

    @when_ready
    async def write(self, id: str, process_data):
        if id not in self.config:
            raise KeyError(f'Process with ID {id} not found')
        self.config[id] = process_data
        await self.write_store()
        return process_data

    @when_ready
    async def remove(self, id: str):
        if id not in self.config:
            raise KeyError(f'Process with ID {id} not found')
        del self.config[id]
        await self.write_store()


class RuntimeStore(Datastore):

    @property
    def document(self):
        return RUNTIME_DOCUMENT

    @when_ready
    async def start(self, id: str):
        if id in self.config:
            raise RuntimeError(f'Process {id} is already active')
        if id not in get_process_store(self.app).config:
            raise KeyError(f'Process {id} is not defined')

        self.config[id] = {
            'id': id,
            'step': 0,
            'start': now(),
            'end': 0,
            'steps': [],
            'conditions': []
        }
        await self.write_store()
        return self.config[id]

    @when_ready
    async def advance(self, id: str, args):
        if id not in self.config:
            raise KeyError(f'Process with ID {id} not found or not started')
        index = args['index']
        self.config[id]['step'] = index
        await self.write_store()
        return self.config[id]

    @when_ready
    async def status(self, id: str, args):
        if id not in self.config:
            raise KeyError(f'Process with ID {id} not found or not started')
        return self.config[id]

    @when_ready
    async def exit(self, id: str, args):
        if id not in get_process_store(self.app).config:
            raise KeyError(f'Process {id} is not defined')
        if id not in self.config:
            return
        del self.config[id]
        await self.write_store()
