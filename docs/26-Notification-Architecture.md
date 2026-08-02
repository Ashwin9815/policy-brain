# 26. Notification Architecture

## Purpose
Notifications keep users informed of workflow progress, review requests, approvals and important system events without overwhelming them.

## Channels
- In-app
- Email
- Slack
- Microsoft Teams

## Principles
- Event-driven delivery
- User preferences respected
- Actionable links only
- Auditable delivery history
- Retry-safe and idempotent notifications

## Notification Types
- Workflow completed
- Review requested
- Approval required
- Mention received
- Integration failed
- Export ready

## Delivery Model
Notifications are generated from platform events, routed through user preferences and stored with delivery status for traceability.