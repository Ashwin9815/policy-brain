# 10. Multi-Agent Architecture

## Purpose
Policy Brain executes complex workflows through a coordinated multi-agent system managed by a Master Orchestrator.

## Architecture
- Master Orchestrator coordinates execution.
- Specialized agents remain independently deployable.
- Agents communicate through events rather than direct coupling.

## Initial Agent Set
- Document Extractor
- Knowledge Extractor
- Rule Generator
- Duplicate Checker
- Rule Comparator
- Impact Analyzer
- Explainability Agent
- Export Agent

## Execution Principles
- Event-driven orchestration
- Checkpoint after every stage
- Retry failed stages twice
- Resume from last successful checkpoint
- Persist workflow state outside agents

## Extensibility
Agents are exposed as reusable capabilities so organizations may invoke a single agent or compose complete workflows through APIs.