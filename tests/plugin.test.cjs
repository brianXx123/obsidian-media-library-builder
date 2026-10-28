const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Module=require('node:module');
class TFile { constructor(path){this.path=path;this.extension=path.split('.').pop();this.basename=path.split('/').pop();} }
const original=Module._load;
Module._load=function(name,...args){return name==='obsidian'?{Plugin:class{},ItemView:class{},Modal:class{},Notice:class{},TFile,setIcon(){}}:original.call(this,name,...args);};
const Plugin=require('../plugin/main.js');Module._load=original;
const {MovieWallView}=Plugin.__test;
test('Legacy and current notes load with original seasons and overrides',()=>{
 const files=[new TFile('Media Library/Movies/a.md'),new TFile('Media Library/TV Series/b.md')];
 const fm=[{id:'a',type:'movie',title:'星际穿越',watched:false,overview:'Example'}, {id:'b',type:'tv',title:'Test TV',seasons:[{season:1}],watched_seasons:['S1']}];
 const v=Object.create(MovieWallView.prototype);v.plugin={legacyStatuses:{a:true}};
 v.app={vault:{getMarkdownFiles:()=>files},metadataCache:{getFileCache:f=>({frontmatter:fm[files.indexOf(f)]})}};
 const rows=v.loadItems();assert.equal(rows.length,2);assert.ok(rows.find(x=>x.title==='星际穿越').watched);assert.equal(rows.find(x=>x.title==='Test TV').mediaType,'电视剧');
});
test('Combined genre, title, media and watched filters; year sorting',()=>{
 const v=Object.create(MovieWallView.prototype);Object.assign(v,{genre:'SF',sort:'year',mediaFilter:'movie',watchFilter:'all',query:''});
 const base={mediaType:'电影',collectionId:'',genres:['SF'],aliases:[],originalTitle:'',englishTitle:'',watched:false};
 const rows=[{...base,title:'A',year:2000},{...base,title:'B',year:2020},{...base,title:'C',genres:['Drama'],year:2024}];
 assert.deepEqual(v.visibleWalls(rows).movies.map(x=>x.title),['B','A']);
 v.query='a';assert.equal(v.visibleWalls(rows).movies.length,1);v.watchFilter='watched';assert.equal(v.visibleWalls(rows).movies.length,0);
});
test('Reject external, traversal and non-image poster paths',()=>{
 const v=Object.create(MovieWallView.prototype);v.app={vault:{getAbstractFileByPath:p=>new TFile(p),getResourcePath:f=>'resource:'+f.path}};
 for(const p of ['../x.jpg','/x.jpg','https://host/x.jpg','a\\x.jpg','a/./x.jpg','x.md'])assert.equal(v.resourcePath(p),'');
 assert.equal(v.resourcePath('Media Library/posters/x.jpg'),'resource:Media Library/posters/x.jpg');
});
test('Public plugin has no network, dynamic execution or HTML injection',()=>{
 const s=fs.readFileSync(require.resolve('../plugin/main.js'),'utf8');
 for(const bad of ['innerHTML','eval(', 'fetch(', 'child_process','http.request'])assert.ok(!s.includes(bad));
});
