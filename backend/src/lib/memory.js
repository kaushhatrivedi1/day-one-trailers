// Bolt's memory of returning visitors, in Supermemory (v5 API: one namespace per visitor).
// Saved: jobs they explored, interview scores, strengths, gaps and what to practise. Not saved: the
// resume text or their answers. The visitor is an anonymous id kept in their browser; "Forget me"
// in the app switches to a new id, so nothing old is recalled.
// Docs: POST /ns/{ns}/document, POST /ns/{ns}/search, POST /ns/{ns}/profile  (Bearer auth)
const BASE = 'https://api.supermemory.ai'
export const memoryEnabled = () => !!process.env.SUPERMEMORY_API_KEY

const ns = (guest) => {
  const id = String(guest || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
  return id.length >= 8 ? `dayone_guest_${id}` : null
}
const call = (path, body) => fetch(BASE + path, {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.SUPERMEMORY_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body || {}),
  signal: AbortSignal.timeout(8000),
})

export async function remember(guest, content, metadata = {}) {
  const space = ns(guest)
  if (!memoryEnabled() || !space || !content) return null
  const res = await call(`/ns/${space}/document`, { content: String(content).slice(0, 4000), metadata, dreaming: 'instant' })
  if (!res.ok) { console.warn('memory save failed', res.status, (await res.text()).slice(0, 120)); return null }
  return res.json()
}

// What Bolt knows about this visitor: the profile's memories, newest first, plus the most relevant
// search hits about interviews and jobs.
export async function recall(guest) {
  const space = ns(guest)
  if (!memoryEnabled() || !space) return []
  const [profile, search] = await Promise.all([
    call(`/ns/${space}/profile`, {}).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    call(`/ns/${space}/search`, { query: 'jobs explored, interview scores, weak spots and what to practise', limit: 8 })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ])
  const fromProfile = [...(profile?.profile?.static || []), ...(profile?.profile?.dynamic || [])].map((m) => m.memory)
  const fromSearch = (search?.results || []).map((r) => r.memory || r.chunk).filter(Boolean)
  return [...new Set([...fromProfile, ...fromSearch])].slice(0, 12)
}
