# 02 — Design System (Documentation Blueprint)

## Objective

Document Perggo visual language and reusable UI standards for later implementation, without changing runtime code in this phase.

## Brand and language baseline

- Product name: **Perggo**
- Slogan: **O inbox inteligente dos marketplaces**
- UI language: Portuguese (Brazil)
- Tone: professional, simple, trustworthy, fast, helpful, human

Avoid exposing internal technical terms in visible UI.

## Color intent

Primary intent:

- Blue → Purple gradient for primary actions and active states.

Semantic intents:

- Green: success / connected / answered
- Orange/Red: priority / warning / failure risk
- Gray/Blue-gray: secondary text/icons/borders
- White/light lavender: base backgrounds and cards

Rule:

- Do not introduce a new unrelated color system without explicit design approval.

## Typography intent

- Keep high readability on mobile.
- Preserve hierarchy across titles, subtitles, body and helper text.
- Prefer currently available font stack unless explicitly approved otherwise.
- Keep touch-first sizes for labels, tabs, actions and form content.

## Layout and spacing intent

- Mobile-first layout.
- Generous vertical rhythm.
- Rounded surfaces (cards, inputs, buttons).
- Subtle borders and gentle shadows.
- Minimal visual noise.

## Interaction state model

Operational screens should support, where applicable:

- loading
- empty
- error
- success/confirmation

State copy must follow Perggo tone and Portuguese naming from source docs.

## Navigation rules

Primary mobile bottom navigation must contain only:

1. Início
2. Pendentes
3. Respondidas
4. Mais

Do not restore old many-icon top navigation as main navigation.

## Status and copy standards

Use clear user-facing labels for integrations and notifications.

Examples:

- Conectado
- Reconectar
- Token expirado
- Notificações Ativas
- Notificações Inativas
- Nova pergunta recebida

Do not display raw technical terms such as `granted`, `denied`, `default`, `auth_user_id`.

## Security and tenant constraints for future implementation

Design-layer changes must never weaken:

- authentication and session protection
- role-based access constraints
- tenant/company isolation
- backend authorization as source of truth

## Phase-1 guardrail

This file defines standards only; it introduces no code, no behavior changes and no asset mutations.
