import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import HostLine from './Host.jsx'
import OfficeScene from './OfficeScene.jsx'
import SignPanel from './SignPanel.jsx'
import { HOST } from './signs.js'
import { speak, preload } from './speech.js'
import { useAccess, useT } from './access.jsx'

// Plays the trailer: Bolt introduces it, then acts out six office scenes while narrating.
// Scenes from the API carry `audioUrl` and word `marks` (ElevenLabs, any language); demo scenes use speak().
// A sign-language window plays `scene.signUrl` when the ASL avatar service provides one.
export default function Player({ trailer, onFinish }) {
  const t = useT()
  const { sign, lang } = useAccess()
  const [intro, setIntro] = useState(true)
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(false)
  const [caps, setCaps] = useState(true)
  const [word, setWord] = useState(-1)
  const [talking, setTalking] = useState(false)
  const scene = trailer.scenes[i]
  const words = useMemo(() => (scene ? scene.narration.trim().split(/\s+/) : []), [scene])
  const finished = useRef(false)
  // A scene ends when the narration is done and, with sign language on, the signed line has finished too.
  const gate = useRef({ scene: -1, voice: false, sign: null, moved: false })
  if (gate.current.scene !== i) gate.current = { scene: i, voice: false, sign: null, moved: false }
  const tryAdvance = useCallback(() => {
    const g = gate.current
    if (g.moved || !g.voice) return
    if (sign && (g.sign === null || g.sign === true)) return
    g.moved = true
    setI((n) => (n === g.scene ? n + 1 : n))
  }, [sign])
  const duration = Math.max(6, words.length * 0.45 + 2)

  useEffect(() => {
    if (i >= trailer.scenes.length && !finished.current) { finished.current = true; onFinish() }
  }, [i, trailer.scenes.length, onFinish])

  // Warm up the next scene's audio so scenes flow without a gap.
  useEffect(() => { const n = trailer.scenes[i + 1]; if (n?.audioUrl) new Audio(n.audioUrl).preload = 'auto' }, [i, trailer.scenes])
  useEffect(() => { preload(HOST.intro(t, trailer.job).text, lang) }, [t, trailer.job, lang])

  useEffect(() => {
    if (intro || !scene || !playing) return
    let done = false
    let audio, timer, stopSpeech
    const next = () => { if (!done) { done = true; setTalking(false); gate.current.voice = true; tryAdvance() } }
    setWord(-1)

    if (muted) {
      // Silent: move the captions at reading speed.
      const step = (duration * 1000) / (words.length + 2)
      let k = 0
      timer = setInterval(() => { setWord(k++); if (k > words.length + 1) { clearInterval(timer); next() } }, step)
    } else if (scene.audioUrl) {
      audio = new Audio(scene.audioUrl)
      audio.onplay = () => setTalking(true)
      audio.onended = () => { setTalking(false); timer = setTimeout(next, 700) }
      audio.onerror = () => { timer = setTimeout(next, duration * 1000) }
      audio.ontimeupdate = () => {
        const ms = audio.currentTime * 1000
        const marks = scene.marks || []
        let idx = -1
        marks.forEach((m, k) => { if (m.time <= ms) idx = k })
        // Marks come from the same text split on spaces, so indexes line up; scale if they ever differ.
        setWord(idx < 0 ? -1 : marks.length === words.length ? idx : Math.round(((idx + 1) * words.length) / marks.length) - 1)
      }
      audio.play().catch(() => { timer = setTimeout(next, duration * 1000) })
    } else {
      stopSpeech = speak(scene.narration, lang, {
        onStart: () => setTalking(true),
        onWord: setWord,
        onEnd: () => { setTalking(false); timer = setTimeout(next, 700) },
      })
    }
    return () => {
      done = true
      clearTimeout(timer); clearInterval(timer)
      stopSpeech?.()
      audio?.pause()
      setTalking(false)
    }
  }, [i, intro, playing, muted, scene, words.length, lang, duration, tryAdvance])

  const jump = useCallback((n) => { finished.current = false; setIntro(false); setI(n); setPlaying(true) }, [])
  if (!scene && !intro) return null

  if (intro) {
    return (
      <main className="theatre">
        <div className="screen intro" role="region" aria-label={trailer.job}>
          <div className="intro-stage">
            <HostLine line={HOST.intro(t, trailer.job)} size={330} expr="happy" pose="wave" onDone={() => setTimeout(() => setIntro(false), 500)} />
          </div>
        </div>
        <div className="controls"><button onClick={() => setIntro(false)}>{t.skipIntro}</button></div>
      </main>
    )
  }

  return (
    <main className="theatre">
      <div className="screen" role="region" aria-label={trailer.job}>
        <OfficeScene key={i} index={i} kit={trailer.kit} screen={scene.screen || scene.title} talking={talking} duration={duration} label={t.sceneN(i + 1, scene.title)} />
        <div className="vignette" aria-hidden="true" />
        <p className="card" key={'t' + i}>{scene.title}</p>
        {sign && <SignPanel key={i} text={scene.narration} className="in-player"
          onReady={(has) => { if (gate.current.scene === i) { gate.current.sign = has; tryAdvance() } }}
          onEnded={() => { if (gate.current.scene === i) { gate.current.sign = 'done'; tryAdvance() } }} />}
        {caps && (
          <p className="subs" aria-live="polite">
            {words.map((w, k) => <span key={k} className={k <= word ? 'said' : ''}>{w} </span>)}
          </p>
        )}
      </div>

      <div className="controls">
        <button onClick={() => setPlaying((p) => !p)} aria-pressed={!playing}>{playing ? t.pause : t.play}</button>
        <button onClick={() => jump(0)}>{t.restart}</button>
        <button onClick={() => setMuted((m) => !m)} aria-pressed={muted}>{muted ? t.unmute : t.mute}</button>
        <button onClick={() => setCaps((c) => !c)} aria-pressed={caps}>{caps ? t.capsOn : t.capsOff}</button>
        <button onClick={() => jump(trailer.scenes.length)}>{t.skipCredits}</button>
      </div>
      <ol className="progress" aria-label="Scenes">
        {trailer.scenes.map((s, k) => (
          <li key={k} className={k < i ? 'seen' : k === i ? 'now' : ''}>
            <button onClick={() => jump(k)} aria-label={t.sceneN(k + 1, s.title)} aria-current={k === i} />
          </li>
        ))}
      </ol>
    </main>
  )
}
