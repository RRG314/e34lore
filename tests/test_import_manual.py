import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('import_manual',Path(__file__).parents[1]/'tools/import_manual.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ManualImportTests(unittest.TestCase):
    def test_body_cross_reference_does_not_create_a_chapter(self):
        text='RADIATOR AND COOLING SYSTEM 170-1\nGENERAL\nSee front suspension 310-4\f'
        result=module.index_pages(text)
        self.assertEqual([c['id'] for c in result['chapters']],['170'])
    def test_ranges_use_physical_pages_and_ignore_index_body(self):
        text='Foreword\nScope\fCOOLING 170-1\nGENERAL\fCOOLING 170-2\nTESTS\fINDEX\nA\nCooling 170-1\f'
        result=module.index_pages(text)
        self.assertEqual(result['pdfPageCount'],4)
        self.assertEqual((result['chapters'][0]['pdfStart'],result['chapters'][0]['pdfEnd']),(2,3))
        self.assertFalse(result['chapters'][0]['technicalClaimsVerified'])
    def test_noncontiguous_headers_are_flagged(self):
        result=module.index_pages('COOLING 170-1\fBRAKES 340-1\fCOOLING 170-2\f')
        self.assertTrue(result['issues'])
    def test_public_or_implicit_destinations_are_rejected(self):
        for path in ['/tmp/public/private','/tmp/output','/tmp/private/dist']:
            with self.assertRaises(ValueError):module.validate_destination(Path(path))
    def test_private_destination_is_explicit(self):
        self.assertEqual(module.validate_destination(Path('/tmp/private/imports')),Path('/tmp/private/imports').resolve())

if __name__=='__main__':unittest.main()
