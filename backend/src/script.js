// Step Functions task 1: Gemini writes the six-scene script and the credits.
import { geminiJson } from './lib/gemini.js'
import { groundingFacts } from './lib/grounding.js'
import { signLibrary, glossVocabulary } from './lib/sign.js'

const LANGS = { en: 'English', es: 'Spanish', hi: 'Hindi', ar: 'Arabic', vi: 'Vietnamese' }
const KITS = ['code', 'data', 'security', 'finance', 'accounting', 'marketing', 'health', 'trades', 'general']

export const handler = async ({ jobId, job, lang, profile, jd }) => {
  jd = String(jd || '').trim().slice(0, 6000)
  // With a pasted job description, the role comes from the posting; grounding needs a title, so
  // it runs after the model names the role (below) only when no title was typed.
  const facts = job ? await groundingFacts(job) : null
  const language = LANGS[lang] || 'English'
  // When a local sign library exists (laptop demo), ask for each scene's ASL gloss in the same call,
  // so a trailer costs one model request instead of seven.
  const vocab = process.env.SIGN_DIR ? glossVocabulary(signLibrary(process.env.SIGN_DIR)) : []
  const prompt = `You write the narration for a short animated trailer. Bolt, a friendly robot, spends one realistic workday as a ${job} and tells the viewer about it in the first person ("I", "my"). The viewer is a teenager or first-generation student who has never seen this job.

Job: ${job || '(read it from the job description below)'}
${jd ? `Job description pasted by the viewer. Base the whole day on ITS real duties, tools, team and setting, not a generic version of the role:\n"""${jd}"""\n` : ''}Write everything in ${language}${lang === 'en' ? '' : ' (natural, everyday language, not a word-for-word translation)'}.
About the viewer (may be empty): ${profile || 'none'}
${facts ? `Verified facts from O*NET for "${facts.occupation}". Base the scenes on these real tasks and the path on this education data:\n${JSON.stringify({ tasks: facts.tasks, education: facts.education })}\n` : ''}
The animation has six fixed settings, in this order: 1 arriving at the office, 2 at my desk, 3 a meeting with teammates, 4 a problem at work, 5 solving it, 6 heading home.
Return JSON exactly like:
{
  "role": "the job title in ${language}, short (from the job description if given)",
  "company": "the employer's name from the job description, or empty",
  "kit": "one of: code, data, security, finance, accounting, marketing, health, trades, general (the props that fit this job best)",
  "scenes": [ { "title": "<=4 words", "narration": "2 short sentences, first person as Bolt, plain words, concrete real tasks and tools", "screen": "<=3 words shown on Bolt's monitor or whiteboard in this scene" } ],
  "credits": { "path": ["4 realistic steps from today to the job, cheapest routes first"], "cost": "one plain sentence about what it costs to get there" }
}
Exactly 6 scenes. All text in ${language}, except "kit"${vocab.length ? ' and "asl"' : ''}.${vocab.length ? `
Also give each scene "asl": its narration translated into American Sign Language gloss (an array of CAPITAL tokens in ASL order:
time first, topic-comment, no articles or "to be", IX-1 for I/me, IX for you, at most 12 signs). Use ONLY glosses from this sign
library list; for other words use the closest synonym from the list, or FS:WORD to fingerspell names and short key terms
(at most 10 letters), or leave them out. Keep the meaning; never add or swap topics.
Technology, software, product and brand names (Python, SQL, API, Excel, Tableau) and words whose everyday sign means something else here (bug, model, python, mouse, cloud, server, agent, pipeline) must be fingerspelled as FS:WORD or a short acronym (FS:API), never the dictionary sign.
Sign library: ${vocab.join(' ')}` : ''}
Rules:
- A realistic, not glamorous, day. Name real tools and tasks.
- Do not invent statistics, pay figures, employers or laws.
- No violence, no brands.`
  const out = await geminiJson(prompt)
  if (!Array.isArray(out.scenes) || out.scenes.length < 3) throw new Error('Script was not usable')
  // Figures come only from the official data, never from the model.
  const credits = {
    path: out.credits?.path || [],
    cost: out.credits?.cost || '',
    pay: facts?.pay || 'No official pay data found for this job title.',
    ...(facts?.outlook ? { outlook: facts.outlook } : {}),
    ...(facts ? { source: facts.source } : {}),
  }
  const kit = KITS.includes(out.kit) ? out.kit : 'general'
  // Scenes are already in the viewer's language; the scene worker skips Translate when written === lang.
  const role = String(out.role || job || '').trim().slice(0, 80) || job
  return { jobId, fromJd: !!jd, job: role, company: String(out.company || '').trim().slice(0, 80), lang, kit, scenes: out.scenes.slice(0, 6).map((s, index) => ({ ...s, asl: Array.isArray(s.asl) ? s.asl.map((g) => String(g).toUpperCase()).slice(0, 40) : undefined, index, written: lang })), credits }
}
