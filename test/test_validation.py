"""
Tests brewblox_stepper.validation
"""

from copy import deepcopy

import pytest
from schema import SchemaError

from brewblox_stepper import validation


async def test_validate_process(process):
    assert validation.validate_process(deepcopy(process)) == process

    unexpected = {
        'type': 'SpanishInquisition',
        'opts': {},
    }

    unknown_action = deepcopy(process)
    unknown_action['steps'][0]['actions'].append(unexpected)
    with pytest.raises(SchemaError):
        validation.validate_process(unknown_action)

    unknown_resp = deepcopy(process)
    unknown_resp['steps'][0]['responses'].append(unexpected)
    with pytest.raises(SchemaError):
        validation.validate_process(unknown_resp)

    unknown_condition = deepcopy(process)
    unknown_condition['steps'][0]['conditions'].append(unexpected)
    with pytest.raises(SchemaError):
        validation.validate_process(unknown_condition)

    additional_key = deepcopy(process)
    additional_key['pancakes'] = False
    with pytest.raises(SchemaError):
        validation.validate_process(additional_key)


async def test_validate_runtime(runtime):
    assert validation.validate_runtime(deepcopy(runtime)) == runtime
