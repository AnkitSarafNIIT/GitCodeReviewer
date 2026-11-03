# git-code-reviewer

A Node.js / Express webhook receiver that listens for GitHub `push` events and stores every commit's metadata in MongoDB. Designed as the data-ingestion layer for an automated code-review pipeline.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running the Service](#running-the-service)
- [Exposing Locally with ngrok](#exposing-locally-with-ngrok)
- [GitHub Webhook Configuration](#github-webhook-configuration)
- [API Reference](#api-reference)
- [Testing with the Local Script](#testing-with-the-local-script)
- [Troubleshooting](#troubleshooting)

---

## How It Works

```
Developer --push--> GitHub
                      |
          POST /api/webhook (with X-Hub-Signature-256)
                      |
            Verify HMAC-SHA256 signature
                      |
           Is it a "push" event? ──No──> 200 ignored
                      |Yes
           Duplicate delivery?  ──Yes──> 200 skipped
                      |No
           Branch in REVIEW_BRANCHES? ──No──> 200 ignored
                      |Yes
           Loop commits[] → upsert each in MongoDB
                      |
          Record delivery in WebhookDelivery
                      |
               200 { received: true, commitsSaved: N }
```

1. GitHub signs every webhook request with `HMAC-SHA256(secret, rawBody)` and puts the digest in `X-Hub-Signature-256`.
2. The `verifyGithubSignature` middleware recomputes the digest from the raw request bytes and rejects mismatches with `401`.
3. The webhook controller delegates all business logic to `webhook.service`, which filters branches, maps commits to the Mongoose schema, and calls `commit.service` for the upsert.
4. A `WebhookDelivery` document is written for every accepted delivery, giving idempotency and a 30-day audit trail.

---

## Project Structure

```
git-code-reviewer/
├── src/
│   ├── config/
│   │   ├── env.js              Loads .env, validates required vars, exports typed config
│   │   └── db.js               Mongoose connect / disconnect helpers
│   ├── models/
│   │   ├── Commit.js           Commit schema + compound unique index
│   │   └── WebhookDelivery.js  Delivery audit log with 30-day TTL
│   ├── services/
│   │   ├── signature.service.js  HMAC-SHA256 verification logic
│   │   ├── commit.service.js     MongoDB upsert / query for commits
│   │   └── webhook.service.js    Push-event orchestration + branch filtering
│   ├── controllers/
│   │   ├── webhook.controller.js HTTP in → service call → HTTP out
│   │   └── health.controller.js  Returns Mongo connection state
│   ├── routes/
│   │   ├── index.js            Combines all routes under /api
│   │   ├── webhook.routes.js   POST /api/webhook
│   │   └── health.routes.js    GET  /api/health
│   ├── middleware/
│   │   ├── verifyGithubSignature.js  Rejects invalid signatures (401)
│   │   ├── errorHandler.js           Centralised error → JSON response
│   │   └── notFound.js               Catch-all 404
│   ├── app.js                  Express setup (helmet, morgan, routes)
│   └── server.js               DB connect → listen → graceful shutdown
├── scripts/
│   └── send-test-webhook.js    Signs & POSTs sample-payload.json locally
├── sample-payload.json         Realistic GitHub push payload for testing
├── .env.example                Committed placeholder values
├── .env                        Local secrets — never commit this file
├── .gitignore
├── package.json
└── README.md
```

**Dependency flow (strictly one-way):**
`routes → controllers → services → models`

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Node.js 18+ | Uses the built-in `fetch` API in the test script |
| MongoDB 6+  | Local install or a free MongoDB Atlas cluster |
| ngrok (optional) | Only needed to receive real GitHub events locally |

---

## Setup

### 1 — Install dependencies

```bash
cd git-code-reviewer
npm install
```

### 2 — Create your `.env`

```bash
cp .env.example .env
```

Open `.env` and fill in every value:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017          # or your Atlas connection string
MONGODB_DB_NAME=git_code_reviewer
GITHUB_WEBHOOK_SECRET=paste_a_strong_random_secret_here
REVIEW_BRANCHES=main,develop                   # remove line to accept all branches
```

> **Tip — generate a strong secret:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

The server will print a clear error and exit if `MONGODB_URI` or `GITHUB_WEBHOOK_SECRET` are missing.

---

## Running the Service

```bash
# Development (auto-restarts on file changes)
npm run dev

# Production
npm start
```

Expected output:

```
[db]     Connected to MongoDB — database: git_code_reviewer
[server] Listening on http://localhost:3000
```

---

## Exposing Locally with ngrok

GitHub must be able to reach your endpoint over the internet. During local development, tunnel your port with [ngrok](https://ngrok.com/):

```bash
ngrok http 3000
```

ngrok prints a public URL like `https://abc123.ngrok-free.app`. Use that as the **Payload URL** in GitHub (see next section). The tunnel stays active as long as the ngrok process is running.

---

## GitHub Webhook Configuration

1. Open your repository → **Settings → Webhooks → Add webhook**.
2. Fill in the form:

   | Field | Value |
   |-------|-------|
   | **Payload URL** | `https://<your-ngrok-id>.ngrok-free.app/api/webhook` |
   | **Content type** | `application/json` |
   | **Secret** | The value of `GITHUB_WEBHOOK_SECRET` in your `.env` |
   | **Which events?** | Select **Just the push event** |
   | **Active** | ✅ checked |

3. Click **Add webhook**. GitHub sends a `ping` event immediately; your server responds `{"message":"pong"}`.
4. Push a commit. Check the webhook's **Recent Deliveries** tab — you should see a green ✓ and the response body `{"received":true,"commitsSaved":1}`.

---

## API Reference

### `POST /api/webhook`

Receives GitHub push events.

**Required headers**

| Header | Description |
|--------|-------------|
| `X-Hub-Signature-256` | `sha256=<HMAC-SHA256 of body>` |
| `X-GitHub-Event` | `push`, `ping`, or other |
| `X-GitHub-Delivery` | Unique UUID per delivery |
| `Content-Type` | `application/json` |

**Responses**

| Status | Meaning |
|--------|---------|
| `200` | Accepted, ignored (ping/wrong event/filtered branch), or duplicate |
| `400` | Malformed payload (missing `ref` or `repository`) |
| `401` | Missing or invalid `X-Hub-Signature-256` |
| `500` | Unexpected server error |

**Success body example**

```json
{ "received": true, "commitsSaved": 2, "branch": "main" }
```

---

### `GET /api/health`

Returns service and database status.

```json
{
  "status": "ok",
  "mongo": "connected",
  "uptime": 42
}
```

---

## Testing with the Local Script

With the server running (`npm run dev`), open a second terminal:

```bash
node scripts/send-test-webhook.js
```

The script:
1. Reads `sample-payload.json`.
2. Computes the correct `X-Hub-Signature-256` using your `GITHUB_WEBHOOK_SECRET`.
3. POSTs to `http://localhost:3000/api/webhook`.
4. Prints the HTTP status and JSON response.

Expected output:

```
[test-webhook] Sending push event to http://localhost:3000/api/webhook
[test-webhook] Delivery ID : xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
[test-webhook] Signature   : sha256=3b4c5d…

[test-webhook] Response 200:
{
  "received": true,
  "commitsSaved": 2,
  "branch": "main"
}
```

Verify the commits are in MongoDB:

```bash
mongosh git_code_reviewer --eval "db.commits.find().pretty()"
```

Run the script a second time — the server recognises the duplicate `deliveryId` and returns:

```json
{ "received": true, "message": "duplicate delivery, skipped" }
```

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---------|-------------|-----|
| `401 Unauthorized` from GitHub | Secret mismatch | Ensure the value in GitHub's webhook settings **exactly** matches `GITHUB_WEBHOOK_SECRET` in `.env`. Copy-paste; do not retype. |
| `401` from the local test script | Secret mismatch between `.env` and what you entered in GitHub | Re-run `node scripts/send-test-webhook.js`; it always reads from `.env`, so it should succeed. |
| MongoDB connection error on startup | `MONGODB_URI` wrong or Mongo not running | Check `MONGODB_URI` in `.env`. Start MongoDB locally: `mongod --dbpath ./data` or use Atlas. |
| GitHub shows red ✗ on delivery | Webhook URL unreachable | Confirm ngrok is running and the Payload URL matches the current ngrok tunnel URL (it changes on each free-tier restart). |
| No commits stored for a branch push | Branch filtered out | Check `REVIEW_BRANCHES` in `.env`. Remove the line to accept all branches. |
| Duplicate commits in MongoDB | Upsert index missing | Drop the collection and restart — Mongoose creates the unique compound index on first insert. |
| GitHub timeout (no response within 10 s) | Server processing too slowly | The current implementation is synchronous; add a queue (BullMQ, etc.) if processing becomes expensive. |
