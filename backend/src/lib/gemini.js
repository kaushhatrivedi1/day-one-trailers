// Gemini is the brain: scripts, interview questions and feedback.
// Model names retire quickly (gemini-2.5-flash is closed to new keys) and models often answer
// 503 "high demand", sometimes all at once. So: try a list in order, treat broken JSON like a
// busy model, and if every model fails, wait and go round the list again.
// GEMINI_MODEL (comma-separated) overrides the list.
const DEFAULT = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3-flash-preview', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']
const FAST = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3-flash-preview']
const RETRY = new Set([404, 429, 500, 502, 503, 504])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Backup brain: Amazon Nova 2 Lite on Bedrock, used when every Gemini model is busy or out of quota
// (the free Gemini tier allows only 20 requests per model per day).
const NOVA = process.env.BEDROCK_TEXT_MODEL || 'us.amazon.nova-2-lite-v1:0'
async function novaJson(prompt, fast) {
  const { BedrockRuntimeClient, ConverseCommand } = await import('@aws-sdk/client-bedrock-runtime')
  const client = new BedrockRuntimeClient({ region: process.env.BEDROCK_TEXT_REGION || 'us-east-1' })
  const res = await client.send(new ConverseCommand({
    modelId: NOVA,
    messages: [{ role: 'user', content: [{ text: `${prompt}\n\nReply with the JSON object only, no other text.` }] }],
    inferenceConfig: { maxTokens: 4000, temperature: 0.7 },
  }), { abortSignal: AbortSignal.timeout(fast ? 20000 : 60000) })
  const text = res.output?.message?.content?.find((c) => c.text)?.text || ''
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
  return JSON.parse(json)
}

// fast: for requests a person is waiting on behind API Gateway's 30-second limit (one round only).
export async function geminiJson(prompt, { fast = false, models: only } = {}) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not set')
  const models = only || (process.env.GEMINI_MODEL ? process.env.GEMINI_MODEL.split(',').map((s) => s.trim()) : fast ? FAST : DEFAULT)
  const budget = fast ? 14000 : 40000
  const rounds = fast ? 1 : 3
  let last = 'no model tried'
  for (let round = 0; round < rounds; round++) {
    if (round && /429/.test(last)) break
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
        round = rounds // a hard error (bad key, bad request): stop trying Gemini, go to Bedrock
        break
      }
      const data = await res.json()
      const text = data.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text
      if (!text) { last = `${model}: no text`; continue }
      try { return JSON.parse(text) } catch { last = `${model}: returned broken JSON`; continue }
    }
  }
  try {
    const out = await novaJson(prompt, fast)
    console.warn(`Gemini unavailable (${last.slice(0, 80)}); used Bedrock ${NOVA}`)
    return out
  } catch (e) {
    throw new Error(`Gemini failed on every model (last: ${last}) and Bedrock failed: ${e.message}`)
  }
}
