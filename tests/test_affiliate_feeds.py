import json
import unittest
from tools.affiliate_feeds import normalize_feed, read_rows

SOURCE='https://parts.example/authorized-feed'
LICENSE='https://parts.example/terms'
BASE={'retailer_sku':'SKU-1','title':'Test pump seal','product_url':'https://parts.example/seal','oem_numbers':['11 51 1 711 484']}

class AffiliateFeedTests(unittest.TestCase):
    def normalize(self, rows):
        return normalize_feed(json.dumps(rows).encode(),'json','test-retailer',SOURCE,LICENSE)

    def test_explicit_numbers_and_decimal_money(self):
        result=self.normalize([{**BASE,'price':'12.34','currency':'USD','availability':'in stock'}])
        product=result['products'][0]
        self.assertEqual(product['oem_numbers'],['11511711484'])
        self.assertEqual(product['price_cents'],1234)
        self.assertIsNone(product['price_observed_at'])
        self.assertEqual(product['availability'],'in_stock')
        self.assertNotIn('review_status',product)

    def test_names_and_manufacturer_numbers_do_not_create_bmw_matches(self):
        product=self.normalize([{**BASE,'oem_numbers':[],'manufacturer_part_number':'11511711484'}])['products'][0]
        self.assertEqual(product['oem_numbers'],[])

    def test_duplicates_and_conflicts(self):
        self.assertEqual(self.normalize([BASE,BASE])['preview']['duplicates'],1)
        result=self.normalize([BASE,{**BASE,'product_url':'https://parts.example/other'}])
        self.assertEqual(result['products'],[])
        self.assertEqual(result['preview']['conflicting_skus'],['SKU-1'])

    def test_malformed_prices_identifiers_and_urls_are_withheld(self):
        for extra in [{'price':'12.345','currency':'USD'},{'price':'-1','currency':'USD'},{'oem_numbers':['1151171148411511711485']},{'product_url':'https://parts.example@evil.example/a?api_key=secret'}]:
            self.assertEqual(self.normalize([{**BASE,**extra}])['products'],[])

    def test_csv_and_namespaced_xml_mapping(self):
        csv=b'sku,name,url,oem\nA,Seal,https://parts.example/a,11511711484\n'
        mapping={'retailer_sku':'sku','title':'name','product_url':'url','oem_numbers':'oem'}
        result=normalize_feed(csv,'csv','test-retailer',SOURCE,LICENSE,mapping)
        self.assertEqual(result['products'][0]['retailer_sku'],'A')
        xml=b'<catalog xmlns="urn:test"><product sku="A"><name>Seal</name><url>https://parts.example/a</url><oem>11511711484</oem></product></catalog>'
        mapping['retailer_sku']='@sku'
        result=normalize_feed(xml,'xml','test-retailer',SOURCE,LICENSE,mapping)
        self.assertEqual(result['products'][0]['oem_numbers'],['11511711484'])

    def test_xml_entities_and_large_inputs_are_rejected(self):
        for value in [b'<!DOCTYPE x [<!ENTITY a SYSTEM "file:///etc/passwd">]><catalog/>',b'<catalog>'+b' '*4_000_001+b'</catalog>']:
            with self.assertRaises(ValueError): read_rows(value,'xml')

if __name__=='__main__': unittest.main()
