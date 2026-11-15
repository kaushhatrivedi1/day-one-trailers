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

export function signLibrary(dir) {
  const file = path.join(dir, 'library.json')
  if (!fs.existsSync(file)) return { dir, signs: {}, source: null }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  return { dir, signs: data.signs || {}, source: data.source || null, credit: data.credit || null }
}

export const glossVocabulary = (lib) => Object.keys(lib.signs).filter((v) => !v.startsWith('FS-') && !v.includes('/') && v.length > 1)

export async function toGloss(text, lang = 'en', vocabulary = []) {
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
Follow ASL grammar: time first, topic-comment order, drop articles and "to be", IX-1 for I/me, IX-2 for you,
one gloss per sign in CAPITALS with hyphens for multi-word signs (THANK-YOU), and FS:NAME for names or
words that are usually fingerspelled. Aim for at most 12 signs. Translate the meaning faithfully: every gloss must come from a word
or idea in the sentence (never add or swap topics). Job titles: use the ASL sign if one is common
(e.g. ACCOUNTANT, DOCTOR, TEACHER) or the closest signs (DATA SCIENCE, SOFTWARE DEVELOP+AGENT). Keep it short.${vocab}
Sentence: """${String(text).slice(0, 400)}"""
Return JSON: {"gloss":["TOKEN"]}`, { models: ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.5-flash-lite'] })
  return (Array.isArray(out.gloss) ? out.gloss : []).map((g) => String(g).trim().toUpperCase()).filter(Boolean).slice(0, 40)
}

// Map gloss tokens to clip files. Returns the clips in order and the tokens that had no clip.
export function resolve(gloss, lib) {
  const clips = []
  const missing = []
  for (const token of gloss) {
    const word = token.replace(/^FS:/, '')
    // ASLLVD writes pointing signs as IX-1p / IX-2p; the model usually writes IX-1 / IX-2.
    const alt = { 'IX-1': 'IX-1P', 'IX-2': 'IX', 'IX-3': 'IX', ME: 'IX-1P', I: 'IX-1P', YOU: 'IX' }[token]
    const hit = lib.signs[token] || lib.signs[word] || (alt && lib.signs[alt])
    if (hit && !token.startsWith('FS:')) { clips.push(path.join(lib.dir, hit.file)); continue }
    const letters = word.replace(/[^A-Z]/g, '').slice(0, 10).split('')
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
  const parts = clips.map((_, i) => `[${i}:v]scale=240:410:force_original_aspect_ratio=decrease,pad=240:410:(ow-iw)/2:(oh-ih)/2:color=0x5a3a46,fps=24,setsar=1[v${i}]`).join(';')
  const concat = clips.map((_, i) => `[v${i}]`).join('') + `concat=n=${clips.length}:v=1:a=0[out]`
  await run(process.env.FFMPEG_PATH || 'ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', `${parts};${concat}`, '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { timeout: 60000 })
  return { key, file: out }
}

// The whole pipeline. videoFile is null when the library can't cover enough of the sentence,
// because a video that skips a third of the words would mislead a signing viewer.
export async function signLine(text, lang, libDir, outDir, given = null) {
  const lib = signLibrary(libDir)
  const gloss = given?.length ? given : await toGloss(text, lang, Object.keys(lib.signs))
  const { clips, missing, coverage } = resolve(gloss, lib)
  const enough = clips.length > 0 && coverage >= MIN_COVERAGE
  const video = enough ? await stitch(clips, outDir) : null
  return {
    gloss,
    missing,
    coverage: Math.round(coverage * 100) / 100,
    librarySize: Object.keys(lib.signs).length,
    status: !Object.keys(lib.signs).length ? 'no-library' : enough ? 'ok' : 'low-coverage',
    video,
    credit: lib.credit,
  }
}
