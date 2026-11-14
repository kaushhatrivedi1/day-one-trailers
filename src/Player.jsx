import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LANGUAGES } from './mock.js'
import Cleo from './Cleo.jsx'
import HostLine from './Host.jsx'
import { HOST } from './signs.js'
import { speak, pickVoice } from './speech.js'
import { useAccess } from './access.jsx'

// Plays the trailer. Bolt introduces it, then narrates in the corner while frames play with karaoke captions.
// Live scenes carry `audioUrl`, Polly `marks` (words) and `visemes` (mouth shapes). Demo scenes use the browser voice.
export default function Player({ trailer, onFinish }) {
  const { sign } = useAccess()
  const [intro, setIntro] = useState(true)
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(false)
  const [caps, setCaps] = useState(true)
  const [word, setWord] = useState(-1)
  const [viseme, setViseme] = useState(null)
  const [talking, setTalking] = useState(false)
  const voiceLang = LANGUAGES.find((l) => l.code === trailer.lang)?.voice || 'en-US'
  const scene = trailer.scenes[i]
  const words = useMemo(() => (scene ? scene.narration.split(/\s+/) : []), [scene])
  const finished = useRef(false)

  useEffect(() => {
    if (i >= trailer.scenes.length && !finished.current) { finished.current = true; onFinish() }
  }, [i, trailer.scenes.length, onFinish])

  useEffect(() => {
    if (intro || !scene || !playing) return
    let done = false
    let audio, timer, stopSpeech
    const next = () => { if (!done) { done = true; setTalking(false); setI((n) => n + 1) } }
    const estimate = Math.max(5200, words.length * 430 + 1600)
    setWord(-1)
    let evented = false
    const t0 = Date.now()
    const ticker = setInterval(() => {
      if (evented) return
      const el = Date.now() - t0
      if (el > 700) setWord(Math.min(words.length - 1, Math.floor((el - 700) / 400)))
    }, 120)

    if (muted) {
      timer = setTimeout(next, estimate)
    } else if (scene.audioUrl) {
      audio = new Audio(scene.audioUrl)
      audio.onplay = () => setTalking(true)
      audio.onended = () => setTimeout(next, 500)
      audio.ontimeupdate = () => {
        evented = true
        const ms = audio.currentTime * 1000
        if (scene.marks) {
          let idx = -1
          scene.marks.forEach((m, k) => { if (m.time <= ms) idx = k })
          // Polly splits words slightly differently than a space split, so scale to match.
          setWord(idx < 0 ? -1 : Math.min(words.length - 1, Math.round(((idx + 1) * words.length) / scene.marks.length) - 1))
        }
        if (scene.visemes) {
          let v = null
          scene.visemes.forEach((m) => { if (m.time <= ms) v = m.value })
          setViseme(v)
        }
      }
      audio.play().catch(() => { timer = setTimeout(next, estimate) })
    } else {
      stopSpeech = speak(scene.narration, voiceLang, {
        onStart: () => setTalking(true),
        onEnd: () => setTimeout(next, 700),
      })
      timer = setTimeout(next, estimate + 9000)
      // word highlight is time-driven in demo mode (the ticker above)
      evented = false
    }
    return () => {
      done = true
      clearInterval(ticker)
      clearTimeout(timer)
      stopSpeech?.()
      audio?.pause()
      setTalking(false); setViseme(null)
    }
  }, [i, intro, playing, muted, scene, words.length, voiceLang])

  const jump = useCallback((n) => { finished.current = false; setIntro(false); setI(n); setPlaying(true) }, [])
  if (!scene && !intro) return null

  if (intro) {
    return (
      <main className="theatre">
        <div className="screen intro" role="region" aria-label="Bolt introduces the trailer">
          <div className="intro-stage">
            <HostLine line={HOST.intro(trailer.job)} lang={voiceLang} size={330} expr="happy" pose="wave" onDone={() => setTimeout(() => setIntro(false), 500)} />
          </div>
        </div>
        <div className="controls"><button onClick={() => setIntro(false)}>Skip intro</button></div>
      </main>
    )
  }

  return (
    <main className="theatre">
      <div className="screen" role="region" aria-label={`${trailer.job} trailer`}>
        <img key={i} className={`frame-img kb${i % 4}`} src={scene.image} alt={`Scene ${i + 1}: ${scene.title}`} style={{ '--dur': `${Math.max(5.2, words.length * 0.43 + 1.6)}s` }} />
        <div className="vignette" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        <p className="card" key={'t' + i}>{scene.title}</p>
        <div className="pip" aria-hidden="false">
          <Cleo size={150} expr="happy" pose="rest" speaking={talking && !viseme} viseme={viseme || undefined} lookAt={false} label="Cleo, narrating" />
        </div>
        {sign && scene.signUrl && (
          <video className="signwin" key={scene.signUrl} src={scene.signUrl} autoPlay muted playsInline aria-label="Sign language window" />
        )}
        {caps && (
          <p className="subs" aria-live="polite">
            {words.map((w, k) => <span key={k} className={k <= word ? 'said' : ''}>{w} </span>)}
          </p>
        )}
      </div>

      <div className="controls">
        <button onClick={() => setPlaying((p) => !p)} aria-pressed={!playing}>{playing ? 'Pause' : 'Play'}</button>
        <button onClick={() => jump(0)}>Restart</button>
        <button onClick={() => setMuted((m) => !m)} aria-pressed={muted}>{muted ? 'Unmute' : 'Mute'}</button>
        <button onClick={() => setCaps((c) => !c)} aria-pressed={caps}>Captions {caps ? 'on' : 'off'}</button>
        <button onClick={() => jump(trailer.scenes.length)}>Skip to credits</button>
      </div>
      <ol className="progress" aria-label="Scenes">
        {trailer.scenes.map((s, k) => (
          <li key={k} className={k < i ? 'seen' : k === i ? 'now' : ''}>
            <button onClick={() => jump(k)} aria-label={`Scene ${k + 1}: ${s.title}`} aria-current={k === i} />
          </li>
        ))}
      </ol>
      {sign && !scene.signUrl && <p className="note center">Captions are always on. Full sign language for the narration needs the ASL avatar service from the backend; Bolt signs his own lines.</p>}
      {trailer.source === 'demo' && !trailer.translated && trailer.lang !== 'en' && (
        <p className="note center">Demo mode only has English and Spanish scripts. The AWS backend translates into every language with Amazon Translate.</p>
      )}
    </main>
  )
}
