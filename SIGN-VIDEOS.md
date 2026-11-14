# Sign language videos: recording plan

Bolt's own hand animation only covers five signs and fingerspelling. Interview questions need real
American Sign Language (ASL), so a person records them and the app plays the clip.

## 1. Who records

A fluent Deaf signer, or a certified ASL interpreter, should record these clips, ideally with a Deaf
reviewer approving the final takes. Pay them for their time and credit them by name (with permission)
in the app and the Devpost submission.

Places to ask: ASU's ASL and Deaf studies instructors or students, the hackathon's organisers, or a
local Deaf community center. Do not record the clips yourself unless you are fluent.

## 2. What to sign

The app plays a clip when a file with this exact name exists in `public/signs/`.

| File | What the question says | Notes for the signer |
|---|---|---|
| `about.mp4` | "Tell me about yourself, and why you want to be [job]." | The job changes every time, so sign "...and why you want **this job**." The written question on screen shows the job name. |
| `figure-out.mp4` | "Tell me about a time you had to figure something out without much help." | |
| `first-day.mp4` | "It is your first day and you do not know how to do something. What do you do?" | Demo mode only. With the live backend, question 3 is written for each job and has no clip. |

Sign the meaning naturally in ASL, not English word order. Warm, friendly, like a kind interviewer.

Optional, if the signer has time (not wired in yet):

| File | Line |
|---|---|
| `host-intro.mp4` | "Hi! Here's a day in this job." |
| `host-ready.mp4` | "Good job. Ready for your Screen Test?" |
| `host-thanks.mp4` | "Good job. Thank you!" |

## 3. How to film (a phone is fine)

- **Framing:** portrait (vertical), from the top of the head to the waist, with room for the hands on both sides. Elbows and hands must never leave the frame.
- **Background:** plain and solid, not white; dark blue, grey or green works. No pattern behind the hands.
- **Clothing:** solid colour that contrasts with skin tone. No busy prints, no big jewellery.
- **Light:** bright and even on the face and hands, from the front. No window behind the signer.
- **Timing:** start with hands resting for about one second, sign once, end with hands resting for one second.
- **Camera:** on a tripod or propped up, at chest height, steady. 30 or 60 fps.
- **Sound:** not needed; the app plays clips muted.

## 4. File format

- MP4, H.264 video, no audio track needed.
- About 720 x 900 pixels (portrait, 4:5). The app crops to 4:5.
- Under 5 MB each. Most phones can export this; or run:
  ```bash
  ffmpeg -i raw.mov -vf "crop=ih*4/5:ih,scale=720:900" -an -c:v libx264 -crf 26 -movflags +faststart about.mp4
  ```
- Put the files in `public/signs/` and reload the app. Turn on "Sign language" and open the Screen Test.

## 5. Before the demo

- [ ] A Deaf signer or reviewer has approved each clip.
- [ ] The signer has agreed, in writing, to the clips being used and shown publicly.
- [ ] The signer is credited (in-app credits and Devpost), or chose to stay anonymous.
- [ ] Each clip plays on desktop and on a phone.
