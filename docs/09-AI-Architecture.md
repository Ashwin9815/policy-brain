# 9. AI Architecture

## Purpose
Policy Brain uses a multi-agent AI architecture orchestrated by a master agent to transform enterprise knowledge into governed, explainable and executable policies.

## Core Principles
- Master agent orchestrates workflows.
- Specialized agents perform focused tasks.
- AI is stateless; workflow state is persisted.
- Every inference is explainable and auditable.

## Core Agents
- Document Extractor
- Knowledge Extractor
- Rule Generator
- Duplicate Checker
- Rule Comparator
- Impact Analyzer
- Explainability Agent
- Export Agent

## Execution Model
Requests are executed through an event-driven pipeline with checkpointing, retry (2 attempts), and resumable workflows.

## Human Oversight
AI generates recommendations while humans retain final approval authority for production rules.