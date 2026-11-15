import { useEffect, useRef, useState } from 'react'
import Cleo from './Cleo.jsx'
import HostLine from './Host.jsx'
import { HOST } from './signs.js'
import Wave from './Wave.jsx'
import useMic from './useMic.js'
import { interviewNext, interviewFeedback, usingDemoData } from './api.js'
import { speak } from './speech.js'
import { pdfText } from './pdfText.js'
import { langInfo } from './i18n.js'
import { useAccess, useT } from './access.jsx'
import SignPanel from './SignPanel.jsx'

// The adaptive interview: resume in, then one question at a time. After every answer the AI
// decides whether to follow up, probe the resume, test a job skill, or finish; then a report
// scores each answer with a quote of what was actually said.
// Overall score as a ring that fills to n/5.
const Dial = ({ n }) => {
  const c = 2 * Math.PI * 52
  return (
    <svg className="dial" viewBox="0 0 120 120" role="img" aria-label={`${n} / 5`}>
      <circle cx="60" cy="60" r="52" className="dial-track" />
      <circle cx="60" cy="60" r="52" className="dial-fill" style={{ '--len': c, '--off': c * (1 - n / 5) }} />
      <text x="60" y="68" textAnchor="middle" className="dial-num">{n}<tspan className="dial-of">/5</tspan></text>
    </svg>
  )
}

const Stars = ({ n }) => (
  <span className="stars" aria-label={`${n} / 5`}>{[1, 2, 3, 4, 5].map((k) => <i key={k} className={k <= n ? 'on' : ''} />)}</span>
)

export default function ScreenTest({ job, jd = '', onExit }) {
  const t = useT()
  const { lang, sign, guest } = useAccess()
  const mic = useMic(langInfo(lang).voice)
  const [stage, setStage] = useState('resume') // resume | asking | report
  const [resume, setResume] = useState('')
  const [pdfState, setPdfState] = useState('')
  const [history, setHistory] = useState([])
  const [turn, setTurn] = useState(null) // { question, why, kind, focus }
  const [text, setText] = useState('')
  const [hint, setHint] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const [report, setReport] = useState(null)
  const [reaction, setReaction] = useState(null) // { score, note } for the last answer
  const [scores, setScores] = useState([])
  const stopVoice = useRef(null)

  useEffect(() => { if (mic.listening && mic.transcript) setText(mic.transcript) }, [mic.transcript, mic.listening])
  useEffect(() => () => stopVoice.current?.(), [])

  const say = (q) => {
    stopVoice.current?.()
    stopVoice.current = speak(q, lang, { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) })
  }

  const onPdf = async (file) => {
    if (!file) return
    setPdfState('reading')
    try {
      const txt = await pdfText(file)
      if (txt.length < 40) throw new Error('no text')
      setResume(txt)
      setPdfState('')
    } catch { setPdfState('fail') }
  }

  const finish = async (hist) => {
    stopVoice.current?.()
    mic.stop()
    setStage('report'); setBusy(true); setErr('')
    try { setReport(await interviewFeedback({ job, jd, lang, resume, history: hist, guest })) } catch { setErr(t.ivErr) } finally { setBusy(false) }
  }

  const ask = async (hist) => {
    setBusy(true); setErr('')
    try {
      const r = await interviewNext({ job, jd, lang, resume, history: hist, guest })
      if (r.done || !r.question) { setBusy(false); return finish(hist) }
      if (r.lastAnswer?.score) { setReaction(r.lastAnswer); setScores((sc) => [...sc, r.lastAnswer.score]) }
      setTurn(r)
      setHint(false)
      setStage('asking')
      say(r.question)
    } catch { setErr(t.ivErr) }
    setBusy(false)
  }

  const submit = async () => {
    mic.stop()
    const next = [...history, { q: turn.question, a: text.trim(), kind: turn.kind, focus: turn.focus }]
    setHistory(next)
    setText('')
    await ask(next)
  }

  const restart = () => { setHistory([]); setTurn(null); setReport(null); setReaction(null); setScores([]); setStage('resume') }

  if (usingDemoData) {
    return <main className="audition"><p className="note center">{t.ivNeedApi}</p><div className="row center"><button className="btn-ghost" onClick={onExit}>{t.ivLobby}</button></div></main>
  }

  if (stage === 'resume') {
    return (
      <main className="audition">
        <div className="stage">
          <div className="coach"><Cleo size={200} expr="happy" pose="present" label="Bolt" /></div>
          <section className="ask">
            <p className="count">{t.ivTitle} · {job}</p>
            <h2 className="question">{t.ivResumeH}</h2>
            <p className="hint">{t.ivResumeHelp}</p>
          </section>
        </div>
        <section className="answer resume-box">
          <label className="field">
            <span>{t.ivResumeH}</span>
            <textarea rows={9} value={resume} onChange={(e) => setResume(e.target.value)} placeholder={t.ivPastePh} />
          </label>
          <div className="row center">
            <label className="btn-ghost file-btn">
              {pdfState === 'reading' ? t.ivReading : t.ivUpload}
              <input type="file" accept="application/pdf" onChange={(e) => onPdf(e.target.files?.[0])} hidden />
            </label>
          </div>
          {pdfState === 'fail' && <p className="err" role="alert">{t.ivPdfFail}</p>}
          {!resume.trim() && <p className="note center">{t.ivNoResume}</p>}
          {err && <p className="err" role="alert">{err}</p>}
          <div className="row center">
            <button className="btn-roll" onClick={() => ask([])} disabled={busy}>{busy ? t.ivThinking : t.ivBegin}</button>
            <button className="btn-ghost" onClick={onExit}>{t.ivLeave}</button>
          </div>
        </section>
      </main>
    )
  }

  if (stage === 'report') {
    return (
      <main className="audition done">
        <div className="verdict">
          {report ? <HostLine line={HOST.good(t)} size={200} expr="cheer" pose="thumbsup" /> : <Cleo size={160} expr="think" pose="think" label="Bolt" />}
          <h2 className="verdict-h">{t.ivReportH}</h2>
          {busy && <p className="note center" aria-live="polite">{t.ivWriting}</p>}
          {err && <p className="err" role="alert">{err}</p>}
          {report && (
            <>
              <div className="overall">
                <span className="overall-label">{t.ivOverall}</span>
                <Dial n={report.overall?.score || 0} />
                <p>{report.overall?.verdict}</p>
              </div>
              <div className="lists">
                {[[t.ivStrengths, report.strengths, 'good'], [t.ivGaps, report.gaps, 'gap'], [t.ivNext, report.next, 'next']].map(([h, items, cls]) => (
                  <section key={cls} className={`list ${cls}`}><h3>{h}</h3><ul>{(items || []).filter(Boolean).map((x, i) => <li key={i}>{x}</li>)}</ul></section>
                ))}
              </div>
              <h3 className="credits-h">{t.ivByAnswer}</h3>
              <ol className="answers">
                {(report.answers || []).map((a, i) => (
                  <li key={i}>
                    <p className="a-q"><Stars n={a.score || 0} /> {a.q}</p>
                    {a.quote && <blockquote><span>{t.ivYouSaid}:</span> “{a.quote}”</blockquote>}
                    {a.strength && <p className="a-good">✓ {a.strength}</p>}
                    {a.fix && <p className="a-fix"><b>{t.ivFix}:</b> {a.fix}</p>}
                  </li>
                ))}
              </ol>
            </>
          )}
          <div className="row">
            <button className="btn-roll" onClick={restart}>{t.ivAgain}</button>
            <button className="btn-ghost" onClick={onExit}>{t.ivLobby}</button>
          </div>
        </div>
      </main>
    )
  }

  // asking
  const n = history.length + 1
  return (
    <main className="audition">
      <div className="spot" aria-hidden="true" />
      <div className="stage">
        <div className="coach">
          <Cleo size={230} expr={busy ? 'think' : mic.listening ? 'caring' : reaction ? (reaction.score >= 4 ? 'cheer' : reaction.score <= 2 ? 'caring' : 'happy') : 'happy'}
            pose={busy ? 'think' : speaking ? 'present' : reaction?.score >= 4 ? 'thumbsup' : 'rest'} speaking={speaking} label="Bolt" />
          {reaction?.note && !busy && (
            <p className={`reaction s${reaction.score}`} key={history.length} aria-live="polite">
              <Stars n={reaction.score} /> {reaction.note}
            </p>
          )}
          {scores.length > 0 && <ol className="meter" aria-label="Scores so far">{scores.map((sc, k) => <li key={k} className={`s${sc}`} title={`${sc}/5`} />)}</ol>}
        </div>
        <section className="ask" aria-live="polite">
          <p className="count">
            {t.ivQ(n)}
            {turn?.kind === 'followup' && <span className="tag follow">{t.ivFollow}</span>}
            {turn?.focus && <span className="tag">{t.ivTesting(turn.focus)}</span>}
          </p>
          <h2 className="question">{busy ? t.ivThinking : turn?.question}</h2>
          {!busy && (
            <div className="row">
              <button className="btn-ghost" onClick={() => say(turn.question)}>{t.ivHear}</button>
              <button className="btn-ghost" onClick={() => setHint((h) => !h)} aria-expanded={hint}>{t.ivWhy}</button>
            </div>
          )}
          {hint && turn?.why && <p className="hint">{turn.why}</p>}
        </section>
        {sign && !busy && turn?.question && <SignPanel text={turn.question} loop size={220} />}
      </div>

      <section className="answer" aria-label={t.ivAnswerLabel}>
        <Wave analyser={mic.analyser} active={mic.listening} />
        <div className="row center">
          {mic.supported && (
            <button className={mic.listening ? 'btn-rec on' : 'btn-rec'} onClick={() => (mic.listening ? mic.stop() : mic.start())} aria-pressed={mic.listening} disabled={busy}>
              {mic.listening ? t.ivStop : t.ivSpeak}
            </button>
          )}
        </div>
        {mic.error && <p className="err" role="alert">{mic.error}</p>}
        {!mic.canTranscribe && mic.supported && <p className="note center">{t.ivNoStt}</p>}
        <label className="field">
          <span>{t.ivAnswerLabel}</span>
          <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={t.ivAnswerPh} disabled={busy} />
        </label>
        {err && <p className="err" role="alert">{err}</p>}
        <div className="row center">
          <button className="btn-roll" onClick={submit} disabled={busy || !text.trim()}>{busy ? t.ivThinking : t.ivSend}</button>
          <button className="btn-ghost" onClick={() => finish(history)} disabled={busy || history.length === 0}>{t.ivEnd}</button>
        </div>
      </section>
    </main>
  )
}
