"""
Schema validation for incoming blobs of data
"""

from schema import And, Or, Schema

from brewblox_stepper import actions, conditions, responses

# Dates are either not set (None), or ballpark correct for millisecond
# 1e11 is Mar 03 1973 in milliseconds, and Nov 16 5138 in seconds
MILLI_DATE = Or(None, And(int, lambda v: v > 1e11))


_process = Schema({
    'id': str,
    'title': str,
    'steps': [{
        'name': str,
        'actions': [
            And({
                'type': str,
                'opts': dict,
            },
                actions.is_valid)
        ],
        'responses': [
            And({
                'type': str,
                'opts': dict,
            },
                responses.is_valid)
        ],
        'conditions': [
            And({
                'type': str,
                'opts': dict,
            },
                conditions.is_valid)
        ],
    }]
})


_runtime = Schema({
    'id': str,
    'start': MILLI_DATE,
    'end': MILLI_DATE,
    'results': [{
        'name': str,
        'index': And(int, lambda v: v >= 0),
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
