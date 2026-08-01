# 16. Domain Model

## Purpose
The domain model defines the core business concepts of Policy Brain and the relationships between them.

## Bounded Contexts
- Identity
- Knowledge
- Policy
- Workflow
- Governance
- AI
- Collaboration
- Integration
- Administration
- Billing

## Core Aggregates
- Organization
- User
- Knowledge Source
- Knowledge Object
- Policy
- Rule
- Rule Version
- Workflow
- Approval
- Agent Execution

## Principles
- Every aggregate has a clear owner.
- Services do not directly mutate other services' data.
- Domain events connect contexts.
- Concepts remain stable even as implementation changes.

## Domain Events
Examples include policy created, rule generated, approval granted, workflow resumed and export completed.