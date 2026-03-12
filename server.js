// 奇阅魔方 · 代理服务器
// node server.js
import express from 'express'
import cors from 'cors'
import { ProxyAgent, setGlobalDispatcher, fetch as undiciFetch } from 'undici'
import nodeFetch from 'node-fetch'
import { HttpsProxyAgent } from 'https-proxy-agent'

const CLASH_PORT = 7897
const PROXY_URL = `http://127.0.0.1:${CLASH_PORT}`

// undici 代理：用于 Claude / 智谱 / 千问
const proxyAgent = new ProxyAgent(PROXY_URL)
setGlobalDispatcher(proxyAgent)
const fetch = undiciFetch

// https-proxy-agent：专用于 Gemini（与 Clash TLS 兼容性更好）
const httpsAgent = new HttpsProxyAgent(PROXY_URL)

const app = express()
app.use(cors())
app.use(express.json({ limit: '4mb' }))

// ── 工具：把上游 SSE 流转发给浏览器（undici fetch 用）────────────────────────
async function pipeSSE(upstream, res) {
  if (!upstream.ok) {
    const err = await upstream.json().catch(() => ({ error: { message: `HTTP ${upstream.status}` } }))
    return res.status(upstream.status).json(err)
  }
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(decoder.decode(value, { stream: true }))
    }
  } finally {
    res.end()
  }
}

// ── Claude (Anthropic) ───────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { apiKey, messages, system, model = 'claude-haiku-4-5-20251001' } = req.body
  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens: 4096, system, messages, stream: true }),
    })
    await pipeSSE(upstream, res)
  } catch (e) {
    console.error('Claude error:', e.message)
    res.status(500).json({ error: { message: e.message } })
  }
})

// ── 分析报告（非流式）────────────────────────────────────────────────────────
app.post('/api/analyze', async (req, res) => {
  const { apiKey, messages, system } = req.body
  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1000, system, messages }),
    })
    const data = await upstream.json()
    res.json(data)
  } catch (e) {
    console.error('Analyze error:', e.message)
    res.status(500).json({ error: { message: e.message } })
  }
})

// ── 智谱 AI (GLM) ─────────────────────────────────────────────────────────────
app.post('/api/zhipu', async (req, res) => {
  const { apiKey, messages, system, model = 'glm-4-flash' } = req.body
  const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages
  try {
    const upstream = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: msgs, stream: true }),
    })
    await pipeSSE(upstream, res)
  } catch (e) {
    console.error('Zhipu error:', e.message)
    res.status(500).json({ error: { message: e.message } })
  }
})

// ── 千问 (Qwen / Dashscope) ───────────────────────────────────────────────────
app.post('/api/qwen', async (req, res) => {
  const { apiKey, messages, system, model = 'qwen-turbo' } = req.body
  const msgs = system ? [{ role: 'system', content: system }, ...messages] : messages
  try {
    const upstream = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: msgs, stream: true }),
    })
    await pipeSSE(upstream, res)
  } catch (e) {
    console.error('Qwen error:', e.message)
    res.status(500).json({ error: { message: e.message } })
  }
})

// ── Gemini ────────────────────────────────────────────────────────────────────
// 用 node-fetch + https-proxy-agent，与 Clash TLS 兼容性最好
app.post('/api/gemini', async (req, res) => {
  const { apiKey, messages, system, model = 'gemini-2.0-flash' } = req.body
  const rawMessages = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    text: typeof m.content === 'string' ? m.content : m.content?.[0]?.text || ''
  }))
  if (system && rawMessages.length > 0 && rawMessages[0].role === 'user') {
    rawMessages[0].text = system + '\n\n' + rawMessages[0].text
  }
  const contents = rawMessages.map(m => ({ role: m.role, parts: [{ text: m.text }] }))
  const body = { contents, generationConfig: { maxOutputTokens: 4096 } }

  try {
    const upstream = await nodeFetch(
      `https://generativelanguage.googleapis.com/v1/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        agent: httpsAgent,
      }
    )
    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({ error: { message: `HTTP ${upstream.status}` } }))
      return res.status(upstream.status).json(err)
    }
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    let buf = ''
    upstream.body.on('data', chunk => {
      buf += chunk.toString()
      const lines = buf.split('\n'); buf = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const d = line.slice(6).trim(); if (!d) continue
        try {
          const p = JSON.parse(d)
          const text = p.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) res.write(`data: ${JSON.stringify({ type: 'content_block_delta', delta: { text } })}\n\n`)
        } catch {}
      }
    })
    upstream.body.on('end', () => res.end())
    upstream.body.on('error', e => { console.error('Gemini stream error:', e.message); res.end() })
  } catch (e) {
    console.error('Gemini error:', e.message)
    res.status(500).json({ error: { message: e.message } })
  }
})

app.listen(3456, () => console.log(`奇阅魔方 proxy → http://localhost:3456  (via Clash :${CLASH_PORT})`))
