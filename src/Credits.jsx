import HostLine from './Host.jsx'
import { HOST } from './signs.js'
import { useAccess, useT } from './access.jsx'
import { money } from './i18n.js'

// Turn bare https links in a source line into real links (O*NET's terms require a visible link).
const linkify = (text) => text.split(/(https:\/\/\S+?)(?=[\s)]|$)/).map((part, i) =>
  part.startsWith('https://') ? <a key={i} href={part} target="_blank" rel="noreferrer">{part}</a> : part)

export default function Credits({ trailer, onAudition, onReplay, onNew }) {
  const t = useT()
  const { lang, sign } = useAccess()
  const c = trailer.credits || {}
  const f = c.figures
  const pay = f ? [t.median(money(f.median, lang)), t.low(money(f.low, lang)), t.high(money(f.high, lang))].join(' ') : c.pay || t.noPay
  const outlook = f ? t.growth(f.growth) : c.outlook
  const source = f ? f.src : c.source
  // t.source wraps the source name in a translated sentence; split it so the name can carry links.
  const [before, after] = t.source('\u0000').split('\u0000')
  return (
    <main className="credits">
      <div className="credits-roll">
        <p className="credits-title">{t.directedBy}</p>
        <h2 className="credits-job">{trailer.job}</h2>

        {trailer.research?.summary && (
          <section className="about-co">
            <h3 className="credits-h">{trailer.research.logo && <img className="co-logo" src={trailer.research.logo} alt="" />}{t.aboutCo(trailer.research.company)}</h3>
            <p>{trailer.research.summary}</p>
            {trailer.research.mission && <p className="co-mission"><strong>{t.coMission}:</strong> {trailer.research.mission}</p>}
            {trailer.research.values?.length > 0 && <p><strong>{t.coValues}:</strong> {trailer.research.values.join(' · ')}</p>}
            {trailer.research.voices?.length > 0 && (
              <>
                <h4 className="credits-h">{t.coVoices}</h4>
                <ul className="co-voices">
                  {trailer.research.voices.map((v, i) => <li key={i}>{v.theme}{v.from && <span className="note"> ({v.from})</span>}</li>)}
                </ul>
                <p className="note">{t.coVoicesNote}</p>
              </>
            )}
            {trailer.research.sources?.length > 0 && (
              <p className="note">{t.researchedFrom}: {trailer.research.sources.map((x, i) => (
                <span key={i}>{i ? ' · ' : ''}<a href={x.url} target="_blank" rel="noreferrer">{x.title}</a></span>
              ))}</p>
            )}
            <p className="note">{t.coUnofficial(trailer.research.company)}{trailer.research.logoFrom && <> {t.coLogoFrom} <a href={trailer.research.logoFrom} target="_blank" rel="noreferrer">{trailer.research.logoFrom.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>.</>}</p>
          </section>
        )}

        <h3 className="credits-h">{t.path}</h3>
        <ol className="path">
          {(c.path || []).map((s, k) => (
            <li key={k}><span>{s}</span></li>
          ))}
        </ol>

        <dl className="facts">
          {c.cost && <div><dt>{t.cost}</dt><dd>{c.cost}</dd></div>}
          <div><dt>{t.pay}</dt><dd>{pay}</dd></div>
          {outlook && <div><dt>{t.outlook}</dt><dd>{outlook}</dd></div>}
        </dl>
        <p className="note">{source ? <>{before}{linkify(source)}{after}</> : t.aiPath}</p>
        {sign && (
          <p className="note">
            Sign language video: American Sign Language Lexicon Video Dataset (ASLLVD), Boston University ASLLRP; Neidle, Thangali &amp; Sclaroff (2012), Neidle et al. (2022).{' '}
            <a href="http://www.bu.edu/asllrp/" target="_blank" rel="noreferrer">bu.edu/asllrp</a> · <a href="http://dai.cs.rutgers.edu/dai/s/signbank" target="_blank" rel="noreferrer">dai.cs.rutgers.edu</a>. Research and education use; sentences are joined from single signs and are not natural ASL grammar.
          </p>
        )}
      </div>

      <div className="credits-cta">
        <HostLine line={HOST.ready(t)} size={230} expr="cheer" pose="cheer" />
        <p className="credits-ask">{t.readyAsk}</p>
        <button className="btn-roll" onClick={onAudition}>{t.startTest}</button>
        <div className="row">
          <button className="btn-ghost" onClick={onReplay}>{t.watchAgain}</button>
          <button className="btn-ghost" onClick={onNew}>{t.anotherJob}</button>
        </div>
      </div>
    </main>
  )
}
