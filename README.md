# Day One

Type any job, watch a trailer of a real day in it, then audition for it with a voice Screen Test.
Mascot: **Bolt**, a white robot with a glowing visor face (see `HANDOFF.md`).

Read `HANDOFF.md` first: it has the full plan, open decisions and the ordered task list.

## Run it now (demo mode, no accounts needed)
```
npm install
npm run dev
```
Demo mode uses built-in scripts and drawn frames for a few jobs, and the browser's voice. Chrome works best.

## How AWS is used (live mode)
| Step | Service |
|---|---|
| Orchestrate the trailer | **Step Functions** (Gemini script, then a Map state makes 6 scenes in parallel) |
| Translate title and narration | **Amazon Translate** |
| Paint each frame | **Bedrock Nova Canvas** |
| Check each frame is safe, retry if flagged | **Amazon Rekognition** |
| Narration and word timings for karaoke captions | **Amazon Polly** (audio + speech marks) |
| Hear the Screen Test answers | **Amazon Transcribe** streaming, from the browser via **Cognito** guest access |
| Job progress while rendering | **DynamoDB** (with TTL) |
| Store frames and audio | **S3** (presigned links) |
| API | **API Gateway (HTTP)** + **Lambda** |
| Host the site | **S3 + CloudFront** |

Gemini is the brain: script, interview questions, feedback. MongoDB Atlas caches finished trailers and powers the live "Now showing" board.

## Deploy
New here? Follow `SETUP.md` first; it lists every account and key step by step.

Prereqs: AWS CLI + SAM CLI, an AWS account in **us-east-1**, **Bedrock model access enabled for Nova Canvas**, a Gemini API key, an Atlas connection string (optional).
```
cd backend
sam build
sam deploy --guided --parameter-overrides GeminiApiKey=YOUR_KEY MongoUri="YOUR_ATLAS_URI" OnetApiKey=YOUR_ONET_KEY
```
Copy the outputs into `.env` (see `.env.example`):
```
VITE_API_URL=<ApiUrl>
VITE_COGNITO_POOL_ID=<IdentityPoolId>
VITE_AWS_REGION=us-east-1
```
Then:
```
npm run build
aws s3 sync dist s3://<SiteBucketName> --delete
```
Open `SiteUrl`. Point your GoDaddy domain at the CloudFront distribution (add the domain as an alternate name and attach a certificate from ACM).

## Not tested against live AWS yet
The backend was written without live accounts, so expect a first-deploy debugging pass. Check these first:
- Nova Canvas model ID and region (`NOVA_CANVAS_MODEL`, `BEDROCK_REGION`) and that model access is granted.
- Polly voices per language in `backend/src/scene.js` (Vietnamese has no Polly voice, so the browser voice is used).
- Gemini model name (`GEMINI_MODEL`, default `gemini-2.5-flash`).
- Browser Transcribe streaming: allow the mic, and confirm the Cognito guest role can call `transcribe:StartStreamTranscription`.

## Still to do
- **Grounding:** done in `backend/src/lib/grounding.js` (O*NET Web Services v2, which serves BLS wages). Needs the `OnetApiKey` parameter. Pay comes only from that data, never from Gemini. Not yet tested against the live O*NET API.
- Pre-render 6 to 8 popular jobs in each language so the demo never waits on generation.
- Review generated frames for stereotypes. The prompts ask for varied representation, but check outputs.

## Hackathon submission checklist
- **Best Overall:** 90-second demo video: ticket, trailer, credits, Screen Test.
- **Diversity/Equality** and **Future of Work:** one paragraph on the career-exposure and interview-coaching gap and who benefits.
- **AWS:** list every service above and what it does. Screenshot the Step Functions execution graph.
- **Gemini:** script, interview questions, feedback.
- **MongoDB Atlas:** trailer cache and Now showing.
- **Mascot:** Bolt (`src/cleo.js` geometry, `src/Cleo.jsx` animation, `src/Host.jsx` host lines).
- **GoDaddy:** register the domain, set it on the CloudFront distribution, put it in the submission.
- **Cursor + Grok Bot (SpaceXSI):** describe how both were used in the project description, then opt in on submission.
- **Audience Vote:** keep a laptop at the table where visitors type their own job.
