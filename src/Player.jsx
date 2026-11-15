import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import OfficeScene from './OfficeScene.jsx'
import SignPanel from './SignPanel.jsx'
import { ColdOpen, EndCard } from './TitleCard.jsx'
import { startMusic, stopMusic, duck } from './music.js'
import { speak, preload } from './speech.js'
import { useAccess, useT } from './access.jsx'
import { signText } from './api.js'

// Plays the trailer: Bolt introduces it, then acts out six office scenes while narrating.
// Scenes from the API carry `audioUrl` and word `marks` (ElevenLabs, any language); demo scenes use speak().
// A sign-language window plays `scene.signUrl` when the ASL avatar service provides one.
// Clock time shown on each scene's lower-third card: one workday.
const TIMES = ['8:58 AM', '10:15 AM', '11:40 AM', '2:20 PM', '4:05 PM', '6:30 PM']

export default function Player({ trailer, onFinish }) {
  const t = useT()
  const { sign, lang } = useAccess()
  const [phase, setPhase] = useState('cold') // cold (title + Bolt says hi) | scenes | end
  const intro = phase === 'cold'
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
  // With sign language on, a line's voice and captions wait until its signing has arrived, so Bolt
  // speaks and signs together. Never wait more than 8 s: captions still carry the line.
  const [signReady, setSignReady] = useState(-1)
  const waitSign = sign && !intro && signReady !== i
  useEffect(() => {
    if (!waitSign) return
    const id = setTimeout(() => setSignReady(i), 8000)
    return () => clearTimeout(id)
  }, [waitSign, i])
  // Ask for every line's signing as soon as the trailer opens, so it is ready when its scene starts.
  useEffect(() => {
    if (!sign) return
    signText(t.hostIntro(trailer.job), lang)
    trailer.scenes.forEach((s) => s?.narration && signText(s.narration, lang))
  }, [sign, lang, trailer, t])

  // After the last scene, the end card, then the credits.
  useEffect(() => {
    if (i >= trailer.scenes.length && phase === 'scenes') setPhase('end')
  }, [i, trailer.scenes.length, phase])
  const finish = useCallback(() => { if (!finished.current) { finished.current = true; onFinish() } }, [onFinish])
  const company = trailer.company || trailer.research?.company || ''
  const brand = trailer.research?.brandColor || ''
  const logo = trailer.research?.logo || ''

  // Warm up the next scene's audio so scenes flow without a gap.
  useEffect(() => { const n = trailer.scenes[i + 1]; if (n?.audioUrl) new Audio(n.audioUrl).preload = 'auto' }, [i, trailer.scenes])
  useEffect(() => { preload(t.hostIntro(trailer.job), lang) }, [t, trailer.job, lang])
  // Music for the genre the viewer directed; quieter while Bolt talks.
  useEffect(() => { if (!muted && playing) startMusic(trailer.genre); else stopMusic() }, [muted, playing, trailer.genre])
  useEffect(() => () => stopMusic(), [])
  useEffect(() => { duck(talking) }, [talking])

  useEffect(() => {
    if (intro || !scene || !playing || waitSign) return
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
  }, [i, intro, playing, muted, scene, words.length, lang, duration, tryAdvance, waitSign])

  const jump = useCallback((n) => { finished.current = false; setPhase(n >= trailer.scenes.length ? 'end' : 'scenes'); setI(n); setPlaying(true) }, [trailer.scenes.length])

  if (phase === 'cold' || phase === 'end') {
    const Card = phase === 'cold' ? ColdOpen : EndCard
    return (
      <main className="theatre">
        <div className="screen" role="region" aria-label={trailer.job}>
          <Card company={company} role={trailer.job} logo={logo} brand={brand} outfit={trailer.outfit} onDone={phase === 'cold' ? () => setPhase('scenes') : finish} />
        </div>
        <div className="controls"><button onClick={phase === 'cold' ? () => setPhase('scenes') : finish}>{phase === 'cold' ? t.skipIntro : t.skipCredits}</button></div>
      </main>
    )
  }
  if (!scene) return null

  return (
    <main className="theatre">
      <div className="screen" role="region" aria-label={trailer.job}>
        <div className={`cine grade${i} genre-${trailer.genre || 'feelgood'}`} style={brand ? { '--brand': brand } : undefined}>
          <OfficeScene key={i} index={i} kit={trailer.kit} screen={scene.screen || scene.title} company={company} brand={brand} logo={logo} talking={talking} duration={duration} outfit={trailer.outfit} playing={playing} label={t.sceneN(i + 1, scene.title)} />
          <div className="grade-tint" aria-hidden="true" />
          <div className="cine-rays" aria-hidden="true" />
          <div className="cine-dust" aria-hidden="true">{Array.from({ length: 14 }).map((_, k) => <i key={k} style={{ '--k': k }} />)}</div>
          <div className="vignette" aria-hidden="true" />
          <div className="cine-grain" aria-hidden="true" />
          <div className="letterbox top" aria-hidden="true" /><div className="letterbox bottom" aria-hidden="true" />
          {i > 0 && <div className="wipe" key={'w' + i} aria-hidden="true" />}
          <div className="lower-third" key={'t' + i}>
            <span className="lt-time">{TIMES[i] || ''}</span>
            <span className="lt-title">{scene.title}</span>
            {company && <span className="lt-co">{logo && <img src={logo} alt="" />}{company}</span>}
          </div>
        </div>
        {sign && <SignPanel key={i} text={scene.narration} className="in-player" size={160}
          onReady={(has) => { if (gate.current.scene === i) { gate.current.sign = has; setSignReady(i); tryAdvance() } }}
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
      <ol className="progress" aria-label={t.scenesLabel}>
        {trailer.scenes.map((s, k) => (
          <li key={k} className={k < i ? 'seen' : k === i ? 'now' : ''}>
            <button onClick={() => jump(k)} aria-label={t.sceneN(k + 1, s.title)} aria-current={k === i} />
          </li>
        ))}
      </ol>
    </main>
  )
}
