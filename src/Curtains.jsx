import { forwardRef, useImperativeHandle, useRef } from 'react'
import gsap from 'gsap'

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Two velvet panels. close() and open() return promises so the app can swap scenes behind them.
const Curtains = forwardRef(function Curtains(_, ref) {
  const left = useRef(null)
  const right = useRef(null)
  const wrap = useRef(null)

  useImperativeHandle(ref, () => ({
    close() {
      return new Promise((resolve) => {
        wrap.current.style.pointerEvents = 'auto'
        const d = reduce() ? 0 : 0.7
        gsap.to(left.current, { xPercent: 0, duration: d, ease: 'power3.inOut' })
        gsap.to(right.current, { xPercent: 0, duration: d, ease: 'power3.inOut', onComplete: resolve })
      })
    },
    open(delay = 0.1) {
      return new Promise((resolve) => {
        const d = reduce() ? 0 : 1.15
        gsap.to(left.current, { xPercent: -101, duration: d, delay, ease: 'power3.inOut' })
        gsap.to(right.current, {
          xPercent: 101, duration: d, delay, ease: 'power3.inOut',
          onComplete: () => { wrap.current.style.pointerEvents = 'none'; resolve() },
        })
      })
    },
  }))

  return (
    <div className="curtains" ref={wrap} aria-hidden="true">
      <div className="curtain curtain-l" ref={left} />
      <div className="curtain curtain-r" ref={right} />
    </div>
  )
})
export default Curtains
