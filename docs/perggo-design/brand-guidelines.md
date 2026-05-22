# Perggo — Brand Guidelines

## 1. Product name

The official product name is:

**Perggo**

Spelling rule:

- Always write **Perggo** with two “g”.
- Do not write Pergo, PergGo, Pergoo, Perggo AI, Marketplace AI Inbox, or Marketplace AI as the visible app name.
- “Marketplace AI Inbox” may remain only in internal legacy code names if changing them would create unnecessary risk.

## 2. Brand meaning

Perggo is a SaaS/PWA app for marketplace sellers.

The app helps sellers:

- Centralize customer questions from marketplaces.
- Generate AI-assisted answer suggestions.
- Edit, approve and send answers faster.
- Keep answer history by marketplace, product, user and company.
- Manage multiple companies with tenant isolation.

Brand idea:

**Perggo = perguntas + go**

Meaning:

- Questions moving faster.
- Marketplace inbox with speed.
- AI-assisted answering without losing human approval.

## 3. Official slogan

Primary slogan:

**O inbox inteligente dos marketplaces**

Use this slogan consistently in splash, login, presentation screens and marketing material.

Do not randomly replace it with other slogans.

Allowed secondary explanation, only when useful:

**perguntas + go**

## 4. Tone of voice

Perggo should sound:

- Professional.
- Simple.
- Trustworthy.
- Fast.
- Helpful.
- Human, not robotic.

Use Portuguese-BR in the product UI.

Avoid:

- Technical jargon for end users.
- Raw API terms.
- Raw permission values.
- Internal system names.
- Stack traces.
- JSON or database field names in visible UI.

Examples of good product copy:

- “Nova pergunta recebida”
- “Resposta enviada com sucesso”
- “Não foi possível carregar suas perguntas”
- “Ver status das integrações”
- “Definir nova senha”
- “Escolha a empresa que deseja acessar”

Examples to avoid:

- “granted”
- “denied”
- “default”
- “auth_user_id”
- “access_scope”
- “tenant error”
- “undefined”
- “Failed to fetch”

## 5. Visual style

Perggo should have a premium, clean, iOS-inspired visual style.

Visual direction:

- Light interface.
- White, blue and lavender tones.
- Soft gradients.
- Rounded cards.
- Subtle borders.
- Gentle shadows.
- Generous spacing.
- Clean hierarchy.
- Mobile-first layout.

Avoid:

- Heavy dark backgrounds.
- Harsh shadows.
- Visual clutter.
- Too many competing colors.
- Excessive blur that can affect mobile performance.

## 6. Main colors

Primary gradient:

- Blue to purple.
- Used for primary buttons, selected states and important highlights.

Suggested color intent:

- Blue/Purple: primary action, AI, active state.
- Green: success, answered, connected.
- Orange/Red: priority, alert, error risk.
- Gray/Blue-gray: secondary text, inactive icons, borders.
- White/Very light lavender: backgrounds and cards.

Do not introduce a new color system without updating this document.

## 7. Logo usage

The Perggo logo/icon represents:

- Marketplace/cart movement.
- Inbox/message.
- Customer questions.
- Fast response.

Rules:

- Do not redraw or reinterpret the logo.
- Do not change its concept.
- Do not replace the cart/message symbol with another icon.
- Keep the blue-purple gradient.
- Keep proportions close to the approved reference.
- Use the icon in compact headers.
- Use full wordmark “Perggo” mainly on splash, loading, login and password screens.

If an exact logo asset exists in the project, reuse it instead of recreating it.

## 8. Typography

The Perggo wordmark can use the provided logo typography.

For app UI:

- Prioritize readability.
- Use system/web-safe fonts unless a specific approved font is already configured.
- Titles may have a premium serif-like style when already implemented safely.
- Body text, forms, buttons and cards must remain highly readable on mobile.

Do not add external fonts without explicit approval.

## 9. Navigation

The main mobile navigation must have only four bottom tabs:

1. Início
2. Pendentes
3. Respondidas
4. Mais

Rules:

- Do not bring back the old many-icon top navigation as the primary navigation.
- Admin and configuration screens must be inside “Mais” or accessible only through role-based flows.
- Navigation must respect user role and company access.

## 10. Role-based visibility

Perggo has different user roles.

General rule:

- Users should only see screens and actions allowed for their role.

Operator:

- Can see operational screens.
- Can answer questions if allowed.
- Should not see platform admin tools.

Company admin:

- Can manage company-level settings and users when allowed.

Platform admin:

- Can manage platform-level users and companies.
- Can switch companies only when allowed by backend access rules.

Never rely only on frontend visibility for security.

## 11. Multi-company and tenant isolation

Perggo is multi-tenant.

Rules:

- Company isolation is mandatory.
- A user must only see data from companies they are allowed to access.
- All operational data must remain scoped by company.
- Platform admin access must respect allowed company scope.
- Do not expose another company’s questions, products, settings, users or integrations.
- Do not trust frontend-only filtering as the only security layer.

When working on screens, always preserve tenant/company filtering.

## 12. Main product screens

Current planned mobile screen map:

1. Splash screen
2. Initial loading screen
3. Login
4. Define new password
5. Company selection
6. Home / Summary
7. Pending questions
8. Question detail
9. Edit answer
10. Rewrite with AI
11. Answered questions
12. High priority
13. Product detail
14. Integrations
15. AI rules
16. Notifications center
17. Search and filters
18. Settings
19. Users and team
20. Error / offline state

Do not implement all screens at once. Work screen by screen.

## 13. UX states

Every screen should handle:

- Loading state.
- Empty state.
- Error state.
- Success/confirmation state when relevant.

Examples:

Loading:

- “Buscando novidades dos marketplaces...”
- “Sincronizando suas perguntas...”

Empty:

- “Nenhuma pergunta pendente no momento.”
- “Você está em dia.”

Error:

- “Não foi possível carregar suas perguntas.”
- “Verifique sua conexão ou tente novamente.”

Success:

- “Resposta enviada com sucesso.”
- “Usuário convidado com sucesso.”
- “Regras salvas com sucesso.”

## 14. Marketplace status language

For integrations:

Use clear user-facing statuses:

- Conectado
- Reconectar
- Token válido
- Token expirado
- Em breve
- Última sincronização

Avoid exposing internal token details.

## 15. Notification language

Visible notification UI should use:

- Notificações Ativas
- Notificações Inativas
- Nova pergunta recebida
- Resposta enviada com sucesso
- Token expirou
- Erro ao sincronizar perguntas

Do not show:

- granted
- denied
- default
- Notification.permission

## 16. AI answer rules

Perggo assists the user, but the user stays in control.

UI language should make clear:

- “Resposta sugerida pela IA”
- “Editar resposta”
- “Refazer com IA”
- “Aprovar e responder”

Do not imply fully autonomous sending unless that feature is explicitly implemented and approved.

## 17. Development rules for future tasks

For every future UI implementation:

- Use this document as the source of truth for brand and product language.
- Preserve existing backend behavior unless explicitly requested.
- Preserve auth, tenant isolation and role rules.
- Use real existing API data when available.
- Do not create hardcoded mock data where real data already exists.
- Keep diffs small and focused.
- Do not rename the product.
- Do not change the slogan.
- Do not change the navigation model without approval.

## 18. Current implementation priority

Recommended order:

1. Apply Perggo base visual identity.
2. Rework login and password screens.
3. Rework main shell and bottom navigation.
4. Rework Home / Summary.
5. Rework Pendentes.
6. Rework Question Detail.
7. Rework Edit Answer.
8. Rework Rewrite with AI.
9. Rework Respondidas.
10. Rework Mais / Settings / Admin screens.

Each step must be tested before moving to the next one.
