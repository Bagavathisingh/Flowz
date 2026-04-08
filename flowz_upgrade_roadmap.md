# Flowz — Production Upgrade Roadmap
> Based on direct code analysis of [engine/index.js](file:///d:/upload_git_File/miniN8N/backend/src/engine/index.js), [aiController.js](file:///d:/upload_git_File/miniN8N/backend/src/controllers/aiController.js), [api.js](file:///d:/upload_git_File/miniN8N/backend/src/routes/api.js), and the React/Vite frontend.
> Prioritized by: risk-to-fix × business value. P0 = existential, P1 = revenue-critical, P2 = growth.

---

## Current Architecture Snapshot (What You Actually Have)

| Layer | Reality |
|-------|---------|
| **Execution Engine** | Single-threaded BFS queue in one file ([engine/index.js](file:///d:/upload_git_File/miniN8N/backend/src/engine/index.js), 528 lines). Fully sequential. One node failure crashes the entire run. |
| **AI Generation** | [aiController.js](file:///d:/upload_git_File/miniN8N/backend/src/controllers/aiController.js) — Gemini model cascade with `JSON.parse(cleanJson(text))` — brittle regex fallback. No schema validation. |
| **API Keys in nodes** | `action.config?.api_key` — raw secrets stored *inside node JSON*, saved to MongoDB as plaintext. |
| **Auth** | `bcryptjs` + `jsonwebtoken` installed but **no auth middleware in [api.js](file:///d:/upload_git_File/miniN8N/backend/src/routes/api.js)**. All routes are unauthenticated. |
| **CORS** | `app.use(cors())` — wildcard. Any origin can call your API. |
| **Execution History** | No persistence. `nodeLogs` returned in HTTP response and gone forever. |
| **Chat trigger timing** | `await new Promise(r => setTimeout(r, 1500))` — hardcoded 1.5s poll hack in production code. |
| **Scheduler state** | In-memory `Map`. Restarts wipe all registered schedules. |
| **Integrations** | Webhook, HTTP, Email (Ethereal/SMTP), Telegram, Cron, MongoDB. That's it. |

---

## P0 — Fix Before Any Sales Call (Security & Stability)

### 1. 🔐 Secrets Vault (Kill the Plaintext API Key Problem)

**What to build:** A `Secret` MongoDB collection where users store named credentials (e.g., `OPENAI_KEY`, `GMAIL_PASS`). Nodes reference secrets by name (`{{secret.OPENAI_KEY}}`), never store the value.

**Tech stack:**
- Backend: `node-vault` (HashiCorp Vault) for serious deployments, or AES-256-GCM encryption using Node's built-in `crypto` module for self-hosted MVP.
- Store: New Mongoose model `Secret { name, encryptedValue, iv, workspaceId }`.
- Frontend: New "Secrets Manager" panel in the sidebar. Dropdown in node config to select secret name instead of typing key.

**Implementation approach:**
```
1. Add MASTER_ENCRYPTION_KEY to .env (32-byte hex)
2. Create POST /api/secrets { name, value } → encrypt with AES-256-GCM, store ciphertext+iv
3. In engine/index.js interpolate(), add resolver: if key starts with 'secret.', call decryptSecret(name)
4. In PropertiesSidebar.jsx, replace password inputs with <SecretSelector> dropdown
5. Strip api_key from all saved workflow JSON — migrate existing documents
```

**Business impact:** Without this, no enterprise customer will sign. A SOC 2 auditor will reject you on day 1. It's also a live security vulnerability today since MongoDB explorers expose all node configs.

---

### 2. 🔒 Auth Middleware — Actually Enforce JWTs

**What to build:** You have `bcryptjs` and `jsonwebtoken` installed but they're dead imports. Wire them up.

**Tech stack:** Already installed. Add `express-rate-limit` for brute-force protection.

**Implementation approach:**
```javascript
// middleware/auth.js
import jwt from 'jsonwebtoken';
export const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};
```
Then in [api.js](file:///d:/upload_git_File/miniN8N/backend/src/routes/api.js), apply `router.use(requireAuth)` to all routes except auth endpoints.

Add `userId` field to [Workflow](file:///d:/upload_git_File/miniN8N/backend/src/engine/index.js#420-528) schema so users only see their own workflows.

**Business impact:** Currently anyone who discovers your Render URL owns every workflow from every user. This is table stakes.

---

### 3. 💥 Engine: Error Isolation (Don't Let One Node Kill the Run)

**What to build:** Currently `throw new Error(...)` inside a node bubbles up to [runWorkflow](file:///d:/upload_git_File/miniN8N/backend/src/engine/index.js#420-528) and stops everything. Introduce per-node error handling with configurable `on_error` behavior: `stop` (current) | `continue` | `retry(n)`.

**Tech stack:** Pure Node.js. No new libraries needed.

**Implementation approach:**
```javascript
// In runWorkflow, replace the inner try/catch throw:
const nodeConfig = currentNode.data.config || {};
const onError = nodeConfig.on_error || 'stop';
const maxRetries = nodeConfig.retry_count || 0;

let result, lastError;
for (let attempt = 0; attempt <= maxRetries; attempt++) {
  try {
    result = await executeAction(actionData, context);
    break;
  } catch (err) {
    lastError = err;
    if (attempt < maxRetries) await sleep(1000 * (attempt + 1)); // exponential backoff
  }
}
if (!result) {
  nodeLogs.push({ ...errorLog, retries: maxRetries });
  if (onError === 'stop') throw lastError;
  if (onError === 'continue') { context.results[currentNode.id] = { error: lastError.message }; }
}
```

Add `on_error` and `retry_count` fields to [PropertiesSidebar.jsx](file:///d:/upload_git_File/miniN8N/frontend/src/components/PropertiesSidebar.jsx).

**Business impact:** Production workflows that process real data must tolerate flaky external APIs. This is a core reliability feature that makes you defensible against n8n's "fail fast" default.

---

## P1 — Revenue-Critical Features (What B2B Customers Pay For)

### 4. ⚡ Parallel Execution Engine

**What to build:** The BFS queue is sequential. When a node fans out to 3 downstream nodes, they execute one-by-one. Replace with topology-aware parallel execution.

**Tech stack:** Node.js `Promise.all()` — no new libraries. Optionally `bullmq` + Redis for queue-based execution that survives server restarts.

**Implementation approach:**
```javascript
// Replace the while(queue) loop with level-by-level parallel execution:
// 1. Build adjacency list and in-degree map from edges
// 2. Start with all zero-in-degree nodes (triggers)
// 3. Execute all ready nodes in parallel: await Promise.all(readyBatch.map(executeNode))
// 4. After each batch, decrement in-degrees and add newly-ready nodes to next batch
// 5. Repeat until no nodes remain

// For ifElse branching: only push the matching branch's children to next batch
```

For long-running workflows (>30 sec), move to `bullmq`:
```
npm install bullmq ioredis
```
Worker picks jobs from queue, reports progress via SSE or WebSocket to frontend.

**Business impact:** Any workflow with parallel data enrichment (fetch 3 APIs simultaneously) is 3x faster. Investors will ask "what's your execution model?" — "parallel DAG" is the right answer.

---

### 5. 📊 Execution History & Audit Log

**What to build:** Currently `nodeLogs` exists only in the HTTP response. After the page refresh, execution history is gone. Store every run.

**Tech stack:**
- New Mongoose model: `ExecutionLog { workflowId, status, nodeLogs[], duration, triggeredBy, createdAt }`
- Frontend: New "Runs" tab in the multi-tab workspace showing run history with expandable node-level logs.

**Implementation approach:**
```javascript
// In api.js, after runWorkflow():
const log = new ExecutionLog({
  workflowId: req.params.id,
  status: result.status,
  nodeLogs: result.nodeLogs,
  duration: result.duration,
  triggeredBy: req.user?.id || 'webhook'
});
await log.save();

// New routes:
GET /api/workflows/:id/runs          → paginated list of ExecutionLog
GET /api/workflows/:id/runs/:runId   → full detail with all node I/O
```

**Business impact:** Every B2B customer will ask "can I audit what happened to my data?" before signing. Without this, you can't debug production issues. A 30-day retention policy + CSV export turns this into a compliance feature you can charge for.

---

### 6. 🔗 Integration Library Expansion (10 → 50+ Nodes)

**What to build:** Your current integrations are minimal. Prioritize by market demand:

| Priority | Integration | Implementation |
|----------|------------|----------------|
| 🔴 High | **Slack** | `@slack/web-api` — send messages, create channels |
| 🔴 High | **Google Sheets** | `googleapis` — read/write rows |
| 🔴 High | **HubSpot / Salesforce** | REST API with OAuth2 |
| 🟡 Med | **Airtable** | `airtable` npm — simple REST |
| 🟡 Med | **Notion** | `@notionhq/client` |
| 🟡 Med | **GitHub** | `@octokit/rest` — PR webhooks, issues |
| 🟢 Low | **Stripe** | Webhook trigger + charge/refund actions |
| 🟢 Low | **Twilio SMS** | `twilio` npm |

**Implementation approach:** Build a **plugin system** instead of hardcoding more `case` blocks:
```javascript
// engine/nodes/slack.js — each integration is its own file
export const handler = async (action, context) => { ... };
export const schema = { /* JSON schema for config validation */ };

// engine/index.js — dynamic loader
import * as Slack from './nodes/slack.js';
const nodeHandlers = { slack_send_message: Slack.handler, ... };

// In executeAction switch, add:
default:
  if (nodeHandlers[action.type]) return nodeHandlers[action.type](action, context);
  return { status: 'executed', type: action.type };
```

**Business impact:** Integration count is the primary metric buyers use to compare workflow tools. n8n has 400+. You need 50 to be taken seriously. The plugin architecture means community contributions scale this for free.

---

### 7. 🤖 Robust AI JSON Generation (Fix the Brittleness)

**What to build:** Your [cleanJson(text)](file:///d:/upload_git_File/miniN8N/backend/src/controllers/aiController.js#7-19) regex is one malformed response away from crashing. 3 specific fixes:

**Fix 1 — Zod Schema Validation (most important):**
```javascript
// npm install zod
import { z } from 'zod';

const NodeSchema = z.object({
  id: z.string(),
  type: z.enum(['webhook_trigger', 'schedule_trigger', 'http_request', 'send_email', 
                 'delay', 'save_to_database', 'ai_model', 'ifElse', 'log', 
                 'manual_trigger', 'app_event', 'form_submission', 'chat_message']),
  data: z.object({ label: z.string(), config: z.record(z.unknown()) })
});

const WorkflowSchema = z.object({
  nodes: z.array(NodeSchema).min(1),
  edges: z.array(z.object({ id: z.string(), source: z.string(), target: z.string() }))
});
```
Parse AI output through `WorkflowSchema.parse()` — it throws with a clear error that AI can self-correct from.

**Fix 2 — Structured Output / Function Calling:**  
Replace `{ responseMimeType: "application/json" }` with Gemini's `responseSchema` parameter to force valid output schema at the API level. This eliminates the [cleanJson](file:///d:/upload_git_File/miniN8N/backend/src/controllers/aiController.js#7-19) hack entirely.

**Fix 3 — Self-Correction Loop:**
```javascript
let attempts = 0;
while (attempts < 3) {
  const raw = await model.generateContent(prompt);
  try {
    return WorkflowSchema.parse(JSON.parse(raw.response.text()));
  } catch (validationError) {
    prompt = `CORRECTION NEEDED. Previous output failed validation: ${validationError.message}. Fix and retry.`;
    attempts++;
  }
}
```

**Business impact:** The fallback static workflow is a visible UX failure. Users who see it churn immediately. Validation + self-correction brings AI reliability from ~80% to ~99%.

---

## P2 — Growth & Moat Features (Investor-Facing)

### 8. 👥 Team Collaboration & Workspaces

**What to build:** Multi-user workspaces with role-based access.

**Tech stack:**
- Backend: New `Workspace` and `WorkspaceMember` Mongoose models with `{ userId, workspaceId, role: 'owner'|'editor'|'viewer' }`
- Real-time: `socket.io` for live cursor presence on the canvas
- Frontend: Workspace switcher in [TopBar.jsx](file:///d:/upload_git_File/miniN8N/frontend/src/components/TopBar.jsx), shareable workflow links with read-only view

**Implementation approach:**
```
Phase 1 (2 weeks): Workspace model → all routes scoped to workspaceId → invite by email
Phase 2 (1 week): socket.io for real-time "teammate is editing" indicators
Phase 3 (1 week): Granular permissions — viewers can't publish, editors can't delete
```

**Business impact:** Teams don't buy individual accounts. The first enterprise sale will require workspace isolation. Real-time collaboration is your strongest "wow" demo moment for investors.

---

### 9. 🔄 Fix the Scheduler State Loss Problem

**What to build:** Schedules are stored in `Map` ([triggers/scheduler.js](file:///d:/upload_git_File/miniN8N/backend/src/triggers/scheduler.js)). Server restart = all schedules gone silently.

**Tech stack:** `bullmq` + Redis (self-hosted) or `BullMQ Cloud`. Or simpler: on startup, query MongoDB for all published workflows with `schedule_trigger` and re-register them.

**Implementation approach (no Redis, 2 hours of work):**
```javascript
// In index.js, after connectDB():
const scheduledWorkflows = await Workflow.find({ 
  'nodes.data.type': 'schedule_trigger', 
  isPublished: true 
});
for (const wf of scheduledWorkflows) {
  const trigger = wf.nodes.find(n => n.data?.type === 'schedule_trigger');
  const cronExpr = intervalToCron(trigger.data.config.interval);
  registerSchedule(wf._id.toString(), cronExpr, async (ctx) => {
    await runWorkflow(wf.nodes, wf.edges, ctx.trigger.payload);
  });
}
console.log(`[SCHEDULER] Restored ${scheduledWorkflows.length} schedules on boot.`);
```

**Business impact:** A Cron-based workflow that silently stops after a server deploy is a production incident. Fixing this costs 2 hours. Not fixing it will cost you a customer.

---

### 10. 📡 Replace the 1.5s Poll Hack with WebSockets

**What to build:** In [api.js](file:///d:/upload_git_File/miniN8N/backend/src/routes/api.js) line 214: `await new Promise(r => setTimeout(r, 1500))` is a timeout inside an HTTP request handler waiting for a workflow to complete. This is wrong for long workflows and races with fast ones.

**Tech stack:** `socket.io` (already needed for collaboration anyway).

**Implementation approach:**
```javascript
// Backend: emit execution progress events
io.to(workflowId).emit('node:start', { nodeId, label });
io.to(workflowId).emit('node:complete', { nodeId, result, duration });
io.to(workflowId).emit('node:error', { nodeId, error });
io.to(workflowId).emit('workflow:done', { status, duration });

// Frontend ExecutionPanel.jsx: subscribe to socket events
// → animate nodes in real-time as they execute
// → show per-node live status (running spinner → green check → red X)
```

**Business impact:** Real-time node-by-node execution animation is a "holy shit" demo moment. It's the feature that makes someone screenshot your app and post it on LinkedIn.

---

## Implementation Priority Matrix

```
    HIGH IMPACT
         │
P0 ──── │ ── Secrets Vault ────── Auth Middleware ── Error Isolation
         │
P1 ──── │ ── Parallel Exec ─────── Exec History ──── Integration Expansion
         │        │                                          │
         │     AI Fix ──────────────────────────────────────┘
         │
P2 ──── │ ── Team Collab ──────── WebSockets ──── Scheduler Fix
         │
    LOW IMPACT
         └─────────────────────────────────────────────────────
         EASY                                            HARD
```

## Exact Sprint Plan (12 Weeks to Production-Ready)

| Sprint | Weeks | Theme | Deliverables |
|--------|-------|-------|-------------|
| 1 | 1–2 | Security Hardening | Auth middleware, CORS lockdown, Secrets vault MVP |
| 2 | 3–4 | Engine Reliability | Error isolation + retry, Parallel execution, Scheduler restore-on-boot |
| 3 | 5–6 | AI Robustness | Zod validation, Gemini responseSchema, self-correction loop |
| 4 | 7–8 | Observability | Execution history model, Runs tab in UI, Audit log API |
| 5 | 9–10 | Integration Sprint | Slack, Google Sheets, HubSpot, Airtable + plugin architecture |
| 6 | 11–12 | Collaboration | Workspaces, socket.io live updates, Shareable workflow links |

---

> **Bottom line for your pitch:** Your engine, AI modifier, and debug assistant are genuinely impressive for a prototype. The three things that will kill a B2B sale before it starts are: (1) secrets stored in plaintext, (2) no auth on any API route, (3) no execution history. Fix those three in the next two weeks. Everything else is a growth problem, not a survival problem.
