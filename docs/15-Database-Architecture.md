# 15. Database Architecture

## Purpose
The database layer stores Policy Brain's transactional data, historical versions, audit logs and workflow state.

## Core Domains
- Identity
- Knowledge
- Policy
- Workflow
- Governance
- AI
- Integration
- Administration
- Audit
- Billing

## Design Principles
- Tenant scoped records
- Immutable history where required
- Strong consistency for production data
- Separate storage by workload type
- Normalized core entities with versioned snapshots

## Key Entities
- Organizations
- Users
- Folders
- Policies
- Rules
- Rule Versions
- Knowledge Sources
- Knowledge Objects
- Workflows
- Approvals
- Audit Events

## Indexing and Performance
Primary indexes support tenant, folder, status and timestamps. Derived stores such as vector and graph databases are synchronized from the relational system of record.