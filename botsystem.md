# Clicky — System Architecture

## 1. High-Level Architecture

Clicky consists of two independent systems:

1. botclient (frontend SDK)
2. botserver (authoritative backend)

The client is intentionally dumb.
The server owns all intelligence and security.

---

## 2. botclient Architecture

### Responsibilities
- Render UI (Mini + Full)
- Capture user input
- Send queries to server
- Render server-returned HTML

### Constraints
- Pure JavaScript + CSS
- Built with Vite
- No React
- No auth logic
- No API keys

### Trust Level
- Untrusted

---

## 3. botserver Architecture

### Responsibilities
- Authenticate requests
- Prevent abuse and automation
- Classify intent
- Query MongoDB safely
- Invoke AI for reasoning
- Return render-ready responses

### Trust Level
- Fully trusted

---

## 4. Request Flow

1. User logs in
2. Clicky SDK initializes
3. User submits query
4. Server authenticates session/JWT
5. Abuse checks applied
6. Intent classification (non-LLM)
7. MongoDB query execution (template-based)
8. AI reasoning (bounded)
9. HTML response generation
10. Client renders response

---

## 5. Authentication Model

- Same auth mechanism as Clicktory
- JWT or session cookie
- Enforced server-side
- No client-side trust

Unauthenticated requests are rejected immediately.

---

## 6. Data Access Model

- MongoDB is read-only
- Only public collections are accessible
- Queries are selected from pre-approved templates
- AI never generates raw queries

---

## 7. AI Integration

- OpenAI used only for reasoning
- AI never sees:
  - Secrets
  - Schemas
  - System prompts
- User input is sanitized and bounded

---

## 8. Abuse & Security Controls

- Rate shaping per user and intent
- Prompt injection detection
- Hard refusal + redirect behavior
- No free-form code or query execution

---

## 9. Failure Handling

- Graceful fallback to AI reasoning
- One clarification question if needed
- No silent failures

---

## 10. Deployment

- botclient served via CDN/cloud
- Lazy-loaded post-login
- botserver deployed alongside Clicktory backend
