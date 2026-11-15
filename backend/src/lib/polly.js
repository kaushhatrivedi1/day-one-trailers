// Amazon Polly narration with word timings (for karaoke captions). Vietnamese has no Polly voice,
// so callers fall back to the browser voice for it.
import { SynthesizeSpeechCommand } from '@aws-sdk/client-polly'
import { polly } from './clients.js'

export const VOICES = {
  en: { id: 'Joanna', lang: 'en-US' },
  es: { id: 'Lupe', lang: 'es-US' },
  hi: { id: 'Kajal', lang: 'hi-IN' },
  ar: { id: 'Hala', lang: 'ar-AE' },
}

export async function speakPolly(text, voice) {
  const base = { Text: text, VoiceId: voice.id, LanguageCode: voice.lang }
  let audio
  try {
    audio = await polly.send(new SynthesizeSpeechCommand({ ...base, OutputFormat: 'mp3', Engine: 'neural' }))
  } catch {
    audio = await polly.send(new SynthesizeSpeechCommand({ ...base, OutputFormat: 'mp3', Engine: 'standard' }))
  }
  const marksRes = await polly.send(new SynthesizeSpeechCommand({ ...base, OutputFormat: 'json', SpeechMarkTypes: ['word'], Engine: 'neural' })).catch(() => null)
  let marks = null
  if (marksRes) {
    const raw = Buffer.from(await marksRes.AudioStream.transformToByteArray()).toString('utf8')
    marks = raw.split('\n').filter(Boolean).map((l) => JSON.parse(l)).map((m) => ({ time: m.time, value: m.value }))
  }
  return { bytes: Buffer.from(await audio.AudioStream.transformToByteArray()), marks }
}
