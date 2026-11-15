import { useEffect, useRef, useState } from 'react'
import Bolt, { OUTFITS } from './Outfit.jsx'
import { sceneArt } from './art.js'
import { useT } from './access.jsx'

// The wait is part of the show. First the viewer directs: a genre (narration tone, colour grade,
// cuts and music) and Bolt's outfit. Then, while the AI really makes the trailer, Bolt runs to work
// in a little game; the office arrives when the trailer is ready. The real AI steps sit in a strip.
const ORDER = ['research', 'script', 'voice', 'final']
export const GENRE_LIST = ['action', 'documentary', 'comedy', 'feelgood']
const GRADE = { action: 'rgba(255,90,40,.45)', documentary: 'rgba(60,140,160,.5)', comedy: 'rgba(255,210,60,.45)', feelgood: 'rgba(255,120,160,.4)' }

function Strip({ live, t }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id) }, [])
  const p = live.progress || { voiced: 0, signed: 0, total: 6 }
  const total = p.total || 6
  const stage = live.status === 'done' ? 'final' : live.stage || 'script'
  const at = ORDER.indexOf(stage)
  const elapsed = Math.max(0, Math.round((now - (live.startedAt || now)) / 1000))
  const directing = live.status === 'directing'
  const pct = directing ? 0 : stage === 'final' ? 100
    : stage === 'voice' ? 45 + Math.round(((p.voiced + p.signed) / (2 * total)) * 50)
    : stage === 'script' ? (live.jd ? 25 : 10) + Math.min(18, elapsed)
    : Math.min(18, 4 + elapsed)
  const steps = [
    ...(live.jd ? [{ id: 'research', label: t.stripResearch }] : []),
    { id: 'script', label: t.stripScript },
    { id: 'voice', label: t.stripVoice },
    { id: 'sign', label: t.stripSign },
    { id: 'final', label: t.stripCut },
  ]
  const state = (s) => {
    if (directing) return ''
    if (s.id === 'sign') return stage === 'final' || p.signed >= total ? 'done' : stage === 'voice' ? 'on' : ''
    if (s.id === 'voice') return stage === 'final' || p.voiced >= total ? 'done' : stage === 'voice' ? 'on' : ''
    const idx = ORDER.indexOf(s.id)
    return idx < at || stage === 'final' ? 'done' : idx === at ? 'on' : ''
  }
  const msg = stage === 'final' ? t.stripReady : stage === 'voice' ? `${t.voicedN(p.voiced, total)} · ${t.signedN(p.signed, total)}` : stage === 'research' ? t.stageResearch : t.stageScript
  return (
    <aside className="mk-strip" aria-live="polite" aria-label={t.backstage}>
      <div className="mk-strip-top"><span>{t.stripH}</span><span>{pct}%</span></div>
      <div className="mk-bar"><i style={{ width: `${pct}%` }} /></div>
      <ol>{steps.map((s) => <li key={s.id} className={state(s)}>{s.label}</li>)}</ol>
      <p className="mk-now">{directing ? t.stripWaiting : msg}</p>
    </aside>
  )
}

function Director({ genre, setGenre, outfit, setOutfit, onAction, t }) {
  const [spin, setSpin] = useState(false)
  const [pose, setPose] = useState('wave')
  const flash = (p) => { setPose(p); clearTimeout(flash.id); flash.id = setTimeout(() => setPose('rest'), 1100) }
  return (
    <>
      <section className="mk-desk">
        <div className="mk-panel">
          <h3>1 · {t.pickGenre}</h3>
          <p className="mk-sub">{t.pickGenreSub}</p>
          <div className="mk-genres" role="radiogroup" aria-label={t.pickGenre}>
            {GENRE_LIST.map((g, i) => (
              <button key={g} type="button" role="radio" aria-checked={genre === g} className={`mk-genre g-${g} ${genre === g ? 'on' : ''}`} style={{ '--grade': GRADE[g] }}
                onClick={() => { setGenre(g); flash('thumbsup') }}>
                <span className="mk-shot"><img src={sceneArt('office day', i + 1)} alt="" /><span className="mk-fx" /><span className="mk-gtag">{t.genres[g][0]}</span>
                  <span className="mk-eq" aria-hidden="true">{[0, 1, 2, 3].map((k) => <i key={k} style={{ animationDelay: `-${k * 0.23}s` }} />)}</span></span>
                <span className="mk-gtxt"><b>{t.genres[g][1]}</b> {t.genres[g][2]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="mk-panel">
          <h3>2 · {t.dressBolt}</h3>
          <p className="mk-sub">{t.dressSub}</p>
          <div className="mk-ward">
            <div className="mk-model">
              <span className="mk-olabel">{t.outfits[outfit]}</span>
              <div className="mk-turn" aria-hidden="true" />
              <div className={`mk-who ${spin ? 'swap' : ''}`}><Bolt outfit={outfit} size={210} pose={pose} expr={pose === 'rest' ? 'happy' : 'cheer'} label="Bolt" /></div>
            </div>
            <div className="mk-rail" role="radiogroup" aria-label={t.dressBolt}>
              {OUTFITS.map((o) => (
                <button key={o.id} type="button" role="radio" aria-checked={outfit === o.id} className={outfit === o.id ? 'on' : ''}
                  onClick={() => { setSpin(true); setTimeout(() => { setOutfit(o.id); setSpin(false); flash('cheer') }, 250) }}>
                  <span aria-hidden="true">{o.icon}</span>{t.outfits[o.id]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
      <div className="mk-action"><button className="mk-clap" onClick={onAction}>{t.action}</button></div>
    </>
  )
}

// Bolt runs to work: jump (space, click, tap) over obstacles and grab coins. Endless until `arrived`.
function Runner({ outfit, arrived, onCoins, t, live }) {
  const world = useRef(null), hero = useRef(null)
  const [coins, setCoins] = useState(0)
  const [best, setBest] = useState(0)
  const [tip, setTip] = useState(true)
  const stop = useRef(false)
  stop.current = arrived
  useEffect(() => { onCoins?.(coins) }, [coins]) // eslint-disable-line
  useEffect(() => {
    const w = world.current, h = hero.current
    if (!w || !h) return
    let y = 0, vy = 0, things = [], last = performance.now(), spawn = 30, raf, streak = 0, alive = true
    const jump = () => { if (y <= 0) { vy = 15; h.classList.add('jump') } }
    const key = (e) => { if (e.code === 'Space' && !/input|textarea/i.test(e.target.tagName)) { e.preventDefault(); jump() } }
    w.addEventListener('pointerdown', jump); addEventListener('keydown', key)
    const tipT = setTimeout(() => setTip(false), 5000)
    const OB = ['☕', '🚧', '💼', '📦']
    const pop = (txt, x, hgt) => { const s = document.createElement('span'); s.className = 'rn-pop'; s.textContent = txt; s.style.left = x + 'px'; s.style.bottom = 120 + hgt + 'px'; w.appendChild(s); setTimeout(() => s.remove(), 800) }
    const loop = (now) => {
      if (!alive) return
      const dt = Math.min(32, now - last) / 16.7; last = now
      vy -= 0.8 * dt; y = Math.max(0, y + vy * dt); if (y === 0) { vy = 0; h.classList.remove('jump') }
      h.style.transform = `translateY(${-y * 3}px)`
      spawn -= dt
      if (spawn <= 0 && !stop.current) {
        const coin = Math.random() < 0.55
        const el = document.createElement('div'); el.className = 'rn-thing ' + (coin ? 'rn-coin' : 'rn-obst'); el.textContent = coin ? '★' : OB[Math.floor(Math.random() * OB.length)]
        const hgt = coin ? (Math.random() < 0.5 ? 20 : 110) : 0
        el.style.bottom = 70 + hgt + 'px'; w.appendChild(el)
        things.push({ el, x: w.clientWidth + 20, coin, hgt }); spawn = 40 + Math.random() * 50
      }
      for (const o of things) {
        o.x -= 7 * dt; o.el.style.transform = `translateX(${o.x}px)`
        const hx = 130, near = o.x > hx - 20 && o.x < hx + 60, top = y * 3
        if (!o.done && near) {
          if (o.coin && Math.abs(top + 20 - o.hgt) < 70) { o.done = true; o.el.remove(); streak++; setCoins((c) => c + 1); setBest((b) => Math.max(b, streak)); pop('+1', o.x, o.hgt) }
          else if (!o.coin && top < 40) { o.done = true; streak = 0; h.classList.remove('hit'); void h.offsetWidth; h.classList.add('hit'); pop('oops', o.x, 40) }
        }
      }
      things = things.filter((o) => { if (o.x < -60 || (o.done && o.coin)) { if (o.x < -60) o.el.remove(); return false } return true })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { alive = false; cancelAnimationFrame(raf); clearTimeout(tipT); w.removeEventListener('pointerdown', jump); removeEventListener('keydown', key); things.forEach((o) => o.el.remove()) }
  }, [])
  const p = live.progress || {}
  const left = arrived ? 0 : Math.max(20, 400 - (live.stage === 'voice' ? 150 + Math.round(((p.voiced || 0) + (p.signed || 0)) / (2 * (p.total || 6)) * 230) : live.stage === 'script' ? 80 : 20))
  return (
    <section className="runner">
      <div className="rn-hud">
        <span className="rn-pill">{t.coins} <b>{coins}</b></span>
        <span className="rn-pill">{t.bestStreak} <b>{best}</b></span>
        <span className="rn-pill">{t.officeIn} <b>{arrived ? t.here : `${left} m`}</b></span>
        <span className="rn-help">{t.jumpHelp}</span>
      </div>
      <div className="rn-world" ref={world} role="application" aria-label={t.runnerLabel}>
        <div className="rn-sun" /><div className="rn-layer far" /><div className="rn-layer near" /><div className="rn-ground" />
        <div className={`rn-office ${arrived ? 'arrive' : ''}`}><b>{t.yourTrailer}</b><div className="rn-door" /></div>
        <div className="rn-hero" ref={hero}><div className="rn-body"><Bolt outfit={outfit} size={110} pose="cheer" expr="cheer" lookAt={false} label="" /></div></div>
        {tip && <span className="rn-tip">{t.runnerTip}</span>}
        {arrived && <div className="rn-wrap"><div><h2>{t.wrap}</h2><p>{t.wrapCoins(coins)}</p></div></div>}
      </div>
    </section>
  )
}

export default function Making({ role: rawRole = '', live = {}, genre, setGenre, outfit, setOutfit, onAction }) {
  const t = useT()
  const role = /^https?:\/\//i.test(rawRole) ? '' : rawRole
  const r = live.research
  const company = r?.company || live.company || ''
  const brand = r?.brandColor || ''
  const directing = live.status === 'directing'
  const done = live.status === 'done'
  // Never show the raw link as the title: until the role is known, Bolt is "reading the posting".
  const title = company ? t.dayAt(company) : role ? t.dayAs(role) : live.jd ? t.readingPosting : t.dayAs(t.yourJob)
  const auto = useRef(null)
  // If the viewer doesn't pick, roll anyway after a while so the trailer is never held up for long.
  useEffect(() => {
    if (!directing) return
    auto.current = setTimeout(onAction, 30000)
    return () => clearTimeout(auto.current)
  }, [directing]) // eslint-disable-line
  return (
    <main className="direct" style={brand ? { '--brand': brand } : undefined}>
      <Strip live={live} t={t} />
      <header className="mk-head">
        <small>{company && role ? `${role} · ` : ''}{directing ? t.youDirect : t.boltRunning}</small>
        <h1>{r?.logo && <img className="mk-logo" src={r.logo} alt="" />}{title === t.readingPosting ? <span className="mk-reading">{title}</span> : title}</h1>
        <p>{directing ? t.directSub : t.runSub}</p>
      </header>
      {directing
        ? <Director genre={genre} setGenre={setGenre} outfit={outfit} setOutfit={setOutfit} onAction={onAction} t={t} />
        : <Runner outfit={outfit} arrived={done} t={t} live={live} />}
    </main>
  )
}
