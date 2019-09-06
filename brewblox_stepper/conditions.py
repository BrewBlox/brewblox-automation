"""
Conditions available to steps
"""


from abc import abstractmethod
from time import time

from schema import And, Or, Schema


def now():
    return time * 1000


class ConditionBase:

    @classmethod
    @abstractmethod
    def is_valid(cls, opts: dict) -> bool:
        """Check opts"""

    @classmethod
    @abstractmethod
    async def check(cls, opts: dict, runtime: dict) -> bool:
        """Check if condition is satisfied"""


class TimeAbsolute(ConditionBase):
    _schema = Schema({
        'time': And(int, lambda v: v > 1e11),
    })

    @classmethod
    def is_valid(cls, opts: dict) -> bool:
        return cls._schema.is_valid(opts)

    @classmethod
    async def check(cls, opts: dict, runtime: dict) -> bool:
        return now() > opts['time']


class TimeElapsed(ConditionBase):
    _schema = Schema({
        'duration': int,
    })

    @classmethod
    def is_valid(cls, opts: dict) -> bool:
        return cls._schema.is_valid(opts)

    @classmethod
    async def check(cls, opts: dict, runtime: dict) -> bool:
        start = runtime['results'][-1]['start']
        return bool(start) and now() > start + opts['duration']


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
    async def check(cls, opts: dict, runtime: dict) -> bool:
        """TODO"""
        return True


INDEX = {
    v.__name__: v for v in [
        TimeAbsolute,
        TimeElapsed,
        BlockValue,
    ]
}
