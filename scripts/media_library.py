#!/usr/bin/env python3
"""Offline Obsidian movie/TV library generator (technical preview)."""
from __future__ import annotations
import argparse, csv, hashlib, html, json, os, re, sys, tempfile, math
from pathlib import Path

VERSION="0.3.1"
MARKER="<!-- generated-by: obsidian-media-library-builder; managed-file: true -->"
class LibraryError(Exception): pass

def normalize_record(row, num=1):
    if not isinstance(row,dict): raise LibraryError(f"Row {num}: expected object")
    if not isinstance(row.get("title"),str): raise LibraryError(f"Row {num}: title must be text")
    title=row["title"].strip()
    if len(title)>300: raise LibraryError(f"Row {num}: title too long")
    if not title: raise LibraryError(f"Row {num}: missing title")
    kind=str(row.get("type") or "movie").strip().lower()
    kind={"film":"movie","电影":"movie","series":"tv","电视剧":"tv","剧集":"tv"}.get(kind,kind)
    if kind not in ("movie","tv"): raise LibraryError(f"Row {num}: invalid type")
    y=row.get("year")
    try: year=int(y) if y not in ("",None) else None
    except (ValueError,TypeError): raise LibraryError(f"Row {num}: invalid year")
    if isinstance(y,bool) or (isinstance(y,float) and not y.is_integer()): raise LibraryError(f"Row {num}: invalid year")
    if year is not None and not 1880<=year<=2200: raise LibraryError(f"Row {num}: invalid year")
    r=row.get("rating")
    try: rating=float(r) if r not in ("",None) else None
    except (ValueError,TypeError): raise LibraryError(f"Row {num}: invalid rating")
    if rating is not None and not 0<=rating<=10: raise LibraryError(f"Row {num}: invalid rating")
    g=row.get("genres") or []
    genres=[str(x).strip() for x in g] if isinstance(g,list) else [x.strip() for x in re.split(r"[,;，；]",str(g))]
    v=row.get("watched",False)
    if isinstance(v,bool): watched=v
    elif str(v).strip().lower() in ("true","yes","1","已看","看过","watched"): watched=True
    elif str(v).strip().lower() in ("false","no","0","未看","unwatched",""): watched=False
    else: raise LibraryError(f"Row {num}: invalid watched status")
    uid=str(row.get("id") or hashlib.sha256((kind+"\x1f"+title.casefold()+"\x1f"+str(year or "")).encode()).hexdigest()[:16])
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,119}",uid): raise LibraryError(f"Row {num}: invalid ID")
    poster=str(row.get("poster") or "").replace("\\","/")
    if poster and (poster.startswith("/") or ":" in poster or any(x in (".","..","") for x in poster.split("/")) or not re.search(r"\.(png|jpe?g|webp|gif|avif)$",poster,re.I)): raise LibraryError(f"Row {num}: unsafe/non-image poster path")
    result=dict(id=uid,type=kind,title=title,original_title=str(row.get("original_title") or ""),year=year,genres=list(dict.fromkeys(x for x in genres if x)),rating=rating,watched=watched,overview=str(row.get("overview") or ""),poster=poster,tmdb_id=str(row.get("tmdb_id") or ""))
    for key in ("collection_id", "collection_name", "collection_original_name", "rating_source", "series_status"):
        result[key]=str(row.get(key) or "")[:300]
    for key in ("collection_order", "season_count", "episode_count"):
        value=row.get(key)
        try: result[key]=int(value) if value not in (None, "") else 0
        except (ValueError,TypeError): raise LibraryError(f"Row {num}: invalid {key}")
        if not 0<=result[key]<=100000: raise LibraryError(f"Row {num}: invalid {key}")
    seasons=row.get("seasons") or []
    if isinstance(seasons,str):
        try: seasons=json.loads(seasons)
        except ValueError: raise LibraryError(f"Row {num}: seasons must be a JSON array")
    if not isinstance(seasons,list) or len(seasons)>300: raise LibraryError(f"Row {num}: invalid seasons")
    result["seasons"]=[]
    seen=set()
    for season in seasons:
        if not isinstance(season,dict) or type(season.get("season")) is not int or not 1<=season["season"]<=300 or season["season"] in seen: raise LibraryError(f"Row {num}: invalid or duplicate season")
        seen.add(season["season"])
        status=season.get("status", "released")
        if status not in ("released", "upcoming"): raise LibraryError(f"Row {num}: invalid season status")
        result["seasons"].append({"season":season["season"],"label":str(season.get("label") or f'Season {season["season"]}')[:300],"status":status})
    result["personal_rating"]=None
    result["watched_seasons"]=[]
    return result

def load_records(path):
    path=Path(path)
    if not path.is_file() or path.stat().st_size>25*1024*1024: raise LibraryError("Missing/oversize input")
    if path.suffix.lower()==".csv":
        with path.open(encoding="utf-8-sig",newline="") as f: rows=list(csv.DictReader(f))
    elif path.suffix.lower()==".json":
        rows=json.loads(path.read_text(encoding="utf-8-sig"))
        if isinstance(rows,dict): rows=rows.get("items")
    else: raise LibraryError("Input must be CSV or JSON")
    if not isinstance(rows,list) or len(rows)>50000: raise LibraryError("Invalid item list")
    items=[normalize_record(r,i) for i,r in enumerate(rows,1)]
    if len({r["id"] for r in items})!=len(items): raise LibraryError("Duplicate IDs")
    return items

def note_path(item):
    safe=re.sub(r'[<>:"/\\|?*\x00-\x1f]',' ',item["title"]).strip(" .")[:65].strip(" .") or "Untitled"
    if safe.casefold() in ("con","prn","aux","nul"): safe="Untitled"
    name=f'{safe} ({item["year"]})' if item["year"] is not None else safe
    return Path("Media Library")/("Movies" if item["type"]=="movie" else "TV Series")/(name+f' [{item["id"][:12]}].md')

def note(item):
    keys=tuple(item)
    front="\n".join(k+": "+json.dumps(item[k],ensure_ascii=False) for k in keys)
    summary=item["overview"].replace("\r","").replace("\n---\n","\n— — —\n")
    return "---\n"+front+"\n---\n\n"+MARKER+"\n\n# "+item["title"]+"\n\n## Overview / 简介\n\n"+(summary or "No description yet. / 暂无简介。")+"\n"

def atomic(path,s):
    if path.is_symlink() or path.parent.is_symlink(): raise LibraryError("Symbolic-link destination rejected")
    path.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(prefix=".mlb-",dir=str(path.parent))
    try:
        with os.fdopen(fd,"w",encoding="utf-8",newline="\n") as f:
            f.write(s); f.flush(); os.fsync(f.fileno())
        os.replace(tmp,path)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)

def check_path(vault,path):
    vault=Path(vault).absolute()
    candidate=Path(path).absolute()
    if not candidate.is_relative_to(vault): raise LibraryError("Destination outside vault")
    for parent in [candidate,*candidate.parents]:
        if parent.is_symlink() or getattr(parent,"is_junction",lambda:False)(): raise LibraryError("Linked destination rejected")
        if parent==vault: break

def recover(vault):
    vault=Path(vault)
    path=vault/"Media Library/.builder-recovery.json"
    data=json.loads(path.read_text(encoding="utf-8"))
    for row in data["files"]:
        rel=Path(row["path"])
        if rel.is_absolute() or ".." in rel.parts or not rel.as_posix().startswith("Media Library/"): raise LibraryError("Invalid recovery path")
        check_path(vault,vault/rel)
    for row in data["files"]:
        target=vault/row["path"]
        if row["before"] is None: target.unlink(missing_ok=True)
        else: atomic(target,row["before"])
    path.unlink()


def wall(items):
    data=json.dumps(items,ensure_ascii=False).replace("<","\\u003c").replace(">","\\u003e").replace("&","\\u0026")
    return """<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Media Library / 影音库</title><style>body{background:#111318;color:#eee;font:15px system-ui;margin:auto;max-width:1100px;padding:24px}
input,select{background:#252935;color:#fff;padding:12px;border:1px solid #555;border-radius:8px;margin:6px}
#grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:18px;margin-top:24px}
.card{background:#1e222c;padding:12px;border-radius:12px;overflow-wrap:anywhere}.poster{aspect-ratio:2/3;background:#302b43;display:grid;place-items:center;color:#aaa;overflow:hidden}.poster img{width:100%;height:100%;object-fit:cover}
img{max-width:100%;max-height:100%;object-fit:cover}small{color:#aeb0c1}</style>
<h1>Media Library / 影音库</h1><p>Offline HTML preview — not the original Obsidian Movie Wall plugin.</p>
<input id="q" placeholder="Search / 搜索"><select id="kind"><option value="">All</option><option value="movie">Movies</option><option value="tv">TV</option></select>
<select id="status"><option value="">All statuses</option><option value="yes">Watched</option><option value="no">Not watched</option></select><div id="grid"></div>
<script>const items=DATA;const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){const q=document.querySelector('#q').value.toLowerCase(),k=document.querySelector('#kind').value,s=document.querySelector('#status').value;
document.querySelector('#grid').innerHTML=items.filter(x=>(!q||x.title.toLowerCase().includes(q))&&(!k||x.type===k)&&(!s||(s==='yes')===x.watched)).map(x=>'<div class="card"><div class="poster">'+(x.poster?'<img loading="lazy" alt="Poster" src="'+esc(x.poster.startsWith('Media Library/')?x.poster.slice(14):'../'+x.poster)+'">':'Poster / 海报')+'</div><h3>'+esc(x.title)+'</h3><small>'+esc(x.year??'')+' · '+esc(x.type)+' · '+(x.watched?'Watched':'Watchlist')+(x.rating==null?'':' · ★'+esc(x.rating))+'</small></div>').join('')}
for(const id of ['q','kind','status'])document.getElementById(id).addEventListener('input',render);render();</script></html>""".replace("DATA",data)

def run_build(vault,records,dry_run=False):
    vault=Path(vault)
    check_path(vault,vault/"Media Library/catalog.json")
    if vault.is_symlink(): raise LibraryError("Symlink vault rejected")
    base=vault/"Media Library"
    if base.is_symlink(): raise LibraryError("Symlink media folder rejected")
    cat=base/"catalog.json"
    recovery=base/".builder-recovery.json"
    if recovery.exists(): raise LibraryError("Interrupted build detected; inspect .builder-recovery.json and run recover before retrying")
    if cat.exists():
        old=json.loads(cat.read_text(encoding="utf-8"))
        if old.get("schema_version")!=1 or old.get("generator")!="obsidian-media-library-builder": raise LibraryError("Unknown catalog version")
        previous=old["items"]
    else: previous=[]
    byid={x["id"]:x for x in previous}; merged=dict(byid); planned=[]
    deleted=base/"deleted-items.json"
    tombstones=json.loads(deleted.read_text(encoding="utf-8")).get("items",[]) if deleted.exists() else []
    paths_to_ids={}
    for existing in previous:
        paths_to_ids[note_path(existing).as_posix()]=existing["id"]
    for x in records:
        x=dict(x)
        x["file"]=note_path(x).as_posix()
        if x["file"] in paths_to_ids and paths_to_ids[x["file"]]!=x["id"]: raise LibraryError("Note filename collision; choose distinct IDs: "+x["id"])
        paths_to_ids[x["file"]]=x["id"]
        if any(t.get("file")==x["file"] for t in tombstones): raise LibraryError("Previously deleted item; explicit recovery required: "+x["title"])
        if x["id"] in byid:
            previous_record=dict(byid[x["id"]]); previous_record.setdefault("file",x["file"])
            if previous_record!=x: raise LibraryError("Existing ID has changed metadata; existing note protected: "+x["id"])
        target=vault/note_path(x)
        if target.is_symlink() or target.parent.is_symlink(): raise LibraryError("Symlink note rejected")
        generated=note(x)
        if target.exists():
            existing=target.read_text(encoding="utf-8")
            if existing!=generated and not (x["id"] in byid and {**byid[x["id"]],"file":byid[x["id"]].get("file",x["file"])}==x and MARKER in existing):
                raise LibraryError("Existing note conflict: "+str(target))
        else: planned.append((target,generated))
        merged[x["id"]]=x
    entries=sorted(merged.values(),key=lambda x:(x["type"],x["title"].casefold(),x["id"]))
    index=["# Media Library / 影音库","",MARKER,""]
    for kind,label in (("movie","Movies / 电影"),("tv","TV Series / 电视剧")):
        index.extend(["## "+label,""])
        for x in entries:
            if x["type"]==kind:
                p=note_path(x).relative_to("Media Library").with_suffix("").as_posix()
                index.append("- [["+p+"|"+x["title"].replace("|"," ")+"]]")
        index.append("")
    idx=base/"Library Index.md"; preview=base/"Wall Preview.html"
    if idx.exists() and MARKER not in idx.read_text(encoding="utf-8"): raise LibraryError("Unmanaged index exists")
    if preview.exists() and "not the original Obsidian Movie Wall plugin" not in preview.read_text(encoding="utf-8"): raise LibraryError("Unmanaged preview exists")
    if not dry_run:
        writes=list(planned)
        writes.append((cat,json.dumps({"schema_version":1,"generator":"obsidian-media-library-builder","items":entries},ensure_ascii=False,indent=2)+"\n"))
        writes.append((idx,"\n".join(index)+"\n"))
        writes.append((preview,wall(entries)))
        for path,_ in writes: check_path(vault,path)
        journal={"files":[{"path":path.relative_to(vault).as_posix(),"before":path.read_text(encoding="utf-8") if path.exists() else None} for path,_ in writes]}
        atomic(recovery,json.dumps(journal,ensure_ascii=False))
        try:
            for path,data in writes: atomic(path,data)
        except Exception:
            recover(vault)
            raise
        recovery.unlink()
    return len(planned),len(entries)

def validate_vault(vault):
    base=Path(vault)/"Media Library"; cat=base/"catalog.json"
    if not cat.is_file(): return ["Catalog missing"]
    try:
        data=json.loads(cat.read_text(encoding="utf-8"))
        if data.get("schema_version")!=1: return ["Unknown schema"]
        missing=[str(note_path(x)) for x in data["items"] if not (Path(vault)/note_path(x)).is_file()]
        return missing
    except (OSError,ValueError,KeyError,TypeError) as e: return [str(e)]


def install_plugin(vault, dry_run=False, upgrade=False):
    """Safely copy the independent native wall plugin into an Obsidian vault.

    The user must explicitly enable it in Obsidian; this command does not alter
    community-plugins.json or any user preference.
    """
    vault=Path(vault).absolute()
    check_path(vault,vault/".obsidian/plugins/media-library-wall/main.js")
    if not vault.is_dir():
        raise LibraryError("Vault directory does not exist / 未找到库目录")
    plugin_src=Path(__file__).resolve().parent.parent/"plugin"
    dest=vault/".obsidian"/"plugins"/"media-library-wall"
    required=("manifest.json","main.js","styles.css")
    for directory in (vault/".obsidian",vault/".obsidian"/"plugins",dest):
        if directory.is_symlink():
            raise LibraryError("Refusing symlink in plugin destination / 拒绝符号链接")
    changed=any((dest/name).exists() and (dest/name).read_text(encoding="utf-8")!=(plugin_src/name).read_text(encoding="utf-8") for name in required)
    if upgrade and changed:
        mf=dest/"manifest.json"
        if not mf.is_file() or json.loads(mf.read_text(encoding="utf-8")).get("id")!="media-library-wall": raise LibraryError("Upgrade requires a known media-library-wall manifest")
    for name in required:
        source=plugin_src/name
        target=dest/name
        if not source.is_file():
            raise LibraryError("Missing plugin source: "+str(source))
        if target.is_symlink():
            raise LibraryError("Refusing symlink destination: "+str(target))
        if target.exists() and target.read_text(encoding="utf-8")!=source.read_text(encoding="utf-8") and not upgrade:
            raise LibraryError("Existing plugin file differs; refusing overwrite: "+str(target))
    if not dry_run:
        if upgrade and changed:
            backup=vault/".obsidian"/"plugin-backups"/("media-library-wall-"+__import__("datetime").datetime.now().strftime("%Y%m%d-%H%M%S-%f"))
            backup.mkdir(parents=True)
            for source in dest.iterdir():
                if source.is_file() and not source.is_symlink(): __import__("shutil").copy2(source,backup/source.name)
        dest.mkdir(parents=True,exist_ok=True)
        for name in required:
            target=dest/name
            if not target.exists() or upgrade:
                atomic(target,(plugin_src/name).read_text(encoding="utf-8"))
    return dest

def main():
    p=argparse.ArgumentParser(description="Obsidian Media Library Builder")
    sub=p.add_subparsers(dest="cmd",required=True)
    for name in ("init","import","validate","install-plugin","recover"):
        q=sub.add_parser(name); q.add_argument("--vault",required=True)
        if name=="install-plugin": q.add_argument("--upgrade",action="store_true")
        if name=="import": q.add_argument("--input",required=True)
        if name!="validate": q.add_argument("--dry-run",action="store_true")
    a=p.parse_args()
    try:
        if a.cmd=="recover":
            if a.dry_run: print("DRY RUN: recovery requested"); return 0
            recover(Path(a.vault)); print("Recovered interrupted build"); return 0
        if a.cmd=="install-plugin":
            folder=install_plugin(a.vault,a.dry_run,a.upgrade)
            print(('DRY RUN' if a.dry_run else 'INSTALLED')+': '+str(folder))
            print('Enable Media Library Wall manually in Obsidian Community plugins / 请在 Obsidian 中手动启用')
            return 0
        if a.cmd=="validate":
            errors=validate_vault(a.vault)
            if errors: raise LibraryError("; ".join(errors))
            print("PASS: catalog and generated notes verified"); return 0
        new,total=run_build(a.vault,load_records(a.input) if a.cmd=="import" else [],a.dry_run)
        print(f'{"DRY RUN" if a.dry_run else "OK"}: {new} new notes; {total} catalog entries');return 0
    except (LibraryError,OSError,ValueError,UnicodeError,KeyError,TypeError) as e:
        print("ERROR:",e,file=sys.stderr);return 2
if __name__=="__main__": sys.exit(main())
