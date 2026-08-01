# 11. Knowledge Brain

## Purpose
The Knowledge Brain is the canonical memory layer of Policy Brain. It stores original sources, extracted knowledge objects, relationships and retrieval metadata.

## Core Concepts
- Knowledge Sources: uploaded documents, text, notes and references.
- Knowledge Objects: normalized facts and policy fragments.
- Knowledge Graph: relationships between knowledge objects and rules.
- Retrieval Layer: used by AI agents to assemble context.

## Principles
- Knowledge is the source of truth.
- Documents are preserved but not treated as executable truth.
- Tenant isolation is absolute.
- Retrieval before generation.
- Every object remains traceable to its source.

## Retrieval Hierarchy
1. Approved rules
2. Draft rules
3. Previous conversations
4. Knowledge objects
5. Knowledge sources
6. Vector search
7. Graph expansion

## Metadata
Every knowledge object carries source, version, owner, folder, tags, timestamps and confidence fields.

## AI Consumption
AI agents consume curated context from the Knowledge Brain rather than raw storage.