import { useCallback, useEffect, useRef, useState } from 'react'
import { startTranscribe, transcribeEnabled } from './transcribe.js'

// Microphone + live speech-to-text.
// Demo mode uses the browser's SpeechRecognition. With the AWS backend, swap `startTranscribe`
// in for Amazon Transcribe streaming (see backend/README.md, "Transcribe in the browser").
export default function useMic(lang = 'en-US') {
  const [listening, setListening] = useState(false)
  const [level, setLevel] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const analyser = useRef(null)
  const ctx = useRef(null)
  const stream = useRef(null)
  const raf = useRef(0)
  const rec = useRef(null)
  const finalText = useRef('')
  const stopAws = useRef(null)

  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
  const supported = !!(navigator.mediaDevices?.getUserMedia)
  const canTranscribe = transcribeEnabled || !!SR
  const engine = transcribeEnabled ? 'Amazon Transcribe' : SR ? 'your browser' : null

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current)
    rec.current?.stop?.()
    rec.current = null
    stopAws.current?.()
    stopAws.current = null
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
    ctx.current?.close?.()
    ctx.current = null
    analyser.current = null
    setLevel(0)
    setListening(false)
  }, [])

  const start = useCallback(async () => {
    setError('')
    setTranscript('')
    finalText.current = ''
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Microphone blocked. Allow it in your browser, or type your answer below.')
      return
    }
    ctx.current = new (window.AudioContext || window.webkitAudioContext)()
    const src = ctx.current.createMediaStreamSource(stream.current)
    analyser.current = ctx.current.createAnalyser()
    analyser.current.fftSize = 1024
    src.connect(analyser.current)
    const buf = new Uint8Array(analyser.current.fftSize)
    const tick = () => {
      if (!analyser.current) return
      analyser.current.getByteTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v }
      setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4))
      raf.current = requestAnimationFrame(tick)
    }
    tick()

    if (transcribeEnabled) {
      try {
        stopAws.current = await startTranscribe({ stream: stream.current, lang: lang.slice(0, 2), onText: setTranscript })
      } catch {
        setError('Amazon Transcribe could not connect. You can type your answer instead.')
      }
    } else if (SR) {
      const r = new SR()
      r.lang = lang
      r.continuous = true
      r.interimResults = true
      r.onresult = (e) => {
        let interim = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript
          if (e.results[i].isFinal) finalText.current += t + ' '
          else interim += t
        }
        setTranscript((finalText.current + interim).trim())
      }
      r.onerror = () => {}
      r.start()
      rec.current = r
    }
    setListening(true)
  }, [SR, lang])

  useEffect(() => stop, [stop])
  return { listening, level, transcript, error, start, stop, analyser, supported, canTranscribe, engine, setTranscript }
}
