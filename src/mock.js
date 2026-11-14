// Demo data used when VITE_API_URL is empty. The real backend returns the same shapes.
import { sceneArt } from './art.js'

export const LANGUAGES = [
  { code: 'en', label: 'English', voice: 'en-US' },
  { code: 'es', label: 'Español', voice: 'es-MX' },
  { code: 'hi', label: 'हिन्दी', voice: 'hi-IN' },
  { code: 'ar', label: 'العربية', voice: 'ar-SA' },
  { code: 'vi', label: 'Tiếng Việt', voice: 'vi-VN' },
]

export const NOW_SHOWING = [
  { job: 'Lineworker', tag: 'Climbs poles when the power is out', watching: 128 },
  { job: 'Marine biologist', tag: 'Counts fish for a living', watching: 94 },
  { job: 'Nurse practitioner', tag: 'Runs the exam room', watching: 211 },
  { job: 'UX researcher', tag: 'Asks why people got stuck', watching: 67 },
  { job: 'Welder', tag: 'Joins metal that holds bridges up', watching: 83 },
  { job: 'Sound engineer', tag: 'Makes the quiet part audible', watching: 52 },
]

const SPECIFIC = {
  lineworker: {
    en: [
      ['5:10 a.m.', 'Okay, it’s ten past five. A storm knocked the power out for four hundred homes overnight, so your boots are already by the door.'],
      ['The briefing', 'The crew lead pulls up the outage map. Everybody on the truck knows their job, and who’s watching their back.'],
      ['Up the pole', 'Now you’re forty feet up, with a harness and a plan. It’s slow on purpose. Mistakes up here are dangerous.'],
      ['The knot in the problem', 'Then a cable turns out to be damaged where nobody expected. So you test it, talk it through, and change the plan.'],
      ['Lights on', 'And then the street flickers back on. A kid waves from a window. You write your report and refill the water jug.'],
      ['The ride home', 'You’re tired, you’re hungry, and you’re kind of proud. Tomorrow could be quiet, or it could be another storm.'],
    ],
    es: [
      ['5:10 a. m.', 'Tus botas ya están junto a la puerta. Una tormenta dejó sin luz a cuatrocientas casas durante la noche.'],
      ['La reunión', 'El jefe de cuadrilla marca el apagón en una tableta. Cada persona del camión sabe su trabajo y quién la cuida.'],
      ['Subiendo al poste', 'Subes doce metros con arnés y un plan. El trabajo es lento a propósito, porque aquí un error es peligroso.'],
      ['El nudo del problema', 'Un cable está dañado donde nadie lo esperaba. Pruebas, lo hablan en equipo y cambias el plan.'],
      ['Se hace la luz', 'La calle parpadea y vuelve a encenderse. Un niño saluda desde una ventana. Escribes tu informe.'],
      ['De regreso a casa', 'Cansado, con hambre y un poco orgulloso. Mañana puede ser un día tranquilo u otra tormenta.'],
    ],
    credits: {
      path: ['High school diploma or GED', 'Pre-apprenticeship or lineworker program (about 3 to 12 months)', 'Paid apprenticeship with a utility or union (about 3 to 4 years)', 'Journeyman lineworker'],
      cost: 'Often low, because apprenticeships pay while you train',
      pay: 'Sample range: $55k to $110k per year (estimate)',
    },
  },
  'marine biologist': {
    en: [
      ['Dawn at the dock', 'It’s dawn. You’ve got coffee, sunscreen, and a waterproof notebook. The boat leaves in twenty minutes, ready or not.'],
      ['The survey line', 'You lay down a measured line and count every fish that crosses it. It’s slow and careful, and honestly, it’s exactly how science works.'],
      ['Under the surface', 'Your dive buddy checks your gauge. And below you? A reef that looks different from last year.'],
      ['The mystery', 'The numbers are lower than expected. So you take photos, collect samples, and write down everything you can’t explain yet.'],
      ['The lab', 'Back on land, you clean data for hours. The pattern shows up slowly, and then all at once.'],
      ['The meeting', 'You present to a town that depends on this reef. Your chart helps them decide what to protect.'],
    ],
    es: [
      ['Amanecer en el muelle', 'Café, bloqueador y una libreta impermeable. El barco sale en veinte minutos, estés listo o no.'],
      ['La línea de muestreo', 'Tiendes una cuerda medida y cuentas cada pez que la cruza. Aburrido, cuidadoso y exactamente así funciona la ciencia.'],
      ['Bajo la superficie', 'Tu compañero revisa tu medidor. Abajo, un arrecife distinto al del año pasado.'],
      ['El misterio', 'Las cifras son menores de lo esperado. Fotografías, tomas muestras y anotas lo que aún no puedes explicar.'],
      ['El laboratorio', 'De vuelta en tierra, limpias datos durante horas. El patrón aparece despacio y luego de golpe.'],
      ['La reunión', 'Presentas ante un pueblo que depende de este arrecife. Tu gráfica les ayuda a decidir qué proteger.'],
    ],
    credits: {
      path: ['High school with biology, math and swimming', 'Bachelor\'s degree in marine or biological science', 'Field internship or volunteer research cruise', 'Master\'s degree for most research roles'],
      cost: 'Moderate to high; scholarships and paid field assistant jobs help',
      pay: 'Sample range: $45k to $95k per year (estimate)',
    },
  },
}

const GENERIC = {
  en: (j) => [
    ['Before the day starts', `Okay, you’re getting ready for work as a ${j}. Someone’s already counting on what you do today.`],
    ['The first task', `The day starts with the most routine part of being a ${j}. It looks simple, but everything else depends on it.`],
    ['The people', `A ${j} almost never works alone. You check in with the team and find out who needs what.`],
    ['The problem', `Then something doesn’t go to plan. So you slow down, ask good questions, and try a different way.`],
    ['The win', `And it works. It’s a small result, but it’s real, and somebody says thank you.`],
    ['The ride home', `You’re tired in a good way. Tomorrow brings a new version of the same job.`],
  ],
  es: (j) => [
    ['Antes de empezar', `Te preparas para trabajar como ${j}. Alguien ya cuenta con lo que harás hoy.`],
    ['La primera tarea', `El día empieza con la parte más rutinaria de ser ${j}. Parece simple, pero prepara todo lo demás.`],
    ['La gente', `Un ${j} casi nunca trabaja solo. Hablas con el equipo y aprendes quién necesita qué.`],
    ['El problema', `Algo no sale como se planeó. Un ${j} baja el ritmo, hace buenas preguntas y prueba otro camino.`],
    ['El logro', `Funciona. El resultado es pequeño pero real, y alguien te da las gracias.`],
    ['De regreso a casa', `Estás cansado de la buena manera. Mañana llega otra versión del mismo trabajo.`],
  ],
}

const GENERIC_CREDITS = {
  path: ['Learn what the job really involves (you just did)', 'Find the entry route: program, apprenticeship, degree or certificate', 'Get hands-on: volunteer, intern or shadow someone', 'Apply for a first role and ask for a mentor'],
  cost: 'Varies. The live backend fills in real costs from public occupation data.',
  pay: 'Pay range arrives with live occupation data',
}

// What the live backend does for every scene, shown in the backstage panel.
export const SERVICES = [
  { id: 'gemini', name: 'Gemini', does: 'writes the scene' },
  { id: 'translate', name: 'Amazon Translate', does: 'switches the language' },
  { id: 'canvas', name: 'Bedrock Nova Canvas', does: 'paints the frame' },
  { id: 'rekognition', name: 'Amazon Rekognition', does: 'checks the frame is safe' },
  { id: 'polly', name: 'Amazon Polly', does: 'records the narration' },
  { id: 's3', name: 'Amazon S3', does: 'stores the reel' },
]

export function mockTrailer(job, lang) {
  const key = job.trim().toLowerCase()
  const specific = SPECIFIC[key]
  const l = lang === 'es' ? 'es' : 'en'
  const rows = specific ? specific[l] : GENERIC[l](job.trim())
  const translated = l === lang
  const scenes = rows.map(([title, narration], i) => ({
    title,
    narration,
    image: sceneArt(key, i),
    services: SERVICES,
  }))
  return {
    job: job.trim(),
    lang,
    translated,
    scenes,
    credits: specific ? specific.credits : GENERIC_CREDITS,
    source: 'demo',
  }
}

export const SCREEN_TEST = (job) => [
  {
    q: `Tell me about yourself, and why you want to be a ${job}.`,
    plain: 'They are not asking for your life story. Give two or three things about you that connect to this job. Nothing paid is needed: school, family, volunteering and hobbies all count.',
  },
  {
    q: 'Tell me about a time you had to figure something out without much help.',
    plain: 'They want to see how you think. Pick one real moment, say what the problem was, what you tried, and what happened.',
  },
  {
    q: 'It is your first day and you do not know how to do something. What do you do?',
    plain: 'There is no trick. Good answers say you would ask, watch, and write it down, and that you would say so early rather than hide it.',
  },
]

export function mockScore(answers) {
  const joined = answers.join(' ').toLowerCase()
  const words = joined.split(/\s+/).filter(Boolean).length
  const hasExample = /(when|once|last|time|school|home|family|team|project)/.test(joined)
  const hasAsk = /(ask|help|learn|watch|practice|notes)/.test(joined)
  const strongest = hasExample
    ? 'You used real moments from your life. Interviewers remember stories more than adjectives.'
    : 'You gave honest answers. Next time, add one specific moment to each one.'
  const fix = words < 60
    ? 'Your answers were short. Aim for 30 to 45 seconds each: situation, what you did, what happened.'
    : hasAsk
      ? 'Your answers had good detail. Start each one with the point, then tell the story.'
      : 'Say out loud that you would ask questions and learn fast. It shows you are safe to hire.'
  return { strongest, fix, rehearse: 'Say your first answer again, but start with the result.', words }
}
