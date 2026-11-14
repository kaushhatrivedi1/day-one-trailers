# Day One: setup, step by step

Do these in order. Parts 1 to 5 are needed to put the real app online. Part 6 is for extra prize tracks.
Never paste keys into chat or commit them. They go only in `backend/.env.deploy` (git ignores it).

---

## Part 1. AWS account (about 10 minutes)

1. Sign in at https://console.aws.amazon.com. In the top right, set the region to **US East (N. Virginia) us-east-1**.
2. Create an access key for the CLI:
   - Open **IAM** → **Users** → your user (or **Create user**, give it `AdministratorAccess` for the hackathon).
   - **Security credentials** → **Create access key** → choose **Command Line Interface (CLI)** → copy both values.
3. On your Mac, in Terminal:
   ```bash
   aws configure
   ```
   Paste the Access Key ID and Secret, region `us-east-1`, output `json`.
4. Check it works:
   ```bash
   aws sts get-caller-identity
   ```
   You should see your account number, not an error.
5. If you have AWS credits from the hackathon, redeem them at **Billing** → **Credits**.

## Part 2. Turn on the image model (2 minutes)

1. In the AWS console, open **Amazon Bedrock** (region us-east-1).
2. Left menu → **Model access** → **Modify model access**.
3. Tick **Amazon → Nova Canvas** → **Next** → **Submit**.
4. Wait until it says **Access granted**.

## Part 3. Gemini key (2 minutes)

1. Go to https://aistudio.google.com and sign in with Google.
2. **Get API key** → **Create API key** → copy it.

## Part 4. MongoDB Atlas (about 10 minutes)

1. Sign up at https://cloud.mongodb.com and create a **free (M0) cluster**, provider AWS, region us-east-1.
2. **Database Access** → **Add new database user** → username and a generated password → role *Read and write to any database*.
3. **Network Access** → **Add IP address** → **Allow access from anywhere** (`0.0.0.0/0`). Lambda has no fixed IP.
4. **Database** → **Connect** → **Drivers** → copy the connection string. Replace `<password>` with the user's password.

## Part 5. O*NET key for real job data (5 minutes, free)

This fills every job's credits with real tasks, education and pay (BLS wages).

1. Register at https://services.onetcenter.org/developer/signup
2. After confirming your email, open **My Account** and create an **API key**.

---

## Put the keys in one file

Create `backend/.env.deploy`:

```
GEMINI_API_KEY=paste-here
MONGO_URI=mongodb+srv://user:password@cluster.../?retryWrites=true&w=majority
ONET_API_KEY=paste-here
```

Then run the deploy (`sam build` and `sam deploy`), fill in `.env`, upload the site and test a trailer.

What gets created in your AWS account: Step Functions, Lambda, DynamoDB, S3, CloudFront, API Gateway, Cognito, and calls to Bedrock, Polly, Translate, Rekognition and Transcribe. Expect a few dollars at hackathon usage; Nova Canvas images are the main cost.

---

## Part 6. Extra prize tracks (later)

| Step | Where | What to do |
|---|---|---|
| ElevenLabs voice | https://elevenlabs.io | Create an account, apply the MLH promo code, copy the API key into `backend/.env.deploy` as `ELEVENLABS_API_KEY=` |
| Memory: pick ONE | https://supermemory.ai or Backboard (MLH) | Create an account, copy the key as `SUPERMEMORY_API_KEY=` or `BACKBOARD_API_KEY=` |
| Domain: pick ONE | GoDaddy Registry or .Tech (MLH codes) | Register the name and attach it to CloudFront with an ACM certificate |
| Cursor + Grok Bot | https://cursor.com | Install Cursor, apply the MLH promo code, enable Grok Bot. Build one bounded piece there (e.g. the pre-render script) |
| GitHub | https://github.com/new | Create an empty repo named `day-one` and push to it |
| Devpost | SunHacks page on devpost.com | Join the hackathon, create the submission, tick the tracks you qualify for |

## Decisions only you can make

1. Memory sponsor: Supermemory or Backboard.
2. Domain: GoDaddy Registry or .Tech.
3. Scripts: all Gemini, or a Bedrock model for scripts plus Gemini for scoring.
4. Mascot: keep blue and white, or add ASU maroon and gold. Keep the name "Bolt"?
