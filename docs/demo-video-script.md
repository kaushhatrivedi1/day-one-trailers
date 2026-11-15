# Day One: demo video script (about 2 minutes)

Record on your laptop in Chrome, full screen, sound on, **Sign language: on**.
Lines marked **VO** are your voice-over; *italics* are what to do on screen.

## Before you record

1. Restart the app so it runs the latest code: `npm run dev:all`, then open http://localhost:5173.
2. Start the API with the browser voice, so it doesn't try ElevenLabs: `VOICE=browser npm run dev:all` (it also switches by itself after the first failed call).
3. Do one full dry run with the same job link. The company research is cached for the session, so the take you record starts faster.
4. Use a public job link that reads well. Greenhouse or Lever postings work; LinkedIn and Indeed links do not. The Airbnb and Discord links used in testing are good choices.
5. Have one short practice answer ready to type: one weak, one strong.
6. Plan to cut the waits in editing (trailer generation takes about 20–40 seconds).

---

## 0:00–0:12 · The problem

*Lobby on screen: curtains, sweeping spotlights, Bolt walks on stage and waves. Scroll once to show the "Now showing" posters rising in, then back up.*

**VO:** "Most kids can't aim for a job they've never seen, and first-generation students walk into interviews nobody coached them for. Day One shows you the job, then lets you practise getting it."

## 0:12–0:30 · Paste a real job posting

*Paste the job link into the ticket box. It switches to **Job link**, the company card slides out of the ticket and fills in with the logo, role and mission. Bolt thinks, then gives a thumbs-up ("Ooh, a real posting!").*

**VO:** "Paste any real job posting. Bolt reads it, then researches the company itself: what it actually does, its mission and its values, from public sources it lists in the credits."

*Pick a language on the ticket (optional: show Spanish or Hindi), then click **Roll it**.*

## 0:30–0:45 · You direct, then play

*Making screen: pick a genre (try **Action**) and dress Bolt (the **suit** reads well), then hit **Action!** The corner strip starts ticking Research → Script → Voice → Sign → Cut. Bolt runs to work in the mini game: jump a few obstacles, grab coins. The office rolls in when the trailer is ready: "It's a wrap!"*

**VO:** "You direct it: pick the genre and Bolt's outfit. While you play, Gemini, with Amazon Nova on Bedrock as a backup, writes the script in that genre. Bolt speaks in five languages, and every line is translated into American Sign Language and checked."

*(Cut the wait here in editing.)*

## 0:45–1:10 · The trailer

*Cold open plays: the logo card, "A DAY AT …"; the title lifts and Bolt walks on in his outfit, says hi and signs it. Then one or two scenes: Bolt walks, types, points and reacts; coworkers walk past; a message pops up on his monitor; music in the genre you picked; captions word by word; Bolt signing in the corner window.*

**VO:** "Then the trailer: a day in that exact job at that company, narrated by Bolt in the first person, with captions on every word."

*Point the cursor at the signing window.*

**VO:** "And Bolt signs it. His motion is captured from a native ASL signer, and a blind back-translation check hides any line whose meaning doesn't survive. We say plainly that it's not reviewed by a Deaf signer yet."

*Skip to the end card, then the credits board.*

## 1:10–1:25 · The real path

*Rolling credits on black, then the board: the pay counts up, the path draws in to a gold star; point at the pay range bar (for a featured job) or the company card.*

**VO:** "The credits show the realistic path, the cost and the pay, using official Bureau of Labor Statistics data where it exists. Nothing is made up; when there's no data, it says so."

## 1:25–1:50 · The Screen Test

*Click **Start the Screen Test**. Drop a resume PDF on the box: it scans, and **What Bolt picked up** fills with skills, projects and gaps. Click **Join the call**. Optional: turn on your camera (it stays on the laptop). Answer the first question vaguely, e.g. "I just like it I guess."*

**VO:** "Then you audition, on a video call. Bolt reads your resume and the posting, asks every question out loud, in captions and in sign language, and adapts to every answer."

*Bolt reacts (🤔, "needs a real example"); the next question is tagged **Follow-up**. Answer it well: 🔥, a nod and a thumbs-up.*

**VO:** "Vague answer? He follows up, like a real interviewer would. Strong answer? He moves on to the next skill the job needs."

*End the call. The results screen: the score dial fills, rank and XP, confetti, badges flip in (Comeback kid for the follow-up), then tap an answer card to flip it to Bolt's one fix, and the practice quests.*

## 1:50–2:05 · Memory and close

*Back to the lobby. Bolt's bubble greets you with what you practised last time.*

**VO:** "Come back tomorrow, and Bolt remembers what you need to practise, thanks to Supermemory. See the job. Practise getting it. That's Day One."

*End on the lobby with Bolt waving.*

---

## Short cut (about 60 seconds)

Use 0:12–0:30 (paste a link), 0:45–1:10 (trailer with signing), and 1:25–1:50 (the follow-up question), with this voice-over:

"Paste any real job posting. Bolt researches the company and makes you a trailer of a day in that job, in your language, with captions and sign language. Then he interviews you on your own resume and follows up when your answer is vague. See the job. Practise getting it."

## Claims to keep accurate in the video

- **Sign language:** "motion captured from a native signer", **not** "fluent ASL" or "an interpreter". It's laptop-only, using Boston University's ASLLVD data for research and education, which is why the public site has no signing.
- **Voice:** ElevenLabs is out of credits, so Bolt uses the browser's built-in voice. Don't claim ElevenLabs in the video; say "Bolt speaks in five languages". Record in Chrome on macOS, which has good built-in voices (System Settings → Accessibility → Spoken Content lets you download better ones, e.g. the "Premium" or "Enhanced" English voices).
- **Camera:** say it stays on the laptop and is never recorded or sent, which is true: it is only shown locally.
- **Logos:** they come from the company's own website, and the credits say the trailer is unofficial. Don't imply endorsement.
- **AWS:** only say the trailer runs on AWS if you recorded the deployed version. Locally, AWS is used for Bedrock (Nova) as the backup model.
