// POST /trailer  { job, lang, profile }  ->  { id, status }
import { randomUUID } from 'node:crypto'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { StartExecutionCommand } from '@aws-sdk/client-sfn'
import { ddb, sfn, TABLE, json } from './lib/clients.js'
import { db } from './lib/mongo.js'

const slug = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ')

export const handler = async (event) => {
  let body
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Send JSON.' }) }
  const job = String(body.job || '').trim().slice(0, 80)
  const lang = ['en', 'es', 'hi', 'ar', 'vi'].includes(body.lang) ? body.lang : 'en'
  const profile = String(body.profile || '').slice(0, 280)
  const jd = String(body.jd || '').trim().slice(0, 6000)
  if (!job && jd.length < 40) return json(400, { error: 'Tell us which job, or paste a job description.' })

  const id = randomUUID()
  const ttl = Math.floor(Date.now() / 1000) + 60 * 60 * 24

  // Cache hit: popular jobs come back instantly (and count toward "Now showing").
  const mongo = await db().catch(() => null)
  if (mongo && !profile && !jd && job) {
    const hit = await mongo.collection('trailers').findOne({ key: `${slug(job)}|${lang}` })
    if (hit) {
      await mongo.collection('plays').updateOne({ job: hit.job }, { $inc: { count: 1 }, $set: { last: new Date() } }, { upsert: true })
      await ddb.send(new PutCommand({ TableName: TABLE, Item: { jobId: id, sk: 'META', status: 'done', total: hit.scenes.length, credits: hit.credits, job: hit.job, lang, cachedScenes: hit.scenes, ttl } }))
      return json(200, { id, status: 'done', cached: true })
    }
  }

  await ddb.send(new PutCommand({ TableName: TABLE, Item: { jobId: id, sk: 'META', status: 'running', total: 6, job: job || '…', lang, profile, ttl } }))
  await sfn.send(new StartExecutionCommand({ stateMachineArn: process.env.STATE_MACHINE_ARN, name: id, input: JSON.stringify({ jobId: id, job, lang, profile, jd }) }))
  return json(202, { id, status: 'running' })
}
