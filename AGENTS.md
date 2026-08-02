# AGENTS.md

Guidance for AI agents working in the Policy Brain repository.

## Repository overview

Policy Brain is an **enterprise AI Policy Compiler** for healthcare payers. The SDD lives in `docs/`; runnable code is a pnpm/turbo monorepo.

| Path | Contents |
|------|----------|
| `apps/api` | Hono REST API (`/v1/*`) — API-first per SDD §17 |
| `apps/web` | Next.js 15 dashboard (policies, knowledge, workflows) |
| `packages/database` | Prisma schema + PostgreSQL client |
| `packages/shared` | Rule DSL validation, shared types |
| `packages/agents` | Master Orchestrator + agent stubs |
| `docs/` | Software Design Document (28 sections) |

## Cursor Cloud specific instructions

### Services to run

| Service | Port | Command |
|---------|------|---------|
| PostgreSQL | 5432 | `sudo pg_ctlcluster 16 main start` (pre-installed) or `docker compose up -d postgres` |
| API | 3001 | `pnpm --filter @policy-brain/api dev` |
| Web | 3000 | `pnpm --filter @policy-brain/web dev` |

Start both app servers with `pnpm dev` from repo root (requires `.env` — copy from `.env.example`).

### First-time database setup

```bash
cp .env.example .env
cp .env.example packages/database/.env   # Prisma reads env next to schema
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
```

Demo login: `admin@acme-health.com` / `demo1234`

### Lint / test / build

| Task | Command |
|------|---------|
| Dev (API + Web) | `pnpm dev` |
| Build all | `pnpm build` |
| Tests (DSL validation) | `pnpm test` |
| Lint | `pnpm lint` |

### Gotchas

- **Prisma env:** `packages/database/.env` must exist (or set `DATABASE_URL`) before `db:push` / `db:seed`. The root `.env` is not automatically picked up by Prisma CLI.
- **PostgreSQL:** If `pg_isready` fails, run `sudo pg_ctlcluster 16 main start`.
- **API env:** The API loads `DATABASE_URL` from the shell environment; `source .env` before starting if not using `pnpm dev` with dotenv.
- **Uploads:** Document uploads land in `apps/api/uploads/` at runtime.
- **Agents are stubs:** Multi-agent workflows run in-process with placeholder outputs until real AI providers are wired (SDD §10, §21).

### Architecture alignment (MVP)

Implemented per SDD Decision 050:

- **AI Composer** — upload → extract → clarify → generate → review → publish
- **Live Policy Canvas** — visual block editor with NL/JSON views
- **Knowledge Brain** — sources, objects, interactive knowledge graph
- **Multi-agent orchestrator** — real extraction, generation, duplicate check, compare, export
- **Collaboration** — typed comments, approval workflow, notifications
- **Search** — hybrid keyword + semantic scoring
- **Compare** — git-style rule diff with conflict detection
- **Export** — JSON, YAML, Python compilation from canonical DSL
- **Flight Recorder** — per-stage workflow traces (SDD §27)
- **Administration** — users, folders, org AI settings

Still stubbed / partial: OAuth/SSO, MFA, vector DB, graph DB sync, real LLM inference (uses heuristics unless BYOK key set).

See `DEVELOPMENT.md` for full setup instructions.
