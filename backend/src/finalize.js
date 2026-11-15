// Step Functions task: mark the job done (or failed) and cache the finished trailer in MongoDB Atlas.
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { ddb, TABLE } from './lib/clients.js'
import { db } from './lib/mongo.js'
import { remember } from './lib/memory.js'

const slug = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ')

export const handler = async (event) => {
  const { jobId, job, lang } = event
  if (event.error) {
    await ddb.send(new UpdateCommand({ TableName: TABLE, Key: { jobId, sk: 'META' }, UpdateExpression: 'SET #s = :s', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':s': 'failed' } }))
    return { jobId, status: 'failed' }
  }
  const scenes = [...event.sceneResults].sort((a, b) => a.index - b.index)
  await ddb.send(new UpdateCommand({
    TableName: TABLE, Key: { jobId, sk: 'META' },
    UpdateExpression: 'SET #s = :s, credits = :c, total = :t, job = :j, company = :co, kit = :k, research = :r',
    ExpressionAttributeNames: { '#s': 'status' },
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
