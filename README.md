# Git Code Reviewer

An automated code review service that listens to GitHub commit events and reviews every push as it happens. Whenever code is pushed to a connected repository, GitHub calls this service through a webhook, and the service analyzes the commit details and reports its findings.

---

## Table of Contents

- [Features](#features)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Service](#running-the-service)
- [GitHub Webhook Setup](#github-webhook-setup)
- [API Reference](#api-reference)
- [Webhook Payload Example](#webhook-payload-example)
- [Security](#security)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- Automatically triggered on every `push` to a connected repository
- Extracts commit details: author, message, timestamp, and changed files
- Reviews added and modified files for issues such as bugs, style problems, and security risks
- Verifies webhook authenticity using HMAC-SHA256 signatures
- Supports branch filtering (for example, review only `main` or `develop`)
- Responds to GitHub quickly and processes reviews asynchronously
- Keeps a log of every delivery and review result

## How It Works

1. A developer pushes commits to the GitHub repository.
2. GitHub sends a `push` event as an HTTP `POST` request to this service's webhook endpoint.
3. The service verifies the request signature using the shared secret.
4. The service reads the `commits[]` array and collects the changed files for each commit.
5. Each change is reviewed, and the results are stored and/or reported.
6. The service returns `200 OK` to GitHub.

```
Developer --push--> GitHub --webhook POST--> Git Code Reviewer API
                                                  |
                                    verify signature -> parse commits
                                                  |
                                        review changed files
                                                  |
                                      store / report results
```

## Architecture

| Component | Responsibility |
|-----------|----------------|
| Webhook endpoint | Receives and validates GitHub push events |
| Signature verifier | Confirms the request came from GitHub |
| Commit parser | Extracts commit metadata and changed files |
| Review engine | Analyzes code changes and produces findings |
| Reporter | Stores or publishes review results |

## Prerequisites

- A GitHub repository where you have **admin** access (required to add webhooks)
- A server or host with a **publicly reachable URL** (use [ngrok](https://ngrok.com/) for local testing)
- Runtime for this project: `<Node.js 18+ / Python 3.10+ / Java 17+>` (update as per your stack)
- Git installed locally

## Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/git-code-reviewer.git
cd git-code-reviewer

# Install dependencies (adjust to your stack)
npm install
# or
pip install -r requirements.txt
```

## Configuration

Create a `.env` file in the project root:

```env
# Server
PORT=8080

# GitHub webhook secret (must match the secret set in GitHub)
GITHUB_WEBHOOK_SECRET=your_random_secret_here

# Optional: only review these branches (comma separated)
REVIEW_BRANCHES=main,develop

# Optional: GitHub token for fetching file contents or posting comments
GITHUB_TOKEN=your_github_token
```

> Never commit your `.env` file. Make sure it is listed in `.gitignore`.

## Running the Service

```bash
# Development
npm run dev

# Production
npm start
```

The service will be available at `http://localhost:8080`.

To expose it for GitHub during local development:

```bash
ngrok http 8080
```

Use the generated `https://<id>.ngrok.io` URL as your webhook Payload URL.

## GitHub Webhook Setup

1. Open your repository on GitHub.
2. Go to **Settings → Webhooks → Add webhook**.
3. Fill in the form:
   - **Payload URL:** `https://your-domain.com/api/webhook`
   - **Content type:** `application/json`
   - **Secret:** the same value as `GITHUB_WEBHOOK_SECRET`
   - **Events:** select **Just the push event**
4. Make sure **Active** is checked and click **Add webhook**.
5. Check the **Recent Deliveries** tab to confirm GitHub received a `200` response.

## API Reference

### `POST /api/webhook`

Receives GitHub push events.

**Headers**

| Header | Description |
|--------|-------------|
| `X-GitHub-Event` | Event type, expected value: `push` |
| `X-GitHub-Delivery` | Unique delivery ID |
| `X-Hub-Signature-256` | HMAC-SHA256 signature of the request body |
| `Content-Type` | `application/json` |

**Responses**

| Status | Meaning |
|--------|---------|
| `200 OK` | Event accepted for review |
| `400 Bad Request` | Malformed payload |
| `401 Unauthorized` | Signature verification failed |
| `500 Internal Server Error` | Unexpected error while processing |

### `GET /health`

Returns the service status. Useful for uptime checks.

## Webhook Payload Example

Trimmed example of the JSON GitHub sends:

```json
{
  "ref": "refs/heads/main",
  "before": "9049f1265b7d61be4a8904a9a27120d2064dab3b",
  "after": "0d1a26e67d8f5eaf1f6ba5c57fc3c7d91ac0fd1c",
  "repository": {
    "full_name": "your-org/your-repo",
    "html_url": "https://github.com/your-org/your-repo"
  },
  "pusher": { "name": "octocat", "email": "octocat@example.com" },
  "commits": [
    {
      "id": "0d1a26e67d8f5eaf1f6ba5c57fc3c7d91ac0fd1c",
      "message": "Fix login bug",
      "timestamp": "2026-11-03T10:15:30+05:30",
      "author": { "name": "Octo Cat", "username": "octocat" },
      "added": ["src/new.js"],
      "removed": [],
      "modified": ["src/login.js"]
    }
  ]
}
```

## Security

- **Signature verification:** every request is validated against `X-Hub-Signature-256` using a constant-time comparison. Requests with invalid signatures are rejected.
- **Secrets:** store the webhook secret and tokens in environment variables, never in source code.
- **HTTPS:** always use HTTPS for the webhook endpoint in production.
- **Least privilege:** if using a GitHub token, grant only the permissions it needs.

## Project Structure

```
git-code-reviewer/
├── src/
│   ├── routes/          # Webhook and health endpoints
│   ├── services/        # Review engine, commit parser
│   ├── utils/           # Signature verification, helpers
│   └── config/          # Environment and app configuration
├── tests/               # Unit and integration tests
├── .env.example         # Sample environment variables
├── .gitignore
├── README.md
└── package.json         # or requirements.txt / pom.xml
```

> Update this tree to match your actual folder layout.

## Testing

```bash
npm test
```

To test the webhook manually:

```bash
curl -X POST http://localhost:8080/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -H "X-Hub-Signature-256: sha256=<computed-signature>" \
  -d @sample-payload.json
```

You can also use **Redeliver** from the webhook's *Recent Deliveries* tab on GitHub to replay a real event.

## Troubleshooting

| Problem | Possible Cause | Fix |
|---------|----------------|-----|
| GitHub shows a red mark on delivery | Service not reachable | Check the URL, firewall, and that the service is running |
| `401 Unauthorized` | Secret mismatch | Ensure the GitHub secret matches `GITHUB_WEBHOOK_SECRET` |
| No review triggered | Branch filtered out | Check `REVIEW_BRANCHES` |
| Timeout from GitHub | Processing takes too long | Respond immediately and process the review asynchronously |
| Only 20 commits reviewed | GitHub limit on `commits[]` | Use the GitHub Compare API with `before` and `after` |

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.