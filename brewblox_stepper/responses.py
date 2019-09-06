"""
Responses available to steps
"""

from abc import abstractmethod

from schema import Schema


class ResponseBase:

    @classmethod
    @abstractmethod
    def is_valid(cls, opts: dict) -> bool:
        """Check opts"""

    @classmethod
    @abstractmethod
    async def respond(cls, opts: dict):
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
    async def respond(cls, opts: dict):
        return opts


INDEX = {
    v.__name__: v for v in [
        Notification,
    ]
}
