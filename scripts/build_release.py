#!/usr/bin/env python3
"""Build deterministic release packages, extract and test the complete Skill."""
import hashlib, json, shutil, subprocess, sys, tempfile, zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
VERSION=json.loads((ROOT/'plugin/manifest.json').read_text(encoding='utf-8'))['version']

def archive(path,files):
    # ZIP_STORED avoids zlib-version differences; fixed Unix header fields avoid
    # platform-specific ZipInfo defaults. Contents are small enough to ship raw.
    with zipfile.ZipFile(path,'w',zipfile.ZIP_STORED) as z:
        for name,source in sorted(files):
            info=zipfile.ZipInfo(name,(2026,1,1,0,0,0));info.create_system=3;info.compress_type=zipfile.ZIP_STORED;info.external_attr=0o100644<<16
            z.writestr(info,source.read_bytes())

def build():
    release=ROOT/'release';release.mkdir(exist_ok=True)
    required=['main.js','manifest.json','styles.css']
    assert json.loads((ROOT/'manifest.json').read_text(encoding='utf-8'))==json.loads((ROOT/'plugin/manifest.json').read_text(encoding='utf-8'))
    plugin=release/f'media-library-wall-v{VERSION}.zip'
    archive(plugin,[(name,ROOT/'plugin'/name) for name in required])
    skill=release/f'obsidian-media-library-builder-v{VERSION}.skill'
    paths=[ROOT/'SKILL.md',ROOT/'LICENSE']
    for folder in ['scripts','plugin','examples','references']:
        paths.extend(p for p in (ROOT/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix in ['.py','.md','.json','.csv','.js','.css'])
    paths=[p for p in paths if p.name!='build_release.py']
    archive(skill,[('obsidian-media-library-builder/'+p.relative_to(ROOT).as_posix(),p) for p in paths])
    with tempfile.TemporaryDirectory() as temp:
        target=Path(temp)
        with zipfile.ZipFile(skill) as z:
            assert z.testzip() is None
            assert all(n.startswith('obsidian-media-library-builder/') and '..' not in Path(n).parts for n in z.namelist())
            z.extractall(target)
        extracted=target/'obsidian-media-library-builder';vault=target/'fresh-vault'
        assert (extracted/'SKILL.md').read_text(encoding='utf-8').startswith('---\nname: obsidian-media-library-builder\n')
        for args in [ ['import','--input',str(extracted/'examples/sample.csv'),'--dry-run'],['import','--input',str(extracted/'examples/sample.csv')],['import','--input',str(extracted/'examples/sample.csv')],['validate'],['install-plugin'] ]:
            subprocess.run([sys.executable,str(extracted/'scripts/media_library.py'),*args,'--vault',str(vault)],check=True)
        for name in required:assert (vault/'.obsidian/plugins/media-library-wall'/name).read_text(encoding='utf-8')==(ROOT/'plugin'/name).read_text(encoding='utf-8')
    with zipfile.ZipFile(plugin) as z:
        assert sorted(z.namelist())==sorted(required)
        for name in required:assert z.read(name)==(ROOT/'plugin'/name).read_bytes()
    for name in required:shutil.copy2(ROOT/'plugin'/name,release/name)
    sums=[]
    for path in [skill,plugin,*[release/n for n in required]]:
        sums.append(hashlib.sha256(path.read_bytes()).hexdigest()+'  '+path.name)
    (release/'SHA256SUMS.txt').write_text('\n'.join(sums)+'\n',encoding='utf-8',newline='\n')
    print('PASS: extracted Skill install, repeat import, plugin ZIP contents and SHA-256; version',VERSION)
if __name__=='__main__':build()
