// POST /company/preview { jd, lang } -> { research, title, company }
// The lobby's live company card: read a pasted job link or posting, then research the company.
import { json } from './lib/clients.js'
import { looksLikeUrl, readJobPage } from './lib/jobpage.js'
import { researchCompany } from './lib/company.js'

export const handler = async (event) => {
  let body
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'Send JSON.' }) }
  const lang = ['en', 'es', 'hi', 'ar', 'vi'].includes(body.lang) ? body.lang : 'en'
  const input = String(body.jd || '').trim().slice(0, 6000)
  if (!looksLikeUrl(input) && input.length < 40) return json(400, { error: 'Paste a job link or description.' })
  try {
    let jdText = input, jobPage = {}
    if (looksLikeUrl(input)) { jobPage = await readJobPage(input); jdText = jobPage.text }
    const research = await researchCompany({ company: jobPage.company, role: jobPage.title, jdText, jobUrl: jobPage.url, orgUrl: jobPage.orgUrl, lang }).catch(() => null)
    return json(200, { research, title: jobPage.title || '', company: research?.company || jobPage.company || '' })
  } catch (e) {
    return json(422, { error: `${e.message} Paste the job description text instead.` })
  }
}
