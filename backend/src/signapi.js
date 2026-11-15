// POST /sign { text, lang, simple } -> { gloss, status, motion, ... }
// Bolt's ASL for one line, the same pipeline as the laptop API (lib/sign.js). The Lambda ships only
// the gloss index (library.json) and the motion data (motion.json), copied into src/signdata by
// tools/pack-signs.sh before `sam build`; the source video clips never leave the laptop.
// Results are cached in S3 by a hash of lang|text, so a line costs model requests only once.
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { s3, BUCKET, json } from './lib/clients.js'
import { signLine, signDataDir, signCacheKey } from './lib/sign.js'

const DIR = signDataDir()

export const handler = async (event) => {
  let body
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Send JSON.' }) }
  const text = String(body.text || '').trim().slice(0, 400)
  const lang = ['en', 'es', 'hi', 'ar', 'vi'].includes(body.lang) ? body.lang : 'en'
  if (!text) return json(400, { error: 'Missing text.' })
  const key = signCacheKey(lang, text)
  try {
    const hit = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
    return json(200, JSON.parse(await hit.Body.transformToString()))
  } catch { /* not cached yet */ }
  // A gloss from the caller (the interview question) skips the translation step: only the meaning check runs.
  const given = Array.isArray(body.gloss) && body.gloss.length ? body.gloss.map((g) => String(g).toUpperCase()).slice(0, 14) : null
  // If the given gloss fails the check, signLine retries once with a simpler gloss. Stay inside API
  // Gateway's 30 s limit: past 25 s, answer captions-only (not cached, so a later request can try again).
  const timeout = new Promise((res) => setTimeout(() => res(null), 25000))
  const r = await Promise.race([signLine(text, lang, DIR, '/tmp', given, null, !!body.simple, !!given), timeout])
  if (!r) return json(200, { gloss: given || [], status: 'timeout', motion: null, videoUrl: null })
  const out = { ...r, video: undefined, videoUrl: null }
  // Only keep results that worked or clearly can't; a model outage should be retried next time.
  if (out.status === 'ok' || out.status === 'low-coverage' || out.status === 'failed-check') {
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: JSON.stringify(out), ContentType: 'application/json' })).catch(() => {})
  }
  return json(200, out)
}
