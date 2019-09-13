"""
SSE API
"""

import asyncio
import json
import weakref
from typing import Set

from aiohttp import hdrs, web
from aiohttp_sse import sse_response
from brewblox_service import brewblox_logger, features, scheduler, strex

from brewblox_stepper import store

PUBLISH_INTERVAL_S = 5
PUBLISH_TIMEOUT_S = 5

LOGGER = brewblox_logger(__name__)
routes = web.RouteTableDef()


def get_publisher(app: web.Application):
    return features.get(app, SSEPublisher)


def setup(app: web.Application):
    app.router.add_routes(routes)
    features.add(app, SSEPublisher(app))


class SSEPublisher(features.ServiceFeature):

    def __init__(self, app: web.Application):
        super().__init__(app)
        self._task: asyncio.Task = None
        self._queues: Set[asyncio.Queue] = weakref.WeakSet()
        self._current = None

    def __str__(self):
        return f'{type(self).__name__}'

    async def subscribe(self, queue: asyncio.Queue):
        self._queues.add(queue)
        try:
            if self._current is None:
                self._current = await store.get_runtime_store(self.app).all()
            await queue.put(self._current)

        except asyncio.CancelledError:  # pragma: no cover
            raise

        except Exception as ex:
            LOGGER.info(f'Initial subscription push failed: {strex(ex)}')

    async def startup(self, app: web.Application):
        await self.shutdown(app)
        self._task = await scheduler.create_task(app, self._broadcast())

    async def before_shutdown(self, _):
        for queue in self._queues:
            await queue.put(asyncio.CancelledError())

    async def shutdown(self, _):
        await scheduler.cancel_task(self.app, self._task)
        self._task = None

    async def _broadcast(self):
        LOGGER.info(f'Starting {self}')

        try:
            runtime_store: store.RuntimeStore = store.get_runtime_store(self.app)

        except Exception as ex:  # pragma: no cover
            LOGGER.error(strex(ex), exc_info=True)
            raise ex

        while True:
            try:
                await asyncio.sleep(PUBLISH_INTERVAL_S)

                if not self._queues:
                    self._current = None
                    continue

                self._current = await runtime_store.all()
                coros = [q.put(self._current) for q in self._queues]
                await asyncio.wait_for(asyncio.gather(*coros, return_exceptions=True), PUBLISH_TIMEOUT_S)

            except asyncio.CancelledError:
                break

            except Exception as ex:
                self._current = None
                LOGGER.error(f'{self} encountered an error: {strex(ex)}')


def _cors_headers(request):
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods':
        request.headers.get('Access-Control-Request-Method', ','.join(hdrs.METH_ALL)),
        'Access-Control-Allow-Headers':
        request.headers.get('Access-Control-Request-Headers', '*'),
        'Access-Control-Allow-Credentials': 'true',
    }


@routes.get('/sse/runtime')
async def subscribe(request: web.Request) -> web.Response:
    """
    ---
    summary: Periodically pushes all active objects
    tags:
    - Stepper
    - Process
    operationId: process.sse
    produces:
    - application/json
    """
    async with sse_response(request, headers=_cors_headers(request)) as resp:
        publisher: SSEPublisher = get_publisher(request.app)
        queue = asyncio.Queue()
        await publisher.subscribe(queue)

        while True:
            data = await queue.get()
            if isinstance(data, Exception):
                raise data
            await resp.send(json.dumps(data))

    # Note: we don't ever expect to return the response
    # Either the client cancels the request, or an exception is raised by publisher
