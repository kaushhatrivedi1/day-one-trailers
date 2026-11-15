// Gemini is the brain: scripts, interview questions and feedback.
// Model names retire quickly (gemini-2.5-flash is closed to new keys) and models often answer
// 503 "high demand", sometimes all at once. So: try a list in order, treat broken JSON like a
// busy model, and if every model fails, wait and go round the list again.
// GEMINI_MODEL (comma-separated) overrides the list.
const DEFAULT = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3-flash-preview', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']
const FAST = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3-flash-preview']
const RETRY = new Set([404, 429, 500, 502, 503, 504])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// fast: for requests a person is waiting on behind API Gateway's 30-second limit (one round only).
export async function geminiJson(prompt, { fast = false, models: only } = {}) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not set')
  const models = only || (process.env.GEMINI_MODEL ? process.env.GEMINI_MODEL.split(',').map((s) => s.trim()) : fast ? FAST : DEFAULT)
  const budget = fast ? 14000 : 40000
  const rounds = fast ? 1 : 3
  let last = 'no model tried'
  for (let round = 0; round < rounds; round++) {
    if (round) await sleep(2500 * round)
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
      try { return JSON.parse(text) } catch { last = `${model}: returned broken JSON`; continue }
    }
  }
  throw new Error(`Gemini failed on every model. Last: ${last}`)
}
