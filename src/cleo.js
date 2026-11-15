// Bolt, the Day One host: a glossy white robot with a glowing visor face. Pure geometry, shared by React and static design files.
import { handElements, SHAPES, LINE } from './hands.js'

export const WHITE = '#F8FAFD', SHADE = '#B4C2DA', NAVY = '#1B2433', OUT = '#1B2A4A'
export const BLUE = '#1F6FEB', BLUE_L = '#5FA8FF', VISOR = '#080D19', GLOW = '#4DF0FF', GOLD = '#FFC627'
const S = { l: [104, 174], r: [196, 174] }
const UA = 56, FA = 54
const HAND_SCALE = 1.25

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

function ik(s, w, side) {
  const dx = w[0] - s[0], dy = w[1] - s[1]
  const d = clamp(Math.hypot(dx, dy), Math.abs(UA - FA) + 2, UA + FA - 2)
  const ang = Math.atan2(dy, dx)
  const A = Math.acos(clamp((UA * UA + d * d - FA * FA) / (2 * UA * d), -1, 1))
  const e1 = [s[0] + UA * Math.cos(ang + A), s[1] + UA * Math.sin(ang + A)]
  const e2 = [s[0] + UA * Math.cos(ang - A), s[1] + UA * Math.sin(ang - A)]
  const score = (e) => e[1] + (side === 'r' ? e[0] : -e[0]) * 0.6
  const e = score(e1) > score(e2) ? e1 : e2
  return { e, w: [s[0] + d * Math.cos(ang), s[1] + d * Math.sin(ang)] }
}

// mouth shapes glow on the visor
export const MOUTHS = {
  rest: { d: 'M141 110 Q150 113 159 110', fill: 'none' },
  smile: { d: 'M137 106 Q150 120 163 106', fill: 'none' },
  closed: { d: 'M141 110 L159 110', fill: 'none' },
  wide: { d: 'M137 108 Q150 114 163 108 Q150 122 137 108Z', fill: GLOW },
  open: { d: 'M141 105 Q150 102 159 105 Q162 121 150 122 Q138 121 141 105Z', fill: GLOW },
  round: { d: 'M144 112 a6 7 0 1 0 12 0 a6 7 0 1 0 -12 0Z', fill: GLOW },
  teeth: { d: 'M140 106 L160 106', fill: 'none' },
  big: { d: 'M135 103 Q150 128 165 103Z', fill: GLOW },
}
// Polly viseme names -> mouth shapes
export const VISEME = { sil: 'rest', p: 'closed', f: 'teeth', a: 'open', '@': 'open', i: 'wide', e: 'wide', E: 'wide', s: 'wide', S: 'wide', t: 'wide', T: 'wide', k: 'wide', o: 'round', O: 'round', u: 'round', r: 'round' }

export const EXPR = {
  happy: { l: 'M120 99 Q130 83 140 99', r: 'M160 99 Q170 83 180 99', mouth: 'smile', gaze: [0, 0] },
  think: { l: 'M120 99 Q130 83 140 99', r: 'M160 93 L180 93', mouth: 'rest', gaze: [-3, -3] },
  surprised: { l: 'M121 92 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0Z', r: 'M161 92 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0Z', mouth: 'round', fillEyes: true, gaze: [0, 0] },
  caring: { l: 'M120 100 Q130 88 140 100', r: 'M160 100 Q170 88 180 100', mouth: 'smile', gaze: [0, 2] },
  cheer: { l: 'M118 101 Q130 77 142 101', r: 'M158 101 Q170 77 182 101', mouth: 'big', gaze: [0, 0] },
}

export const POSES = {
  rest: { rw: [204, 264], lw: [96, 264], rs: 'REST', ls: 'REST', rr: 178, lr: -178 },
  wave: { rw: [234, 108], lw: [96, 264], rs: 'OPEN', ls: 'REST', rr: 14, lr: -178 },
  thumbsup: { rw: [232, 176], lw: [96, 264], rs: 'THUMBSUP', ls: 'REST', rr: 0, lr: -178 },
  point: { rw: [254, 182], lw: [96, 264], rs: 'POINT', ls: 'REST', rr: 90, lr: -178 },
  cheer: { rw: [234, 112], lw: [66, 112], rs: 'OPEN', ls: 'OPEN', rr: 12, lr: -12 },
  think: { rw: [184, 156], lw: [96, 264], rs: 'POINT', ls: 'REST', rr: -12, lr: -178 },
  present: { rw: [228, 226], lw: [72, 226], rs: 'FLAT', ls: 'FLAT', rr: 60, lr: -60 },
}

function handGroup(side, w, shape, rot) {
  const sh = (typeof shape === 'object' && shape) || SHAPES[shape] || SHAPES.FLAT
  const shapeRot = sh.rot || 0
  const mirror = side === 'l'
  const total = mirror ? rot - shapeRot : rot + shapeRot
  const t = `translate(${w[0].toFixed(1)} ${w[1].toFixed(1)}) rotate(${total.toFixed(1)}) scale(${mirror ? -HAND_SCALE : HAND_SCALE} ${HAND_SCALE})`
  return ['g', { transform: t }, handElements(shape)]
}

// state: { expr, mouth (key of MOUTHS) | viseme, gaze:[x,y], blink, logo, pose: {rw,lw,rs,ls,rr,lr} }
export function cleoElements(state = {}) {
  const ex = EXPR[state.expr || 'happy']
  const mouthKey = state.mouth || (state.viseme ? VISEME[state.viseme] || 'rest' : ex.mouth)
  const m = MOUTHS[mouthKey] || MOUTHS.rest
  const gaze = state.gaze || ex.gaze
  const pose = { ...POSES.rest, ...(state.pose || {}) }
  const R = ik(S.r, pose.rw, 'r')
  const L = ik(S.l, pose.lw, 'l')
  const arm = (s, o) => `M${s[0]} ${s[1]}L${o.e[0].toFixed(1)} ${o.e[1].toFixed(1)}L${o.w[0].toFixed(1)} ${o.w[1].toFixed(1)}`
  const stroke = (d, w, c) => ['path', { d, fill: 'none', stroke: c, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }]
  const aR = arm(S.r, R), aL = arm(S.l, L)
  const o = { stroke: OUT, 'stroke-width': 3 }

  const els = []
  els.push(['ellipse', { cx: 150, cy: 323, rx: 96, ry: 7, fill: '#000', opacity: 0.25 }])
  // legs, knees, shoes
  for (const x of [128, 172]) {
    els.push(['rect', { x: x - 17, y: 248, width: 34, height: 52, rx: 15, fill: WHITE, ...o }])
    els.push(['circle', { cx: x, cy: 282, r: 15, fill: BLUE, ...o }])
    els.push(['rect', { x: x - 16, y: 288, width: 32, height: 26, rx: 12, fill: WHITE, ...o }])
    els.push(['circle', { cx: x, cy: 282, r: 15, fill: BLUE, ...o }])
  }
  for (const [x, f] of [[124, -1], [176, 1]]) {
    els.push(['ellipse', { cx: x, cy: 311, rx: 33, ry: 16, fill: WHITE, ...o }])
    els.push(['path', { d: `M${x - 33} 313 Q${x} 330 ${x + 33} 313 L${x + 33} 317 Q${x} 335 ${x - 33} 317Z`, fill: BLUE, ...o, 'stroke-linejoin': 'round' }])
  }
  // torso
  els.push(['rect', { x: 94, y: 142, width: 112, height: 118, rx: 50, fill: WHITE, ...o }])
  els.push(['path', { d: 'M96 206 Q100 258 150 258 Q200 258 204 206 Q192 240 150 240 Q108 240 96 206Z', fill: SHADE }])
  els.push(['rect', { x: 102, y: 244, width: 96, height: 16, rx: 8, fill: NAVY }])
  els.push(['rect', { x: 134, y: 134, width: 32, height: 14, rx: 7, fill: NAVY }])
  // chest badge: the event logo lives here
  els.push(['circle', { cx: 150, cy: 200, r: 26, fill: BLUE_L, ...o }])
  els.push(['circle', { cx: 150, cy: 200, r: 21, fill: BLUE }])
  if (state.logo) {
    els.push(['circle', { cx: 150, cy: 200, r: 18, fill: '#fff' }])
    els.push(['image', { href: state.logo, x: 134, y: 184, width: 32, height: 32, preserveAspectRatio: 'xMidYMid meet' }])
  } else {
    els.push(['circle', { cx: 150, cy: 200, r: 7, fill: GOLD }])
    els.push(['g', { stroke: GOLD, 'stroke-width': 2.6, 'stroke-linecap': 'round' }, [
      ['path', { d: 'M150 187V190' }], ['path', { d: 'M150 210V213' }], ['path', { d: 'M137 200H140' }], ['path', { d: 'M160 200H163' }],
      ['path', { d: 'M141 191L143 193' }], ['path', { d: 'M159 191L157 193' }], ['path', { d: 'M141 209L143 207' }], ['path', { d: 'M159 209L157 207' }]]])
  }
  // antenna
  els.push(['line', { x1: 150, y1: 42, x2: 150, y2: 26, stroke: NAVY, 'stroke-width': 5, 'stroke-linecap': 'round' }])
  els.push(['circle', { cx: 150, cy: 18, r: 9, fill: BLUE, ...o }])
  els.push(['circle', { cx: 147, cy: 15, r: 3, fill: '#CFE5FF' }])
  // head
  els.push(['ellipse', { cx: 150, cy: 90, rx: 66, ry: 54, fill: WHITE, ...o }])
  els.push(['path', { d: 'M86 104 Q104 142 150 142 Q196 142 214 104 Q198 130 150 132 Q102 130 86 104Z', fill: SHADE }])
  els.push(['path', { d: 'M96 62 Q120 42 156 44', fill: 'none', stroke: '#fff', 'stroke-width': 5, 'stroke-linecap': 'round' }])
  // headphones
  for (const x of [84, 216]) {
    els.push(['ellipse', { cx: x, cy: 94, rx: 11, ry: 25, fill: WHITE, ...o }])
    els.push(['ellipse', { cx: x, cy: 94, rx: 5, ry: 15, fill: BLUE }])
  }
  // visor with glowing face
  els.push(['rect', { x: 98, y: 58, width: 104, height: 66, rx: 31, fill: VISOR, stroke: NAVY, 'stroke-width': 3 }])
  els.push(['path', { d: 'M112 70 Q130 60 154 62', fill: 'none', stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.2 }])
  const gx = gaze[0] * 0.8, gy = gaze[1] * 0.8
  const eyes = state.blink
    ? [['path', { d: 'M121 97 L139 97', fill: 'none', stroke: GLOW, 'stroke-width': 6, 'stroke-linecap': 'round' }], ['path', { d: 'M161 97 L179 97', fill: 'none', stroke: GLOW, 'stroke-width': 6, 'stroke-linecap': 'round' }]]
    : ex.fillEyes
      ? [['path', { d: ex.l, fill: GLOW }], ['path', { d: ex.r, fill: GLOW }]]
      : [['path', { d: ex.l, fill: 'none', stroke: GLOW, 'stroke-width': 7, 'stroke-linecap': 'round' }], ['path', { d: ex.r, fill: 'none', stroke: GLOW, 'stroke-width': 7, 'stroke-linecap': 'round' }]]
  els.push(['g', { transform: `translate(${gx.toFixed(1)} ${gy.toFixed(1)})` }, eyes])
  els.push(['path', { d: m.d, fill: m.fill, stroke: GLOW, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }])
  // arms: navy outline, white sleeve, blue cuff, navy elbow, then hands
  for (const [a, w, sh] of [[aL, L, 'l'], [aR, R, 'r']]) {
    els.push(stroke(a, 33, OUT)); els.push(stroke(a, 27, WHITE))
    els.push(['circle', { cx: w.e[0].toFixed(1), cy: w.e[1].toFixed(1), r: 11, fill: NAVY }])
    els.push(['circle', { cx: w.w[0].toFixed(1), cy: w.w[1].toFixed(1), r: 15, fill: BLUE, ...o }])
  }
  // shoulders
  for (const s of [S.l, S.r]) els.push(['circle', { cx: s[0], cy: s[1], r: 17, fill: BLUE, ...o }])
  els.push(handGroup('l', L.w, pose.ls, pose.lr))
  els.push(handGroup('r', R.w, pose.rs, pose.rr))
  return els
}

// ---- rendering helpers ----
export function toSvgString(els) {
  const one = ([tag, a, kids]) => {
    const attrs = Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ')
    return kids ? `<${tag} ${attrs}>${kids.map(one).join('')}</${tag}>` : `<${tag} ${attrs}/>`
  }
  return els.map(one).join('')
}
export const VIEWBOX = '0 4 300 326'
// Upper body only, for the signing window (head, shoulders, signing space).
export const VIEWBOX_SIGN = '30 4 240 250'
