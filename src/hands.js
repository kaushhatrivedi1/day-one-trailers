// Parametric cartoon hand. Geometry only: returns [tag, attrs] pairs, so React and static SVG share it.
// Drawn for a right hand, palm toward the viewer, fingers up, origin at the middle of the palm.
export const SKIN = '#F8FAFD'
export const LINE = '#1B2A4A'

const FX = [-10.5, -3.5, 3.5, 10.5] // finger base x: index, middle, ring, pinky
const FL = [24, 27, 24, 18] // finger lengths
const BASE = -6

const line = (d, w, stroke, extra = {}) => ['path', { d, fill: 'none', stroke, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...extra }]
const rad = (deg) => (deg * Math.PI) / 180

function fingerPath(i, state, spread = 0) {
  const x = FX[i], L = FL[i]
  const a = rad(spread)
  const sx = Math.sin(a), cy = Math.cos(a)
  if (state === 1) return `M${x} ${BASE}L${x + L * sx} ${BASE - L * cy}`
  if (state === 2) { const l = L * 0.62; return `M${x} ${BASE}L${x + l * sx} ${BASE - l * cy}` } // bent forward
  if (state === 3) { const l = L * 0.55; return `M${x} ${BASE}L${x + l * sx} ${BASE - l * cy}L${x + l * sx + 4} ${BASE - l * cy + 8}` } // hooked
  return null
}

// thumb: path from the thumb base, drawn either behind or in front of the fingers
const THUMBS = {
  side: { d: 'M-12 14L-17 -6', front: false },
  out: { d: 'M-12 12L-28 -2', front: false },
  horiz: { d: 'M-12 12L-32 10', front: false },
  up: { d: 'M-12 10L-17 -22', front: false },
  curve: { d: 'M-12 12Q-34 2 -18 -16', front: false },
  across: { d: 'M-12 12L8 9', front: true },
  acrossLow: { d: 'M-12 15L8 14', front: true },
  tuck: { d: 'M-12 12L-5 8', front: true },
  between: { d: 'M-8 8L-7 -9', front: true },
  touch: { d: 'M-12 12L-4 -8', front: true },
  touchHigh: { d: 'M-12 12L-9 -17', front: true },
  touchO: { d: 'M-12 12Q-24 -6 -8 -15', front: true },
}

// letter table: fingers [index, middle, ring, pinky] (0 curled, 1 up, 2 bent, 3 hooked, 4 crossed), thumb, spread degrees, rotation
export const SHAPES = {
  A: { f: [0, 0, 0, 0], t: 'side' },
  B: { f: [1, 1, 1, 1], t: 'across' },
  C: { f: [2, 2, 2, 2], t: 'curve' },
  D: { f: [1, 0, 0, 0], t: 'touch' },
  E: { f: [0, 0, 0, 0], t: 'acrossLow' },
  F: { f: [2, 1, 1, 1], t: 'touchHigh', s: [0, -4, 2, 8] },
  G: { f: [1, 0, 0, 0], t: 'side', rot: -90 },
  H: { f: [1, 1, 0, 0], t: 'tuck', rot: -90 },
  I: { f: [0, 0, 0, 1], t: 'across' },
  J: { f: [0, 0, 0, 1], t: 'across', rot: 20 },
  K: { f: [1, 1, 0, 0], t: 'between', s: [-9, 9, 0, 0] },
  L: { f: [1, 0, 0, 0], t: 'horiz' },
  M: { f: [0, 0, 0, 0], t: 'peekM' },
  N: { f: [0, 0, 0, 0], t: 'peekN' },
  O: { f: [2, 2, 2, 2], t: 'touchO', s: [8, 3, -3, -8] },
  P: { f: [1, 1, 0, 0], t: 'between', s: [-9, 9, 0, 0], rot: 160 },
  Q: { f: [1, 0, 0, 0], t: 'side', rot: 180 },
  R: { f: [4, 1, 0, 0], t: 'tuck' },
  S: { f: [0, 0, 0, 0], t: 'across' },
  T: { f: [0, 0, 0, 0], t: 'between' },
  U: { f: [1, 1, 0, 0], t: 'tuck' },
  V: { f: [1, 1, 0, 0], t: 'tuck', s: [-10, 10, 0, 0] },
  W: { f: [1, 1, 1, 0], t: 'tuck', s: [-13, 0, 13, 0] },
  X: { f: [3, 0, 0, 0], t: 'tuck' },
  Y: { f: [0, 0, 0, 1], t: 'out' },
  Z: { f: [1, 0, 0, 0], t: 'tuck', rot: 15 },
  // shapes used by words and poses
  FLAT: { f: [1, 1, 1, 1], t: 'across' },
  OPEN: { f: [1, 1, 1, 1], t: 'out', s: [-14, -5, 5, 14] },
  FIST: { f: [0, 0, 0, 0], t: 'across' },
  THUMBSUP: { f: [0, 0, 0, 0], t: 'up' },
  POINT: { f: [1, 0, 0, 0], t: 'tuck' },
  REST: { f: [2, 2, 2, 2], t: 'tuck' },
}

// A live hand from motion data: ext = [thumb, index, middle, ring, pinky], each 0 (curled) to 1 (straight).
export function shapeFromMotion(ext) {
  const [th, ...fs] = ext
  const f = fs.map((v) => (v > 0.66 ? 1 : v > 0.33 ? 2 : 0))
  const allUp = f.every((x) => x === 1)
  return {
    f,
    t: th > 0.75 ? (allUp ? 'out' : 'horiz') : th > 0.45 ? 'side' : f[0] === 0 ? 'across' : 'tuck',
    s: allUp && th > 0.75 ? [-12, -4, 4, 12] : undefined,
  }
}

export function handElements(name) {
  const sh = (typeof name === 'object' && name) || SHAPES[name] || SHAPES.FLAT
  const out = []
  const th = THUMBS[sh.t]
  const peek = sh.t === 'peekM' ? 7 : sh.t === 'peekN' ? 0 : null

  // 1) outlines of extended fingers and thumb-behind
  const paths = []
  for (let i = 0; i < 4; i++) {
    const p = fingerPath(i, sh.f[i], sh.s?.[i] || 0)
    if (!p) continue
    if (sh.f[i] === 4) { // crossed index: lean toward middle
      paths.push({ d: `M${FX[0]} ${BASE}L${FX[0] + 7} ${BASE - FL[0]}`, i })
    } else paths.push({ d: p, i })
  }
  if (sh.f[0] === 4) {
    // middle finger drawn over the index, leaning the other way
    paths.push({ d: `M${FX[1]} ${BASE}L${FX[1] - 6} ${BASE - FL[1]}`, i: 1, over: true })
  }
  const behind = th && !th.front ? th.d : null
  if (behind) out.push(line(behind, 10.5, LINE))
  for (const p of paths) if (!p.over || true) out.push(line(p.d, 9.6, LINE))

  // 2) palm
  out.push(['rect', { x: -14, y: -8, width: 28, height: 32, rx: 8, fill: SKIN, stroke: LINE, 'stroke-width': 3 }])

  // 3) finger fills, thumb-behind fill
  if (behind) out.push(line(behind, 7.2, SKIN))
  for (const p of paths) out.push(line(p.d, 6.4, SKIN))

  // thin lines between neighbouring standing fingers so they read as separate
  for (let i = 0; i < 3; i++) {
    if (sh.f[i] === 1 && sh.f[i + 1] === 1 && !(sh.s && (sh.s[i] || sh.s[i + 1]))) {
      const L = Math.min(FL[i], FL[i + 1]) - 4
      out.push(line(`M${(FX[i] + FX[i + 1]) / 2} ${BASE - 2}L${(FX[i] + FX[i + 1]) / 2} ${BASE - L}`, 1.2, LINE, { opacity: 0.55 }))
    }
  }
  // 4) curled fingers show as knuckles on the palm
  for (let i = 0; i < 4; i++) {
    if (sh.f[i] === 0) out.push(['circle', { cx: FX[i], cy: -4, r: 4.3, fill: SKIN, stroke: LINE, 'stroke-width': 1.8 }])
  }
  // fingertips on bent fingers: small cap
  for (let i = 0; i < 4; i++) {
    if (sh.f[i] === 2) {
      const a = rad(sh.s?.[i] || 0), l = FL[i] * 0.62
      out.push(['circle', { cx: FX[i] + l * Math.sin(a), cy: BASE - l * Math.cos(a), r: 3.6, fill: SKIN, stroke: LINE, 'stroke-width': 1.6 }])
    }
  }
  // 5) thumb in front, or the peeking thumb for M and N
  if (th && th.front) {
    out.push(line(th.d, 10.5, LINE))
    out.push(line(th.d, 7.2, SKIN))
  }
  if (peek !== null) {
    out.push(['circle', { cx: peek, cy: 1, r: 4.2, fill: SKIN, stroke: LINE, 'stroke-width': 1.8 }])
  }
  // palm crease and the little lines between standing fingers
  return out
}

export function elementsToSvg(els) {
  return els.map(([tag, a]) => `<${tag} ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('')
}
