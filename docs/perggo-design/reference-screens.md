# Perggo — Official Visual Reference Screens

This document validates the official Perggo visual reference screens currently stored in this repository.

## Official status

The 27 images in `docs/perggo-design/reference-screens/` are the **official visual reference** for the Perggo mobile UI.

Future UI implementation must match these references as closely as possible.

Codex must not invent a different visual style unless explicitly requested.

## Implementation approach

Implementation must happen in small and controlled increments, screen by screen or flow by flow.

Each implementation task must reference the exact image number and file name being implemented.

Example task reference format:
- `Screen 06 — 06-home-summary.png`
- `Screen 10 — 10-rewrite-with-ai.png`

## Visual consistency rules (mandatory)

All future Perggo UI implementation should preserve the same visual language shown in the references:

- same Perggo logo
- same product name
- same tagline
- same soft iOS-like style
- same blue/purple gradient direction
- same rounded cards
- same spacing rhythm
- same bottom navigation model

## Functional conflict rule

If any reference screen conflicts with existing auth, tenant, or security behavior, preserve the currently working app behavior and adapt only the visual layer.

Do not weaken authentication, authorization, company isolation, or existing backend rules in order to force a visual match.

## Official screen list (27)

1. `01-splash.png`
2. `02-loading.png`
3. `03-login.png`
4. `04-password-reset.png`
5. `05-company-selection.png`
6. `06-home-summary.png`
7. `07-pending-list.png`
8. `08-question-detail.png`
9. `09-edit-answer.png`
10. `10-rewrite-with-ai.png`
11. `11-answered-list.png`
12. `12-high-priority.png`
13. `13-product-detail.png`
14. `14-integrations.png`
15. `15-ai-rules.png`
16. `16-notifications.png`
17. `17-search-filters.png`
18. `18-settings.png`
19. `19-users-team.png`
20. `20-error-offline.png`
21. `21-invite-accepted.png`
22. `22-password-recovery-sent.png`
23. `23-answer-sent-confirmation.png`
24. `24-already-answered-elsewhere.png`
25. `25-token-expired-reconnect.png`
26. `26-company-details.png`
27. `27-plan-billing.png`
