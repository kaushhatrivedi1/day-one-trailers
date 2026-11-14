// Step Functions task 1: Gemini writes the six-scene script and the credits.
import { geminiJson } from './lib/gemini.js'
import { groundingFacts } from './lib/grounding.js'

export const handler = async ({ jobId, job, lang, profile }) => {
  const facts = await groundingFacts(job)
  const prompt = `You write short animated trailers that show a teenager or first-generation student what a day in a job is really like.

Job: ${job}
About the viewer (may be empty): ${profile || 'none'}
${facts ? `Verified facts from O*NET for "${facts.occupation}". Base the scenes on these real tasks and the path on this education data:\n${JSON.stringify({ tasks: facts.tasks, education: facts.education })}\n` : ''}
Return JSON exactly like:
{
  "scenes": [ { "title": "<=4 words", "narration": "2 short sentences, second person, plain English, concrete details", "imagePrompt": "an illustrated film-poster frame, flat shapes, warm cinematic lighting, no text, no logos" } ] (exactly 6 scenes: before work, first task, the people, a problem, a small win, the ride home),
  "credits": { "path": ["4 realistic steps from today to the job, cheapest routes first"], "cost": "one plain sentence about what it costs, including paid routes like apprenticeships", "pay": "leave empty" }
}
Rules:
- Show a realistic, not glamorous, day. Name real tools and tasks.
- Do not invent statistics, pay figures, employers or laws. Pay is filled in from official data, so leave "pay" empty.
- In every imagePrompt, depict people of varied ages, genders, skin tones and abilities. Never default to one type of person.
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
  return { jobId, job, lang, scenes: out.scenes.slice(0, 6).map((s, index) => ({ ...s, index })), credits }
}
