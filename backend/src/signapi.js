// POST /sign { text, lang, simple } -> { gloss, status, motion, ... }
// Bolt's ASL for one line, the same pipeline as the laptop API (lib/sign.js). The Lambda ships only
// the gloss index (library.json) and the motion data (motion.json), copied into src/signdata by
// tools/pack-signs.sh before `sam build`; the source video clips never leave the laptop.
// Results are cached in S3 by a hash of lang|text, so a line costs model requests only once.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { s3, BUCKET, json } from './lib/clients.js'
import { signLine } from './lib/sign.js'

const DIR = process.env.SIGN_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), 'signdata')

export const handler = async (event) => {
  let body
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Send JSON.' }) }
  const text = String(body.text || '').trim().slice(0, 400)
  const lang = ['en', 'es', 'hi', 'ar', 'vi'].includes(body.lang) ? body.lang : 'en'
  if (!text) return json(400, { error: 'Missing text.' })
  const key = `sign/${createHash('sha1').update(lang + '|' + text).digest('hex')}.json`
  try {
    const hit = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
    return json(200, JSON.parse(await hit.Body.transformToString()))
  } catch { /* not cached yet */ }
  const r = await signLine(text, lang, DIR, '/tmp', null, null, !!body.simple)
  const out = { ...r, video: undefined, videoUrl: null }
  // Only keep results that worked or clearly can't; a model outage should be retried next time.
  if (out.status === 'ok' || out.status === 'low-coverage' || out.status === 'failed-check') {
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: JSON.stringify(out), ContentType: 'application/json' })).catch(() => {})
  }
  return json(200, out)
}
