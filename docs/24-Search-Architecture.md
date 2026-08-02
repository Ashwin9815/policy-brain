# 24. Search Architecture

## Purpose
Search helps users and AI agents find the most relevant policies, knowledge objects and conversations with minimal latency and maximum trust.

## Retrieval Hierarchy
1. Approved rules
2. Draft rules
3. Previous conversations
4. Knowledge objects
5. Knowledge sources
6. Vector search
7. Graph expansion

## Search Modes
- Keyword search
- Metadata search
- Semantic search
- Graph search
- Hybrid search

## Principles
- Deterministic sources first.
- Semantic retrieval only when needed.
- Respect tenant and folder permissions.
- Return explainable results with evidence.

## Result Payload
Search responses include the matched object, relevance metadata, source references and any related downstream entities.

## Performance
Search is optimized through indexing, caching and pre-filtering before expensive semantic retrieval is performed.