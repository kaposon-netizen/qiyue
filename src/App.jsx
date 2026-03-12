import { useState, useRef, useCallback, useEffect } from 'react'
import { TextToSpeech } from '@capacitor-community/text-to-speech'

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
    prompt:`你是专业儿童文学改编师。改写以下内容，让10岁孩子轻松读懂并喜欢阅读。\n规则：①情节事件人物对话100%保留 ②人名地名不变 ③主题因果不变\n风格：故事感强，画面生动，句子简短有节奏。直接输出，不加说明。` },
  { id:'dialogue',  name:'对话版', desc:'多用对话，少大段叙述',
    prompt:`你是专业儿童文学改编师。改写以下内容，让10岁孩子轻松读懂并喜欢阅读。\n规则：①情节事件人物对话100%保留 ②人名地名不变 ③主题因果不变\n风格：用人物对话推进情节，配合简短动作描写，像看连续剧。直接输出，不加说明。` },
  { id:'adventure', name:'探险风', desc:'紧张感强，带入感十足',
    prompt:`你是专业儿童文学改编师。改写以下内容，让10岁孩子轻松读懂并喜欢阅读。\n规则：①情节事件人物对话100%保留 ②人名地名不变 ③主题因果不变\n风格：充满紧迫感和好奇心，短句制造节奏感，读者感觉在现场。直接输出，不加说明。` },
  { id:'simple',    name:'简白版', desc:'最简单直白，像朋友聊天',
    prompt:`你是专业儿童文学改编师。改写以下内容，让10岁孩子轻松读懂并喜欢阅读。\n规则：①情节事件人物对话100%保留 ②人名地名不变 ③主题因果不变\n风格：最简单的现代中文，句子短，逻辑清楚，像朋友讲故事。直接输出，不加说明。` },
]

const FONTS = {
  serif: "'Noto Serif SC', Georgia, 'STSong', serif",
  sans:  "'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif",
}

// ─── AI Providers ─────────────────────────────────────────────────────────────
const PROVIDERS = [
  { id:'claude', name:'Claude',    endpoint:'/api/chat',
    models:[ {id:'claude-haiku-4-5-20251001',name:'Haiku (快·便宜)'}, {id:'claude-sonnet-4-5',name:'Sonnet (强·贵)'} ] },
  { id:'zhipu',  name:'智谱 GLM',  endpoint:'/api/zhipu',
    directUrl:'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    models:[ {id:'glm-4-flash',name:'GLM-4 Flash (快·免费)'}, {id:'glm-4-plus',name:'GLM-4 Plus'} ] },
  { id:'qwen',   name:'千问 Qwen', endpoint:'/api/qwen',
    directUrl:'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    models:[ {id:'qwen-turbo',name:'Turbo (快)'}, {id:'qwen-plus',name:'Plus (均衡)'}, {id:'qwen-max',name:'Max (强)'} ] },
  { id:'gemini', name:'Gemini',    endpoint:'/api/gemini',
    models:[ {id:'gemini-2.5-pro',name:'2.5 Pro (最强)'}, {id:'gemini-2.0-flash',name:'2.0 Flash (推荐)'} ] },
]

const STORAGE_KEY = 'qiyue_settings_v3'
const READ_POS_KEY = 'qiyue_read_pos'
const NOTES_KEY   = 'qiyue_notes_v1'

const DEFAULT_SETTINGS = {
  bgTheme:'paper', fontSize:18, lineHeight:1.9, fontType:'serif',
  provider:'claude', model:'claude-haiku-4-5-20251001',
  apiKeys:{ claude:'', zhipu:'', qwen:'', gemini:'' },
}

// ─── Responsive width hook ────────────────────────────────────────────────────
// Used everywhere instead of a static mob() function.
// isMob  < 768   (phone portrait)
// isTab  768-1100 (tablet / phone landscape)
// isDesk > 1100  (desktop)
function useWidth() {
  const [w, setW] = useState(window.innerWidth)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return w
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
function lsLoad(key, def) {
  try { const v = localStorage.getItem(key); return v ? { ...def, ...JSON.parse(v) } : def } catch { return def }
}
function lsSave(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }

// ─── IndexedDB ────────────────────────────────────────────────────────────────
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
    r.onerror   = rej
  })
  return _db
}
async function dbGet(store, k)   { try { const db=await getDB(); return await new Promise(res=>{ const r=db.transaction(store,'readonly').objectStore(store).get(k); r.onsuccess=()=>res(r.result??null); r.onerror=()=>res(null) }) } catch { return null } }
async function dbSet(store, val) { try { const db=await getDB(); await new Promise(res=>{ const tx=db.transaction(store,'readwrite'); tx.objectStore(store).put(val); tx.oncomplete=res }) } catch {} }
async function dbDel(store, k)   { try { const db=await getDB(); await new Promise(res=>{ const tx=db.transaction(store,'readwrite'); tx.objectStore(store).delete(k); tx.oncomplete=res }) } catch {} }
async function dbAll(store)      { try { const db=await getDB(); return await new Promise(res=>{ const r=db.transaction(store,'readonly').objectStore(store).getAll(); r.onsuccess=()=>res(r.result??[]); r.onerror=()=>res([]) }) } catch { return [] } }

function hashStr(s) { let h=0; for(let i=0;i<s.length;i++) h=(Math.imul(31,h)+s.charCodeAt(i))|0; return Math.abs(h).toString(36) }

// ─── EPUB parser ──────────────────────────────────────────────────────────────
async function parseEpub(file) {
  const JSZip  = (await import('jszip')).default
  const zip    = await JSZip.loadAsync(file)
  const cXml   = await zip.file('META-INF/container.xml').async('text')
  const opfPath = cXml.match(/full-path="([^"]+)"/)?.[1]
  if (!opfPath) throw new Error('无效EPUB')
  const base   = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/')+1) : ''
  const opfXml = await zip.file(opfPath).async('text')
  const opfDoc = new DOMParser().parseFromString(opfXml, 'text/xml')
  const getEl  = tag => opfDoc.querySelector(tag)?.textContent?.trim() || ''
  const title  = getEl('dc\\:title')   || getEl('title')   || file.name.replace(/\.epub$/i,'')
  const author = getEl('dc\\:creator') || getEl('creator') || '未知作者'
  const manifest = {}
  opfDoc.querySelectorAll('manifest item').forEach(el => {
    manifest[el.getAttribute('id')] = { href: base + decodeURIComponent(el.getAttribute('href')||''), type: el.getAttribute('media-type')||'' }
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
    chapters.push({ title: extractTitle(html) || `第${chapters.length+1}章`, text })
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

// ─── AI streaming ─────────────────────────────────────────────────────────────
async function streamAI(apiKey, system, user, onChunk, provider='claude', model) {
  if (!apiKey) throw new Error('请先在设置中填写 ' + (PROVIDERS.find(p=>p.id===provider)?.name||'') + ' API Key')
  const prov = PROVIDERS.find(p=>p.id===provider) || PROVIDERS[0]
  if (prov.directUrl) {
    const msgs = system ? [{role:'system',content:system},{role:'user',content:user}] : [{role:'user',content:user}]
    const resp = await fetch(prov.directUrl, { method:'POST', headers:{'content-type':'application/json','authorization':`Bearer ${apiKey}`}, body:JSON.stringify({model,messages:msgs,stream:true}) })
    if (!resp.ok) { let m=`HTTP ${resp.status}`; try{const e=await resp.json();m=e.error?.message||m}catch{}; throw new Error(m) }
    const reader=resp.body.getReader(), dec=new TextDecoder(); let buf='',full=''
    while(true){ const{done,value}=await reader.read(); if(done)break; buf+=dec.decode(value,{stream:true}); const lines=buf.split('\n'); buf=lines.pop()||''; for(const line of lines){ if(!line.startsWith('data: '))continue; const d=line.slice(6).trim(); if(d==='[DONE]')continue; try{const p=JSON.parse(d);const t=p.choices?.[0]?.delta?.content;if(t){full+=t;onChunk?.(full)}}catch{} } }
    return full
  }
  const resp = await fetch(prov.endpoint, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({apiKey,system,messages:[{role:'user',content:user}],model}) })
  if (!resp.ok) { let m=`HTTP ${resp.status}`; try{const e=await resp.json();m=e.error?.message||m}catch{}; throw new Error(m) }
  const reader=resp.body.getReader(), dec=new TextDecoder(); let buf='',full=''
  while(true){ const{done,value}=await reader.read(); if(done)break; buf+=dec.decode(value,{stream:true}); const lines=buf.split('\n'); buf=lines.pop()||''; for(const line of lines){ if(!line.startsWith('data: '))continue; const d=line.slice(6).trim(); if(d==='[DONE]')continue; try{const p=JSON.parse(d);if(p.type==='content_block_delta'&&p.delta?.text){full+=p.delta.text;onChunk?.(full)}}catch{} } }
  return full
}

// ─── Tiny shared UI ───────────────────────────────────────────────────────────
function Spinner({ size=15, color }) {
  return <div style={{width:size,height:size,border:`2px solid ${color}30`,borderTopColor:color,borderRadius:'50%',animation:'spin .7s linear infinite',flexShrink:0}}/>
}
function Overlay({ children, onClick }) {
  return <div onClick={onClick} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>{children}</div>
}
function SRow({ label, children }) {
  return <div style={{marginBottom:16}}><div style={{fontSize:12,opacity:.6,marginBottom:6}}>{label}</div>{children}</div>
}
function Btn({ t, children, onClick, primary, disabled }) {
  return (
    <button disabled={disabled} onClick={onClick} style={{
      display:'inline-flex',alignItems:'center',gap:5,padding:'6px 13px',
      borderRadius:8,border:`1px solid ${primary?t.accent:t.border}`,
      background:primary?t.accent:'transparent',color:primary?'#fff':t.text,
      fontSize:13,opacity:disabled?.4:1,cursor:disabled?'not-allowed':'pointer',
      fontFamily:'inherit',whiteSpace:'nowrap',
    }}>{children}</button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {

  // ── Responsive layout ────────────────────────────────────────────────────────
  const width   = useWidth()
  const isMob   = width < 768
  const isTab   = width >= 768 && width < 1100   // tablet / landscape phone
  // isTab: sidebar always visible, slightly wider reading column

  // ── Core state ───────────────────────────────────────────────────────────────
  const [settings,       setSettings]       = useState(()=>lsLoad(STORAGE_KEY,{...DEFAULT_SETTINGS,fontSize:isMob?16:19}))
  const [library,        setLibrary]        = useState([])
  const [book,           setBook]           = useState(null)
  const [chIdx,          setChIdx]          = useState(0)
  const [viewMode,       setViewMode]       = useState('original')   // original|rewriting|rewritten
  const [style,          setStyle]          = useState(null)
  const [cache,          setCache]          = useState({})
  const [sidebarOpen,    setSidebarOpen]    = useState(!isMob)
  const [sidebarTab,     setSidebarTab]     = useState('chapters')
  const [rewriteLoading, setRewriteLoading] = useState(false)
  const [streamText,     setStreamText]     = useState('')
  const [showSettings,   setShowSettings]   = useState(false)
  const [showStyleModal, setShowStyleModal] = useState(false)
  const [styleSamples,   setStyleSamples]   = useState({})
  const [pendingStyleId, setPendingStyleId] = useState(null)
  const [ttsPlaying,     setTtsPlaying]     = useState(false)
  const [ttsPaused,      setTtsPaused]      = useState(false)
  const [ttsRate,        setTtsRate]        = useState(1.0)
  const [ttsProgress,    setTtsProgress]    = useState(0)
  const [toast,          setToast]          = useState('')
  const [scrollTrigger,  setScrollTrigger]  = useState(0)

  // ── Notes state ──────────────────────────────────────────────────────────────
  const [notes,       setNotes]       = useState(() => { try { return JSON.parse(localStorage.getItem(NOTES_KEY)||'[]') } catch { return [] } })
  const [thoughtModal,setThoughtModal]= useState(null)    // {noteId}
  const [thoughtInput,setThoughtInput]= useState('')

  // ── Selection panel state ─────────────────────────────────────────────────────
  // selPanel: null | { text, rectTop, rectLeft, rectWidth }
  // We store the selection rect at moment of selection, then position panel from it.
  const [selPanel,     setSelPanel]     = useState(null)
  const [selMode,      setSelMode]      = useState('')      // ''|'thought'|'askai'
  const [selInput,     setSelInput]     = useState('')
  const [selAiReply,   setSelAiReply]   = useState('')
  const [selAiLoading, setSelAiLoading] = useState(false)

  // ── Refs ──────────────────────────────────────────────────────────────────────
  const ttsRef           = useRef(null)
  const fileInputRef     = useRef(null)
  const readerRef        = useRef(null)
  const pendingScrollRef = useRef(null)
  const selPanelRef      = useRef(null)
  // Sync selMode to a ref so selectionchange handler always sees current value
  const selModeRef       = useRef('')
  selModeRef.current     = selMode

  // ── Derived ───────────────────────────────────────────────────────────────────
  const t            = BG_THEMES.find(b=>b.id===settings.bgTheme) || BG_THEMES[0]
  const curProvider  = PROVIDERS.find(p=>p.id===settings.provider) || PROVIDERS[0]
  const curApiKey    = settings.apiKeys?.[settings.provider] || ''
  const chapter      = book?.chapters[chIdx]
  const cachedRW     = style && cache[chIdx]?.[style.id]
  const isRewriting  = viewMode === 'rewriting'
  const displayText  = isRewriting ? streamText : (viewMode==='rewritten'&&cachedRW ? cachedRW : chapter?.text||'')
  const wordCount    = displayText.replace(/\s/g,'').length
  const readTime     = Math.max(1, Math.ceil(wordCount/400))
  const totalCh      = book?.chapters.length || 0

  // ── Persist settings ──────────────────────────────────────────────────────────
  useEffect(() => { lsSave(STORAGE_KEY, settings) }, [settings])

  // ── Auto-open sidebar on tablet ────────────────────────────────────────────────
  useEffect(() => {
    if (!isMob) setSidebarOpen(true)
  }, [isMob])

  // ── Load library ──────────────────────────────────────────────────────────────
  useEffect(() => {
    dbAll('books').then(rows =>
      setLibrary(rows.map(({id,title,author,addedAt})=>({id,title,author,addedAt})).sort((a,b)=>b.addedAt-a.addedAt))
    )
  }, [])

  // ── Restore scroll position ────────────────────────────────────────────────────
  useEffect(() => {
    if (pendingScrollRef.current === null) return
    const target = pendingScrollRef.current
    const el = readerRef.current
    if (!el) return
    let rafId
    const tryScroll = () => {
      const max = el.scrollHeight - el.clientHeight
      if (max < 100) { rafId = requestAnimationFrame(tryScroll); return }
      const px = Math.round(target * max)
      el.scrollTop = px
      if (Math.abs(el.scrollTop - px) > 20) rafId = requestAnimationFrame(tryScroll)
      else pendingScrollRef.current = null
    }
    rafId = requestAnimationFrame(tryScroll)
    return () => cancelAnimationFrame(rafId)
  }, [chIdx, book, scrollTrigger])

  // ── TEXT SELECTION → PANEL ────────────────────────────────────────────────────
  //
  // Design:
  //   • Listen to `selectionchange` on the document (fires on every selection change,
  //     including Android handle drags). After a short debounce, check if the selection
  //     is non-empty AND fully inside readerRef. If yes → show panel.
  //   • The panel itself has userSelect:none + onPointerDown e.preventDefault() so that
  //     tapping any panel button NEVER moves the text-selection cursor.
  //   • Panel backdrop has pointerEvents:none so the user can still interact with the
  //     page behind it.
  //
  useEffect(() => {
    let timer = null

    const onSelChange = () => {
      clearTimeout(timer)
      // If we're in input sub-mode (writing a thought / asking AI), leave the panel alone
      if (selModeRef.current) return

      timer = setTimeout(() => {
        const sel = window.getSelection()

        // No selection or collapsed → hide panel (but only if not in input mode)
        if (!sel || sel.isCollapsed || !sel.rangeCount) {
          if (!selModeRef.current) setSelPanel(null)
          return
        }

        const text = sel.toString().trim()
        if (text.length < 2) { setSelPanel(null); return }

        // Only trigger for selections inside the reader
        const reader = readerRef.current
        if (!reader) { setSelPanel(null); return }
        const range = sel.getRangeAt(0)
        if (!reader.contains(range.commonAncestorContainer)) { setSelPanel(null); return }

        // Capture bounding rect of the selection for panel positioning
        const rect = range.getBoundingClientRect()
        setSelPanel({ text, rectTop: rect.top, rectLeft: rect.left, rectWidth: rect.width })
        setSelMode('')
        setSelInput('')
        setSelAiReply('')
      }, 250) // debounce: wait for Android handle drag to settle
    }

    document.addEventListener('selectionchange', onSelChange)
    return () => { document.removeEventListener('selectionchange', onSelChange); clearTimeout(timer) }
  }, [])   // stable – no deps needed

  const closeSelPanel = useCallback(() => {
    window.getSelection()?.removeAllRanges()
    setSelPanel(null)
    setSelMode('')
    setSelInput('')
    setSelAiReply('')
  }, [])

  // ── Notes helpers ─────────────────────────────────────────────────────────────
  const saveNotes = useCallback(arr => {
    setNotes(arr)
    localStorage.setItem(NOTES_KEY, JSON.stringify(arr))
  }, [])

  const addNote = useCallback((text, thought='', paraText='') => {
    const el = readerRef.current
    const scrollPct = el && el.scrollHeight > el.clientHeight ? el.scrollTop / (el.scrollHeight - el.clientHeight) : 0
    const note = {
      id: Date.now(), text, thought, paraText: paraText || text,
      bookId: book?.id||'', book: book?.title||'',
      chIdx, chapter: chapter?.title||'',
      scrollPct, mode: viewMode,
      date: new Date().toLocaleDateString('zh-CN')
    }
    saveNotes([note, ...notes])
    setToast(thought ? '想法已保存 ✓' : '已加入笔记 ✓')
    setTimeout(() => setToast(''), 1800)
  }, [book, chIdx, chapter, viewMode, notes, saveNotes])

  const deleteNote    = useCallback(id => saveNotes(notes.filter(n=>n.id!==id)), [notes, saveNotes])
  const updateThought = useCallback((id, thought) => {
    saveNotes(notes.map(n => n.id===id ? {...n,thought} : n))
    setToast('想法已更新 ✓')
    setTimeout(() => setToast(''), 1800)
  }, [notes, saveNotes])

  // ── TTS ───────────────────────────────────────────────────────────────────────
  const ttsStop = useCallback(async () => {
    if (ttsRef.current) ttsRef.current.stopped = true
    try { await TextToSpeech.stop() } catch {}
    setTtsPlaying(false); setTtsPaused(false); setTtsProgress(-1); ttsRef.current = null
  }, [])

  useEffect(() => { ttsStop() }, [chIdx, book])

  // ── splitChunks: paraIdx counts ONLY non-empty paragraphs (same as renderParas) ──
  const splitChunks = text => {
    const chunks = [], paraMap = []
    let nonEmptyIdx = -1
    text.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (!trimmed) return
      nonEmptyIdx++                          // ← same counter renderParas uses
      const sents = trimmed.split(/(?<=[。！？!?…]+)/).filter(s => s.trim().length > 1)
      const list = sents.length ? sents : [trimmed]
      list.forEach(s => { chunks.push(s.trim()); paraMap.push(nonEmptyIdx) })
    })
    return chunks.length > 0 ? { chunks, paraMap } : { chunks:[text.trim()], paraMap:[0] }
  }

  // ── Find first non-empty paragraph visible in reader viewport ─────────────────
  const getVisibleParaIdx = () => {
    const el = readerRef.current
    if (!el) return 0
    const elTop = el.getBoundingClientRect().top
    const elBottom = el.getBoundingClientRect().bottom
    const nodes = el.querySelectorAll('[data-para]')
    for (const node of nodes) {
      const r = node.getBoundingClientRect()
      // First paragraph whose top is inside the visible reader area
      if (r.top >= elTop - 4 && r.top < elBottom) return parseInt(node.getAttribute('data-para'))
    }
    return 0
  }

  // ── Auto-scroll reader to keep speaking paragraph in view ─────────────────────
  useEffect(() => {
    if (ttsProgress < 0 || !ttsRef.current?.paraMap) return
    const paraIdx = ttsRef.current.paraMap[ttsProgress]
    if (paraIdx == null) return
    const el = readerRef.current
    if (!el) return
    const target = el.querySelector(`[data-para="${paraIdx}"]`)
    if (!target) return
    const elRect = el.getBoundingClientRect()
    const tRect  = target.getBoundingClientRect()
    // Only scroll if paragraph is outside the middle 60% of the reader
    const relTop = tRect.top - elRect.top
    const band   = elRect.height * 0.2
    if (relTop < band || relTop > elRect.height * 0.7) {
      el.scrollBy({ top: relTop - elRect.height * 0.3, behavior: 'smooth' })
    }
  }, [ttsProgress])

  const ttsSpeak = useCallback(async () => {
    if (!displayText?.trim()) { setToast('没有可朗读的内容'); setTimeout(()=>setToast(''),2000); return }
    if (ttsRef.current) ttsRef.current.stopped = true
    try { await TextToSpeech.stop() } catch {}

    const { chunks, paraMap } = splitChunks(displayText)

    // Start from the first paragraph visible on screen right now
    const visiblePara = getVisibleParaIdx()
    const startIdx = visiblePara > 0
      ? Math.max(0, paraMap.findIndex(p => p >= visiblePara))
      : 0

    const session = { chunks, paraMap, idx: startIdx, stopped: false, paused: false, resumeFrom: startIdx }
    ttsRef.current = session
    setTtsPlaying(true); setTtsPaused(false); setTtsProgress(startIdx)

    for (let i = startIdx; i < chunks.length; i++) {
      if (session.stopped || session.paused) break
      session.idx = i
      setTtsProgress(i)                      // ← triggers highlight + scroll
      try { await TextToSpeech.speak({ text: chunks[i], lang: 'zh-CN', rate: ttsRate, pitch: 1.0, volume: 1.0 }) }
      catch { break }
      if (session.stopped || session.paused) break
    }
    if (!session.stopped && !session.paused) {
      setTtsPlaying(false); setTtsPaused(false); setTtsProgress(-1); ttsRef.current = null
    }
  }, [displayText, ttsRate])

  const ttsPause = useCallback(async () => {
    if (!ttsRef.current || !ttsPlaying) return
    ttsRef.current.paused = true; ttsRef.current.resumeFrom = ttsRef.current.idx
    try { await TextToSpeech.stop() } catch {}
    setTtsPlaying(false); setTtsPaused(true)
  }, [ttsPlaying])

  const ttsResume = useCallback(async () => {
    const s = ttsRef.current; if (!s) { ttsSpeak(); return }
    s.paused = false; s.stopped = false; setTtsPlaying(true); setTtsPaused(false)
    for (let i=s.resumeFrom; i<s.chunks.length; i++) {
      if (s.stopped || s.paused) break
      s.idx = i; setTtsProgress(i)
      try { await TextToSpeech.speak({text:s.chunks[i],lang:'zh-CN',rate:ttsRate,pitch:1.0,volume:1.0}) }
      catch { break }
      if (s.stopped || s.paused) break
    }
    if (!s.stopped && !s.paused) { setTtsPlaying(false); setTtsPaused(false); setTtsProgress(-1); ttsRef.current = null }
  }, [ttsSpeak, ttsRate])

  const ttsToggle = () => ttsPlaying ? ttsPause() : ttsPaused ? ttsResume() : ttsSpeak()

  // ── Book management ───────────────────────────────────────────────────────────
  const loadBook = useCallback(async meta => {
    let b = meta.chapters ? meta : await dbGet('books', meta.id)
    if (!b) { alert('书籍数据丢失，请重新上传'); return }
    setBook(b); setChIdx(0); setViewMode('original'); setStyle(null)
    setCache({}); setStreamText(''); setSidebarTab('chapters')
    if (isMob) setSidebarOpen(false)
    const saved = JSON.parse(localStorage.getItem(READ_POS_KEY)||'{}')
    if (saved.bookId === b.id) {
      setTimeout(() => { setChIdx(saved.chIdx||0); pendingScrollRef.current = saved.scrollPct||0 }, 50)
    }
  }, [isMob])

  const handleFile = useCallback(async file => {
    if (!file?.name.match(/\.epub$/i)) { alert('请上传 .epub 文件'); return }
    setToast('解析中…')
    try {
      const meta = await parseEpub(file)
      await dbSet('books', meta)
      setLibrary(prev => [{id:meta.id,title:meta.title,author:meta.author,addedAt:meta.addedAt},...prev.filter(b=>b.id!==meta.id)])
      setToast('')
      await loadBook(meta)
    } catch(e) { setToast('解析失败: '+(e?.message||e)); setTimeout(()=>setToast(''),3000) }
  }, [loadBook])

  const onDrop = useCallback(e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }, [handleFile])

  const deleteBook = useCallback(async bookId => {
    if (!confirm('确定删除这本书？')) return
    await dbDel('books', bookId)
    setLibrary(prev => prev.filter(b => b.id !== bookId))
    if (book?.id === bookId) { setBook(null); setChIdx(0); setViewMode('original'); setCache({}) }
  }, [book])

  const goChapter = useCallback(idx => {
    setChIdx(idx); setViewMode('original'); setStreamText('')
    lsSave(READ_POS_KEY, { bookId: book?.id, chIdx: idx, scrollPct: 0 })
    if (isMob) setSidebarOpen(false)
  }, [book, isMob])

  // ── Rewrite ───────────────────────────────────────────────────────────────────
  const doRewrite = useCallback(async styleId => {
    const s = STYLES.find(s=>s.id===styleId); if (!s) return
    setShowStyleModal(false); setStyle(s)
    if (!curApiKey) { setShowSettings(true); return }
    const text = chapter?.text || ''; if (!text) return
    setViewMode('rewriting'); setStreamText(''); setRewriteLoading(true)
    let finalText = '', chunks = []
    const CHUNK = 1800
    if (text.length > CHUNK) for (let i=0;i<text.length;i+=CHUNK) chunks.push(text.slice(i,Math.min(i+CHUNK,text.length)))
    try {
      if (!chunks.length) {
        await streamAI(curApiKey, s.prompt, `改写以下内容：\n\n${text}`, chunk => { finalText=chunk; setStreamText(chunk) }, settings.provider, settings.model)
      } else {
        for (let i=0; i<chunks.length; i++) {
          let co = ''
          await streamAI(curApiKey, s.prompt, `第${i+1}段（共${chunks.length}段）：\n\n${chunks[i]}`, chunk => { co=chunk; setStreamText(finalText+chunk) }, settings.provider, settings.model)
          finalText += co
        }
      }
      const key = `${book?.id}_${chIdx}_${s.id}`
      await dbSet('rw', { k:key, text:finalText })
      setCache(p => ({...p, [chIdx]: {...(p[chIdx]||{}), [s.id]: finalText}}))
      setViewMode('rewritten')
    } catch(e) { setToast('改写出错: '+(e?.message||e)); setTimeout(()=>setToast(''),3000); setViewMode('original') }
    setRewriteLoading(false)
  }, [curApiKey, chapter, chIdx, book, settings])

  const confirmStyle = useCallback(() => { if (pendingStyleId) doRewrite(pendingStyleId) }, [pendingStyleId, doRewrite])

  useEffect(() => {
    if (!book || !style) return
    const key = `${book.id}_${chIdx}_${style.id}`
    dbGet('rw', key).then(row => { if (row?.text) setCache(p => ({...p,[chIdx]:{...(p[chIdx]||{}),[style.id]:row.text}})) })
  }, [chIdx, book, style])

  const loadSamples = useCallback(async () => {
    if (!curApiKey || !chapter?.text) return
    setStyleSamples({})
    const sample = chapter.text.slice(0, 400)
    for (const st of STYLES) {
      try { await streamAI(curApiKey, st.prompt, `改写以下样本：\n\n${sample}`, chunk => setStyleSamples(p=>({...p,[st.id]:chunk})), settings.provider, settings.model) }
      catch {}
    }
  }, [curApiKey, chapter, settings])

  useEffect(() => { if (showStyleModal) loadSamples() }, [showStyleModal])

  // ── Render reader paragraphs with note highlights + TTS highlight ──────────────
  // ttsCurrentPara: which paragraph index is currently being spoken
  const ttsCurrentPara = (ttsPlaying || ttsPaused) && ttsRef.current?.paraMap && ttsProgress >= 0
    ? ttsRef.current.paraMap[ttsProgress]
    : -1

  const renderParas = () => {
    let paraIdx = -1
    return displayText.split('\n').map((para, i) => {
      const trimmed = para.trim()
      if (!trimmed) return <br key={i}/>
      paraIdx++
      const curPara = paraIdx  // capture for closure
      const isSpeaking = curPara === ttsCurrentPara

      // Note highlight matching
      const mn = notes.find(n => {
        if (n.bookId!==book?.id || n.chIdx!==chIdx || !n.paraText) return false
        const pt = n.paraText.split('\n').map(l=>l.trim()).find(l=>l.length>1) || n.paraText.trim()
        return pt.length > 1 && trimmed.includes(pt)
      })

      const baseStyle = {
        marginBottom:'1em',
        ...(isSpeaking ? {
          background: t.accent+'18',
          borderRadius: 6,
          padding: '2px 6px',
          margin: '0 -6px 1em',
          transition: 'background .3s',
        } : {})
      }

      if (!mn) return <p key={i} data-para={curPara} style={baseStyle}>{trimmed}</p>

      const pt = mn.paraText.split('\n').map(l=>l.trim()).find(l=>l.length>1) || mn.paraText.trim()
      const ht = pt, hi = trimmed.indexOf(ht)
      if (hi === -1) return <p key={i} data-para={curPara} style={baseStyle}>{trimmed}</p>
      return (
        <p key={i} data-para={curPara} style={baseStyle}>
          {hi > 0 && trimmed.slice(0, hi)}
          <mark style={{background:t.accent+'44',borderRadius:3,padding:'1px 0',borderBottom:`2px solid ${t.accent}`,color:'inherit'}}>
            {trimmed.slice(hi, hi+ht.length)}
            {mn.thought && <span style={{fontSize:10,color:t.accent,marginLeft:3,opacity:.8}}>💭</span>}
          </mark>
          {hi+ht.length < trimmed.length && trimmed.slice(hi+ht.length)}
        </p>
      )
    })
  }

  // ── Panel position: always above the selection midpoint, clamped to viewport ──
  const panelPos = selPanel ? {
    left: Math.max(8, Math.min(selPanel.rectLeft + selPanel.rectWidth/2 - 210, window.innerWidth - 428)),
    top:  Math.max(8, selPanel.rectTop - 8),
  } : null

  const btnBase = (active, small) => ({
    background: 'none',
    border: `1px solid ${active ? t.accent : t.border}`,
    borderRadius: 7,
    padding: small ? '4px 7px' : '5px 9px',
    color: active ? t.accent : t.muted,
    fontSize: small ? 11 : 13,
    cursor: 'pointer',
    fontFamily: 'inherit',
    flexShrink: 0,
    lineHeight: 1,
  })

  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div
      style={{display:'flex',height:'100vh',background:t.bg,color:t.text,overflow:'hidden',
        transition:'background .3s,color .3s',
        paddingTop:'env(safe-area-inset-top)',paddingLeft:'env(safe-area-inset-left)',
        paddingRight:'env(safe-area-inset-right)',boxSizing:'border-box'}}
      onDrop={onDrop} onDragOver={e=>e.preventDefault()}
    >

      {/* Mobile sidebar backdrop */}
      {isMob && sidebarOpen && (
        <div onClick={()=>setSidebarOpen(false)}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:99}}/>
      )}

      {/* ── Sidebar ── */}
      <aside style={{
        width: isMob ? (sidebarOpen?'80vw':0) : (sidebarOpen?260:0),
        minWidth: isMob ? 0 : (sidebarOpen?260:0),
        background: t.sidebar,
        borderRight: sidebarOpen ? `1px solid ${t.border}` : 'none',
        display:'flex', flexDirection:'column', overflow:'hidden',
        transition:'width .25s,min-width .25s', flexShrink:0,
        ...(isMob && sidebarOpen ? {position:'fixed',left:0,top:0,bottom:0,zIndex:100,width:'80vw',boxShadow:'4px 0 20px rgba(0,0,0,.2)'} : {}),
      }}>
        {/* Logo */}
        <div style={{padding:'15px 14px 12px',borderBottom:`1px solid ${t.border}`,flexShrink:0,display:'flex',alignItems:'center',gap:9}}>
          <div style={{width:32,height:32,borderRadius:8,background:t.accent,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:16,fontWeight:700}}>✦</div>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:t.accent}}>奇阅魔方</div>
            <div style={{fontSize:11,color:t.muted}}>AI 阅读助手</div>
          </div>
        </div>

        {/* Upload */}
        <div style={{padding:'10px 12px',borderBottom:`1px solid ${t.border}`,flexShrink:0}}>
          <button onClick={()=>fileInputRef.current?.click()} style={{
            width:'100%',padding:'8px',background:t.accent,color:'#fff',border:'none',
            borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',
          }}>＋ 上传 EPUB</button>
        </div>

        {/* Book list */}
        {library.length > 0 && (
          <div style={{padding:'8px 12px 4px',flexShrink:0,maxHeight:200,overflowY:'auto'}}>
            <div style={{fontSize:11,color:t.muted,marginBottom:6,textTransform:'uppercase',letterSpacing:1}}>书库</div>
            {library.map(b => (
              <div key={b.id} style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
                <button onClick={()=>loadBook(b)} style={{
                  flex:1,minWidth:0,textAlign:'left',padding:'6px 8px',
                  background: book?.id===b.id ? t.accent+'22' : 'none',
                  border: `1px solid ${book?.id===b.id?t.accent:t.border}`,
                  borderRadius:6,cursor:'pointer',fontFamily:'inherit',
                  color: book?.id===b.id ? t.accent : t.text,
                }}>
                  <div style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.title}</div>
                  <div style={{fontSize:10,color:t.muted}}>{b.author}</div>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Sidebar tabs */}
        {book && (
          <div style={{display:'flex',borderBottom:`1px solid ${t.border}`,flexShrink:0}}>
            {[['chapters','目录'],['notes','笔记']].map(([id,label]) => (
              <button key={id} onClick={()=>setSidebarTab(id)} style={{
                flex:1,padding:'9px 4px',border:'none',background:'none',fontFamily:'inherit',
                color: sidebarTab===id ? t.accent : t.muted,
                fontSize:13,fontWeight:sidebarTab===id?700:400,
                borderBottom: sidebarTab===id ? `2px solid ${t.accent}` : 'none',cursor:'pointer',
              }}>{label}{id==='notes'&&notes.length>0?` (${notes.length})`:''}</button>
            ))}
          </div>
        )}

        {/* Chapter list */}
        {book && sidebarTab==='chapters' && (
          <div style={{flex:1,overflowY:'auto',padding:'6px 0'}}>
            {book.chapters.map((ch,i) => (
              <button key={i} onClick={()=>goChapter(i)} style={{
                width:'100%',textAlign:'left',padding:'9px 14px',border:'none',fontFamily:'inherit',
                background: i===chIdx ? t.accent+'22' : 'none',
                color: i===chIdx ? t.accent : t.text,
                fontSize:13,cursor:'pointer',
                borderLeft: i===chIdx ? `3px solid ${t.accent}` : '3px solid transparent',
              }}>{ch.title}</button>
            ))}
          </div>
        )}

        {/* Notes list */}
        {book && sidebarTab==='notes' && (
          <div style={{flex:1,overflowY:'auto',padding:'8px 12px',paddingBottom:'calc(12px + env(safe-area-inset-bottom))'}}>
            {notes.length === 0
              ? <div style={{textAlign:'center',color:t.muted,padding:'40px 0',fontSize:14}}>还没有笔记<br/><span style={{fontSize:12,opacity:.7}}>选中书中文字可加入</span></div>
              : notes.map(n => (
                <NoteItem key={n.id} n={n} t={t}
                  onDelete={()=>deleteNote(n.id)}
                  onThought={()=>{ setThoughtModal({noteId:n.id}); setThoughtInput(n.thought||'') }}
                  onShare={()=>{
                    const txt = `「${n.text}」${n.thought?'\n💭 '+n.thought:''}\n——《${n.book}》`
                    navigator.share ? navigator.share({text:txt}) : navigator.clipboard?.writeText(txt).then(()=>{setToast('已复制');setTimeout(()=>setToast(''),1500)})
                  }}
                  onNavigate={async ()=>{
                    if (n.bookId && n.bookId!==book?.id) {
                      const bk = await dbGet('books', n.bookId)
                      if (bk) { await loadBook(bk); setTimeout(()=>{ setChIdx(n.chIdx||0); pendingScrollRef.current=n.scrollPct||0; setScrollTrigger(x=>x+1) },200) }
                      else { setToast('书籍已删除'); setTimeout(()=>setToast(''),2000) }
                    } else if ((n.chIdx||0) !== chIdx) {
                      pendingScrollRef.current = n.scrollPct||0
                      setChIdx(n.chIdx||0)
                    } else {
                      pendingScrollRef.current = n.scrollPct||0
                      setScrollTrigger(x=>x+1)
                    }
                  }}
                />
              ))
            }
          </div>
        )}
      </aside>

      {/* ── Main column ── */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>

        {/* ── Top bar ── */}
        <div style={{
          display:'flex',alignItems:'center',gap:6,
          padding:`8px 10px`,
          borderBottom:`1px solid ${t.border}`,
          flexShrink:0,background:t.bg,overflow:'hidden',
        }}>
          <button onClick={()=>setSidebarOpen(o=>!o)} style={{...btnBase(false),fontSize:15,padding:'5px 9px'}}>
            {sidebarOpen?'✕':'☰'}
          </button>

          {book && <>
            <button onClick={()=>setShowStyleModal(true)} style={{...btnBase(!!style),color:style?t.accent:t.muted}}>
              {style ? style.name : '风格'}
            </button>

            <button
              disabled={rewriteLoading}
              onClick={()=>{
                if (!style)   { setShowStyleModal(true); return }
                if (!curApiKey) { setShowSettings(true); return }
                setPendingStyleId(style.id)
                doRewrite(style.id)
              }}
              style={{
                background: cachedRW ? t.accent : rewriteLoading ? t.hover : 'none',
                border: `1px solid ${cachedRW?t.accent:t.border}`, borderRadius:7,
                padding:'5px 9px', color: cachedRW?'#fff':rewriteLoading?t.muted:t.text,
                fontSize:13, cursor:rewriteLoading?'wait':'pointer', flexShrink:0,
                fontFamily:'inherit', display:'flex', alignItems:'center', gap:4,
              }}>
              {rewriteLoading && <Spinner size={11} color={t.muted}/>}
              {isMob ? (cachedRW?'重写':'改写') : (cachedRW?'↺ 重写':'✦ 改写')}
            </button>

            {(cachedRW||isRewriting) && ['original','rewritten'].map(m => (
              <button key={m}
                onClick={()=>{ if(m==='rewritten'&&!cachedRW)return; setViewMode(m); setStreamText('') }}
                style={{...btnBase(viewMode===m,true),background:viewMode===m?t.accent+'22':'none'}}>
                {m==='original'?'原文':'改写'}
              </button>
            ))}

            <button onClick={ttsToggle} style={{...btnBase(ttsPlaying||ttsPaused),fontSize:14}}>
              {ttsPlaying?'⏸':'▶'}
            </button>
            {(ttsPlaying||ttsPaused) && <>
              <button onClick={ttsStop} style={{...btnBase(false),fontSize:14}}>■</button>
              <select value={ttsRate} onChange={e=>setTtsRate(+e.target.value)}
                style={{padding:'4px',border:`1px solid ${t.border}`,borderRadius:6,background:t.card,color:t.text,fontSize:11,fontFamily:'inherit',flexShrink:0,cursor:'pointer'}}>
                {[0.7,0.85,1.0,1.2,1.5].map(r=><option key={r} value={r}>{r}x</option>)}
              </select>
            </>}
          </>}

          <div style={{flex:1}}/>

          <button onClick={()=>{ if(book){ setSidebarTab('notes'); setSidebarOpen(true) } }}
            style={{...btnBase(false),fontSize:14,position:'relative'}}>
            📝
            {notes.length > 0 && (
              <span style={{position:'absolute',top:-4,right:-4,background:t.accent,color:'#fff',borderRadius:'50%',width:14,height:14,fontSize:9,display:'flex',alignItems:'center',justifyContent:'center'}}>{notes.length}</span>
            )}
          </button>
          <button onClick={()=>setShowSettings(true)} style={{...btnBase(false),fontSize:14}}>⚙</button>
        </div>

        {/* ── Reader ── */}
        <div
          ref={readerRef}
          onScroll={() => {
            if (book && readerRef.current) {
              const el = readerRef.current
              const pct = el.scrollHeight > el.clientHeight ? el.scrollTop/(el.scrollHeight-el.clientHeight) : 0
              lsSave(READ_POS_KEY, { bookId:book.id, chIdx, scrollPct:pct })
            }
          }}
          style={{
            flex:1, overflowY:'auto',
            paddingBottom:'env(safe-area-inset-bottom)',
            // Text is selectable here
            userSelect:'text', WebkitUserSelect:'text',
          }}
        >
          {!book
            ? <Welcome t={t} onUpload={()=>fileInputRef.current?.click()}/>
            : (
              <div style={{maxWidth:860,margin:'0 auto',padding:isMob?'20px 18px 60px':'44px 52px 60px'}}>
                <h1 style={{fontSize:settings.fontSize+4,fontWeight:700,marginBottom:28,lineHeight:1.4,fontFamily:FONTS[settings.fontType]}}>
                  {chapter?.title}
                </h1>
                <div style={{fontSize:settings.fontSize,lineHeight:settings.lineHeight,fontFamily:FONTS[settings.fontType],wordBreak:'break-word'}}>
                  {renderParas()}
                  {isRewriting && <span style={{display:'inline-block',width:2,height:'1em',background:t.accent,marginLeft:2,verticalAlign:'text-bottom',animation:'blink .9s step-end infinite'}}/>}
                </div>

                {/* Chapter nav */}
                <div style={{display:'flex',gap:10,marginTop:32,paddingTop:20,borderTop:`1px solid ${t.border}`,justifyContent:'space-between',alignItems:'center'}}>
                  <button onClick={()=>chIdx>0&&goChapter(chIdx-1)} disabled={chIdx===0}
                    style={{padding:'8px 16px',border:`1px solid ${t.border}`,borderRadius:8,background:'none',color:chIdx===0?t.muted:t.text,cursor:chIdx===0?'default':'pointer',fontSize:13,fontFamily:'inherit'}}>
                    ← 上一章
                  </button>
                  <div style={{textAlign:'center',fontSize:11,color:t.muted,lineHeight:1.8}}>
                    <div>第 {chIdx+1} 章 / 共 {totalCh} 章</div>
                    <div>{wordCount.toLocaleString()} 字 · 约 {readTime} 分钟</div>
                    <div style={{height:3,background:t.border,borderRadius:2,width:100,margin:'4px auto 0',overflow:'hidden'}}>
                      <div style={{height:'100%',background:t.accent,width:`${totalCh>1?(chIdx/(totalCh-1))*100:100}%`,transition:'width .3s'}}/>
                    </div>
                  </div>
                  <button onClick={()=>chIdx<totalCh-1&&goChapter(chIdx+1)} disabled={chIdx===totalCh-1}
                    style={{padding:'8px 16px',border:`1px solid ${t.border}`,borderRadius:8,background:'none',color:chIdx===totalCh-1?t.muted:t.text,cursor:chIdx===totalCh-1?'default':'pointer',fontSize:13,fontFamily:'inherit'}}>
                    下一章 →
                  </button>
                </div>
              </div>
            )
          }
        </div>
      </div>

      {/* ══ SELECTION PANEL ══════════════════════════════════════════════════════
          Architecture:
          ┌─ fixed inset overlay (pointer-events: none) ─────────────────────────┐
          │  ┌─ panel card (pointer-events: all, userSelect: none) ─────────────┐ │
          │  │  onPointerDown: e.preventDefault()  ← THE KEY FIX               │ │
          │  │  This stops the browser moving the selection cursor when         │ │
          │  │  the user taps any button, preventing accidental de-selection    │ │
          │  │  and preventing panel text from ever being selected.             │ │
          │  └──────────────────────────────────────────────────────────────────┘ │
          └──────────────────────────────────────────────────────────────────────┘
          Clicking OUTSIDE the panel → selectionchange fires → selection becomes
          empty → panel hides automatically. No explicit backdrop click needed.
      */}
      {selPanel && panelPos && (
        <div style={{position:'fixed',inset:0,zIndex:490,pointerEvents:'none'}}>
          <div
            ref={selPanelRef}
            style={{
              position:'absolute',
              left: panelPos.left,
              top: panelPos.top,
              transform: 'translateY(-100%)',
              width: Math.min(420, window.innerWidth-16),
              background: t.card,
              border: `1px solid ${t.border}`,
              borderRadius: 16,
              padding: '12px 14px',
              boxShadow: '0 8px 32px rgba(0,0,0,.28)',
              pointerEvents: 'all',      // only the card captures events
              userSelect: 'none',         // panel text is NEVER selectable
              WebkitUserSelect: 'none',
            }}
            // ↓ THE CRITICAL FIX: prevents the browser from collapsing/moving the
            //   text selection when the user taps a panel button on Android/iOS.
            onPointerDown={e => { e.preventDefault(); e.stopPropagation() }}
          >
            {/* Selected text preview */}
            <div style={{fontSize:12,color:t.muted,marginBottom:10,borderLeft:`3px solid ${t.accent}`,paddingLeft:8,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {selPanel.text.slice(0,60)}{selPanel.text.length>60?'…':''}
            </div>
            <button
              onPointerDown={e=>{e.preventDefault();e.stopPropagation()}}
              onClick={closeSelPanel}
              style={{position:'absolute',top:8,right:10,background:'none',border:'none',color:t.muted,fontSize:20,cursor:'pointer',lineHeight:1,padding:0}}>×</button>

            {/* Default: 3 action buttons */}
            {!selMode && (
              <div style={{display:'flex',gap:8}}>
                {[
                  ['📝 加入笔记', t.accent, '#fff', () => { addNote(selPanel.text,'',selPanel.text); closeSelPanel() }],
                  ['💭 想法',     t.card,   t.text, () => { setSelMode('thought'); setSelInput('') }],
                  ['🤖 问AI',     t.card,   t.text, () => { setSelMode('askai'); setSelInput(''); setSelAiReply('') }],
                ].map(([label,bg,color,fn]) => (
                  <button key={label}
                    onPointerDown={e=>{e.preventDefault();e.stopPropagation()}}
                    onClick={fn}
                    style={{flex:1,padding:'9px 4px',background:bg,border:`1px solid ${bg===t.card?t.border:'transparent'}`,borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',color}}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Thought input */}
            {selMode==='thought' && (
              <div>
                <textarea value={selInput} onChange={e=>setSelInput(e.target.value)}
                  placeholder="写下你的想法…" autoFocus
                  // textarea itself must remain selectable/editable
                  style={{width:'100%',height:80,padding:'8px',border:`1px solid ${t.border}`,borderRadius:8,fontSize:13,fontFamily:'inherit',background:t.bg,color:t.text,resize:'none',boxSizing:'border-box',outline:'none',display:'block',userSelect:'text',WebkitUserSelect:'text'}}
                />
                <div style={{display:'flex',gap:8,marginTop:8}}>
                  <button onPointerDown={e=>{e.preventDefault()}} onClick={()=>setSelMode('')}
                    style={{flex:1,padding:'8px',background:'none',border:`1px solid ${t.border}`,borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit',color:t.text}}>取消</button>
                  <button onPointerDown={e=>{e.preventDefault()}} onClick={()=>{ addNote(selPanel.text,selInput,selPanel.text); closeSelPanel() }}
                    style={{flex:2,padding:'8px',background:t.accent,color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>保存想法</button>
                </div>
              </div>
            )}

            {/* Ask AI — question input */}
            {selMode==='askai' && !selAiReply && (
              <div>
                <textarea value={selInput} onChange={e=>setSelInput(e.target.value)}
                  placeholder="对这段文字有什么问题？" autoFocus
                  style={{width:'100%',height:70,padding:'8px',border:`1px solid ${t.border}`,borderRadius:8,fontSize:13,fontFamily:'inherit',background:t.bg,color:t.text,resize:'none',boxSizing:'border-box',outline:'none',display:'block',userSelect:'text',WebkitUserSelect:'text'}}
                />
                <div style={{display:'flex',gap:8,marginTop:8}}>
                  <button onPointerDown={e=>e.preventDefault()} onClick={()=>setSelMode('')}
                    style={{flex:1,padding:'8px',background:'none',border:`1px solid ${t.border}`,borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit',color:t.text}}>取消</button>
                  <button
                    disabled={!selInput.trim()||selAiLoading}
                    onPointerDown={e=>e.preventDefault()}
                    onClick={async()=>{
                      setSelAiLoading(true)
                      try {
                        const r = await streamAI(curApiKey, '你是阅读助手，简洁回答书中内容相关问题。', `书中文字：\n「${selPanel.text}」\n\n问题：${selInput}`, null, settings.provider, settings.model)
                        setSelAiReply(r)
                      } catch(e) { setSelAiReply('出错：'+(e?.message||e)) }
                      setSelAiLoading(false)
                    }}
                    style={{flex:2,padding:'8px',background:t.accent,color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:selAiLoading?'wait':'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6,opacity:(!selInput.trim()||selAiLoading)?.5:1}}>
                    {selAiLoading && <Spinner size={12} color='#fff'/>}
                    {selAiLoading ? '思考中…' : '发送'}
                  </button>
                </div>
              </div>
            )}

            {/* Ask AI — reply */}
            {selMode==='askai' && selAiReply && (
              <div>
                <div style={{background:t.hover,borderRadius:8,padding:'10px 12px',fontSize:13,lineHeight:1.8,color:t.text,maxHeight:180,overflowY:'auto',userSelect:'text',WebkitUserSelect:'text'}}>
                  {selAiReply}
                </div>
                <div style={{display:'flex',gap:8,marginTop:8}}>
                  <button onPointerDown={e=>e.preventDefault()} onClick={()=>{setSelAiReply('');setSelInput('')}}
                    style={{flex:1,padding:'8px',background:'none',border:`1px solid ${t.border}`,borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit',color:t.text}}>重问</button>
                  <button onPointerDown={e=>e.preventDefault()} onClick={()=>{ addNote(selPanel.text,`问：${selInput}\nAI：${selAiReply}`,selPanel.text); closeSelPanel() }}
                    style={{flex:1,padding:'8px',background:'none',border:`1px solid ${t.accent}`,borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit',color:t.accent}}>存笔记</button>
                  <button onPointerDown={e=>e.preventDefault()} onClick={closeSelPanel}
                    style={{flex:1,padding:'8px',background:'none',border:`1px solid ${t.border}`,borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit',color:t.text}}>关闭</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ STYLE MODAL ══ */}
      {showStyleModal && (
        <Overlay onClick={()=>setShowStyleModal(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:t.bg,borderRadius:16,padding:'24px',width:'90vw',maxWidth:580,maxHeight:'85vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
            <div style={{fontSize:17,fontWeight:700,marginBottom:18,color:t.text}}>选择改写风格</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:18}}>
              {STYLES.map(st => (
                <div key={st.id} onClick={()=>setPendingStyleId(st.id)}
                  style={{border:`2px solid ${pendingStyleId===st.id?t.accent:t.border}`,borderRadius:12,padding:'12px 14px',cursor:'pointer',background:pendingStyleId===st.id?t.accent+'12':t.card,position:'relative',transition:'all .15s'}}>
                  <div style={{fontWeight:700,fontSize:14,color:pendingStyleId===st.id?t.accent:t.text,marginBottom:3}}>{st.name}</div>
                  <div style={{fontSize:12,color:t.muted,marginBottom:8}}>{st.desc}</div>
                  {pendingStyleId===st.id && <div style={{width:16,height:16,borderRadius:'50%',background:t.accent,position:'absolute',top:10,right:10,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:10}}>✓</div>}
                  <div style={{fontSize:12,lineHeight:1.8,color:t.text,maxHeight:120,overflow:'hidden'}}>
                    {styleSamples[st.id] || <Spinner size={14} color={t.muted}/>}
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

      {/* ══ THOUGHT MODAL ══ */}
      {thoughtModal && (
        <Overlay onClick={()=>setThoughtModal(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:t.bg,borderRadius:16,padding:'24px',width:'88vw',maxWidth:420,boxShadow:'0 20px 60px rgba(0,0,0,.25)'}}>
            <div style={{fontSize:16,fontWeight:700,color:t.text,marginBottom:12}}>💭 我的想法</div>
            <textarea value={thoughtInput} onChange={e=>setThoughtInput(e.target.value)} placeholder="写下你的想法…"
              style={{width:'100%',height:120,padding:'10px',border:`1px solid ${t.border}`,borderRadius:8,fontSize:14,fontFamily:'inherit',background:t.card,color:t.text,resize:'none',boxSizing:'border-box',outline:'none',lineHeight:1.7}}/>
            <div style={{display:'flex',gap:10,marginTop:12}}>
              <button onClick={()=>setThoughtModal(null)} style={{flex:1,padding:'10px',background:'none',border:`1px solid ${t.border}`,borderRadius:8,fontSize:14,cursor:'pointer',fontFamily:'inherit',color:t.text}}>取消</button>
              <button onClick={()=>{ updateThought(thoughtModal.noteId,thoughtInput); setThoughtModal(null) }}
                style={{flex:2,padding:'10px',background:t.accent,color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>保存</button>
            </div>
          </div>
        </Overlay>
      )}

      {/* ══ SETTINGS MODAL ══ */}
      {showSettings && (
        <Overlay onClick={()=>setShowSettings(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:t.bg,borderRadius:16,padding:'24px',width:'90vw',maxWidth:480,maxHeight:'88vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
            <div style={{fontSize:17,fontWeight:700,marginBottom:18,color:t.text}}>⚙ 设置</div>

            <SRow label="AI 模型">
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
                {PROVIDERS.map(p => (
                  <button key={p.id} onClick={()=>setSettings(s=>({...s,provider:p.id,model:p.models[0].id}))}
                    style={{padding:'5px 12px',borderRadius:20,fontSize:12,fontFamily:'inherit',cursor:'pointer',border:`2px solid ${settings.provider===p.id?t.accent:t.border}`,background:settings.provider===p.id?t.accent+'18':'transparent',color:settings.provider===p.id?t.accent:t.muted}}>
                    {p.name}
                  </button>
                ))}
              </div>
              <select value={settings.model} onChange={e=>setSettings(s=>({...s,model:e.target.value}))}
                style={{width:'100%',padding:'7px 10px',border:`1px solid ${t.border}`,borderRadius:8,fontSize:13,fontFamily:'inherit',background:t.card,color:t.text,outline:'none',cursor:'pointer'}}>
                {curProvider.models.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </SRow>

            <SRow label={`${curProvider.name} API Key`}>
              <input type="password" value={settings.apiKeys?.[settings.provider]||''}
                onChange={e=>setSettings(s=>({...s,apiKeys:{...(s.apiKeys||{}),[s.provider]:e.target.value}}))}
                placeholder={settings.provider==='claude'?'sk-ant-api03-...':settings.provider==='zhipu'?'智谱 API Key':settings.provider==='qwen'?'sk-…（阿里云）':'Gemini API Key'}
                style={{width:'100%',padding:'8px 11px',border:`1px solid ${t.border}`,borderRadius:8,fontSize:13,fontFamily:'inherit',background:t.card,color:t.text,outline:'none',boxSizing:'border-box'}}/>
            </SRow>

            {/* Reading preview */}
            <div style={{borderRadius:10,border:`1px solid ${t.border}`,padding:'12px 16px',marginBottom:16}}>
              <div style={{fontSize:10,color:t.muted,marginBottom:6,textTransform:'uppercase',letterSpacing:1}}>预览</div>
              <div style={{fontSize:settings.fontSize,lineHeight:settings.lineHeight,fontFamily:FONTS[settings.fontType],color:t.text}}>
                在远东某处，有一座城市，它的名字几乎被人遗忘。那里的街道弯弯曲曲，像是一首没有写完的诗。
              </div>
            </div>

            <SRow label="背景主题">
              <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
                {BG_THEMES.map(th=>(
                  <button key={th.id} onClick={()=>setSettings(s=>({...s,bgTheme:th.id}))}
                    style={{padding:'5px 12px',borderRadius:20,fontSize:12,fontFamily:'inherit',cursor:'pointer',border:`2px solid ${settings.bgTheme===th.id?t.accent:t.border}`,background:th.bg,color:th.text,boxShadow:settings.bgTheme===th.id?`0 0 0 2px ${t.accent}50`:'none'}}>
                    {th.label}
                  </button>
                ))}
              </div>
            </SRow>

            <SRow label={<>字号 <b style={{color:t.accent}}>{settings.fontSize}px</b></>}>
              <input type="range" min={14} max={26} value={settings.fontSize} onChange={e=>setSettings(s=>({...s,fontSize:+e.target.value}))} style={{width:'100%'}}/>
            </SRow>

            <SRow label={<>行距 <b style={{color:t.accent}}>{settings.lineHeight.toFixed(1)}</b></>}>
              <input type="range" min={1.4} max={2.4} step={0.1} value={settings.lineHeight} onChange={e=>setSettings(s=>({...s,lineHeight:+e.target.value}))} style={{width:'100%'}}/>
            </SRow>

            <SRow label="字体">
              <div style={{display:'flex',gap:6}}>
                {[['serif','衬线体（宋）'],['sans','黑体（无衬线）']].map(([id,label])=>(
                  <button key={id} onClick={()=>setSettings(s=>({...s,fontType:id}))}
                    style={{flex:1,padding:'7px 4px',fontSize:12,borderRadius:7,fontFamily:'inherit',cursor:'pointer',border:`1px solid ${settings.fontType===id?t.accent:t.border}`,background:settings.fontType===id?t.accent+'18':'transparent',color:settings.fontType===id?t.accent:t.muted}}>
                    {label}
                  </button>
                ))}
              </div>
            </SRow>

            {library.length > 0 && (
              <SRow label="书籍管理">
                <div style={{border:`1px solid ${t.border}`,borderRadius:8,overflow:'hidden',maxHeight:160,overflowY:'auto'}}>
                  {library.map(b=>(
                    <div key={b.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderBottom:`1px solid ${t.border}`}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:t.text}}>{b.title}</div>
                        <div style={{fontSize:11,color:t.muted}}>{b.author}</div>
                      </div>
                      <button onClick={()=>deleteBook(b.id)} style={{padding:'3px 9px',border:`1px solid ${t.border}`,borderRadius:5,background:'none',color:'#e05555',fontSize:12,cursor:'pointer'}}>删除</button>
                    </div>
                  ))}
                </div>
              </SRow>
            )}

            <div style={{display:'flex',justifyContent:'flex-end',marginTop:8,marginBottom:16}}>
              <Btn t={t} primary onClick={()=>setShowSettings(false)}>完成</Btn>
            </div>

            {/* About */}
            <div style={{borderTop:`1px solid ${t.border}`,paddingTop:18}}>
              <div style={{fontSize:13,fontWeight:600,color:t.text,marginBottom:12}}>✦ 关于奇阅魔方</div>
              <div style={{fontSize:12,color:t.muted,lineHeight:2}}>
                <p style={{marginBottom:10}}>人类文明最大的浪费，不是创造太少，是吸收太慢。好书好思想一直都在——挡住大多数人的不是内容本身，是内容和读者之间不兼容的「接口」。</p>
                <p style={{marginBottom:10}}>奇阅魔方的目标只有一个：用AI把难以阅读的内容，转化为你最容易吸收的方式。不是把书变短，而是帮你读进去。</p>
                <div style={{fontSize:11,borderTop:`1px solid ${t.border}`,paddingTop:10,marginTop:4}}>
                  <span style={{display:'block',marginBottom:3}}>作者只针对家里人的需要去做设计，欢迎大家根据自己的实际情况去优化。</span>
                  <span style={{display:'block',opacity:.7}}>✦ 作者：Simon Y · 源自《人类文明最大的浪费，不是创造太少，是吸收太慢》</span>
                  <div style={{marginTop:6,fontSize:12,color:t.muted,lineHeight:1.9}}>
                    <div>作者：Simon Y &nbsp;·&nbsp; MIT License 开源免费</div>
                    <div>GitHub：<a href="https://github.com/kaposon-netizen/qiyue" target="_blank" style={{color:t.accent,textDecoration:'none'}}>github.com/kaposon-netizen/qiyue</a></div>
                    <div style={{fontSize:11,color:t.muted,marginTop:4}}>有问题或建议，欢迎在 GitHub 提 Issue</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Overlay>
      )}

      {/* Toast */}
      {toast && (
        <div style={{position:'fixed',bottom:80,left:'50%',transform:'translateX(-50%)',background:'rgba(0,0,0,.75)',color:'#fff',padding:'8px 20px',borderRadius:20,fontSize:13,pointerEvents:'none',zIndex:999,whiteSpace:'nowrap'}}>
          {toast}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept=".epub" style={{display:'none'}}
        onChange={e=>{ const f=e.target.files?.[0]; if(f) handleFile(f); e.target.value='' }}/>

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes blink { 50% { opacity: 0 } }
        * { box-sizing: border-box }
        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: rgba(128,128,128,.3); border-radius: 2px }
      `}</style>
    </div>
  )
}

// ─── NoteItem ─────────────────────────────────────────────────────────────────
function NoteItem({ n, t, onDelete, onNavigate, onShare, onThought }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos,  setMenuPos]  = useState({ top:0, left:0 })
  const pressTimer = useRef(null)
  const startPos   = useRef({ x:0, y:0 })
  const moved      = useRef(false)

  const startPress = e => {
    const pt = e.touches ? e.touches[0] : e
    startPos.current = { x:pt.clientX, y:pt.clientY }; moved.current = false
    pressTimer.current = setTimeout(() => {
      if (!moved.current) {
        setMenuPos({ top: Math.min(pt.clientY+10,window.innerHeight-180), left: Math.min(pt.clientX,window.innerWidth-190) })
        setMenuOpen(true)
      }
    }, 500)
  }
  const onMove = e => {
    const pt = e.touches ? e.touches[0] : e
    if (Math.abs(pt.clientX-startPos.current.x)>8 || Math.abs(pt.clientY-startPos.current.y)>8) {
      moved.current = true; clearTimeout(pressTimer.current)
    }
  }
  const endPress = () => clearTimeout(pressTimer.current)

  return (
    <div style={{borderBottom:`1px solid ${t.border}`,padding:'14px 0',position:'relative',userSelect:'none',WebkitUserSelect:'none'}}>
      {menuOpen && <div onClick={()=>setMenuOpen(false)} style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,.3)'}}/>}
      {menuOpen && (
        <div style={{position:'fixed',top:menuPos.top,left:menuPos.left,zIndex:301,background:t.card,border:`1px solid ${t.border}`,borderRadius:12,overflow:'hidden',boxShadow:'0 8px 24px rgba(0,0,0,.22)',minWidth:170}}>
          {[
            ['💭', n.thought?'修改想法':'添加想法', ()=>{setMenuOpen(false);onThought()},  false],
            ['📤', '分享',                          ()=>{setMenuOpen(false);onShare()},   false],
            ['📖', '跳转到书中',                     ()=>{setMenuOpen(false);onNavigate()},false],
            ['🗑', '删除笔记',                       ()=>{setMenuOpen(false);onDelete()},  true ],
          ].map(([icon,label,fn,danger]) => (
            <button key={label} onClick={fn} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'13px 16px',border:'none',borderTop:`1px solid ${t.border}`,background:'none',color:danger?'#e05555':t.text,fontSize:14,cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
              {icon} {label}
            </button>
          ))}
        </div>
      )}
      <div onMouseDown={startPress} onMouseUp={endPress} onMouseLeave={endPress} onMouseMove={onMove}
        onTouchStart={startPress} onTouchEnd={endPress} onTouchCancel={endPress} onTouchMove={onMove}
        style={{cursor:'pointer'}}>
        <div style={{fontSize:11,color:t.muted,marginBottom:6,display:'flex',gap:8,flexWrap:'wrap'}}>
          <span>{n.date}</span><span>·</span><span>{n.book||'未知书籍'}</span>
          {n.chapter && <><span>·</span><span style={{maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{n.chapter}</span></>}
          <span>·</span><span>{n.mode==='original'?'原文':'改写版'}</span>
        </div>
        <div style={{fontSize:14,lineHeight:1.8,color:t.text}}>{n.text}</div>
        {n.thought && (
          <div style={{marginTop:8,fontSize:13,color:t.accent,background:t.accent+'15',borderRadius:8,padding:'6px 10px',lineHeight:1.7,fontStyle:'italic'}}>
            💭 {n.thought}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Welcome screen ───────────────────────────────────────────────────────────
function Welcome({ t, onUpload }) {
  const w = useWidth()
  const m = w < 768
  return (
    <div style={{maxWidth:460,margin:m?'40px auto':'70px auto',padding:m?'20px':'0',textAlign:'center'}}>
      <div style={{width:m?56:64,height:m?56:64,borderRadius:16,background:t.accent,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:m?26:30,margin:'0 auto 20px'}}>✦</div>
      <div style={{fontSize:m?20:23,fontWeight:700,marginBottom:10,color:t.text}}>奇阅魔方</div>
      <div style={{fontSize:m?14:15,color:t.muted,lineHeight:1.8,marginBottom:28}}>
        把难以阅读的经典<br/>转化成你最容易吸收的方式
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center',marginBottom:28}}>
        {['古文现代化','外文名著','4种风格','本地缓存'].map(f=>(
          <span key={f} style={{padding:'5px 13px',border:`1px solid ${t.border}`,borderRadius:20,fontSize:12,color:t.muted}}>{f}</span>
        ))}
      </div>
      <button onClick={onUpload} style={{width:m?'100%':'auto',padding:'13px 32px',background:t.accent,color:'#fff',border:'none',borderRadius:12,fontSize:16,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
        上传EPUB开始
      </button>
      <div style={{marginTop:12,fontSize:12,color:t.muted}}>或拖拽文件到此处</div>
    </div>
  )
}
