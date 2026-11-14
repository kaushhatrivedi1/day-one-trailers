// A sign framed with chasing bulbs. The chase is CSS; bulbs are placed around the rectangle.
export default function Marquee({ children, cols = 22, rows = 5 }) {
  const bulbs = []
  const total = (cols + rows) * 2 - 4
  let n = 0
  const add = (style) => bulbs.push(<i key={n} className="bulb" style={{ ...style, animationDelay: `${(n % 4) * -0.25}s` }} />) && n++
  for (let c = 0; c < cols; c++) add({ left: `${(c / (cols - 1)) * 100}%`, top: '0%' })
  for (let r = 1; r < rows - 1; r++) add({ left: '100%', top: `${(r / (rows - 1)) * 100}%` })
  for (let c = cols - 1; c >= 0; c--) add({ left: `${(c / (cols - 1)) * 100}%`, top: '100%' })
  for (let r = rows - 2; r > 0; r--) add({ left: '0%', top: `${(r / (rows - 1)) * 100}%` })
  return (
    <div className="marquee" data-total={total}>
      {bulbs}
      <div className="marquee-face">{children}</div>
    </div>
  )
}
