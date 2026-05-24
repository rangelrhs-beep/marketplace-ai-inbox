# 03 — Components

## Objective

Define a reusable Perggo component inventory mapped to official screens, so later implementation is consistent and incremental.

## Component inventory

### C01 — App Shell

Purpose:

- Header region + content container + bottom navigation scaffold.

Key rules:

- Mobile-first spacing.
- Supports global loading transitions.
- Must not leak stale tenant/user context.

Screens:

- 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 18, 19, 26, 27.

---

### C02 — Bottom Tab Bar (4 tabs)

Tabs:

- Início, Pendentes, Respondidas, Mais.

Rules:

- Only these four tabs as primary navigation.
- Active/inactive states using Perggo visual language.

Screens:

- Operational shell screens (06 onward where applicable).

---

### C03 — Brand Header Block

Purpose:

- Display Perggo icon/logo/wordmark and optional slogan.

Assets:

- `perggo-icon-source.png`
- `perggo-logo-source.png`
- `perggo-wordmark-source.png`

Screens:

- 01, 02, 03, 04 and selected auth/confirmation states.

---

### C04 — Summary Stat Card

Purpose:

- Show concise KPI counts (Pendentes, Respondidas, Alta prioridade, Erros de sincronização).

Screens:

- 06.

---

### C05 — Question Card

Purpose:

- Preview operational question item with marketplace/product/question/priority/time metadata.

Screens:

- 07, 11, 12, optionally 06 (latest questions).

---

### C06 — Product Context Card

Purpose:

- Product context for answer workflow (image/title/price/stock/sku/listing link).

Screens:

- 08, 09, 10, 13.

---

### C07 — AI Suggestion Card

Purpose:

- Show suggested answer and related actions.

Screens:

- 08, 09, 10.

---

### C08 — Input Controls

Includes:

- text input, password input, textarea, password visibility toggle.

Screens:

- 03, 04, 09, 10, 15, 18, 26.

---

### C09 — Buttons and CTA Set

Variants:

- primary, secondary, destructive/caution, text action.

Screens:

- all interactive screens.

---

### C10 — Chips / Quick Filters

Purpose:

- Fast filtering and contextual scope changes.

Screens:

- 07, 11, 12, 17.

---

### C11 — Status Badges

Purpose:

- Show priority/state/connection statuses.

Screens:

- 07, 08, 11, 12, 14, 25.

---

### C12 — Notification Item

Purpose:

- In-app notification center item with timestamp and action.

Screens:

- 16.

---

### C13 — User/Company Management Row

Purpose:

- User list/company details rows with role/status indicators.

Screens:

- 19, 26, 27.

---

### C14 — Empty / Error / Offline Blocks

Purpose:

- Standardized UX states with action buttons.

Screens:

- 20 and any operational screen state variant.

---

### C15 — Confirmation Blocks / Modals

Purpose:

- Success and protective confirmations.

Screens:

- 21, 22, 23, 24.

## Component-state matrix (required in implementation)

Future implementation should ensure each relevant component supports:

- loading where data-bound
- empty where list-dependent
- error with retry/helpful action
- success state where transactional

## Behavior safety rule

Component implementation must preserve existing backend-driven behavior and tenant isolation rules; this document defines UI structure only.
