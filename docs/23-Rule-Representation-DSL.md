# 23. Rule Representation & Internal DSL

## Purpose
Policy Brain stores policy logic in a canonical internal representation so the same rule can be edited visually, read in natural language and exported as executable code.

## Canonical Model
- Visual blocks
- Natural language view
- Internal DSL
- Exported code

## Structure
Rules are composed of ordered blocks such as metadata, eligibility, conditions, exceptions, decision and evidence.

## Principles
- One canonical rule model.
- All views are reversible.
- Invalid or contradictory logic is blocked before production.
- Version history remains immutable.

## Validation
The DSL rejects missing conditions, circular logic, duplicate clauses and unsupported operators.

## Export
The same DSL can be compiled to target formats such as JSON, YAML or language-specific code adapters.