import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { TextToSpeech } from '@capacitor-community/text-to-speech'

// ─── Themes · 中国传统色 ───────────────────────────────────────────────────────
// 来源：chinese-color-theme-tool.jsx，6套传统色 + 夜砚暗色模式
const BG_THEMES = [
  // 凝脂·白露 — 凝脂#F5F2E9 玉色#EAE2D1 黄润#DFD6B8 缣缃#D5C896
  // 宣纸质感，最适合长时间阅读
  { id:'dew-white',    label:'凝脂·白露', bg:'#faf7f0', sidebar:'#ede5d0', text:'#2a2418', muted:'#9a8e78', accent:'#8a7840', border:'#ddd0b0', card:'#fffcf5', hover:'#e8dfc8' },
  // 窃蓝·立秋 — 窃蓝#88ABDA 监德#6F94CD 苍苍#5976BA 群青#2E45A7
  // 静谧清雅，护眼蓝调
  { id:'autumn-blue',  label:'窃蓝·立秋', bg:'#f0f5ff', sidebar:'#dce9f8', text:'#1a2848', muted:'#6a88b8', accent:'#5976ba', border:'#bcd4ee', card:'#f8fcff', hover:'#d4e5f5' },
  // 退红·处暑 — 退红#F0CFE3 樱花#E4B8D5 丁香#CE93BF 木槿#BA79B1
  // 柔和温润，亲和雅致
  { id:'heat-pink',    label:'退红·处暑', bg:'#faf0f8', sidebar:'#f0ddf0', text:'#2a0828', muted:'#9a6898', accent:'#a058a0', border:'#dcc8e0', card:'#fefaff', hover:'#eddde8' },
  // 青粲·立夏 — 青粲#C3D94E 翠缥#B7D332 人籁#9EBC19 水龙吟#84A729
  // 生机盎然，清新自然
  { id:'summer-green', label:'青粲·立夏', bg:'#f4f9ea', sidebar:'#e2f0c8', text:'#182810', muted:'#6a8848', accent:'#7a9610', border:'#c4de88', card:'#f8fbf0', hover:'#d4e8a8' },
  // 银朱·霜降 — 银朱#D12920 胭脂虫#AB1D22 朱樱#8F1D22 爵头#631216
  // 经典朱红，故宫宫墙
  { id:'frost-red',    label:'银朱·霜降', bg:'#fff5f5', sidebar:'#ffe0e0', text:'#3a0a0a', muted:'#a05050', accent:'#c42020', border:'#f0c0b8', card:'#fff8f8', hover:'#ffe0e0' },
  // 夜砚 — 深墨夜间模式，accent 用琥珀暖金
  { id:'night',        label:'夜砚',       bg:'#141418', sidebar:'#1c1c22', text:'#e8e0d4', muted:'#5a5560', accent:'#d4956a', border:'#2a2a32', card:'#1e1e26', hover:'#242430' },
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
  lora:      "'Lora', 'Noto Serif SC', Georgia, serif",           // 经典衬线，英文最美
  notoserif: "'Noto Serif SC', 'Source Han Serif SC', serif",     // 思源宋体，中文最佳
  merriweather: "'Merriweather', 'Noto Serif SC', Georgia, serif", // 厚重衬线，阅读舒适
  inter:     "'Inter', 'PingFang SC', 'Noto Sans SC', sans-serif", // 现代无衬线
  notosans:  "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif", // 思源黑体
}

const FONT_OPTIONS = [
  { id:'lora',         label:'Lora',         sub:'经典衬线',    sample:'The quick fox' },
  { id:'notoserif',    label:'思源宋体',      sub:'中文最佳',    sample:'床前明月光' },
  { id:'merriweather', label:'Merriweather',  sub:'厚重舒适',    sample:'The quick fox' },
  { id:'inter',        label:'Inter',         sub:'现代无衬线',  sample:'The quick fox' },
  { id:'notosans',     label:'思源黑体',      sub:'简洁清晰',    sample:'床前明月光' },
]
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
const RW_STATE_KEY = 'qiyue_rw_state'  // persists viewMode + styleId per book+chapter

const DEFAULT_SETTINGS = {
  bgTheme:'dew-white', fontSize:20, lineHeight:1.95, fontType:'lora',
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
let _dbPromise = null  // Promise cache: prevents concurrent indexedDB.open() calls
async function getDB() {
  if (_dbPromise) return _dbPromise
  _dbPromise = new Promise((res, rej) => {
    const r = indexedDB.open('qiyue_v2', 2)
    r.onupgradeneeded = e => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('rw'))    db.createObjectStore('rw',    { keyPath:'k' })
      if (!db.objectStoreNames.contains('books')) db.createObjectStore('books', { keyPath:'id' })
    }
    r.onsuccess = e => {
      const db = e.target.result
      db.onclose = () => { _dbPromise = null }  // invalidate on unexpected close
      db.onerror = () => { _dbPromise = null }
      res(db)
    }
    r.onerror = e => { _dbPromise = null; rej(e.target.error) }
    r.onblocked = () => { _dbPromise = null; rej(new Error('IndexedDB blocked')) }
  })
  return _dbPromise
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
    const hasMedia = /<img|<svg|<image/i.test(html)
    if (text.length < 20 && !hasMedia) continue
    chapters.push({ title: extractTitle(html) || `第${chapters.length+1}章`, text })
  }
  if (!chapters.length) throw new Error('未能提取章节')
  // Use title+author+chapterCount+firstChapterTextHash for stronger ID (reduces collision probability)
  const contentFingerprint = title + '|' + author + '|' + chapters.length + '|' + (chapters[0]?.text?.slice(0,200)||'')
  return { id: hashStr(contentFingerprint), title, author, chapters, addedAt: Date.now() }
}
function htmlToText(html) {
  html = html.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'')
  // Headings → newline + text + newline
  html = html.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_,c) => '\n' + c + '\n')
  // Block elements: close tag → paragraph separator §§
  html = html.replace(/<\/(?:p|div|li|tr|blockquote|section|article)[^>]*>/gi, '§§')
  // <br> → space (it's inline, not a paragraph break)
  html = html.replace(/<br\s*\/?>/gi, ' ')
  html = html.replace(/<[^>]+>/g, '')
  // Decode entities
  html = html.replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
             .replace(/&quot;/g,'"').replace(/&#(\d+);/g,(_,n)=>{ const code=+n; if(code<32&&code!==9&&code!==10)return ''; if(code>=0xD800&&code<=0xDFFF)return ''; if(code>0x10FFFF)return ''; return String.fromCodePoint(code) }).replace(/&[a-z]+;/g,' ')
  // Split, trim, filter empties
  const chunks = html.split('§§').map(s => s.replace(/[ \t]+/g,' ').trim()).filter(s => s.length > 0)

  // Merge fragment lines:
  // A chunk is a "fragment" if it:
  //   (a) doesn't end with sentence-ending punctuation, OR
  //   (b) ends with , ; : (definitely mid-sentence)
  // Merge it with the next chunk.
  const SENT_END = /[.!?。！？…"'\]—–]$/
  const FRAG_END  = /[,;:]$/   // comma/semicolon/colon → always merge
  const merged = []
  let buf = ''
  for (const chunk of chunks) {
    if (!buf) { buf = chunk; continue }
    const isFragment = FRAG_END.test(buf) || (!SENT_END.test(buf) && buf.length < 400)
    if (isFragment) {
      buf = buf + ' ' + chunk
    } else {
      merged.push(buf)
      buf = chunk
    }
  }
  if (buf) merged.push(buf)

  return merged.join('\n').replace(/\n{3,}/g,'\n\n').trim()
}
function extractTitle(html) { const m=html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i); return m?htmlToText(m[1]).trim().slice(0,60):null }

// ─── AI streaming ─────────────────────────────────────────────────────────────
async function streamAI(apiKey, system, user, onChunk, provider='claude', model) {
  if (!apiKey) throw new Error('请先在设置中填写 ' + (PROVIDERS.find(p=>p.id===provider)?.name||'') + ' API Key')
  const prov = PROVIDERS.find(p=>p.id===provider) || PROVIDERS[0]

  const checkResp = async resp => {
    if (!resp.ok) { let m=`HTTP ${resp.status}`; try{const e=await resp.json();m=e.error?.message||m}catch{}; throw new Error(m) }
    return resp.body.getReader()
  }

  const readSSE = async (reader, isOAI) => {
    const dec = new TextDecoder(); let buf='', full=''
    try {
      while(true) {
        const{done,value}=await reader.read(); if(done)break
        buf+=dec.decode(value,{stream:true}); const lines=buf.split('\n'); buf=lines.pop()||''
        for(const line of lines){
          if(!line.startsWith('data:'))continue; const d=line.substring(5).trim(); if(d==='[DONE]')continue
          try{
            const p=JSON.parse(d)
            const t=isOAI ? p.choices?.[0]?.delta?.content
                          : (p.type==='content_block_delta'?p.delta?.text:null)
            if(t){full+=t;onChunk?.(full)}
          }catch{}
        }
      }
    } finally { try{reader.releaseLock()}catch{} }  // always release — prevents stream lock
    return full
  }

  if (prov.directUrl) {
    const msgs=system?[{role:'system',content:system},{role:'user',content:user}]:[{role:'user',content:user}]
    const resp=await fetch(prov.directUrl,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${apiKey}`},body:JSON.stringify({model,messages:msgs,stream:true})})
    return readSSE(await checkResp(resp), true)
  }
  const resp=await fetch(prov.endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({apiKey,system,messages:[{role:'user',content:user}],model})})
  return readSSE(await checkResp(resp), false)
}

// ─── Tiny shared UI ───────────────────────────────────────────────────────────
// ─── SVG Icons (professional, consistent stroke-based) ───────────────────────
function Icon({ d, size=20, color='currentColor', strokeWidth=1.6, fill='none' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{flexShrink:0,display:'block'}}>
      {Array.isArray(d) ? d.map((p,i)=><path key={i} d={p}/>) : <path d={d}/>}
    </svg>
  )
}

// Icon paths
const IC = {
  menu:     'M3 12h18M3 6h18M3 18h18',
  close:    'M18 6L6 18M6 6l12 12',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 0v2m0-8V7m4.5 8.66.5.5M7 7.34l.5.5m9 .16-.5.5M7.5 16.16l.5-.5',
  bookmark: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
  bookmarkFill: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
  pen:      'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7m-1.5-9.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  ai:       ['M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h2a5 5 0 0 1 5 5v1a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-1a5 5 0 0 1 5-5h2V5.73A2 2 0 0 1 12 2z', 'M9 12v2m6-2v2m-6-2h6'],
  sparkle:  'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364-.707.707M6.343 17.657l-.707.707m12.728 0-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7z',
  wand:     'M15 4V2m0 14v-2M8 9H2m14 0h-2m-2.586-4.914L9.879 5.62M18.12 18.12l-1.535-1.536M8.464 18.12 6.929 16.586M18.12 5.88l-1.535 1.535M12 12h.01',
  thought:  'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  play:     'M5 3l14 9-14 9V3z',
  pause:    'M6 4h4v16H6zM14 4h4v16h-4z',
  stop:     'M6 6h12v12H6z',
  chevronL: 'M15 18l-6-6 6-6',
  chevronR: 'M9 18l6-6-6-6',
  note:     'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm0 0v6h6M8 13h8M8 17h5',
  pin:      'M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7zm0 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
}

function Ic({ name, size=20, color='currentColor', sw=1.6 }) {
  const d = IC[name]
  if (!d) return null
  const paths = Array.isArray(d) ? d : d.split('M').filter(Boolean).length > 1 && d.includes('z') 
    ? [d] : d.split(/(?=M)/).filter(Boolean)
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
      style={{flexShrink:0,display:'block'}}>
      {Array.isArray(d) 
        ? d.map((p,i)=><path key={i} d={p}/>)
        : <path d={d}/>}
    </svg>
  )
}

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
  const [showControls,   setShowControls]   = useState(false)  // immersive mode
  const [showAiSheet,    setShowAiSheet]    = useState(false)  // AI bottom sheet
  const [screen,         setScreen]         = useState('home') // 'home' | 'reading'
  const [homeTab,        setHomeTab]        = useState('library') // 'library'|'notes'

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
  const streamThrottle   = useRef(null)  // throttle streaming UI updates to ~100ms
  const toastTimer       = useRef(null)  // managed toast auto-dismiss
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
  // During rewriting, displayText stays as the ORIGINAL text for TTS/wordcount purposes.
  // The streaming output is shown separately via streamText.
  const displayText  = viewMode==='rewritten' && cachedRW ? cachedRW : (chapter?.text||'')
  const wordCount    = displayText.replace(/\s/g,'').length
  const readTime     = Math.max(1, Math.ceil(wordCount/400))
  const totalCh      = book?.chapters.length || 0

  // ── Persist settings ──────────────────────────────────────────────────────────
  useEffect(() => { lsSave(STORAGE_KEY, settings) }, [settings])

  // ── Close sidebar on orientation change ─────────────────────────────────────
  useEffect(() => {
    if (screen === 'reading') setSidebarOpen(false)
  }, [isMob])

  // ── Close sidebar when going home ────────────────────────────────────────────
  useEffect(() => {
    if (screen === 'home') setSidebarOpen(false)
  }, [screen])

  // ── Load library ──────────────────────────────────────────────────────────────
  useEffect(() => {
    dbAll('books').then(rows =>
      setLibrary(rows.map(r=>({id:r.id,title:r.title,author:r.author,addedAt:r.addedAt,totalCh:r.chapters?.length||0})).sort((a,b)=>b.addedAt-a.addedAt))
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

    const showPanelFromSelection = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        if (!selModeRef.current) setSelPanel(null)
        return
      }
      const text = sel.toString().trim()
      if (text.length < 2) { setSelPanel(null); return }
      const reader = readerRef.current
      if (!reader) { setSelPanel(null); return }
      const range = sel.getRangeAt(0)
      if (!reader.contains(range.commonAncestorContainer)) { setSelPanel(null); return }
      const rect = range.getBoundingClientRect()
      setSelPanel({ text, rectTop: rect.top, rectLeft: rect.left, rectWidth: rect.width, rectBottom: rect.bottom })
      setSelMode('')
      setSelInput('')
      setSelAiReply('')
    }

    const onSelChange = () => {
      clearTimeout(timer)
      if (selModeRef.current) return
      timer = setTimeout(showPanelFromSelection, 80)
    }

    // Android: touchend on reader fires AFTER selection handles settle
    const onTouchEnd = () => {
      clearTimeout(timer)
      if (selModeRef.current) return
      timer = setTimeout(showPanelFromSelection, 150)
    }

    // Suppress Android system context menu so OUR panel shows instead
    const onContextMenu = (e) => {
      const reader = readerRef.current
      if (reader && reader.contains(e.target)) e.preventDefault()
    }

    document.addEventListener('selectionchange', onSelChange)
    document.addEventListener('contextmenu', onContextMenu)
    const reader = readerRef.current
    if (reader) reader.addEventListener('touchend', onTouchEnd)

    return () => {
      document.removeEventListener('selectionchange', onSelChange)
      document.removeEventListener('contextmenu', onContextMenu)
      if (reader) reader.removeEventListener('touchend', onTouchEnd)
      clearTimeout(timer)
    }
  }, [])   // stable – no deps needed

  const closeSelPanel = useCallback(() => {
    window.getSelection()?.removeAllRanges()
    setSelPanel(null)
    setSelMode('')
    setSelInput('')
    setSelAiReply('')
  }, [])

  const showToast = useCallback((msg, duration=1800) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => { setToast(''); toastTimer.current = null }, duration)
  }, [])

  // ── Close selection panel when reader scrolls (prevents "ghost" panel) ────────
  useEffect(() => {
    const reader = readerRef.current
    if (!reader) return
    const onScroll = () => { if (selPanel) closeSelPanel() }
    reader.addEventListener('scroll', onScroll, { passive: true })
    return () => reader.removeEventListener('scroll', onScroll)
  }, [selPanel, closeSelPanel])

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
    showToast(thought ? '想法已保存 ✓' : '已加入笔记 ✓', 1800)
  }, [book, chIdx, chapter, viewMode, notes, saveNotes, showToast])

  const deleteNote    = useCallback(id => saveNotes(notes.filter(n=>n.id!==id)), [notes, saveNotes])
  const updateThought = useCallback((id, thought) => {
    saveNotes(notes.map(n => n.id===id ? {...n,thought} : n))
    showToast('想法已更新 ✓', 1800)
  }, [notes, saveNotes, showToast])

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
    const fallback = text.trim()
    if (chunks.length > 0) return { chunks, paraMap }
    // Guard: if text is all whitespace, return a dummy non-empty chunk so TTS doesn't speak ''
    return fallback ? { chunks:[fallback], paraMap:[0] } : { chunks:['　'], paraMap:[0] }
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
    if (typeof paraIdx !== 'number' || !Number.isFinite(paraIdx)) return
    const target = el.querySelector(`[data-para="${Math.floor(paraIdx)}"]`)
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
    if (!displayText?.trim()) { showToast('没有可朗读的内容', 2000); return }
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

  // Guard against double-tap race: if a TTS state-change is already in flight, ignore
  const ttsBusy = useRef(false)
  const ttsToggle = useCallback(async () => {
    if (ttsBusy.current) return
    ttsBusy.current = true
    try {
      if (ttsPlaying)      await ttsPause()
      else if (ttsPaused)  await ttsResume()
      else                 await ttsSpeak()
    } finally {
      ttsBusy.current = false
    }
  }, [ttsPlaying, ttsPaused, ttsPause, ttsResume, ttsSpeak])

  // ── Immersive tap handler ─────────────────────────────────────────────────────
  const handleReaderTap = useCallback((e) => {
    if (screen !== 'reading') return
    const sel = window.getSelection()
    if (sel && !sel.isCollapsed) return
    if (e.target.closest('button,a,mark,select')) return
    if (!book) return
    const x = e.clientX, w = window.innerWidth
    if (x < w * 0.25) {
      if (chIdx > 0) goChapter(chIdx - 1)
    } else if (x > w * 0.75) {
      if (chIdx < totalCh - 1) goChapter(chIdx + 1)
    } else {
      setShowControls(p => !p)
    }
  }, [screen, book, chIdx, totalCh])

  // ── Book management ───────────────────────────────────────────────────────────
  // Load all cached rewrites for a chapter from IndexedDB
  const cacheLoadToken = useRef(0)  // increment to cancel stale IDB reads

  const loadChapterCache = useCallback(async (bookId, idx) => {
    const token = ++cacheLoadToken.current  // snapshot current token
    const loaded = {}
    for (const s of STYLES) {
      if (cacheLoadToken.current !== token) return {}  // cancelled — newer load started
      const row = await dbGet('rw', `${bookId}_${idx}_${s.id}`)
      if (row?.text) {
        if (!loaded[idx]) loaded[idx] = {}
        loaded[idx][s.id] = row.text
      }
    }
    if (cacheLoadToken.current !== token) return {}  // cancelled before write
    if (Object.keys(loaded).length > 0) setCache(p => ({...p, ...loaded}))
    return loaded
  }, [])

  const loadBook = useCallback(async meta => {
    let b = meta.chapters ? meta : await dbGet('books', meta.id)
    if (!b) { alert('书籍数据丢失，请重新上传'); return }

    const saved   = JSON.parse(localStorage.getItem(READ_POS_KEY)||'{}')
    const rawCh = saved.bookId === b.id ? saved.chIdx : 0
    const savedCh = (Number.isInteger(rawCh) && rawCh >= 0 && rawCh < (b.chapters?.length||1)) ? rawCh : 0

    setBook(b); setChIdx(savedCh); setStreamText(''); setSidebarTab('chapters')
    setCache({})
    if (isMob) setSidebarOpen(false)

    // Load rewrite cache for this chapter
    const chCache = await loadChapterCache(b.id, savedCh)

    // Restore viewMode + style if a rewrite was active
    const rwState = JSON.parse(localStorage.getItem(RW_STATE_KEY)||'{}')
    const rwKey   = `${b.id}_${savedCh}`
    const si      = rwState[rwKey]?.styleId
    const vm      = rwState[rwKey]?.viewMode || 'original'
    const s       = si ? STYLES.find(st => st.id === si) : null
    if (s && chCache[savedCh]?.[si]) { setStyle(s); setViewMode(vm) }
    else { setStyle(null); setViewMode('original') }

    if (saved.bookId === b.id) {
      setTimeout(() => { pendingScrollRef.current = saved.scrollPct||0 }, 50)
    }
    setScreen('reading')
  }, [isMob, loadChapterCache])

  const handleFile = useCallback(async file => {
    if (!file?.name.match(/\.epub$/i)) { alert('请上传 .epub 文件'); return }
    if (file.size > 50 * 1024 * 1024) { showToast('文件过大，上限 50MB', 3000); return }
    showToast('解析中…', 30000)  // long timeout — will be cleared on success or error
    try {
      const meta = await parseEpub(file)
      await dbSet('books', meta)
      setLibrary(prev => [{id:meta.id,title:meta.title,author:meta.author,addedAt:meta.addedAt},...prev.filter(b=>b.id!==meta.id)])
      showToast('', 0)  // clear immediately on success
      await loadBook(meta)
    } catch(e) { showToast('解析失败: '+(e?.message||e), 3000) }
  }, [loadBook, showToast])

  const onDrop = useCallback(e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }, [handleFile])

  const deleteBook = useCallback(async bookId => {
    if (!confirm('确定删除这本书？')) return
    await dbDel('books', bookId)
    setLibrary(prev => prev.filter(b => b.id !== bookId))
    if (book?.id === bookId) { setBook(null); setChIdx(0); setViewMode('original'); setCache({}) }
  }, [book])

  const goChapter = useCallback(async idx => {
    // Guard: reject NaN, non-integer, and out-of-range chapter index
    const safeIdx = Math.floor(Number(idx))
    if (!Number.isFinite(safeIdx) || safeIdx < 0 || (book && safeIdx >= book.chapters.length)) return
    const idx_ = safeIdx  // use sanitized value
    setChIdx(idx_); setStreamText('')
    lsSave(READ_POS_KEY, { bookId: book?.id, chIdx: idx_, scrollPct: 0 })
    if (isMob) setSidebarOpen(false)

    if (!book) return

    const targetBookId = book.id  // snapshot before async gap

    // Load cached rewrites for this chapter
    const chCache = await loadChapterCache(book.id, idx_)

    // Guard: abort if user navigated away during IDB fetch
    const currentPos = JSON.parse(localStorage.getItem(READ_POS_KEY)||'{}')
    if (currentPos.chIdx !== idx_ || currentPos.bookId !== targetBookId) return

    // Restore rewrite state if one was saved for this chapter
    const rwState = JSON.parse(localStorage.getItem(RW_STATE_KEY)||'{}')
    const rwKey   = `${targetBookId}_${idx_}`
    const si      = rwState[rwKey]?.styleId
    const vm      = rwState[rwKey]?.viewMode || 'original'
    const s       = si ? STYLES.find(st => st.id === si) : null
    if (s && chCache[idx_]?.[si]) { setStyle(s); setViewMode(vm) }
    else { setStyle(null); setViewMode('original') }
  }, [book, isMob, loadChapterCache])

  // ── Rewrite ───────────────────────────────────────────────────────────────────
  const saveRwState = useCallback((bookId, idx, styleId, vm) => {
    try {
      const rwState = JSON.parse(localStorage.getItem(RW_STATE_KEY)||'{}')
      rwState[`${bookId}_${idx}`] = { styleId, viewMode: vm }
      localStorage.setItem(RW_STATE_KEY, JSON.stringify(rwState))
    } catch {}
  }, [])

  const doRewrite = useCallback(async styleId => {
    const s = STYLES.find(s=>s.id===styleId); if (!s) return
    setShowStyleModal(false); setStyle(s)
    if (!curApiKey) { setShowSettings(true); return }
    const text = chapter?.text || ''; if (!text) return
    // Snapshot mutable values before any await — prevents stale closure bugs
    const capturedChIdx  = chIdx
    const capturedBookId = book?.id
    setViewMode('rewriting'); setStreamText(''); setRewriteLoading(true)
    let finalText = '', chunks = []
    const CHUNK = 1800
    if (text.length > CHUNK) for (let i=0;i<text.length;i+=CHUNK) chunks.push(text.slice(i,Math.min(i+CHUNK,text.length)))
    try {
      if (!chunks.length) {
        await streamAI(curApiKey, s.prompt, `改写以下内容：\n\n${text}`, chunk => {
          finalText = chunk
          if (!streamThrottle.current) {
            const snap = finalText  // capture by value, not reference
            streamThrottle.current = setTimeout(() => {
              setStreamText(snap)
              streamThrottle.current = null
            }, 80)
          }
        }, settings.provider, settings.model)
      } else {
        for (let i=0; i<chunks.length; i++) {
          let co = ''
          await streamAI(curApiKey, s.prompt, `第${i+1}段（共${chunks.length}段）：\n\n${chunks[i]}`, chunk => {
            co = chunk
            if (!streamThrottle.current) {
              const snapFinal = finalText  // capture outer accumulator
              const snapCo = co            // capture current segment text
              streamThrottle.current = setTimeout(() => {
                setStreamText(snapFinal + snapCo)
                streamThrottle.current = null
              }, 80)
            }
          }, settings.provider, settings.model)
          finalText += co
        }
      }
      const key = `${capturedBookId}_${capturedChIdx}_${s.id}`
      await dbSet('rw', { k:key, text:finalText })
      // Clear any pending throttle and do a final update
      if (streamThrottle.current) { clearTimeout(streamThrottle.current); streamThrottle.current = null }
      setStreamText(finalText)
      setCache(p => ({...p, [capturedChIdx]: {...(p[capturedChIdx]||{}), [s.id]: finalText}}))
      // Only update viewMode if user is still on the same chapter we rewrote
      setChIdx(cur => {
        if (cur === capturedChIdx) {
          setViewMode('rewritten')
          if (capturedBookId) saveRwState(capturedBookId, capturedChIdx, s.id, 'rewritten')
        }
        return cur  // don't actually change chIdx
      })
    } catch(e) {
      if (streamThrottle.current) { clearTimeout(streamThrottle.current); streamThrottle.current = null }
      showToast('改写出错: '+(e?.message||e), 3000)
      // Only reset viewMode if still on same chapter
      setChIdx(cur => { if (cur === capturedChIdx) setViewMode('original'); return cur })
    }
    setRewriteLoading(false)
  }, [curApiKey, chapter, chIdx, book, settings, saveRwState])

  const confirmStyle = useCallback(() => { if (pendingStyleId) doRewrite(pendingStyleId) }, [pendingStyleId, doRewrite])

  useEffect(() => {
    if (!book || !style) return
    const key = `${book.id}_${chIdx}_${style.id}`
    dbGet('rw', key).then(row => { if (row?.text) setCache(p => ({...p,[chIdx]:{...(p[chIdx]||{}),[style.id]:row.text}})) })
  }, [chIdx, book, style])

  const loadSamplesToken = useRef(0)
  const loadSamples = useCallback(async () => {
    if (!curApiKey || !chapter?.text) return
    const token = ++loadSamplesToken.current  // cancel previous in-flight loadSamples
    setStyleSamples({})
    const sample = chapter.text.slice(0, 400)
    for (const st of STYLES) {
      if (loadSamplesToken.current !== token) return  // modal closed, abort
      try { await streamAI(curApiKey, st.prompt, `改写以下样本：\n\n${sample}`, chunk => {
        if (loadSamplesToken.current === token) setStyleSamples(p=>({...p,[st.id]:chunk}))
      }, settings.provider, settings.model) }
      catch {}
    }
  }, [curApiKey, chapter, settings])

  useEffect(() => { if (showStyleModal) loadSamples() }, [showStyleModal])

  // ── Render reader paragraphs with note highlights + TTS highlight ──────────────
  const ttsCurrentPara = (ttsPlaying || ttsPaused) && ttsRef.current?.paraMap && ttsProgress >= 0
    ? ttsRef.current.paraMap[ttsProgress] : -1

  // Pre-build paragraph→note lookup Map: O(N×L) once, O(1) per paragraph in renderParas
  const noteIndex = useMemo(() => {
    const map = new Map()
    for (const n of notes) {
      if (n.bookId !== book?.id || n.chIdx !== chIdx || !n.paraText) continue
      const pt = n.paraText.split('\n').map(l=>l.trim()).find(l=>l.length>1) || n.paraText.trim()
      if (pt.length > 1) map.set(pt, n)
    }
    return map
  }, [notes, book?.id, chIdx])

  const renderParas = () => {
    let paraIdx = -1
    return displayText.split('\n').map((para, i) => {
      const trimmed = para.trim()
      if (!trimmed) return null  // skip empty lines — spacing is handled by paragraph margin

      paraIdx++
      const curPara = paraIdx
      const isSpeaking = curPara === ttsCurrentPara

      // O(1) map lookup via noteIndex useMemo — was O(N×L) per paragraph
      let mn = null
      for (const [pt, note] of noteIndex) {
        if (trimmed.includes(pt)) { mn = note; break }
      }

      // Book-style: small bottom margin, first-line indent
      const baseStyle = {
        margin: '0 0 0.85em 0',
        textIndent: '1.8em',
        lineHeight: 'inherit',
        transition: 'background .25s',
        borderRadius: 4,
        ...(isSpeaking ? {
          background: t.accent + '20',
          textIndent: 0,
          padding: '2px 6px',
          margin: '0 -6px 0.85em',
        } : {}),
      }

      if (!mn) return <p key={i} data-para={curPara} style={baseStyle}>{trimmed}</p>

      // Bug 5 fix: support cross-paragraph selections by checking all lines of paraText
      const paraLines = mn.paraText.split('\n').map(l=>l.trim()).filter(l=>l.length>4)
      // Find which line of the note matches this paragraph
      const matchLine = paraLines.find(line => trimmed.includes(line)) ||
                        paraLines.find(line => line.includes(trimmed.slice(0, Math.min(trimmed.length, 30))))
      if (!matchLine) return <p key={i} data-para={curPara} style={baseStyle}>{trimmed}</p>

      const ht = matchLine, hi = trimmed.indexOf(ht)
      // If the whole paragraph is part of the selection, highlight the whole thing
      const isFullPara = paraLines.some(line => line === trimmed || line.includes(trimmed.slice(0,40)))
      if (isFullPara && hi === -1) {
        return (
          <p key={i} data-para={curPara} style={baseStyle}>
            <mark style={{background:t.accent+'44',borderRadius:3,padding:'1px 0',borderBottom:`2px solid ${t.accent}`,color:'inherit'}}>
              {trimmed}
              {mn.thought && <span style={{fontSize:10,color:t.accent,marginLeft:3,opacity:.8}}><Ic name='thought' size={9} color={t.accent}/></span>}
            </mark>
          </p>
        )
      }
      if (hi === -1) return <p key={i} data-para={curPara} style={baseStyle}>{trimmed}</p>
      return (
        <p key={i} data-para={curPara} style={baseStyle}>
          {hi > 0 && trimmed.slice(0, hi)}
          <mark style={{background:t.accent+'44',borderRadius:3,padding:'1px 0',borderBottom:`2px solid ${t.accent}`,color:'inherit'}}>
            {trimmed.slice(hi, hi+ht.length)}
            {mn.thought && <span style={{fontSize:10,color:t.accent,marginLeft:3,opacity:.8}}><Ic name='thought' size={9} color={t.accent}/></span>}
          </mark>
          {hi+ht.length < trimmed.length && trimmed.slice(hi+ht.length)}
        </p>
      )
    })
  }

  // ── Panel position: above selection, but BELOW if near top of screen ──────────
  const PANEL_H = 170
  const panelPos = selPanel ? (() => {
    const w     = Math.min(420, window.innerWidth - 16)
    const left  = Math.max(8, Math.min(selPanel.rectLeft + selPanel.rectWidth/2 - w/2, window.innerWidth - w - 8))
    const aboveY = selPanel.rectTop - 10  // top of panel if showing above (with translateY(-100%))
    const belowY = selPanel.rectBottom != null ? selPanel.rectBottom + 10 : selPanel.rectTop + 30
    const showBelow = aboveY - PANEL_H < 60  // not enough room above
    return { left, top: showBelow ? belowY : aboveY, showBelow, w }
  })() : null

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

      {/* Sidebar backdrop - reading mode only, all screen sizes */}
      {screen==='reading' && sidebarOpen && (
        <div onClick={()=>setSidebarOpen(false)}
          style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:99}}/>
      )}

      {/* ── Sidebar ── */}
      <aside style={{
        // In reading mode: sidebar is always a fixed overlay, never takes up layout space
        // In home mode: always hidden (width 0)
        width: 0,
        minWidth: 0,
        background: t.sidebar,
        display:'flex', flexDirection:'column', overflow:'hidden',
        flexShrink:0,
        // Show as fixed overlay only when open in reading mode
        ...(screen==='reading' && sidebarOpen ? {
          position:'fixed', left:0, top:0, bottom:0, zIndex:100,
          width: isMob ? '82vw' : '280px',
          boxShadow:'24px 0 48px rgba(0,0,0,0.22)',
          overflow:'hidden',
        } : {}),
      }}>
        {/* Logo */}
        <div style={{padding:'20px 18px 16px',flexShrink:0,display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:34,height:34,borderRadius:10,background:t.accent,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:16,fontWeight:700,flexShrink:0}}>✦</div>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:t.text,letterSpacing:.3}}>奇阅魔方</div>
            <div style={{fontSize:11,color:t.muted,marginTop:1}}>AI 阅读助手</div>
          </div>
        </div>

        {/* Upload */}
        <div style={{padding:'0 14px 16px',flexShrink:0}}>
          <button onClick={()=>fileInputRef.current?.click()} style={{
            width:'100%',padding:'11px',background:t.accent,color:'#fff',border:'none',
            borderRadius:12,fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:'inherit',
            letterSpacing:.3,
          }}>＋ 上传 EPUB</button>
        </div>

        {/* Book list */}
        {library.length > 0 && (
          <div style={{padding:'0 10px 12px',flexShrink:0,maxHeight:200,overflowY:'auto'}}>
            <div style={{fontSize:10,color:t.muted,marginBottom:8,textTransform:'uppercase',
              letterSpacing:1.5,paddingLeft:6}}>书库</div>
            {library.map(b => (
              <button key={b.id} onClick={()=>loadBook(b)} style={{
                width:'100%',textAlign:'left',padding:'9px 10px',marginBottom:2,
                background: book?.id===b.id ? t.accent+'18' : 'none',
                border:'none',borderRadius:10,cursor:'pointer',fontFamily:'inherit',
                display:'block',
              }}>
                <div style={{fontSize:13,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',
                  whiteSpace:'nowrap',color:book?.id===b.id?t.accent:t.text}}>{b.title}</div>
                <div style={{fontSize:11,color:t.muted,marginTop:1}}>{b.author}</div>
              </button>
            ))}
          </div>
        )}

        {/* Sidebar tabs */}
        {book && (
          <div style={{display:'flex',padding:'0 14px',gap:4,flexShrink:0,marginBottom:4}}>
            {[['chapters','目录'],['notes','笔记']].map(([id,label]) => (
              <button key={id} onClick={()=>setSidebarTab(id)} style={{
                flex:1,padding:'8px 4px',border:'none',
                background: sidebarTab===id ? t.accent+'18' : 'none',
                borderRadius:9,fontFamily:'inherit',
                color: sidebarTab===id ? t.accent : t.muted,
                fontSize:13,fontWeight:sidebarTab===id?700:400,cursor:'pointer',
                transition:'all .18s',
              }}>{label}{id==='notes'&&notes.length>0?` (${notes.length})`:''}</button>
            ))}
          </div>
        )}

        {/* Chapter list */}
        {book && sidebarTab==='chapters' && (
          <div style={{flex:1,overflowY:'auto',padding:'4px 10px 20px'}}>
            {book.chapters.map((ch,i) => (
              <button key={i} onClick={()=>goChapter(i)} style={{
                width:'100%',textAlign:'left',padding:'10px 10px',border:'none',fontFamily:'inherit',
                background: i===chIdx ? t.accent+'18' : 'none',
                color: i===chIdx ? t.accent : t.text,
                fontSize:13,cursor:'pointer',borderRadius:9,marginBottom:1,
                display:'block',transition:'background .15s',
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
                    navigator.share ? navigator.share({text:txt}) : navigator.clipboard?.writeText(txt).then(()=>{showToast('已复制', 1500)})
                  }}
                  onNavigate={async ()=>{
                    if (n.bookId && n.bookId!==book?.id) {
                      const bk = await dbGet('books', n.bookId)
                      if (bk) { await loadBook(bk); setTimeout(()=>{ setChIdx(n.chIdx||0); pendingScrollRef.current=n.scrollPct||0; setScrollTrigger(x=>x+1) },200) }
                      else { showToast('书籍已删除', 2000) }
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
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0,position:'relative'}}>

        {/* ── Floating Top bar (immersive: hidden until tap) ── */}
        <div style={{
          position:'absolute',top:0,left:0,right:0,zIndex:100,
          height:52,display:'flex',alignItems:'center',gap:6,padding:'0 10px',
          background:`${t.bg}EE`,
          backdropFilter:'blur(14px)',WebkitBackdropFilter:'blur(14px)',
          boxShadow: screen==='reading' ? 'none' : '0 1px 0 rgba(0,0,0,0.04)',
          opacity: (screen==='reading' && showControls) ? 1 : 0,
          pointerEvents: (screen==='reading' && showControls) ? 'all' : 'none',
          transition:'opacity .22s ease',
        }}>
          {/* Back / Menu toggle */}
          {screen==='reading' && (
            <button onClick={()=>{ setScreen('home'); setShowControls(false); setSidebarOpen(false) }} style={{
              width:40,height:40,display:'flex',alignItems:'center',justifyContent:'center',
              background:'none',border:'none',borderRadius:10,color:t.text,cursor:'pointer',flexShrink:0,
            }}>
              <Ic name='chevronL' size={22} color={t.text}/>
            </button>
          )}
          {screen==='home' && <div style={{width:40}}/>}

          {/* Chapter title - only in reading mode */}
          <div style={{flex:1,minWidth:0,textAlign:'center',fontSize:13,color:t.muted,
            overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {screen==='reading' ? (chapter?.title||'') : ''}
          </div>

          {/* Right: AI sheet + settings */}
          <div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
            {screen==='reading' && book && (
              <button onClick={()=>setShowAiSheet(true)} style={{
                height:34,padding:'0 14px',display:'flex',alignItems:'center',gap:5,
                background: (style||ttsPlaying||ttsPaused) ? t.accent+'20' : 'none',
                border:`1px solid ${(style||ttsPlaying||ttsPaused)?t.accent:t.border}`,
                borderRadius:17,color:(style||ttsPlaying||ttsPaused)?t.accent:t.muted,
                fontSize:13,cursor:'pointer',fontFamily:'inherit',
              }}>
                {ttsPlaying ? <><Spinner size={11} color={t.accent}/><span style={{fontSize:13}}>朗读中</span></> :
                 ttsPaused ? <><Ic name='pause' size={14} color={t.accent}/><span style={{fontSize:13}}>暂停</span></> :
                 style ? <><Ic name='wand' size={14} color={t.accent}/><span style={{fontSize:13}}>{style.name}</span></> : <><Ic name='wand' size={14} color={t.muted}/><span style={{fontSize:13}}>AI</span></>}
              </button>
            )}
            {screen==='reading' && <>
            <button onClick={()=>{ if(book){ setSidebarTab('notes'); setSidebarOpen(true); setShowControls(false) } }} style={{
              width:40,height:40,display:'flex',alignItems:'center',justifyContent:'center',
              background:'none',border:'none',borderRadius:10,color:t.muted,fontSize:16,cursor:'pointer',position:'relative',
            }}>
              <Ic name='bookmark' size={20} color={t.muted}/>
              {notes.length>0&&<span style={{position:'absolute',top:6,right:6,background:t.accent,color:'#fff',
                borderRadius:'50%',width:14,height:14,fontSize:8,display:'flex',alignItems:'center',
                justifyContent:'center',fontWeight:700}}>{notes.length}</span>}
            </button>
            <button onClick={()=>setShowSettings(true)} style={{
              width:40,height:40,display:'flex',alignItems:'center',justifyContent:'center',
              background:'none',border:'none',borderRadius:10,color:t.muted,cursor:'pointer',
            }}><Ic name='settings' size={20} color={t.muted}/></button>
            </>}
          </div>
        </div>

        {/* ── Reader ── */}
        <div
          ref={readerRef}
          onClick={handleReaderTap}
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
            userSelect:'text', WebkitUserSelect:'text',
          }}
        >
          {screen === 'home'
            ? <HomeScreen
                t={t} library={library} notes={notes} book={book}
                homeTab={homeTab} setHomeTab={setHomeTab}
                onLoadBook={loadBook} onUpload={()=>fileInputRef.current?.click()}
                onSettings={()=>setShowSettings(true)}
                onDeleteBook={deleteBook}
                readPos={JSON.parse(localStorage.getItem(READ_POS_KEY)||'{}')}
                chIdx={chIdx}
              />
            : (
              <div style={{maxWidth:660,margin:'0 auto',padding:isMob?'72px 28px 140px':'80px 10vw 140px'}}>
                {/* Chapter title */}
                <h1 style={{
                  fontSize:settings.fontSize+2,fontWeight:600,marginBottom:32,lineHeight:1.3,
                  fontFamily:FONTS[settings.fontType]||FONTS.lora,color:t.text,
                  paddingBottom:20,
                }}>
                  {chapter?.title}
                </h1>
                {/* Body text */}
                <div style={{
                  fontSize:settings.fontSize,lineHeight:settings.lineHeight,
                  fontFamily:FONTS[settings.fontType]||FONTS.lora,color:t.text,
                  wordBreak:'break-word',
                  textAlign:'justify',textJustify:'inter-ideograph',
                  WebkitFontSmoothing:'antialiased',
                }}>
                  {isRewriting
                    // During streaming: plain pre-wrap text, no DOM churn
                    ? <div style={{whiteSpace:'pre-wrap'}}>{streamText}</div>
                    : renderParas()
                  }
                  {isRewriting && <span style={{display:'inline-block',width:2,height:'1em',background:t.accent,marginLeft:2,verticalAlign:'text-bottom',animation:'blink .9s step-end infinite'}}/>}
                </div>
              </div>
            )
          }
        </div>

        {/* ── Tiny immersive hint: only in reading mode ── */}
        {screen==='reading' && book && !showControls && (
          <div style={{
            position:'absolute',bottom:0,left:0,right:0,
            paddingBottom:'calc(10px + env(safe-area-inset-bottom))',
            textAlign:'center',pointerEvents:'none',zIndex:10,
          }}>
            <span style={{fontSize:10,color:t.muted,opacity:0.45,
              fontFamily:FONTS.inter,letterSpacing:0.8}}>
              {chIdx+1} / {totalCh}
            </span>
          </div>
        )}

        {/* ── Floating Bottom bar (immersive: hidden until tap) ── */}
        {screen==='reading' && book && (
          <div style={{
            position:'absolute',bottom:0,left:0,right:0,zIndex:100,
            padding:'14px 24px',
            paddingBottom:`calc(14px + env(safe-area-inset-bottom))`,
            background:`${t.bg}EE`,
            backdropFilter:'blur(14px)',WebkitBackdropFilter:'blur(14px)',
            boxShadow:'0 -1px 0 rgba(0,0,0,0.05)',
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? 'all' : 'none',
            transition:'opacity .22s ease',
          }}>
            {/* Chapter progress slider */}
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <span style={{fontSize:11,color:t.muted,flexShrink:0}}>第{chIdx+1}章</span>
              <input type="range" min={0} max={Math.max(0,totalCh-1)} value={chIdx}
                onChange={e=>goChapter(Number(e.target.value))}
                style={{flex:1,accentColor:t.accent,cursor:'pointer',height:2}}/>
              <span style={{fontSize:11,color:t.muted,flexShrink:0}}>共{totalCh}章</span>
            </div>
            <div style={{textAlign:'center',fontSize:11,color:t.muted,marginTop:6,opacity:.7}}>
              {wordCount.toLocaleString()} 字 · 约 {readTime} 分钟 · 点击中间区域收起
            </div>
          </div>
        )}
      </div>

      {/* ══ AI BOTTOM SHEET ══════════════════════════════════════════════════════ */}
      {showAiSheet && (
        <div onClick={()=>setShowAiSheet(false)} style={{
          position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:300,
          display:'flex',alignItems:'flex-end',
        }}>
          <div onClick={e=>e.stopPropagation()} style={{
            width:'100%',
            background: t.id==='night' ? '#1e1e28' : t.bg,
            borderRadius:'22px 22px 0 0',
            padding:'16px 20px calc(28px + env(safe-area-inset-bottom))',
            boxShadow:'0 -2px 60px rgba(0,0,0,0.22)',
            maxHeight:'80vh',overflowY:'auto',
          }}>
            <div style={{width:32,height:3,background:t.muted+'50',borderRadius:2,margin:'0 auto 22px'}}/>

            {/* TTS */}
            <div style={{marginBottom:24}}>
              <div style={{fontSize:11,color:t.muted,letterSpacing:1.5,marginBottom:12,
                textTransform:'uppercase',fontFamily:FONTS.inter}}>朗读</div>
              <div style={{display:'flex',gap:10,alignItems:'center'}}>
                <button onClick={ttsToggle} style={{
                  height:50,flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:10,
                  background: t.id==='night' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                  border:'none',borderRadius:14,
                  fontSize:15,cursor:'pointer',fontFamily:'inherit',fontWeight:600,color:t.text,
                }}>
                  {ttsPlaying ? <Ic name='pause' size={18} color={t.accent}/> : <Ic name='play' size={18} color={t.accent}/>}
                  {ttsPlaying?'暂停朗读':ttsPaused?'继续朗读':'开始朗读'}
                </button>
                {(ttsPlaying||ttsPaused) && (
                  <button onClick={ttsStop} style={{
                    width:50,height:50,display:'flex',alignItems:'center',justifyContent:'center',
                    background: t.id==='night' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                    border:'none',borderRadius:14,color:t.muted,fontSize:15,cursor:'pointer',
                  }}><Ic name='stop' size={16} color={t.muted}/></button>
                )}
                <select value={ttsRate} onChange={e=>setTtsRate(+e.target.value)} style={{
                  height:50,padding:'0 12px',
                  background: t.id==='night' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                  border:'none',borderRadius:14,
                  color:t.text,fontSize:13,fontFamily:'inherit',cursor:'pointer',
                }}>
                  {[0.7,0.85,1.0,1.2,1.5].map(r=><option key={r} value={r}>{r}x</option>)}
                </select>
              </div>
            </div>

            {/* Rewrite */}
            <div style={{marginBottom:8}}>
              <div style={{fontSize:11,color:t.muted,letterSpacing:1.5,marginBottom:12,
                textTransform:'uppercase',fontFamily:FONTS.inter}}>AI 改写风格</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {STYLES.map(st => (
                  <button key={st.id}
                    onClick={()=>{ if(!curApiKey){setShowAiSheet(false);setShowSettings(true);return;} setStyle(st); doRewrite(st.id); setShowAiSheet(false) }}
                    style={{
                      height:64,padding:'0 16px',
                      display:'flex',flexDirection:'column',alignItems:'flex-start',justifyContent:'center',
                      background: style?.id===st.id ? t.accent : (t.id==='night'?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.04)'),
                      border:'none',borderRadius:16,cursor:'pointer',fontFamily:'inherit',
                      boxShadow: style?.id===st.id ? `0 4px 14px ${t.accent}40` : 'none',
                      transition:'all .2s ease',
                    }}>
                    <div style={{fontSize:14,fontWeight:600,marginBottom:3,
                      color:style?.id===st.id?'#fff':t.text}}>{st.name}</div>
                    <div style={{fontSize:11,
                      color:style?.id===st.id?'rgba(255,255,255,0.75)':t.muted}}>{st.desc}</div>
                  </button>
                ))}
              </div>
              {cachedRW && (
                <div style={{
                  display:'flex',marginTop:12,
                  background: t.id==='night' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  borderRadius:14,overflow:'hidden',padding:3,gap:3,
                }}>
                  {['original','rewritten'].map(m=>(
                    <button key={m} onClick={()=>{setViewMode(m);setStreamText('');setShowAiSheet(false);if(book?.id&&style)saveRwState(book.id,chIdx,style.id,m)}} style={{
                      flex:1,height:38,border:'none',
                      background:viewMode===m ? (t.id==='night'?'rgba(255,255,255,0.12)':t.card) : 'none',
                      borderRadius:11,color:viewMode===m?t.text:t.muted,
                      fontSize:13,cursor:'pointer',fontFamily:'inherit',fontWeight:viewMode===m?600:400,
                      boxShadow:viewMode===m?'0 1px 4px rgba(0,0,0,0.1)':'none',
                      transition:'all .18s',
                    }}>{m==='original'?'原文':'改写版'}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
              transform: panelPos.showBelow ? 'none' : 'translateY(-100%) translateY(-10px)',
              width: panelPos.w,
              background: t.id==='night' ? '#2a2a38' : 'rgba(30,28,36,0.97)',
              borderRadius: 14,
              padding: '10px 12px',
              boxShadow: '0 4px 24px rgba(0,0,0,.38)',
              pointerEvents: 'all',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
            onPointerDown={e => { e.preventDefault(); e.stopPropagation() }}
          >
            {/* Selected text preview */}
            <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',marginBottom:9,paddingBottom:8,borderBottom:'1px solid rgba(255,255,255,0.12)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontFamily:FONTS.lora}}>
              {selPanel.text.slice(0,72)}{selPanel.text.length>72?'…':''}
            </div>
            <button
              onPointerDown={e=>{e.preventDefault();e.stopPropagation()}}
              onClick={closeSelPanel}
              style={{position:'absolute',top:8,right:10,background:'none',border:'none',color:'rgba(255,255,255,0.4)',fontSize:18,cursor:'pointer',lineHeight:1,padding:'2px 4px'}}>×</button>

            {/* Default: 3 action buttons */}
            {!selMode && (
              <div style={{display:'flex',gap:6}}>
                {[
                  [null, '笔记', t.accent, '#fff', () => { addNote(selPanel.text,'',selPanel.text); closeSelPanel() }, 'pin'],
                  [null, '想法', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.9)', () => { setSelMode('thought'); setSelInput('') }, 'thought'],
                  [null, '问AI', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.9)', () => { setSelMode('askai'); setSelInput(''); setSelAiReply('') }, 'sparkle'],
                ].map(([_,label,bg,color,fn,icon]) => (
                  <button key={label}
                    onPointerDown={e=>{e.preventDefault();e.stopPropagation()}}
                    onClick={fn}
                    style={{flex:1,padding:'10px 4px',background:bg,border:'none',borderRadius:10,fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',color,display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
                    {icon && <Ic name={icon} size={17} color={color}/>}
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
                  style={{width:'100%',height:80,padding:'10px 12px',border:'none',borderRadius:10,fontSize:13,fontFamily:'inherit',background:'rgba(255,255,255,0.12)',color:'#fff',resize:'none',boxSizing:'border-box',outline:'none',display:'block',userSelect:'text',WebkitUserSelect:'text'}}
                />
                <div style={{display:'flex',gap:8,marginTop:8}}>
                  <button onPointerDown={e=>{e.preventDefault()}} onClick={()=>setSelMode('')}
                    style={{flex:1,padding:'8px',background:'rgba(255,255,255,0.08)',border:'none',borderRadius:10,fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'rgba(255,255,255,0.6)'}}>取消</button>
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
                  style={{width:'100%',height:70,padding:'10px 12px',border:'none',borderRadius:10,fontSize:13,fontFamily:'inherit',background:'rgba(255,255,255,0.12)',color:'#fff',resize:'none',boxSizing:'border-box',outline:'none',display:'block',userSelect:'text',WebkitUserSelect:'text'}}
                />
                <div style={{display:'flex',gap:8,marginTop:8}}>
                  <button onPointerDown={e=>e.preventDefault()} onClick={()=>setSelMode('')}
                    style={{flex:1,padding:'8px',background:'rgba(255,255,255,0.08)',border:'none',borderRadius:10,fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'rgba(255,255,255,0.6)'}}>取消</button>
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
                <div style={{background:'rgba(255,255,255,0.1)',borderRadius:10,padding:'10px 12px',fontSize:13,lineHeight:1.8,color:'rgba(255,255,255,0.9)',maxHeight:180,overflowY:'auto',userSelect:'text',WebkitUserSelect:'text'}}>
                  {selAiReply}
                </div>
                <div style={{display:'flex',gap:8,marginTop:8}}>
                  <button onPointerDown={e=>e.preventDefault()} onClick={()=>{setSelAiReply('');setSelInput('')}}
                    style={{flex:1,padding:'8px',background:'rgba(255,255,255,0.08)',border:'none',borderRadius:10,fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'rgba(255,255,255,0.6)'}}>重问</button>
                  <button onPointerDown={e=>e.preventDefault()} onClick={()=>{ addNote(selPanel.text,`问：${selInput}\nAI：${selAiReply}`,selPanel.text); closeSelPanel() }}
                    style={{flex:1,padding:'8px',background:t.accent+'30',border:'none',borderRadius:10,fontSize:13,cursor:'pointer',fontFamily:'inherit',color:t.accent,fontWeight:600}}>存笔记</button>
                  <button onPointerDown={e=>e.preventDefault()} onClick={closeSelPanel}
                    style={{flex:1,padding:'8px',background:'rgba(255,255,255,0.08)',border:'none',borderRadius:10,fontSize:13,cursor:'pointer',fontFamily:'inherit',color:'rgba(255,255,255,0.6)'}}>关闭</button>
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
            <div style={{fontSize:16,fontWeight:700,color:t.text,marginBottom:12,display:'flex',alignItems:'center',gap:8}}><Ic name='thought' size={18} color={t.accent}/>我的想法</div>
            <textarea value={thoughtInput} onChange={e=>setThoughtInput(e.target.value)} placeholder="写下你的想法…"
              style={{width:'100%',height:120,padding:'12px 14px',border:'none',borderRadius:12,fontSize:14,fontFamily:'inherit',background:t.hover,color:t.text,resize:'none',boxSizing:'border-box',outline:'none',lineHeight:1.7}}/>
            <div style={{display:'flex',gap:10,marginTop:12}}>
              <button onClick={()=>setThoughtModal(null)} style={{flex:1,padding:'12px',background:t.hover,border:'none',borderRadius:12,fontSize:14,cursor:'pointer',fontFamily:'inherit',color:t.muted}}>取消</button>
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
            <div style={{fontSize:17,fontWeight:700,marginBottom:20,color:t.text,display:'flex',alignItems:'center',gap:8}}><Ic name='settings' size={20} color={t.accent}/>设置</div>

            <SRow label="AI 模型">
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
                {PROVIDERS.map(p => (
                  <button key={p.id} onClick={()=>setSettings(s=>({...s,provider:p.id,model:p.models[0].id}))}
                    style={{padding:'6px 14px',borderRadius:20,fontSize:12,fontFamily:'inherit',cursor:'pointer',border:'none',background:settings.provider===p.id?t.accent+'22':t.hover,color:settings.provider===p.id?t.accent:t.muted,transition:'all .18s'}}>
                    {p.name}
                  </button>
                ))}
              </div>
              <select value={settings.model} onChange={e=>setSettings(s=>({...s,model:e.target.value}))}
                style={{width:'100%',padding:'10px 12px',border:'none',borderRadius:11,fontSize:13,fontFamily:'inherit',background:t.hover,color:t.text,outline:'none',cursor:'pointer'}}>
                {curProvider.models.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </SRow>

            <SRow label={`${curProvider.name} API Key`}>
              <input type="password" value={settings.apiKeys?.[settings.provider]||''}
                onChange={e=>setSettings(s=>({...s,apiKeys:{...(s.apiKeys||{}),[s.provider]:e.target.value}}))}
                placeholder={settings.provider==='claude'?'sk-ant-api03-...':settings.provider==='zhipu'?'智谱 API Key':settings.provider==='qwen'?'sk-…（阿里云）':'Gemini API Key'}
                style={{width:'100%',padding:'11px 14px',border:'none',borderRadius:11,fontSize:13,fontFamily:'inherit',background:t.hover,color:t.text,outline:'none',boxSizing:'border-box'}}/>
            </SRow>

            {/* Reading preview */}
            <div style={{borderRadius:12,background:t.hover,padding:'14px 18px',marginBottom:16}}>
              <div style={{fontSize:10,color:t.muted,marginBottom:8,textTransform:'uppercase',letterSpacing:1}}>预览</div>
              <div style={{fontSize:settings.fontSize,lineHeight:settings.lineHeight,fontFamily:FONTS[settings.fontType]||FONTS.lora,color:t.text}}>
                在远东某处，有一座城市。The quick brown fox jumps over the lazy dog.
              </div>
            </div>

            <SRow label="背景主题">
              <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
                {BG_THEMES.map(th=>(
                  <button key={th.id} onClick={()=>setSettings(s=>({...s,bgTheme:th.id}))}
                    style={{padding:'7px 14px',borderRadius:20,fontSize:12,fontFamily:'inherit',cursor:'pointer',border:'none',background:th.bg,color:th.text,boxShadow:settings.bgTheme===th.id?`0 0 0 3px ${t.accent}` :'0 1px 3px rgba(0,0,0,0.12)',transition:'all .18s'}}>
                    {th.label}
                  </button>
                ))}
              </div>
            </SRow>

            <SRow label={<>字号 <b style={{color:t.accent}}>{settings.fontSize}px</b></>}>
              <input type="range" min={15} max={28} value={settings.fontSize} onChange={e=>setSettings(s=>({...s,fontSize:+e.target.value}))} style={{width:'100%'}}/>
            </SRow>

            <SRow label={<>行距 <b style={{color:t.accent}}>{settings.lineHeight.toFixed(1)}</b></>}>
              <input type="range" min={1.4} max={2.4} step={0.1} value={settings.lineHeight} onChange={e=>setSettings(s=>({...s,lineHeight:+e.target.value}))} style={{width:'100%'}}/>
            </SRow>

            <SRow label="字体">
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {FONT_OPTIONS.map(({id,label,sub,sample})=>(
                  <button key={id} onClick={()=>setSettings(s=>({...s,fontType:id}))}
                    style={{
                      padding:'12px 14px',borderRadius:12,fontFamily:'inherit',cursor:'pointer',border:'none',
                      background:settings.fontType===id?t.accent+'22':t.hover,
                      display:'flex',alignItems:'center',justifyContent:'space-between',
                      transition:'all .18s',
                    }}>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:2}}>
                      <span style={{fontSize:13,fontWeight:600,color:settings.fontType===id?t.accent:t.text,fontFamily:FONTS[id]}}>{label}</span>
                      <span style={{fontSize:10,color:t.muted}}>{sub}</span>
                    </div>
                    <span style={{fontSize:14,color:settings.fontType===id?t.accent:t.muted,fontFamily:FONTS[id],opacity:.8}}>{sample}</span>
                  </button>
                ))}
              </div>
            </SRow>

            {library.length > 0 && (
              <SRow label="书籍管理">
                <div style={{borderRadius:12,overflow:'hidden',maxHeight:160,overflowY:'auto',background:t.hover}}>
                  {library.map(b=>(
                    <div key={b.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',marginBottom:2}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:t.text}}>{b.title}</div>
                        <div style={{fontSize:11,color:t.muted}}>{b.author}</div>
                      </div>
                      <button onClick={()=>deleteBook(b.id)} style={{padding:'4px 10px',border:'none',borderRadius:8,background:'rgba(224,85,85,0.12)',color:'#e05555',fontSize:12,cursor:'pointer'}}>删除</button>
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
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Noto+Serif+SC:wght@300;400;500&family=Noto+Sans+SC:wght@300;400;500&family=Inter:wght@300;400;500;600&display=swap');
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes blink { 50% { opacity: 0 } }
        * { box-sizing: border-box }
        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: rgba(128,128,128,.3); border-radius: 2px }
        /* Better text rendering for reading */
        p { text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; }
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

  // Clear timer on unmount to prevent setState-after-unmount
  useEffect(() => () => clearTimeout(pressTimer.current), [])

  return (
    <div style={{borderBottom:`1px solid ${t.border}`,padding:'14px 0',position:'relative',userSelect:'none',WebkitUserSelect:'none'}}>
      {menuOpen && <div onClick={()=>setMenuOpen(false)} style={{position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,.3)'}}/>}
      {menuOpen && (
        <div style={{position:'fixed',top:menuPos.top,left:menuPos.left,zIndex:301,background:t.card,border:`1px solid ${t.border}`,borderRadius:12,overflow:'hidden',boxShadow:'0 8px 24px rgba(0,0,0,.22)',minWidth:170}}>
          {[
            ['✎', n.thought?'修改想法':'添加想法', ()=>{setMenuOpen(false);onThought()},  false],
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
            {n.thought}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Cover color palettes for books without covers ────────────────────────────
const COVER_PALETTES = [
  { bg:'linear-gradient(145deg,#dce4d1,#b8c8a0)', text:'#2c3520' },
  { bg:'linear-gradient(145deg,#e6d4d8,#c9acb4)', text:'#3a2028' },
  { bg:'linear-gradient(145deg,#d1d8e6,#aab8d1)', text:'#1e2b40' },
  { bg:'linear-gradient(145deg,#e8dfc8,#d0c4a0)', text:'#3a3020' },
  { bg:'linear-gradient(145deg,#d8d1e8,#b8acd0)', text:'#2a2040' },
  { bg:'linear-gradient(145deg,#cfe4e0,#a8ccc8)', text:'#1a3030' },
  { bg:'linear-gradient(145deg,#e4d8cc,#c8b0a0)', text:'#3a2818' },
  { bg:'linear-gradient(145deg,#d4e0d4,#b0c8b0)', text:'#1e3020' },
]
function coverPalette(id) {
  let h = 0; for (let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))|0
  return COVER_PALETTES[Math.abs(h)%COVER_PALETTES.length]
}

// ─── Home Screen ──────────────────────────────────────────────────────────────
function HomeScreen({ t, library, notes, book, homeTab, setHomeTab,
  onLoadBook, onUpload, onSettings, onDeleteBook, readPos, chIdx }) {
  const w = useWidth()
  const isMob = w < 768
  const pal = book ? coverPalette(book.id) : null
  const totalCh = book?.chapters?.length || 0
  const pct = totalCh > 1 ? Math.round((readPos.chIdx||0)/(totalCh-1)*100) : 0

  const F = FONTS.lora

  return (
    <div style={{
      height:'100%', overflowY:'auto',
      background:t.bg,
      paddingBottom:'calc(80px + env(safe-area-inset-bottom))',
    }}>
      <div style={{maxWidth:520,margin:'0 auto',padding:isMob?'0 22px':'0 32px'}}>

        {/* ── Header ── */}
        <div style={{
          display:'flex',justifyContent:'space-between',alignItems:'center',
          paddingTop:'calc(52px + env(safe-area-inset-top))',
          paddingBottom:'28px',
        }}>
          <div>
            <div style={{fontSize:26,fontWeight:700,fontFamily:F,color:t.text,letterSpacing:'-0.02em'}}>
              奇阅魔方
            </div>
            <div style={{fontSize:12,color:t.muted,marginTop:3,letterSpacing:.5}}>
              AI 阅读助手
            </div>
          </div>
          <button onClick={onSettings} style={{
            width:40,height:40,borderRadius:'50%',background:t.hover,border:'none',
            display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',
          }}><Ic name='settings' size={18} color={t.muted}/></button>
        </div>

        {/* ── Continue Reading card ── */}
        {book && (
          <div style={{marginBottom:36}}>
            <div style={{fontSize:11,fontWeight:600,color:t.muted,letterSpacing:1.5,
              textTransform:'uppercase',marginBottom:14}}>正在阅读</div>
            <div onClick={()=>onLoadBook(book)} style={{
              background:t.card,borderRadius:20,padding:20,
              display:'flex',gap:18,cursor:'pointer',
              boxShadow:'0 8px 28px rgba(0,0,0,0.07)',
              transition:'transform .18s',
            }}>
              {/* Mini cover */}
              <div style={{
                width:72,height:100,borderRadius:10,flexShrink:0,
                background:pal.bg,
                boxShadow:'3px 4px 14px rgba(0,0,0,0.18)',
                display:'flex',flexDirection:'column',alignItems:'center',
                justifyContent:'center',padding:'10px 8px',textAlign:'center',
              }}>
                <span style={{fontSize:12,fontWeight:700,fontFamily:F,color:pal.text,
                  lineHeight:1.3,display:'-webkit-box',WebkitLineClamp:3,
                  WebkitBoxOrient:'vertical',overflow:'hidden'}}>
                  {book.title}
                </span>
              </div>
              {/* Info */}
              <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',minWidth:0}}>
                <div style={{fontSize:17,fontWeight:700,fontFamily:F,color:t.text,
                  marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {book.title}
                </div>
                <div style={{fontSize:12,color:t.muted,marginBottom:16}}>
                  {book.author}
                </div>
                <div style={{height:3,background:t.hover,borderRadius:2,overflow:'hidden',marginBottom:8}}>
                  <div style={{height:'100%',background:t.accent,
                    width:`${pct}%`,borderRadius:2,transition:'width .3s'}}/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:t.muted}}>
                  <span>第 {(readPos.chIdx||0)+1} 章 / 共 {totalCh} 章</span>
                  <span style={{color:t.accent,fontWeight:600}}>{pct}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab bar ── */}
        <div style={{display:'flex',gap:4,marginBottom:22,
          background:t.hover,borderRadius:14,padding:4}}>
          {[['library','书库'],['notes','笔记']].map(([id,label])=>(
            <button key={id} onClick={()=>setHomeTab(id)} style={{
              flex:1,height:36,border:'none',borderRadius:10,cursor:'pointer',
              fontFamily:'inherit',fontSize:13,fontWeight:homeTab===id?600:400,
              background:homeTab===id ? t.card : 'none',
              color:homeTab===id ? t.text : t.muted,
              boxShadow:homeTab===id?'0 1px 4px rgba(0,0,0,0.08)':'none',
              transition:'all .18s',
            }}>{label}</button>
          ))}
        </div>

        {/* ── Library tab ── */}
        {homeTab==='library' && (
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(3,1fr)',
            gap:'24px 14px',
          }}>
            {/* Import button as first "book" */}
            <div onClick={onUpload} style={{cursor:'pointer',display:'flex',flexDirection:'column',gap:9}}>
              <div style={{
                aspectRatio:'2/3',borderRadius:14,
                border:`2px dashed ${t.muted}40`,
                display:'flex',alignItems:'center',justifyContent:'center',
                background:'none',transition:'background .18s',
              }}>
                <svg width={28} height={28} viewBox="0 0 24 24" fill="none"
                  stroke={t.muted} strokeWidth={1.4} strokeLinecap="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </div>
              <div style={{fontSize:12,color:t.muted,textAlign:'center',fontWeight:500}}>
                导入
              </div>
            </div>

            {/* Book grid */}
            {library.map(b => {
              const p = coverPalette(b.id)
              const pos = JSON.parse(localStorage.getItem(READ_POS_KEY)||'{}')
              const bPct = b.id===book?.id ? pct :
                (pos.bookId===b.id && b.totalCh>1 ? Math.round((pos.chIdx||0)/(b.totalCh-1)*100) : 0)
              return (
                <div key={b.id} style={{display:'flex',flexDirection:'column',gap:9}}>
                  <div onClick={()=>onLoadBook(b)} style={{
                    aspectRatio:'2/3',borderRadius:14,
                    background:p.bg,
                    boxShadow:'0 6px 20px rgba(0,0,0,0.12)',
                    display:'flex',flexDirection:'column',alignItems:'center',
                    justifyContent:'center',padding:'12px 10px',textAlign:'center',
                    cursor:'pointer',position:'relative',overflow:'hidden',
                    transition:'transform .18s',
                  }}>
                    <span style={{fontSize:13,fontWeight:700,fontFamily:F,color:p.text,
                      lineHeight:1.35,display:'-webkit-box',WebkitLineClamp:4,
                      WebkitBoxOrient:'vertical',overflow:'hidden',marginBottom:6}}>
                      {b.title}
                    </span>
                    <span style={{fontSize:9,color:p.text,opacity:.65,
                      overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                      maxWidth:'90%'}}>{b.author}</span>
                    {/* Reading progress stripe at bottom */}
                    {bPct>0 && (
                      <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,
                        background:'rgba(0,0,0,0.15)'}}>
                        <div style={{height:'100%',width:`${bPct}%`,
                          background:'rgba(0,0,0,0.35)'}}/>
                      </div>
                    )}
                  </div>
                  <div style={{padding:'0 2px'}}>
                    <div style={{fontSize:12,fontWeight:600,color:t.text,
                      overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                      marginBottom:2}}>{b.title}</div>
                    <div style={{fontSize:10,color:t.muted}}>
                      {bPct>0 ? `已读 ${bPct}%` : '未读'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Notes tab ── */}
        {homeTab==='notes' && (
          <div>
            {notes.length===0
              ? <div style={{textAlign:'center',paddingTop:60,color:t.muted}}>
                  <Ic name='bookmark' size={36} color={t.muted+'60'}/>
                  <div style={{marginTop:12,fontSize:14}}>还没有笔记</div>
                  <div style={{fontSize:12,marginTop:6,opacity:.6}}>
                    阅读时选中文字可加入笔记
                  </div>
                </div>
              : notes.map(n=>(
                <div key={n.id} style={{
                  background:t.card,borderRadius:16,padding:'16px 18px',
                  marginBottom:12,boxShadow:'0 4px 14px rgba(0,0,0,0.05)',
                }}>
                  <div style={{fontSize:13,lineHeight:1.7,color:t.text,marginBottom:n.thought?10:0,
                    fontFamily:F}}>
                    「{n.text}」
                  </div>
                  {n.thought && (
                    <div style={{fontSize:12,color:t.accent,background:t.accent+'14',
                      borderRadius:9,padding:'7px 11px',lineHeight:1.6}}>
                      {n.thought}
                    </div>
                  )}
                  <div style={{fontSize:10,color:t.muted,marginTop:10,display:'flex',
                    gap:6,alignItems:'center'}}>
                    <span>{n.date}</span>
                    <span>·</span>
                    <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                      maxWidth:160}}>{n.book||'未知书籍'}</span>
                  </div>
                </div>
              ))
            }
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Welcome screen (legacy fallback) ─────────────────────────────────────────
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
