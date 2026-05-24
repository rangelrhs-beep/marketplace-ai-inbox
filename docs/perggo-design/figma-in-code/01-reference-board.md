# 01 — Reference Board

## Objective

Provide a canonical, implementation-safe reference board for Perggo UI work using the official 27 visual screens and official source assets.

## Reference sources

- Screen definitions: `docs/perggo-design/reference-screens.md`
- Product/UX naming and language: `docs/perggo-design/brand-guidelines.md`
- Navigation and flow definitions: `docs/perggo-design/screen-map.md`
- Execution guardrails: `docs/perggo-design/implementation-rules.md`

## Official screen repository

All official images live in:

- `docs/perggo-design/reference-screens/`

## Canonical screen map (27)

| # | Canonical reference | Title | Flow group |
|---|---|---|---|
| 01 | `01-splash.png` | Splash | Entry |
| 02 | `02-loading.png` | Initial Loading | Entry |
| 03 | `03-login.png` | Login | Auth |
| 04 | `04-password-reset.png` | Define New Password | Auth |
| 05 | `05-company-selection.png` | Company Selection | Tenant Context |
| 06 | `06-home-summary.png` | Home / Summary | Core Operation |
| 07 | `07-pending-list.png` | Pending Questions | Core Operation |
| 08 | `08-question-detail.png` | Question Detail | Core Operation |
| 09 | `09-edit-answer.png` | Edit Answer | Core Operation |
| 10 | `10-rewrite-with-ai.png` | Rewrite With AI | Core Operation |
| 11 | `11-answered-list.png` | Answered Questions | Core Operation |
| 12 | `12-high-priority.png` | High Priority | Core Operation |
| 13 | `13-product-detail.png` | Product Detail | Core Operation |
| 14 | `14-integrations.png` | Integrations | More / Config |
| 15 | `15-ai-rules.png` | AI Rules | More / Config |
| 16 | `16-notifications.png` | Notifications Center | More / Config |
| 17 | `17-search-filters.png` | Search & Filters | Cross-screen Utility |
| 18 | `18-settings.png` | Settings | More / Config |
| 19 | `19-users-team.png` | Users & Team | Admin |
| 20 | `20-error-offline.png` | Error / Offline | Global State |
| 21 | `21-invite-accepted.png` | Invite Accepted | Auth Confirmation |
| 22 | `22-password-recovery-sent.png` | Password Recovery Email Sent | Auth Confirmation |
| 23 | `23-answer-sent-confirmation.png` | Answer Sent Confirmation | Operation Confirmation |
| 24 | `24-already-answered-elsewhere.png` | Already Answered Elsewhere | Operation Safety |
| 25 | `25-token-expired-reconnect.png` | Token Expired / Reconnect | Integration Safety |
| 26 | `26-company-details.png` | Company Details | Admin / Company |
| 27 | `27-plan-billing.png` | Plan & Billing | Admin / SaaS |

## Official visual assets (canonical source)

Asset directory:

- `frontend/src/assets/perggo/`

Official source files:

- `perggo-icon-source.png`
- `perggo-logo-source.png`
- `perggo-wordmark-source.png`

Usage rules:

- Use these assets as source references only.
- Do not modify, redraw, recolor, duplicate, move or rename these files in Phase 1.

## Visual consistency constraints

Future implementation tasks must keep:

- product name “Perggo”
- slogan “O inbox inteligente dos marketplaces”
- iOS-inspired, clean, soft visual style
- blue/purple primary gradient direction
- rounded cards and spacing rhythm
- bottom nav with 4 tabs: Início, Pendentes, Respondidas, Mais

## Functional conflict rule

If any visual reference conflicts with existing auth/tenant/security/business behavior, preserve current working behavior and adapt visuals only.
