# 21. Model Router

## Purpose
The Model Router selects the most suitable AI model for each task based on availability, cost, latency and organization policy.

## Routing Modes
- Managed AI
- BYOK
- Hybrid fallback

## Inputs
- Task type
- Agent type
- Tenant configuration
- Budget limits
- Latency targets
- Provider availability

## Principles
- Provider agnostic
- Cost aware
- Latency aware
- Replaceable
- Observable

## Failover
If the preferred provider is unavailable, the router falls back to another approved model and records the decision for audit and billing.