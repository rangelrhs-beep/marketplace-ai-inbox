# 05 — Implementation Bridge (Design → Code)

## Objective

Define a safe protocol for future UI implementation phases using this documentation set as source of truth.

This file does not introduce runtime changes; it only specifies how future tasks should be executed.

## Inputs for future implementation tasks

Required references for every Perggo UI task:

- `docs/perggo-design/brand-guidelines.md`
- `docs/perggo-design/screen-map.md`
- `docs/perggo-design/implementation-rules.md`
- `docs/perggo-design/reference-screens.md`
- `docs/perggo-design/figma-in-code/01-reference-board.md`
- `docs/perggo-design/figma-in-code/02-design-system.md`
- `docs/perggo-design/figma-in-code/03-components.md`
- `docs/perggo-design/figma-in-code/04-mobile-screens.md`

## Canonical task format (future)

Each implementation task should explicitly cite target screens as:

- `Screen NN — filename.png`

Examples:

- `Screen 06 — 06-home-summary.png`
- `Screen 10 — 10-rewrite-with-ai.png`

## Safe execution sequence (future)

1. Implement one flow or small screen set at a time.
2. Reuse documented components before creating new variants.
3. Keep diffs minimal and behavior-preserving.
4. Validate tenant/auth/role behavior remains unchanged.
5. Run checks and report exactly what changed.

## Non-regression checklist (future)

Before finishing each implementation task, confirm:

- No auth weakening.
- No tenant/company isolation regression.
- No cross-company rendering.
- No changes to backend route contracts unless explicitly requested.
- No changes to marketplace safety rules (manual import, webhook sync source, duplicate answer protections).
- No visual-only task introduces data/logic side effects.

## Asset handling protocol

For all future UI work:

- Reference official Perggo assets from `frontend/src/assets/perggo/`.
- Do not move, rename, duplicate, edit or replace source assets without explicit approval.

## Definition of done (future implementation tasks)

A screen/flow task is done when:

- target screens are visually aligned to references,
- copy is aligned to Perggo language standards,
- existing behavior is preserved,
- tenant and role restrictions remain intact,
- checks pass and diffs are minimal.

## Phase 1 completion statement

This bridge is documentation-only and intentionally introduces no frontend/backend changes.
