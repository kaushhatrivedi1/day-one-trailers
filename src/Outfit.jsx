import Cleo from './Cleo.jsx'

// Bolt's wardrobe, picked on the making screen and worn in every scene. Each outfit is SVG drawn
// in Bolt's own coordinate space (viewBox 0 4 300 326), laid over him.
export const OUTFITS = [
  { id: 'hoodie', icon: '🧥', svg: `<path d="M92 236 L92 168 Q92 140 150 140 Q208 140 208 168 L208 236 Q208 252 190 252 L110 252 Q92 252 92 236Z" fill="#6d4bea"/><path d="M112 150 Q150 182 188 150 Q178 140 150 140 Q122 140 112 150Z" fill="#4a2fc0"/><path d="M138 160 l-4 34 M162 160 l4 34" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M118 214 h64 v22 q0 8 -8 8 h-48 q-8 0 -8 -8z" fill="#5a3bd6"/><rect x="92" y="244" width="116" height="10" rx="5" fill="#4a2fc0"/>` },
  { id: 'hardhat', icon: '⛑️', svg: `<path d="M82 64 Q82 16 150 14 Q218 16 218 64Z" fill="#ffc21a" stroke="#c98d00" stroke-width="4" stroke-linejoin="round"/><rect x="68" y="58" width="164" height="14" rx="7" fill="#ffc21a" stroke="#c98d00" stroke-width="4"/><rect x="141" y="14" width="18" height="46" rx="7" fill="#ffd95e"/><rect x="100" y="152" width="100" height="90" rx="14" fill="#ff7a1a" opacity=".95"/><path d="M100 196 h100 M100 214 h100" stroke="#e9ff6a" stroke-width="7"/>` },
  { id: 'headset', icon: '🎧', svg: `<path d="M78 92 Q78 22 150 22 Q222 22 222 92" fill="none" stroke="#1c1c2a" stroke-width="11" stroke-linecap="round"/><rect x="64" y="72" width="30" height="46" rx="12" fill="#2fd3c0" stroke="#1c1c2a" stroke-width="4"/><rect x="206" y="72" width="30" height="46" rx="12" fill="#2fd3c0" stroke="#1c1c2a" stroke-width="4"/><path d="M80 116 Q86 146 122 140" fill="none" stroke="#1c1c2a" stroke-width="5" stroke-linecap="round"/><circle cx="126" cy="139" r="7" fill="#1c1c2a"/>` },
  { id: 'labcoat', icon: '🥼', svg: `<path d="M90 238 L90 170 Q90 142 132 140 L148 258 L104 258 Q90 258 90 238Z" fill="#fbfbff" stroke="#c8cde0" stroke-width="3"/><path d="M210 238 L210 170 Q210 142 168 140 L152 258 L196 258 Q210 258 210 238Z" fill="#fbfbff" stroke="#c8cde0" stroke-width="3"/><path d="M132 140 L120 176 L140 186 M168 140 L180 176 L160 186" fill="none" stroke="#c8cde0" stroke-width="3"/><rect x="176" y="200" width="22" height="18" rx="3" fill="#dbe7ff"/><circle cx="126" cy="96" r="20" fill="none" stroke="#1c1c2a" stroke-width="5"/><circle cx="174" cy="96" r="20" fill="none" stroke="#1c1c2a" stroke-width="5"/><path d="M146 94 h8" stroke="#1c1c2a" stroke-width="5"/>` },
  { id: 'suit', icon: '👔', svg: `<path d="M90 238 L90 170 Q90 142 134 140 L150 230 L166 140 Q210 142 210 170 L210 238 Q210 258 192 258 L108 258 Q90 258 90 238Z" fill="#283454"/><path d="M134 140 L150 230 L166 140 Q150 136 134 140Z" fill="#fff"/><path d="M150 150 l-8 8 8 52 8 -52z" fill="#e2445c"/><path d="M134 140 L124 172 L142 180 M166 140 L176 172 L158 180" fill="none" stroke="#3d4b72" stroke-width="4"/>` },
]
export const outfitById = (id) => OUTFITS.find((o) => o.id === id)

// Bolt wearing an outfit. Same props as Cleo, plus `outfit` (an id; none = his plain look).
export default function Bolt({ outfit, size = 260, ...rest }) {
  const o = outfitById(outfit)
  return (
    <div className="bolt-dressed" style={{ position: 'relative', width: size }}>
      <Cleo size={size} {...rest} />
      {o && <svg className="bolt-outfit" viewBox="0 4 300 326" aria-hidden="true" dangerouslySetInnerHTML={{ __html: o.svg }} />}
    </div>
  )
}
