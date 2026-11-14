// POST /screentest/start  { job, lang }          -> { questions: [{ q, plain }] }
// POST /screentest/score  { job, lang, answers } -> { strongest, fix, rehearse }
import { geminiJson } from './lib/gemini.js'
import { json } from './lib/clients.js'

const LANGS = { en: 'English', es: 'Spanish', hi: 'Hindi', ar: 'Arabic', vi: 'Vietnamese' }

export const handler = async (event) => {
  let body
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Send JSON.' }) }
  const job = String(body.job || '').slice(0, 80)
  const language = LANGS[body.lang] || 'English'
  if (!job) return json(400, { error: 'Missing job.' })

  if (event.rawPath.endsWith('/start')) {
    // Questions 1 and 2 are fixed so they match the recorded ASL clips (ids "about", "figure-out").
    // Question 3 is written for this job and has no clip.
    const out = await geminiJson(`You coach people who have never had a job interview. Write 3 interview questions in ${language}.
Question 1 must be exactly this, translated faithfully into ${language}: "Tell me about yourself, and why you want to be a ${job}."
Question 2 must be exactly this, translated faithfully into ${language}: "Tell me about a time you had to figure something out without much help."
Question 3: a question specific to the real tasks of the job "${job}".
For each question add "plain": 2 sentences in ${language} explaining what the interviewer really wants, and noting that school, family, volunteering and hobbies count as experience.
Return JSON: {"questions":[{"q":"","plain":""}]}`)
    const ids = ['about', 'figure-out', null]
    return json(200, { questions: (out.questions || []).slice(0, 3).map((q, i) => ({ ...q, id: ids[i] })) })
  }

  const answers = (Array.isArray(body.answers) ? body.answers : []).slice(0, 5).map((a) => String(a).slice(0, 1500))
  const out = await geminiJson(`You are a kind, honest interview coach. A first-time candidate answered 3 interview questions for "${job}". Answers (in order):
${answers.map((a, i) => `${i + 1}. ${a}`).join('\n')}
Reply in ${language} as JSON: {"strongest":"one specific thing that worked, quoting their idea","fix":"the single most useful change","rehearse":"one sentence to practise out loud next"}.
Be specific. Do not judge accent, grammar or background. Judge only content and structure.`)
  return json(200, out)
}
