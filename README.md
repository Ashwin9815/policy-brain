# Policy Brain

Enterprise AI Policy Compiler & Knowledge Platform for healthcare payers.

Transform unstructured policy documents into governed, versioned, explainable business rules — **AI proposes, humans approve**.

## Quick Start

```bash
pnpm install
cp .env.example .env && cp .env.example packages/database/.env
pnpm db:generate && pnpm db:push && pnpm db:seed
pnpm dev
```

- **Web:** http://localhost:3000
- **API:** http://localhost:3001/v1/health
- **Demo login:** `admin@acme-health.com` / `demo1234`

See [DEVELOPMENT.md](./DEVELOPMENT.md) for full setup instructions.

## Architecture

| Layer | Technology |
|-------|------------|
| Web | Next.js 15, Tailwind CSS |
| API | Hono (REST `/v1/*`) |
| Database | PostgreSQL + Prisma |
| Agents | Master Orchestrator (multi-agent stubs) |
| Monorepo | pnpm + Turborepo |

```
apps/api          REST API (auth, policies, rules, knowledge, workflows)
apps/web          Dashboard UI
packages/database Prisma schema (Identity, Policy, Knowledge, Workflow, Governance)
packages/shared   Rule DSL validation
packages/agents   Multi-agent orchestrator
docs/             Software Design Document (SDD)
```

## SDD

The full Software Design Document lives in [`docs/`](./docs/). The chat-derived expanded corpus is preserved separately in the repository history.

## Core Principles

- Knowledge is the source of truth
- API-first — every UI capability has a REST endpoint
- Folder-level RBAC with audit trails
- Multi-agent orchestration with checkpoint recovery
- Canonical internal DSL for rules (visual, NL, export views)
