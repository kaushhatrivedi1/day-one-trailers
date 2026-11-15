import { useEffect, useState } from 'react'
import Cleo from './Cleo.jsx'
import { useT } from './access.jsx'

// The generation wait is part of the show: a film strip fills in and the backstage panel
// shows which part of the pipeline is working.
export default function Making({ job, scenes, total = 6 }) {
  const t = useT()
  const ready = scenes.length
  const services = [
    { id: 'gemini', name: 'Gemini', does: `${t.svcScript}, ${t.svcLang}` },
    { id: 'voice', name: 'ElevenLabs', does: t.svcVoice },
    { id: 'anim', name: 'Day One studio', does: t.svcAnim },
  ]
  const [step, setStep] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % services.length), 1400)
    return () => clearInterval(id)
  }, [services.length])

  const current = Math.min(ready + 1, total)
  return (
    <main className="making">
      <div className="making-head">
        <Cleo size={130} pose="think" expr="think" label="Bolt" />
        <div>
          <h2 className="making-h">{t.rolling(job)}</h2>
          <p className="making-sub" aria-live="polite">{ready < total ? t.sceneOf(current, total) : t.finalCut}</p>
        </div>
      </div>

      <ol className="strip" aria-label="Film strip">
        {Array.from({ length: total }).map((_, i) => (
          <li key={i} className={i < ready ? 'frame on' : i === ready ? 'frame next' : 'frame'}>
            {scenes[i] ? <span className="frame-title">{scenes[i].title}</span> : <span className="hole" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      <aside className="backstage" aria-label={t.backstage}>
        <h3 className="backstage-h">{t.backstage}</h3>
        <ul>
          {services.map((s, i) => (
            <li key={s.id} className={i === step && ready < total ? 'live' : i < step ? 'done' : ''}>
              <b>{s.name}</b> <span>{s.does}</span>
            </li>
          ))}
        </ul>
      </aside>
    </main>
  )
}
