# Day One: demo video script (about 2 minutes)

Record on your laptop in Chrome, full screen, sound on, **Sign language: on**.
Lines marked **VO** are your voice-over; *italics* are what to do on screen.

## Before you record

1. Restart the app so it runs the latest code: `npm run dev:all`, then open http://localhost:5173.
2. Do one full dry run with the same job link. The company research is cached for the session, so the take you record starts faster.
3. Use a public job link that reads well. Greenhouse or Lever postings work; LinkedIn and Indeed links do not. The Airbnb and Discord links used in testing are good choices.
4. Have one short practice answer ready to type: one weak, one strong.
5. Plan to cut the waits in editing (trailer generation takes about 20–40 seconds).

---

## 0:00–0:12 · The problem

*Lobby on screen. Move the cursor so the spotlight follows it; hover a "Now showing" poster so it tilts.*

**VO:** "Most kids can't aim for a job they've never seen, and first-generation students walk into interviews nobody coached them for. Day One shows you the job, then lets you practise getting it."

## 0:12–0:30 · Paste a real job posting

*Click the **Job posting** tab. Paste the job link. The company card shimmers, then fills in with the logo, role and mission. Bolt thinks, then gives a thumbs-up.*

**VO:** "Paste any real job posting. Bolt reads it, then researches the company itself: what it actually does, its mission and its values, from public sources it lists in the credits."

*Pick a language from the menu (optional: show Spanish or Hindi), then click **Roll the trailer**.*

## 0:30–0:45 · The editing suite

*Making screen: the production log ticks through Research → Script → Voice → ASL; the film strip frames come alive one by one.*

**VO:** "While you wait, you watch it being made. Gemini, with Amazon Nova on Bedrock as a backup, writes the script from the posting. ElevenLabs records the voice in five languages, and every line is translated into American Sign Language and checked."

*(Cut the wait here in editing.)*

## 0:45–1:10 · The trailer

*Cold open plays: the logo card, "A DAY AT …", "Starring Bolt". Then one or two scenes with the lower-third card, captions highlighting word by word, and Bolt signing in the corner window.*

**VO:** "Then the trailer: a day in that exact job at that company, narrated by Bolt in the first person, with captions on every word."

*Point the cursor at the signing window.*

**VO:** "And Bolt signs it. His motion is captured from a native ASL signer, and a blind back-translation check hides any line whose meaning doesn't survive. We say plainly that it's not reviewed by a Deaf signer yet."

*Skip to the end card, then the credits board.*

## 1:10–1:25 · The real path

*Credits board: the stepper draws in; point at the pay range bar (for a featured job) or the company card.*

**VO:** "The credits show the realistic path, the cost and the pay, using official Bureau of Labor Statistics data where it exists. Nothing is made up; when there's no data, it says so."

## 1:25–1:50 · The Screen Test

*Click **Start the Screen Test**. Paste or upload a resume. Answer the first question vaguely, e.g. "I just like it I guess."*

**VO:** "Then you audition. Bolt reads your resume and the posting and interviews you, adapting to every answer."

*Bolt's reaction bubble appears with a low score; the next question is tagged **Follow-up**.*

**VO:** "Vague answer? He follows up, like a real interviewer would. Strong answer? He moves on to the next skill the job needs."

*Finish, show the report: the score dial fills, then a quote of what you said and one fix.*

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
- **Logos:** they come from the company's own website, and the credits say the trailer is unofficial. Don't imply endorsement.
- **AWS:** only say the trailer runs on AWS if you recorded the deployed version. Locally, AWS is used for Bedrock (Nova) as the backup model.
