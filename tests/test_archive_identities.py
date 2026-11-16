import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from import_archive_identities import compile_identities
class ArchiveIdentityTest(unittest.TestCase):
 def tree(self):return {'chassis':'E34','variants':[{'key':'HA11'}],'groups':[{'name':'Engine','diagrams':[{'btnr':'11_0018','name':'Short engine','parts':[{'pre':'0711','sachnr':'9905374','pos':'01','name':'Hex bolt','fit':[0]},{'pre':'    ','sachnr':'       ','pos':None,'name':'','fit':[]}]}]}]}
 def test_explicit_identifier_and_source_association_without_fitment(self):
  rows,rejected=compile_identities(self.tree());self.assertEqual(rows[0]['number'],'07119905374');self.assertEqual(rows[0]['source_candidate_type_codes'],['HA11']);self.assertNotIn('confirmed_fitment',rows[0]);self.assertEqual(len(rejected),1)
 def test_never_guesses_the_prefix_from_a_diagram_or_seven_digit_suffix(self):
  tree=self.tree();tree['groups'][0]['diagrams'][0]['parts'][0]['pre']='';rows,rejected=compile_identities(tree);self.assertEqual(rows,[]);self.assertEqual(len(rejected),2)
 def test_rejects_out_of_range_vehicle_associations(self):
  tree=self.tree();tree['groups'][0]['diagrams'][0]['parts'][0]['fit']=[127]
  with self.assertRaisesRegex(ValueError,'variant index'):compile_identities(tree)
 def test_repeated_identity_keeps_every_source_diagram(self):
  tree=self.tree();tree['groups'][0]['diagrams'].append({'btnr':'11_0020','name':'Timing cover','parts':[{'pre':'0711','sachnr':'9905374','pos':'05','name':'Hex bolt','fit':[0]}]});rows,_=compile_identities(tree);self.assertEqual(len(rows),1);self.assertEqual(len(rows[0]['diagrams']),2);self.assertEqual(rows[0]['source_rows'],2)
if __name__=='__main__':unittest.main()
