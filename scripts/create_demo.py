#!/usr/bin/env python3
"""Create an isolated demonstration vault; artwork is optional and stays local."""
import argparse, shutil
from pathlib import Path
from media_library import load_records, run_build, install_plugin, LibraryError

def main():
    p=argparse.ArgumentParser();p.add_argument('--vault',required=True);p.add_argument('--poster-source');a=p.parse_args()
    vault=Path(a.vault)
    if vault.exists() and any(vault.iterdir()): raise LibraryError('Demo requires a new empty directory; existing vault protected')
    rows=load_records(Path(__file__).resolve().parents[1]/'examples/demo.json')
    if a.poster_source:
        source=Path(a.poster_source).resolve()
        for row in rows:
            if not row['poster']: continue
            name=Path(row['poster']).name;candidate=source/name
            if candidate.is_symlink() or not candidate.resolve().is_relative_to(source): raise LibraryError('Linked poster rejected')
            if candidate.is_file():
                target=vault/row['poster'];target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(candidate,target)
    print(run_build(vault,rows));print(install_plugin(vault))
    print('Open this vault in Obsidian and enable Media Library Wall. Posters not supplied display placeholders.')
if __name__=='__main__':main()
