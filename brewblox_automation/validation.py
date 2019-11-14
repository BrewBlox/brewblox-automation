"""
Schema validation for incoming blobs of data
"""

from schema import And, Or, Schema

from brewblox_automation import actions, conditions

# Dates are either not set (None), or ballpark correct for millisecond
# 1e11 is Mar 03 1973 in milliseconds, and Nov 16 5138 in seconds
MILLI_DATE = Or(None, And(int, lambda v: v > 1e11))


_process = Schema({
    'id': str,
    'title': str,
    'steps': [{
        'id': str,
        'title': str,
        'enabled': bool,
        'actions': [
            And({
                'id': str,
                'type': str,
                'enabled': bool,
                'opts': dict,
            },
                actions.is_valid)
        ],
        'conditions': [
            And({
                'id': str,
                'type': str,
                'enabled': bool,
                'opts': dict,
            },
                conditions.is_valid)
        ],
        'notes': [{
            'title': str,
            'message': str,
        }],
    }],
})


_runtime = Schema({
    'id': str,
    'title': str,
    'start': MILLI_DATE,
    'end': MILLI_DATE,
    'process': _process,
    'tasks': [{
        'ref': str,
        'title': str,
        'message': str,
        'done': bool,
    }],
    'results': [{
        'id': str,
        'title': str,
        'step': str,
        'start': MILLI_DATE,
        'end': MILLI_DATE,
        'logs': [{
            'timestamp': MILLI_DATE,
            'ref': str,
            'source': str,
            'message': str,
        }],
    }],
})


def validate_process(args: dict) -> dict:
    return _process.validate(args)


def validate_runtime(args: dict) -> dict:
    return _runtime.validate(args)
