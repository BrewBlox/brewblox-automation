"""
Responses available to steps
"""

from abc import abstractmethod

from aiohttp import web
from schema import Schema


class ResponseBase:

    @classmethod
    @abstractmethod
    def is_valid(cls, opts: dict) -> bool:
        """Check opts"""

    @classmethod
    @abstractmethod
    async def respond(cls, app: web.Application, opts: dict, runtime: dict):
        """Generate a response"""


class Notification(ResponseBase):
    _schema = Schema({
        'title': str,
        'message': str,
    })

    @classmethod
    def is_valid(cls, opts: dict) -> bool:
        return cls._schema.is_valid(opts)

    @classmethod
    async def respond(cls, app: web.Application, opts: dict, runtime: dict):
        return opts


_INDEX = {
    v.__name__: v for v in [
        Notification,
    ]
}


def is_valid(model: dict) -> bool:
    handler = _INDEX.get(model['type'])
    return bool(handler) and handler.is_valid(model['opts'])


async def respond(app: web.Application, model: dict, runtime: dict):
    handler = _INDEX[model['type']]
    return await handler.respond(app, model['opts'], runtime)
