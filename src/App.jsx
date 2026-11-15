import { useCallback, useRef, useState } from 'react'
import Curtains from './Curtains.jsx'
import Lobby from './Lobby.jsx'
import Making from './Making.jsx'
import Player from './Player.jsx'
import Credits from './Credits.jsx'
import ScreenTest from './ScreenTest.jsx'
import { AccessProvider, useAccess, useT } from './access.jsx'
import { createTrailer } from './api.js'

function SignToggle() {
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
  const curtains = useRef(null)
  const [view, setView] = useState('lobby') // lobby | making | playing | credits | audition
  const [req, setReq] = useState(null)
  const [scenes, setScenes] = useState([])
  const [live, setLive] = useState({})
  const [trailer, setTrailer] = useState(null)
  const [error, setError] = useState('')
  const booted = useRef(false)

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

  const start = async (r) => {
    setReq(r)
    setScenes([])
    setError('')
    await swap('making')
    try {
      setLive({ stage: r.jd ? 'research' : 'script', research: r.research || null, jd: !!r.jd, startedAt: Date.now() })
      const t = await createTrailer(r, (i, s) => setScenes((prev) => [...prev, s]), (d) => setLive((l) => ({ ...l, ...d, research: d.research || l.research })))
      setTrailer(t)
      // Let the finished film strip sit on screen for a beat: the 'final cut' moment.
      setLive((l) => ({ ...l, status: 'done', stage: 'final', progress: { ...(l.progress || {}), voiced: t.scenes.length, signed: t.scenes.length, total: t.scenes.length }, draft: l.draft?.length ? l.draft : t.scenes.map((s) => ({ title: s.title, screen: s.screen })) }))
      await new Promise((r) => setTimeout(r, 2600))
      await swap('playing')
    } catch (e) {
      setError(e.message || 'Something went wrong.')
      await swap('lobby')
    }
  }

  const onFinish = useCallback(() => setView('credits'), [])

  return (
    <div className="app" ref={boot}>
      <Curtains ref={curtains} />
      <SignToggle />
      {error && <p className="toast err" role="alert">{t.trailerFailed(error)}</p>}
      {view === 'lobby' && <Lobby onStart={start} />}
      {view === 'making' && <Making job={live.job || req.job || t.yourJob} role={live.job || req.job || ''} live={live} />}
      {view === 'playing' && trailer && <Player key={trailer.job + trailer.lang} trailer={trailer} onFinish={onFinish} />}
      {view === 'credits' && trailer && (
        <Credits
          trailer={trailer}
          onAudition={() => swap('audition')}
          onReplay={() => swap('playing')}
          onNew={() => swap('lobby')}
        />
      )}
      {view === 'audition' && trailer && <ScreenTest job={trailer.job} jd={trailer.jd || ''} onExit={() => swap('lobby')} />}
    </div>
  )
}

export default function App() {
  return <AccessProvider><Shell /></AccessProvider>
}
