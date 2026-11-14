import { useEffect, useState } from 'react'
import Cleo from './Cleo.jsx'
import Marquee from './Marquee.jsx'
import { LANGUAGES } from './mock.js'
import { sceneArt } from './art.js'
import { getNowShowing, usingDemoData } from './api.js'

export default function Lobby({ onStart }) {
  const [job, setJob] = useState('')
  const [lang, setLang] = useState('en')
  const [about, setAbout] = useState('')
  const [pose, setPose] = useState('wave')
  const [showing, setShowing] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => { getNowShowing().then(setShowing) }, [])

  const go = (j = job) => {
    const name = j.trim()
    if (!name) { setErr('Type a job first, like “lineworker” or “nurse”.'); return }
    setErr('')
    setPose('thumbsup')
    setTimeout(() => onStart({ job: name, lang, profile: about.trim() }), 320)
  }

  return (
    <main className="lobby">
      <header className="lobby-top">
        <Marquee>
          <h1 className="title">Day One</h1>
          <p className="tagline">See the job before you choose it.</p>
        </Marquee>
      </header>

      <section className="booth" aria-labelledby="booth-h">
        <div className="booth-cleo">
          <p className="bubble">Name a job. I’ll show you its Tuesday.</p>
          <Cleo size={250} pose={pose} expr="happy" label="Cleo, your host, waving hello" />
        </div>
        <form className="ticket" onSubmit={(e) => { e.preventDefault(); go() }}>
          <h2 id="booth-h" className="ticket-h">Get your ticket</h2>
          <label className="field">
            <span>Which job do you want to see?</span>
            <input
              value={job}
              onChange={(e) => setJob(e.target.value)}
              placeholder="Marine biologist"
              autoFocus
              aria-invalid={!!err}
              aria-describedby={err ? 'job-err' : undefined}
            />
          </label>
          {err && <p id="job-err" className="err" role="alert">{err}</p>}
          <div className="ticket-row">
            <label className="field">
              <span>Narrated in</span>
              <select value={lang} onChange={(e) => setLang(e.target.value)}>
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </label>
            <label className="field grow">
              <span>Anything about you? (optional)</span>
              <input value={about} onChange={(e) => setAbout(e.target.value)} placeholder="I like animals and I can’t afford much college" />
            </label>
          </div>
          <button className="btn-roll" type="submit">Roll the trailer</button>
          <div className="stub-edge" aria-hidden="true" />
        </form>
      </section>

      <section className="showing" aria-labelledby="showing-h">
        <h2 id="showing-h" className="section-h">Now showing</h2>
        <ul className="posters">
          {showing.map((p, i) => (
            <li key={p.job} className={`poster p${i % 3}`}>
              <button onClick={() => go(p.job)} aria-label={`Watch the ${p.job} trailer`}>
                <span className="poster-art">
                  <img src={sceneArt(p.job.toLowerCase(), 1)} alt="" loading="lazy" />
                  <span className="poster-name">{p.job}</span>
                </span>
                <span className="poster-tag">{p.tag}</span>
                <span className="poster-watch">{p.watching} watching</span>
              </button>
            </li>
          ))}
        </ul>
        {usingDemoData && <p className="note">Demo mode: trailers use built-in sample scripts and drawings. Connect the AWS backend to generate any job.</p>}
      </section>
    </main>
  )
}
