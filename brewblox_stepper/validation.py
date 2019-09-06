"""
Schema validation for incoming blobs of data
"""

from schema import And, Or, Schema

from brewblox_stepper import actions, conditions, responses

# Dates are either not set (None), or ballpark correct for millisecond
# 1e11 is Mar 03 1973 in milliseconds, and Nov 16 5138 in seconds
MILLI_DATE = Or(None, And(int, lambda v: v > 1e11))


def _validate_action(args: dict) -> bool:
    handler = actions.INDEX.get(args['type'])
    return bool(handler) and handler.is_valid(args['opts'])


def _validate_response(args: dict) -> bool:
    handler = responses.INDEX.get(args['type'])
    return bool(handler) and handler.is_valid(args['opts'])


def _validate_condition(args: dict) -> bool:
    handler = conditions.INDEX.get(args['type'])
    return bool(handler) and handler.is_valid(args['opts'])


_process = Schema({
    'id': str,
    'steps': [{
        'name': str,
        'actions': [
            And({
                'type': str,
                'opts': dict,
            },
                _validate_action)
        ],
        'responses': [
            And({
                'type': str,
                'opts': dict,
            },
                _validate_response)
        ],
        'conditions': [
            And({
                'type': str,
                'opts': dict,
            },
                _validate_condition)
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
            'source': str,
            'message': str,
        }],
    }],
})


def validate_process(args: dict) -> dict:
    return _process.validate(args)


def validate_runtime(args: dict) -> dict:
    return _runtime.validate(args)
