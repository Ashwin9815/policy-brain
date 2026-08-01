# 14. System Architecture

## Purpose
Policy Brain is built as a modular enterprise platform composed of independently deployable services connected through APIs and events.

## Core Services
- Identity Service
- Workflow Service
- Knowledge Service
- AI Platform
- Integration Service
- Notification Service
- Search Service

## Principles
- API-first
- Event-driven
- Domain-driven
- Replaceable infrastructure
- Independent scaling

## Deployment View
The platform runs on cloud-native infrastructure with a gateway, service layer, event bus and polyglot storage layer.

## Observability
Every request carries trace and correlation identifiers across services.