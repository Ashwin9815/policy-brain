# Policy Brain — Development Guide

Enterprise AI Policy Compiler & Knowledge Platform.

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16 (or `docker compose up -d postgres`)

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env

# 3. Push database schema
pnpm db:push

# 4. Seed demo data
pnpm db:seed

# 5. Start dev servers (API on :3001, Web on :3000)
pnpm dev
```

## Demo Credentials

- **Email:** `admin@acme-health.com`
- **Password:** `demo1234`

## Architecture

```
apps/
  api/     Hono REST API (/v1/*)
  web/     Next.js 15 dashboard
packages/
  database/   Prisma + PostgreSQL schema
  shared/     DSL validation, types, constants
  agents/     Multi-agent orchestrator stubs
```

## API Endpoints (SDD §17)

| Group | Path |
|-------|------|
| Auth | `/v1/auth/login`, `/v1/auth/register`, `/v1/auth/me` |
| Folders | `/v1/folders` |
| Policies | `/v1/policies` |
| Rules | `/v1/rules` |
| Knowledge | `/v1/knowledge/sources` |
| Workflows | `/v1/workflows` |
| Agents | `/v1/agents/:type/invoke` |
| Search | `/v1/search?q=` |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start API + Web in parallel |
| `pnpm build` | Build all packages |
| `pnpm test` | Run shared package tests |
| `pnpm db:push` | Sync Prisma schema to DB |
| `pnpm db:seed` | Load demo organization & policy |

## Core Principles (from SDD)

- **AI proposes, humans approve**
- **API-first** — every UI capability has a REST endpoint
- **Knowledge is the source of truth**
- **Folder-level RBAC** with audit trails
- **Multi-agent orchestration** with checkpoint recovery
