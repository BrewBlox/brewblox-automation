"""
API for process CRUD
"""

from aiohttp import web
from brewblox_service import brewblox_logger

from brewblox_stepper import store

LOGGER = brewblox_logger(__name__)
routes = web.RouteTableDef()


def setup(app: web.Application):
    app.router.add_routes(routes)


@routes.post('/process')
async def create(request: web.Request) -> web.Response:
    """
    ---
    summary: Create new process
    tags:
    - Stepper
    - Process
    operationId: process.create
    produces:
    - application/json
    parameters:
    -
        in: body
        name: body
        description: process
        required: true
    """
    return web.json_response(
        await store.get_process_store(request.app).create(
            await request.json()
        )
    )


@routes.get('/process')
async def all(request: web.Request) -> web.Response:
    """
    ---
    summary: Return all processes
    tags:
    - Stepper
    - Process
    operationId: process.all
    produces:
    - application/json
    """
    return web.json_response(
        await store.get_process_store(request.app).all()
    )


@routes.delete('/process')
async def clear(request: web.Request) -> web.Response:
    """
    ---
    summary: Remove all processes
    tags:
    - Stepper
    - Process
    operationId: process.clear
    produces:
    - application/json
    """
    return web.json_response(
        await store.get_process_store(request.app).clear()
    )


@routes.get('/process/{id}')
async def read(request: web.Request) -> web.Response:
    """
    ---
    summary: Read one process
    tags:
    - Stepper
    - Process
    operationId: process.read
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
        await store.get_process_store(request.app).read(
            request.match_info['id']
        )
    )


@routes.put('/process/{id}')
async def write(request: web.Request) -> web.Response:
    """
    ---
    summary: Update one process
    tags:
    - Stepper
    - Process
    operationId: process.write
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
        in: body
        name: body
        description: process
        required: true
    """
    return web.json_response(
        await store.get_process_store(request.app).write(
            request.match_info['id'],
            await request.json()
        )
    )


@routes.delete('/process/{id}')
async def remove(request: web.Request) -> web.Response:
    """
    ---
    summary: Remove one process
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
        await store.get_process_store(request.app).remove(
            request.match_info['id']
        )
    )


@routes.post('/start/{id}')
async def start(request: web.Request) -> web.Response:
    """
    ---
    summary: Start a Process
    tags:
    - Stepper
    - Process
    operationId: process.start
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
        await store.get_runtime_store(request.app).start(
            request.match_info['id']
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
        await store.get_runtime_store(request.app).advance(
            request.match_info['id'],
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
    operationId: process.runtime.all
    produces:
    - application/json
    """
    return web.json_response(
        await store.get_runtime_store(request.app).all()
    )


@routes.get('/runtime/{id}')
async def read_runtime(request: web.Request) -> web.Response:
    """
    ---
    summary: Read one runtime
    tags:
    - Stepper
    - Process
    operationId: process.runtime.read
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
        await store.get_runtime_store(request.app).read(
            request.match_info['id']
        )
    )


@routes.post('/exit/{id}')
async def exit(request: web.Request) -> web.Response:
    """
    ---
    summary: Exit runtime
    tags:
    - Stepper
    - Process
    operationId: process.exit
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
        await store.get_runtime_store(request.app).exit(
            request.match_info['id'],
            await request.json()
        )
    )
