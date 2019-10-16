"""
Periodically runs an update function for all active processes
"""

import asyncio

from aiohttp import web
from brewblox_service import brewblox_logger, features, repeater, strex

from brewblox_stepper import actions, conditions, store, utils

LOGGER = brewblox_logger(__name__)


def setup(app: web.Application):
    features.add(app, Updater(app))


def get_updater(app: web.Application):
    return features.get(app, Updater)


async def update(app, process, runtime) -> bool:
    if runtime['end'] is not None:
        return False  # Runtime is done

    current = runtime['results'][-1]
    step = process['steps'][current['index']]
    changed = False

    if current['start'] is None:
        changed = True

        try:
            for action in step['actions']:
                await actions.run(app, action, runtime)
            current['start'] = utils.now()
        except Exception as ex:  # pragma: no cover
            LOGGER.error(f'Action error in {process["id"]} {strex(ex)}')

    # Short-circuit condition evaluation
    done = True
    try:
        for condition in step['conditions']:
            if not await conditions.check(app, condition, runtime):
                done = False
                break
    except Exception as ex:  # pragma: no cover
        LOGGER.error(f'Condition error in {process["id"]} {strex(ex)}')
        done = False

    if done:
        changed = True
        current['end'] = utils.now()
        LOGGER.info(f'Step complete: {process["id"]} / {current["name"]}')

        try:
            next_index = current['index'] + 1
            next_step = process['steps'][next_index]
            runtime['results'].append({
                'name': next_step['name'],
                'index': next_index,
                'start': None,  # run actions next update
                'end': None,
                'logs': [],
            })

        except IndexError:
            LOGGER.info(f'Process complete: {process["id"]}')
            runtime['end'] = utils.now()

    return changed


class Updater(repeater.RepeaterFeature):

    async def prepare(self):
        self.interval = self.app['config']['update_interval']

        self.process_store = store.get_process_store(self.app)
        self.runtime_store = store.get_runtime_store(self.app)

        await self.process_store.ready.wait()
        await self.runtime_store.ready.wait()

        LOGGER.info(f'Started {self}')

    async def run(self):
        await asyncio.sleep(self.interval)

        changed = False

        for runtime in self.runtime_store.config.values():
            process = self.process_store.config[runtime['id']]
            changed = changed or await update(self.app, process, runtime)

        if changed:
            await self.runtime_store.write_store()
