"""
Periodically runs an update function for all active processes
"""

import asyncio
from uuid import uuid4

from aiohttp import web
from brewblox_service import brewblox_logger, features, repeater, strex

from brewblox_automation import actions, conditions, store, utils

LOGGER = brewblox_logger(__name__)


def setup(app: web.Application):
    features.add(app, StepRunner(app))


def get_runner(app: web.Application) -> 'StepRunner':
    return features.get(app, StepRunner)


async def update(app, runtime) -> bool:
    if runtime['end'] is not None:
        return False  # Runtime is done

    changed = False
    process = runtime['process']
    proc_id = process['id']
    proc_title = process['title']
    curr_result = runtime['results'][-1]
    curr_pos, curr_step = next(  # pragma: no cover
        (i, step) for (i, step) in enumerate(process['steps'])
        if step['id'] == curr_result['step'])

    if curr_result['start'] is None:
        changed = True

        try:
            for action in curr_step['actions']:
                await actions.run(app, action, runtime)
            curr_result['start'] = utils.now()
        except Exception as ex:  # pragma: no cover
            LOGGER.error(f'Action error in {proc_title} ({proc_id}) {proc_id} {strex(ex)}')

    # Short-circuit condition evaluation
    done = True
    try:
        for condition in curr_step['conditions']:
            if not await conditions.check(app, condition, runtime):
                done = False
                break
    except Exception as ex:  # pragma: no cover
        LOGGER.error(f'Condition error in {proc_title} ({proc_id}) {strex(ex)}')
        done = False

    if done:
        changed = True
        curr_result['end'] = utils.now()
        curr_name = curr_result['title']
        LOGGER.info(f'Step complete: {proc_title} ({proc_id}) / {curr_name}')

        try:
            next_pos = curr_pos + 1
            next_step = process['steps'][next_pos]
            runtime['results'].append({
                'id': str(uuid4()),
                'title': next_step['title'],
                'step': next_step['id'],
                'start': None,  # run actions next update
                'end': None,
                'logs': [],
            })

        except IndexError:
            LOGGER.info(f'Process complete: {proc_title} ({proc_id})')
            runtime['end'] = utils.now()

    return changed


class StepRunner(repeater.RepeaterFeature):

    async def prepare(self):
        self.interval = self.app['config']['update_interval']

        self.runtime_store = store.get_store(self.app)
        await self.runtime_store.ready.wait()

        LOGGER.info(f'Started {self}')

    async def run(self):
        await asyncio.sleep(self.interval)

        changed = False

        for runtime in self.runtime_store.config.values():
            changed = changed or await update(self.app, runtime)

        if changed:
            await self.runtime_store.write_store()
