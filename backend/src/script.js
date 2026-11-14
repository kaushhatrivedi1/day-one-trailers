// Step Functions task 1: Gemini writes the six-scene script and the credits.
import { geminiJson } from './lib/gemini.js'

// TODO(grounding): fetch real tasks, education and wages for `job` from O*NET / BLS here and pass
// them in as `facts`. Until then the prompt forbids invented numbers.
async function groundingFacts() { return null }

export const handler = async ({ jobId, job, lang, profile }) => {
  const facts = await groundingFacts(job)
  const prompt = `You write short animated trailers that show a teenager or first-generation student what a day in a job is really like.

Job: ${job}
About the viewer (may be empty): ${profile || 'none'}
${facts ? `Verified facts to rely on:\n${JSON.stringify(facts)}\n` : ''}
Return JSON exactly like:
{
  "scenes": [ { "title": "<=4 words", "narration": "2 short sentences, second person, plain English, concrete details", "imagePrompt": "an illustrated film-poster frame, flat shapes, warm cinematic lighting, no text, no logos" } ] (exactly 6 scenes: before work, first task, the people, a problem, a small win, the ride home),
  "credits": { "path": ["4 realistic steps from today to the job, cheapest routes first"], "cost": "one plain sentence about what it costs, including paid routes like apprenticeships", "pay": "Sample range: ... (estimate)" }
}
Rules:
- Show a realistic, not glamorous, day. Name real tools and tasks.
- Do not invent statistics, employers or laws. If unsure, give a range and say it is an estimate.
- In every imagePrompt, depict people of varied ages, genders, skin tones and abilities. Never default to one type of person.
- No violence, no brands.`
  const out = await geminiJson(prompt)
  if (!Array.isArray(out.scenes) || out.scenes.length < 3) throw new Error('Script was not usable')
  return { jobId, job, lang, scenes: out.scenes.slice(0, 6).map((s, index) => ({ ...s, index })), credits: out.credits }
}
