# 12. Event-Driven Architecture

## Purpose
Policy Brain uses events to coordinate long-running workflows, keep services loosely coupled and enable checkpointed recovery.

## Core Principles
- Events represent facts.
- Producers do not know consumers.
- Events are immutable.
- Workflows are replayable.
- Every stage is observable.

## Workflow Model
Document upload, extraction, generation, comparison, approval and export are all separate event stages in a resumable pipeline.

## Reliability
- Retry failed stages twice.
- Persist checkpoints after each stage.
- Pause and resume workflows without recomputing completed work.

## Operational Events
Examples include document uploaded, knowledge extracted, rule generated, duplicate detected, approval granted and export completed.