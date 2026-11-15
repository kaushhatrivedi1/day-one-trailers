// POST /speak { text, lang } -> { audioUrl, marks }
// Bolt's host lines and interview questions, spoken by ElevenLabs in any language.
// Audio is cached in S3 by a hash of the line, so repeated lines cost nothing.
import { createHash } from 'node:crypto'
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3, BUCKET, json } from './lib/clients.js'
import { speakEleven, voiceEnabled } from './lib/voice.js'

export const handler = async (event) => {
  let body
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Send JSON.' }) }
  const text = String(body.text || '').slice(0, 600)
  const lang = String(body.lang || 'en').slice(0, 5)
  if (!text) return json(400, { error: 'Missing text.' })
  if (!voiceEnabled()) return json(503, { error: 'No ElevenLabs key' })
  const key = `speak/${createHash('sha1').update(lang + '|' + text).digest('hex')}`
  let marks = null
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: `${key}.mp3` }))
    const m = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: `${key}.json` }))
    marks = JSON.parse(await m.Body.transformToString())
  } catch {
    const v = await speakEleven(text)
    marks = v.marks
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: `${key}.mp3`, Body: v.bytes, ContentType: 'audio/mpeg' }))
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: `${key}.json`, Body: JSON.stringify(marks), ContentType: 'application/json' }))
  }
  const audioUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: `${key}.mp3` }), { expiresIn: 3600 * 6 })
  return json(200, { audioUrl, marks })
}
