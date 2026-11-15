import { useEffect, useState } from 'react'
import Cleo from './Cleo.jsx'
import Marquee from './Marquee.jsx'
import { LANGS } from './i18n.js'
import { sceneArt } from './art.js'
import { getNowShowing, usingDemoData } from './api.js'
import { useAccess, useT } from './access.jsx'

export default function Lobby({ onStart }) {
  const t = useT()
  const { lang, setLang } = useAccess()
  const [job, setJob] = useState('')
  const [about, setAbout] = useState('')
  const [jd, setJd] = useState('')
  const [useJd, setUseJd] = useState(false)
  const [pose, setPose] = useState('wave')
  const [showing, setShowing] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => { getNowShowing().then(setShowing) }, [])

  const go = (j = job, posting = useJd ? jd.trim() : '') => {
    const name = posting ? '' : j.trim()
    if (!name && posting.length < 40) { setErr(posting ? t.errJobOrJd : t.errJob); return }
    setErr('')
    setPose('thumbsup')
    setTimeout(() => onStart({ job: name, jd: posting, lang, profile: about.trim() }), 320)
  }

  return (
    <main className="lobby">
      <header className="lobby-top">
        <Marquee>
          <h1 className="title">Day One</h1>
          <p className="tagline">{t.tagline}</p>
        </Marquee>
      </header>

      <section className="booth" aria-labelledby="booth-h">
        <div className="booth-cleo">
          <p className="bubble">{t.bubble}</p>
          <Cleo size={250} pose={pose} expr="happy" label="Bolt" />
        </div>
        <form className="ticket" onSubmit={(e) => { e.preventDefault(); go() }}>
          <h2 id="booth-h" className="ticket-h">{t.ticketH}</h2>
          {useJd ? (
            <label className="field">
              <span>{t.jdLabel}</span>
              <textarea className="jd" rows={7} value={jd} onChange={(e) => setJd(e.target.value)} placeholder={t.jdPh}
                autoFocus aria-invalid={!!err} aria-describedby={err ? 'job-err' : 'jd-help'} />
              <small id="jd-help" className="field-help">{t.jdHelp}</small>
            </label>
          ) : (
            <label className="field">
              <span>{t.jobQ}</span>
              <input
                value={job}
                onChange={(e) => setJob(e.target.value)}
                placeholder={t.jobPh}
                autoFocus
                aria-invalid={!!err}
                aria-describedby={err ? 'job-err' : undefined}
              />
            </label>
          )}
          <button type="button" className="link-btn" onClick={() => { setUseJd((v) => !v); setErr('') }}>{useJd ? t.jdBack : t.jdToggle}</button>
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
          <button className="btn-roll" type="submit">{t.roll}</button>
          <div className="stub-edge" aria-hidden="true" />
        </form>
      </section>

      <section className="showing" aria-labelledby="showing-h">
        <h2 id="showing-h" className="section-h">{t.nowShowing}</h2>
        <ul className="posters">
          {showing.map((p, i) => {
            const name = p.names?.[lang] || p.job
            return (
              <li key={p.job} className={`poster p${i % 3}`}>
                <button onClick={() => go(name, '')} aria-label={name}>
                  <span className="poster-art">
                    <img src={sceneArt(p.job.toLowerCase(), 1)} alt="" loading="lazy" />
                    <span className="poster-name">{name}</span>
                  </span>
                  <span className="poster-tag">{p.tags?.[lang] || p.tag}</span>
                  {p.watching > 0 && <span className="poster-watch">{p.watching}</span>}
                </button>
              </li>
            )
          })}
        </ul>
        {usingDemoData && lang !== 'en' && <p className="note">{t.demoNote}</p>}
      </section>
    </main>
  )
}
