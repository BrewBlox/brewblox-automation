"""
API for process CRUD
"""

from aiohttp import web
from brewblox_service import brewblox_logger

from brewblox_automation import store

LOGGER = brewblox_logger(__name__)
routes = web.RouteTableDef()


def setup(app: web.Application):
    app.router.add_routes(routes)


@routes.post('/runtime')
async def create(request: web.Request) -> web.Response:
    """
    ---
    summary: Create new runtime
    tags:
    - Stepper
    - Process
    operationId: process.create
    produces:
    - application/json
    parameters:
    -
        name: body
        in: body
        description: object
        required: true
        schema:
            type: object
    """
    return web.json_response(
        await store.get_store(request.app).create(
            await request.json()
        )
    )


@routes.get('/runtime')
async def all_runtimes(request: web.Request) -> web.Response:
    """
    ---
    summary: Read all runtimes
    tags:
    - Stepper
    - Process
    operationId: runtime.all
    produces:
    - application/json
    """
    return web.json_response(
        await store.get_store(request.app).all()
    )


@routes.get('/runtime/{id}')
async def read_runtime(request: web.Request) -> web.Response:
    """
    ---
    summary: Read runtime
    tags:
    - Stepper
    - Process
    operationId: runtime.read
    produces:
    - application/json
    parameters:
    -
        name: id
        in: path
        required: true
        description: Process ID
        schema:
            type: string
    """
    return web.json_response(
        await store.get_store(request.app).read(
            request.match_info['id']
        )
    )


@routes.delete('/runtime/{id}')
async def remove_runtime(request: web.Request) -> web.Response:
    """
    ---
    summary: Remove runtime
    tags:
    - Stepper
    - Process
    operationId: process.remove
    produces:
    - application/json
    parameters:
    -
        name: id
        in: path
        required: true
        description: Process ID
        schema:
            type: string
    """
    return web.json_response(
        await store.get_store(request.app).remove(
            request.match_info['id'],
            await request.json()
        )
    )


@routes.post('/advance/{id}')
async def advance(request: web.Request) -> web.Response:
    """
    ---
    summary: Advance to Process Step
    tags:
    - Stepper
    - Process
    operationId: process.advance
    produces:
    - application/json
    parameters:
    -
        name: id
        in: path
        required: true
        description: Process ID
        schema:
            type: string
    -
        name: body
        in: body
        description: object
        required: true
        schema:
            type: object
    """
    return web.json_response(
        await store.get_store(request.app).advance(
            request.match_info['id'],
            await request.json()
        )
    )


@routes.post('/stop/{id}')
async def stop(request: web.Request) -> web.Response:
    """
    ---
    summary: Stop a Process
    tags:
    - Stepper
    - Process
    operationId: process.stop
    produces:
    - application/json
    parameters:
    -
        name: id
        in: path
        required: true
        description: Process ID
        schema:
            type: string
    """
    return web.json_response(
        await store.get_store(request.app).stop(
            request.match_info['id']
        )
    )
