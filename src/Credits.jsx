import HostLine from './Host.jsx'
import { HOST } from './signs.js'

// Turn bare https links in a source line into real links (O*NET's terms require a visible link).
const linkify = (text) => text.split(/(https:\/\/\S+?)(?=[\s)]|$)/).map((part, i) =>
  part.startsWith('https://') ? <a key={i} href={part} target="_blank" rel="noreferrer">{part}</a> : part)

export default function Credits({ trailer, onAudition, onReplay, onNew }) {
  const c = trailer.credits
  return (
    <main className="credits">
      <div className="credits-roll">
        <p className="credits-title">Directed by you</p>
        <h2 className="credits-job">{trailer.job}</h2>

        <h3 className="credits-h">The path</h3>
        <ol className="path">
          {c.path.map((s, k) => (
            <li key={k}><span>{s}</span></li>
          ))}
        </ol>

        <dl className="facts">
          <div><dt>What it costs to get there</dt><dd>{c.cost}</dd></div>
          <div><dt>What it can pay</dt><dd>{c.pay}</dd></div>
          {c.outlook && <div><dt>Job outlook</dt><dd>{c.outlook}</dd></div>}
        </dl>
        <p className="note">
          {c.source
            ? <>Source: {linkify(c.source)} Pay varies by place, employer and experience.</>
            : trailer.source === 'demo'
              ? 'The demo has sourced figures only for the featured jobs. Connect the live backend for other jobs.'
              : 'Figures are estimates from public occupation data.'}
        </p>
      </div>

      <div className="credits-cta">
        <HostLine line={HOST.ready()} size={230} expr="cheer" pose="cheer" />
        <p className="credits-ask">Think you’re ready? Audition for the role.</p>
        <button className="btn-roll" onClick={onAudition}>Start the Screen Test</button>
        <div className="row">
          <button className="btn-ghost" onClick={onReplay}>Watch again</button>
          <button className="btn-ghost" onClick={onNew}>See another job</button>
        </div>
      </div>
    </main>
  )
}
