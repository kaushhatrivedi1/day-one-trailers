# Day One: demo video script (1:55)

SunHacks limit: **2 minutes maximum**, uploaded to YouTube. This cut runs about 1:55.
Record the live site: **https://dayonetrailers.us** in Chrome, full screen, sound on, **Sign language: on**.
**VO** = your voice-over (about 270 words, a relaxed pace). *Italics* = what to do on screen.

## Before you record (10 minutes)

1. **Do one full dry run** with the job you'll demo (e.g. `Software developer`), so you know the flow. Each trailer takes about 80 seconds to make; you'll cut that wait in editing. Its signing is ready by the time it plays.
2. **Click once on the lobby** before recording: browsers block sound until you interact with the page.
3. Have a resume PDF on your desktop, and two answers ready: one vague ("I just like computers I guess") and one strong (a specific project, what you did, the result).
4. Close other tabs and notifications (Do Not Disturb), and set the browser zoom to 100%.
5. Record with **Cmd+Shift+5 → Record Entire Screen**, Options → Microphone: your mic. Or record the screen only and add the voice-over afterwards (easier to get right).

---

## 0:00–0:12 · The problem
*Lobby: curtains, spotlights, Bolt waving. Scroll once to show "Now showing", then back up.*

**VO:** "Most kids can't aim for a job they've never seen. And first-generation students walk into interviews nobody coached them for. Day One shows you the job, then helps you practise getting it."

## 0:12–0:25 · Type a job, you direct
*Type the job and press **Roll it**. On the director screen, pick **Action** and dress Bolt in the **suit**, then **Action!***

**VO:** "Type any job, or paste a real job posting. You're the director: pick the genre and Bolt's outfit."

## 0:25–0:35 · The studio (cut the wait)
*Show the making screen for a few seconds: the strip ticking Research → Script → Voice → Sign → Cut, and Bolt running to work. Jump once or twice. **Cut** to "It's a wrap!".*

**VO:** "Behind the scenes, AWS Step Functions runs the studio: Gemini writes the script, Amazon Polly voices it, and every line is translated into American Sign Language."

## 0:35–1:00 · The trailer
*Cold open: "A DAY AS A SOFTWARE DEVELOPER", Bolt walks on, says hi and signs it. Let one or two scenes play: captions word by word, Bolt acting in the office, the signing window in the corner. Point at the signing window.*

**VO:** "Then you watch a day in that job, narrated by Bolt, with captions on every word. And Bolt signs it, using motion captured from a native ASL signer. A blind back-translation check hides any line whose meaning doesn't survive."

## 1:00–1:12 · Five languages
*Click **Skip to credits**, go back to the lobby, switch the ticket to **ES** or **ع** (Arabic, which flips right-to-left), show the screen in that language for two seconds.*

**VO:** "Every screen works in English, Spanish, Hindi, Arabic and Vietnamese, and Bolt narrates in your language."

*(Edit tip: if switching back costs time, record this as a separate clip and cut it in.)*

## 1:12–1:22 · The real path
*Credits board: pay counts up, the path draws in, point at the pay range bar.*

**VO:** "The credits show the realistic path, cost and pay, from official Bureau of Labor Statistics data. Nothing is made up."

## 1:22–1:47 · The Screen Test
*Click **Start the Screen Test**, drop the resume PDF, show **What Bolt picked up**, then **Join the call**. Answer the first question vaguely. Bolt reacts 🤔 and the next one is tagged **Follow-up**. Answer that one well: 🔥 and a thumbs-up. End the call: score dial, badges, flip one answer card.*

**VO:** "Then you audition. Bolt reads your resume, asks each question out loud, in captions and in sign language. Give a vague answer and he follows up, like a real interviewer. At the end you get a score, badges and the one fix for each answer."

## 1:47–1:55 · Memory and close
*Back to the lobby: Bolt's bubble says "Welcome back…" with what you practised.*

**VO:** "Come back tomorrow and Bolt remembers what you need to practise. See the job. Practise getting it. That's Day One."

*End on Bolt waving.*

---

## Editing (iMovie, about 20 minutes)

- Cut the trailer-generation wait (0:25–0:35) and any loading pauses. Keep the total **under 2:00**.
- Keep the app's own sound (Bolt's voice) under your voice-over at a lower volume, or pause your VO while Bolt speaks in the trailer.
- Export 1080p. Upload to YouTube as **Unlisted** or **Public** (organisers want a playlist), title it e.g. "Day One · SunHacks 2026 demo", and paste the link into Devpost.

## Claims to keep accurate

- **Sign language:** "motion captured from a native signer" and "checked for meaning", never "fluent ASL" or "interpreter". It isn't reviewed by a Deaf signer yet. Some lines show captions only; that is the check working.
- **Voice:** the live site uses **Amazon Polly** (ElevenLabs is out of credits). Don't claim ElevenLabs. Vietnamese has no Polly voice, so it uses the browser's voice (or captions); demo Spanish or Arabic instead.
- **Camera:** it stays in the browser and is never recorded or sent.
- **Logos:** from the company's own site; the credits say the trailer is unofficial. Don't imply endorsement.
- **AWS:** fine to claim. You're recording the deployed site: Step Functions, Lambda, Polly, Bedrock (Nova backup), S3, CloudFront, DynamoDB, Cognito.
