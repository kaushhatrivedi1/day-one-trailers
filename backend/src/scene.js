// Step Functions Map task, one run per scene (all six run in parallel):
// Translate -> Bedrock image model -> Rekognition moderation -> Polly (audio + word timings) -> S3 + DynamoDB.
import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { VOICES, speakPolly } from './lib/polly.js'
import { TranslateTextCommand } from '@aws-sdk/client-translate'
import { DetectModerationLabelsCommand } from '@aws-sdk/client-rekognition'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { bedrock, translate, rekognition, s3, ddb, TABLE, BUCKET } from './lib/clients.js'
import { speakEleven, voiceEnabled } from './lib/voice.js'

// Nova Canvas v1 reached end of life on Bedrock; text-to-image now lives in us-west-2 (Stability).
// IMAGE_MODEL / BEDROCK_REGION override. Stability models need their Bedrock agreement accepted once.
const IMAGE_MODEL = process.env.IMAGE_MODEL || 'stability.stable-image-core-v1:1'
// Verify these voices exist for your region and engine. Vietnamese has no Polly voice,
// so the browser voice is used for that language.
const slug = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const STYLE = 'illustrated cinematic film-poster frame, flat bold shapes, warm dramatic lighting, wide shot, no text, no letters, no logos'

async function paint(prompt, safer) {
  const text = `${prompt}. ${STYLE}${safer ? ', family-friendly, calm, safe workplace' : ''}`.slice(0, 1000)
  const negative = 'text, letters, watermark, logo, distorted faces, extra fingers'
  const nova = IMAGE_MODEL.startsWith('amazon.')
  const body = nova
    ? { taskType: 'TEXT_IMAGE', textToImageParams: { text, negativeText: negative }, imageGenerationConfig: { numberOfImages: 1, width: 1280, height: 720, quality: 'standard' } }
    : { prompt: text, negative_prompt: negative, aspect_ratio: '16:9', output_format: 'png' }
  const res = await bedrock.send(new InvokeModelCommand({ modelId: IMAGE_MODEL, contentType: 'application/json', accept: 'application/json', body: JSON.stringify(body) }))
  const out = JSON.parse(Buffer.from(res.body).toString('utf8'))
  if (!out.images?.[0]) throw new Error(`No image returned (${JSON.stringify(out.finish_reasons || out.error || '')})`)
  return Buffer.from(out.images[0], 'base64')
}

async function isSafe(bytes) {
  const r = await rekognition.send(new DetectModerationLabelsCommand({ Image: { Bytes: bytes }, MinConfidence: 60 }))
  return (r.ModerationLabels || []).length === 0
}


export const handler = async ({ jobId, job, lang, scene }) => {
  const i = scene.index
  const prefix = `trailers/${slug(job)}/${lang}/${i}`
  let { title, narration } = scene

  if (lang !== 'en' && scene.written !== lang) {
    const t = await Promise.all([title, narration].map((Text) =>
      translate.send(new TranslateTextCommand({ Text, SourceLanguageCode: 'en', TargetLanguageCode: lang }))))
    title = t[0].TranslatedText
    narration = t[1].TranslatedText
  }

  // Paint, then check. If Rekognition flags the frame, try again once with a safer prompt.
  // If the image model is unavailable, keep going: the player draws its own frame for scenes with no image.
  let imageKey = null
  let attempts = 0
  let imageError = null
  for (; scene.imagePrompt && attempts < 2 && !imageKey; attempts++) {
    let img
    try { img = await paint(scene.imagePrompt, attempts > 0) } catch (e) { imageError = e.message; console.warn('image failed', e.name, e.message); break }
    if (await isSafe(img)) {
      imageKey = `${prefix}.png`
      await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: imageKey, Body: img, ContentType: 'image/png' }))
    }
  }

  let audioKey = null
  let marks = null
  const voice = VOICES[lang]
  // ElevenLabs speaks every language natively; Polly is the fallback (it has no Vietnamese voice).
  let eleven = null
  if (voiceEnabled()) { try { eleven = await speakEleven(narration) } catch (e) { console.warn('ElevenLabs failed', e.message) } }
  if (eleven || voice) {
    const a = eleven || await speakPolly(narration, voice)
    audioKey = `${prefix}.mp3`
    marks = a.marks
    await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: audioKey, Body: a.bytes, ContentType: 'audio/mpeg' }))
  }

  const item = { title, narration, screen: scene.screen || '', imageKey, audioKey, marks, moderation: { passed: !!imageKey, attempts }, imageError }
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { jobId, sk: `SCENE#${i}`, index: i, ...item, ttl: Math.floor(Date.now() / 1000) + 86400 },
  }))
  return { index: i, ...item }
}
