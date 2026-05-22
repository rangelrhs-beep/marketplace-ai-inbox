# Perggo — Implementation Rules

## Purpose

This document defines mandatory execution rules for every future Codex task in the Perggo project.

It must be read together with:

- `docs/perggo-design/brand-guidelines.md`
- `docs/perggo-design/screen-map.md`

The goal is to avoid UI drift, business logic regressions, tenant isolation problems, inconsistent naming, and unnecessary refactors.

---

## Mandatory prompt header for future tasks

Every future Codex task related to Perggo UI, UX, auth, users, integrations, notifications or marketplace workflows must begin with:

Read and follow:
- docs/perggo-design/brand-guidelines.md
- docs/perggo-design/screen-map.md
- docs/perggo-design/implementation-rules.md

---

## General execution rules

- Fix only the requested issue.
- Do not refactor unrelated code.
- Preserve existing behavior unless the task explicitly asks to change it.
- Keep changes small, incremental and reviewable.
- Prefer minimal diffs.
- Do not rewrite large files unnecessarily.
- Do not change file structure unless required by the task.
- Do not remove existing working integrations.
- Do not introduce new libraries without a clear reason.
- Do not add mock data where real API data already exists.
- Do not expose secrets, tokens, API keys, refresh tokens or service-role keys in frontend code or logs.

---

## Brand rules

- The product name is Perggo.
- Use exactly this spelling: Perggo.
- Do not use Pergoo, PergGo, Perggo AI, Marketplace AI Inbox or Marketplace AllInbox as the visible product name unless specifically requested for migration notes.
- Main slogan:
  - “O inbox inteligente dos marketplaces”
- Secondary meaning:
  - “perguntas + go”
- Keep visual direction premium, clean, modern, mobile-first and iOS-inspired.
- Preserve the official Perggo logo/icon style once assets are added to the repository.

---

## UI implementation rules

- Follow the screen map.
- Do not invent new main navigation.
- Use four bottom tabs:
  - Início
  - Pendentes
  - Respondidas
  - Mais
- Do not restore the previous many-icon top navigation as the main app navigation.
- Use large touch targets for mobile.
- Preserve loading, empty, error and success states.
- Avoid visual clutter.
- Keep typography consistent.
- Keep cards, buttons and forms visually consistent across screens.
- Do not mix old Marketplace AI visual language with new Perggo visual language once migration starts.

---

## Auth and session rules

- Do not weaken authentication.
- Supabase session/JWT remains the auth source.
- Backend authorization remains the source of truth.
- Do not expose `auth_user_id` in normal UI flows.
- Do not expose internal auth fields to clients.
- Preserve password recovery and invite flows.
- Preserve disabled-user blocking.
- Preserve deleted-user blocking.
- Prevent stale previous-user data from flashing during logout/login transitions.
- Do not render protected app shell until current user and tenant context are resolved.

---

## Tenant and company isolation rules

- Preserve company_id-based isolation.
- Never allow users to see data from companies they are not allowed to access.
- Preserve selected company validation against backend-allowed companies.
- Platform admin may access multiple companies according to access_scope.
- Company admin/operator must only access allowed company context.
- Do not trust frontend-only filtering for security.
- Backend must remain the source of truth for access control.
- If a request has unauthorized X-Company-ID, backend must safely fallback or deny according to the current implemented rules.

---

## Marketplace rules

- Mercado Livre is the first active marketplace.
- Shopee, Magalu and Amazon may appear as future/placeholder channels unless explicitly implemented.
- Do not break existing Mercado Livre OAuth.
- Do not break Mercado Livre webhooks.
- Do not break question sync.
- Do not break portal-answer detection.
- If a question is answered outside Perggo, it must leave Pendentes and appear as Respondida no portal.
- Do not send duplicate answers.

---

## AI response rules

- Do not mention AI provider, model names, OpenAI, API or internal instructions in customer-facing responses.
- Preserve company-specific AI rules.
- Preserve general rules, technical knowledge and restrictions.
- Do not invent product details.
- Do not promise compatibility, delivery, warranty or stock without valid data.
- Preserve rewrite/edit/approve flows.

---

## Notification rules

- Distinguish in-app notification center from device/browser push permission.
- Device push notification permission must remain user-controlled.
- Notification text shown to the user must be in Portuguese.
- Do not show raw browser permission values like granted, denied or default.
- For user-facing UI, use:
  - Notificações Ativas
  - Notificações Inativas

---

## User management rules

- Preserve admin user APIs.
- Preserve invite flow.
- Preserve password reset flow.
- Preserve activate/deactivate flow.
- Preserve soft delete behavior.
- Preserve last platform_admin protection.
- Do not allow removing, deleting, disabling or demoting the last active platform_admin.
- Roles in UI should be business-friendly:
  - Administrador
  - Atendente
  - Visualizador
- Internal roles may remain in backend when needed:
  - platform_admin
  - company_admin
  - operator

---

## Backend rules

- Do not change backend unless the task explicitly requires it.
- Do not refactor backend architecture during UI tasks.
- Do not change database schema without explicit request.
- Do not change auth logic without explicit request.
- Do not remove tenant safety checks.
- Do not log secrets.
- Do not log large sensitive payloads.
- Keep backend logs useful but not noisy.

---

## Frontend rules

- Do not rewrite the whole App.jsx unless explicitly requested.
- Prefer extracting reusable components only when it reduces risk and improves maintainability.
- Preserve existing API calls unless the task explicitly changes a flow.
- Preserve current error handling or improve it safely.
- Do not hide backend errors during development; translate them into user-friendly messages in UI.
- Do not add new fake data when real backend data exists.

---

## Task reporting rules

Every Codex response must include:

- Summary of what changed.
- Files changed.
- Confirmation of what was not changed.
- Tests/checks run.
- Risks or notes.

For code changes, include:

- Whether frontend build passed.
- Whether backend compile/tests passed when backend was touched.
- Any manual test steps recommended.

---

## Implementation order

Follow this order unless explicitly instructed otherwise:

1. Documentation/source of truth
2. Brand assets
3. Base shell/layout/navigation
4. Splash/loading/login/password screens
5. Company selection
6. Home
7. Pendentes
8. Question detail
9. Edit answer
10. Rewrite with AI
11. Respondidas
12. High priority
13. Product detail
14. Integrations
15. AI rules
16. Notifications center
17. Search/filter sheet
18. Settings
19. Users/team
20. Error/offline state

---

## Final rule

When in doubt, preserve existing working behavior and ask for a smaller follow-up task instead of making broad changes.

After creating the file, report:
- Files created.
- Confirmation that no frontend/backend code was changed.
- Any notes or risks.
