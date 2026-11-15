// Practice sessions in MongoDB Atlas: one session per visitor per job (job + company), holding the
// job description, and every interview attempt for it (questions, answers, per-criterion scores, the
// report). This is what lets Day One show progress over time, and keeps each job's history separate:
// practising for a new job never pulls in weak spots from another one.
// The visitor is the anonymous id kept in their browser; "Forget me" deletes everything for it.
// The resume is never stored.
import { ObjectId } from 'mongodb'
import { db } from './mongo.js'

export const CRITERIA = ['structure', 'specifics', 'relevance', 'ownership']

const guestId = (g) => {
  const id = String(g || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
  return id.length >= 8 ? id : null
}
export const jobKey = (job, company) =>
  `${String(job || '').trim().toLowerCase()}|${String(company || '').trim().toLowerCase()}`.replace(/\s+/g, ' ').slice(0, 200)

// Average of the per-answer criteria, each 1-5.
export function criteriaAverage(answers) {
  const out = {}
  for (const c of CRITERIA) {
    const v = answers.map((a) => Number(a.criteria?.[c])).filter((n) => n >= 1 && n <= 5)
    out[c] = v.length ? Math.round((v.reduce((s, n) => s + n, 0) / v.length) * 10) / 10 : null
  }
  return out
}

// Open (or create) the session for this visitor and job. Saves the job description when given.
export async function openSession({ guest, job, company = '', jd = '', jdUrl = '', lang = 'en' }) {
  const g = guestId(guest)
  const mongo = g && job ? await db().catch(() => null) : null
  if (!mongo) return null
  const key = jobKey(job, company)
  const now = new Date()
  const set = { job: String(job).slice(0, 120), company: String(company || '').slice(0, 120), lang, updatedAt: now }
  if (jd) Object.assign(set, { jd: String(jd).slice(0, 12000), jdUrl: String(jdUrl || '').slice(0, 500) })
  const s = await mongo.collection('sessions').findOneAndUpdate(
    { guest: g, key },
    { $set: set, $setOnInsert: { guest: g, key, createdAt: now } },
    { upsert: true, returnDocument: 'after' },
  )
  return { id: String(s._id), job: s.job, company: s.company, jd: s.jd || '', jdUrl: s.jdUrl || '', attempts: await progress(mongo, g, s._id) }
}

// Score history for one session, oldest first (for the progress chart and "since last time").
async function progress(mongo, g, sessionId) {
  const rows = await mongo.collection('attempts').find({ guest: g, sessionId: new ObjectId(sessionId) }, { projection: { points: 1, criteria: 1, at: 1, gaps: 1, next: 1, weakest: 1 } })
    .sort({ at: 1 }).limit(30).toArray()
  return rows.map((r) => ({ points: r.points, criteria: r.criteria, at: r.at, gaps: r.gaps || [], next: r.next || [], weakest: r.weakest || null }))
}

// What the interviewer should revisit: weak spots from earlier attempts at THIS job only.
export async function pastForSession(guest, sessionId) {
  const g = guestId(guest)
  if (!g || !ObjectId.isValid(sessionId)) return []
  const mongo = await db().catch(() => null)
  if (!mongo) return []
  const rows = await progress(mongo, g, sessionId)
  const last = rows.slice(-2)
  return last.flatMap((r) => [
    `Earlier attempt scored ${r.points}/100${r.weakest ? `; weakest skill: ${r.weakest}` : ''}.`,
    ...(r.gaps || []).slice(0, 2).map((x) => `Gap: ${x}`),
    ...(r.next || []).slice(0, 2).map((x) => `To practise: ${x}`),
  ]).slice(0, 10)
}

export async function saveAttempt(guest, sessionId, attempt) {
  const g = guestId(guest)
  if (!g || !ObjectId.isValid(sessionId)) return null
  const mongo = await db().catch(() => null)
  if (!mongo) return null
  const sid = new ObjectId(sessionId)
  const owned = await mongo.collection('sessions').findOne({ _id: sid, guest: g }, { projection: { _id: 1 } })
  if (!owned) return null
  await mongo.collection('attempts').insertOne({ guest: g, sessionId: sid, at: new Date(), ...attempt })
  await mongo.collection('sessions').updateOne({ _id: sid }, { $set: { updatedAt: new Date() } })
  return progress(mongo, g, sid)
}

// The lobby's "Continue practising" list: most recent sessions with attempt counts and best score.
export async function listSessions(guest) {
  const g = guestId(guest)
  const mongo = g ? await db().catch(() => null) : null
  if (!mongo) return []
  const sessions = await mongo.collection('sessions').find({ guest: g }).sort({ updatedAt: -1 }).limit(8).toArray()
  return Promise.all(sessions.map(async (s) => {
    const rows = await progress(mongo, g, s._id)
    return { id: String(s._id), job: s.job, company: s.company, hasJd: !!s.jd, lang: s.lang, updatedAt: s.updatedAt,
      attempts: rows.length, best: rows.length ? Math.max(...rows.map((r) => r.points || 0)) : null, last: rows.at(-1)?.points ?? null }
  }))
}

// The full session (job description included) to reopen it from the lobby.
export async function getSession(guest, sessionId) {
  const g = guestId(guest)
  if (!g || !ObjectId.isValid(sessionId)) return null
  const mongo = await db().catch(() => null)
  if (!mongo) return null
  const s = await mongo.collection('sessions').findOne({ _id: new ObjectId(sessionId), guest: g })
  if (!s) return null
  return { id: String(s._id), job: s.job, company: s.company, jd: s.jd || '', jdUrl: s.jdUrl || '', lang: s.lang, attempts: await progress(mongo, g, s._id) }
}

export async function forgetGuest(guest) {
  const g = guestId(guest)
  const mongo = g ? await db().catch(() => null) : null
  if (!mongo) return false
  await Promise.all([mongo.collection('sessions').deleteMany({ guest: g }), mongo.collection('attempts').deleteMany({ guest: g })])
  return true
}
