// Step Functions Map task, one run per scene (all six run in parallel):
// Translate -> Bedrock Nova Canvas -> Rekognition moderation -> Polly (audio + word timings) -> S3 + DynamoDB.
import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { SynthesizeSpeechCommand } from '@aws-sdk/client-polly'
import { TranslateTextCommand } from '@aws-sdk/client-translate'
import { DetectModerationLabelsCommand } from '@aws-sdk/client-rekognition'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { bedrock, polly, translate, rekognition, s3, ddb, TABLE, BUCKET } from './lib/clients.js'

const CANVAS_MODEL = process.env.NOVA_CANVAS_MODEL || 'amazon.nova-canvas-v1:0'
// Verify these voices exist for your region and engine. Vietnamese has no Polly voice,
// so the browser voice is used for that language.
const VOICES = {
  en: { id: 'Joanna', lang: 'en-US' },
  es: { id: 'Lupe', lang: 'es-US' },
  hi: { id: 'Kajal', lang: 'hi-IN' },
  ar: { id: 'Hala', lang: 'ar-AE' },
}
const slug = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const STYLE = 'illustrated cinematic film-poster frame, flat bold shapes, warm dramatic lighting, wide shot, no text, no letters, no logos'

async function paint(prompt, safer) {
  const text = `${prompt}. ${STYLE}${safer ? ', family-friendly, calm, safe workplace' : ''}`.slice(0, 1000)
  const res = await bedrock.send(new InvokeModelCommand({
    modelId: CANVAS_MODEL,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      taskType: 'TEXT_IMAGE',
      textToImageParams: { text, negativeText: 'text, letters, watermark, logo, distorted faces, extra fingers' },
      imageGenerationConfig: { numberOfImages: 1, width: 1280, height: 720, quality: 'standard' },
    }),
  }))
  const out = JSON.parse(Buffer.from(res.body).toString('utf8'))
  return Buffer.from(out.images[0], 'base64')
}

async function isSafe(bytes) {
  const r = await rekognition.send(new DetectModerationLabelsCommand({ Image: { Bytes: bytes }, MinConfidence: 60 }))
  return (r.ModerationLabels || []).length === 0
}

async function speak(text, voice) {
  const base = { Text: text, VoiceId: voice.id, LanguageCode: voice.lang }
  let audio
  try {
    audio = await polly.send(new SynthesizeSpeechCommand({ ...base, OutputFormat: 'mp3', Engine: 'neural' }))
  } catch {
    audio = await polly.send(new SynthesizeSpeechCommand({ ...base, OutputFormat: 'mp3', Engine: 'standard' }))
  }
  // Word timings drive the karaoke captions in the player.
  const marksRes = await polly.send(new SynthesizeSpeechCommand({ ...base, OutputFormat: 'json', SpeechMarkTypes: ['word'], Engine: 'neural' })).catch(() => null)
  let marks = null
  if (marksRes) {
    const raw = Buffer.from(await marksRes.AudioStream.transformToByteArray()).toString('utf8')
    marks = raw.split('\n').filter(Boolean).map((l) => JSON.parse(l)).map((m) => ({ time: m.time, value: m.value }))
  }
  return { bytes: Buffer.from(await audio.AudioStream.transformToByteArray()), marks }
}

export const handler = async ({ jobId, job, lang, scene }) => {
  const i = scene.index
  const prefix = `trailers/${slug(job)}/${lang}/${i}`
  let { title, narration } = scene

  if (lang !== 'en') {
    const t = await Promise.all([title, narration].map((Text) =>
      translate.send(new TranslateTextCommand({ Text, SourceLanguageCode: 'en', TargetLanguageCode: lang }))))
    title = t[0].TranslatedText
    narration = t[1].TranslatedText
  }

  // Paint, then check. If Rekognition flags the frame, try again once with a safer prompt.
  let imageKey = null
  let attempts = 0
  for (; attempts < 2 && !imageKey; attempts++) {
    const img = await paint(scene.imagePrompt, attempts > 0)
    if (await isSafe(img)) {
      imageKey = `${prefix}.png`
      await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: imageKey, Body: img, ContentType: 'image/png' }))
    }
  }

  let audioKey = null
  let marks = null
  const voice = VOICES[lang]
  if (voice) {
    const a = await speak(narration, voice)
    audioKey = `${prefix}.mp3`
    marks = a.marks
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: audioKey, Body: a.bytes, ContentType: 'audio/mpeg' }))
  }

  const item = { title, narration, imageKey, audioKey, marks, moderation: { passed: !!imageKey, attempts } }
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { jobId, sk: `SCENE#${i}`, index: i, ...item, ttl: Math.floor(Date.now() / 1000) + 86400 },
  }))
  return { index: i, ...item }
}
