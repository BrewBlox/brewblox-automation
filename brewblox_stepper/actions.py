"""
Actions available to steps
"""

from abc import abstractmethod

from schema import Schema


class ActionBase:

    @classmethod
    @abstractmethod
    def is_valid(cls, opts: dict) -> bool:
        """Check action args"""

    @classmethod
    @abstractmethod
    async def run(cls, opts: dict, runtime: dict):
        """Just Do It"""


class BlockPatch(ActionBase):
    _schema = Schema({
        'block': str,
        'service': str,
        'key': str,
        'value': lambda v: True
    })

    @classmethod
    def is_valid(cls, opts: dict) -> bool:
        return cls._schema.is_valid(opts)

    @classmethod
    async def run(cls, opts: dict, runtime: dict):
        """TODO"""


INDEX = {
    v.__name__: v for v in [
        BlockPatch,
    ]
}
