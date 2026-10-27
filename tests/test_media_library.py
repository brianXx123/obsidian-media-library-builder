import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
import media_library as m

class LibraryTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.vault=Path(self.tmp.name)/"vault"
        self.item=m.normalize_record({"title":"Fictional Star","year":2024,"type":"movie","watched":"yes"},1)
    def test_normalization(self):
        self.assertTrue(self.item["watched"])
        self.assertEqual(self.item["type"],"movie")
    def test_build_and_idempotency(self):
        self.assertEqual(m.run_build(self.vault,[self.item]),(1,1))
        self.assertEqual(m.run_build(self.vault,[self.item]),(0,1))
        self.assertEqual(m.validate_vault(self.vault),[])
    def test_dry_run(self):
        self.assertEqual(m.run_build(self.vault,[self.item],True),(1,1))
        self.assertFalse((self.vault/"Media Library").exists())
    def test_conflict(self):
        p=self.vault/m.note_path(self.item)
        p.parent.mkdir(parents=True)
        p.write_text("Private note",encoding="utf-8")
        with self.assertRaises(m.LibraryError):m.run_build(self.vault,[self.item])
    def test_bad_poster(self):
        with self.assertRaises(m.LibraryError):
            m.normalize_record({"title":"x","poster":"../private.jpg"},1)
    def test_html_escaping(self):
        x=m.normalize_record({"title":"<script>alert(1)</script>"},1)
        self.assertNotIn("<script>alert(1)</script>",m.wall([x]))
    def test_status(self):
        with self.assertRaises(m.LibraryError):
            m.normalize_record({"title":"x","watched":"maybe"},1)
    def test_json_import(self):
        p=Path(self.tmp.name)/"items.json"
        p.write_text(json.dumps({"items":[{"title":"Example"}]}),encoding="utf-8")
        self.assertEqual(len(m.load_records(p)),1)
if __name__=="__main__":unittest.main()
