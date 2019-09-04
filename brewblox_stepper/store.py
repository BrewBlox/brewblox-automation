"""
Manages processes and their corresponding runtimes
"""

import asyncio
import time
from abc import abstractmethod
from dataclasses import dataclass
from typing import List

from aiohttp import web
from brewblox_service import brewblox_logger, couchdb_client, features, strex

DB_NAME = 'brewblox-stepper'
PROCESS_DOCUMENT = 'stepper-processes'
RUNTIME_DOCUMENT = 'stepper-runtimes'

LOGGER = brewblox_logger(__name__)


def setup(app: web.Application):
    features.add(app, ProcessStore(app))
    features.add(app, RuntimeStore(app))


def get_process_store(app: web.Application) -> 'ProcessStore':
    return features.get(app, ProcessStore)


def get_runtime_store(app: web.Application) -> 'RuntimeStore':
    return features.get(app, RuntimeStore)


@dataclass
class Action:
    type: str
    opts: dict


@dataclass
class Response:
    body: dict


@dataclass
class Condition:
    id: str
    type: str
    opts: dict


@dataclass
class Step:
    name: str
    actions: List[Action]
    responses: List[Response]
    conditions: List[Condition]


@dataclass
class Process:
    id: str
    steps: List[Step]


@dataclass
class StepResult:
    name: str
    actions: List[str]
    start: int
    end: int


@dataclass
class ConditionResult:
    id: str
    values: dict


@dataclass
class Runtime:
    id: str
    step: int
    start: int
    end: int
    steps: List[StepResult]
    conditions: List[ConditionResult]


def now():
    return int(round(time.time() * 1000))


class Datastore(features.ServiceFeature):

    def __init__(self, app):
        super().__init__(app)
        self._volatile = app['config']['volatile']
        self._ready_event: asyncio.Event = None
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

    async def startup(self, app: web.Application):
        self._ready_event = asyncio.Event()
        self._ready_event.set()
        await self.read_store()

    async def shutdown(self, app: web.Application):
        self._ready_event = None

    async def read_store(self):
        if self._volatile:
            return

        await self._ready_event.wait()
        self._ready_event.clear()

        data = {}

        try:
            self._rev = None
            if not self.volatile:
                client = couchdb_client.get_client(self.app)
                self._rev, data = await client.read(DB_NAME, self.document, {})
                LOGGER.info(f'{self} Read {len(data)} setting(s). Rev = {self.rev}')

        except asyncio.CancelledError:  # pragma: no cover
            raise

        except Exception as ex:
            LOGGER.error(f'{self} read error {strex(ex)}')

        finally:
            self._config = data
            self._ready_event.set()

    async def write_store(self):
        if self._volatile:
            return

        await self._ready_event.wait()
        self._ready_event.clear()

        try:
            if self._rev is None or self.document is None:
                raise RuntimeError('Document or revision unknown - did read() fail?')
            client = couchdb_client.get_client(self.app)
            self.rev = await client.write(DB_NAME, self.document, self._rev, self._config)
            LOGGER.info(f'{self} data saved. Rev = {self.rev}')

        except asyncio.CancelledError:  # pragma: no cover
            raise

        except Exception as ex:
            LOGGER.error(f'{self} write error {strex(ex)}')

        finally:
            self._ready_event.set()


class ProcessStore(Datastore):

    @property
    def document(self):
        return PROCESS_DOCUMENT

    async def create(self, process_data):
        id = process_data['id']
        if id is None:
            raise AttributeError('Process ID not set')
        if id in self.config:
            raise KeyError(f'Process with ID {id} already exists')

        self.config[id] = process_data
        await self.write_store()
        return {'create': 'ok', 'process': process_data}

    async def all(self):
        return [v for v in self.config.items()]

    async def clear(self):
        self.config = {}
        await self.write_store()

    async def read(self, id: str):
        return self.config[id]

    async def write(self, id: str, process_data):
        if id not in self.config:
            raise KeyError(f'Process with ID {id} not found')
        self.config[id] = process_data
        await self.write_store()

    async def remove(self, id: str):
        if id not in self.config:
            raise KeyError(f'Process with ID {id} not found')
        del self.config[id]
        await self.write_store()


class RuntimeStore(Datastore):

    @property
    def document(self):
        return RUNTIME_DOCUMENT

    async def start(self, id: str):
        if id in self.config:
            raise RuntimeError(f'Process {id} is already active')

        self.config[id] = {
            'id': id,
            'step': 0,
            'start': now(),
            'end': 0,
            'steps': [],
            'conditions': []
        }
        await self.write_store()

    async def advance(self, id: str, args):
        if id not in self.config:
            raise KeyError(f'Process with ID {id} not found or not started')
        index = args['index']
        self.config[id]['step'] = index
        await self.write_store()

    async def status(self, id: str, args):
        if id not in self.config:
            raise KeyError(f'Process with ID {id} not found or not started')
        return self.config[id]

    async def exit(self, id: str, args):
        if id not in self.config:
            return
        del self.config[id]
        await self.write_store()
