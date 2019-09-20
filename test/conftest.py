"""
Master file for pytest fixtures.
Any fixtures declared here are available to all test functions in this directory.
"""

import logging

import pytest
from brewblox_service import service

from brewblox_stepper.__main__ import create_parser


@pytest.fixture(scope='session', autouse=True)
def log_enabled():
    """Sets log level to DEBUG for all test functions.
    Allows all logged messages to be captured during pytest runs"""
    logging.getLogger().setLevel(logging.DEBUG)
    logging.captureWarnings(True)


@pytest.fixture
def app_config() -> dict:
    return {
        'name': 'test_app',
        'host': 'localhost',
        'port': 1234,
        'debug': False,
        'broadcast_exchange': 'brewcast',
        'update_interval': 2,
        'volatile': True,
    }


@pytest.fixture
def sys_args(app_config) -> list:
    return [str(v) for v in [
        'app_name',
        '--name', app_config['name'],
        '--host', app_config['host'],
        '--port', str(app_config['port']),
        '--broadcast-exchange', app_config['broadcast_exchange'],
        '--update-interval', app_config['update_interval'],
        '--volatile',
    ]]


@pytest.fixture
def event_loop(loop):
    # aresponses uses the "event_loop" fixture
    # this makes loop available under either name
    yield loop


@pytest.fixture
def app(sys_args):
    parser = create_parser('stepper')
    app = service.create_app(parser=parser, raw_args=sys_args[1:])
    return app


@pytest.fixture
def client(app, aiohttp_client, loop):
    """Allows patching the app or aiohttp_client before yielding it.

    Any tests wishing to add custom behavior to app can override the fixture
    """
    return loop.run_until_complete(aiohttp_client(app))


@pytest.fixture
def process():
    return {
        'id': 'test-process',
        'title': 'Test process',
        'steps': [
            {
                'name': 'step-one',
                'actions': [
                    {
                        'type': 'BlockPatch',
                        'opts': {
                            'block': 'pwm-1',
                            'service': 'sparkey',
                            'data': {
                                'desiredSetting': 0
                            }
                        }
                    }
                ],
                'responses': [
                    {
                        'type': 'Notification',
                        'opts': {
                            'title': 'VERY IMPORTANT',
                            'message': 'Memo: one shrubbery',
                        }
                    }
                ],
                'conditions': [
                    {
                        'type': 'TimeAbsolute',
                        'opts': {
                            'time': 1567760830490,
                        }
                    },
                    {
                        'type': 'TimeElapsed',
                        'opts': {
                            'duration': 1000,
                        }
                    },
                    {
                        'type': 'BlockValue',
                        'opts': {
                            'block': 'pwm-1',
                            'service': 'sparkey',
                            'key': 'value[degC]',
                            'operator': 'ge',
                            'value': 50,
                        }
                    }
                ],
            },
            {
                'name': 'step-two',
                'actions': [],
                'responses': [],
                'conditions': [
                    {
                        'type': 'ManualAdvance',
                        'opts': {},
                    }
                ],
            },
            {
                'name': 'step-empty',
                'actions': [],
                'responses': [],
                'conditions': [],
            }
        ]
    }


@pytest.fixture
def runtime():
    return {
        'id': 'test-process',
        'start': 1567760830490,
        'end': None,
        'results': [
            {
                'name': 'step-one',
                'index': 0,
                'start': 1567760830490,
                'end': None,
                'logs': [
                    {
                        'timestamp': 1567760960434,
                        'ref': 'condition-1',
                        'source': 'Time Condition',
                        'message': 'Busy...',
                    },

                ]
            },
        ]
    }
