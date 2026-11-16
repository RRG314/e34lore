"""Connection boundary for the disposable support test database, never production."""
from urllib.parse import urlsplit


def support_fixture_connection(dsn, environment):
    try:
        uri = urlsplit(dsn)
        valid = (uri.scheme == 'postgresql' and uri.hostname == '127.0.0.1'
                 and uri.port == 55439 and uri.path == '/e34_support_test'
                 and uri.username in (None, 'postgres') and uri.password is None
                 and not uri.query and not uri.fragment)
    except ValueError:
        valid = False
    if not valid:
        raise ValueError('Only the dedicated loopback support fixture database is accepted, without connection overrides.')
    # PGHOSTADDR and other inherited options can otherwise override a URI host.
    clean = {key: value for key, value in environment.items() if not key.startswith('PG')}
    return ['-h', '127.0.0.1', '-p', '55439', '-U', 'postgres'], clean
