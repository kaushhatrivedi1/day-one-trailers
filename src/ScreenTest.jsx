import { useEffect, useMemo, useRef, useState } from 'react'
import Cleo from './Cleo.jsx'
import Bolt from './Outfit.jsx'
import Wave from './Wave.jsx'
import useMic from './useMic.js'
import { interviewNext, interviewFeedback, usingDemoData } from './api.js'
import { speak } from './speech.js'
import { pdfText } from './pdfText.js'
import { langInfo } from './i18n.js'
import { useAccess, useT } from './access.jsx'
import SignPanel from './SignPanel.jsx'

// The Screen Test, as a video call. Resume in (drop, upload or paste; Bolt shows what he picked up),
// then Bolt's camera beside yours: he asks each question out loud, as a subtitle, and in sign
// language, reacts to every answer, and follows up when it's vague. Then a game-style results screen.
// Your camera is optional, shown only on this device, and never recorded or sent anywhere.

const SKILLS = ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'SQL', 'React', 'Node.js', 'HTML', 'CSS', 'Git', 'AWS', 'Azure', 'Docker', 'Kubernetes', 'Excel', 'Tableau', 'Power BI', 'R', 'Pandas', 'Machine learning', 'Figma', 'Photoshop', 'Salesforce', 'SEO', 'Linux', 'Swift', 'Kotlin', 'Flutter', 'MongoDB', 'PostgreSQL', 'TensorFlow', 'PyTorch', 'Accounting', 'QuickBooks', 'Customer service', 'Leadership', 'Public speaking', 'Spanish', 'Data analysis']
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const has = (text, k) => new RegExp(`(^|[^a-z])${esc(k.toLowerCase())}([^a-z]|$)`).test(text)

// What Bolt picked up from the resume: skills, projects worth asking about, and gaps vs. the job.
function scan(resume, jd) {
  const low = resume.toLowerCase(), jlow = (jd || '').toLowerCase()
  const skills = SKILLS.filter((k) => has(low, k)).slice(0, 8)
  const projects = resume.split(/\n|•|·/).map((l) => l.trim()).filter((l) => /\b(built|created|developed|made|designed|led|launched|won|organized|organised)\b/i.test(l) && l.length < 140).slice(0, 3).map((l) => l.replace(/^[-*\d.)\s]+/, '').slice(0, 60))
  const gaps = jlow ? SKILLS.filter((k) => has(jlow, k) && !has(low, k)).slice(0, 3) : []
  if (!/intern/i.test(resume)) gaps.push('internship')
  return { skills, projects, gaps: gaps.slice(0, 4) }
}

// The part of Bolt's turn that is the actual question (the last sentence with a '?'), which is what
// he signs; the greeting or comment before it stays in the captions.
const questionPart = (text) => {
  const parts = String(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text]
  const q = [...parts].reverse().find((p) => p.includes('?'))
  return (q || text).trim()
}

const RANKS = [[90, 'Star of the show'], [75, 'Rising star'], [60, 'Strong audition'], [40, 'Promising understudy'], [0, 'First rehearsal']]

function Dial({ value }) {
  const c = 2 * Math.PI * 95
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf, t0
    const f = (t) => { t0 ??= t; const p = Math.min(1, (t - t0) / 2000); setV(Math.round(value * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(f) }
    const id = setTimeout(() => { raf = requestAnimationFrame(f) }, 300)
    return () => { clearTimeout(id); cancelAnimationFrame(raf) }
  }, [value])
  return (
    <div className="rs-dial" role="img" aria-label={`${value} / 100`}>
      <svg viewBox="0 0 220 220"><circle cx="110" cy="110" r="95" className="rs-track" />
        <circle cx="110" cy="110" r="95" className="rs-arc" style={{ strokeDasharray: c, strokeDashoffset: c * (1 - v / 100) }} />
        <defs><linearGradient id="rsg"><stop offset="0" stopColor="#8f7cff" /><stop offset=".6" stopColor="#2FD3C0" /><stop offset="1" stopColor="#FFD25A" /></linearGradient></defs></svg>
      <div className="rs-val"><b>{v}</b><small>/ 100</small></div>
    </div>
  )
}

function Results({ report, history, times, jd, busy, err, t, onAgain, onExit }) {
  const answers = report?.answers || []
  const score = Math.round(((report?.overall?.score || 0) / 5) * 100)
  const rank = RANKS.find(([min]) => score >= min)[1]
  const xp = answers.reduce((n, a) => n + (a.score || 0) * 40, 0) + history.length * 20
  const lvl = Math.floor(xp / 300) + 1
  const sc = answers.map((a) => a.score || 0)
  const comeback = history.some((h, i) => h.kind === 'followup' && i > 0 && (sc[i] || 0) > (sc[i - 1] || 0))
  const badges = [
    { id: 'story', icon: '🎬', got: sc.some((s) => s >= 4) },
    { id: 'comeback', icon: '🔁', got: comeback },
    { id: 'finisher', icon: '🏁', got: history.length >= 4 },
    { id: 'quick', icon: '⚡', got: times.length > 0 && times.every((s) => s <= 60) },
    { id: 'allstar', icon: '🌟', got: (report?.overall?.score || 0) >= 4 },
  ]
  const [conf, setConf] = useState(false)
  useEffect(() => { if (report) { const id = setTimeout(() => setConf(true), 2300); return () => clearTimeout(id) } }, [report])
  if (!report) {
    return (
      <main className="results waiting">
        <Cleo size={170} expr="think" pose="think" label="Bolt" />
        <h2>{t.ivReportH}</h2>
        {busy && <p aria-live="polite">{t.ivWriting}</p>}
        {err && <p className="err" role="alert">{err}</p>}
        {!busy && <div className="rs-row"><button className="btn-roll" onClick={onAgain}>{t.ivAgain}</button><button className="btn-ghost" onClick={onExit}>{t.ivLobby}</button></div>}
      </main>
    )
  }
  return (
    <main className="results">
      {conf && <div className="rs-conf" aria-hidden="true">{Array.from({ length: 60 }).map((_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, background: ['#ff6b9a', '#ffd25a', '#2fd3c0', '#8f7cff'][i % 4], animationDelay: `${(i % 10) * 0.06}s` }} />)}</div>}
      <section className="rs-hero">
        <Dial value={score} />
        <div className="rs-rank">
          <small>{t.rsComplete}</small>
          <h1>{t.ranks?.[rank] || rank}</h1>
          <p>{report.overall?.verdict}</p>
          <div className="rs-xp"><i style={{ '--w': `${Math.min(100, ((xp % 300) / 300) * 100)}%` }} /></div>
          <small className="rs-lvl">{t.rsLevel(lvl, xp)}</small>
        </div>
        <Cleo size={160} pose={conf ? 'cheer' : 'think'} expr={conf ? 'cheer' : 'think'} label="Bolt" />
      </section>

      <h2 className="rs-h">{t.rsBadges}</h2>
      <div className="rs-badges">
        {badges.map((b, k) => (
          <div key={b.id} className={`rs-badge ${b.got ? 'got' : 'locked'}`} style={{ '--k': k }}>
            <div className="rs-medal" aria-hidden="true">{b.icon}</div>
            <b>{t.badges[b.id][0]}</b><small>{b.got ? t.badges[b.id][1] : `${t.rsLocked}: ${t.badges[b.id][2]}`}</small>
          </div>
        ))}
      </div>

      <h2 className="rs-h">{t.rsReplay}</h2>
      <p className="rs-hint">{t.rsFlip}</p>
      <div className="rs-answers">
        {answers.map((a, i) => (
          <button key={i} className="rs-ans" style={{ '--k': i }} onClick={(e) => e.currentTarget.classList.toggle('flip')} aria-label={`${t.ivQ(i + 1)}. ${a.quote || ''}. ${t.ivFix}: ${a.fix || a.strength || ''}`}>
            <span className="rs-card">
              <span className="rs-face">
                <small>{t.ivQ(i + 1)}{history[i]?.kind === 'followup' ? ` · ${t.ivFollow}` : ''}</small>
                <span className="rs-q">{a.q || history[i]?.q}</span>
                {a.quote && <q>{a.quote}</q>}
                <span className="rs-score">{[1, 2, 3, 4, 5].map((k) => <i key={k} className={k <= (a.score || 0) ? 'on' : ''} />)}</span>
              </span>
              <span className="rs-face back">
                {a.strength && <span className="rs-good">✓ {a.strength}</span>}
                {a.fix && <><b>{t.ivFix}</b><span>{a.fix}</span></>}
              </span>
            </span>
          </button>
        ))}
      </div>

      <h2 className="rs-h">{t.rsQuests}</h2>
      <div className="rs-quests">
        <ul>
          {[...(report.next || []), ...(report.gaps || [])].filter(Boolean).slice(0, 3).map((q, k) => (
            <li key={k} className="rs-quest" style={{ '--k': k }}><span className="rs-qi" aria-hidden="true">{['🎯', '🧭', '📊'][k]}</span><span>{q}</span><b>+{150 - k * 25} XP</b></li>
          ))}
          <li className="rs-quest"><span className="rs-qi" aria-hidden="true">🎬</span><span>{t.rsRematch}</span><b>+200 XP</b></li>
        </ul>
        <div className="rs-note"><Cleo size={110} pose="thumbsup" expr="happy" label="Bolt" /><p>{t.rsRemember}</p></div>
      </div>

      {report.strengths?.length > 0 && (
        <details className="rs-more"><summary>{t.ivStrengths} · {t.ivGaps}</summary>
          <ul>{report.strengths.map((x, i) => <li key={'s' + i}>✓ {x}</li>)}{(report.gaps || []).map((x, i) => <li key={'g' + i}>→ {x}</li>)}</ul>
        </details>
      )}
      <div className="rs-row"><button className="btn-roll" onClick={onAgain}>{t.rsRematchBtn}</button><button className="btn-ghost" onClick={onExit}>{t.ivLobby}</button></div>
    </main>
  )
}

export default function ScreenTest({ job, jd = '', outfit, onExit }) {
  const t = useT()
  const { lang, sign, guest } = useAccess()
  const mic = useMic(langInfo(lang).voice)
  const [stage, setStage] = useState('resume') // resume | asking | report
  const [resume, setResume] = useState('')
  const [paste, setPaste] = useState(false)
  const [over, setOver] = useState(false)
  const [pdfState, setPdfState] = useState('')
  const [history, setHistory] = useState([])
  const [times, setTimes] = useState([])
  const [turn, setTurn] = useState(null)
  const [text, setText] = useState('')
  const [hint, setHint] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const [report, setReport] = useState(null)
  const [reaction, setReaction] = useState(null)
  const [signState, setSignState] = useState(null) // null | 'on' | 'none'
  const [cam, setCam] = useState('off') // off | on | denied
  const [left, setLeft] = useState(90)
  const video = useRef(null), streamRef = useRef(null), stopVoice = useRef(null), askedAt = useRef(0)
  const picked = useMemo(() => (resume.trim().length > 40 ? scan(resume, jd) : null), [resume, jd])

  useEffect(() => { if (mic.listening && mic.transcript) setText(mic.transcript) }, [mic.transcript, mic.listening])
  useEffect(() => () => { stopVoice.current?.(); streamRef.current?.getTracks().forEach((k) => k.stop()) }, [])
  // The answer timer: 90 seconds per question, shown as a ring on your tile.
  useEffect(() => {
    if (stage !== 'asking' || busy || !turn) return
    setLeft(90)
    const id = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000)
    return () => clearInterval(id)
  }, [turn, busy, stage])

  const say = (q) => {
    stopVoice.current?.()
    stopVoice.current = speak(q, lang, { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) })
  }
  const camOn = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = s; setCam('on')
      requestAnimationFrame(() => { if (video.current) video.current.srcObject = s })
    } catch { setCam('denied') }
  }
  const camOff = () => { streamRef.current?.getTracks().forEach((k) => k.stop()); streamRef.current = null; setCam('off') }

  const onFile = async (file) => {
    if (!file) return
    setPdfState('reading')
    try {
      const txt = file.type === 'application/pdf' || /\.pdf$/i.test(file.name) ? await pdfText(file) : await file.text()
      if (txt.trim().length < 40) throw new Error('no text')
      setResume(txt); setPdfState('')
    } catch { setPdfState('fail') }
  }

  const finish = async (hist) => {
    stopVoice.current?.(); mic.stop(); camOff()
    setStage('report'); setBusy(true); setErr('')
    try { setReport(await interviewFeedback({ job, jd, lang, resume, history: hist, guest })) } catch { setErr(t.ivErr) } finally { setBusy(false) }
  }

  const ask = async (hist) => {
    setBusy(true); setErr('')
    try {
      const r = await interviewNext({ job, jd, lang, resume, history: hist, guest })
      if (r.done || !r.question) { setBusy(false); return finish(hist) }
      setReaction(r.lastAnswer?.score ? { ...r.lastAnswer, n: hist.length } : null)
      setSignState(null)
      setTurn(r); setHint(false); setStage('asking')
      askedAt.current = Date.now()
      // Let the reaction land before the next question starts.
      setTimeout(() => say(r.question), r.lastAnswer?.score ? 1400 : 300)
    } catch { setErr(t.ivErr) }
    setBusy(false)
  }

  const submit = async () => {
    if (!text.trim()) return
    mic.stop()
    setTimes((s) => [...s, Math.round((Date.now() - askedAt.current) / 1000)])
    const next = [...history, { q: turn.question, a: text.trim(), kind: turn.kind, focus: turn.focus }]
    setHistory(next); setText('')
    await ask(next)
  }
  const restart = () => { setHistory([]); setTimes([]); setTurn(null); setReport(null); setReaction(null); setStage('resume') }

  if (usingDemoData) {
    return <main className="audition"><p className="note center">{t.ivNeedApi}</p><div className="row center"><button className="btn-ghost" onClick={onExit}>{t.ivLobby}</button></div></main>
  }

  if (stage === 'report') return <Results report={report} history={history} times={times} jd={jd} busy={busy} err={err} t={t} onAgain={restart} onExit={onExit} />

  if (stage === 'resume') {
    return (
      <main className="st-prep">
        <h1>{t.ivTitle}</h1>
        <p className="st-lead">{t.stLead(job)}</p>
        <div className="st-grid">
          <div>
            {paste ? (
              <label className="field st-paste"><span>{t.ivResumeH}</span>
                <textarea rows={12} value={resume} onChange={(e) => setResume(e.target.value)} placeholder={t.ivPastePh} autoFocus />
              </label>
            ) : (
              <label className={`st-drop ${over ? 'over' : ''} ${resume ? 'has' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
                onDrop={(e) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files?.[0]) }}>
                <input type="file" accept="application/pdf,.txt,text/plain" hidden onChange={(e) => onFile(e.target.files?.[0])} />
                {resume ? (
                  <span className="st-paper"><span className="st-scan" aria-hidden="true" />{resume.slice(0, 900)}</span>
                ) : (
                  <span className="st-drop-in"><span className="st-ico" aria-hidden="true">📄</span><b>{pdfState === 'reading' ? t.ivReading : t.stDrop}</b><small>{t.stDropHelp}</small></span>
                )}
              </label>
            )}
            <div className="st-under">
              <button type="button" className="link-btn" onClick={() => setPaste((p) => !p)}>{paste ? t.stUseFile : t.stPaste}</button>
              {resume && <button type="button" className="link-btn" onClick={() => setResume('')}>{t.stClear}</button>}
            </div>
            {pdfState === 'fail' && <p className="err" role="alert">{t.ivPdfFail}</p>}
            <p className="note">{t.ivResumeHelp}</p>
          </div>
          <div className="st-picked" aria-live="polite">
            <div className="st-who"><Cleo size={64} pose={picked ? 'thumbsup' : resume ? 'think' : 'wave'} expr={picked ? 'cheer' : 'happy'} lookAt={false} label="" /><h2>{t.stPicked}</h2></div>
            {!picked ? <p className="st-empty">{t.ivNoResume}</p> : (
              <>
                {[[t.stSkills, picked.skills, 'skill'], [t.stProjects, picked.projects, 'proj'], [t.stProbe, picked.gaps.map((g) => (g === 'internship' ? t.stNoIntern : g)), 'gap']].map(([h, xs, c]) => xs.length > 0 && (
                  <div key={c} className="st-grp"><small>{h}</small><div className="st-chips">{xs.map((x, k) => <span key={x} className={`st-chip ${c}`} style={{ '--k': k }}>{x}</span>)}</div></div>
                ))}
              </>
            )}
          </div>
        </div>
        {err && <p className="err" role="alert">{err}</p>}
        <div className="st-row">
          <button className="btn-roll" onClick={() => ask([])} disabled={busy}>{busy ? t.ivThinking : t.stJoin}</button>
          <button className="btn-ghost" onClick={onExit}>{t.ivLeave}</button>
        </div>
      </main>
    )
  }

  // asking: the call
  const n = history.length + 1
  const listening = !busy && !speaking
  const r = reaction
  const mood = busy ? ['think', 'think'] : speaking ? ['present', 'happy'] : r && r.n === history.length ? (r.score >= 4 ? ['thumbsup', 'cheer'] : r.score <= 2 ? ['think', 'caring'] : ['rest', 'happy']) : ['rest', 'caring']
  const words = (turn?.question || '').split(/\s+/)
  return (
    <main className="call">
      <div className="call-top">
        <span className="call-live"><i />{t.callLive}</span>
        <ol className="call-q" aria-label={t.ivQ(n)}>{Array.from({ length: Math.max(5, n) }).map((_, k) => <li key={k} className={k < n - 1 ? 'done' : k === n - 1 ? 'now' : ''} />)}</ol>
        <span className="call-title">{t.ivTitle} · {job}</span>
      </div>
      <div className="call-tiles">
        <section className={`call-tile bolt ${speaking ? 'talking' : ''}`} aria-label="Bolt">
          <div className="call-room" aria-hidden="true"><span className="call-shelf" /><span className="call-art" /><span className="call-desk" /></div>
          <div className={`call-bolt ${r && r.n === history.length && r.score >= 4 && !speaking ? 'nod' : ''}`}><Bolt outfit={outfit} size={240} pose={mood[0]} expr={mood[1]} speaking={speaking} lookAt={false} label="Bolt" /></div>
          {r && r.n === history.length && !busy && (
            <>
              <span className="call-react" key={'e' + n} aria-hidden="true">{r.score >= 4 ? '🔥' : r.score <= 2 ? '🤔' : '👍'}</span>
              <p className={`call-verdict ${r.score >= 4 ? 'good' : r.score <= 2 ? 'meh' : ''}`} key={'v' + n} aria-live="polite">{r.note}</p>
            </>
          )}
          {sign && turn?.question && !busy && (
            <div className="call-sign">
              <span className="call-signtag">{signState === 'none' ? t.callCapsOnly : signState === 'on' ? `✋ ${t.callSigning}` : t.signLoading}</span>
              <SignPanel key={turn.question} text={questionPart(turn.question)} gloss={turn.asl} replayable simple size={150} onReady={(ok) => setSignState(ok ? 'on' : 'none')} />
            </div>
          )}
          <span className="call-name"><span className="call-eq" aria-hidden="true"><i /><i /><i /></span>Bolt · {t.callInterviewer}</span>
        </section>
        <section className={`call-tile me ${listening ? 'talking' : ''}`} aria-label={t.callYou}>
          {cam === 'on' ? <video ref={video} autoPlay muted playsInline className="call-video" /> : <div className="call-avatar" aria-hidden="true"><span>{t.callYou[0]}</span></div>}
          {cam !== 'on' && (
            <div className="call-camask">
              <button onClick={camOn}>📷 {t.callCamOn}</button>
              <small>{cam === 'denied' ? t.callCamDenied : t.callCamNote}</small>
            </div>
          )}
          {cam === 'on' && <button className="call-camoff" onClick={camOff}>{t.callCamOff}</button>}
          <div className="call-ring" role="timer" aria-label={t.callTime(left)}>
            <svg viewBox="0 0 58 58"><circle cx="29" cy="29" r="25" className="track" /><circle cx="29" cy="29" r="25" className="arc" style={{ strokeDashoffset: 157 * (1 - left / 90), stroke: left < 20 ? '#ff6b9a' : '#FFD25A' }} /></svg>
            <b>{left}</b>
          </div>
          <span className="call-name"><span className="call-eq" aria-hidden="true"><i /><i /><i /></span>{t.callYou}</span>
        </section>
      </div>

      <div className="call-cap" aria-live="polite">
        {busy ? <span className="call-thinking">{t.ivThinking}</span> : (
          <>
            {turn?.kind === 'followup' && <span className="call-tag">{t.ivFollow}</span>}
            {turn?.focus && <span className="call-tag soft">{t.ivTesting(turn.focus)}</span>}
            <span className="sr-only">{turn?.question}</span>
            <span aria-hidden="true">{words.map((w, k) => <span key={k + w} className="call-w" style={{ '--k': k }}>{w} </span>)}</span>
          </>
        )}
      </div>
      {!busy && (
        <div className="call-tools">
          <button className="link-btn" onClick={() => say(turn.question)}>{t.ivHear}</button>
          <button className="link-btn" onClick={() => setHint((h) => !h)} aria-expanded={hint}>{t.ivWhy}</button>
          {hint && turn?.why && <p className="call-hint">{turn.why}</p>}
        </div>
      )}

      <div className="call-bar">
        {mic.supported && (
          <button className={`call-round ${mic.listening ? 'rec' : ''}`} onClick={() => (mic.listening ? mic.stop() : mic.start())} aria-pressed={mic.listening} disabled={busy} title={mic.listening ? t.ivStop : t.ivSpeak} aria-label={mic.listening ? t.ivStop : t.ivSpeak}>🎙</button>
        )}
        <label className="call-input"><span className="sr-only">{t.ivAnswerLabel}</span>
          {mic.listening && <Wave analyser={mic.analyser} active />}
          <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={t.callAnswerPh} disabled={busy}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }} />
        </label>
        <button className="call-send" onClick={submit} disabled={busy || !text.trim()}>{t.callSend}</button>
        <button className="call-round end" onClick={() => finish(history)} disabled={busy || history.length === 0} title={t.ivEnd} aria-label={t.ivEnd}>✕</button>
      </div>
      {mic.error && <p className="err" role="alert">{mic.error}</p>}
      {err && <p className="err" role="alert">{err}</p>}
    </main>
  )
}
