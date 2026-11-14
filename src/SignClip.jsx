import { useEffect, useRef, useState } from 'react'

// Recorded ASL clips by a human signer, one per fixed Screen Test question.
// Drop files in public/signs/<id>.mp4 (see SIGN-VIDEOS.md). Missing clips are detected,
// so the app shows an honest notice instead of an empty window.
const cache = new Map()
function clipFor(id) {
  if (!id) return Promise.resolve(null)
  if (!cache.has(id)) {
    const src = `/signs/${id}.mp4`
    // A dev server answers unknown paths with index.html, so check the type, not just the status.
    // Ask for one byte with GET: Vite's dev server mislabels HEAD responses as text/html.
    cache.set(id, fetch(src, { headers: { Range: 'bytes=0-0' } })
      .then((r) => (r.ok && (r.headers.get('content-type') || '').startsWith('video/') ? src : null))
      .catch(() => null))
  }
  return cache.get(id)
}

export function useSignClip(id) {
  const [src, setSrc] = useState(undefined) // undefined: checking, null: none
  useEffect(() => {
    let live = true
    setSrc(undefined)
    clipFor(id).then((s) => live && setSrc(s))
    return () => { live = false }
  }, [id])
  return src
}

export default function SignClip({ src, label }) {
  const video = useRef(null)
  const replay = () => { const v = video.current; if (v) { v.currentTime = 0; v.play().catch(() => {}) } }
  return (
    <figure className="signclip">
      <video ref={video} key={src} src={src} autoPlay muted playsInline aria-label={label} />
      <figcaption>
        <span>ASL</span>
        <button className="btn-ghost small" onClick={replay}>Watch the sign again</button>
      </figcaption>
    </figure>
  )
}
