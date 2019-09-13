"""
Conditions available to steps
"""


import operator
from abc import abstractmethod

from aiohttp import web
from brewblox_service import http_client
from schema import And, Or, Schema

from brewblox_stepper import utils


class ConditionBase:

    @classmethod
    @abstractmethod
    def is_valid(cls, opts: dict) -> bool:
        """Check opts"""

    @classmethod
    @abstractmethod
    async def check(cls, app: web.Application, opts: dict, runtime: dict) -> bool:
        """Check if condition is satisfied"""


class TimeAbsolute(ConditionBase):
    _schema = Schema({
        'time': And(int, lambda v: v > 1e11),
    })

    @classmethod
    def is_valid(cls, opts: dict) -> bool:
        return cls._schema.is_valid(opts)

    @classmethod
    async def check(cls, app: web.Application, opts: dict, runtime: dict) -> bool:
        return utils.now() > opts['time']


class TimeElapsed(ConditionBase):
    _schema = Schema({
        'duration': int,
    })

    @classmethod
    def is_valid(cls, opts: dict) -> bool:
        return cls._schema.is_valid(opts)

    @classmethod
    async def check(cls, app: web.Application, opts: dict, runtime: dict) -> bool:
        start = runtime['results'][-1]['start']
        duration = opts['duration']
        return bool(start) and utils.now() - start > duration


class BlockValue(ConditionBase):
    _schema = Schema({
        'block': str,
        'service': str,
        'key': str,
        'operator': Or('lt', 'le', 'eq', 'ne', 'ge', 'gt'),
        'value': lambda v: True,
    })

    @classmethod
    def is_valid(cls, opts: dict) -> bool:
        return cls._schema.is_valid(opts)

    @classmethod
    async def check(cls, app: web.Application, opts: dict, runtime: dict) -> bool:
        session = http_client.get_client(app).session
        url = f'http://{opts["service"]}:5000/{opts["service"]}/objects/{opts["block"]}'
        resp = await session.get(url)
        block = await resp.json()
        op = getattr(operator, opts['operator'])
        return op(block['data'][opts['key']], opts['value'])


class ManualAdvance(ConditionBase):
    _schema = Schema({})

    @classmethod
    def is_valid(cls, opts: dict) -> bool:
        return cls._schema.is_valid(opts)

    @classmethod
    async def check(cls, app: web.Application, opts: dict, runtime: dict) -> bool:
        return False


_INDEX = {
    v.__name__: v for v in [
        TimeAbsolute,
        TimeElapsed,
        BlockValue,
        ManualAdvance,
    ]
}


def is_valid(model: dict) -> bool:
    handler = _INDEX.get(model['type'])
    return bool(handler) and handler.is_valid(model['opts'])


async def check(app: web.Application, model: dict, runtime: dict) -> bool:
    handler = _INDEX[model['type']]
    return await handler.check(app, model['opts'], runtime)
