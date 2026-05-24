# 04 — Mobile Screens (27 Blueprints)

## Objective

Provide a concise implementation blueprint for each official Perggo screen/state, strictly aligned with references and current behavior constraints.

## Screen blueprint format

Each section includes:

- Reference image
- Screen objective
- Required UI blocks
- Core copy and actions
- Behavior dependencies to preserve

---

## 01 — Splash (`01-splash.png`)
- Objective: brand-first app entry state.
- Blocks: logo/icon, Perggo wordmark, official slogan.
- Preserve: no stale user/company content displayed.

## 02 — Initial Loading (`02-loading.png`)
- Objective: session/company/integration bootstrap.
- Blocks: brand, optional marketplace row, loading message.
- Preserve: auth/tenant loading safety before protected shell.

## 03 — Login (`03-login.png`)
- Objective: secure sign-in.
- Blocks: brand header, email/password fields, entry/recovery/invite actions.
- Preserve: existing auth error handling semantics with user-friendly PT-BR copy.

## 04 — Define New Password (`04-password-reset.png`)
- Objective: invite/recovery password setup.
- Blocks: new password + confirm, save action.
- Preserve: existing recovery/invite callback flow.

## 05 — Company Selection (`05-company-selection.png`)
- Objective: choose active company context when user has multiple companies.
- Blocks: company cards with selected state + continue action.
- Preserve: backend-allowed companies only.

## 06 — Home / Summary (`06-home-summary.png`)
- Objective: daily operational overview.
- Blocks: greeting, summary cards, latest questions list, CTA to pendentes.
- Preserve: tenant-scoped metrics and content.

## 07 — Pending Questions (`07-pending-list.png`)
- Objective: unanswered queue.
- Blocks: title/subtitle, filters/chips, question cards, per-item actions.
- Preserve: no cross-company rendering.

## 08 — Question Detail (`08-question-detail.png`)
- Objective: analyze and answer safely.
- Blocks: product card, customer question, AI suggestion, action CTA set.
- Preserve: existing answer-send safeguards and duplicate prevention.

## 09 — Edit Answer (`09-edit-answer.png`)
- Objective: manual control over AI suggestion.
- Blocks: editable textarea, helper prompts, approve/save/cancel actions.
- Preserve: edit state persistence until final action.

## 10 — Rewrite With AI (`10-rewrite-with-ai.png`)
- Objective: generate adjusted response from user prompt.
- Blocks: prompt input, quick prompt examples, generated result card, selection actions.
- Preserve: existing rewrite endpoint behavior and UI-neutral provider naming.

## 11 — Answered Questions (`11-answered-list.png`)
- Objective: answer history review.
- Blocks: filters by date range, answered cards.
- Preserve: tenant-scoped history.

## 12 — High Priority (`12-high-priority.png`)
- Objective: urgent question triage.
- Blocks: high-priority list and urgency indicators.
- Preserve: priority semantics from existing data.

## 13 — Product Detail (`13-product-detail.png`)
- Objective: product context to improve response confidence.
- Blocks: image/title/price/stock/SKU/metadata.
- Preserve: product cache usage patterns.

## 14 — Integrations (`14-integrations.png`)
- Objective: connectivity status and actions.
- Blocks: marketplace status cards, last sync, connect/reconnect actions.
- Preserve: existing integration health semantics.

## 15 — AI Rules (`15-ai-rules.png`)
- Objective: company-specific answer guidance.
- Blocks: rule sections, form controls, save action.
- Preserve: current rule model and scope.

## 16 — Notifications (`16-notifications.png`)
- Objective: in-app notification center and preferences.
- Blocks: status, entries, controls.
- Preserve: distinction between in-app center and device/browser permission.

## 17 — Search & Filters (`17-search-filters.png`)
- Objective: cross-list filtering UX.
- Blocks: query input + filter chips/sections.
- Preserve: filter behavior consistency with current query/list logic.

## 18 — Settings (`18-settings.png`)
- Objective: user/account/app settings.
- Blocks: profile and settings groups.
- Preserve: role-based visibility and stable settings flows.

## 19 — Users & Team (`19-users-team.png`)
- Objective: user administration.
- Blocks: user list, role/status badges, invite/manage actions.
- Preserve: admin protections (including last platform_admin safeguards).

## 20 — Error / Offline (`20-error-offline.png`)
- Objective: safe failure state.
- Blocks: failure message, guidance, retry and fallback actions.
- Preserve: no technical leakage in user-facing copy.

## 21 — Invite Accepted (`21-invite-accepted.png`)
- Objective: confirm successful password creation.
- Blocks: success confirmation + enter action.
- Preserve: safe route transition and callback state cleanup.

## 22 — Recovery Email Sent (`22-password-recovery-sent.png`)
- Objective: confirm reset link request.
- Blocks: confirmation message + return action.
- Preserve: anti-enumeration friendly messaging.

## 23 — Answer Sent Confirmation (`23-answer-sent-confirmation.png`)
- Objective: confirm successful send operation.
- Blocks: success title, contextual details, next pending action.
- Preserve: only shown after confirmed backend success.

## 24 — Already Answered Elsewhere (`24-already-answered-elsewhere.png`)
- Objective: prevent duplicate send path.
- Blocks: warning/confirmation state and routing guidance.
- Preserve: pending→answered movement semantics.

## 25 — Token Expired / Reconnect (`25-token-expired-reconnect.png`)
- Objective: recover disconnected marketplace.
- Blocks: disconnect status + reconnect action.
- Preserve: no raw token/internal detail exposure.

## 26 — Company Details (`26-company-details.png`)
- Objective: tenant-scoped company profile management.
- Blocks: company identity/plan/users/marketplace summary sections.
- Preserve: role restrictions and company boundaries.

## 27 — Plan & Billing (`27-plan-billing.png`)
- Objective: SaaS plan visibility.
- Blocks: plan, limits, usage and support/change-plan actions.
- Preserve: avoid implying automation not implemented.

---

## Cross-screen guardrails

- Preserve backend authority for auth/access/company scope.
- Preserve tenant isolation on all rendered data.
- Preserve operational safety for marketplace answer lifecycle.
- Apply Portuguese business-friendly copy consistently.
