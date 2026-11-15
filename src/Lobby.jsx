import { useEffect, useRef, useState } from 'react'
import Cleo from './Cleo.jsx'
import Marquee from './Marquee.jsx'
import OfficeScene from './OfficeScene.jsx'
import { LANGS } from './i18n.js'
import { FIGURES } from './mock.js'
import { getNowShowing, usingDemoData, memoryGreeting, companyPreview } from './api.js'
import { withBrand } from './brand.js'
import { speak } from './speech.js'
import { useAccess, useT } from './access.jsx'

const isLink = (s) => /^https?:\/\/\S+$/i.test(s.trim())

// The company card: appears while Bolt reads a pasted posting or link, then fills in with the
// logo, company, role and what the company does, edged in its brand colour.
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
          {r?.mission && <p className="co-mis"><b>{t.cardMission}:</b> {r.mission}</p>}
          {r?.values?.length > 0 && <ul className="co-vals">{r.values.map((v) => <li key={v}>{v}</li>)}</ul>}
        </>
      )}
    </div>
  )
}

// A poster that tilts toward the pointer.
function Poster({ p, name, tag, onPlay, t, i }) {
  const ref = useRef(null)
  const move = (e) => {
    const el = ref.current; if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`)
    el.style.setProperty('--ry', `${(x * 12).toFixed(2)}deg`)
    el.style.setProperty('--gx', `${(x + 0.5) * 100}%`)
  }
  const leave = () => { ref.current?.style.setProperty('--rx', '0deg'); ref.current?.style.setProperty('--ry', '0deg') }
  const kit = FIGURES[p.job.toLowerCase()]?.kit || 'general'
  return (
    <li className="poster live" style={{ '--d': `${i * 0.08}s` }}>
      <button ref={ref} onClick={onPlay} onPointerMove={move} onPointerLeave={leave} aria-label={`${t.play}: ${name}`}>
        <span className="poster-art">
          <OfficeScene index={1} kit={kit} screen={name} duration={10} label="" />
          <span className="poster-glare" aria-hidden="true" />
          <span className="poster-play" aria-hidden="true">▶</span>
        </span>
        <span className="poster-name">{name}</span>
        <span className="poster-tag">{tag}</span>
      </button>
    </li>
  )
}

export default function Lobby({ onStart }) {
  const t = useT()
  const { lang, setLang, guest, forget } = useAccess()
  const [welcome, setWelcome] = useState(null)
  const [job, setJob] = useState('')
  const [about, setAbout] = useState('')
  const [jd, setJd] = useState('')
  const [useJd, setUseJd] = useState(false)
  const [pose, setPose] = useState('wave')
  const [showing, setShowing] = useState([])
  const [err, setErr] = useState('')
  const [card, setCard] = useState({ state: 'idle' })
  const main = useRef(null)

  useEffect(() => { getNowShowing().then(setShowing) }, [])
  // Returning visitor? Bolt says what he remembers.
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

  // Live company card: read the posting shortly after the person stops typing or pastes.
  useEffect(() => {
    const input = jd.trim()
    if (!useJd || usingDemoData || (!isLink(input) && input.length < 120)) { setCard({ state: 'idle' }); return }
    let live = true
    const id = setTimeout(async () => {
      setCard({ state: 'loading' }); setPose('think')
      try {
        const data = await companyPreview({ jd: input, lang })
        if (!live) return
        if (data?.research) data.research = await withBrand(data.research)
        setCard({ state: data?.company || data?.research ? 'ready' : 'idle', data, input })
        setPose('thumbsup')
      } catch (e) {
        if (live) { setCard({ state: 'error', error: e.message }); setPose('wave') }
      }
    }, isLink(input) ? 300 : 900)
    return () => { live = false; clearTimeout(id) }
  }, [jd, useJd, lang])

  const go = (j = job, posting = useJd ? jd.trim() : '') => {
    const name = posting ? '' : j.trim()
    if (!name && !isLink(posting) && posting.length < 40) { setErr(posting ? t.errJobOrJd : t.errJob); return }
    setErr('')
    setPose('cheer')
    const research = posting && card.input === posting ? card.data?.research : null
    setTimeout(() => onStart({ job: name, jd: posting, lang, guest, research, profile: about.trim() }), 320)
  }

  // The lobby spotlight follows the pointer.
  const spot = (e) => {
    main.current?.style.setProperty('--mx', `${e.clientX}px`)
    main.current?.style.setProperty('--my', `${e.clientY}px`)
  }

  return (
    <main className="lobby" ref={main} onPointerMove={spot}>
      <div className="lobby-spot" aria-hidden="true" />
      <header className="lobby-top">
        <Marquee>
          <h1 className="title">Day One</h1>
          <p className="tagline">{t.tagline}</p>
        </Marquee>
      </header>

      <section className="booth" aria-labelledby="booth-h">
        <div className="booth-cleo">
          <p className="bubble" aria-live="polite">{welcome || t.bubble}</p>
          {welcome && <button type="button" className="link-btn forget" onClick={forget}>{t.forgetMe}</button>}
          <Cleo size={250} pose={pose} expr={pose === 'think' ? 'think' : 'happy'} label="Bolt" />
        </div>
        <form className="ticket" onSubmit={(e) => { e.preventDefault(); go() }}>
          <h2 id="booth-h" className="ticket-h">{t.ticketH}</h2>
          <div className="seg" role="tablist" aria-label={t.ticketH}>
            <button type="button" role="tab" aria-selected={!useJd} className={!useJd ? 'on' : ''} onClick={() => { setUseJd(false); setErr('') }}>{t.segTitle}</button>
            <button type="button" role="tab" aria-selected={useJd} className={useJd ? 'on' : ''} onClick={() => { setUseJd(true); setErr('') }}>{t.segPosting}</button>
            <span className="seg-pill" aria-hidden="true" style={{ transform: `translateX(${useJd ? 100 : 0}%)` }} />
          </div>
          {useJd ? (
            <label className="field">
              <span>{t.jdLabel}</span>
              <textarea className="jd" rows={5} value={jd} onChange={(e) => setJd(e.target.value)} placeholder={t.jdPh}
                autoFocus aria-invalid={!!err} aria-describedby={err ? 'job-err' : 'jd-help'} />
              <small id="jd-help" className="field-help">{t.jdHelp}</small>
            </label>
          ) : (
            <label className="field">
              <span>{t.jobQ}</span>
              <input value={job} onChange={(e) => setJob(e.target.value)} placeholder={t.jobPh} autoFocus
                aria-invalid={!!err} aria-describedby={err ? 'job-err' : undefined} />
            </label>
          )}
          {useJd && <CompanyCard state={card.state} data={card.data} error={card.error} t={t} />}
          {err && <p id="job-err" className="err" role="alert">{err}</p>}
          <div className="ticket-row">
            <label className="field">
              <span>{t.language}</span>
              <select value={lang} onChange={(e) => setLang(e.target.value)}>
                {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </label>
            <label className="field grow">
              <span>{t.about}</span>
              <input value={about} onChange={(e) => setAbout(e.target.value)} placeholder={t.aboutPh} />
            </label>
          </div>
          <button className="btn-roll" type="submit" disabled={card.state === 'loading'}>{t.roll}</button>
          <div className="stub-edge" aria-hidden="true" />
        </form>
      </section>

      <section className="showing" aria-labelledby="showing-h">
        <h2 id="showing-h" className="section-h">{t.nowShowing}</h2>
        <ul className="posters">
          {showing.map((p, i) => (
            <Poster key={p.job} p={p} i={i} t={t} name={p.names?.[lang] || p.job} tag={p.tags?.[lang] || p.tag} onPlay={() => go(p.names?.[lang] || p.job, '')} />
          ))}
        </ul>
        {usingDemoData && lang !== 'en' && <p className="note">{t.demoNote}</p>}
      </section>
    </main>
  )
}
