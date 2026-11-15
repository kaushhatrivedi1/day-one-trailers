"""Turn sign clips into motion data Bolt can play (numbers only, no video).

For each frame: shoulder-relative wrist positions (unit = shoulder width, y down, x as seen on screen),
per-finger extension (thumb, index, middle, ring, pinky; 0 = curled, 1 = straight) and hand tilt.
Uses MediaPipe Tasks (HandLandmarker + PoseLandmarker). Motion derived from ASLLVD clips is subject to
the same laptop-only, research-and-education terms; backend/signs/ is git-ignored.

Usage: python extract_motion.py <clips_dir> <out_json> <models_dir> [--only NAME ...] [--workers N]
"""
import json
import math
import os
import sys
import concurrent.futures as cf

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import (HandLandmarker, HandLandmarkerOptions, PoseLandmarker,
                                           PoseLandmarkerOptions, RunningMode)

TIPS = [4, 8, 12, 16, 20]
MCP = [2, 5, 9, 13, 17]


def finger_ext(h):
    w = np.array([h[0].x, h[0].y])
    out = []
    for tip, base in zip(TIPS, MCP):
        t = np.array([h[tip].x, h[tip].y])
        b = np.array([h[base].x, h[base].y])
        palm = np.linalg.norm(np.array([h[9].x, h[9].y]) - w) + 1e-6
        # straight finger: tip far beyond its knuckle; curled: tip back near the palm
        reach = (np.linalg.norm(t - w) - np.linalg.norm(b - w)) / palm
        out.append(float(np.clip((reach + 0.1) / 0.9, 0, 1)))
    return [round(v, 2) for v in out]


def tilt(h):
    dx, dy = h[9].x - h[0].x, h[9].y - h[0].y
    return round(math.degrees(math.atan2(dx, -dy)), 1)  # 0 = fingers up


# One pair of models per worker process, reused for every clip (loading them is the slow part).
# VIDEO mode needs increasing timestamps per model, so each clip continues from the last one.
_M = {}


def _models(models):
    if not _M:
        _M['hand'] = HandLandmarker.create_from_options(HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=os.path.join(models, 'hand_landmarker.task')),
            running_mode=RunningMode.VIDEO, num_hands=2, min_hand_detection_confidence=0.3, min_tracking_confidence=0.3))
        _M['pose'] = PoseLandmarker.create_from_options(PoseLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=os.path.join(models, 'pose_landmarker_lite.task')),
            running_mode=RunningMode.VIDEO))
        _M['clock'] = 0
    return _M


def extract(path, models):
    m = _models(models)
    hand, pose = m['hand'], m['pose']
    m['clock'] += 10_000  # gap between clips so tracking restarts cleanly
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    frames, i, seen, ts = [], 0, 0, 0
    while True:
        ok, img = cap.read()
        if not ok:
            break
        img = cv2.resize(img, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)  # small clips: upscale helps tracking
        im = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        ts = int(i * 1000 / fps)
        p = pose.detect_for_video(im, m['clock'] + ts)
        hs = hand.detect_for_video(im, m['clock'] + ts)
        i += 1
        if not p.pose_landmarks:
            continue
        L = p.pose_landmarks[0]
        sa, sb = np.array([L[11].x, L[11].y]), np.array([L[12].x, L[12].y])
        mid, width = (sa + sb) / 2, np.linalg.norm(sa - sb) + 1e-6
        norm = lambda x, y: [round(float((x - mid[0]) / width), 3), round(float((y - mid[1]) / width), 3)]
        # wrists from pose, by screen side: 'a' = screen-left, 'b' = screen-right
        wr = sorted([(L[15].x, L[15].y), (L[16].x, L[16].y)])
        f = {'t': round(ts / 1000, 3), 'a': {'w': norm(*wr[0])}, 'b': {'w': norm(*wr[1])}}
        for h in hs.hand_landmarks or []:
            side = 'a' if h[0].x < mid[0] else 'b'
            f[side].update({'f': finger_ext(h), 'r': tilt(h)})
            seen += 1
        frames.append(f)
    cap.release()
    m['clock'] += ts
    return {'fps': fps, 'frames': frames, 'handRate': round(seen / max(1, len(frames)), 2)}


def main():
    clips, out, models = sys.argv[1], sys.argv[2], sys.argv[3]
    only = sys.argv[sys.argv.index('--only') + 1:] if '--only' in sys.argv else None
    workers = int(sys.argv[sys.argv.index('--workers') + 1]) if '--workers' in sys.argv else 6
    names = [n for n in sorted(os.listdir(clips)) if n.endswith('.mp4') and (not only or any(n.startswith(o + '_') for o in only))]
    data = json.load(open(out)) if os.path.exists(out) else {}
    todo = [n for n in names if n not in data]
    print(f'{len(todo)} clips to process ({len(data)} already done)', flush=True)
    with cf.ProcessPoolExecutor(max_workers=workers) as pool:
        futs = {pool.submit(extract, os.path.join(clips, n), models): n for n in todo}
        for k, fu in enumerate(cf.as_completed(futs), 1):
            try:
                data[futs[fu]] = fu.result()
            except Exception as e:
                print('failed', futs[fu], str(e)[:100], flush=True)
            if k % 100 == 0:
                json.dump(data, open(out, 'w'), separators=(',', ':'))
                print(f'{k}/{len(todo)}', flush=True)
    json.dump(data, open(out, 'w'), separators=(',', ':'))
    print('done', len(data), flush=True)


if __name__ == '__main__':
    main()
