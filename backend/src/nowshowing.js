// GET /now-showing -> the most-watched trailers, from MongoDB Atlas.
import { db } from './lib/mongo.js'
import { json } from './lib/clients.js'

export const handler = async () => {
  const mongo = await db().catch(() => null)
  if (!mongo) return json(200, [])
  const top = await mongo.collection('plays').find().sort({ count: -1 }).limit(6).toArray()
  return json(200, top.map((p) => ({ job: p.job, tag: 'Ready to watch', watching: p.count })))
}
