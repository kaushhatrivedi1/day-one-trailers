"""Build the local sign library from ASLLVD's ORIGINAL session recordings (clean video, real timing).

Same license limits as import_asllvd.py: laptop-only, research and education use, never redistributed;
backend/signs/ is git-ignored. Credit ASLLVD wherever the clips are shown.

Each session scene (camera 1, 640x480, 60 fps QuickTime) holds many signs. For one signer this:
downloads a scene, cuts every sign at the dataset's own start/end frames (plus a little padding),
crops to a centred upper-body frame (which also removes the burned-in frame counter), writes a
small MP4, then deletes the scene file. Several scenes run in parallel.

Usage: python import_asllvd_sessions.py <metadata.xlsx> <out_dir> [--signer Liz] [--limit N] [--workers 8]
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
from collections import defaultdict

URL = 'http://csr.bu.edu/ftp/asl/asllvd/asl-data2/quicktime/{session}/scene{scene}-camera1.mov'
CREDIT = 'Signs: ASLLVD, Boston University ASLLRP (Neidle et al.). Research and education use.'
PAD = 6  # frames of lead-in and lead-out at 60 fps


def arg(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def tokens(xlsx, signer):
    import openpyxl
    ws = openpyxl.load_workbook(xlsx, read_only=True).active
    rows = ws.iter_rows(values_only=True)
    next(rows)
    first = {}
    for r in rows:
        main, who, session, scene, start, end = r[3], r[2], r[12], r[13], r[14], r[15]
        if not main or main == '============' or who != signer or session is None or start is None:
            continue
        g = str(main).strip()
        if g not in first:  # one token per gloss
            first[g] = (str(session).strip(), int(scene), int(start), int(end))
    by_scene = defaultdict(list)
    for g, (session, scene, start, end) in first.items():
        by_scene[(session, scene)].append((g, start, end))
    return by_scene


def aliases(gloss):
    out = {gloss}
    base = re.sub(r'^\([^)]*\)', '', gloss)
    base = re.sub(r'^(ns-|fs-|#)', '', base)
    base = re.sub(r'^\d?p-', '', base)
    base = re.sub(r':[a-z]+$', '', base)
    base = re.sub(r'_\d+$', '', base)
    for part in base.split('/'):
        part = part.strip()
        if part:
            out.add(part)
            out.add(part.replace('+', '-'))
    return {a.upper() for a in out if a}


def do_scene(key, signs, clips_dir):
    session, scene = key
    done = []
    with tempfile.NamedTemporaryFile(suffix='.mov') as tmp:
        with urllib.request.urlopen(URL.format(session=session, scene=scene), timeout=120) as r:
            while True:
                chunk = r.read(1 << 20)
                if not chunk:
                    break
                tmp.write(chunk)
        tmp.flush()
        for g, start, end in signs:
            name = re.sub(r'[^A-Za-z0-9_-]+', '_', g).strip('_') + '_' + hashlib.md5(g.encode()).hexdigest()[:6] + '.mp4'
            out = os.path.join(clips_dir, name)
            if not (os.path.exists(out) and os.path.getsize(out) > 500):
                s, e = max(0, start - PAD), end + PAD
                # fast seek near the sign, then select exact frames; centred upper-body crop
                seek = max(0, s / 60 - 1)
                first = s - int(seek * 60)
                # 2010 sessions were filmed closer, so they need a wider, higher crop
                crop = 'iw*0.58:ih*0.92:(iw-iw*0.58)/2:0' if session.startswith('ASL_2010') else 'iw*0.47:ih*0.75:(iw-iw*0.47)/2:ih*0.083'
                vf = (f"select='between(n\\,{first}\\,{first + (e - s)})',setpts=N/60/TB,"
                      f"crop={crop},scale=240:-2,fps=30")
                subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-ss', f'{seek:.3f}', '-i', tmp.name, '-vf', vf,
                                '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p',
                                '-movflags', '+faststart', out], check=True, timeout=120)
            done.append((g, name))
    return done


def main():
    xlsx, out_dir = sys.argv[1], sys.argv[2]
    signer, limit, workers = arg('--signer', 'Liz'), arg('--limit', None), int(arg('--workers', 8))
    clips_dir = os.path.join(out_dir, 'clips')
    os.makedirs(clips_dir, exist_ok=True)
    scenes = list(tokens(xlsx, signer).items())[: int(limit) if limit else None]
    total = sum(len(v) for _, v in scenes)
    print(f'{total} signs in {len(scenes)} scenes by {signer}', flush=True)
    signs, failed, n = {}, [], 0

    def save():
        json.dump({'source': 'ASLLVD (original session video)', 'signer': signer, 'credit': CREDIT, 'signs': signs},
                  open(os.path.join(out_dir, 'library.json'), 'w'))

    with cf.ThreadPoolExecutor(max_workers=workers) as pool:
        futs = {pool.submit(do_scene, k, v, clips_dir): k for k, v in scenes}
        for f in cf.as_completed(futs):
            n += 1
            try:
                for g, name in f.result():
                    for a in aliases(g):
                        signs.setdefault(a, {'file': f'clips/{name}', 'gloss': g})
                    if len(g) == 1 and g.isalpha():
                        signs[f'FS-{g.upper()}'] = {'file': f'clips/{name}', 'gloss': g}
            except Exception as e:
                failed.append((futs[f], str(e)[:120]))
            if n % 20 == 0:
                print(f'{n}/{len(scenes)} scenes, {len(signs)} gloss keys, {len(failed)} failed', flush=True)
                save()
    save()
    print(f'done: {len(scenes) - len(failed)} scenes, {len(signs)} gloss keys, {len(failed)} failed', flush=True)
    for k, e in failed[:20]:
        print('  failed', k, e)


if __name__ == '__main__':
    main()
