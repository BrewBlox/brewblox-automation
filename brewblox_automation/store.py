"""
Manages processes and their corresponding runtimes
"""

import asyncio
from abc import abstractmethod
from functools import wraps
from typing import Tuple
from uuid import uuid4

from aiohttp import web
from brewblox_service import brewblox_logger, couchdb_client, features, strex
from schema import Optional, Schema

from brewblox_automation import conditions, utils, validation

DB_NAME = 'brewblox-automation'
RUNTIME_DOCUMENT = 'stepper-runtime'
READY_WAIT_TIMEOUT_S = 20

LOGGER = brewblox_logger(__name__)


def setup(app: web.Application):
    features.add(app, RuntimeStore(app))


def get_store(app: web.Application) -> 'RuntimeStore':
    return features.get(app, RuntimeStore)


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


class RuntimeStore(Datastore):

    @property
    def document(self):
        return RUNTIME_DOCUMENT

    def _find(self, steps, id) -> Tuple[int, dict]:
        return next(  # pragma: no cover
            ((i, step) for (i, step) in enumerate(steps)
             if step['id'] == id))

    @when_ready
    async def create(self, runtime: dict):
        validation.validate_runtime(runtime)
        if runtime['id'] in self.config:
            raise KeyError(f'Runtime {runtime["id"]} / {runtime["title"]} already exists')
        self.config[runtime['id']] = runtime
        await self.write_store()
        return runtime

    @when_ready
    async def read(self, id: str):
        runtime = self.config.get(id)
        if not runtime:
            raise KeyError(f'Runtime {id} not found or not started')

        if runtime['end'] is not None:
            return runtime

        result = runtime['results'][-1]
        pos, step = self._find(runtime['process']['steps'], result['step'])

        return {
            **runtime,
            'conditions': [
                await conditions.check(self.app, cond, runtime)
                for cond in step['conditions']
            ]
        }

    @when_ready
    async def all(self):
        res = []
        for id in self.config.keys():
            res.append(await self.read(id))
        return res

    @when_ready
    async def remove(self, id: str, args):
        if id not in self.config:
            return
        del self.config[id]
        await self.write_store()

    _advance_args = Schema({
        Optional('pos'): int
    })

    @when_ready
    async def advance(self, id: str, args):
        self._advance_args.validate(args)

        runtime = self.config.get(id)
        if runtime is None:
            raise KeyError(f'Runtime {id} not found')

        process = runtime['process']
        steps = process['steps']
        curr_result = runtime['results'][-1]
        curr_pos, curr_step = self._find(steps, curr_result['step'])
        next_pos = args.get('pos') or curr_pos + 1

        LOGGER.info(f'{curr_result}, {next_pos}')

        try:
            next_step = steps[next_pos]
        except IndexError:
            raise KeyError(f'Invalid next step in process {process["title"]}')

        curr_result['end'] = curr_result['end'] or utils.now()
        runtime['results'].append({
            'id': str(uuid4()),
            'title': next_step['title'],
            'step': next_step['id'],
            'start': None,
            'end': None,
            'logs': [],
        })

        await self.write_store()
        return self.config[id]

    @when_ready
    async def stop(self, id: str):
        runtime = self.config.get(id)
        if not runtime:
            raise KeyError(f'Runtime {id} not found')

        if runtime['end'] is not None:
            return runtime

        runtime['end'] = utils.now()
        result = runtime['results'][-1]
        result['end'] = result['end'] or utils.now()

        await self.write_store()
        return runtime
