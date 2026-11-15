// Step Functions task 1: Gemini writes the six-scene script and the credits.
import { geminiJson } from './lib/gemini.js'
import { groundingFacts } from './lib/grounding.js'

const LANGS = { en: 'English', es: 'Spanish', hi: 'Hindi', ar: 'Arabic', vi: 'Vietnamese' }
const KITS = ['code', 'data', 'security', 'finance', 'accounting', 'marketing', 'health', 'trades', 'general']

export const handler = async ({ jobId, job, lang, profile }) => {
  const facts = await groundingFacts(job)
  const language = LANGS[lang] || 'English'
  const prompt = `You write the narration for a short animated trailer. Bolt, a friendly robot, spends one realistic workday as a ${job} and tells the viewer about it in the first person ("I", "my"). The viewer is a teenager or first-generation student who has never seen this job.

Job: ${job}
Write everything in ${language}${lang === 'en' ? '' : ' (natural, everyday language, not a word-for-word translation)'}.
About the viewer (may be empty): ${profile || 'none'}
${facts ? `Verified facts from O*NET for "${facts.occupation}". Base the scenes on these real tasks and the path on this education data:\n${JSON.stringify({ tasks: facts.tasks, education: facts.education })}\n` : ''}
The animation has six fixed settings, in this order: 1 arriving at the office, 2 at my desk, 3 a meeting with teammates, 4 a problem at work, 5 solving it, 6 heading home.
Return JSON exactly like:
{
  "kit": "one of: code, data, security, finance, accounting, marketing, health, trades, general (the props that fit this job best)",
  "scenes": [ { "title": "<=4 words", "narration": "2 short sentences, first person as Bolt, plain words, concrete real tasks and tools", "screen": "<=3 words shown on Bolt's monitor or whiteboard in this scene" } ],
  "credits": { "path": ["4 realistic steps from today to the job, cheapest routes first"], "cost": "one plain sentence about what it costs to get there" }
}
Exactly 6 scenes. All text in ${language}, except "kit".
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
  return { jobId, job, lang, kit, scenes: out.scenes.slice(0, 6).map((s, index) => ({ ...s, index, written: lang })), credits }
}
