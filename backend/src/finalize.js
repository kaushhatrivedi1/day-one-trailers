// Step Functions task: mark the job done (or failed) and cache the finished trailer in MongoDB Atlas.
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { ddb, TABLE } from './lib/clients.js'
import { db } from './lib/mongo.js'
import { remember } from './lib/memory.js'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { s3, BUCKET } from './lib/clients.js'
import { signBatch, signDataDir, signCacheKey } from './lib/sign.js'

// Sign every scene in one batch (glosses come from the script call) and store each result where
// POST /sign looks first, so the player finds the signing ready the moment the trailer starts.
async function signTrailer(scenes, written, lang) {
  const gloss = new Map((written || []).map((s) => [s.index, s.asl]))
  const items = scenes.map((s) => ({ text: s.narration, gloss: gloss.get(s.index) })).filter((it) => it.text && it.gloss?.length)
  if (!items.length) return
  const results = await signBatch(items, signDataDir())
  await Promise.all(items.map((it, k) => s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: signCacheKey(lang, it.text), Body: JSON.stringify(results[k]), ContentType: 'application/json' }))))
  console.log('signing:', results.map((r) => r.status).join(', '))
}

const slug = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ')

export const handler = async (event) => {
  const { jobId, job, lang } = event
  if (event.error) {
    await ddb.send(new UpdateCommand({ TableName: TABLE, Key: { jobId, sk: 'META' }, UpdateExpression: 'SET #s = :s', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':s': 'failed' } }))
    return { jobId, status: 'failed' }
  }
  const scenes = [...event.sceneResults].sort((a, b) => a.index - b.index)
  // Never let signing hold up or break the trailer: the player falls back to /sign or captions.
  await signTrailer(scenes, event.scenes, lang).catch((e) => console.warn('signing failed', e.message))
  await ddb.send(new UpdateCommand({
    TableName: TABLE, Key: { jobId, sk: 'META' },
    // Every name is aliased: "total" (and others) are DynamoDB reserved words.
    UpdateExpression: 'SET #s = :s, #c = :c, #t = :t, #j = :j, #co = :co, #k = :k, #r = :r',
    ExpressionAttributeNames: { '#s': 'status', '#c': 'credits', '#t': 'total', '#j': 'job', '#co': 'company', '#k': 'kit', '#r': 'research' },
    ExpressionAttributeValues: { ':s': 'done', ':c': event.credits, ':t': scenes.length, ':j': job || '', ':co': event.company || '', ':k': event.kit || 'general', ':r': event.research || null },
  }))
  const mongo = await db().catch(() => null)
  if (mongo && !event.fromJd) {
    await mongo.collection('trailers').updateOne(
      { key: `${slug(job)}|${lang}` },
      { $set: { key: `${slug(job)}|${lang}`, job, lang, scenes, credits: event.credits, createdAt: new Date() } },
      { upsert: true },
    )
    await mongo.collection('plays').updateOne({ job }, { $inc: { count: 1 }, $set: { last: new Date() } }, { upsert: true })
  }
  if (event.guest) await remember(event.guest, `The visitor watched a Day One trailer about working as ${job}${event.company ? ` at ${event.company}` : ''}.`, { type: 'trailer', job: job || '' }).catch(() => {})
  return { jobId, status: 'done' }
}
