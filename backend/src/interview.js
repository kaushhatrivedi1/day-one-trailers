// Adaptive interviewer.
// POST /interview/next      { job, lang, resume, history: [{ q, a, kind }] } -> { done, question, why, kind, focus, lastAnswer }
// POST /interview/feedback  { job, lang, resume, history }                  -> report with per-answer scores and quotes
// Each turn the model sees the whole conversation and decides: follow up on a weak or vague answer,
// probe a resume claim, or move to the next skill the job needs. It stops when it has enough evidence.
import { geminiJson } from './lib/gemini.js'
import { json } from './lib/clients.js'
import { remember } from './lib/memory.js'
import { signLibrary, glossVocabulary } from './lib/sign.js'
import { CRITERIA, criteriaAverage, openSession, pastForSession, saveAttempt, listSessions, getSession, forgetGuest } from './lib/sessions.js'

// One rubric, used once per answer (live, during the call) and reused by the report, so the score
// Bolt reacts with and the score in the report always agree.
const RUBRIC = `Score it on four criteria, each 1-5:
- structure: situation, what they did, the result (STAR). 1 = no structure, 5 = clear beginning, action, outcome.
- specifics: real tools, names, numbers, decisions. 1 = generic claims only, 5 = concrete and checkable.
- relevance: shows a skill this job needs. 1 = unrelated, 5 = directly what the job asks for.
- ownership: what THEY did, not just "we". 1 = unclear, 5 = their own actions and decisions are clear.
A one-line or off-topic answer scores 1-2 on every criterion. Do not inflate: 4 means genuinely good, 5 is rare.
Judge only content and structure. Never judge accent, grammar, spelling or background.`
const clamp5 = (n) => Math.max(1, Math.min(5, Math.round(Number(n) || 1)))
const pointsOf = (criteria) => Math.round((CRITERIA.reduce((s, c) => s + clamp5(criteria?.[c]), 0) / CRITERIA.length / 5) * 100)
const tidyCriteria = (c) => Object.fromEntries(CRITERIA.map((k) => [k, clamp5(c?.[k])]))

// With the sign library available, the same call also returns the ASL gloss of the question
// sentence, so signing it only needs the quick meaning check (no separate translation step).
let vocabCache = null
const vocab = () => (vocabCache ??= process.env.SIGN_DIR ? glossVocabulary(signLibrary(process.env.SIGN_DIR)) : [])

const LANGS = { en: 'English', es: 'Spanish', hi: 'Hindi', ar: 'Arabic', vi: 'Vietnamese' }
const MAX_TURNS = 7

const clean = (body) => {
  const job = String(body.job || '').slice(0, 80)
  const language = LANGS[body.lang] || 'English'
  const resume = String(body.resume || '').slice(0, 9000)
  const jd = String(body.jd || '').slice(0, 6000)
  const past = (Array.isArray(body.past) ? body.past : []).slice(0, 10).map((m) => String(m).slice(0, 300))
  const history = (Array.isArray(body.history) ? body.history : []).slice(0, MAX_TURNS).map((h) => ({
    q: String(h.q || '').slice(0, 600), a: String(h.a || '').slice(0, 2500), kind: String(h.kind || 'new'),
    focus: String(h.focus || '').slice(0, 80),
    criteria: h.criteria && typeof h.criteria === 'object' ? tidyCriteria(h.criteria) : null, note: String(h.note || '').slice(0, 300),
  }))
  return { job, language, resume, history, jd, past }
}

const transcript = (history) => history.length
  ? history.map((h, i) => `Q${i + 1} (${h.kind}): ${h.q}\nA${i + 1}: ${h.a || '(no answer)'}`).join('\n\n')
  : '(no questions asked yet)'

export async function nextQuestion(body) {
  const { job, language, resume, history, jd, past } = clean(body)
  if (history.length >= MAX_TURNS) return { done: true }
  const out = await geminiJson(`You are Bolt, a friendly but rigorous hiring manager interviewing a candidate for the job "${job}".
The candidate may be a student or a first-time job seeker. School projects, clubs, family duties, volunteering and part-time work all count as experience.

${jd ? `The job description they applied to. Test the requirements it lists, and compare them with the resume:\n"""${jd}"""\n` : ''}${past.length ? `From this candidate's earlier practice interviews (remembered):\n${past.map((m) => '- ' + m).join('\n')}\nAt some point, test whether they improved on a weak spot listed there.\n` : ''}Candidate's resume (may be empty):
"""${resume || '(no resume given; ask about school, projects and interests instead)'}"""

Interview so far:
${transcript(history)}

First rate the LAST answer (if there is one). ${RUBRIC}
Then decide the single best next move, like a skilled interviewer. If the last answer averaged 2 or less, the move MUST be "followup" (unless the previous two moves were already follow-ups):
- "followup": the last answer was vague, generic, missing what THEY did, missing a result, or made a claim worth testing. Ask about exactly that gap. Never more than 2 follow-ups in a row.
- "resume": dig into a specific item on the resume (a project, tool, role or claim). Ask what they built, decided, or measured.
- "skill": test a core skill this job really needs (technical or practical), with a realistic scenario from the job.
- "behavioral": teamwork, conflict, mistakes, or learning something hard.
- "done": you have ${MAX_TURNS - 1}+ answers, or enough evidence on the job's key skills (at least 4 answers).
Start with a short warm-up about why this job if no questions have been asked yet.
Keep each question to 1-2 sentences, spoken style, no lists. Do not repeat a question already asked.


Write "question", "why" and "lastAnswer.note" in ${language}.
End "question" with ONE short, plain question sentence (at most 12 everyday words, one idea, no names), e.g. "What did you do when the app broke?" It may start with one short friendly sentence before it.
${vocab().length ? `Also give "asl": ONLY the final question sentence as American Sign Language gloss (an array of CAPITAL tokens in ASL order, at most 10 signs, leave out "you", IX-1 for I/me). Use ONLY glosses from this sign library; use the closest synonym from it, or FS:WORD to fingerspell short key terms (at most 10 letters). Fingerspell tech and brand names. Keep the meaning.
Sign library: ${vocab().join(' ')}
` : ''}Return JSON: {"move":"followup|resume|skill|behavioral|done","question":"","asl":[],"why":"one sentence: what a good answer shows","focus":"2-4 words naming the skill or resume item being tested","lastAnswer":{"criteria":{"structure":0,"specifics":0,"relevance":0,"ownership":0},"note":"one short, kind sentence spoken TO the candidate (second person, you/your): what worked or what to add next time"}}`, { fast: true })
  const done = out.move === 'done' || history.length >= MAX_TURNS
  return {
    done,
    question: done ? null : String(out.question || '').trim(),
    asl: !done && Array.isArray(out.asl) && out.asl.length ? out.asl.map((g) => String(g).toUpperCase()).slice(0, 14) : null,
    why: out.why || '',
    kind: done ? 'done' : out.move || 'skill',
    focus: out.focus || '',
    lastAnswer: history.length ? (() => {
      const criteria = tidyCriteria(out.lastAnswer?.criteria)
      const points = pointsOf(criteria)
      return { criteria, points, score: Math.max(1, Math.round(points / 20)), note: out.lastAnswer?.note || '' }
    })() : null,
  }
}

export async function feedback(body) {
  const { job, language, resume, history, jd } = clean(body)
  // Answers already scored during the call keep their scores; only unscored ones (e.g. the last
  // answer when the call ended early) are scored here, with the same rubric.
  const unscored = history.map((h, i) => (h.criteria ? null : i + 1)).filter(Boolean)
  const out = await geminiJson(`You are an honest, kind interview coach. A candidate just finished an interview for "${job}".
${jd ? `Job description: """${jd}"""\nIn "gaps", name requirements from the job description the candidate has not shown evidence for.\n` : ''}Resume (may be empty): """${resume || '(none)'}"""
Interview (scores already given are shown after each answer, as structure/specifics/relevance/ownership out of 5):
${history.map((h, i) => `Q${i + 1} (${h.kind}): ${h.q}\nA${i + 1}: ${h.a || '(no answer)'}${h.criteria ? `\nScored: ${CRITERIA.map((c) => `${c} ${h.criteria[c]}`).join(', ')}` : ''}`).join('\n\n')}

${unscored.length ? `Answers ${unscored.join(', ')} have no score yet. For those only, give "criteria". ${RUBRIC}\n` : ''}For EVERY answer: quote a short phrase the candidate actually said (copy it exactly, max 12 words) as evidence, then one strength and one concrete fix. Keep your comments consistent with the scores shown.
Then the overall picture: a one-sentence verdict, up to 3 strengths, up to 3 gaps tied to what this job needs, and 3 specific things to practise next (one can be rewriting a weak answer).
Never judge accent, grammar, spelling or background.

Write everything in ${language}.
Return JSON: {"verdict":"","answers":[{"criteria":{"structure":0,"specifics":0,"relevance":0,"ownership":0},"quote":"","strength":"","fix":""}],"strengths":[""],"gaps":[""],"next":[""]}`,
  { fast: true, models: ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'] })
  const answers = history.map((h, i) => {
    const o = out.answers?.[i] || {}
    const criteria = h.criteria || tidyCriteria(o.criteria)
    const points = pointsOf(criteria)
    return { q: h.q, a: h.a, kind: h.kind, focus: h.focus, note: h.note, criteria, points, score: Math.max(1, Math.round(points / 20)),
      quote: String(o.quote || '').slice(0, 200), strength: String(o.strength || '').slice(0, 300), fix: String(o.fix || '').slice(0, 300) }
  })
  // The overall score is computed, not guessed: the mean of the answer scores.
  const points = answers.length ? Math.round(answers.reduce((s, a) => s + a.points, 0) / answers.length) : 0
  const criteria = criteriaAverage(answers)
  const weakest = CRITERIA.filter((c) => criteria[c] != null).sort((a, b) => criteria[a] - criteria[b])[0] || null
  return {
    overall: { points, score: Math.max(1, Math.round(points / 20)), verdict: String(out.verdict || out.overall?.verdict || '') },
    criteria, weakest, answers,
    strengths: (out.strengths || []).filter(Boolean).slice(0, 3), gaps: (out.gaps || []).filter(Boolean).slice(0, 3), next: (out.next || []).filter(Boolean).slice(0, 3),
  }
}

export const handler = async (event) => {
  let body
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Send JSON.' }) }
  const path = event.rawPath || ''
  // Practice sessions (MongoDB): one per job, with its job description and every attempt.
  if (path.endsWith('/session/open')) return json(200, (await openSession(body)) || { id: null, attempts: [] })
  if (path.endsWith('/session/list')) return json(200, await listSessions(body.guest))
  if (path.endsWith('/session/get')) return json(200, (await getSession(body.guest, body.id)) || { id: null })
  if (path.endsWith('/session/forget')) return json(200, { ok: await forgetGuest(body.guest) })

  if (!String(body.job || '').trim()) return json(400, { error: 'Missing job.' })
  if (path.endsWith('/next')) {
    // The first question can revisit weak spots, but only from earlier attempts at this same job.
    if (!body.history?.length && body.sessionId && !body.past) body.past = await pastForSession(body.guest, body.sessionId).catch(() => [])
    return json(200, await nextQuestion(body))
  }
  if (path.endsWith('/feedback')) {
    const data = await feedback(body)
    let attempts = null
    if (body.sessionId) {
      // Saved: questions, answers and scores. Never the resume.
      attempts = await saveAttempt(body.guest, body.sessionId, {
        points: data.overall.points, criteria: data.criteria, weakest: data.weakest, verdict: data.overall.verdict,
        strengths: data.strengths, gaps: data.gaps, next: data.next, lang: String(body.lang || 'en'),
        answers: data.answers.map(({ q, a, kind, focus, criteria, points, note, quote, strength, fix }) => ({ q, a, kind, focus, criteria, points, note, quote, strength, fix })),
      }).catch((e) => { console.warn('save attempt failed', e.message); return null })
    }
    if (body.guest) {
      await remember(body.guest, [`Mock interview for ${body.job}: ${data.overall.points}/100. ${data.overall.verdict || ''}`,
        data.next?.length ? `Practise next: ${data.next.join('; ')}.` : ''].filter(Boolean).join(' '),
      { type: 'interview', job: String(body.job || ''), score: data.overall.points }).catch(() => {})
    }
    return json(200, { ...data, attempts })
  }
  return json(404, { error: 'Unknown interview route.' })
}
