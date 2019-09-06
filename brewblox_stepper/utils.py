"""
Misc utility functions
"""

from time import time


def now():
    return int(round(time() * 1000))
