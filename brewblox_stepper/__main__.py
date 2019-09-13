"""
Application entrypoint
"""

from brewblox_service import (brewblox_logger, couchdb_client, events,
                              http_client, scheduler, service)

from brewblox_stepper import api, sse, store, updates

LOGGER = brewblox_logger(__name__)


def create_parser(default_name='stepper'):
    parser = service.create_parser(default_name=default_name)

    group = parser.add_argument_group('Updates')
    group.add_argument('--update-interval',
                       help='Interval (in seconds) between process updates [%(default)s]',
                       type=float,
                       default=2)

    # Service network options
    group = parser.add_argument_group('Service communication')
    group.add_argument('--broadcast-exchange',
                       help='Eventbus exchange to which service state is broadcast. [%(default)s]',
                       default='brewcast')
    group.add_argument('--volatile',
                       action='store_true',
                       help='Disable all outgoing network calls. [%(default)s]')

    return parser


def main():
    app = service.create_app(parser=create_parser())

    events.setup(app)
    scheduler.setup(app)
    http_client.setup(app)
    couchdb_client.setup(app)

    store.setup(app)
    updates.setup(app)
    api.setup(app)
    sse.setup(app)

    service.furnish(app)
    service.run(app)


if __name__ == '__main__':
    main()
