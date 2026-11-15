// POST /memory/greeting { guest, lang } -> { greeting, memories }
// Bolt's welcome-back line for a returning visitor, written from what Supermemory recalls.
import { json } from './lib/clients.js'
import { geminiJson } from './lib/gemini.js'
import { recall, memoryEnabled } from './lib/memory.js'

const LANGS = { en: 'English', es: 'Spanish', hi: 'Hindi', ar: 'Arabic', vi: 'Vietnamese' }

export const handler = async (event) => {
  let body
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Send JSON.' }) }
  if (!memoryEnabled()) return json(200, { greeting: null, memories: [] })
  const memories = await recall(body.guest).catch(() => [])
  if (!memories.length) return json(200, { greeting: null, memories: [] })
  const out = await geminiJson(`You are Bolt, a friendly robot career guide. A visitor is back. What you remember about them:
${memories.map((m) => '- ' + m).join('\n')}
Write a warm welcome-back in ${LANGS[body.lang] || 'English'}: at most 2 short sentences, mention one specific thing from memory
(a job they explored or something to practise), and suggest one next step. No made-up details.
Return JSON: {"greeting":""}`, { fast: true }).catch(() => ({}))
  return json(200, { greeting: out.greeting || null, memories })
}
