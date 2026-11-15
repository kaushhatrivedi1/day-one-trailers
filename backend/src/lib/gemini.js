// Gemini is the brain: scripts, interview questions and feedback.
// Model names retire quickly (gemini-2.5-flash is closed to new keys) and the newest models
// often answer 503 "high demand", so try a list in order and move on when one is busy or gone.
// GEMINI_MODEL (comma-separated) overrides the list.
const DEFAULT = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite']
const FAST = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash']
const RETRY = new Set([404, 429, 500, 503, 504])

// fast: for requests a person is waiting on behind API Gateway's 30-second limit.
export async function geminiJson(prompt, { fast = false } = {}) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not set')
  const models = process.env.GEMINI_MODEL ? process.env.GEMINI_MODEL.split(',').map((s) => s.trim()) : fast ? FAST : DEFAULT
  const budget = fast ? 14000 : 40000
  let last = 'no model tried'
  for (const model of models) {
    let res
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.8 },
        }),
        signal: AbortSignal.timeout(budget),
      })
    } catch (e) {
      last = `${model}: ${e.name === 'TimeoutError' ? 'timed out' : e.message}`
      continue
    }
    if (!res.ok) {
      last = `${model} ${res.status}: ${(await res.text()).slice(0, 200)}`
      if (RETRY.has(res.status)) continue
      throw new Error(`Gemini ${last}`)
    }
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text
    if (!text) { last = `${model}: no text`; continue }
    return JSON.parse(text)
  }
  throw new Error(`Gemini failed on every model. Last: ${last}`)
}
