# Perggo — Screen Map

## Purpose

This document defines the official planned mobile screen map for Perggo (27 screens/states).

Use it together with:

- `docs/perggo-design/brand-guidelines.md`

Future implementation tasks must follow this file to avoid UI drift, inconsistent naming, missing screens or wrong navigation behavior.

## Global navigation model

Perggo mobile must use four main bottom tabs:

1. **Início**
2. **Pendentes**
3. **Respondidas**
4. **Mais**

Rules:

- Do not bring back the previous many-icon top navigation as the main navigation.
- The old top icon navigation should be removed or replaced during the UI redesign.
- Admin/configuration screens must live under **Mais** or be reached through role-based flows.
- Navigation must respect role permissions.
- Users must not see screens they cannot access.
- Backend authorization remains the source of truth.

## Global screen states

Every operational screen should support:

- Loading state
- Empty state
- Error state
- Success/confirmation state when relevant

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

---

# 1. Splash Screen

## Purpose

Quick opening screen when the app starts.

## When it appears

Immediately when the PWA/app opens.

## Required content

- Perggo logo/icon
- Wordmark: Perggo
- Slogan: “O inbox inteligente dos marketplaces”
- Clean premium background
- Optional subtle loading cue

## Notes

Do not show marketplace logos here unless using the loading screen variant.

---

# 2. Initial Loading Screen

## Purpose

Shown while the app verifies login, company access and integrations.

## Required content

- Perggo logo/icon
- Wordmark: Perggo
- Marketplace logos row when useful:
  - Mercado Livre
  - Shopee
  - Magalu
  - Amazon
- Loading message:
  - “Preparando sua central de respostas...”
  - or “Buscando novidades dos marketplaces...”

## Technical behavior

This screen should be used while auth/session and tenant/company context are loading.

Do not show stale user/company data from a previous session.

---

# 3. Login Screen

## Purpose

Allows the user to enter the app.

## Required content

- Perggo logo/icon
- Wordmark: Perggo
- Title: “Bem-vindo de volta”
- Subtitle: “Entre para acessar sua central de respostas”
- Fields:
  - E-mail
  - Senha
- Actions:
  - Entrar
  - Esqueci minha senha
  - Criar conta
  - Fui convidado

## UX rules

- Do not expose technical errors raw.
- Translate backend/auth errors into user-friendly Portuguese.
- Keep password visibility toggle.
- Keep mobile-first spacing and large touch targets.

---

# 4. Define New Password Screen

## Purpose

Used for invite and password recovery flows.

## Required content

- Perggo logo/icon
- Wordmark: Perggo
- Title: “Definir nova senha”
- Subtitle: “Crie uma senha segura para acessar sua conta.”
- Fields:
  - Nova senha
  - Confirmar senha
- Action:
  - Salvar nova senha
- Helper text:
  - “Depois de salvar, você poderá acessar sua empresa no Perggo.”

## Technical behavior

Must work with Supabase invite/recovery callback links.

After saving password successfully, redirect user to login or authenticated app flow as appropriate.

---

# 5. Company Selection Screen

## Purpose

Allows users with access to more than one company to select the company context.

## When it appears

Only when the logged-in user has access to more than one company.

## Required content

- Title: “Selecione sua empresa”
- Subtitle: “Escolha a empresa que você deseja acessar no Perggo.”
- Company cards with:
  - company name
  - CNPJ when available
  - icon/avatar
  - selected indicator
- Action:
  - Continuar

## Technical behavior

- Must use backend-allowed companies.
- Do not show companies the user cannot access.
- Selected company must be sent through existing company context logic.
- If user has one company only, skip this screen.

---

# 6. Home / Summary Screen

## Purpose

Main dashboard after login.

## Required content

- Greeting:
  - “Olá, {nome}”
- Subtitle:
  - “Aqui está o resumo da sua operação hoje.”
- Summary cards:
  - Pendentes
  - Respondidas
  - Alta prioridade
  - Erros de sincronização
- Section:
  - “Últimas perguntas recebidas”
- Action:
  - Ver pendentes

## Data

Use real existing questions/status data when available.

## Navigation

Bottom tab selected: Início.

---

# 7. Pending Questions Screen

## Purpose

Main operational screen for unanswered questions.

## Required content

- Title: “Pendentes”
- Subtitle: “Perguntas aguardando resposta”
- Search icon
- Filter icon
- Quick chips:
  - Todos
  - Mercado Livre
  - Shopee
  - Amazon
  - Alta prioridade
- Question cards with:
  - marketplace
  - product title
  - customer question
  - time since received
  - priority badge
- Actions per card:
  - Ver resposta
  - Aprovar

## Data

For current implementation, Mercado Livre is the active marketplace.

Shopee, Magalu and Amazon may appear only as future/placeholder if not connected.

## Navigation

Bottom tab selected: Pendentes.

---

# 8. Question Detail Screen

## Purpose

Main work screen to review and answer a question.

## Required content

- Product card:
  - marketplace
  - product image
  - product title
  - price
  - stock
  - SKU
  - link to listing
- Customer question card
- AI suggested answer card
- Actions:
  - Aprovar e responder
  - Editar resposta
  - Refazer com IA
- Optional:
  - Histórico do produto

## Technical behavior

- Approve must send the answer through existing backend flow.
- If the question was already answered elsewhere, show:
  - “Resposta já realizada por outro usuário”
- Do not send duplicate answers.

---

# 9. Edit Answer Screen

## Purpose

Allows user to manually edit AI suggested response.

## Required content

- Product/question summary card
- Large editable text area
- Character count
- Section:
  - “Peça para a IA ajustar:”
- Quick actions:
  - Mais técnica
  - Mais curta
  - Mais simpática
  - Mais objetiva
- Actions:
  - Aprovar e responder
  - Salvar alteração
  - Cancelar

## Technical behavior

Manual edits should preserve the edited answer until approved or cancelled.

---

# 10. Rewrite With AI Screen

## Purpose

Allows user to request a new version by prompt.

## Required content

- Product/question summary card
- Prompt text area:
  - “Escreva como deseja alterar a resposta”
- Examples/suggestions:
  - “Deixe mais técnica”
  - “Explique que não aceitamos devolução após abrir”
  - “Fale de forma mais curta e educada”
  - “Mais objetiva”
- Action:
  - Gerar nova resposta
- Result card:
  - “Nova resposta gerada pela IA”
- Final actions:
  - Manter original
  - Usar nova resposta

## Technical behavior

Must use the existing AI rewrite endpoint when available.

Do not mention OpenAI or internal model names in the UI.

---

# 11. Answered Questions Screen

## Purpose

Shows answer history.

## Required content

- Title: “Respondidas”
- Subtitle: “Perguntas já respondidas”
- Filters:
  - Hoje
  - 7 dias
  - 15 dias
  - 30 dias
- Cards with:
  - marketplace
  - product
  - question
  - answer sent
  - date/time
  - source badge:
    - Respondida pelo app
    - Respondida no portal

## Important behavior

If a question was answered directly in Mercado Livre portal, it must appear here as:

**Respondida no portal**

and must be removed from Pendentes.

## Navigation

Bottom tab selected: Respondidas.

---

# 12. High Priority Screen

## Purpose

Shows questions requiring faster attention.

## Criteria examples

- Product compatibility questions
- Delivery risk questions
- Complaint-risk questions
- Expensive products
- Low stock
- Question pending too long

## Required content

- Title: “Prioridade alta”
- Subtitle: “Perguntas que exigem atenção rápida”
- Filter chips:
  - Todas
  - Compatibilidade
  - Entrega
  - Reclamação
  - Estoque baixo
- Cards with risk tags
- Actions:
  - Responder agora
  - Marcar como normal

---

# 13. Product Detail Screen

## Purpose

Shows product information to help answer questions.

## Required content

- Product image
- Product title
- SKU
- Marketplace
- Price
- Stock
- Listing link
- Category/status badges
- Section:
  - “Últimas perguntas desse produto”
- Section:
  - “Produtos relacionados sugeridos pela IA”

## Technical behavior

Use cached product data when available.

Future rule:
Update only the product related to the question and suggested related products when needed, without heavy full sync.

---

# 14. Integrations Screen

## Purpose

Shows marketplace connection status.

## Required content

Cards for:

- Mercado Livre
- Shopee
- Magalu
- Amazon

Each card should show:

- Status:
  - Conectado
  - Em breve
  - Token expirado
- Last sync
- Token status
- Expiration date when available
- Action:
  - Conectar
  - Reconectar

## Technical behavior

Mercado Livre is active first.

Other marketplaces may remain “Em breve” until implemented.

---

# 15. AI Rules Screen

## Purpose

Allows configuration of how the AI should answer.

## Required sections

- Saudação padrão
- Despedida padrão
- Regras da loja
- O que nunca prometer
- Política de garantia
- Política de nota fiscal
- Política de compatibilidade

## Actions

- Salvar regras
- Restaurar padrão

## Technical behavior

Must connect to existing company settings/rules flow.

Rules are company-specific.

---

# 16. Notifications Center Screen

## Purpose

Shows app notification history.

## Required content

Filters:

- Todas
- Hoje
- Importantes

Notification examples:

- Nova pergunta recebida
- Resposta enviada com sucesso
- Token do Mercado Livre expirou
- Erro ao sincronizar perguntas
- IA não conseguiu gerar resposta

## Notes

This is an in-app notification center.

It is separate from Android/browser push permission, but should align with it.

---

# 17. Search and Filters Sheet

## Purpose

Bottom sheet or panel to filter lists.

## Required filters

- Search by product or question
- Marketplace
- Status
- Priority
- Period
- Product
- Origin:
  - Respondida pelo app
  - Respondida no portal
- Error:
  - Com erro
  - Sem erro

## Actions

- Limpar filtros
- Aplicar filtros

---

# 18. Settings Screen

## Purpose

Main settings hub.

## Required items

- Minha conta
- Empresa
- Usuários
- Integrações
- Regras da IA
- Notificações
- Plano e cobrança
- Sair

## Navigation

Located under Mais tab.

Visibility must respect role permissions.

---

# 19. Users and Team Screen

## Purpose

Allows admins to manage users.

## Required content

- User list cards with:
  - name
  - email
  - role badge
  - account owner badge when applicable
- Roles:
  - Administrador
  - Atendente
  - Visualizador
- Actions:
  - Convidar usuário
  - Remover acesso
  - Editar when allowed
  - Desativar/Reativar when allowed

## Technical behavior

Must use existing admin user APIs.

Must preserve:

- last platform_admin protection
- disabled user blocking
- role-based visibility
- company access rules

Do not expose internal fields like auth_user_id.

---

# 20. Error / Offline Screen

## Purpose

Shown when a major load fails.

## Required content

- Title:
  - “Erro de conexão”
- Message:
  - “Não foi possível carregar suas perguntas.”
- Explanation:
  - “Verifique sua conexão com a internet ou tente novamente em alguns instantes.”
- Last sync when available
- Actions:
  - Tentar novamente
  - Ver status das integrações
  - Voltar para início

---

## Implementation principle

Do not implement all screens in one task.

Use this order:

1. Base shell/layout and navigation
2. Splash/loading/login/password screens
3. Company selection
4. Home
5. Pendentes
6. Question detail
7. Edit answer
8. Rewrite with AI
9. Respondidas
10. High priority
11. Product detail
12. Integrations
13. AI rules
14. Notifications center
15. Search/filter sheet
16. Settings
17. Users/team
18. Error/offline state

For each implementation task:

- Read `brand-guidelines.md`
- Read this file
- Preserve existing app behavior
- Preserve auth and tenant isolation
- Preserve existing API integrations
- Keep changes small and reviewable
- Do not add mock data when real API data exists
- Report files changed and risks

After creating the file, report:
- Files created.
- Confirmation that no frontend/backend code was changed.
- Any notes or risks.

---

# 21. Invite Accepted / Password Created Screen

## Purpose

Confirms that the user successfully created a password after accepting an invite or password recovery flow.

## When it appears

After the user saves a new password from an invite/recovery link.

## Required content

- Title:
  - “Senha criada com sucesso”
- Message:
  - “Agora você já pode acessar sua empresa no Perggo.”
- Action:
  - “Entrar no Perggo”

## Technical behavior

- Must appear after successful `supabase.auth.updateUser({ password })` when appropriate.
- Should clean callback URL state.
- Should route the user safely to login or authenticated app flow.

---

# 22. Password Recovery Email Sent Screen

## Purpose

Confirms that the password recovery email was requested.

## When it appears

After the user clicks “Esqueci minha senha” and submits an email successfully.

## Required content

- Title:
  - “Enviamos um link para seu e-mail”
- Message:
  - “Verifique sua caixa de entrada e spam.”
- Action:
  - “Voltar ao login”

## Technical behavior

- Do not reveal whether an email exists in the system in a way that creates account enumeration risk.
- Keep message friendly and generic.
- Preserve existing Supabase password recovery flow.

---

# 23. Answer Sent Confirmation Screen / Modal

## Purpose

Confirms that an answer was approved and sent successfully.

## When it appears

After the user approves and sends an answer from the question detail/edit/rewrite flow.

## Required content

- Title:
  - “Resposta enviada com sucesso”
- Details:
  - “Marketplace: Mercado Livre”
  - “Produto: {product_title}”
- Action:
  - “Ver próxima pendente”

## Technical behavior

- Must only appear after backend confirms the answer was sent.
- Should not appear for failed or duplicate sends.
- Should update/remove the question from Pendentes.
- Should keep the answer visible in Respondidas.

---

# 24. Already Answered Elsewhere Screen / State

## Purpose

Handles the case where a question was already answered outside Perggo, such as directly in Mercado Livre or by another attendant.

## Required content

- Title/message:
  - “Resposta já realizada por outro usuário”
- Optional details:
  - “Esta pergunta foi respondida fora do Perggo.”
  - “Ela foi movida para Respondidas.”

## Technical behavior

- The question must leave Pendentes.
- The question must appear in Respondidas with source:
  - “Respondida no portal”
- Do not allow duplicate answer sending.
- Preserve existing portal-answer detection.

---

# 25. Token Expired / Reconnect Marketplace Screen

## Purpose

Shows a clear action when a marketplace token expires or the integration becomes disconnected.

## Required content

- Title:
  - “Mercado Livre desconectado”
- Message:
  - “Para continuar recebendo perguntas, reconecte sua conta.”
- Action:
  - “Reconectar Mercado Livre”

## Technical behavior

- Must use existing integration health/token status.
- Should deep-link or route to integration reconnect flow.
- Do not expose raw token details.
- Future marketplaces should reuse the same pattern.

---

# 26. Company Details Screen

## Purpose

Allows admins to view and edit company-level information.

## Required content

Fields/sections:

- Nome da empresa
- CNPJ
- Logo
- Responsável
- Plano
- Marketplaces conectados
- Usuários vinculados

## Technical behavior

- Must respect role permissions.
- Company admin/platform admin only where allowed.
- Company data is tenant-scoped.
- Editing can be basic initially.
- Do not expose data from other companies.

---

# 27. Plan and Billing Screen

## Purpose

Shows plan and billing information for SaaS readiness.

## Required content

- Plano atual
- Quantidade de usuários
- Marketplaces ativos
- Limite de perguntas/mês
- Action:
  - “Falar com suporte”
  - or “Alterar plano”

## Technical behavior

- Can initially be read-only or marked “Em breve”.
- Must not imply active billing automation unless implemented.
- Should be accessible from Configurações/Mais according to role permissions.

