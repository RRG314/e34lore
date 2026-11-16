import importlib.util,sys,unittest
from pathlib import Path
tools=Path(__file__).resolve().parents[1]/'tools'
sys.path.insert(0,str(tools))
try:
 spec=importlib.util.spec_from_file_location('catalog_selection',tools/'discover_catalog_selection.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
finally:sys.path.pop(0)

class SourceSelectionTests(unittest.TestCase):
 def test_requires_the_exact_observed_model_root_link(self):
  with self.assertRaisesRegex(ValueError,'does not advertise'):
   module.observed_inventory('540i',1994,'Sedan','<a href="/1995-bmw-540i-sedan_e34-parts.html">1995</a>','<h1>1994 BMW 540i Sedan(E34) Parts</h1>','https://www.bmwpartsdeal.com/1994-bmw-540i-sedan_e34-parts.html')
 def test_does_not_relabel_a_nearby_model_year_as_the_requested_year(self):
  url='https://www.bmwpartsdeal.com/1994-bmw-540i-sedan_e34-parts.html'
  with self.assertRaisesRegex(ValueError,'heading'):
   module.observed_inventory('540i',1994,'Sedan',f'<a href="{url}">1994</a>','<h1>1995 BMW 540i Sedan(E34) Parts</h1>',url)
 def test_does_not_register_a_gateway_or_incomplete_index_as_a_complete_source(self):
  url='https://www.bmwpartsdeal.com/1994-bmw-530i-wagon_e34-parts.html'
  with self.assertRaisesRegex(ValueError,'incomplete'):
   module.observed_inventory('530i',1994,'Wagon',f'<a href="{url}">1994</a>','<h1>1994 BMW 530i Wagon(E34) Parts</h1><a href="https://example.org/parts-list/1994-bmw-530i-wagon_e34/engine/part.html">Untrusted link</a>',url)
