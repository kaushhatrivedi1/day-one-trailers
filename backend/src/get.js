// GET /trailer/{id}  ->  { status, total, job, lang, credits, scenes[] }
// Scenes appear as the workers finish, so the UI can show progress. Asset links are presigned here
// so they never expire inside the cache.
import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { ddb, s3, TABLE, BUCKET, json } from './lib/clients.js'

const url = (Key) => (Key ? getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key }), { expiresIn: 3600 * 3 }) : null)

export const handler = async (event) => {
  const jobId = event.pathParameters?.id
  if (!jobId) return json(400, { error: 'Missing id' })
  const r = await ddb.send(new QueryCommand({ TableName: TABLE, KeyConditionExpression: 'jobId = :j', ExpressionAttributeValues: { ':j': jobId } }))
  const meta = r.Items?.find((x) => x.sk === 'META')
  if (!meta) return json(404, { error: 'Trailer not found. It may have expired.' })
  const rows = meta.cachedScenes || r.Items.filter((x) => x.sk.startsWith('SCENE#')).sort((a, b) => a.index - b.index)
  const scenes = await Promise.all(rows.map(async (s) => ({
    title: s.title,
    narration: s.narration,
    screen: s.screen || '',
    image: await url(s.imageKey),
    audioUrl: await url(s.audioKey),
    marks: s.marks || null,
  })))
  return json(200, { status: meta.status, total: meta.total, job: meta.job, company: meta.company || '', kit: meta.kit || 'general', research: meta.research || null, lang: meta.lang, credits: meta.credits, scenes, source: 'aws' })
}
