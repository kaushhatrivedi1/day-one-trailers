import { useEffect, useState } from 'react'
import Cleo from './Cleo.jsx'
import OfficeScene from './OfficeScene.jsx'
import { useT } from './access.jsx'

// The wait is part of the show: an editing suite. Left, the production log with each AI step as it
// happens; centre, a film strip whose frames come alive as live previews once the script exists;
// right, the company file (or Bolt in the director's chair); bottom, a progress bar.
const ORDER = ['research', 'script', 'voice', 'final']

export default function Making({ job, role = '', live = {} }) {
  const t = useT()
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id) }, [])

  const r = live.research
  const company = r?.company || live.company || ''
  const brand = r?.brandColor || ''
  const draft = live.draft || []
  const p = live.progress || { voiced: 0, signed: 0, total: 6 }
  const total = p.total || 6
  const stage = live.status === 'done' ? 'final' : live.stage || 'script'
  const at = ORDER.indexOf(stage)
  const elapsed = Math.max(0, Math.round((now - (live.startedAt || now)) / 1000))

  // progress: research 0-20, script 20-45, voice + signing 45-95, final 100
  const pct = stage === 'final' ? 100
    : stage === 'voice' ? 45 + Math.round(((p.voiced + p.signed) / (2 * total)) * 50)
    : stage === 'script' ? (live.jd ? 25 : 10) + Math.min(18, elapsed)
    : Math.min(18, 4 + elapsed)

  const steps = [
    ...(live.jd ? [{ id: 'research', label: t.stepResearch, detail: company ? `${t.foundCo(company)}${r?.sources?.length ? ` · ${t.sourcesN(r.sources.length)}` : ''}` : '' }] : []),
    { id: 'script', label: t.stepScript, detail: draft.length ? t.scenesWritten(draft.length) : '' },
    { id: 'voice', label: t.stepVoice, detail: stage === 'voice' || stage === 'final' ? t.voicedN(p.voiced, total) : '' },
    { id: 'sign', label: t.stepSign, detail: stage === 'voice' || stage === 'final' ? t.signedN(p.signed, total) : '', of: 'voice' },
    { id: 'final', label: t.stepFinal, detail: '' },
  ]
  const state = (s) => {
    const idx = ORDER.indexOf(s.of || s.id)
    if (s.id === 'sign') return stage === 'final' || p.signed >= total ? 'done' : stage === 'voice' ? 'live' : 'todo'
    if (s.id === 'voice') return stage === 'final' || p.voiced >= total ? 'done' : stage === 'voice' ? 'live' : 'todo'
    return idx < at ? 'done' : idx === at ? 'live' : 'todo'
  }

  return (
    <main className="suite" style={brand ? { '--brand': brand } : undefined}>
      <header className="suite-head">
        <p className="eyebrow"><span className="rec" aria-hidden="true" />{t.prodEyebrow}</p>
        <h2 className="suite-title">
          {r?.logo && <img className="suite-logo" src={r.logo} alt="" />}
          {company ? t.dayAt(company) : t.dayAs(job)}
        </h2>
        {company && role && <p className="suite-role">{role}</p>}
      </header>

      <section className="suite-grid">
        <ol className="log" aria-label={t.backstage}>
          {steps.map((s) => (
            <li key={s.id} className={`step ${state(s)}`}>
              <span className="dot" aria-hidden="true" />
              <span className="step-label">{s.label}</span>
              {s.detail && <span className="step-detail">{s.detail}</span>}
            </li>
          ))}
          <li className="elapsed" aria-live="off">{elapsed}s</li>
        </ol>

        <ol className="reel" aria-label="Film strip">
          {Array.from({ length: total }).map((_, i) => {
            const d = draft[i]
            return (
              <li key={i} className={`cell ${d ? 'on' : ''}`} style={{ '--d': `${i * 0.12}s` }}>
                <div className="cell-frame">
                  {d ? (
                    <OfficeScene index={i} kit={live.kit || 'general'} screen={d.screen || d.title} company={company} brand={brand} logo={r?.logo || ''} duration={8} label={d.title} />
                  ) : <span className="cell-wait" aria-hidden="true" />}
                  <span className="cell-num">{i + 1}</span>
                </div>
                <p className="cell-title">{d ? d.title : t.waitingScript}</p>
                <p className="cell-badges">
                  <span className={i < p.voiced ? 'ok' : ''}>♪</span>
                  <span className={i < p.signed ? 'ok' : ''}>ASL</span>
                </p>
              </li>
            )
          })}
        </ol>

        <aside className="dossier">
          {r?.summary ? (
            <div className="file">
              <p className="file-tab">{t.dossier}</p>
              <div className="file-head">
                {r.logo ? <img src={r.logo} alt="" /> : <span className="file-mono">{company[0]}</span>}
                <strong>{company}</strong>
              </div>
              <p>{r.summary}</p>
              {r.mission && <p className="file-mission">“{r.mission}”</p>}
              {r.values?.length > 0 && <ul className="file-values">{r.values.map((v) => <li key={v}>{v}</li>)}</ul>}
            </div>
          ) : (
            <div className="director">
              <Cleo size={170} pose="think" expr="think" label="Bolt" />
              <div className="clapper" aria-hidden="true"><span /><b>DAY ONE</b></div>
              <p className="note">{t.director}</p>
            </div>
          )}
        </aside>
      </section>

      <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </main>
  )
}
