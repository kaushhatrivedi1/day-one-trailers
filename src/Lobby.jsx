import { useEffect, useRef, useState } from 'react'
import Cleo from './Cleo.jsx'
import { LANGS } from './i18n.js'
import { sceneArt } from './art.js'
import { getNowShowing, usingDemoData, memoryGreeting, companyPreview, listSessions } from './api.js'
import { withBrand } from './brand.js'
import { speak } from './speech.js'
import { useAccess, useT } from './access.jsx'

const isLink = (s) => /^https?:\/\/\S+$/i.test(s.trim())
const isPosting = (s) => isLink(s) || s.trim().length >= 120

// The company card: slides out of the ticket while Bolt reads a pasted posting or link.
function CompanyCard({ state, data, error, t }) {
  if (state === 'idle') return null
  if (state === 'error') return <p className="err" role="alert">{error}</p>
  const r = data?.research
  const brand = r?.brandColor
  return (
    <div className={`co-card ${state}`} style={brand ? { '--brand': brand } : undefined} aria-live="polite">
      {state === 'loading' ? (
        <>
          <span className="co-skel logo" /><span className="co-skel line" /><span className="co-skel line short" />
          <p className="co-status">{t.cardReading}</p>
        </>
      ) : (
        <>
          <div className="co-top">
            {r?.logo ? <img className="co-logo-big" src={r.logo} alt="" /> : <span className="co-mono">{(data.company || '?')[0]}</span>}
            <div>
              <strong className="co-name">{data.company || r?.company}</strong>
              {data.title && <span className="co-role">{data.title}</span>}
            </div>
            <span className="co-ok">✓ {t.cardReady}</span>
          </div>
          {r?.summary && <p className="co-sum">{r.summary}</p>}
          {r?.values?.length > 0 && <ul className="co-vals">{r.values.map((v) => <li key={v}>{v}</li>)}</ul>}
        </>
      )}
    </div>
  )
}

// A painted poster on the "Now showing" wall; rises in as it scrolls into view and tilts to the pointer.
function Poster({ p, name, tag, onPlay, t, i }) {
  const ref = useRef(null)
  const move = (e) => {
    const el = ref.current; if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--rx', `${(-y * 12).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${(x * 14).toFixed(2)}deg`)
  }
  const leave = () => { ref.current?.style.setProperty('--rx', '0deg'); ref.current?.style.setProperty('--ry', '0deg') }
  return (
    <li className="pw-poster reveal" style={{ '--d': `${i * 0.08}s`, '--r': `${i % 2 ? 1.5 : -1.5}deg` }}>
      <button ref={ref} onClick={onPlay} onPointerMove={move} onPointerLeave={leave} aria-label={`${t.play}: ${name}`}>
        <img src={sceneArt(p.job.toLowerCase(), 1)} alt="" />
        <span className="pw-glare" aria-hidden="true" />
        <span className="pw-play" aria-hidden="true">▶</span>
        <span className="pw-name">{name}</span>
        <span className="pw-tag">{tag}</span>
      </button>
    </li>
  )
}

// Reveal anything with .reveal as it scrolls into view.
function useReveal(root) {
  useEffect(() => {
    const check = () => {
      const h = window.innerHeight
      root.current?.querySelectorAll('.reveal:not(.in)').forEach((e) => { if (e.getBoundingClientRect().top < h * 0.9) e.classList.add('in') })
    }
    check()
    const id = setTimeout(check, 300)
    addEventListener('scroll', check, { passive: true }); addEventListener('resize', check)
    return () => { clearTimeout(id); removeEventListener('scroll', check); removeEventListener('resize', check) }
  })
}

export default function Lobby({ onStart, onPractise }) {
  const t = useT()
  const { lang, setLang, guest, forget } = useAccess()
  const [welcome, setWelcome] = useState(null)
  // Saved practice sessions (MongoDB), newest first: one per job, reopened straight into the interview.
  const [sessions, setSessions] = useState([])
  useEffect(() => { let live = true; listSessions(guest).then((r) => { if (live) setSessions(Array.isArray(r) ? r : []) }); return () => { live = false } }, [guest])
  const [q, setQ] = useState('')
  const [about, setAbout] = useState('')
  const [showAbout, setShowAbout] = useState(false)
  const [pose, setPose] = useState('wave')
  const [say, setSay] = useState('')
  const [showing, setShowing] = useState([])
  const [err, setErr] = useState('')
  const [card, setCard] = useState({ state: 'idle' })
  const main = useRef(null)
  const typing = useRef(null)
  useReveal(main)

  useEffect(() => { getNowShowing().then(setShowing) }, [])
  useEffect(() => {
    let live = true, stop
    setWelcome(null)
    memoryGreeting({ guest, lang }).then((r) => {
      if (!live || !r?.greeting) return
      setWelcome(r.greeting)
      stop = speak(r.greeting, lang)
    })
    return () => { live = false; stop?.() }
  }, [guest, lang])

  const input = q.trim()
  const link = isLink(input)
  const posting = isPosting(input)

  // Bolt reacts to typing: thinks while you type, then answers.
  useEffect(() => {
    if (!input) { setPose('wave'); setSay(''); return }
    setPose('think')
    clearTimeout(typing.current)
    typing.current = setTimeout(() => {
      setPose(posting ? 'thumbsup' : 'point')
      setSay(posting ? t.boltPosting : t.boltPick(input.slice(0, 40)))
    }, 650)
    return () => clearTimeout(typing.current)
  }, [input, posting]) // eslint-disable-line

  // Live company card for a pasted posting or link.
  useEffect(() => {
    if (usingDemoData || !posting) { setCard({ state: 'idle' }); return }
    let live = true
    const id = setTimeout(async () => {
      setCard({ state: 'loading' })
      try {
        const data = await companyPreview({ jd: input, lang })
        if (!live) return
        if (data?.research) data.research = await withBrand(data.research)
        setCard({ state: data?.company || data?.research ? 'ready' : 'idle', data, input })
      } catch (e) {
        if (live) setCard({ state: 'error', error: e.message })
      }
    }, link ? 300 : 900)
    return () => { live = false; clearTimeout(id) }
  }, [input, posting, link, lang])

  const go = (title) => {
    const text = title ?? input
    const jd = title ? '' : posting ? text : ''
    const job = jd ? '' : text
    if (!job && !jd) { setErr(t.errJob); return }
    if (!job && !isLink(jd) && jd.length < 40) { setErr(t.errJobOrJd); return }
    setErr('')
    setPose('cheer')
    const research = jd && card.input === jd ? card.data?.research : null
    setTimeout(() => onStart({ job, jd, lang, guest, research, profile: about.trim() }), 320)
  }

  return (
    <main className="premiere" ref={main}>
      <section className="pr-hero">
        <div className="pr-beam l" aria-hidden="true" /><div className="pr-beam r" aria-hidden="true" /><div className="pr-beam c" aria-hidden="true" />
        <div className="pr-valance" aria-hidden="true" />
        <div className="pr-curtain l" aria-hidden="true" /><div className="pr-curtain r" aria-hidden="true" />
        <div className="pr-dust" aria-hidden="true">{Array.from({ length: 36 }).map((_, k) => <i key={k} style={{ '--x': `${(k * 37) % 100}%`, '--t': `${8 + (k % 7) * 1.6}s`, '--d': `${-(k * 0.9)}s` }} />)}</div>

        <header className="pr-marquee">
          <span className="pr-bulbs" aria-hidden="true" />
          <h1 className="pr-title">DAY ONE</h1>
          <p className="pr-tag">{t.tagline}</p>
        </header>

        <div className="pr-stage" aria-hidden="true" /><div className="pr-carpet" aria-hidden="true" /><div className="pr-spot" aria-hidden="true" />
        <div className="pr-bolt">
          <div className="pr-say">
            <p className={`pr-speech${(welcome || say || '').length > 120 ? ' long' : ''}`} aria-live="polite" key={welcome || say || 'hi'}>{welcome || say || t.bubble}</p>
            {welcome && <button type="button" className="link-btn pr-forget" onClick={forget}>{t.forgetMe}</button>}
          </div>
          <div className="pr-bob"><Cleo size={230} pose={pose} expr={pose === 'think' ? 'think' : pose === 'cheer' ? 'cheer' : 'happy'} label="Bolt" /></div>
        </div>

        <form className="pr-booth" onSubmit={(e) => { e.preventDefault(); go() }}>
          <CompanyCard state={card.state} data={card.data} error={card.error} t={t} />
          <div className="pr-ticket">
            <label className="pr-smart">
              <span className="pr-ico" aria-hidden="true">🎟</span>
              <span className="sr-only">{t.smartLabel}</span>
              <textarea rows={posting && !link ? 4 : 1} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.smartPh}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !(posting && !link)) { e.preventDefault(); go() } }}
                aria-invalid={!!err} aria-describedby="pr-hint" autoFocus />
            </label>
            <button className="pr-roll" type="submit" disabled={card.state === 'loading'}>{t.rollIt}</button>
            <div className="pr-hint" id="pr-hint">
              <span className={`pr-mode ${posting ? 'on' : ''}`}>{link ? t.modeLink : posting ? t.modePosting : t.segTitle}</span>
              <span className="pr-hinttext">{link ? t.hintLink : posting ? t.hintPosting : t.hintTitle}</span>
              <button type="button" className="pr-about-btn" onClick={() => setShowAbout((s) => !s)} aria-expanded={showAbout}>＋ {t.aboutToggle}</button>
              <span className="pr-lang" role="group" aria-label={t.language}>
                {LANGS.map((l) => <button type="button" key={l.code} className={l.code === lang ? 'on' : ''} aria-pressed={l.code === lang} onClick={() => setLang(l.code)} title={l.label}>{l.short}</button>)}
              </span>
            </div>
            {showAbout && (
              <label className="pr-about"><span className="sr-only">{t.about}</span>
                <input value={about} onChange={(e) => setAbout(e.target.value)} placeholder={t.aboutPh} autoFocus />
              </label>
            )}
            {err && <p className="err" role="alert">{err}</p>}
          </div>
        </form>
        <a className="pr-scroll" href="#now-showing" aria-label={t.nowShowing}>↓</a>
      </section>

      {sessions.length > 0 && (
        <section className="pr-continue" aria-labelledby="continue-h">
          <h2 id="continue-h" className="pr-wall-h">{t.contH}</h2>
          <ul>
            {sessions.map((s) => (
              <li key={s.id}>
                <button type="button" className="pc-card" onClick={() => onPractise?.(s.id)}>
                  <span className="pc-job">{s.job}{s.company && <small> · {s.company}</small>}</span>
                  <span className="pc-meta">{t.contMeta(s.attempts, s.best)}{s.hasJd && <> · 📄 {t.contJd}</>}</span>
                  {s.last != null && <span className="pc-score" aria-hidden="true"><b>{s.last}</b>/100</span>}
                  <span className="pc-go">{t.contGo} →</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="pr-wall" id="now-showing" aria-labelledby="showing-h">
        <h2 id="showing-h" className="pr-wall-h reveal">{t.nowShowing}</h2>
        <ul className="pw-grid">
          {showing.map((p, i) => (
            <Poster key={p.job} p={p} i={i} t={t} name={p.names?.[lang] || p.job} tag={p.live ? t.readyTag : p.tags?.[lang] || p.tag} onPlay={() => go(p.names?.[lang] || p.job)} />
          ))}
        </ul>
        {usingDemoData && lang !== 'en' && <p className="note">{t.demoNote}</p>}
        <div className="pr-how">
          {[t.how1, t.how2, t.how3].map(([h, d], k) => (
            <div key={k} className="pr-step reveal" style={{ '--d': `${k * 0.12}s` }}><b>{k + 1} · {h}</b><span>{d}</span></div>
          ))}
        </div>
      </section>
    </main>
  )
}
