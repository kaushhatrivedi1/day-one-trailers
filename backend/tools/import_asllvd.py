"""Build Day One's local sign library from ASLLVD (Boston University ASLLRP).

LICENSE: ASLLVD data "can be used for research and education purposes, but cannot be redistributed
without permission". This script only builds a LOCAL library for a laptop demo. backend/signs/ is
git-ignored; never upload these clips or put them on the public site.
Citation (show it wherever the clips are shown):
  Neidle, Thangali & Sclaroff (2012), "Challenges in Development of the American Sign Language Lexicon
  Video Dataset (ASLLVD) Corpus", LREC 2012; and Neidle et al. (2022), LREC 2022.
  http://www.bu.edu/asllrp/  http://dai.cs.rutgers.edu/  http://dai.cs.rutgers.edu/dai/s/signbank

Usage (needs openpyxl and ffmpeg):
  python import_asllvd.py <asllvd-metadata.xlsx> <backend/signs>  [--signer Liz] [--limit N]

For each sign by one signer it downloads the per-sign "separate" clip, keeps the front camera,
trims the resting frames, speeds it up 1.3x (citation-form signing is slow), and writes a small MP4.
"""
import concurrent.futures as cf
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request

CREDIT = ("Signs: American Sign Language Lexicon Video Dataset (ASLLVD), Boston University ASLLRP "
          "(Neidle, Thangali & Sclaroff 2012; Neidle et al. 2022), bu.edu/asllrp. "
          "Used for research and education; not redistributed.")


def entries(xlsx, signer):
    import openpyxl
    ws = openpyxl.load_workbook(xlsx, read_only=True).active
    rows = ws.iter_rows(values_only=True)
    next(rows)
    seen = {}
    for r in rows:
        main, who, link = r[3], r[2], r[11]
        if not main or main == '============' or who != signer or not link or 'HYPERLINK' not in str(link):
            continue
        m = re.search(r'"(http[^"]+)"', str(link))
        if m and str(main).strip() not in seen:
            seen[str(main).strip()] = m.group(1)
    return seen


def aliases(gloss):
    """ASLLVD glosses carry notation, e.g. (1h)GOOD/THANK-YOU, 1p-HELP:i, #JOB. Return plain keys."""
    out = {gloss}
    base = re.sub(r'^\([^)]*\)', '', gloss)           # (1h) (2h) (A) handshape notes
    base = re.sub(r'^(ns-|fs-|#)', '', base)           # name sign, fingerspelled, lexicalised
    base = re.sub(r'^\d?p-', '', base)                 # 1p-HELP agreement prefix
    base = re.sub(r':[a-z]+$', '', base)               # :i location index
    base = re.sub(r'_\d+$', '', base)                  # HOSPITAL_2 variant numbers
    for part in base.split('/'):
        part = part.strip()
        if part:
            out.add(part)
            out.add(part.replace('+', '-'))
    return {a.upper() for a in out if a}


def convert(gloss, url, clips_dir):
    safe = re.sub(r'[^A-Za-z0-9_-]+', '_', gloss).strip('_') or 'sign'
    name = f"{safe}_{hashlib.md5(gloss.encode()).hexdigest()[:6]}.mp4"
    out = os.path.join(clips_dir, name)
    if os.path.exists(out) and os.path.getsize(out) > 1000:
        return gloss, name
    with tempfile.NamedTemporaryFile(suffix='.mov') as tmp:
        with urllib.request.urlopen(url, timeout=60) as r:
            tmp.write(r.read())
        tmp.flush()
        n = int(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets',
                                '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', tmp.name],
                               capture_output=True, text=True, timeout=60).stdout.strip() or 0)
        trim = 46 if n > 120 else max(0, (n - 30) // 2) if n > 40 else 0
        vf = (f"select='between(n\\,{trim}\\,{max(trim + 10, n - trim)})',setpts=(N/15/TB)/1.3,"
              "crop=176:300:57:26,scale=240:-2,fps=24")
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp.name, '-vf', vf, '-an', '-c:v', 'libx264',
                        '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
                       check=True, timeout=120)
    return gloss, name


def main():
    xlsx, signs_dir = sys.argv[1], sys.argv[2]
    signer = sys.argv[sys.argv.index('--signer') + 1] if '--signer' in sys.argv else 'Liz'
    limit = int(sys.argv[sys.argv.index('--limit') + 1]) if '--limit' in sys.argv else None
    clips_dir = os.path.join(signs_dir, 'clips')
    os.makedirs(clips_dir, exist_ok=True)
    todo = list(entries(xlsx, signer).items())[:limit]
    print(f'{len(todo)} signs by {signer}', flush=True)
    signs, failed = {}, []
    with cf.ThreadPoolExecutor(max_workers=int(os.environ.get("WORKERS", "6"))) as pool:
        futs = {pool.submit(convert, g, u, clips_dir): g for g, u in todo}
        for i, f in enumerate(cf.as_completed(futs), 1):
            g = futs[f]
            try:
                gloss, name = f.result()
                for a in aliases(gloss):
                    signs.setdefault(a, {'file': f'clips/{name}', 'gloss': gloss})
                # single letters double as fingerspelling clips
                if len(gloss) == 1 and gloss.isalpha():
                    signs[f'FS-{gloss.upper()}'] = {'file': f'clips/{name}', 'gloss': gloss}
            except Exception as e:  # keep going; report at the end
                failed.append((g, str(e)[:120]))
            if i % 100 == 0:
                print(f'{i}/{len(todo)} done, {len(failed)} failed', flush=True)
                json.dump({'source': 'ASLLVD', 'signer': signer, 'credit': CREDIT, 'signs': signs},
                          open(os.path.join(signs_dir, 'library.json'), 'w'))
    json.dump({'source': 'ASLLVD', 'signer': signer, 'credit': CREDIT, 'signs': signs},
              open(os.path.join(signs_dir, 'library.json'), 'w'))
    print(f'done: {len(todo) - len(failed)} clips, {len(signs)} gloss keys, {len(failed)} failed', flush=True)
    for g, e in failed[:20]:
        print('  failed', g, e)


if __name__ == '__main__':
    main()
