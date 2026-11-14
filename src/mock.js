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
  { job: 'Software developer', tag: 'Builds the apps you use' },
  { job: 'Data scientist', tag: 'Finds the story in the numbers' },
  { job: 'Cybersecurity analyst', tag: 'Stops hackers before they get in' },
  { job: 'Accountant', tag: 'Keeps the money honest' },
  { job: 'Financial analyst', tag: 'Decides where money should go' },
  { job: 'Marketing manager', tag: 'Gets people to notice' },
]

// Other names people type for the same job.
const ALIASES = {
  'software engineer': 'software developer',
  programmer: 'software developer',
  developer: 'software developer',
  'information security analyst': 'cybersecurity analyst',
  'cyber security analyst': 'cybersecurity analyst',
  'security analyst': 'cybersecurity analyst',
  auditor: 'accountant',
  cpa: 'accountant',
  'data analyst': 'data scientist',
  'investment analyst': 'financial analyst',
}

const BLS = (name) => `U.S. Bureau of Labor Statistics, Occupational Outlook Handbook: ${name}. Pay is May 2025.`

const SPECIFIC = {
  'software developer': {
    en: [
      ['Standup', 'It’s nine thirty, and your team does a quick standup. You say what you finished yesterday and what’s blocking you today.'],
      ['The ticket', 'Your task: people can’t reset their password on the phone app. You read the bug report, then find the code that handles it.'],
      ['Pair up', 'You’re stuck, so you share your screen with a teammate. A second pair of eyes spots what you kept missing.'],
      ['The test fails', 'Your fix works on your laptop, but an automated test fails. So you read the error, change one line, and run it again.'],
      ['Code review', 'A senior developer reviews your code and leaves three comments. You fix them, and your change gets merged.'],
      ['Logging off', 'Your fix reaches real users tonight. Tomorrow there’s a new ticket, and probably something new to learn.'],
    ],
    es: [
      ['La reunión rápida', 'Son las nueve y media y tu equipo hace una reunión corta. Cuentas qué terminaste ayer y qué te frena hoy.'],
      ['La tarea', 'Tu tarea: la gente no puede cambiar su contraseña en la app del teléfono. Lees el reporte y buscas el código que lo maneja.'],
      ['En pareja', 'Te atoras, así que compartes pantalla con un compañero. Otro par de ojos ve lo que tú no veías.'],
      ['Falla una prueba', 'Tu arreglo funciona en tu laptop, pero falla una prueba automática. Lees el error, cambias una línea y la corres otra vez.'],
      ['Revisión de código', 'Una desarrolladora con más experiencia revisa tu código y deja tres comentarios. Los corriges y tu cambio se integra.'],
      ['Fin del día', 'Tu arreglo llega a usuarios reales esta noche. Mañana habrá otra tarea y, seguro, algo nuevo que aprender.'],
    ],
    credits: {
      path: ['High school with as much math as you can take', 'Bachelor’s degree in computer science, information technology, engineering or math', 'A college internship for real experience', 'First developer job (some employers prefer a master’s degree)'],
      cost: 'Usually four years of college tuition.',
      pay: 'Median $135,980 a year. Lowest 10%: under $82,460. Highest 10%: over $214,670.',
      outlook: '10% growth, 2025 to 2035 (much faster than average)',
      source: BLS('Software Developers, Quality Assurance Analysts, and Testers (software developers)'),
    },
  },
  'data scientist': {
    en: [
      ['The question', 'The sales team asks why fewer customers renewed this month. Your job is to turn that into a question data can answer.'],
      ['Messy data', 'You pull the data, and it’s a mess: missing dates, the same customer listed twice. Most of the morning goes into cleaning it.'],
      ['The model', 'Now you build a model to predict which customers might leave. You test it on data it has never seen.'],
      ['Too good to be true', 'The model looks almost perfect, which is a warning sign. One column was leaking the answer, so you remove it and try again.'],
      ['The chart', 'You turn the results into one clear chart. Customers who never opened the app in their first week left most often.'],
      ['The meeting', 'You explain it to the team in plain words. They decide to change how new customers get started.'],
    ],
    es: [
      ['La pregunta', 'El equipo de ventas pregunta por qué menos clientes renovaron este mes. Tu trabajo es convertirlo en una pregunta que los datos puedan responder.'],
      ['Datos desordenados', 'Sacas los datos y son un desorden: fechas vacías, clientes repetidos. Casi toda la mañana se va en limpiarlos.'],
      ['El modelo', 'Ahora construyes un modelo para predecir qué clientes podrían irse. Lo pruebas con datos que nunca ha visto.'],
      ['Demasiado bueno', 'El modelo parece casi perfecto, y eso es una alerta. Una columna revelaba la respuesta, así que la quitas y vuelves a probar.'],
      ['La gráfica', 'Conviertes los resultados en una gráfica clara. Los clientes que no abrieron la app en su primera semana fueron los que más se fueron.'],
      ['La reunión', 'Se lo explicas al equipo con palabras sencillas. Deciden cambiar cómo empiezan los clientes nuevos.'],
    ],
    credits: {
      path: ['High school algebra, calculus and statistics', 'Bachelor’s degree in math, statistics, computer science or a related field', 'Learn data programming languages and database and statistics software', 'First data role (some employers prefer a master’s or Ph.D.)'],
      cost: 'At least four years of college tuition; a graduate degree adds more.',
      pay: 'Median $120,230 a year. Lowest 10%: under $67,240. Highest 10%: over $199,130.',
      outlook: '35% growth, 2025 to 2035 (much faster than average)',
      source: BLS('Data Scientists'),
    },
  },
  'cybersecurity analyst': {
    en: [
      ['The alerts', 'You start with a screen full of overnight alerts. Most are harmless, and your job is to find the one that isn’t.'],
      ['The fake email', 'Someone reports a strange email asking for their password. You check the link and block it for the whole company.'],
      ['The scan', 'You run a scan that tests your own systems for weak spots. It finds an old server nobody has updated.'],
      ['The strange login', 'Then someone signs in from a country where nobody on staff lives. You lock the account and call its owner.'],
      ['The fix', 'It was a stolen password. You reset it, turn on two-step sign-in, and write down exactly what happened.'],
      ['The report', 'You end the day with a short report for your manager. In this job, a quiet day means the work is going well.'],
    ],
    es: [
      ['Las alertas', 'Empiezas con una pantalla llena de alertas de la noche. Casi todas son inofensivas y tu trabajo es encontrar la que no.'],
      ['El correo falso', 'Alguien reporta un correo raro que pide su contraseña. Revisas el enlace y lo bloqueas para toda la empresa.'],
      ['El escaneo', 'Corres un escaneo que busca puntos débiles en tus propios sistemas. Encuentra un servidor viejo que nadie actualizó.'],
      ['El acceso extraño', 'Luego alguien entra desde un país donde no vive nadie del equipo. Bloqueas la cuenta y llamas a su dueño.'],
      ['El arreglo', 'Era una contraseña robada. La cambias, activas la verificación en dos pasos y anotas exactamente qué pasó.'],
      ['El informe', 'Terminas el día con un informe corto para tu jefa. En este trabajo, un día tranquilo significa que todo va bien.'],
    ],
    credits: {
      path: ['Bachelor’s degree in computer and information technology, engineering or math (some start with a high school diploma plus industry training and certifications)', 'Work in IT first, often as a network or systems administrator', 'Earn a security certification (many employers prefer one)', 'Information security analyst'],
      cost: 'Usually four years of college tuition, plus certification exam fees.',
      pay: 'Median $129,180 a year. Lowest 10%: under $75,090. Highest 10%: over $199,850.',
      outlook: '21% growth, 2025 to 2035 (much faster than average)',
      source: BLS('Information Security Analysts'),
    },
  },
  accountant: {
    en: [
      ['Month end', 'It’s the end of the month, so every number has to match. You open the books and start checking.'],
      ['Receipts', 'You match bank transactions to invoices and receipts. Most line up, but a few don’t.'],
      ['The client call', 'A small business owner calls, worried about taxes. You walk them through what they owe and when it’s due.'],
      ['The double payment', 'Then you spot a payment recorded twice. You trace it back, find the mistake, and correct the records.'],
      ['The report', 'You finish the monthly report showing where the money went. The owner finally sees the whole picture.'],
      ['Heading home', 'Tax season will be busier. For now, the books balance, and that feels good.'],
    ],
    es: [
      ['Cierre de mes', 'Es fin de mes y cada número tiene que cuadrar. Abres los libros y empiezas a revisar.'],
      ['Los recibos', 'Comparas los movimientos del banco con facturas y recibos. Casi todo coincide, pero algunos no.'],
      ['La llamada', 'Llama la dueña de un pequeño negocio, preocupada por los impuestos. Le explicas cuánto debe y cuándo pagar.'],
      ['El pago doble', 'Luego ves un pago registrado dos veces. Lo rastreas, encuentras el error y corriges los registros.'],
      ['El informe', 'Terminas el informe del mes que muestra a dónde fue el dinero. La dueña por fin ve el panorama completo.'],
      ['De regreso a casa', 'La temporada de impuestos será más pesada. Por ahora, las cuentas cuadran, y eso se siente bien.'],
    ],
    credits: {
      path: ['Bachelor’s degree in accounting or business', 'An internship while in college', 'Junior accountant role', 'Optional CPA license: 150 college credit hours, a national exam and state requirements (required to file reports with the SEC)'],
      cost: 'Four years of tuition; the CPA’s 150 credit hours often means a fifth year. Some employers pay exam costs.',
      pay: 'Median $83,680 a year. Lowest 10%: under $56,020. Highest 10%: over $144,090.',
      outlook: '5% growth, 2025 to 2035 (faster than average)',
      source: BLS('Accountants and Auditors'),
    },
  },
  'financial analyst': {
    en: [
      ['Before the market opens', 'You check the news before the market opens. A company you follow just reported its results.'],
      ['The spreadsheet', 'You update your model with the new numbers. Sales grew, but costs grew faster.'],
      ['The research', 'You read the company’s financial statements and compare it with its competitors. You note what worries you.'],
      ['The disagreement', 'Your manager thinks it’s a good buy, and you’re not so sure. So you show your numbers and talk it through.'],
      ['The recommendation', 'You write a short report with your recommendation and your reasons. It goes to the people who decide where money is invested.'],
      ['Logging off', 'Tomorrow the market will move again. You’ll be reading the news early.'],
    ],
    es: [
      ['Antes de abrir', 'Revisas las noticias antes de que abra el mercado. Una empresa que sigues acaba de publicar sus resultados.'],
      ['La hoja de cálculo', 'Actualizas tu modelo con los nuevos números. Las ventas subieron, pero los costos subieron más.'],
      ['La investigación', 'Lees los estados financieros de la empresa y la comparas con sus competidores. Anotas lo que te preocupa.'],
      ['El desacuerdo', 'Tu jefe cree que es buena compra y tú no estás tan seguro. Muestras tus números y lo discuten.'],
      ['La recomendación', 'Escribes un informe corto con tu recomendación y tus razones. Llega a quienes deciden dónde invertir.'],
      ['Fin del día', 'Mañana el mercado se moverá otra vez. Vas a leer las noticias temprano.'],
    ],
    credits: {
      path: ['Bachelor’s degree in finance, business or a related field', 'An internship while in college', 'Entry-level analyst role (licenses, when needed, are usually sponsored by the employer)', 'A master’s in finance or business can help you move up'],
      cost: 'Usually four years of college tuition.',
      pay: 'Median $102,740 a year. Lowest 10%: under $63,720. Highest 10%: over $180,860.',
      outlook: '7% growth, 2025 to 2035 (much faster than average)',
      source: BLS('Financial Analysts (financial and investment analysts)'),
    },
  },
  'marketing manager': {
    en: [
      ['The plan', 'You start with the plan for a new product launch: budget, deadlines, and who’s doing what.'],
      ['Creative review', 'The design team shows you three ad ideas. You pick one and ask for changes that make the message clearer.'],
      ['The numbers', 'You check how last week’s campaign did. One ad worked well, and another barely got clicks.'],
      ['Budget cut', 'Then the budget gets cut. You decide what to drop and move money to the ad that worked.'],
      ['Launch day', 'The campaign goes live. You watch the first results come in with your team.'],
      ['Tomorrow', 'You’ll read what customers say and adjust. Good marketing is as much listening as talking.'],
    ],
    es: [
      ['El plan', 'Empiezas con el plan para lanzar un producto nuevo: presupuesto, fechas y quién hace qué.'],
      ['Revisión creativa', 'El equipo de diseño te muestra tres ideas de anuncio. Eliges una y pides cambios para que el mensaje sea más claro.'],
      ['Los números', 'Revisas cómo le fue a la campaña de la semana pasada. Un anuncio funcionó bien y otro casi no tuvo clics.'],
      ['Recorte de presupuesto', 'Luego recortan el presupuesto. Decides qué quitar y mueves el dinero al anuncio que funcionó.'],
      ['Día de lanzamiento', 'La campaña sale al aire. Ves llegar los primeros resultados con tu equipo.'],
      ['Mañana', 'Leerás lo que dicen los clientes y ajustarás. El buen marketing es escuchar tanto como hablar.'],
    ],
    credits: {
      path: ['Bachelor’s degree in marketing, business or communications', 'Internships while in college', 'Several years in sales, marketing, market research or public relations', 'Marketing manager (some employers prefer a master’s degree)'],
      cost: 'Usually four years of college tuition. This is a manager role, so expect years of work experience first.',
      pay: 'Median $166,790 a year. Lowest 10%: under $90,260. Highest 10%: over $293,610.',
      outlook: '7% growth for marketing managers, 2025 to 2035',
      source: BLS('Advertising, Promotions, and Marketing Managers (marketing managers)'),
    },
  },
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
      path: ['High school diploma or GED', 'Optional: a 1-year certificate or 2-year associate’s degree at a community college', 'Apprenticeship or employer training program (up to 3 years)', 'Journey-level lineworker after 3 to 4 years on the job'],
      cost: 'Low if you start straight in an apprenticeship; a community college program adds tuition. Many crews also need a commercial driver’s license (CDL).',
      pay: 'Median $95,320 a year. Lowest 10%: under $51,470. Highest 10%: over $128,690.',
      outlook: '10% growth, 2025 to 2035 (much faster than average)',
      source: 'U.S. Bureau of Labor Statistics, Occupational Outlook Handbook: Electrical Power-Line Installers and Repairers. Pay is May 2025.',
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
      path: ['High school with biology and math', 'Bachelor’s degree in biology, zoology or wildlife biology (the usual way in)', 'Master’s degree for higher-level positions', 'Ph.D. to lead your own research'],
      cost: 'At least four years of college tuition; graduate degrees add more for senior roles.',
      pay: 'Median $76,780 a year. Lowest 10%: under $49,100. Highest 10%: over $126,440.',
      outlook: '4% growth, 2025 to 2035 (about average)',
      source: 'U.S. Bureau of Labor Statistics, Occupational Outlook Handbook: Zoologists and Wildlife Biologists (BLS counts marine biologists here). Pay is May 2025.',
    },
  },
}

// Sourced credits for featured jobs that use the general trailer script.
const CREDITS = {
  'nurse practitioner': {
    path: ['Become a registered nurse (a bachelor’s in nursing is preferred)', 'Pass the exam for a registered nursing (RN) license', 'Master’s degree in advanced practice nursing (or a Doctor of Nursing Practice)', 'Pass a national certification exam and get a state APRN license'],
    cost: 'High: a nursing degree, then a graduate degree.',
    pay: 'Median $132,300 a year for nurse practitioners.',
    outlook: '41% growth for nurse practitioners, 2025 to 2035 (much faster than average)',
    source: 'U.S. Bureau of Labor Statistics, Occupational Outlook Handbook: Nurse Anesthetists, Nurse Midwives, and Nurse Practitioners. Pay is May 2025.',
  },
  welder: {
    path: ['High school diploma or GED (shop classes help)', 'Technical training at a vocational school, community college or in the military, or an apprenticeship', 'Several months of on-the-job training', 'Certification, which some employers and states require'],
    cost: 'Low to moderate: from free high school classes to a vocational program, or a paid apprenticeship.',
    pay: 'Median $53,750 a year. Lowest 10%: under $39,240. Highest 10%: over $77,530.',
    outlook: '2% growth, 2025 to 2035 (slower than average), with about 40,300 openings a year',
    source: 'U.S. Bureau of Labor Statistics, Occupational Outlook Handbook: Welders, Cutters, Solderers, and Brazers. Pay is May 2025.',
  },
  'sound engineer': {
    path: ['High school diploma or GED', 'A postsecondary audio program, from several months to a degree, depending on the job', 'Short-term on-the-job training', 'Optional certification (most require an exam)'],
    cost: 'Varies: from a short certificate program to a college degree.',
    pay: 'Median $73,130 a year for sound engineering technicians.',
    outlook: 'Expected to shrink 3%, 2025 to 2035',
    source: 'U.S. Bureau of Labor Statistics, Occupational Outlook Handbook: Broadcast, Sound, and Video Technicians (sound engineering technicians). Pay is May 2025.',
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
  cost: 'Not available in the demo.',
  pay: 'Not available in the demo.',
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
  const typed = job.trim().toLowerCase().replace(/s$/, '')
  const key = ALIASES[typed] || typed
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
    credits: specific ? specific.credits : CREDITS[key] || GENERIC_CREDITS,
    source: 'demo',
  }
}

export const SCREEN_TEST = (job) => [
  {
    q: `Tell me about yourself, and why you want to be ${/^[aeiou]/i.test(job.trim()) ? 'an' : 'a'} ${job.trim().toLowerCase()}.`,
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
