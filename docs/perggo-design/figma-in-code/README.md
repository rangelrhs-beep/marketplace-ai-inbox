# Perggo — Figma in Code (Phase 1)

## Purpose

This folder defines **Phase 1 (documentation-only)** of Perggo “Figma in Code”.

Phase 1 establishes a single implementation reference to translate the official Perggo visual references into safe, incremental code work in future phases.

## Scope of Phase 1

Included in this phase:

- Documentation structure for reference, design system, components, screens and implementation bridge.
- Canonical mapping for all 27 official Perggo reference screens.
- Canonical usage guidance for official Perggo visual assets.

Explicitly out of scope in this phase:

- No frontend code changes.
- No backend code changes.
- No app behavior changes.
- No auth, tenant, company, marketplace, notification or AI logic changes.
- No HTML prototype creation.
- No move/rename/duplication/edit of existing image assets.

## Source of truth

This Phase 1 documentation is derived from:

- `docs/perggo-design/brand-guidelines.md`
- `docs/perggo-design/screen-map.md`
- `docs/perggo-design/implementation-rules.md`
- `docs/perggo-design/reference-screens.md`
- `frontend/src/assets/perggo/README.md`

## File structure

- `01-reference-board.md` — official reference board and 27-screen mapping.
- `02-design-system.md` — design language, token intent and UI consistency rules.
- `03-components.md` — component inventory and screen usage matrix.
- `04-mobile-screens.md` — per-screen blueprint for all 27 mobile screens/states.
- `05-implementation-bridge.md` — safe design-to-code execution protocol for future phases.

## How to use

1. Start with `01-reference-board.md` for canonical references.
2. Apply `02-design-system.md` for visual consistency.
3. Use `03-components.md` to avoid one-off UI implementations.
4. Follow `04-mobile-screens.md` for screen-by-screen implementation planning.
5. Execute future implementation via `05-implementation-bridge.md` with minimal, safe diffs.

## Multi-tenant and behavior safety

Nothing in this folder changes runtime behavior. Future implementers must preserve current SaaS safety rules including:

- tenant/company isolation (`company_id`)
- backend authorization as source of truth
- local DB source for `GET /questions`
- manual Mercado Livre history import
- webhook-driven real-time synchronization

## Phase 1 completion criteria

Phase 1 is complete when:

- all five documentation files exist,
- all 27 screens are traceable by number and filename,
- official Perggo assets are referenced without modification,
- and no app/frontend/backend behavior files are changed.
