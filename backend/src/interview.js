// Adaptive interviewer.
// POST /interview/next      { job, lang, resume, history: [{ q, a, kind }] } -> { done, question, why, kind, focus, lastAnswer }
// POST /interview/feedback  { job, lang, resume, history }                  -> report with per-answer scores and quotes
// Each turn the model sees the whole conversation and decides: follow up on a weak or vague answer,
// probe a resume claim, or move to the next skill the job needs. It stops when it has enough evidence.
import { geminiJson } from './lib/gemini.js'
import { json } from './lib/clients.js'

const LANGS = { en: 'English', es: 'Spanish', hi: 'Hindi', ar: 'Arabic', vi: 'Vietnamese' }
const MAX_TURNS = 7

const clean = (body) => {
  const job = String(body.job || '').slice(0, 80)
  const language = LANGS[body.lang] || 'English'
  const resume = String(body.resume || '').slice(0, 9000)
  const history = (Array.isArray(body.history) ? body.history : []).slice(0, MAX_TURNS).map((h) => ({
    q: String(h.q || '').slice(0, 600), a: String(h.a || '').slice(0, 2500), kind: String(h.kind || 'new'),
  }))
  return { job, language, resume, history }
}

const transcript = (history) => history.length
  ? history.map((h, i) => `Q${i + 1} (${h.kind}): ${h.q}\nA${i + 1}: ${h.a || '(no answer)'}`).join('\n\n')
  : '(no questions asked yet)'

export async function nextQuestion(body) {
  const { job, language, resume, history } = clean(body)
  if (history.length >= MAX_TURNS) return { done: true }
  const out = await geminiJson(`You are Bolt, a friendly but rigorous hiring manager interviewing a candidate for the job "${job}".
The candidate may be a student or a first-time job seeker. School projects, clubs, family duties, volunteering and part-time work all count as experience.

Candidate's resume (may be empty):
"""${resume || '(no resume given; ask about school, projects and interests instead)'}"""

Interview so far:
${transcript(history)}

First rate the LAST answer (if there is one): 1 (no substance) to 5 (specific, structured, clear result).
Then decide the single best next move, like a skilled interviewer. If the last answer scored 1 or 2, the move MUST be "followup" (unless the previous two moves were already follow-ups):
- "followup": the last answer was vague, generic, missing what THEY did, missing a result, or made a claim worth testing. Ask about exactly that gap. Never more than 2 follow-ups in a row.
- "resume": dig into a specific item on the resume (a project, tool, role or claim). Ask what they built, decided, or measured.
- "skill": test a core skill this job really needs (technical or practical), with a realistic scenario from the job.
- "behavioral": teamwork, conflict, mistakes, or learning something hard.
- "done": you have ${MAX_TURNS - 1}+ answers, or enough evidence on the job's key skills (at least 4 answers).
Start with a short warm-up about why this job if no questions have been asked yet.
Keep each question to 1-2 sentences, spoken style, no lists. Do not repeat a question already asked.


Write "question", "why" and "lastAnswer.note" in ${language}.
Return JSON: {"move":"followup|resume|skill|behavioral|done","question":"","why":"one sentence: what a good answer shows","focus":"2-4 words naming the skill or resume item being tested","lastAnswer":{"score":0,"note":"one short sentence"}}`, { fast: true })
  const done = out.move === 'done' || history.length >= MAX_TURNS
  return {
    done,
    question: done ? null : String(out.question || '').trim(),
    why: out.why || '',
    kind: done ? 'done' : out.move || 'skill',
    focus: out.focus || '',
    lastAnswer: history.length ? { score: Math.max(1, Math.min(5, Number(out.lastAnswer?.score) || 0)) || null, note: out.lastAnswer?.note || '' } : null,
  }
}

export async function feedback(body) {
  const { job, language, resume, history } = clean(body)
  const out = await geminiJson(`You are an honest, kind interview coach. A candidate just finished an interview for "${job}".
Resume (may be empty): """${resume || '(none)'}"""
Interview:
${transcript(history)}

Score each answer from 1 to 5 using this rubric:
- Structure: situation, what they did, result (STAR).
- Specifics: real names of tools, numbers, decisions; not generic claims.
- Relevance: does it show a skill this job needs?
- Ownership: says what THEY did, not just "we".
For each answer, quote a short phrase the candidate actually said (copy it exactly, max 12 words) as evidence, then one strength and one concrete fix.
Judge only content and structure. Never judge accent, grammar, spelling or background.
Then give the overall picture: a 1-5 overall score, a one-sentence verdict, up to 3 strengths, up to 3 gaps tied to what this job needs, and 3 specific things to practise next (one can be rewriting a weak answer).

Write everything in ${language}.
Return JSON: {"overall":{"score":0,"verdict":""},"answers":[{"score":0,"quote":"","strength":"","fix":""}],"strengths":[""],"gaps":[""],"next":[""]}`, { fast: true })
  const answers = history.map((h, i) => ({ q: h.q, a: h.a, ...(out.answers?.[i] || {}) }))
  return { ...out, answers }
}

export const handler = async (event) => {
  let body
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Send JSON.' }) }
  if (!String(body.job || '').trim()) return json(400, { error: 'Missing job.' })
  if (event.rawPath.endsWith('/next')) return json(200, await nextQuestion(body))
  if (event.rawPath.endsWith('/feedback')) return json(200, await feedback(body))
  return json(404, { error: 'Unknown interview route.' })
}
