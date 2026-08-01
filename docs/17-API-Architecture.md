# 17. API Architecture

## Purpose
Policy Brain is API-first. Every capability available in the UI must also be accessible via a documented API.

## API Style
- REST APIs for external and internal consumers.
- Versioned endpoints.
- Stateless requests.
- Consistent error handling.
- Idempotency for write operations.

## Core Endpoint Groups
- /v1/auth
- /v1/users
- /v1/folders
- /v1/policies
- /v1/rules
- /v1/knowledge
- /v1/workflows
- /v1/search
- /v1/agents
- /v1/comments
- /v1/approvals
- /v1/exports
- /v1/admin

## Async Workflows
Long-running jobs such as document ingestion and rule generation return workflow IDs and are polled or resumed later.

## Security
OAuth, MFA and tenant context are enforced on every request.