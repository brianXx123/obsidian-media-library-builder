/*
 * Media Library Wall: the native Obsidian module of the original
 * Obsidian Media Library Builder project by brianXx123.
 * No network access, dynamic code, external images, or user-provided HTML.
 * Earlier local Movie Wall source integration remains a separate development task.
 */
const { Plugin, ItemView, Modal, Notice } = require('obsidian');
const VIEW = 'media-library-wall';
const CATALOG = 'Media Library/catalog.json';
const STATE = 'Media Library/user-state.json';
const MAX_ENTRIES = 50000;
const REQ = (x) => typeof x === 'string' ? x : '';

function validateCatalog(data) {
  if (!data || data.schema_version !== 1 || !Array.isArray(data.items) || data.items.length > MAX_ENTRIES) {
    throw new Error('Unsupported catalog format or catalog too large / 目录数据格式有误');
  }
  const ids = new Set();
  return data.items.map(item => {
    if (!item || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/.test(item.id || '') || ids.has(item.id)) {
      throw new Error('Invalid or duplicate catalog ID / 作品 ID 重复或无效');
    }
    ids.add(item.id);
    return {
      id:item.id, title:REQ(item.title).slice(0,300), original_title:REQ(item.original_title).slice(0,300),
      type:item.type === 'tv' ? 'tv' : 'movie', year:Number.isInteger(item.year) ? item.year : null,
      rating:(typeof item.rating === 'number' && Number.isFinite(item.rating)) ? item.rating : null,
      genres:Array.isArray(item.genres) ? item.genres.filter(x=>typeof x==='string').slice(0,30) : [],
      overview:REQ(item.overview).slice(0,20000), poster:REQ(item.poster),
      watched:item.watched === true
    };
  });
}
function safePosterPath(value) {
  if (!value || value.startsWith('/') || value.startsWith('\\') || value.includes('\\') ||
      value.includes(':') || value.split('/').some(x => x === '..' || x === '.' || x === '') || value.length > 500) return null;
  return value;
}
function makeElement(parent, tag, cls, text) {
  const node = parent.createEl(tag);
  if (cls) node.addClass(cls);
  if (text !== undefined) node.setText(String(text));
  return node;
}
class MediaDetail extends Modal {
  constructor(app, plugin, item, refresh) { super(app); this.plugin=plugin; this.item=item; this.refresh=refresh; }
  onOpen() {
    const box=this.contentEl; box.empty(); box.addClass('mlb-detail');
    makeElement(box,'h2','',this.item.title);
    if (this.item.original_title) makeElement(box,'p','mlb-subtitle',this.item.original_title);
    makeElement(box,'p','mlb-subtitle',[this.item.year||'—', this.item.type==='tv'?'TV / 电视剧':'Movie / 电影',this.item.rating===null?'':'★ '+this.item.rating].filter(Boolean).join(' · '));
    const art=this.plugin.posterElement(box,this.item,'mlb-detail-art'); if(!art.querySelector('img')) art.remove();
    if (this.item.genres.length) makeElement(box,'p','mlb-tags',this.item.genres.join('  ·  '));
    if(this.item.overview) makeElement(box,'p','mlb-overview',this.item.overview);
    const actions=makeElement(box,'div','mlb-detail-actions');
    const flag=this.plugin.isWatched(this.item);
    const toggle=makeElement(actions,'button','mod-cta',flag?'✓ Watched / 已看':'Mark watched / 标记已看');
    toggle.addEventListener('click',async()=>{
      toggle.disabled=true;
      try {await this.plugin.setWatched(this.item.id,!this.plugin.isWatched(this.item));this.refresh();this.close();}
      catch(e){new Notice('Save failed / 保存失败: '+e.message);toggle.disabled=false;}
    });
    const open=makeElement(actions,'button','','Open note / 打开笔记');
    open.addEventListener('click',async()=>{
      const suffix='['+this.item.id.slice(0,12)+'].md';
      const f=this.app.vault.getMarkdownFiles().find(x=>x.path.startsWith('Media Library/')&&x.name.endsWith(suffix));
      if(!f){new Notice('Note not found / 未找到笔记');return;}
      await this.app.workspace.getLeaf(true).openFile(f);
      this.close();
    });
  }
  onClose(){this.contentEl.empty();}
}
class MediaWallView extends ItemView {
  constructor(leaf, plugin){super(leaf);this.plugin=plugin;this.records=[];this.query='';this.type='all';this.status='all';this.genre='all';this.sort='title';}
  getViewType(){return VIEW;}
  getDisplayText(){return 'Media Library / 影音库';}
  getIcon(){return 'film';}
  async onOpen(){
    await this.refresh();
    this.registerEvent(this.app.vault.on('modify',f=>{if(f.path===CATALOG)this.refresh();}));
    this.registerEvent(this.app.vault.on('create',f=>{if(f.path===CATALOG)this.refresh();}));
    this.registerEvent(this.app.vault.on('delete',f=>{if(f.path===CATALOG)this.refresh();}));
  }
  async refresh(){
    try {
      if (!(await this.app.vault.adapter.exists(CATALOG))) {this.records=[];this.error='Catalog missing / 未找到 Media Library/catalog.json';}
      else {const data=JSON.parse(await this.app.vault.adapter.read(CATALOG));this.records=validateCatalog(data);this.error='';}
      await this.plugin.loadState();
    } catch(e){this.records=[];this.error=e.message;}
    this.render();
  }
  render(){
    const c=this.contentEl; c.empty();c.addClass('mlb-root');
    makeElement(c,'h2','','Media Library / 影音库');
    if(this.error){makeElement(c,'p','mlb-error',this.error);makeElement(c,'p','mlb-subtitle','Run the builder with a CSV/JSON file first. / 请先用生成器导入片单。');return;}
    const toolbar=makeElement(c,'div','mlb-toolbar');
    const search=makeElement(toolbar,'input');search.type='search';search.placeholder='Search titles / 搜索片名';search.setAttribute('aria-label','Search titles');
    search.value=this.query;search.addEventListener('input',()=>{this.query=search.value;this.drawCards();});
    const choice=(value,options,onChange,label)=>{
      const sel=makeElement(toolbar,'select');sel.setAttribute('aria-label',label);
      for(const [k,v] of options){const opt=makeElement(sel,'option','',v);opt.value=k;}
      sel.value=value;sel.addEventListener('change',()=>{onChange(sel.value);this.drawCards();});return sel;
    };
    choice(this.type,[['all','Movies + TV / 全部'],['movie','Movies / 电影'],['tv','TV / 电视剧']],v=>this.type=v,'Media type');
    choice(this.status,[['all','Any status / 全部状态'],['yes','Watched / 已看'],['no','Unwatched / 未看']],v=>this.status=v,'Watch status');
    const genres=[...new Set(this.records.flatMap(x=>x.genres))].sort((a,b)=>a.localeCompare(b));
    choice(this.genre,[['all','All genres / 全部类型'],...genres.map(x=>[x,x])],v=>this.genre=v,'Genre');
    choice(this.sort,[['title','Title / 名称'],['year','Year ↓ / 年份'],['rating','Rating ↓ / 评分']],v=>this.sort=v,'Sort order');
    this.counter=makeElement(c,'p','mlb-counter');
    this.grid=makeElement(c,'div','mlb-grid');this.drawCards();
  }
  drawCards(){
    if(!this.grid)return;
    this.grid.empty();
    const q=this.query.trim().toLocaleLowerCase();
    const filtered=this.records.filter(x=>(!q||(x.title+' '+x.original_title).toLocaleLowerCase().includes(q))&&
      (this.type==='all'||x.type===this.type)&&(this.status==='all'||this.plugin.isWatched(x)===(this.status==='yes'))&&
      (this.genre==='all'||x.genres.includes(this.genre)));
    if(this.sort==='year') filtered.sort((a,b)=>(b.year||0)-(a.year||0)||a.title.localeCompare(b.title));
    else if(this.sort==='rating') filtered.sort((a,b)=>(b.rating??-1)-(a.rating??-1)||a.title.localeCompare(b.title));
    else filtered.sort((a,b)=>a.title.localeCompare(b.title));
    this.counter.setText(filtered.length+' / '+this.records.length+' works · 作品');
    for(const item of filtered){
      const button=makeElement(this.grid,'button','mlb-card');
      button.setAttribute('aria-label',item.title);
      this.plugin.posterElement(button,item,'mlb-poster');
      makeElement(button,'div','mlb-title',item.title);
      makeElement(button,'div','mlb-meta',[item.year||'—',item.type==='tv'?'TV':'Film',item.rating===null?'':'★ '+item.rating].filter(Boolean).join(' · '));
      makeElement(button,'div',this.plugin.isWatched(item)?'mlb-status watched':'mlb-status',this.plugin.isWatched(item)?'✓ Watched / 已看':'Not watched / 未看');
      button.addEventListener('click',()=>new MediaDetail(this.app,this.plugin,item,()=>this.drawCards()).open());
    }
    if(!filtered.length) makeElement(this.grid,'p','mlb-subtitle','No matches / 无符合条件的作品');
  }
}
module.exports=class MediaLibraryWallPlugin extends Plugin {
  async onload(){
    this.statuses={};this.stateQueue=Promise.resolve();
    this.registerView(VIEW,leaf=>new MediaWallView(leaf,this));
    this.addRibbonIcon('film','Open Media Library / 打开影音库',()=>this.openWall());
    this.addCommand({id:'open-media-library-wall',name:'Open Media Library / 打开影音库',callback:()=>this.openWall()});
  }
  async openWall(){
    const leaf=this.app.workspace.getLeaf(true);
    await leaf.setViewState({type:VIEW,active:true});
    this.app.workspace.revealLeaf(leaf);
  }
  async loadState(){
    if(!(await this.app.vault.adapter.exists(STATE))){this.statuses={};return;}
    const obj=JSON.parse(await this.app.vault.adapter.read(STATE));
    if(obj.schema_version!==1||!obj.statuses||typeof obj.statuses!=='object'||Array.isArray(obj.statuses))throw new Error('Invalid user-state.json / 用户状态文件无效');
    this.statuses=Object.fromEntries(Object.entries(obj.statuses).filter(([k,v])=>/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/.test(k)&&typeof v==='boolean'));
  }
  isWatched(item){return Object.prototype.hasOwnProperty.call(this.statuses,item.id)?this.statuses[item.id]:item.watched;}
  async setWatched(id,value){
    this.stateQueue=this.stateQueue.catch(()=>{}).then(async()=>{
      const next={...this.statuses,[id]:value};
      await this.app.vault.adapter.write(STATE,JSON.stringify({schema_version:1,statuses:next},null,2)+'\n');
      this.statuses=next;
    });
    return this.stateQueue;
  }
  posterElement(parent,item,cssClass){
    const holder=makeElement(parent,'div',cssClass);
    const safe=safePosterPath(item.poster);
    if(safe){
      const file=this.app.vault.getAbstractFileByPath(safe);
      if(file&&file.extension&&/^(png|jpe?g|webp|gif|avif)$/i.test(file.extension)){
        const img=makeElement(holder,'img');
        img.src=this.app.vault.getResourcePath(file);
        img.alt='Poster / 海报: '+item.title;img.loading='lazy';return holder;
      }
    }
    makeElement(holder,'div','mlb-placeholder',item.type==='tv'?'TV':'FILM');
    return holder;
  }
  onunload(){this.app.workspace.detachLeavesOfType(VIEW);}
};
