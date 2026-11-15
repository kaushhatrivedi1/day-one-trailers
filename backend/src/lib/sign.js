// Text -> ASL video, in the style of AWS's GenASL sample (aws-samples/genai-asl-avatar-generator):
//   1. Gemini translates the line (any spoken language) into ASL gloss tokens.
//   2. Each gloss is looked up in a sign library of individual clips; missing words are
//      fingerspelled when letter clips exist.
//   3. ffmpeg joins the clips into one MP4.
// The library is NOT in git. Clips from ASLLVD (Boston University) may only be loaded after
// written permission; see docs/asllvd-permission-email.md and backend/tools/import-asllvd.mjs.
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { geminiJson } from './gemini.js'

const run = promisify(execFile)
const LANGS = { en: 'English', es: 'Spanish', hi: 'Hindi', ar: 'Arabic', vi: 'Vietnamese' }
const MIN_COVERAGE = Number(process.env.SIGN_MIN_COVERAGE || 0.7)

// Entries that are not plain dictionary words and mislead when used as one: classifier constructions
// (DCL, ICL, SCL, BPCL ...), name signs (ns-), and directional/agreement verbs whose meaning depends
// on direction (1p-HELP, GIVE:i). Letters (FS-A ...) are always kept for fingerspelling.
const RISKY = /(^|[^A-Za-z])(?:[A-Z]{0,3}CL)(?=[^A-Za-z]|$)|(^|[^A-Za-z])ns-|^\(?\d?p-|^\d+p-|:[a-z]+$/

export function signLibrary(dir) {
  const file = path.join(dir, 'library.json')
  if (!fs.existsSync(file)) return { dir, signs: {}, source: null }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  const signs = {}
  let dropped = 0
  for (const [key, entry] of Object.entries(data.signs || {})) {
    if (!key.startsWith('FS-') && RISKY.test(entry.gloss || key)) { dropped++; continue }
    signs[key] = entry
  }
  return { dir, signs, dropped, source: data.source || null, credit: data.credit || null }
}

export const glossVocabulary = (lib) => Object.keys(lib.signs).filter((v) => !v.startsWith('FS-') && !v.includes('/') && v.length > 1)

export async function toGloss(text, lang = 'en', vocabulary = [], simple = false) {
  // Offer only the plain forms (no FS- letters or slash variants) so the list stays compact.
  const plain = vocabulary.filter((v) => !v.startsWith('FS-') && !v.includes('/') && v.length > 1)
  const vocab = plain.length ? `
Use ONLY glosses from this sign library list. If a word is not in it, use the closest synonym from the list,
or FS:WORD to fingerspell it (only for names and short key terms, at most 10 letters), or leave it out.
Technology, software, product and brand names (Python, SQL, API, Excel, Tableau) and words whose everyday sign means something else here (bug, model, python, mouse, cloud, server, agent, pipeline) must be fingerspelled as FS:WORD or a short acronym (FS:API), never the dictionary sign.
Sign library:
${plain.slice(0, 4000).join(' ')}
` : ''
  const out = await geminiJson(`Translate this ${LANGS[lang] || 'English'} sentence into American Sign Language gloss.
Follow ASL grammar: time first, topic-comment order, drop articles and "to be", IX-1 for I/me, leave out "you" (no sign for it in the library),
one gloss per sign in CAPITALS with hyphens for multi-word signs (THANK-YOU), and FS:NAME for names or
words that are usually fingerspelled. Aim for at most 12 signs. Translate the meaning faithfully: every gloss must come from a word
or idea in the sentence (never add or swap topics). Job titles: use the ASL sign if one is common
(e.g. ACCOUNTANT, DOCTOR, TEACHER) or the closest signs (DATA SCIENCE, SOFTWARE DEVELOP+AGENT). Keep it short.${simple ? `
This sentence is long. First reduce it to its core meaning (for a question: just the question itself, without greetings, names or small talk), then sign only that, in 4 to 8 common signs. Skip details and examples; put the question word (HOW, WHAT, WHY, WHERE, WHO) last.` : ''}${vocab}
Sentence: """${String(text).slice(0, 400)}"""
Return JSON: {"gloss":["TOKEN"]}`, { models: ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.5-flash-lite'] })
  const gloss = (Array.isArray(out.gloss) ? out.gloss : []).flatMap((g) => String(g).trim().toUpperCase().split(/\s+/)).filter(Boolean).slice(0, 40)
  return gloss
}

// Map gloss tokens to clip files. Returns the clips in order and the tokens that had no clip.
export function resolve(gloss, lib) {
  const clips = []
  const missing = []
  for (const token of gloss) {
    const word = token.replace(/^FS:/, '')
    // ASLLVD writes pointing signs as IX-1p / IX-2p; the model usually writes IX-1 / IX-2.
    // There is no clip of pointing at the viewer (IX-2), so 'you' is left out rather than faked.
    const alt = { 'IX-1': 'IX-1P', ME: 'IX-1P', I: 'IX-1P' }[token]
    const hit = lib.signs[token] || lib.signs[word] || (alt && lib.signs[alt])
    if (hit && !token.startsWith('FS:')) { clips.push(path.join(lib.dir, hit.file)); continue }
    // Fingerspell only short words; a long word cut off at 10 letters would spell nonsense.
    const all = word.replace(/[^A-Z]/g, '')
    const letters = all.length <= 10 ? all.split('') : []
    const spelled = letters.map((l) => lib.signs[`FS-${l}`] || lib.signs[l])
    if (letters.length && spelled.every(Boolean)) spelled.forEach((s) => clips.push(path.join(lib.dir, s.file)))
    else missing.push(token)
  }
  return { clips, missing, coverage: gloss.length ? (gloss.length - missing.length) / gloss.length : 0 }
}

// Join clips into one MP4. Clips can differ in size and frame rate, so re-encode to one format.
export async function stitch(clips, outDir) {
  const key = createHash('sha1').update(clips.join('|')).digest('hex').slice(0, 16)
  const out = path.join(outDir, `${key}.mp4`)
  if (fs.existsSync(out)) return { key, file: out }
  fs.mkdirSync(outDir, { recursive: true })
  const inputs = clips.flatMap((c) => ['-i', c])
  // Same frame for every clip; a 70 ms fade-in on each sign softens the cut between clips.
  const parts = clips.map((_, i) => `[${i}:v]scale=240:288:force_original_aspect_ratio=decrease,pad=240:288:(ow-iw)/2:(oh-ih)/2:color=0x06070b,fps=30,setsar=1,fade=in:st=0:d=0.07[v${i}]`).join(';')
  const concat = clips.map((_, i) => `[v${i}]`).join('') + `concat=n=${clips.length}:v=1:a=0[out]`
  await run(process.env.FFMPEG_PATH || 'ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', `${parts};${concat}`, '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { timeout: 60000 })
  return { key, file: out }
}

// Meaning check, in two separate passes so the first is blind:
//   pass 1 sees ONLY the gloss sequences and translates them back to English;
//   pass 2 compares each back-translation with the line that was spoken.
// A line passes when its main meaning survives (score >= 0.7). Failing lines show captions only.
export async function verifyGlosses(items, { mainOnly = false } = {}) {
  if (!items.length) return []
  const back = await geminiJson(`You read American Sign Language gloss (one token per sign; IX-1 = I/me, IX = pointing/you,
FS:WORD = fingerspelled word). Translate each numbered gloss sequence into one plain English sentence.
Do not guess beyond what the signs say.
${items.map((it, i) => `${i + 1}. ${it.gloss.join(' ')}`).join('\n')}
Return JSON: {"english":["sentence for 1", "sentence for 2", ...]}`, { fast: true }).catch(() => null)
  const english = back?.english || []
  if (english.length !== items.length) return items.map(() => ({ pass: false, score: 0, back: '' }))
  const judged = await geminiJson(`B is a rough back-translation of sign language, so it is choppy and may change tense, order,
pronouns and small words. Judge only whether B keeps the MAIN MEANING of A: the same people, actions and things.${mainOnly ? ' A may open with a greeting, names or small talk; ignore those, but B must keep the main question or point of A (what is being asked, about what).' : ''}
Scale: 1 = main meaning kept (even if wording, tense or detail differ); 0.7 = mostly kept, one minor idea missing;
0.4 = an important idea missing or changed; 0 = different meaning or nonsense.
Examples: A "I finish work and go home." / B "Work finished, I went home." -> 1.
A "I fix a Python bug." / B "I am a snake." -> 0.
A "I meet my team to plan the day." / B "Morning, team meet, plan." -> 0.9.
${items.map((it, i) => `${i + 1}. A: ${it.text}\n   B: ${english[i]}`).join('\n')}
Return JSON: {"scores":[0.0, ...]}`, { fast: true }).catch(() => null)
  return items.map((_, i) => {
    const score = Number(judged?.scores?.[i])
    return { back: english[i], score: Number.isFinite(score) ? score : 0, pass: Number.isFinite(score) && score >= 0.7 }
  })
}

// Motion for Bolt: per-clip frames from signs/motion.json (made by tools/extract_motion.py),
// chained into one timeline with a short gap between signs. Reloaded when the file changes.
let motionCache = { file: null, mtime: 0, data: {} }
function motionData(dir) {
  const file = path.join(dir, 'motion.json')
  if (!fs.existsSync(file)) return {}
  const mtime = fs.statSync(file).mtimeMs
  if (motionCache.file !== file || motionCache.mtime !== mtime) motionCache = { file, mtime, data: JSON.parse(fs.readFileSync(file, 'utf8')) }
  return motionCache.data
}
export function chainMotion(clips, dir) {
  const data = motionData(dir)
  const frames = []
  let offset = 0
  let missing = 0
  for (const clip of clips) {
    const m = data[path.basename(clip)]
    if (!m?.frames?.length) { missing++; continue }
    const t0 = m.frames[0].t
    for (const f of m.frames) frames.push({ ...f, t: Math.round((offset + f.t - t0) * 1000) / 1000 })
    offset = frames[frames.length - 1].t + 0.08
  }
  return { frames, missing }
}

// The whole pipeline. videoFile is null when the library can't cover enough of the sentence,
// because a video that skips a third of the words would mislead a signing viewer.
// `check` is a verifyGlosses() result when the caller already verified a batch.
export async function signLine(text, lang, libDir, outDir, given = null, check = null, simpleFirst = false, retryGiven = false) {
  const lib = signLibrary(libDir)
  if (!Object.keys(lib.signs).length) return { gloss: [], missing: [], coverage: 0, status: 'no-library', video: null }
  let gloss = given?.length ? given : await toGloss(text, lang, Object.keys(lib.signs), simpleFirst)
  let { clips, missing, coverage } = resolve(gloss, lib)
  let enough = clips.length > 0 && coverage >= MIN_COVERAGE
  let verdict = enough ? check || (await verifyGlosses([{ text, gloss }], { mainOnly: simpleFirst }))[0] : null
  // Long lines (interview questions) often lose their meaning in a word-by-word gloss. Try once
  // more with just the core meaning in a few common signs, checked blind against the full line.
  const retried = (!given?.length || retryGiven) && !(enough && verdict?.pass)
  if (retried) {
    const short = await toGloss(text, lang, Object.keys(lib.signs), !simpleFirst).catch(() => [])
    const r = resolve(short, lib)
    if (r.clips.length && r.coverage >= MIN_COVERAGE) {
      const v = (await verifyGlosses([{ text, gloss: short }], { mainOnly: true }))[0]
      if (v?.pass) ({ gloss, clips, missing, coverage, verdict, enough } = { gloss: short, ...r, verdict: { ...v, simplified: true }, enough: true })
    }
  }
  const ok = enough && verdict?.pass
  // Bolt signs from motion data by default; set SIGN_VIDEO=1 to also join the source clips into a video.
  const motion = ok ? chainMotion(clips, libDir) : null
  const video = ok && process.env.SIGN_VIDEO === '1' ? await stitch(clips, outDir) : null
  return {
    gloss: [...gloss],
    missing,
    coverage: Math.round(coverage * 100) / 100,
    check: verdict,
    librarySize: Object.keys(lib.signs).length,
    status: !enough ? 'low-coverage' : ok ? (motion?.frames.length ? 'ok' : 'no-motion') : 'failed-check',
    motion: motion?.frames.length ? { frames: motion.frames } : null,
    video,
    credit: lib.credit,
    retried,
  }
}

// Where the Lambda finds the packed sign data (src/signdata, see tools/pack-signs.sh).
export const signDataDir = () => process.env.SIGN_DIR || path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'signdata')

// A whole trailer at once: glosses come from the script call, one verifyGlosses batch checks them all.
// Returns one /sign-shaped result per item (same shape as signLine), so it can go straight into the cache.
export async function signBatch(items, dir) {
  const lib = signLibrary(dir)
  const rows = items.map((it) => ({ it, ...resolve(it.gloss || [], lib) }))
  const ok = rows.filter((r) => r.it.gloss?.length && r.clips.length && r.coverage >= MIN_COVERAGE)
  const checks = ok.length ? await verifyGlosses(ok.map((r) => ({ text: r.it.text, gloss: r.it.gloss }))) : []
  return rows.map((r) => {
    const k = ok.indexOf(r)
    const check = k >= 0 ? checks[k] : null
    const motion = check?.pass ? chainMotion(r.clips, dir) : null
    return {
      gloss: [...(r.it.gloss || [])], missing: r.missing, coverage: Math.round(r.coverage * 100) / 100, check,
      librarySize: Object.keys(lib.signs).length,
      status: k < 0 ? 'low-coverage' : check?.pass ? (motion?.frames.length ? 'ok' : 'no-motion') : 'failed-check',
      motion: motion?.frames.length ? { frames: motion.frames } : null, videoUrl: null, credit: lib.credit, retried: false,
    }
  })
}

// S3 key for a cached /sign result; shared by the /sign route and the trailer's Finalize step.
export const signCacheKey = (lang, text) => `sign/${createHash('sha1').update(lang + '|' + String(text).trim().slice(0, 400)).digest('hex')}.json`
