import { useEffect, useRef, useState } from 'react'
import Cleo from './Cleo.jsx'
import HostLine from './Host.jsx'
import { HOST } from './signs.js'
import Wave from './Wave.jsx'
import useMic from './useMic.js'
import { getScreenTest, scoreScreenTest } from './api.js'
import { LANGUAGES } from './mock.js'
import { useAccess } from './access.jsx'
import SignClip, { useSignClip } from './SignClip.jsx'

export default function ScreenTest({ job, lang, onExit }) {
  const voiceLang = LANGUAGES.find((l) => l.code === lang)?.voice || 'en-US'
  const mic = useMic(voiceLang)
  const { sign } = useAccess()
  const [qs, setQs] = useState(null)
  const [n, setN] = useState(0)
  const [answers, setAnswers] = useState([])
  const [text, setText] = useState('')
  const [hint, setHint] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [snap, setSnap] = useState(0)
  const textRef = useRef(null)

  useEffect(() => { getScreenTest({ job, lang }).then((d) => setQs(d.questions)) }, [job, lang])

  // Live transcript flows into the editable answer box.
  useEffect(() => { if (mic.listening && mic.transcript) setText(mic.transcript) }, [mic.transcript, mic.listening])

  const q = qs?.[n]
  const clip = useSignClip(sign ? q?.id : null)
  const say = () => {
    if (!q || !('speechSynthesis' in window)) return
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(q.q)
    u.lang = voiceLang
    u.onstart = () => setSpeaking(true)
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    speechSynthesis.speak(u)
  }
  useEffect(() => { if (q) { setSnap((s) => s + 1); say() } return () => 'speechSynthesis' in window && speechSynthesis.cancel() }, [q]) // eslint-disable-line

  const submit = async () => {
    mic.stop()
    const next = [...answers, text.trim()]
    setAnswers(next)
    setText('')
    setHint(false)
    if (n + 1 < qs.length) { setN(n + 1); return }
    setBusy(true)
    const r = await scoreScreenTest({ job, lang, answers: next })
    setResult(r)
    setBusy(false)
  }

  if (!qs) return <main className="audition"><p className="note center">Setting up the stage.</p></main>

  if (result) {
    return (
      <main className="audition done">
        <div className="verdict">
          <HostLine line={HOST.good()} size={230} expr="cheer" pose="thumbsup" lang={voiceLang} />
          <h2 className="verdict-h">That’s a wrap on your Screen Test</h2>
          <dl className="notes">
            <div><dt>What worked</dt><dd>{result.strongest}</dd></div>
            <div><dt>One thing to fix</dt><dd>{result.fix}</dd></div>
            <div><dt>Try this next</dt><dd>{result.rehearse}</dd></div>
          </dl>
          <div className="row">
            <button className="btn-roll" onClick={() => { setResult(null); setN(0); setAnswers([]) }}>Take it again</button>
            <button className="btn-ghost" onClick={onExit}>Back to the lobby</button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="audition">
      <div className="spot" aria-hidden="true" />
      <div className="stage">
        {sign && clip && <SignClip src={clip} label={`A signer asks the question in American Sign Language: ${q.q}`} />}
        <div className="coach">
          <Cleo size={230} expr={mic.listening ? 'caring' : 'happy'} pose={mic.listening ? 'rest' : speaking ? 'present' : 'rest'} speaking={speaking} label="Bolt, your interviewer and coach" />
        </div>
        <section className="ask" aria-live="polite">
          <p className="count">Question {n + 1} of {qs.length}</p>
          <h2 className="question">{q.q}</h2>
          <div className="row">
            <button className="btn-ghost" onClick={say}>Hear it again</button>
            <button className="btn-ghost" onClick={() => setHint((h) => !h)} aria-expanded={hint}>What are they asking?</button>
          </div>
          {hint && <p className="hint">{q.plain}</p>}
          {sign && clip === null && <p className="note">This question has no sign language video yet. It is written above, and you can type your answer.</p>}
        </section>
      </div>

      <section className="answer" aria-label="Your answer">
        <Wave analyser={mic.analyser} active={mic.listening} />
        <div className="row center">
          {mic.supported && (
            <button className={mic.listening ? 'btn-rec on' : 'btn-rec'} onClick={() => (mic.listening ? mic.stop() : mic.start())} aria-pressed={mic.listening}>
              {mic.listening ? 'Stop recording' : 'Answer out loud'}
            </button>
          )}
        </div>
        {mic.listening && mic.engine && <p className="engine">Hearing you with {mic.engine}</p>}
        {mic.error && <p className="err" role="alert">{mic.error}</p>}
        {!mic.canTranscribe && mic.supported && <p className="note center">This browser can’t turn speech into text. Use Chrome, or type your answer.</p>}
        <label className="field">
          <span>Your answer (speak it, or type it)</span>
          <textarea ref={textRef} rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Start with the point, then tell the story." />
        </label>
        <div className="row center">
          <button className="btn-roll" onClick={submit} disabled={busy || !text.trim()}>
            {busy ? 'Reading your answers' : n + 1 < qs.length ? 'Next question' : 'Finish the Screen Test'}
          </button>
          <button className="btn-ghost" onClick={onExit}>Leave</button>
        </div>
      </section>
    </main>
  )
}
