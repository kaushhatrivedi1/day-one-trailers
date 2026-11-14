import { useEffect, useState } from 'react'
import Cleo from './Cleo.jsx'
import { SERVICES } from './mock.js'

// The generation wait is part of the show. The backstage panel shows which AWS service
// is working on the current scene.
export default function Making({ job, scenes, total = 6 }) {
  const ready = scenes.length
  const [step, setStep] = useState(0)

  useEffect(() => {
    setStep(0)
    const t = setInterval(() => setStep((s) => Math.min(s + 1, SERVICES.length - 1)), 220)
    return () => clearInterval(t)
  }, [ready])

  const current = Math.min(ready + 1, total)
  return (
    <main className="making">
      <div className="making-head">
        <Cleo size={130} pose="think" expr="think" label="Cleo, thinking while the trailer renders" />
        <div>
          <h2 className="making-h">Rolling the {job} trailer</h2>
          <p className="making-sub" aria-live="polite">
            {ready < total ? `Scene ${current} of ${total} is being made.` : 'Final cut is ready.'}
          </p>
        </div>
      </div>

      <ol className="strip" aria-label="Film strip">
        {Array.from({ length: total }).map((_, i) => (
          <li key={i} className={i < ready ? 'frame on' : i === ready ? 'frame next' : 'frame'}>
            {scenes[i] ? <img src={scenes[i].image} alt={`Scene ${i + 1}: ${scenes[i].title}`} /> : <span className="hole" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      <aside className="backstage" aria-label="Backstage: services working on this scene">
        <h3 className="backstage-h">Backstage</h3>
        <ul>
          {SERVICES.map((s, i) => (
            <li key={s.id} className={i < step ? 'done' : i === step && ready < total ? 'live' : ''}>
              <b>{s.name}</b> <span>{s.does}</span>
            </li>
          ))}
        </ul>
      </aside>
    </main>
  )
}
