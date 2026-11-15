import { useCallback, useEffect, useRef, useState } from 'react'
import Curtains from './Curtains.jsx'
import Lobby from './Lobby.jsx'
import Making from './Making.jsx'
import Player from './Player.jsx'
import Credits from './Credits.jsx'
import ScreenTest from './ScreenTest.jsx'
import { AccessProvider, useAccess, useT } from './access.jsx'
import { createTrailer, canSign, signText, getSession } from './api.js'
import { preload } from './speech.js'
import { withBrand } from './brand.js'

function SignToggle() {
  if (!canSign) return null
  const { sign, setSign } = useAccess()
  const t = useT()
  return (
    <button className="sign-toggle" onClick={() => setSign(!sign)} aria-pressed={sign}>
      {sign ? t.signOn : t.signOff}
    </button>
  )
}

function Shell() {
  const t = useT()
  const tr = t // the trailer request below shadows `t`
  const { sign: signOn, guest } = useAccess()
  const curtains = useRef(null)
  // Dev only: #screen-test opens the interview straight away (for testing without making a trailer).
  const devTest = import.meta.env.DEV && typeof location !== 'undefined' && location.hash === '#screen-test'
  const [view, setView] = useState(devTest ? 'audition' : 'lobby') // lobby | making | playing | credits | audition
  const [req, setReq] = useState(null)
  const [scenes, setScenes] = useState([])
  const [live, setLive] = useState({})
  const [trailer, setTrailer] = useState(devTest ? { job: 'Cybersecurity analyst', jd: '', scenes: [] } : null)
  const [error, setError] = useState('')
  const booted = useRef(false)
  const rolled = useRef(false)
  const [genre, setGenre] = useState(() => { try { return localStorage.getItem('dayone.genre') || 'feelgood' } catch { return 'feelgood' } })
  const [outfit, setOutfit] = useState(() => { try { return localStorage.getItem('dayone.outfit') || 'hoodie' } catch { return 'hoodie' } })
  const picks = useRef({}); picks.current = { genre, outfit }
  useEffect(() => { try { localStorage.setItem('dayone.genre', genre); localStorage.setItem('dayone.outfit', outfit) } catch { /* private mode */ } }, [genre, outfit])

  // One orchestrated moment on load: the curtains part.
  const boot = useCallback((el) => {
    if (!el || booted.current) return
    booted.current = true
    curtains.current?.open(0.35)
  }, [])

  const swap = async (next) => {
    await curtains.current.close()
    setView(next)
    window.scrollTo(0, 0)
    await curtains.current.open(0.05)
  }

  // Lobby -> making: the viewer directs first (genre, outfit); the trailer is ordered on "Action!".
  const start = async (r) => {
    setReq(r)
    setScenes([])
    setError('')
    setLive({ status: 'directing', stage: r.jd ? 'research' : 'script', research: r.research || null, jd: !!r.jd, startedAt: Date.now() })
    rolled.current = false
    await swap('making')
  }

  // "Continue practising": reopen a saved job (with its job description) straight into the interview.
  const practise = async (id) => {
    const s = await getSession(guest, id)
    if (!s?.job) return
    setTrailer({ job: s.job, company: s.company, jd: s.jd || '', scenes: [], ...picks.current })
    await swap('audition')
  }

  const roll = async () => {
    if (rolled.current || !req) return
    rolled.current = true
    const r = req
    try {
      setLive((l) => ({ ...l, status: 'running', startedAt: Date.now() }))
      // Bolt's intro line is known now; fetch its signing while the trailer is being made.
      if (signOn && r.job && !r.jd) { preload(tr.hostIntro(r.job), r.lang); signText(tr.hostIntro(r.job), r.lang) }
      const t = await createTrailer({ ...r, genre: picks.current.genre }, (i, s) => setScenes((prev) => [...prev, s]), (d) => {
        setLive((l) => ({ ...l, ...d, status: d.status === 'done' ? 'running' : d.status || l.status, research: l.research?.brandColor && !d.research?.brandColor ? l.research : d.research || l.research }))
        if (d.research?.logo && !d.research.brandColor) withBrand(d.research).then((rb) => rb.brandColor && setLive((l) => ({ ...l, research: rb })))
      })
      if (t.research) t.research = await withBrand(t.research)
      setTrailer({ ...t, ...picks.current })
      // The office rolls in and "It's a wrap!" shows, then the trailer starts.
      setLive((l) => ({ ...l, status: 'done', stage: 'final', progress: { ...(l.progress || {}), voiced: t.scenes.length, signed: t.scenes.length, total: t.scenes.length } }))
      await new Promise((res) => setTimeout(res, 4200))
      await swap('playing')
    } catch (e) {
      setError(e.message || t.genericError)
      await swap('lobby')
    }
  }

  const onFinish = useCallback(() => setView('credits'), [])

  return (
    <div className="app" ref={boot}>
      <Curtains ref={curtains} />
      <SignToggle />
      {error && <p className="toast err" role="alert">{t.trailerFailed(error)}</p>}
      {view === 'lobby' && <Lobby onStart={start} onPractise={practise} />}
      {view === 'making' && <Making role={live.job || req?.job || ''} live={live} genre={genre} setGenre={setGenre} outfit={outfit} setOutfit={setOutfit} onAction={roll} />}
      {view === 'playing' && trailer && <Player key={trailer.job + trailer.lang} trailer={trailer} onFinish={onFinish} />}
      {view === 'credits' && trailer && (
        <Credits
          trailer={trailer}
          onAudition={() => swap('audition')}
          onReplay={() => swap('playing')}
          onNew={() => swap('lobby')}
        />
      )}
      {view === 'audition' && trailer && <ScreenTest job={trailer.job} company={trailer.company || trailer.research?.company || ''} jd={trailer.jd || ''} outfit={outfit} onExit={() => swap('lobby')} />}
    </div>
  )
}

export default function App() {
  return <AccessProvider><Shell /></AccessProvider>
}
