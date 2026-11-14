// Amazon Transcribe streaming straight from the browser, using Cognito guest credentials.
// Enabled when VITE_COGNITO_POOL_ID is set. The SDK is loaded on demand so demo mode stays small.
const CODES = { en: 'en-US', es: 'es-US', hi: 'hi-IN', ar: 'ar-SA', vi: 'vi-VN' }
export const transcribeEnabled = !!import.meta.env.VITE_COGNITO_POOL_ID

function downsample(input, from, to) {
  if (from === to) return input
  const ratio = from / to
  const out = new Float32Array(Math.floor(input.length / ratio))
  for (let i = 0; i < out.length; i++) out[i] = input[Math.floor(i * ratio)]
  return out
}
function toPcm16(f32) {
  const buf = new ArrayBuffer(f32.length * 2)
  const view = new DataView(buf)
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]))
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Uint8Array(buf)
}

export async function startTranscribe({ stream, lang, onText }) {
  const [{ TranscribeStreamingClient, StartStreamTranscriptionCommand }, { fromCognitoIdentityPool }] = await Promise.all([
    import('@aws-sdk/client-transcribe-streaming'),
    import('@aws-sdk/credential-providers'),
  ])
  const region = import.meta.env.VITE_AWS_REGION || 'us-east-1'
  const client = new TranscribeStreamingClient({
    region,
    credentials: fromCognitoIdentityPool({ clientConfig: { region }, identityPoolId: import.meta.env.VITE_COGNITO_POOL_ID }),
  })

  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const src = ctx.createMediaStreamSource(stream)
  const proc = ctx.createScriptProcessor(4096, 1, 1)
  const queue = []
  let wake = null
  let closed = false
  proc.onaudioprocess = (e) => {
    queue.push(toPcm16(downsample(e.inputBuffer.getChannelData(0), ctx.sampleRate, 16000)))
    wake?.()
  }
  src.connect(proc)
  proc.connect(ctx.destination)

  async function* audio() {
    while (!closed) {
      if (!queue.length) await new Promise((r) => (wake = r))
      while (queue.length) yield { AudioEvent: { AudioChunk: queue.shift() } }
    }
  }

  let finalText = ''
  const run = (async () => {
    const res = await client.send(new StartStreamTranscriptionCommand({
      LanguageCode: CODES[lang] || 'en-US',
      MediaSampleRateHertz: 16000,
      MediaEncoding: 'pcm',
      AudioStream: audio(),
    }))
    for await (const ev of res.TranscriptResultStream) {
      for (const r of ev.TranscriptEvent?.Transcript?.Results || []) {
        const t = r.Alternatives?.[0]?.Transcript || ''
        if (!r.IsPartial) { finalText += t + ' '; onText(finalText.trim()) }
        else onText((finalText + t).trim())
      }
    }
  })().catch(() => {})

  return () => {
    closed = true
    wake?.()
    proc.disconnect(); src.disconnect(); ctx.close()
    return run
  }
}
