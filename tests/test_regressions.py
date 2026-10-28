import csv, json, subprocess, sys, tempfile, unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
import media_library as m

class RegressionTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        self.vault=Path(self.tmp.name)/'vault'
        self.a=m.normalize_record({'id':'own-1','title':'中文 "片名", Ω\n新行','type':'电视剧','seasons':[{'season':1}],'year':2020})
    def test_preserve_edited_note_and_watch_status(self):
        m.run_build(self.vault,[self.a]);p=self.vault/m.note_path(self.a)
        content=p.read_text(encoding='utf-8').replace('watched: false','watched: true')+'\nMy review\n'
        p.write_text(content,encoding='utf-8');m.run_build(self.vault,[self.a])
        self.assertEqual(p.read_text(encoding='utf-8'),content)
    def test_same_id_changed_title_is_protected(self):
        m.run_build(self.vault,[self.a]);b={**self.a,'title':'Changed'}
        with self.assertRaises(m.LibraryError):m.run_build(self.vault,[b])
        self.assertEqual(len(list(self.vault.rglob('*.md'))),2)
    def test_foreign_catalog_rejected(self):
        p=self.vault/'Media Library/catalog.json';p.parent.mkdir(parents=True)
        p.write_text('{"schema_version":1,"items":[]}',encoding='utf-8')
        with self.assertRaises(m.LibraryError):m.run_build(self.vault,[self.a])
    def test_mid_write_failure_rolls_back(self):
        original=m.atomic;calls=0
        def fail_once(path,data):
            nonlocal calls
            calls+=1
            if calls==3:raise OSError('simulated disk failure')
            return original(path,data)
        with patch.object(m,'atomic',side_effect=fail_once):
            with self.assertRaises(OSError):m.run_build(self.vault,[self.a])
        self.assertFalse((self.vault/m.note_path(self.a)).exists())
        self.assertFalse((self.vault/'Media Library/.builder-recovery.json').exists())
        self.assertEqual(m.run_build(self.vault,[self.a]),(1,1))
    def test_csv_quoted_unicode_and_cli(self):
        source=Path(self.tmp.name)/'own.csv'
        with source.open('w',encoding='utf-8-sig',newline='') as f:
            writer=csv.DictWriter(f,fieldnames=['title','type']);writer.writeheader();writer.writerow({'title':self.a['title'],'type':'电视剧'})
        cli=Path(m.__file__)
        for cmd in [['import','--input',str(source),'--dry-run'],['import','--input',str(source)],['validate']]:
            result=subprocess.run([sys.executable,str(cli),*cmd,'--vault',str(self.vault)],capture_output=True)
            self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(m.load_records(source)[0]['title'],self.a['title'])
    def test_upgrade_backs_up_and_keeps_plugin_user_data(self):
        self.vault.mkdir();dest=m.install_plugin(self.vault)
        (dest/'main.js').write_text('// old plugin',encoding='utf-8')
        (dest/'data.json').write_text('{"custom":true}',encoding='utf-8')
        m.install_plugin(self.vault,upgrade=True)
        self.assertEqual((dest/'data.json').read_text(),'{"custom":true}')
        backups=list((self.vault/'.obsidian/plugin-backups').glob('*/main.js'))
        self.assertEqual(len(backups),1);self.assertEqual(backups[0].read_text(),'// old plugin')
    def test_deleted_item_does_not_reappear(self):
        m.run_build(self.vault,[self.a])
        p=self.vault/'Media Library/deleted-items.json'
        p.write_text(json.dumps({'items':[{'file':m.note_path(self.a).as_posix()}]}))
        with self.assertRaises(m.LibraryError):m.run_build(self.vault,[self.a])
    def test_invalid_fields(self):
        for row in [{'title':42},{'title':'A','year':True},{'title':'A','year':2020.5},{'title':'A','rating':'NaN'},{'title':'A','seasons':[{'season':1},{'season':1}]}]:
            with self.assertRaises(m.LibraryError):m.normalize_record(row)

if __name__=='__main__':unittest.main()
