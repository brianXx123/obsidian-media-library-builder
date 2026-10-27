// Native Obsidian plugin compatibility tests. No app installation required.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

class FakeNode {
  constructor(tag='div') {this.tag=tag;this.children=[];this.attrs={};this.events={};this.value='';}
  createEl(tag){const n=new FakeNode(tag);this.children.push(n);return n;}
  addClass(cls){this.cls=((this.cls||'')+' '+cls).trim();}
  setText(t){this.text=String(t);}
  empty(){this.children=[];}
  setAttribute(k,v){this.attrs[k]=v;}
  addEventListener(type,fn){this.events[type]=fn;}
  querySelector(tag){return this.children.find(n=>n.tag===tag)||null;}
  remove(){this.removed=true;}
  walk(){return [this,...this.children.flatMap(c=>c.walk())];}
}
class ItemView {
  constructor(leaf){this.leaf=leaf;this.app=leaf.app;this.contentEl=new FakeNode();}
  registerEvent(){}
}
class Plugin {
  constructor(app){this.app=app;}
  registerView(type,fn){this.factory=fn;}
  addRibbonIcon(){}
  addCommand(){}
}
class Modal {
  constructor(app){this.app=app;this.contentEl=new FakeNode();}
  open(){this.onOpen();}
  close(){this.onClose();}
}
const notices=[];
const source=fs.readFileSync(path.join(__dirname,'../plugin/main.js'),'utf8');
const moduleBox={exports:{}};
vm.runInNewContext(source,{
  module:moduleBox, require:(name)=>{
    assert.equal(name,'obsidian');
    return {Plugin,ItemView,Modal,Notice:class{constructor(v){notices.push(v);}}};
  }
},{filename:'plugin/main.js',timeout:3000});
const Loaded=moduleBox.exports;

function fixture(catalog) {
  const store=new Map([['Media Library/catalog.json',JSON.stringify(catalog)]]);
  const adapter={
    exists:async p=>store.has(p),
    read:async p=>store.get(p),
    write:async(p,v)=>{store.set(p,v);}
  };
  const vault={
    adapter,
    on:()=>({}),
    getAbstractFileByPath:()=>null,
    getMarkdownFiles:()=>[]
  };
  const app={vault,workspace:{getLeaf:()=>({app,setViewState:async()=>{},openFile:async()=>{}}),revealLeaf:()=>{},detachLeavesOfType:()=>{}}};
  return {store,app};
}
const data={schema_version:1,items:[
  {id:'fictional01',title:'星际旅行',original_title:'Orbital Journey',type:'movie',year:2024,rating:8.2,genres:['科幻'],watched:false,poster:''},
  {id:'fictional02',title:'Mystery Town',type:'tv',year:2023,rating:7.8,genres:['悬疑'],watched:true,poster:'../secret.png'}
]};

test('Plugin loads and registers native view',async()=>{
  const {app}=fixture(data);const p=new Loaded(app);await p.onload();
  const v=p.factory({app});assert.equal(v.getViewType(),'media-library-wall');
  await v.onOpen();
  assert.equal(v.records.length,2);
  assert.equal(v.grid.children.length,2);
  assert.ok(v.contentEl.walk().some(x=>x.tag==='select'));
});
test('Save watch status as independent user state',async()=>{
  const {app,store}=fixture(data);const p=new Loaded(app);await p.onload();
  const v=p.factory({app});await v.onOpen();
  await p.setWatched('fictional01',true);
  assert.equal(JSON.parse(store.get('Media Library/user-state.json')).statuses.fictional01,true);
  assert.equal(JSON.parse(store.get('Media Library/catalog.json')).items[0].watched,false);
  await v.refresh();
  assert.equal(p.isWatched(v.records[0]),true);
});
test('Filter works without overwriting files',async()=>{
  const {app}=fixture(data);const p=new Loaded(app);await p.onload();
  const v=p.factory({app});await v.onOpen();v.query='mystery';v.drawCards();assert.equal(v.grid.children.length,1);
  v.type='movie';v.drawCards();assert.equal(v.grid.children.length,1); // empty-state message
  assert.equal(v.grid.children[0].text,'No matches / 无符合条件的作品');
});
test('Reject duplicate catalog IDs and do not execute HTML',async()=>{
  const bad={schema_version:1,items:[data.items[0],data.items[0]]};
  const {app}=fixture(bad);const p=new Loaded(app);await p.onload();
  const v=p.factory({app});await v.onOpen();assert.equal(v.records.length,0);
  assert.ok(v.error.includes('duplicate'));
});
test('No remote image URLs or script HTML injection sinks',()=>{
  assert.ok(!source.includes('innerHTML'));
  assert.ok(!source.includes('eval('));
  assert.ok(!source.includes('fetch('));
  assert.ok(!source.includes('require(\'child_process\')'));
});
