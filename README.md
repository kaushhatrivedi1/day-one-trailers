# Day One

**See the job before you choose it. Practice getting it.**

Live: **https://dayonetrailers.us** · Demo video: **https://youtu.be/8_yMIYmgr-s**

Type any job, or paste a real job posting, and watch a short movie-style trailer of a day in that job.
Bolt, the robot host, narrates it with word-by-word captions and signs it in American Sign Language.
The credits show the realistic path into the job. Then the **Screen Test**: a voice mock interview for
that job, scored on four skills, with your progress saved per job.

Built at SunHacks 2026 for students who can't aim for a job they've never seen, first-generation
students walking into interviews nobody coached them for, and Deaf and hard-of-hearing students.

## What it does

1. **Lobby.** Type a job title or paste a posting link. Gemini reads the posting and researches the company.
2. **You direct.** Pick a genre (action, documentary, comedy, feel-good) and dress Bolt for the part.
3. **The studio.** While Bolt runs to work in a mini game, AWS Step Functions makes the trailer.
4. **The trailer.** Six scenes of a day in the job, narrated by Bolt, captioned word by word, and signed in ASL.
5. **Credits.** The path into the job, what it costs, and what it pays (from O\*NET / BLS data when it exists).
6. **Screen Test.** Bolt reads your resume, asks questions out loud and in sign, and follows up on vague
   answers. Answer by voice (Amazon Transcribe) or by typing.
7. **Results.** A score on structure, specifics, relevance and ownership, the fix for each answer, and
   your progress across attempts at the same job.
8. **Welcome back.** Bolt remembers what you watched and practised, and suggests what to work on next.

Every screen works in English, Spanish, Hindi, Arabic (right to left) and Vietnamese.

## Bolt, the mascot

Bolt hosts every step: greets you, reads the posting, wears the outfit you pick, runs to work while the
trailer renders, acts out the job, lip-syncs on his visor, signs each line, interviews you, and welcomes
you back. A friendly robot instead of a stern panel takes the pressure off a first mock interview.

Code: `src/cleo.js` (geometry), `src/Cleo.jsx` (animation), `src/Host.jsx` (host lines), `src/SignPanel.jsx` (signing).
The file names are legacy; the character is Bolt.

## Accessibility and sign language

- Captions on every spoken line, highlighted word by word.
- Bolt signs trailer lines and interview questions using motion captured from a native ASL signer
  (the ASLLVD dataset, Boston University). Each line is glossed to ASL, and a blind back-translation
  check hides any line whose meaning doesn't survive; those lines stay captions-only.
- Signs are not yet reviewed by a Deaf signer. It is not an interpreter.
- The ASLLVD video clips are not in this repo and are never served; only the motion data needed to
  animate Bolt is packed into the backend (`backend/tools/pack-signs.sh`). See `backend/signs/README.md`.

## Privacy

- The camera preview stays in the browser; it is never recorded or uploaded.
- The resume is sent to the model to write questions and is never stored.
- Visitors are anonymous (a random id in the browser). **Forget me** in the lobby deletes their saved
  sessions and attempts, and switches to a new id so Bolt recalls nothing from before.

## How it's built

| Piece | What it does |
|---|---|
| **AWS Step Functions** | Runs the studio: script, then a Map state that makes the scenes in parallel, then finalize |
| **AWS Lambda + API Gateway (HTTP)** | The API: trailers, interview, sessions, speech, sign, memory, company preview |
| **Amazon Polly** | Bolt's voice, with word timings for the captions (no Polly voice for Vietnamese: browser voice or captions) |
| **Amazon Transcribe** | Streams spoken interview answers into the answer box, from the browser with Cognito guest access |
| **Amazon Translate** | Translates scene text |
| **Amazon Bedrock** | Nova Lite as a text backup for Gemini; a Stability image model for optional scene backgrounds |
| **Amazon Rekognition** | Checks generated images before they are shown |
| **DynamoDB** | Trailer job status while it renders |
| **S3 + CloudFront** | Hosts the site, audio and cached signs, on dayonetrailers.us |
| **Gemini API** | Researches the posting and company, writes the scenes, reads the resume, asks and scores the interview, glosses ASL |
| **MongoDB Atlas** | Trailer cache, the "Now showing" board, and practice sessions (job description, every attempt, per-skill scores) |
| **Supermemory** | Per-visitor memory of what they watched and practised, for Bolt's welcome-back line |
| **GoDaddy Registry** | The `.us` domain, dayonetrailers.us |

Frontend: Vite, React 19, GSAP. Backend: AWS SAM (`backend/template.yaml`), Node.js 22 Lambdas.

## Run it locally

Demo mode (no accounts, built-in sample scripts and the browser's voice):
```bash
npm install
npm run dev
```

With the local API (reads keys from `backend/.env.deploy`, which git ignores; see `SETUP.md`):
```bash
npm run dev:all
```

## Deploy

Step by step, with every account and key: see `SETUP.md`. In short (region us-east-1):
```bash
cd backend
./tools/pack-signs.sh
sam build
sam deploy --guided
```
Parameters: `GeminiApiKey`, `MongoUri`, `OnetApiKey`, `SupermemoryApiKey`, and optionally
`SiteDomain` + `SiteCertArn` (an ACM certificate in us-east-1) for a custom domain.

Then build the site with the stack outputs and upload it:
```bash
VITE_API_URL=<ApiUrl> VITE_COGNITO_POOL_ID=<IdentityPoolId> VITE_AWS_REGION=us-east-1 npm run build
aws s3 sync dist s3://<SiteBucketName> --delete --exclude 'signs/*'
aws cloudfront create-invalidation --distribution-id <DistributionId> --paths '/*'
```
Pushing to GitHub does not update the live site; deploy does.

For a custom domain, point it at the CloudFront distribution (an ALIAS or CNAME at your DNS provider).

## Demo video

Watch the walkthrough (1:47): **https://youtu.be/8_yMIYmgr-s**
