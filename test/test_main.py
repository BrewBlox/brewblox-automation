from brewblox_automation import __main__ as main
from brewblox_automation import runner, store

TESTED = main.__name__


def test_main(mocker, app):
    mocker.patch(TESTED + '.service.run')
    mocker.patch(TESTED + '.service.create_app').return_value = app

    main.main()

    assert None not in [
        store.get_store(app),
        runner.get_runner(app)
    ]
