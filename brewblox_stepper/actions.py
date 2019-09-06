"""
Actions available to steps
"""

from abc import abstractmethod

from aiohttp import web
from brewblox_service import http_client
from schema import Schema


class ActionBase:

    @classmethod
    @abstractmethod
    def is_valid(cls, opts: dict) -> bool:
        """Check action args"""

    @classmethod
    @abstractmethod
    async def run(cls, app: web.Application, opts: dict, runtime: dict):
        """Just Do It"""


class BlockPatch(ActionBase):
    _schema = Schema({
        'block': str,
        'service': str,
        'data': {str: lambda v: True},
    })

    @classmethod
    def is_valid(cls, opts: dict) -> bool:
        return cls._schema.is_valid(opts)

    @classmethod
    async def run(cls, app: web.Application, opts: dict, runtime: dict):
        session = http_client.get_client(app).session
        url = f'http://{opts["service"]}:5000/{opts["service"]}/objects/{opts["block"]}'
        resp = await session.get(url)
        block = await resp.json()
        block['data'] = {**block['data'], **opts['data']}
        await session.put(url, json=block)


_INDEX = {
    v.__name__: v for v in [
        BlockPatch,
    ]
}


def is_valid(model: dict) -> bool:
    handler = _INDEX.get(model['type'])
    return bool(handler) and handler.is_valid(model['opts'])


async def run(app: web.Application, model: dict, runtime: dict):
    handler = _INDEX[model['type']]
    return await handler.run(app, model['opts'], runtime)
