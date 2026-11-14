import { MongoClient } from 'mongodb'

// Reused across warm Lambda invocations.
let client
export async function db() {
  if (!process.env.MONGODB_URI) return null // the app still works without the cache
  client ??= new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 5 })
  await client.connect()
  return client.db(process.env.MONGODB_DB || 'dayone')
}
