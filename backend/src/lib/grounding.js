// Real occupation facts from O*NET Web Services (API v2), which also serves BLS wage data.
// Docs: https://services.onetcenter.org/reference/  Key: X-API-Key header (ONET_API_KEY).
// Terms require a visible link to https://services.onetcenter.org/ wherever this data is shown.
// Returns null when there is no key or no match, so the trailer still renders without figures.

const BASE = 'https://api-v2.onetcenter.org'
export const ONET_CREDIT = 'O*NET Web Services (U.S. Department of Labor), with wage data from the Bureau of Labor Statistics. https://services.onetcenter.org/'

async function onet(path) {
  const key = process.env.ONET_API_KEY
  if (!key) return null
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(BASE + path, { headers: { 'X-API-Key': key, Accept: 'application/json' }, signal: AbortSignal.timeout(8000) })
    if (res.status === 429) { await new Promise((r) => setTimeout(r, 300)); continue }
    if (!res.ok) throw new Error(`O*NET ${res.status} on ${path}`)
    return res.json()
  }
  throw new Error(`O*NET rate limited on ${path}`)
}

const money = (n) => (typeof n === 'number' ? `$${n.toLocaleString('en-US')}` : null)

function payLine(salary) {
  if (!salary) return null
  const median = money(salary.annual_median)
  if (!median) return null
  const over = salary.annual_median_over ? 'over ' : ''
  const parts = [`Median ${over}${median} a year.`]
  if (money(salary.annual_10th_percentile)) parts.push(`Lowest 10%: under ${money(salary.annual_10th_percentile)}.`)
  if (money(salary.annual_90th_percentile)) parts.push(`Highest 10%: ${salary.annual_90th_percentile_over ? 'over' : 'about'} ${money(salary.annual_90th_percentile)}.`)
  return parts.join(' ')
}

export async function groundingFacts(job) {
  if (!process.env.ONET_API_KEY) return null
  try {
    const search = await onet(`/online/search?keyword=${encodeURIComponent(job)}&end=3`)
    const occ = search?.occupation?.[0]
    if (!occ) return null
    const code = occ.code

    const [tasks, education, outlook] = await Promise.all([
      onet(`/online/occupations/${code}/summary/tasks?end=6`).catch(() => null),
      onet(`/online/occupations/${code}/summary/education`).catch(() => null),
      onet(`/mnm/careers/${code}/job_outlook`).catch(() => null),
    ])

    const edu = (education?.response || [])
      .filter((e) => typeof e.percentage_of_respondents === 'number')
      .sort((a, b) => b.percentage_of_respondents - a.percentage_of_respondents)
      .slice(0, 3)
      .map((e) => `${e.title} (${e.percentage_of_respondents}% of workers)`)

    return {
      occupation: occ.title,
      code,
      tasks: (tasks?.task || []).map((t) => t.title).filter(Boolean),
      education: edu,
      pay: payLine(outlook?.salary),
      outlook: outlook?.outlook?.category ? `${outlook.outlook.category}${outlook.outlook.description ? `: ${outlook.outlook.description}` : ''}` : null,
      source: `${ONET_CREDIT} Occupation: ${occ.title} (${code}).`,
    }
  } catch (e) {
    console.warn('grounding failed', e.message)
    return null
  }
}
