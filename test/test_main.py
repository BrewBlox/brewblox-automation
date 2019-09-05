from brewblox_stepper import __main__ as main
from brewblox_stepper import store, updates

TESTED = main.__name__


def test_main(mocker, app):
    mocker.patch(TESTED + '.service.run')
    mocker.patch(TESTED + '.service.create_app').return_value = app

    main.main()

    assert None not in [
        store.get_process_store(app),
        store.get_runtime_store(app),
        updates.get_updater(app)
    ]
