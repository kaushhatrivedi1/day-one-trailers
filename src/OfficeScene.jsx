import Cleo from './Cleo.jsx'

// Bolt's workday as an animated set. Six fixed settings (arrive, desk, meeting, problem, fixed, home),
// with props for the job's "kit" on the monitor and whiteboard. Pure SVG + CSS animation, so it
// renders instantly in any language and needs no image model. Motion respects prefers-reduced-motion.

const SKY = [
  ['#FFB88A', '#FFE3B3'], // morning
  ['#7CC8FF', '#CFEAFF'], // day
  ['#7CC8FF', '#CFEAFF'],
  ['#F7A35C', '#FFD7A1'], // afternoon
  ['#9BE3C8', '#E2FFF2'],
  ['#1B1446', '#4B2A7A'], // night
]

// What the job's screen shows. Each returns SVG drawn inside a 300 x 170 monitor area.
function Screen({ kit, mood }) {
  const red = mood === 'alert', ok = mood === 'ok'
  const ink = red ? '#FF6B6B' : ok ? '#4DE89B' : '#4DF0FF'
  const kits = {
    code: (
      <g className="scr-scroll">
        {Array.from({ length: 12 }).map((_, i) => (
          <g key={i} transform={`translate(${14 + (i % 3) * 12}, ${16 + i * 16})`}>
            <rect width={30 + ((i * 37) % 60)} height="7" rx="3" fill={['#FF6B9A', '#FFD25A', '#4DF0FF', '#9B8CFF'][i % 4]} />
            <rect x={36 + ((i * 37) % 60)} width={40 + ((i * 53) % 90)} height="7" rx="3" fill="#C9D4F2" opacity=".7" />
          </g>
        ))}
      </g>
    ),
    data: (
      <g>
        {[40, 72, 55, 96, 80, 120, 104].map((h, i) => (
          <rect key={i} className="scr-bar" style={{ animationDelay: `${i * 0.12}s` }} x={22 + i * 38} y={150 - h} width="24" height={h} rx="4" fill={i === 5 ? '#FFD25A' : ink} />
        ))}
        <path className="scr-line" d="M20 120 L60 98 L100 108 L140 70 L180 82 L220 40 L270 30" fill="none" stroke="#FF6B9A" strokeWidth="4" strokeLinecap="round" />
      </g>
    ),
    security: (
      <g>
        <path d="M150 22 L200 40 V86 Q200 128 150 148 Q100 128 100 86 V40Z" fill="none" stroke={ink} strokeWidth="6" />
        <path d="M128 86 L145 103 L176 70" fill="none" stroke={ink} strokeWidth="7" strokeLinecap="round" className={ok ? 'scr-pop' : ''} opacity={red ? 0.2 : 1} />
        <rect className="scr-scan" x="0" y="0" width="300" height="10" fill={ink} opacity=".35" />
        {red && <text x="150" y="98" textAnchor="middle" fontSize="54" fontWeight="900" fill="#FF6B6B">!</text>}
      </g>
    ),
    finance: (
      <g>
        <path className="scr-line" d="M14 130 L50 118 L80 124 L112 90 L146 98 L180 60 L214 72 L250 36 L286 44" fill="none" stroke={red ? '#FF6B6B' : '#4DE89B'} strokeWidth="5" strokeLinecap="round" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <rect key={i} x={20 + i * 34} y={140} width="18" height={10 + ((i * 7) % 16)} fill="#C9D4F2" opacity=".5" />)}
      </g>
    ),
    accounting: (
      <g>
        {Array.from({ length: 7 }).map((_, i) => (
          <g key={i} className="scr-row" style={{ animationDelay: `${i * 0.15}s` }}>
            <rect x="16" y={16 + i * 20} width="150" height="10" rx="3" fill="#C9D4F2" opacity=".7" />
            <rect x="196" y={16 + i * 20} width="86" height="10" rx="3" fill={red && i === 4 ? '#FF6B6B' : ink} />
          </g>
        ))}
      </g>
    ),
    marketing: (
      <g>
        {[0, 1, 2].map((i) => (
          <g key={i} className="scr-row" style={{ animationDelay: `${i * 0.25}s` }} transform={`translate(${14 + i * 95}, 22)`}>
            <rect width="84" height="110" rx="10" fill={['#FF6B9A', '#FFD25A', '#9B8CFF'][i]} />
            <circle cx="42" cy="44" r="20" fill="#fff" opacity=".85" />
            <rect x="14" y="76" width="56" height="9" rx="4" fill="#fff" />
          </g>
        ))}
        <rect x="14" y="146" width={red ? 60 : 270} height="10" rx="5" fill={ink} className="scr-grow" />
      </g>
    ),
    health: (
      <path className="scr-line" d="M10 90 L80 90 L96 50 L116 130 L136 70 L150 90 L290 90" fill="none" stroke={ink} strokeWidth="6" strokeLinejoin="round" />
    ),
    trades: (
      <g className="scr-spin" style={{ transformOrigin: '150px 85px' }}>
        <circle cx="150" cy="85" r="40" fill="none" stroke={ink} strokeWidth="16" strokeDasharray="14 10" />
        <circle cx="150" cy="85" r="16" fill={ink} />
      </g>
    ),
  }
  return kits[kit] || (
    <g>{Array.from({ length: 6 }).map((_, i) => <rect key={i} x="20" y={20 + i * 22} width={200 - (i % 3) * 40} height="10" rx="4" fill={ink} opacity=".8" />)}</g>
  )
}

function Monitor({ x, y, kit, mood, label, scale = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x="-8" y="-8" width="316" height="186" rx="14" fill="#141A2E" />
      <rect width="300" height="170" rx="8" fill={mood === 'alert' ? '#2A0F18' : '#0B1226'} className={mood === 'alert' ? 'scr-flash' : ''} />
      <svg width="300" height="170" viewBox="0 0 300 170"><Screen kit={kit} mood={mood} /></svg>
      {label && <text x="150" y="-18" textAnchor="middle" fontSize="20" fontWeight="800" fill="#F6F3FF">{label}</text>}
      <rect x="130" y="178" width="40" height="34" fill="#141A2E" />
      <rect x="96" y="208" width="108" height="12" rx="6" fill="#141A2E" />
    </g>
  )
}

const Person = ({ x, y, skin, shirt, hair, flip, delay = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`} className="person" style={{ animationDelay: `${delay}s` }}>
    <rect x="-38" y="40" width="76" height="110" rx="34" fill={shirt} />
    <circle cx="0" cy="10" r="34" fill={skin} />
    <path d={hair} fill="#2A1A14" />
    <circle cx="12" cy="10" r="4" fill="#1B2433" />
  </g>
)

const TEAM = [
  { skin: '#8D5524', shirt: '#2FD3C0', hair: 'M-34 4 Q0 -40 34 4 Q20 -14 -34 4Z' },
  { skin: '#F1C27D', shirt: '#FF6B9A', hair: 'M-36 14 Q-30 -36 30 -24 Q40 0 36 30 Q30 -10 -36 14Z' },
  { skin: '#C68642', shirt: '#9B8CFF', hair: 'M-30 -10 Q0 -34 30 -10Z' },
]

function Set({ index, kit, screen }) {
  const [sky, sky2] = SKY[index] || SKY[1]
  const night = index === 5
  const wall = night ? '#2B2150' : '#F3E9FF'
  const floor = night ? '#1A1236' : '#C9B8E8'
  const winSky = (
    <>
      <defs>
        <linearGradient id={`sky${index}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={sky} /><stop offset="1" stopColor={sky2} /></linearGradient>
      </defs>
    </>
  )
  const city = (y, lit) => (
    <g>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const h = 90 + ((i * 53) % 120)
        return (
          <g key={i}>
            <rect x={i * 70} y={y - h} width="60" height={h} fill={night ? '#120C2C' : '#8FA6D9'} />
            {Array.from({ length: Math.floor(h / 26) }).map((_, r) => (
              <rect key={r} x={i * 70 + 12} y={y - h + 12 + r * 26} width="12" height="12" fill={lit && (i + r) % 3 !== 0 ? '#FFD25A' : night ? '#241A4A' : '#C9D7F7'} className={lit ? 'win-blink' : ''} style={{ animationDelay: `${(i * 3 + r) * 0.2}s` }} />
            ))}
          </g>
        )
      })}
    </g>
  )

  if (index === 0 || index === 5) {
    // Lobby: glass doors, plant, reception sign; at night, the same lobby with the city lit.
    return (
      <g>
        {winSky}
        <rect width="1280" height="720" fill={`url(#sky${index})`} />
        <g transform="translate(0 470)">{city(0, night)}</g>
        <g transform="translate(640 470)">{city(0, night)}</g>
        {night && [120, 300, 860, 1100].map((x, i) => <circle key={i} cx={x} cy={60 + i * 20} r="2.5" fill="#fff" className="win-blink" style={{ animationDelay: `${i * 0.7}s` }} />)}
        <rect y="470" width="1280" height="250" fill={floor} />
        <rect y="470" width="1280" height="10" fill={night ? '#3A2C6E' : '#A794D6'} />
        <g transform="translate(860 150)">
          <rect width="300" height="320" rx="10" fill="#26102B" />
          <rect x="16" y="16" width="128" height="304" fill="#7EE6FF" opacity=".35" className={index === 0 ? 'door-l' : 'door-l open'} />
          <rect x="156" y="16" width="128" height="304" fill="#7EE6FF" opacity=".35" className={index === 0 ? 'door-r' : 'door-r open'} />
          <rect x="60" y="-46" width="180" height="36" rx="8" fill="#FFD25A" />
          <text x="150" y="-21" textAnchor="middle" fontSize="20" fontWeight="900" fill="#26102B">DAY ONE CO.</text>
        </g>
        <g transform="translate(150 380)">
          <rect x="-26" y="40" width="52" height="56" rx="8" fill="#FF6B9A" />
          {[-30, 0, 30].map((a) => <ellipse key={a} cx="0" cy="10" rx="12" ry="46" fill="#2FD3C0" transform={`rotate(${a})`} />)}
        </g>
      </g>
    )
  }

  if (index === 2) {
    // Meeting room: whiteboard with today's topic, teammates around a table.
    return (
      <g>
        {winSky}
        <rect width="1280" height="720" fill={wall} />
        <rect x="60" y="80" width="300" height="220" rx="12" fill={`url(#sky${index})`} stroke="#26102B" strokeWidth="10" />
        <g transform="translate(60 300)">{city(0, false)}</g>
        <rect x="60" y="80" width="300" height="220" rx="12" fill="none" stroke="#26102B" strokeWidth="10" />
        <g transform="translate(470 70)">
          <rect width="520" height="300" rx="14" fill="#fff" stroke="#26102B" strokeWidth="8" />
          <text x="260" y="64" textAnchor="middle" fontSize="36" fontWeight="900" fill="#26102B">{screen}</text>
          <svg x="110" y="90" width="300" height="170" viewBox="0 0 300 170"><Screen kit={kit} /></svg>
        </g>
        <rect y="520" width="1280" height="200" fill={floor} />
        <Person x={230} y={392} {...TEAM[0]} delay={0} />
        <Person x={380} y={402} {...TEAM[1]} delay={0.6} />
        <Person x={1080} y={398} {...TEAM[2]} flip delay={1.2} />
        <rect x="120" y="500" width="1040" height="40" rx="20" fill="#5A3A7A" />
        <rect x="160" y="540" width="20" height="120" fill="#3F2759" />
        <rect x="1100" y="540" width="20" height="120" fill="#3F2759" />
        {[300, 520, 760, 960].map((x, i) => <rect key={i} x={x} y="478" width="60" height="26" rx="6" fill={['#FFD25A', '#2FD3C0', '#FF6B9A', '#9B8CFF'][i]} />)}
      </g>
    )
  }

  // Desk scenes (1 normal, 3 alert, 4 fixed).
  const mood = index === 3 ? 'alert' : index === 4 ? 'ok' : 'normal'
  return (
    <g>
      {winSky}
      <rect width="1280" height="720" fill={wall} />
      <rect x="880" y="70" width="340" height="250" rx="12" fill={`url(#sky${index})`} />
      <g transform="translate(880 320)"><g transform="scale(.5)">{city(0, false)}</g></g>
      <rect x="880" y="70" width="340" height="250" rx="12" fill="none" stroke="#26102B" strokeWidth="10" />
      <rect x="880" y="190" width="340" height="8" fill="#26102B" />
      <rect x="70" y="90" width="140" height="180" rx="8" fill="#FFD25A" opacity=".9" />
      <rect x="90" y="112" width="100" height="10" rx="5" fill="#26102B" opacity=".5" />
      <rect x="90" y="134" width="70" height="10" rx="5" fill="#26102B" opacity=".5" />
      <rect y="520" width="1280" height="200" fill={floor} />
      <rect x="200" y="470" width="760" height="34" rx="10" fill="#7A4A2A" />
      <rect x="230" y="504" width="22" height="170" fill="#5A361E" />
      <rect x="908" y="504" width="22" height="170" fill="#5A361E" />
      <Monitor x={300} y={214} kit={kit} mood={mood} label={screen} />
      <rect x="350" y="446" width="220" height="20" rx="6" fill="#2A3350" />
      <g transform="translate(700 420)">
        <rect width="54" height="50" rx="8" fill="#F6F3FF" />
        <path d="M54 12 Q76 14 70 34 Q66 44 54 40" fill="none" stroke="#F6F3FF" strokeWidth="8" />
        {[0, 1, 2].map((i) => <path key={i} className="steam" style={{ animationDelay: `${i * 0.5}s` }} d={`M${14 + i * 12} -6 q-8 -14 0 -26`} fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".7" />)}
      </g>
      {mood === 'ok' && Array.from({ length: 24 }).map((_, i) => (
        <rect key={i} className="confetti" style={{ animationDelay: `${(i % 8) * 0.18}s`, '--x': `${(i * 47) % 900 + 150}px` }} width="12" height="18" rx="3" fill={['#FFD25A', '#FF6B9A', '#2FD3C0', '#9B8CFF'][i % 4]} />
      ))}
      {mood === 'alert' && <circle cx="455" cy="300" r="150" fill="#FF3B5C" opacity=".12" className="alarm" />}
    </g>
  )
}

// Where Bolt stands and what he does in each setting.
const BOLT = [
  { cls: 'walk-in', pose: 'wave', expr: 'happy' },
  { cls: 'at-desk', pose: 'present', expr: 'happy' },
  { cls: 'at-board', pose: 'point', expr: 'happy' },
  { cls: 'at-desk worried', pose: 'think', expr: 'surprised' },
  { cls: 'at-desk', pose: 'cheer', expr: 'cheer' },
  { cls: 'walk-out', pose: 'wave', expr: 'happy' },
]

export default function OfficeScene({ index = 0, kit = 'general', screen = '', talking, duration = 7, label }) {
  const b = BOLT[index] || BOLT[1]
  return (
    <div className={`office s${index}`} style={{ '--dur': `${duration}s` }} role="img" aria-label={label}>
      <svg className="office-set" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <Set index={index} kit={kit} screen={screen} />
      </svg>
      <div className={`office-bolt ${b.cls}`} aria-hidden="true">
        <div className="bob"><Cleo size={260} pose={b.pose} expr={b.expr} speaking={talking} lookAt={false} label="" /></div>
      </div>
    </div>
  )
}
