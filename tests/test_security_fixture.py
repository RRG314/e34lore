import unittest
from tools.local_fixture import support_fixture_connection


class FixtureConnectionBoundary(unittest.TestCase):
    def test_reconstructs_only_the_named_local_connection(self):
        args, _ = support_fixture_connection('postgresql://postgres@127.0.0.1:55439/e34_support_test', {})
        self.assertEqual(args, ['-h', '127.0.0.1', '-p', '55439', '-U', 'postgres'])

    def test_strips_inherited_connection_overrides(self):
        _, env = support_fixture_connection('postgresql://127.0.0.1:55439/e34_support_test', {'PGHOSTADDR': '198.51.100.1', 'PGSERVICE': 'production', 'PGDATABASE': 'production', 'PATH': '/usr/bin'})
        self.assertEqual(env, {'PATH': '/usr/bin'})

    def test_rejects_remote_hosts_and_other_databases(self):
        for uri in ['postgresql://198.51.100.1:55439/e34_support_test', 'postgresql://127.0.0.1:5432/e34_support_test', 'postgresql://127.0.0.1:55439/postgres']:
            with self.subTest(uri=uri), self.assertRaises(ValueError):
                support_fixture_connection(uri, {})

    def test_rejects_uri_connection_overrides(self):
        for suffix in ['?hostaddr=198.51.100.1', '?service=production', '#anything']:
            with self.subTest(suffix=suffix), self.assertRaises(ValueError):
                support_fixture_connection('postgresql://127.0.0.1:55439/e34_support_test' + suffix, {})

    def test_rejects_credentials_and_malformed_connections(self):
        for uri in ['postgresql://other@127.0.0.1:55439/e34_support_test', 'postgresql://postgres:password@127.0.0.1:55439/e34_support_test', 'postgresql://127.0.0.1:invalid/e34_support_test', 'file:///e34_support_test']:
            with self.subTest(uri=uri), self.assertRaises(ValueError):
                support_fixture_connection(uri, {})
