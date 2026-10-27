import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
import media_library as m

class PluginInstallTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.vault=Path(self.tmp.name)/"My Vault"
        self.vault.mkdir()
    def test_install_and_repeat_safe(self):
        dest=m.install_plugin(self.vault)
        self.assertEqual(sorted(x.name for x in dest.iterdir()),["main.js","manifest.json","styles.css"])
        self.assertEqual(m.install_plugin(self.vault),dest)
        self.assertFalse((self.vault/".obsidian"/"community-plugins.json").exists())
    def test_dry_run_no_files_created(self):
        m.install_plugin(self.vault,True)
        self.assertFalse((self.vault/".obsidian").exists())
    def test_refuse_overwrite_existing(self):
        p=self.vault/".obsidian"/"plugins"/"media-library-wall"
        p.mkdir(parents=True)
        (p/"main.js").write_text("// another plugin",encoding="utf-8")
        with self.assertRaises(m.LibraryError):
            m.install_plugin(self.vault)
        self.assertEqual((p/"main.js").read_text(encoding="utf-8"),"// another plugin")
    def test_missing_vault(self):
        with self.assertRaises(m.LibraryError):
            m.install_plugin(self.vault/"missing")

if __name__=="__main__":
    unittest.main()
