# 13. Storage Architecture

## Purpose
Policy Brain uses polyglot storage so each type of data is stored in the system best suited for its workload and query pattern.

## Storage Components
- Relational database for transactional data.
- Object storage for source documents and exports.
- Vector database for semantic retrieval.
- Graph database for knowledge relationships.
- Cache for performance.

## Principles
- Choose the right store for the right job.
- Keep storage behind repositories and abstractions.
- Maintain tenant isolation across all stores.
- Preserve immutable history where required.

## Data Flow
Uploaded sources are stored immutably, extracted into knowledge objects, linked in the graph, embedded for retrieval and cached where useful.

## Operational Concerns
- Backups and recovery
- Encryption at rest
- Independent scaling by store type
- Snapshot and restore support