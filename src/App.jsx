import { useState, useRef, useCallback, useEffect } from 'react'

// ─── Themes ───────────────────────────────────────────────────────────────────
const BG_THEMES = [
  { id:'paper',    label:'纸白',   bg:'#faf7f2', sidebar:'#f0e8d8', text:'#2a1f14', muted:'#9a8572', accent:'#b8723e', border:'#e2d5c0', card:'#fffbf4', hover:'#ede3d0' },
  { id:'mint',     label:'薄荷',   bg:'#f0faf4', sidebar:'#e2f5e8', text:'#1a3a28', muted:'#6a9478', accent:'#2e8b57', border:'#c5e8d0', card:'#f8fffe', hover:'#d6f0e0' },
  { id:'sky',      label:'天空',   bg:'#f0f8ff', sidebar:'#e0f0fa', text:'#1a2f3a', muted:'#6a8898', accent:'#3a7ca5', border:'#c0dcea', card:'#f8fcff', hover:'#d0e8f8' },
  { id:'lavender', label:'薰衣草', bg:'#f8f4ff', sidebar:'#eee6ff', text:'#2a1f3a', muted:'#8a78aa', accent:'#7c5cbf', border:'#d8ccee', card:'#fdfaff', hover:'#e8dff8' },
  { id:'peach',    label:'蜜桃',   bg:'#fff8f4', sidebar:'#ffeee5', text:'#3a1f14', muted:'#aa8070', accent:'#e07050', border:'#f0d5c8', card:'#fffcfa', hover:'#ffe8dc' },
  { id:'night',    label:'夜间',   bg:'#141418', sidebar:'#1c1c22', text:'#e8e0d4', muted:'#5a5560', accent:'#d4956a', border:'#2a2a32', card:'#1e1e26', hover:'#242430' },
]

// ─── Rewrite styles ───────────────────────────────────────────────────────────
const STYLES = [
  { id:'story',     name:'故事流', desc:'画面感强，节奏明快',
    prompt:`你是专业儿童文学改编师。改写以下内容，让10岁孩子轻松读懂并喜欢阅读。
规则：①情节事件人物对话100%保留 ②人名地名不变 ③主题因果不变
风格：故事感强，画面生动，句子简短有节奏。直接输出，不加说明。` },
  { id:'dialogue',  name:'对话版', desc:'多用对话，少大段叙述',
    prompt:`你是专业儿童文学改编师。改写以下内容，让10岁孩子轻松读懂并喜欢阅读。
规则：①情节事件人物对话100%保留 ②人名地名不变 ③主题因果不变
风格：用人物对话推进情节，配合简短动作描写，像看连续剧。直接输出，不加说明。` },
  { id:'adventure', name:'探险风', desc:'紧张感强，带入感十足',
    prompt:`你是专业儿童文学改编师。改写以下内容，让10岁孩子轻松读懂并喜欢阅读。
规则：①情节事件人物对话100%保留 ②人名地名不变 ③主题因果不变
风格：充满紧迫感和好奇心，短句制造节奏感，读者感觉在现场。直接输出，不加说明。` },
  { id:'simple',    name:'简白版', desc:'最简单直白，像朋友聊天',
    prompt:`你是专业儿童文学改编师。改写以下内容，让10岁孩子轻松读懂并喜欢阅读。
规则：①情节事件人物对话100%保留 ②人名地名不变 ③主题因果不变
风格：最简单的现代中文，句子短，逻辑清楚，像朋友讲故事。直接输出，不加说明。` },
]

const FONTS = {
  serif: "'Noto Serif SC', Georgia, 'STSong', serif",
  sans:  "'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif",
}

// ─── AI Providers ─────────────────────────────────────────────────────────────
const PROVIDERS = [
  { id:'claude', name:'Claude',    endpoint:'/api/chat',
    models:[ { id:'claude-haiku-4-5-20251001', name:'Haiku (快·便宜)' }, { id:'claude-sonnet-4-5', name:'Sonnet (强·贵)' } ] },
  { id:'zhipu',  name:'智谱 GLM',  endpoint:'/api/zhipu',
    directUrl:'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    models:[ { id:'glm-4-flash', name:'GLM-4 Flash (快·免费)' }, { id:'glm-4-plus', name:'GLM-4 Plus' }, { id:'glm-4', name:'GLM-4' } ] },
  { id:'qwen',   name:'千问 Qwen', endpoint:'/api/qwen',
    directUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    models:[ { id:'qwen-turbo', name:'Turbo (快)' }, { id:'qwen-plus', name:'Plus (均衡)' }, { id:'qwen-max', name:'Max (强)' } ] },
  { id:'gemini', name:'Gemini',    endpoint:'/api/gemini',
    nativeApi:'gemini',  // 用原生REST API，支持浏览器直调
    models:[
      { id:'gemini-2.0-flash', name:'2.0 Flash (快·免费)' },
      { id:'gemini-1.5-pro-latest', name:'1.5 Pro (强·推荐)' },
      { id:'gemini-1.5-flash-latest', name:'1.5 Flash (均衡)' },
      { id:'gemini-1.5-flash-8b-latest', name:'1.5 Flash 8B (极快)' },
    ] },
]

const STORAGE_KEY = 'qiyue_settings_v3'
const DEFAULT_SETTINGS = {
  bgTheme:'paper', fontSize:19, lineHeight:1.9, fontType:'serif',
  provider:'claude', model:'claude-haiku-4-5-20251001',
  apiKeys:{ claude:'', zhipu:'', qwen:'', gemini:'' },
}

// ─── localStorage ─────────────────────────────────────────────────────────────
function load(key, def) {
  try { const v = localStorage.getItem(key); return v ? { ...def, ...JSON.parse(v) } : def } catch { return def }
}
function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }

// ─── IndexedDB  ───────────────────────────────────────────────────────────────
let _db = null
async function getDB() {
  if (_db) return _db
  _db = await new Promise((res, rej) => {
    const r = indexedDB.open('qiyue_v2', 2)
    r.onupgradeneeded = e => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('rw'))    db.createObjectStore('rw',    { keyPath:'k' })
      if (!db.objectStoreNames.contains('books')) db.createObjectStore('books', { keyPath:'id' })
    }
    r.onsuccess = e => res(e.target.result)
    r.onerror = rej
  })
  return _db
}
async function dbGet(store, k)   { try { const db=await getDB(); return await new Promise(res=>{ const r=db.transaction(store,'readonly').objectStore(store).get(k); r.onsuccess=()=>res(r.result??null); r.onerror=()=>res(null) }) } catch { return null } }
async function dbSet(store, val) { try { const db=await getDB(); await new Promise(res=>{ const tx=db.transaction(store,'readwrite'); tx.objectStore(store).put(val); tx.oncomplete=res }) } catch {} }
async function dbDel(store, k)   { try { const db=await getDB(); await new Promise(res=>{ const tx=db.transaction(store,'readwrite'); tx.objectStore(store).delete(k); tx.oncomplete=res }) } catch {} }
async function dbAll(store)      { try { const db=await getDB(); return await new Promise(res=>{ const r=db.transaction(store,'readonly').objectStore(store).getAll(); r.onsuccess=()=>res(r.result??[]); r.onerror=()=>res([]) }) } catch { return [] } }

function rwKey(bookId, chIdx, styleId, model='') { return `${bookId}_${chIdx}_${styleId}_${model}` }

// ─── EPUB parser ──────────────────────────────────────────────────────────────
async function parseEpub(file) {
  const JSZip = (await import('jszip')).default
  const zip   = await JSZip.loadAsync(file)
  const cXml  = await zip.file('META-INF/container.xml').async('text')
  const opfPath = cXml.match(/full-path="([^"]+)"/)?.[1]
  if (!opfPath) throw new Error('无效EPUB')
  const base   = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/')+1) : ''
  const opfXml = await zip.file(opfPath).async('text')
  const opfDoc = new DOMParser().parseFromString(opfXml,'text/xml')
  const getEl  = tag => opfDoc.querySelector(tag)?.textContent?.trim()||''
  const title  = getEl('dc\\:title')   || getEl('title')   || file.name.replace(/\.epub$/i,'')
  const author = getEl('dc\\:creator') || getEl('creator') || '未知作者'
  const manifest = {}
  opfDoc.querySelectorAll('manifest item').forEach(el => {
    manifest[el.getAttribute('id')] = { href:base+decodeURIComponent(el.getAttribute('href')||''), type:el.getAttribute('media-type')||'' }
  })
  const spineIds = []
  opfDoc.querySelectorAll('spine itemref').forEach(el => spineIds.push(el.getAttribute('idref')))
  const chapters = []
  for (const id of spineIds) {
    const item = manifest[id]
    if (!item || !item.type.match(/html|xhtml/i)) continue
    const f = zip.file(item.href) || zip.file(decodeURIComponent(item.href))
    if (!f) continue
    const html = await f.async('text')
    const text = htmlToText(html).trim()
    if (text.length < 80) continue
    chapters.push({ title: extractTitle(html)||`第${chapters.length+1}章`, text })
  }
  if (!chapters.length) throw new Error('未能提取章节')
  return { id: hashStr(title+author+chapters.length), title, author, chapters, addedAt: Date.now() }
}
function htmlToText(html) {
  html = html.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'')
  html = html.replace(/<\/?(?:p|div|h[1-6]|li|tr|br|blockquote)[^>]*>/gi,'\n').replace(/<[^>]+>/g,'')
  return html.replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
             .replace(/&quot;/g,'"').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(+n)).replace(/&[a-z]+;/g,' ')
             .replace(/\n{3,}/g,'\n\n').trim()
}
function extractTitle(html) { const m=html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i); return m?htmlToText(m[1]).trim().slice(0,60):null }
function hashStr(s) { let h=0; for(let i=0;i<s.length;i++) h=(Math.imul(31,h)+s.charCodeAt(i))|0; return Math.abs(h).toString(36) }

// ─── AI call (multi-provider) ─────────────────────────────────────────────────
async function streamClaude(apiKey, system, user, onChunk, provider='claude', model) {
  if (!apiKey) throw new Error('请先在设置中填写 ' + (PROVIDERS.find(p=>p.id===provider)?.name||'') + ' API Key')
  const prov = PROVIDERS.find(p=>p.id===provider) || PROVIDERS[0]

  // ── Gemini 原生 REST API（支持浏览器直调，CORS OK）──────────────────────────
  if (prov.nativeApi === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`
    const contents = [{role:'user', parts:[{text: user}]}]
    const body = { contents }
    if (system) body.systemInstruction = { parts:[{text: system}] }
    const resp = await fetch(url, {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify(body),
    })
    if (!resp.ok) { let msg=`HTTP ${resp.status}`; try{const e=await resp.json();msg=e.error?.message||msg}catch{}; throw new Error(msg) }
    const reader=resp.body.getReader(); const dec=new TextDecoder(); let buf='',full=''
    while(true){
      const {done,value}=await reader.read(); if(done) break
      buf+=dec.decode(value,{stream:true}); const lines=buf.split('\n'); buf=lines.pop()||''
      for(const line of lines){
        if(!line.startsWith('data: ')) continue
        const d=line.slice(6).trim(); if(!d) continue
        try{
          const p=JSON.parse(d)
          const text=p.candidates?.[0]?.content?.parts?.[0]?.text||''
          if(text){full+=text;onChunk?.(full)}
        }catch{}
      }
    }
    return full
  }

  // ── OpenAI-compat 直调（智谱/千问，支持CORS）─────────────────────────────────
  if (prov.directUrl) {
    const msgs = system ? [{role:'system',content:system},{role:'user',content:user}] : [{role:'user',content:user}]
    const resp = await fetch(prov.directUrl, {
      method:'POST',
      headers:{'content-type':'application/json','authorization':`Bearer ${apiKey}`},
      body:JSON.stringify({model, messages:msgs, stream:true}),
    })
    if (!resp.ok) { let msg=`HTTP ${resp.status}`; try{const e=await resp.json();msg=e.error?.message||msg}catch{}; throw new Error(msg) }
    const reader=resp.body.getReader(); const dec=new TextDecoder(); let buf='',full=''
    while(true){
      const {done,value}=await reader.read(); if(done) break
      buf+=dec.decode(value,{stream:true}); const lines=buf.split('\n'); buf=lines.pop()||''
      for(const line of lines){
        if(!line.startsWith('data: ')) continue
        const d=line.slice(6).trim(); if(d==='[DONE]') continue
        try{const p=JSON.parse(d);const t=p.choices?.[0]?.delta?.content;if(t){full+=t;onChunk?.(full)}}catch{}
      }
    }
    return full
  }

  // ── Claude（走本地 server.js 代理）──────────────────────────────────────────
  const resp = await fetch(prov.endpoint, {
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({apiKey, system, messages:[{role:'user',content:user}], model}),
  })
  if (!resp.ok) { let msg=`HTTP ${resp.status}`; try{const e=await resp.json();msg=e.error?.message||msg}catch{}; throw new Error(msg) }
  const reader=resp.body.getReader(); const dec=new TextDecoder(); let buf='',full=''
  while(true){
    const {done,value}=await reader.read(); if(done) break
    buf+=dec.decode(value,{stream:true}); const lines=buf.split('\n'); buf=lines.pop()||''
    for(const line of lines){
      if(!line.startsWith('data: ')) continue
      const d=line.slice(6).trim(); if(d==='[DONE]') continue
      try{const p=JSON.parse(d);if(p.type==='content_block_delta'&&p.delta?.text){full+=p.delta.text;onChunk?.(full)}}catch{}
    }
  }
  return full
}

// ─── Tiny UI ──────────────────────────────────────────────────────────────────
function Spinner({size=15,color}) {
  return <div style={{width:size,height:size,border:`2px solid ${color}30`,borderTopColor:color,borderRadius:'50%',animation:'spin .7s linear infinite',flexShrink:0}}/>
}
function Btn({t,children,onClick,primary,disabled,loading}) {
  return (
    <button disabled={disabled} onClick={onClick} style={{
      display:'inline-flex',alignItems:'center',gap:5,padding:'6px 13px',borderRadius:8,
      border:`1px solid ${primary?t.accent:t.border}`,background:primary?t.accent:'transparent',
      color:primary?'#fff':t.text,fontSize:13,opacity:disabled?.4:1,
      cursor:disabled?'not-allowed':'pointer',fontFamily:'inherit',transition:'all .13s',whiteSpace:'nowrap',
    }}>
      {loading&&<Spinner size={12} color={primary?'#fff':t.accent}/>}{children}
    </button>
  )
}
function Overlay({children,onClick}) {
  return <div onClick={onClick} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}}>{children}</div>
}
function SRow({label,children}) {
  return <div style={{marginBottom:16}}><div style={{fontSize:12,color:'inherit',opacity:.6,marginBottom:6}}>{label}</div>{children}</div>
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [settings,  setSettings]  = useState(()=>load(STORAGE_KEY,DEFAULT_SETTINGS))
  const [library,   setLibrary]   = useState([])
  const [book,      setBook]      = useState(null)
  const [chIdx,     setChIdx]     = useState(0)
  const [viewMode,  setViewMode]  = useState('original')
  const [style,     setStyle]     = useState(null)
  const [cache,     setCache]     = useState({})
  const [sidebarOpen,  setSidebarOpen]  = useState(true)
  const [sidebarTab,   setSidebarTab]   = useState('chapters')
  const [rewriteLoading,setRewriteLoading]=useState(false)
  const [streamText,   setStreamText]   = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [showStyleModal,setShowStyleModal]=useState(false)
  const [styleSamples, setStyleSamples] = useState({})
  const [samplesLoading,setSamplesLoading]=useState(false)
  const [pendingStyleId,setPendingStyleId]=useState(null)

  const fileInputRef = useRef(null)
  const readerRef    = useRef(null)

  const t = BG_THEMES.find(b=>b.id===settings.bgTheme)||BG_THEMES[0]
  const curProvider = PROVIDERS.find(p=>p.id===settings.provider)||PROVIDERS[0]
  const curApiKey   = settings.apiKeys?.[settings.provider]||''

  useEffect(()=>{ save(STORAGE_KEY,settings) },[settings])

  // Load library
  useEffect(()=>{
    dbAll('books').then(rows=>setLibrary(rows.map(({id,title,author,addedAt})=>({id,title,author,addedAt})).sort((a,b)=>b.addedAt-a.addedAt)))
  },[])

  const chapter   = book?.chapters[chIdx]
  const cachedRW  = style && cache[chIdx]?.[style.id]
  const modelLabel = curProvider.name + ' · ' + (curProvider.models.find(m=>m.id===settings.model)?.name||settings.model)
  const isRewriting = viewMode==='rewriting'
  const displayText = isRewriting ? streamText : (viewMode==='rewritten'&&cachedRW ? cachedRW : chapter?.text||'')
  const wordCount = displayText.replace(/\s/g,'').length
  const readTime  = Math.max(1,Math.ceil(wordCount/400))
  const totalCh   = book?.chapters.length||0

  // ── load book ────────────────────────────────────────────────────────────
  const loadBook = useCallback(async (meta) => {
    let b = meta.chapters ? meta : await dbGet('books',meta.id)
    if (!b) { alert('书籍数据丢失，请重新上传'); return }
    setBook(b); setChIdx(0); setViewMode('original'); setStreamText(''); setStyle(null)
    setSidebarTab('chapters')
    // 联动小问
    try { localStorage.setItem('qiyue_recent_book', JSON.stringify({
      title: b.title, author: b.author, recentChapter: b.chapters[0]?.title || '第1章'
    })); } catch {}
    const nc={}
    for(let i=0;i<b.chapters.length;i++) for(const st of STYLES) {
      const k=rwKey(b.id,i,st.id,'')
      const v=await dbGet('rw',k)
      if(v){if(!nc[i])nc[i]={};nc[i][st.id]=v.v}
    }
    setCache(nc); readerRef.current?.scrollTo(0,0)
  },[])

  // ── handle file ──────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file)=>{
    if(!file.name.toLowerCase().endsWith('.epub')){alert('请上传 .epub 格式文件');return}
    try {
      const b=await parseEpub(file)
      await dbSet('books',b)
      setLibrary(prev=>[{id:b.id,title:b.title,author:b.author,addedAt:b.addedAt},...prev.filter(x=>x.id!==b.id)])
      loadBook(b)
    } catch(err){alert('读取失败：'+err.message)}
  },[loadBook])

  const onDrop = useCallback(e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleFile(f)},[handleFile])

  // ── delete book ──────────────────────────────────────────────────────────
  const deleteBook = useCallback(async (bookId)=>{
    if(!confirm('删除这本书及所有改写缓存？')) return
    await dbDel('books',bookId)
    const db=await getDB()
    await new Promise(res=>{ const tx=db.transaction('rw','readwrite'); const store=tx.objectStore('rw'); const req=store.openCursor(); req.onsuccess=e=>{const c=e.target.result;if(!c){res();return};if(c.key.startsWith(bookId+'_'))c.delete();c.continue()}; tx.oncomplete=res })
    setLibrary(prev=>prev.filter(x=>x.id!==bookId))
    if(book?.id===bookId){setBook(null);setChIdx(0);setCache({})}
  },[book])

  // ── chapter nav ──────────────────────────────────────────────────────────
  const goChapter = useCallback((idx)=>{
    if(!book||idx<0||idx>=totalCh) return
    setChIdx(idx); setStreamText('')
    if(viewMode==='rewritten'&&!(style&&cache[idx]?.[style.id])) setViewMode('original')
    readerRef.current?.scrollTo(0,0)
    // 联动小问：更新最近阅读记录
    try { localStorage.setItem('qiyue_recent_book', JSON.stringify({
      title: book.title, author: book.author,
      recentChapter: book.chapters[idx]?.title || `第${idx+1}章`
    })); } catch {}
  },[book,totalCh,style,cache,viewMode])

  // ── style modal ──────────────────────────────────────────────────────────
  const openStyleModal = async()=>{
    if(!book) return
    if(!curApiKey){setShowSettings(true);return}
    setPendingStyleId(null);setStyleSamples({});setShowStyleModal(true);setSamplesLoading(true)
    const sample=book.chapters[chIdx].text.slice(0,500)
    await Promise.all(STYLES.map(async st=>{
      try{ await streamClaude(curApiKey,st.prompt,`改写以下样本（只改这段）：\n\n${sample}`,chunk=>setStyleSamples(p=>({...p,[st.id]:chunk})),settings.provider,settings.model) }
      catch(err){ setStyleSamples(p=>({...p,[st.id]:'生成失败：'+err.message})) }
    }))
    setSamplesLoading(false)
  }
  const confirmStyle=()=>{ if(!pendingStyleId)return; setStyle(STYLES.find(s=>s.id===pendingStyleId)); setShowStyleModal(false); setViewMode('original') }

  // ── rewrite ──────────────────────────────────────────────────────────────
  const rewriteChapter=async()=>{
    if(!book||!style) return
    if(!curApiKey){setShowSettings(true);return}
    setRewriteLoading(true);setStreamText('');setViewMode('rewriting')
    const text=chapter.text; const CHUNK=3000; let finalText=''
    try{
      if(text.length<=CHUNK){
        await streamClaude(curApiKey,style.prompt,`改写以下内容：\n\n${text}`,chunk=>{finalText=chunk;setStreamText(chunk)},settings.provider,settings.model)
      } else {
        const chunks=[]; for(let i=0;i<text.length;i+=CHUNK)chunks.push(text.slice(i,i+CHUNK))
        for(let i=0;i<chunks.length;i++){
          let co=''; await streamClaude(curApiKey,style.prompt,`第${i+1}段（共${chunks.length}段）：\n\n${chunks[i]}`,chunk=>{co=chunk;setStreamText(finalText+chunk)},settings.provider,settings.model)
          finalText+=(finalText?'\n\n':'')+co; setStreamText(finalText)
        }
      }
      finalText=finalText.trim()
      await dbSet('rw',{k:rwKey(book.id,chIdx,style.id,settings.model),v:finalText})
      setCache(p=>({...p,[chIdx]:{...(p[chIdx]||{}),[style.id]:finalText}}))
      setStreamText(''); setViewMode('rewritten')
    }catch(err){alert('改写失败：'+err.message);setStreamText('');setViewMode('original')}
    finally{setRewriteLoading(false)}
  }

  // ════════════════════════════════════════
  return (
    <div style={{display:'flex',height:'100vh',background:t.bg,color:t.text,overflow:'hidden',transition:'background .3s,color .3s'}}
         onDrop={onDrop} onDragOver={e=>e.preventDefault()}>

      {/* ══ SIDEBAR ══ */}
      <aside style={{
        width:sidebarOpen?260:0, minWidth:sidebarOpen?260:0,
        background:t.sidebar, borderRight:sidebarOpen?`1px solid ${t.border}`:'none',
        display:'flex', flexDirection:'column', overflow:'hidden',
        transition:'width .25s ease,min-width .25s ease', flexShrink:0,
      }}>
        {/* Logo */}
        <div style={{padding:'15px 14px 12px',borderBottom:`1px solid ${t.border}`,flexShrink:0,display:'flex',alignItems:'center',gap:9}}>
          <div style={{width:32,height:32,borderRadius:8,background:t.accent,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:16,flexShrink:0,fontWeight:700}}>
            ✦
          </div>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:t.accent}}>奇阅魔方</div>
            <div style={{fontSize:10,color:t.muted,marginTop:1}}>经典 · 转化 · 吸收</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',borderBottom:`1px solid ${t.border}`,flexShrink:0}}>
          {[['library','书库'],['chapters','目录']].map(([id,label])=>(
            <button key={id} onClick={()=>setSidebarTab(id)} style={{
              flex:1,padding:'8px 4px',border:'none',background:'transparent',fontSize:12,fontFamily:'inherit',
              cursor:'pointer',color:sidebarTab===id?t.accent:t.muted,
              borderBottom:`2px solid ${sidebarTab===id?t.accent:'transparent'}`,
              fontWeight:sidebarTab===id?600:400,transition:'all .13s',
            }}>{label}</button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{flex:1,overflowY:'auto'}}>
          {sidebarTab==='library' ? (
            library.length===0
              ? <div style={{padding:'18px 14px',fontSize:12,color:t.muted,lineHeight:1.7}}>暂无书籍<br/>上传EPUB后显示</div>
              : library.map(b=>(
                <div key={b.id} onClick={()=>loadBook(b)} style={{
                  padding:'10px 14px',cursor:'pointer',
                  borderBottom:`1px solid ${t.border}`,
                  background:book?.id===b.id?t.hover:'transparent',
                  transition:'background .12s',
                  display:'flex',alignItems:'center',gap:9,
                }}>
                  {/* Book spine icon */}
                  <div style={{
                    width:7,flexShrink:0,alignSelf:'stretch',borderRadius:2,
                    background:book?.id===b.id?t.accent:t.border,
                    minHeight:36,
                  }}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{
                      fontSize:13,fontWeight:600,lineHeight:1.4,color:book?.id===b.id?t.accent:t.text,
                      overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',
                    }}>{b.title}</div>
                    <div style={{fontSize:11,color:t.muted,marginTop:2}}>{b.author}</div>
                  </div>
                </div>
              ))
          ) : (
            book ? book.chapters.map((ch,i)=>{
              const done=!!(style&&cache[i]?.[style.id])
              return (
                <div key={i} onClick={()=>goChapter(i)} style={{
                  padding:'8px 14px',cursor:'pointer',fontSize:13,lineHeight:1.4,
                  borderLeft:`3px solid ${i===chIdx?t.accent:'transparent'}`,
                  background:i===chIdx?t.hover:'transparent',
                  display:'flex',alignItems:'center',gap:8,
                  transition:'all .12s',color:i===chIdx?t.accent:t.text,fontWeight:i===chIdx?600:400,
                }}>
                  {/* Circle status */}
                  <div style={{
                    width:15,height:15,borderRadius:'50%',flexShrink:0,
                    border:`1.5px solid ${done?t.accent:t.border}`,
                    background:done?t.accent:'transparent',
                    display:'flex',alignItems:'center',justifyContent:'center',
                  }}>
                    {done&&<span style={{color:'#fff',fontSize:8,lineHeight:1}}>✓</span>}
                  </div>
                  <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{ch.title}</span>
                </div>
              )
            }) : <div style={{padding:'18px 14px',fontSize:12,color:t.muted,lineHeight:1.7}}>从书库选择一本书<br/>或上传EPUB文件</div>
          )}
        </div>

        {/* Upload */}
        <div style={{padding:'10px 12px',borderTop:`1px solid ${t.border}`,flexShrink:0}}>
          <button onClick={()=>fileInputRef.current?.click()} style={{
            width:'100%',padding:'8px',border:`1.5px dashed ${t.border}`,borderRadius:8,
            background:'transparent',color:t.muted,fontSize:12,fontFamily:'inherit',
            display:'flex',alignItems:'center',justifyContent:'center',gap:6,cursor:'pointer',transition:'all .15s',
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=t.accent;e.currentTarget.style.color=t.accent}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=t.border;e.currentTarget.style.color=t.muted}}>
            ＋ 上传EPUB
          </button>
        </div>
      </aside>

      {/* ══ MAIN ══ */}
      <main style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>

        {/* Topbar */}
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'9px 16px',borderBottom:`1px solid ${t.border}`,background:t.bg,flexShrink:0,flexWrap:'wrap'}}>
          <button onClick={()=>setSidebarOpen(v=>!v)} title={sidebarOpen?'收起目录':'展开目录'} style={{background:'none',border:`1px solid ${t.border}`,borderRadius:7,padding:'5px 9px',color:t.muted,fontSize:14,lineHeight:1,cursor:'pointer'}}>
            {sidebarOpen?'◀':'▶'}
          </button>

          {book&&<>
            {style&&<div style={{display:'flex',alignItems:'center',gap:5,padding:'3px 10px',background:t.accent+'18',border:`1px solid ${t.accent}40`,borderRadius:20,fontSize:12,color:t.accent}}>{style.name}</div>}
            <div style={{padding:'3px 10px',border:`1px solid ${t.border}`,borderRadius:20,fontSize:11,color:t.muted}}>{modelLabel}</div>
            <Btn t={t} onClick={openStyleModal} disabled={samplesLoading}>{style?'换风格':'⊞ 选风格'}</Btn>
            <Btn t={t} primary disabled={!style||rewriteLoading} loading={rewriteLoading} onClick={rewriteChapter}>{cachedRW?'↺ 重新改写':'✦ 改写本章'}</Btn>
            {(cachedRW||isRewriting)&&(
              <div style={{display:'flex',border:`1px solid ${t.border}`,borderRadius:7,overflow:'hidden'}}>
                {['original','rewritten'].map(m=>(
                  <button key={m} onClick={()=>{if(m==='rewritten'&&!cachedRW)return;setViewMode(m);setStreamText('')}} style={{
                    padding:'5px 11px',border:'none',fontSize:12,fontFamily:'inherit',
                    background:viewMode===m?t.accent:'transparent',color:viewMode===m?'#fff':t.muted,
                    cursor:m==='rewritten'&&!cachedRW?'not-allowed':'pointer',transition:'all .13s',
                  }}>{m==='original'?'原文':'改写版'}</button>
                ))}
              </div>
            )}
          </>}

          <div style={{flex:1}}/>
          {rewriteLoading&&<span style={{fontSize:11,color:t.muted,display:'flex',alignItems:'center',gap:5}}><Spinner size={12} color={t.accent}/>改写中…</span>}
          <button onClick={()=>setShowSettings(true)} title="设置" style={{background:'none',border:`1px solid ${t.border}`,borderRadius:7,padding:'5px 9px',color:t.muted,fontSize:14,lineHeight:1,cursor:'pointer'}}>⚙</button>
        </div>

        {/* Reader area */}
        <div ref={readerRef} style={{flex:1,overflowY:'auto',padding:'0 0 10px'}}>
          {!book
            ? <Welcome t={t} onUpload={()=>fileInputRef.current?.click()}/>
            : (
              <div style={{maxWidth:860,margin:'0 auto',padding:'44px 52px 20px'}}>
                <h1 style={{fontSize:settings.fontSize+4,fontWeight:700,marginBottom:28,lineHeight:1.4,fontFamily:FONTS[settings.fontType]}}>{chapter?.title}</h1>
                <div style={{fontSize:settings.fontSize,lineHeight:settings.lineHeight,fontFamily:FONTS[settings.fontType],whiteSpace:'pre-wrap',wordBreak:'break-word'}}>
                  {displayText}
                  {isRewriting&&<span style={{display:'inline-block',width:2,height:'1em',background:t.accent,marginLeft:2,verticalAlign:'text-bottom',animation:'blink .9s step-end infinite'}}/>}
                </div>
              </div>
            )
          }
        </div>

        {/* ── Bottom e-reader nav ── */}
        {book&&(
          <div style={{borderTop:`1px solid ${t.border}`,padding:'10px 20px',display:'flex',alignItems:'center',gap:14,flexShrink:0,background:t.bg}}>

            {/* Prev */}
            <button onClick={()=>goChapter(chIdx-1)} disabled={chIdx===0} style={{
              padding:'7px 16px',border:`1px solid ${t.border}`,borderRadius:8,
              background:'transparent',color:t.text,fontSize:13,fontFamily:'inherit',
              cursor:chIdx===0?'not-allowed':'pointer',opacity:chIdx===0?.35:1,
              display:'flex',alignItems:'center',gap:5,transition:'all .13s',whiteSpace:'nowrap',
            }}>← 上一章</button>

            {/* Progress bar + label */}
            <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
              <div style={{fontSize:11,color:t.muted}}>第 {chIdx+1} 章 / 共 {totalCh} 章</div>
              <div style={{width:'100%',maxWidth:320,height:3,background:t.border,borderRadius:2,overflow:'hidden'}}>
                <div style={{height:'100%',background:t.accent,borderRadius:2,transition:'width .3s',width:`${((chIdx+1)/totalCh)*100}%`}}/>
              </div>
            </div>

            {/* Word count */}
            <div style={{fontSize:11,color:t.muted,textAlign:'center',lineHeight:1.7}}>
              <div>{wordCount.toLocaleString()} 字</div>
              <div>约 {readTime} 分钟</div>
            </div>

            {/* Next */}
            <button onClick={()=>goChapter(chIdx+1)} disabled={chIdx===totalCh-1} style={{
              padding:'7px 16px',border:`1px solid ${t.border}`,borderRadius:8,
              background:'transparent',color:t.text,fontSize:13,fontFamily:'inherit',
              cursor:chIdx===totalCh-1?'not-allowed':'pointer',opacity:chIdx===totalCh-1?.35:1,
              display:'flex',alignItems:'center',gap:5,transition:'all .13s',whiteSpace:'nowrap',
            }}>下一章 →</button>

          </div>
        )}
      </main>

      {/* ══ STYLE MODAL ══ */}
      {showStyleModal&&(
        <Overlay onClick={()=>setShowStyleModal(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:t.bg,borderRadius:16,padding:'26px 28px',width:'90vw',maxWidth:920,maxHeight:'88vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.25)'}}>
            <div style={{fontSize:17,fontWeight:700,marginBottom:4,color:t.text}}>选择阅读风格</div>
            <div style={{fontSize:13,color:t.muted,marginBottom:18,lineHeight:1.6,display:'flex',alignItems:'center',gap:8}}>
              选一个孩子读起来最顺的——整本书都会按这个风格改写
              {samplesLoading&&<span style={{display:'inline-flex',alignItems:'center',gap:4}}><Spinner size={12} color={t.accent}/> 生成中…</span>}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:18}}>
              {STYLES.map(st=>(
                <div key={st.id} onClick={()=>setPendingStyleId(st.id)} style={{
                  border:`2px solid ${pendingStyleId===st.id?t.accent:t.border}`,borderRadius:12,padding:14,
                  cursor:'pointer',background:pendingStyleId===st.id?t.accent+'12':'transparent',transition:'all .15s',
                }}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                    <div>
                      <span style={{fontSize:14,fontWeight:600,color:pendingStyleId===st.id?t.accent:t.text}}>{st.name}</span>
                      <span style={{fontSize:11,color:t.muted,marginLeft:7}}>{st.desc}</span>
                    </div>
                    {pendingStyleId===st.id&&<div style={{width:18,height:18,borderRadius:'50%',background:t.accent,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,flexShrink:0}}>✓</div>}
                  </div>
                  <div style={{fontSize:12.5,lineHeight:1.8,color:t.text,maxHeight:180,overflowY:'auto',whiteSpace:'pre-wrap'}}>
                    {styleSamples[st.id]||<Spinner size={14} color={t.muted}/>}
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:9,justifyContent:'flex-end'}}>
              <Btn t={t} onClick={()=>setShowStyleModal(false)}>取消</Btn>
              <Btn t={t} primary disabled={!pendingStyleId} onClick={confirmStyle}>✓ 用这个风格</Btn>
            </div>
          </div>
        </Overlay>
      )}

      {/* ══ SETTINGS MODAL ══ */}
      {showSettings&&(
        <Overlay onClick={()=>setShowSettings(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:t.bg,borderRadius:16,padding:'26px 28px',width:'90vw',maxWidth:480,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.25)',color:t.text}}>
            <div style={{fontSize:17,fontWeight:700,marginBottom:18}}>⚙ 设置</div>

            {/* Provider selector */}
            <SRow label="AI 模型">
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
                {PROVIDERS.map(p=>(
                  <button key={p.id} onClick={()=>setSettings(s=>({...s,provider:p.id,model:p.models[0].id}))} style={{
                    padding:'5px 12px',borderRadius:20,fontSize:12,fontFamily:'inherit',cursor:'pointer',
                    border:`2px solid ${settings.provider===p.id?t.accent:t.border}`,
                    background:settings.provider===p.id?t.accent+'18':'transparent',
                    color:settings.provider===p.id?t.accent:t.muted,
                  }}>{p.name}</button>
                ))}
              </div>
              {/* Model selector for current provider */}
              <select value={settings.model} onChange={e=>setSettings(s=>({...s,model:e.target.value}))} style={{
                width:'100%',padding:'7px 10px',border:`1px solid ${t.border}`,borderRadius:8,
                fontSize:13,fontFamily:'inherit',background:t.card,color:t.text,outline:'none',cursor:'pointer',
              }}>
                {curProvider.models.map(m=>(
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </SRow>

            {/* API Key for current provider */}
            <SRow label={`${curProvider.name} API Key`}>
              <input type="password"
                value={settings.apiKeys?.[settings.provider]||''}
                onChange={e=>setSettings(s=>({...s,apiKeys:{...(s.apiKeys||{}), [s.provider]:e.target.value}}))}
                placeholder={
                  settings.provider==='claude'?'sk-ant-api03-...':
                  settings.provider==='zhipu'?'智谱 API Key':
                  settings.provider==='qwen'?'sk-...（阿里云 DashScope）':
                  'Gemini API Key'
                }
                style={{width:'100%',padding:'8px 11px',border:`1px solid ${t.border}`,borderRadius:8,fontSize:13,fontFamily:'inherit',background:t.card,color:t.text,outline:'none'}}
              />
              <div style={{fontSize:11,color:t.muted,marginTop:5,lineHeight:1.6}}>
                {settings.provider==='claude' && <><a href="https://console.anthropic.com/settings/keys" target="_blank" style={{color:t.accent}}>console.anthropic.com</a></>}
                {settings.provider==='zhipu'  && <><a href="https://open.bigmodel.cn/usercenter/apikeys" target="_blank" style={{color:t.accent}}>open.bigmodel.cn</a>（GLM-4-Flash 免费）</>}
                {settings.provider==='qwen'   && <><a href="https://dashscope.console.aliyun.com/apiKey" target="_blank" style={{color:t.accent}}>dashscope.aliyun.com</a></>}
                {settings.provider==='gemini' && <><a href="https://aistudio.google.com/app/apikey" target="_blank" style={{color:t.accent}}>aistudio.google.com</a>（免费额度大）</>}
              </div>
            </SRow>

            {/* Live preview */}
            <div style={{borderRadius:10,border:`1px solid ${t.border}`,padding:'12px 16px',marginBottom:16,background:t.card}}>
              <div style={{fontSize:10,color:t.muted,marginBottom:6,textTransform:'uppercase',letterSpacing:1}}>预览效果</div>
              <div style={{fontSize:settings.fontSize,lineHeight:settings.lineHeight,fontFamily:FONTS[settings.fontType],color:t.text}}>
                在远东某处，有一座城市，它的名字几乎被人遗忘。那里的街道弯弯曲曲，像是一首没有写完的诗。
              </div>
            </div>

            <SRow label="背景主题">
              <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
                {BG_THEMES.map(th=>(
                  <button key={th.id} onClick={()=>setSettings(s=>({...s,bgTheme:th.id}))} style={{
                    padding:'5px 12px',borderRadius:20,fontSize:12,fontFamily:'inherit',cursor:'pointer',
                    border:`2px solid ${settings.bgTheme===th.id?t.accent:t.border}`,
                    background:th.bg,color:th.text,
                    boxShadow:settings.bgTheme===th.id?`0 0 0 2px ${t.accent}50`:'none',
                  }}>{th.label}</button>
                ))}
              </div>
            </SRow>

            <SRow label={<>字号 <b style={{color:t.accent}}>{settings.fontSize}px</b></>}>
              <input type="range" min={14} max={26} value={settings.fontSize} onChange={e=>setSettings(s=>({...s,fontSize:+e.target.value}))} style={{width:'100%',accentColor:t.accent}}/>
            </SRow>

            <SRow label={<>行距 <b style={{color:t.accent}}>{settings.lineHeight.toFixed(1)}</b></>}>
              <input type="range" min={1.4} max={2.4} step={0.1} value={settings.lineHeight} onChange={e=>setSettings(s=>({...s,lineHeight:+e.target.value}))} style={{width:'100%',accentColor:t.accent}}/>
            </SRow>

            <SRow label="字体">
              <div style={{display:'flex',gap:6}}>
                {[['serif','衬线体（宋）'],['sans','黑体（无衬线）']].map(([id,label])=>(
                  <button key={id} onClick={()=>setSettings(s=>({...s,fontType:id}))} style={{
                    flex:1,padding:'7px 4px',fontSize:12,borderRadius:7,fontFamily:'inherit',cursor:'pointer',
                    border:`1px solid ${settings.fontType===id?t.accent:t.border}`,
                    background:settings.fontType===id?t.accent+'18':'transparent',
                    color:settings.fontType===id?t.accent:t.muted,
                  }}>{label}</button>
                ))}
              </div>
            </SRow>

            {/* Book management */}
            {library.length>0&&(
              <SRow label="书籍管理">
                <div style={{border:`1px solid ${t.border}`,borderRadius:8,overflow:'hidden',maxHeight:180,overflowY:'auto'}}>
                  {library.map(b=>(
                    <div key={b.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderBottom:`1px solid ${t.border}`}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:t.text}}>{b.title}</div>
                        <div style={{fontSize:11,color:t.muted}}>{b.author}</div>
                      </div>
                      <button onClick={()=>deleteBook(b.id)} style={{padding:'3px 9px',border:'1px solid #e5534b',borderRadius:5,background:'transparent',color:'#e5534b',fontSize:11,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>删除</button>
                    </div>
                  ))}
                </div>
              </SRow>
            )}

            {/* About */}
            <div style={{borderTop:`1px solid ${t.border}`,marginTop:20,paddingTop:16,fontSize:12,color:t.muted,lineHeight:1.9}}>
              <div style={{fontWeight:600,marginBottom:6,color:t.text}}>关于奇阅魔方</div>
              <div>作者：Simon Y &nbsp;·&nbsp; MIT License 开源免费</div>
              <div>
                GitHub：
                <a href="https://github.com/kaposon-netizen/qiyue" target="_blank"
                   style={{color:t.accent,textDecoration:'none'}}>
                  github.com/kaposon-netizen/qiyue
                </a>
              </div>
              <div style={{marginTop:4,color:t.muted,fontSize:11}}>
                有问题或建议，欢迎在 GitHub 提 Issue
              </div>
            </div>

            <div style={{display:'flex',justifyContent:'flex-end',marginTop:16}}>
              <Btn t={t} primary onClick={()=>setShowSettings(false)}>完成</Btn>
            </div>
          </div>
        </Overlay>
      )}

      <input ref={fileInputRef} type="file" accept=".epub" style={{display:'none'}}
        onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);e.target.value=''}}/>
    </div>
  )
}

function Welcome({t,onUpload}) {
  return (
    <div style={{maxWidth:460,margin:'70px auto',padding:'0 40px',textAlign:'center'}}>
      <div style={{width:64,height:64,borderRadius:16,background:t.accent,display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,margin:'0 auto 20px',color:'#fff',fontWeight:700}}>✦</div>
      <div style={{fontSize:23,fontWeight:700,marginBottom:10,color:t.text}}>奇阅魔方</div>
      <div style={{fontSize:15,color:t.muted,lineHeight:1.8,marginBottom:28}}>
        把孩子读不进去的经典<br/>转化成他最喜欢的阅读风格
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center',marginBottom:28}}>
        {['古文现代化','外文名著','4种风格','本地缓存'].map(f=>(
          <span key={f} style={{padding:'5px 13px',border:`1px solid ${t.border}`,borderRadius:20,fontSize:12,color:t.muted}}>{f}</span>
        ))}
      </div>
      <button onClick={onUpload} style={{padding:'12px 32px',background:t.accent,color:'#fff',border:'none',borderRadius:10,fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:'inherit',boxShadow:`0 4px 14px ${t.accent}40`}}>
        上传EPUB开始
      </button>
      <div style={{marginTop:12,fontSize:12,color:t.muted}}>或拖拽文件到此处</div>
    </div>
  )
}
