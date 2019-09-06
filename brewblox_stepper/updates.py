"""
Periodically runs an update function for all active processes
"""

import asyncio

from aiohttp import web
from brewblox_service import brewblox_logger, features, scheduler, strex

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


class Updater(features.ServiceFeature):
    def __init__(self, app: web.Application):
        super().__init__(app)
        self._task: asyncio.Task = None

    def __str__(self):
        return f'{type(self).__name__}'

    @property
    def active(self):
        return bool(self._task and not self._task.done())

    async def startup(self, app: web.Application):
        await self.shutdown(app)
        self._task = await scheduler.create_task(app, self._run())

    async def shutdown(self, _):
        await scheduler.cancel_task(self.app, self._task)
        self._task = None

    async def _run(self):
        try:
            interval = self.app['config']['update_interval']

            process_store = store.get_process_store(self.app)
            runtime_store = store.get_runtime_store(self.app)
            last_ok = True

            await process_store.ready.wait()
            await runtime_store.ready.wait()

            LOGGER.info(f'Started {self}')

        except asyncio.CancelledError as ex:  # pragma: no cover
            raise ex

        except Exception as ex:  # pragma: no cover
            LOGGER.error(strex(ex))
            raise ex

        while True:
            try:
                await asyncio.sleep(interval)

                changed = False

                for runtime in runtime_store.config.values():
                    process = process_store.config[runtime['id']]
                    changed = changed or await update(self.app, process, runtime)

                if changed:
                    await runtime_store.write_store()

                last_ok = True

            except asyncio.CancelledError as ex:
                raise ex

            except Exception as ex:
                if last_ok:
                    LOGGER.error(strex(ex))
                    last_ok = False
