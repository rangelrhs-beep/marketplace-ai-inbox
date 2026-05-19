# Marketplace AI Inbox

Marketplace AI Inbox is a multi-tenant SaaS application for marketplace sellers who need to manage customer questions, generate AI-assisted answers, and keep marketplace response history synchronized in one operational inbox.

This README is the persistent source of truth for future Codex sessions. When changing architecture, tenant behavior, integration flows, or operational rules, update this file in the same session.

## Important Rules

These critical architectural and operational rules must never be broken in future development:

- `GET /questions` must read from the local database only.
- Never re-enable unsafe live Mercado Livre history merge inside `GET /questions`.
- Mercado Livre history import must always be a manual operation.
- Webhooks are the source of real-time synchronization.
- All routes must respect `company_id` isolation.
- Never mix `seller_id` values or tokens between tenants.
- Preserve app answers during imports.
- Use UPSERT behavior for imports so repeated imports update existing tenant-scoped records instead of duplicating data.
- The frontend must never render questions from another company.
- Buyer enrichment should be cached locally.

## Project Overview

The app currently focuses on Mercado Livre questions. Sellers connect a Mercado Livre account, sync product and question data, review AI-generated response suggestions, optionally edit or rewrite them, and send final answers back to Mercado Livre.

Main goals:

- Centralize marketplace questions in a fast seller support inbox.
- Generate useful AI answer drafts using company rules, product knowledge, and cached product data.
- Preserve tenant isolation across all UI and API flows.
- Keep local database state as the canonical operational source for the inbox.
- Support multiple companies from one platform-admin view while preparing for real authentication and onboarding.

The application is designed as a SaaS multi-tenant system. Each company has isolated integrations, settings, products, questions, and AI suggestions keyed by `company_id`.

## Tech Stack

Frontend:

- React with Vite.
- Main implementation in `frontend/src/App.jsx`.
- Styling in `frontend/src/styles.css`.
- Deployed on Vercel.

Backend:

- FastAPI.
- SQLAlchemy ORM.
- Uvicorn runtime.
- Main implementation in `backend/main.py`.
- Deployed on Render.

Database:

- Supabase PostgreSQL in production.
- Local SQLite fallback when `DATABASE_URL` is empty.
- SQLAlchemy creates and backfills tables/columns at startup.

Hosting and source control:

- GitHub repository.
- Render for the backend web service.
- Vercel for the frontend app.
- Supabase for PostgreSQL persistence.

AI provider:

- OpenAI via `OPENAI_API_KEY`.
- Configurable model via `OPENAI_MODEL`.
- Default in env example: `gpt-4o-mini`.

## Performance Notes

- Render free-tier cold starts can add latency on the first backend hit; frontend keeps lightweight loading states and avoids duplicate fetch storms during tenant/tab switches.
- `GET /questions` is local-DB only and paginated; backend does not merge live Mercado Livre history in this path and keeps tenant-scoped buyer enrichment cached locally.
- Frontend request stabilization includes per-tenant request de-duplication, stale request cancellation on company switches, and a small debounce before initial question reloads.
- API retries should be friendly and bounded (short retry for temporary `5xx`, no infinite retry loops); manual user actions remain available for explicit retry.
- Future scaling recommendation: add Redis for cross-instance caches (buyer/profile + short-lived question payload cache), move heavy sync/import jobs to queue workers, and keep webhook-driven writes as the real-time source.

Backend auth environment:

- `SUPABASE_URL`: Supabase project URL used to validate JWT issuer and fetch Supabase Auth JWKS signing keys. Required for bearer-token auth.
- `SUPABASE_JWT_SECRET`: Supabase JWT secret used only to validate legacy HS256 access-token signatures.

Integrations:

- Mercado Livre is the primary real integration.
- Connector scaffolding exists for Amazon, Magalu, Shopee, and Tiny ERP.
- Products are synced into `products_cache` and used to enrich UI details and AI prompts.

## Current Companies

Seeded tenant companies:

| Company | `company_id` |
| --- | --- |
| CPAP Express | `cpap_express` |
| Indusat | `atlas_commerce` |
| Zasweb | `nova_casa_imports` |

The default company is CPAP Express. When no `Authorization` header is sent, the backend preserves the existing mock user `admin` with role `platform_admin`. When a Supabase bearer token is sent, the backend validates the JWT and resolves the local `users` row from `auth_user_id` when that column is present, otherwise by `email`. The current `users` model contains `id`, optional `auth_user_id`, `email`, `name`, `role`, and `company_id`.

## Multi-Tenant Architecture

Tenant isolation is mandatory.

Core model:

- `companies.id` is the canonical `company_id`.
- `integrations.company_id` isolates OAuth tokens, seller IDs, sync timestamps, and import metadata.
- `questions.company_id` isolates marketplace questions and answer state.
- `products_cache.company_id` isolates product metadata.
- `company_settings.company_id` isolates AI behavior and response rules.
- `users.company_id` is present for the future real-auth model.

Request flow:

1. The frontend stores the selected company in `localStorage` under `marketplace_ai_selected_company_id`.
2. All frontend API calls go through `apiFetch`.
3. `apiFetch` sends `X-Company-ID` when a selected company exists.
4. The backend resolves the tenant in `get_current_company_id(request)`.
5. The backend accepts `X-Company-ID` only for a resolved `platform_admin` role and only if the company exists.
6. If no `Authorization` header is present and no valid company header is present, the mock context falls back to `cpap_express`; authenticated non-platform-admin users remain scoped to `users.company_id`.

Admin selector:

- `/me` returns the active company and permissions.
- `/companies` returns the company list for platform admins.
- The frontend `CompanySwitcher` changes the selected company, clears tenant-scoped UI state, and reloads questions/settings/health for that company.
- Frontend filtering additionally drops any question or conversation card whose `company_id` does not match the selected company.

Authentication and tenant resolution:

- Backend tenant/auth context flows through `get_current_user(request)`, `get_current_company_id(request)`, and `get_current_user_role(request)`.
- The frontend can initialize Supabase Auth when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured; in that mode it shows an email/password login screen before loading the inbox.
- After Supabase login, frontend API requests include `Authorization: Bearer <access_token>` while still sending tenant-scoped `X-Company-ID` for platform-admin company switching.
- Logout is available from the top-left header app menu (Marketplace AI button) on both mobile and desktop; the menu shows the current user and a `Sair` action.
- Backend Supabase JWT validation requires `SUPABASE_URL`. Supabase may issue access tokens signed with ES256; the backend validates those tokens by fetching JWKS from `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`, selecting the public key by JWT header `kid`, and caching the JWKS in memory for 10 minutes. `SUPABASE_JWT_SECRET` is only needed for legacy HS256 tokens. With a bearer token present, the backend validates signature, issuer (`{SUPABASE_URL}/auth/v1`), audience (`authenticated`), expiry, `sub`, and `email`.
- If no `Authorization` header is present, the backend intentionally preserves the existing mock `platform_admin` behavior and `X-Company-ID` selector workflow. This is the only mock fallback path.
- If a bearer token is invalid, the backend returns `401` and does not fall back to mock auth.
- If a bearer token is valid but no local `users` row matches `auth_user_id` (when present) or `email`, the backend returns `403` with `User is authenticated but not linked to a company.`
- Authenticated users resolve their tenant from `users.company_id`; only users with role `platform_admin` can use `X-Company-ID` to switch companies. Company users/operators cannot switch into another company's tenant.
- `GET /me` includes the resolved user `source` (`auth` or `mock`). `GET /debug/auth-context` returns the resolved `user_id`, `role`, `company_id`, and context `source` for rollout diagnostics. `GET /debug/auth-token` requires a bearer token and returns only safe decoded JWT header/payload diagnostics without returning the token.

Supabase Auth user linking:

- Manual `POST /admin/users/link-supabase` still exists for exceptional support/debug workflows.
- Normal onboarding now happens in-app from **Usuários** using `POST /admin/users/invite` with `email`, `name`, `company_id`, and `role` only (no manual Auth User ID in UI).
- Backend uses `SUPABASE_SERVICE_ROLE_KEY` server-side to create/invite in Supabase Auth and upsert local `users`, linking `auth_user_id` automatically when Supabase returns it.

User roles:

- `platform_admin`: platform operator; can list companies, use admin user-linking endpoints, and switch active companies with `X-Company-ID`.
- `company_admin`: company-scoped administrator; can use only their linked `users.company_id` and cannot switch companies.
- `operator`: company-scoped operator; can use only their linked `users.company_id` and cannot switch companies.

Frontend role-based UI behavior:

- `platform_admin`: sees company selector, can switch tenant context, and sees Inbox/Pendentes/Respondidas/Integrações/Analytics/Configurações/Usuários menus.
- `company_admin`: never sees company selector, frontend forces tenant context to backend `/me.company.id`, and sees Inbox/Pendentes/Respondidas/Integrações/Configurações menus.
- `operator`: never sees company selector, frontend forces tenant context to backend `/me.company.id`, and sees only Inbox/Pendentes/Respondidas menus.
- Frontend menu visibility is UX-only; backend route authorization remains the source of truth and must enforce role permissions server-side for admin/debug routes.

Admin user onboarding and password management:

- `platform_admin` has an admin-only **Usuários** screen in the app UI.
- The page calls `GET /admin/users` to list local users and displays `name`, `email`, `role`, `company_id` (and company name when available on the frontend company list), and `auth_user_id`.
- The page includes an invite form that calls `POST /admin/users/invite` with `email`, `name`, `company_id`, and `role` (`platform_admin`, `company_admin`, `operator`).
- Backend invite flow requires `platform_admin`, validates `company_id` and role, and uses Supabase Admin Auth API with `SUPABASE_SERVICE_ROLE_KEY` (backend-only secret) to generate/send invite links.
- Backend upserts the local `users` row (`email`, `name`, `role`, `company_id`) and links `auth_user_id` when returned by Supabase.
- If invite email delivery is not configured, backend returns `invite_link`; frontend shows **Copiar link de convite** so admins can share it manually. If Supabase email delivery is active, frontend shows **Convite enviado por e-mail**.
- The users table/mobile cards include **Editar** and save changes with `PUT /admin/users/{user_id}` (`platform_admin` only), validating role/company and updating local user mapping; if `email` changes and `auth_user_id` exists, backend updates Supabase Auth email too.
- The users table includes an action **Enviar redefinição de senha** that calls `POST /admin/users/send-password-reset` (`platform_admin` only), triggering Supabase recovery email flow without exposing tokens/secrets.
- If backend returns `403`, the page shows a friendly access message and keeps backend as permission source of truth.
- Optional **Desativar usuário** is still TODO (not implemented yet) to avoid risky schema change during this fix-only increment.

Password change flow:

- Logged-in users can change their own password from the app menu via **Alterar senha**.
- Frontend uses Supabase session auth (`supabase.auth.updateUser({ password: newPassword })`), requiring only new password + confirmation in UI.
- Users cannot change another user's password directly; cross-user reset is admin-only via backend endpoint above.

Admin company onboarding:

- `platform_admin` can create companies from the app UI in **Empresas** (no manual SQL required).
- Backend endpoint `POST /admin/companies` requires `platform_admin` and validates:
  - `id` required
  - `name` required
  - `id` format: lowercase slug with letters, numbers, and underscores only (example: `minha_loja`)
  - duplicate `id` is rejected and existing companies are never overwritten
- On creation, backend inserts:
  - new row in `companies`
  - empty `company_settings` row for the new `company_id`
  - disconnected Mercado Livre `integrations` row (`provider=mercado_livre`, `token_status=missing`)
- Company onboarding never copies data from other tenants and never creates products/questions automatically.
- After creating, `GET /companies` includes the new tenant for `platform_admin`, so it becomes selectable in the company selector.
- Next steps after creating a company: link users in **Usuários** and connect Mercado Livre in **Integrações**.

Webhook routing:

- Mercado Livre webhooks arrive at `POST /integrations/mercadolivre/notifications`.
- The handler extracts the Mercado Livre seller/user identifier from the notification payload.
- Background sync routes the notification by matching `seller_id` to the correct company integration.
- If the seller cannot be mapped to an integration, the webhook must not write into another tenant.

## Mercado Livre Integration Flow

OAuth:

1. Frontend calls `GET /integrations/mercadolivre/auth-url`.
2. Backend validates ML config and builds an authorization URL.
3. The OAuth `state` encodes the active `company_id`.
4. Mercado Livre redirects to `GET /integrations/mercadolivre/callback`.
5. Backend exchanges the authorization code for tokens.
6. Backend resolves and persists `seller_id`.
7. Backend redirects to `FRONTEND_URL/?ml_connected=true` when `FRONTEND_URL` is configured.

Token storage:

- Tokens are stored in `integrations` per `company_id` and provider.
- Important fields: `access_token`, `refresh_token`, `seller_id`, `token_status`, `expires_in`, `expires_at`, `last_sync`, `last_ml_history_import_at`, `last_ml_history_import_days`, and `last_ml_history_import_result`.
- Token refresh is handled server-side when Mercado Livre returns authorization errors.

Question sync:

- Manual sync endpoint: `GET /integrations/mercadolivre/questions`.
- The frontend exposes this as the Mercado Livre sync action.
- Synced questions are upserted into the local `questions` table by `(company_id, provider, external_id)`.
- Initial AI suggestions are created only when a question does not already have one.

Webhook flow:

- Real-time question updates should come from `POST /integrations/mercadolivre/notifications`.
- Duplicate notifications are skipped with an in-memory notification cache.
- Webhook work is scheduled in the FastAPI background task and should resolve the correct tenant by `seller_id`.
- `POST /jobs/sync-mercadolivre` intentionally skips scheduled question sync. Manual sync and webhooks are the intended paths.

Portal answers:

- If a question was already answered in the Mercado Livre portal, the app marks/removes it from pending flows and shows it as portal-answered where appropriate.
- Portal answers use `answered_source = "portal"`.
- App answers use `answered_source = "app"`.
- App answers must not be overwritten by portal history imports.

Import history:

- Manual history import endpoint: `POST /integrations/mercadolivre/questions/import-history`.
- Supported `days` values are `15` and `30`.
- Import results are persisted on the integration record.
- Use manual import for historical answered questions; do not make `/questions` perform live history merging.

Product sync:

- Endpoint: `POST /integrations/mercadolivre/products/sync`.
- Product data is cached in `products_cache`.
- Cached products enrich question cards, details, SKU display, and AI prompts.

## AI Flow

AI suggestion generation:

- Initial suggestions are generated with OpenAI when `OPENAI_API_KEY` is configured.
- Main paths:
  - `POST /ai/suggest`
  - `POST /questions/generate`
  - `POST /questions/{question_id}/suggest`
- Suggestions are persisted in `ai_suggestions`.
- Important fields: `original_suggestion`, `suggestion_text`, `edited_text`, `final_response`, `final_answer`, `was_edited`, `instruction_used`, `approved_by`, and `approved_at`.

Conversation grouping:

- The frontend groups related questions into conversations.
- Grouping key is based on buyer/customer identity plus item/product identity.
- The newest pending question is the editable/sendable target.
- A conversation can contain both pending and answered messages.
- Counters derive from the grouped question set, not from unrelated tenant data.

Follow-up logic:

- When multiple questions from the same buyer and product exist, the UI presents them as a single thread.
- The answer flow targets the newest pending question.
- Already-answered or blocked questions are removed from the pending action flow and surfaced as read-only/history state.

Rules/settings system:

- Company-specific settings are read from `GET /company/settings`.
- Settings are saved through `PUT /company/settings` or `POST /company/settings`.
- Settings include greeting, closing, tone, custom prompt, general AI rules, product knowledge, web-search flag, and absolute restrictions.
- Prompt debug endpoint: `GET /debug/ai/prompt/{question_id}`.

Products cache usage:

- AI prompt generation searches cached products related to the question title/text.
- Question API payloads include cached product metadata when available.
- The UI uses cached product title, thumbnail, permalink, listing status, quantity, price, SKU, and related products.

## Frontend Structure

Primary files:

- `frontend/src/App.jsx`: application state, routing-like section switching, API calls, tenant selector, inbox, integrations, settings, analytics, conversation view.
- `frontend/src/styles.css`: visual styling and responsive behavior.
- `frontend/src/main.jsx`: React entrypoint.

Major UI areas:

- Sidebar navigation.
- Company selector for platform admin.
- Inbox/Pendentes/Respondidas question screens.
- Integrations page.
- AI settings page.
- Analytics page.
- Conversation detail panel.
- Mercado Livre OAuth/connect modal.
- Mercado Livre history import modal.

Important components/functions:

- `apiFetch`: attaches `X-Company-ID`.
- `CompanySwitcher`: admin tenant selector.
- `buildConversationGroups`: groups questions by buyer and item.
- `PendingQuestionCard`: grouped inbox card with AI suggestion actions.
- `Conversation`: detailed message thread, manual edit, rewrite, generate, and approve flow.
- `ConversationMessages`: chronological question/answer timeline.
- `IntegrationCard`: connection, sync, import, product sync, and health actions.
- `SettingsPage`: company-specific AI rules and response settings.

Counters logic:

- `pending`: count visible questions with status `Pendente`.
- `answered`: count visible questions with status `Respondida`.
- `high`: count visible questions with priority `Alta`.
- Visible questions are tenant-filtered before metrics and grouping.

Filters:

- Marketplace filter.
- Priority filter.
- Status/section filter through navigation.
- Answered-source filter for app vs portal answers.
- History window selector for 15 or 30 days.

Pagination:

- Frontend requests `/questions?days={15|30}&page={page}&page_size={page_size}`.
- Default page size is currently 20.
- `has_more` controls the load-more button.

## Backend Structure

Primary files:

- `backend/main.py`: FastAPI app, tenant resolution, Mercado Livre OAuth/sync/webhook/answer logic, AI prompt/suggestion logic, question listing, products sync, settings.
- `backend/database.py`: database URL, engine, session configuration.
- `backend/db_models.py`: SQLAlchemy models.
- `backend/db_seed.py`: seeded companies, admin, default integration, default settings.
- `backend/integrations/*`: connector client/mapper/service scaffolding.
- `backend/tests/test_tenant_isolation_simple.py`: simple tenant isolation regression coverage.

Major endpoints:

- `GET /` and `GET /health`: service health.
- `GET /me`: current user context, active company, permissions, and auth source; uses real Supabase JWT auth when a bearer token is present and mock admin only when no token is sent.
- `GET /debug/auth-context`: diagnostic for resolved user, role, tenant, and `mock`/`auth` source.
- `GET /debug/auth-token`: diagnostic for bearer-token JWT metadata. It requires `Authorization: Bearer <token>` and returns only safe decoded fields (`alg`, `typ`, `iss`, `aud`, `exp`, and whether `sub`/`email` exist).
- `GET /companies`: platform-admin company list.
- `GET /questions`: paginated local inbox source.
- `GET /questions/{question_id}`: tenant-scoped question detail.
- `POST /questions/generate`: generate/regenerate suggestion for a question.
- `POST /questions/answer`: app-level answer flow for real Mercado Livre questions.
- `POST /questions/{question_id}/suggest`: generate suggestion by local ID.
- `POST /questions/{question_id}/approve`: local approval path.
- `GET /company/settings`, `PUT /company/settings`, `POST /company/settings`: company AI settings.
- `GET /integrations/health`: integration health, token state, import metadata.
- `POST /integrations/{integration_id}/test`: connector health test.
- `GET /integrations/{integration_id}/questions`: connector demo/list questions.
- `GET /integrations/mercadolivre/auth-url`: OAuth start.
- `GET /integrations/mercadolivre/callback`: OAuth callback and token persistence.
- `POST /integrations/mercadolivre/disconnect`: clear ML tokens for active company.
- `GET /integrations/mercadolivre/questions`: manual ML question sync.
- `POST /integrations/mercadolivre/questions/import-history`: manual answered history import.
- `POST /integrations/mercadolivre/notifications`: ML webhook receiver.
- `POST /integrations/mercadolivre/products/sync`: product cache sync.
- `POST /integrations/mercadolivre/questions/{question_id}/answer`: direct ML answer endpoint.
- `POST /jobs/sync-mercadolivre`: intentionally skipped scheduled sync.
- `GET /products`: product cache summary/list for active company.
- Debug endpoints under `/debug/*` are operational diagnostics and should not be treated as product APIs.

Services/helpers:

- Auth/tenant helpers: `get_current_user`, `get_current_company_id`, `get_current_user_role`, `log_tenant_context`, `company_exists`.
- ML helpers: token config, token refresh, seller ID resolution, OAuth state encode/decode, API request helpers.
- Sync helpers: question extraction, upsert, portal answer handling, webhook background sync.
- AI helpers: prompt building, OpenAI initial suggestion, rewrite, related product search.
- Product helpers: ML product sync, product-to-API mapping, cached SKU extraction.
- Safety helpers: tenant final filtering, payload protection, unanswerable question marking.

Webhook handlers:

- `mercadolivre_notifications` receives and validates ML notifications.
- It skips non-question topics and duplicates.
- It schedules `run_mercadolivre_sync_background`.
- Background sync must use seller mapping to choose the tenant.

Import endpoints:

- `POST /integrations/mercadolivre/questions/import-history` is the approved historical import path.
- `GET /debug/ml/questions/answered` and `GET /debug/ml/questions/answered-date-range` are diagnostic only.

## Performance Stabilization Phase

Current strategy:

- The local database is the source of truth for `/questions`.
- `/questions` must query local `questions` only, with tenant filtering, pagination, and cached enrichment.
- Live Mercado Livre answered-history merge is not part of `/questions`.
- Real-time updates come from webhooks.
- Historical answered data comes from manual import.
- Products are cached locally and refreshed through product sync.

Do not re-enable unsafe live merge in `GET /questions`.

Why:

- Live history merge increased latency.
- Live merge created tenant-leak risk when external data was not strictly company-scoped.
- Local DB pagination is more predictable and keeps the UI fast.
- Manual import and webhook sync provide clearer operational boundaries.

Current pagination:

- Backend defaults to `page=1` and `page_size=20`.
- Maximum `page_size` is 100.
- Response shape is `{ items, total, page, page_size, has_more }`.

Caching strategy:

- Questions: local DB canonical store.
- Products: `products_cache` keyed by `(company_id, provider, external_id)`.
- Buyers: short-lived in-process buyer cache for ML buyer enrichment.
- Webhook dedupe: in-memory processed-notification cache.

Planned optimizations:

- Add stronger DB indexes if query volume grows.
- Move webhook dedupe to persistent storage or Redis.
- Add background product sync observability.
- Add cursor-based pagination if offset pagination becomes insufficient.
- Add job queue for imports and large syncs.
- Reduce frontend render work for very large inboxes.

## Environment Variables

Backend (`backend/.env` or Render environment):

| Variable | Purpose |
| --- | --- |
| `ENVIRONMENT` | Runtime environment label. |
| `PORT` | Backend port. Render usually sets this. |
| `DATABASE_URL` | PostgreSQL/Supabase connection string. Empty uses local SQLite. |
| `DB_POOL_SIZE` | SQLAlchemy pool size for PostgreSQL. |
| `DB_MAX_OVERFLOW` | SQLAlchemy pool overflow. |
| `DB_POOL_TIMEOUT` | SQLAlchemy pool timeout seconds. |
| `DB_POOL_RECYCLE` | SQLAlchemy pool recycle seconds. |
| `DB_USE_NULLPOOL` | Use SQLAlchemy `NullPool`; useful for unstable Supabase pooler scenarios. |
| `SUPABASE_URL` | Supabase project URL used for real Auth JWT issuer validation and ES256 JWKS lookup. Required when bearer tokens are accepted. |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret used only to validate legacy HS256 bearer access-token signatures. Not required for current ES256 Supabase signing keys. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key. Backend only. Never expose in frontend. |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins. |
| `CORS_ORIGIN_REGEX` | Optional regex for Vercel previews. |
| `OPENAI_API_KEY` | OpenAI API key for suggestions and rewrites. |
| `OPENAI_MODEL` | OpenAI model used by AI endpoints. |
| `MERCADO_LIVRE_CLIENT_ID` | Legacy/alternate ML OAuth client ID. |
| `MERCADO_LIVRE_CLIENT_SECRET` | Legacy/alternate ML OAuth client secret. |
| `MERCADO_LIVRE_REDIRECT_URI` | Legacy/alternate ML OAuth redirect URI. |
| `ML_CLIENT_ID` | Mercado Livre OAuth client ID. |
| `ML_CLIENT_SECRET` | Mercado Livre OAuth client secret. |
| `ML_REDIRECT_URI` | Mercado Livre OAuth redirect URI. Must match the ML app exactly. |
| `ML_ENABLE_ANSWERED_BACKFILL` | Keep `false` in production. Do not use to re-enable live merge in `/questions`. |
| `ML_PORTAL_ANSWERED_LOOKBACK_DAYS` | Lookback for portal answered diagnostics/import helpers. Default 15. |
| `FRONTEND_URL` | Frontend URL used after OAuth callback. |
| `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` | Reserved/future external data integration configuration. |

Frontend (`frontend/.env` or Vercel environment):

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Public backend API base URL. |
| `VITE_SUPABASE_URL` | Public Supabase project URL. When set with `VITE_SUPABASE_ANON_KEY`, the frontend shows the login screen and uses Supabase sessions. |
| `VITE_SUPABASE_ANON_KEY` | Public Supabase anon key for browser login. This is not the backend service role key. |
| `VITE_APP_NAME` | Public app display name. |

Frontend variables must be public and prefixed with `VITE_`. Secrets belong only in backend environment variables.

## Deployment Architecture

Render:

- Hosts the FastAPI backend.
- Root directory: `backend`.
- Build command: `pip install -r requirements.txt`.
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
- Configure backend secrets and `CORS_ORIGINS`.

Vercel:

- Hosts the Vite frontend.
- Root directory: `frontend`.
- Build command: `npm run build`.
- Output directory: `dist`.
- Configure `VITE_API_URL` to the Render backend URL.

Supabase:

- Hosts PostgreSQL.
- `DATABASE_URL` points to the Supabase Postgres connection string.
- SQLAlchemy creates/backfills schema on backend startup.

GitHub:

- Source repository and deployment source for Render/Vercel.
- Keep README updates committed with architecture-impacting changes.

## Current Implemented Features

- Multi-company seed data for CPAP Express, Indusat, and Zasweb.
- Platform-admin company selector.
- Supabase Auth frontend login readiness with mock-admin fallback when frontend auth env vars are missing.
- Logout through the top-left app icon user menu (shows user/company context and `Sair`).
- Tenant-aware `X-Company-ID` request flow.
- Tenant filtering on backend query and frontend render paths.
- Mercado Livre OAuth connection.
- Token storage and refresh handling.
- Mercado Livre manual question sync.
- Mercado Livre question webhook receiver.
- Mercado Livre product sync and product cache.
- Manual Mercado Livre answered-history import.
- Local DB-backed inbox with pagination.
- Grouped conversations by buyer/product.
- AI suggestion generation and regeneration.
- AI rewrite flow with custom instruction.
- Manual edit and version selection in conversation view.
- Send answer to Mercado Livre.
- Already-answered portal handling.
- Unanswerable/blocked question handling.
- App vs portal answered-source display/filtering.
- Company-specific AI settings.
- Integration health cards.
- Basic analytics counts.
- Tenant isolation regression test.

## Pending Roadmap

- Enforced Supabase JWT validation and user/company mapping.
- Real authorization roles beyond the current mock `platform_admin`.
- Per-company onboarding flow.
- Notifications for new questions, failed syncs, and answered/blocked states.
- PWA/mobile app experience.
- Improved analytics and operational dashboards.
- Marketplace expansion beyond Mercado Livre.
- Robust background job queue.
- Persistent webhook deduplication.
- Better audit logs for answer approvals and edits.
- Production-grade monitoring and alerting.
- Customer/company billing and plan enforcement.

## Known Resolved Issues

Tenant leak issue:

- Resolved by enforcing `company_id` on backend queries and frontend rendering.
- `GET /questions` filters by active company.
- Frontend drops any wrong-tenant payloads before metrics, grouping, and rendering.
- Regression coverage exists in `backend/tests/test_tenant_isolation_simple.py`.

Portal history issue:

- Resolved by moving historical answered data into explicit manual import instead of live merging into `/questions`.
- Portal answers are marked with `answered_source = "portal"`.
- App answers are preserved as `answered_source = "app"` and should not be overwritten by portal imports.

Grouped conversation bugs:

- Resolved by grouping around buyer/product identity and choosing the newest pending question as the editable target.
- Counters and cards are derived after tenant filtering.
- Conversation detail renders chronological messages for the group.

## Operational Guidelines

These rules are important:

- Never re-enable unsafe live history merge in `GET /questions`.
- Treat the local DB as the source of truth for the inbox.
- Use manual Mercado Livre import for historical answered questions.
- Treat Mercado Livre webhooks as the source of real-time question sync.
- Keep tenant isolation keyed by `company_id` in every query, upsert, cache lookup, and response.
- Preserve `X-Company-ID` flow until real authentication replaces it.
- Route webhooks by `seller_id`; never infer the tenant from defaults when processing webhook writes.
- Do not expose backend secrets in frontend env vars.
- Keep app answers and portal answers distinct through `answered_source`.
- Do not overwrite existing AI suggestions unless the user explicitly regenerates or edits them.
- Keep product data cached locally and use cache lookups for UI and AI context.

## Troubleshooting

### `AUTH_INVALID_TOKEN` on authenticated API calls

If the frontend login succeeds but backend API calls return `401` with `AUTH_INVALID_TOKEN`:

- For ES256 tokens, check that Render has the correct `SUPABASE_URL`; the backend fetches signing keys from `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` and logs `AUTH_JWKS_FETCHED`, `AUTH_JWKS_CACHE_HIT`, or `AUTH_JWT_KID_NOT_FOUND` without exposing tokens or secrets.
- For legacy HS256 tokens, check that Render has the correct `SUPABASE_JWT_SECRET` for the Supabase project. A wrong secret must fail signature validation and still return `401`.
- Check the token header `alg`; the backend accepts current Supabase ES256 tokens through JWKS and legacy HS256 tokens through `SUPABASE_JWT_SECRET`.
- Check the token payload `aud`; valid Supabase user access tokens commonly use `authenticated`, and the backend accepts that audience rather than requiring the project URL.
- Check the token payload `iss`; it should match `SUPABASE_URL + "/auth/v1"` after normalizing trailing slashes.
- Use `GET /debug/auth-token` with the same `Authorization: Bearer <token>` header to inspect only safe decoded diagnostics. This endpoint never returns the token or backend secrets.

## Local Development

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Local URLs:

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`

## Testing

Current lightweight tenant isolation test:

```bash
cd backend
python -m pytest tests/test_tenant_isolation_simple.py
```

Add tests whenever changing tenant isolation, question listing, Mercado Livre sync/import, webhook routing, or grouped conversation behavior.


## PWA install support (mobile)

- The frontend now ships a web app manifest at `frontend/public/manifest.webmanifest` with standalone display mode and app metadata for install prompts.
- A minimal service worker at `frontend/public/sw.js` caches only the app shell/static assets and explicitly uses network/no-store behavior for API-related requests.
- API responses, Mercado Livre data, and Supabase auth responses are not stored in the service worker cache.
- Frontend service worker registration happens only in production after `window.load` to avoid development interference.
- An optional `Instalar app` hint appears only when `beforeinstallprompt` is available and is hidden after interaction.

### Android/Chrome install test checklist

1. Build and deploy the frontend with HTTPS.
2. Open the app in Chrome on Android and log in normally.
3. Confirm Chrome shows install affordance (or use menu > "Install app").
4. Install the app and open it from launcher.
5. Verify it opens in standalone/fullscreen mode and uses the same backend/auth session.
6. In DevTools Application tab, validate `manifest.webmanifest` and active service worker.
7. Confirm question/API refresh still comes from network (no stale API cache from SW).

## Notification readiness (safe first version)

- Frontend now tracks tenant-scoped pending-question increases from `GET /questions` responses and shows an in-app Inbox badge/count without changing Mercado Livre answered/read state.
- When pending count increases while app is open, frontend shows a grouped/debounced notice: `Nova pergunta recebida` (with product title when available).
- Users can enable browser notifications from the app menu (`Ativar notificações`), which requests `Notification` permission only while browser permission is still undecided.
- Browsers do not allow apps to re-trigger the permission popup after notification permission is denied; this is expected browser behavior, especially on Android Chrome and installed PWAs.
- When permission is blocked, the app follows the same settings/help flow used by native apps: the menu shows friendly notification status, an `Abrir configurações` action, and compact guidance to re-enable notifications in browser site permissions or installed app settings.
- When browser permission is granted, the app supports local enable/disable with the `notifications_enabled=true/false` preference without trying to revoke browser permission.
- If browser permission is granted and the local app preference is enabled, the app emits local browser notifications while open (`Nova pergunta no Marketplace`) using product title or question preview in the body.
- Backend groundwork added: `push_subscriptions` table and protected placeholder endpoints:
  - `POST /notifications/push/subscribe`
  - `DELETE /notifications/push/unsubscribe`
- Subscription endpoints are auth-protected and tenant-scoped:
  - `platform_admin` may subscribe/unsubscribe per selected `company_id`
  - company-scoped users are limited to their own `company_id`
- Web Push delivery from Mercado Livre webhook is intentionally not enabled yet.
  - TODO kept in webhook flow: send Web Push for subscribed users per `company_id` only when full Web Push sending is implemented safely.

## 2026-05-19 Audit & Safe Cleanup Notes

This session performed a security/performance/cleanup audit with low-risk changes only, preserving behavior and tenant isolation rules.

### Security and tenant isolation checks

- Kept existing backend tenant/auth resolution model unchanged (`get_current_user`, `get_current_company_id`, role-based company switching only for `platform_admin`).
- Confirmed `GET /questions` remains local-DB only and manual history import stays on `POST /integrations/mercadolivre/questions/import-history`.
- Confirmed no re-enable of live Mercado Livre history merge in `GET /questions`.
- Confirmed service worker policy remains API/network-no-store safe (no auth/API cache persistence).

### Safe cleanup implemented

- Removed temporary debug UI labels from production view:
  - `Empresa atual`
  - `Perguntas carregadas`
  - `Perguntas visíveis`
  - `Notif UI v2`
- Reduced noisy frontend debug logging (`console.log`) while keeping error logging paths.
- Reduced noisy backend buyer enrichment `print(...)` traces and large sample dumps; preserved core structured backend logs for auth/tenant/performance flows.

### Known limitations (unchanged)

- Some debug routes still exist and should remain restricted operationally.
- Buyer enrichment remains best-effort and may fallback when Mercado Livre user APIs fail.
- Deprecated `datetime.utcnow()` warnings exist in tests and can be migrated later to timezone-aware datetime in a separate low-risk maintenance task.
