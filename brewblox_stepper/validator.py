from dataclasses import dataclass
from typing import List


@dataclass
class Action:
    type: str
    opts: dict


@dataclass
class Response:
    body: dict


@dataclass
class Condition:
    id: str
    type: str
    opts: dict


@dataclass
class Step:
    name: str
    actions: List[Action]
    responses: List[Response]
    conditions: List[Condition]


@dataclass
class Process:
    id: str
    steps: List[Step]


@dataclass
class StepResult:
    name: str
    actions: List[str]
    start: int
    end: int


@dataclass
class ConditionResult:
    id: str
    values: dict


@dataclass
class Runtime:
    id: str
    step: int
    start: int
    end: int
    steps: List[StepResult]
    conditions: List[ConditionResult]
