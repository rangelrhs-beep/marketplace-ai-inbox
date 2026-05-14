import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Check,
  ChevronLeft,
  Clock3,
  ExternalLink,
  Inbox,
  MessageCircle,
  PlugZap,
  RefreshCw,
  Send,
  Settings,
  Sparkles,
  Store,
  ThumbsDown,
  X,
} from "lucide-react";

const API_URL = (import.meta.env.VITE_API_URL || "https://marketplace-ai-backend-ky72.onrender.com").replace(/\/$/, "");
const AI_REWRITE_URL = `${API_URL}/ai/rewrite`;
const SELECTED_COMPANY_STORAGE_KEY = "marketplace_ai_selected_company_id";

function getStoredCompanyId() {
  return localStorage.getItem(SELECTED_COMPANY_STORAGE_KEY) || "cpap_express";
}

function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const companyId = getStoredCompanyId();
  if (companyId) headers.set("X-Company-ID", companyId);
  return fetch(url, { ...options, headers });
}

const navItems = [
  { label: "Inbox", icon: Inbox },
  { label: "Pendentes", icon: Clock3 },
  { label: "Respondidas", icon: Send },
  { label: "Integrações", icon: PlugZap },
  { label: "Analytics", icon: BarChart3 },
  { label: "Configurações", icon: Settings },
];

const initialIntegrations = [
  {
    id: "mercado-livre",
    name: "Mercado Livre",
    shortName: "ML",
    color: "#ffe600",
    status: "Não conectado",
    store: "",
    lastSync: "",
  },
];

const initialIntegrationHealth = [
  {
    id: "mercado-livre",
    channel: "Mercado Livre",
    connected: false,
    api_status: "down",
    last_sync: null,
    last_error: "Aguardando leitura do backend.",
    token_status: "missing",
  },
];

// TODO auth: replace mocked tenant context with data from the backend session.
// TODO admin: allow platform admin company selector.
function getMockTenantContext() {
  return {
    company: { id: "cpap_express", name: "CPAP Express", plan: "Business" },
    user: {
      id: "admin",
      name: "Admin",
      email: null,
      role: "platform_admin",
    },
    permissions: {
      is_platform_admin: true,
      can_switch_company: false,
    },
  };
}

const FALLBACK_TENANT_CONTEXT = getMockTenantContext();

function integrationState(overrides = {}) {
  return initialIntegrations.map((integration) => ({
    ...integration,
    status: "Não conectado",
    store: "",
    lastSync: "",
    token_status: "missing",
    ...overrides[integration.id],
  }));
}

const initialAppData = {
  integrations: integrationState(),
  questions: [],
  aiSettings: {
    ai_general_rules: "",
    ai_product_knowledge: "",
    ai_allow_web_search: false,
    ai_absolute_restrictions: "",
  },
  usageLogs: [],
};

const statusClass = {
  Pendente: "pending",
  Respondida: "answered",
  Rejeitada: "rejected",
  Conectado: "approved",
  "Conectado temporariamente": "pending",
  "Não conectado": "disconnected",
};

const priorityClass = {
  Alta: "high",
  Media: "medium",
  Baixa: "low",
};

function formatDate(value) {
  if (!value) return "";
  const rawValue = String(value);
  const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(rawValue);
  const date = new Date(hasTimezone ? rawValue : `${rawValue}Z`);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function getMarketplaceShortName(marketplace, integrations) {
  return integrations.find((integration) => integration.name === marketplace)?.shortName || marketplace;
}

function getMarketplaceColor(marketplace, integrations) {
  return integrations.find((integration) => integration.name === marketplace)?.color || "#2563eb";
}

function getAnsweredSourceLabel(source) {
  const normalizedSource = normalizeAnsweredSource(source);
  if (normalizedSource === "app") return "Respondida pelo app";
  if (normalizedSource === "portal") return "Respondida pelo portal";
  return "Ainda não respondida";
}

function normalizeAnsweredSource(source) {
  if (source === "mercado_livre_portal") return "portal";
  return source || "";
}

function displayValue(value) {
  return value === undefined || value === null || value === "" ? "Não disponível" : value;
}

function displayOrderValue(value) {
  return value === undefined || value === null || value === "" ? "Não vinculado" : value;
}

function normalizeInstruction(instruction) {
  return instruction
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isDisplayableSku(value, itemId) {
  if (value === undefined || value === null || value === "") return false;
  const sku = String(value).trim();
  if (!sku) return false;
  return !itemId || sku !== String(itemId);
}

function firstDisplayableSku(itemId, ...values) {
  return values.find((value) => isDisplayableSku(value, itemId)) || "";
}

function getBuyerDisplayName(buyer, fallback = "Cliente ML", { detail = false } = {}) {
  if (!buyer) return fallback || "Cliente ML";
  if (detail && buyer.detail_display_name) return buyer.detail_display_name;
  if (buyer.first_name && buyer.nickname) return `${buyer.first_name} (${buyer.nickname})`;
  if (buyer.nickname) return buyer.nickname;
  if (buyer.first_name) return buyer.first_name;
  return buyer.display_name || fallback || "Cliente ML";
}

function getQuestionTimestamp(question) {
  return new Date(question.answered_at || question.created_at || 0).getTime() || 0;
}

function getHighestPriority(questions) {
  if (questions.some((question) => question.priority === "Alta")) return "Alta";
  if (questions.some((question) => question.priority === "Media")) return "Media";
  return questions[0]?.priority || "Baixa";
}

function getConversationGroupKey(question) {
  const buyerId = question.buyer?.id || question.external_customer_id;
  const itemId = question.external_product_id || question.raw_payload?.item_id || question.external_id;
  if (!buyerId || !itemId) return `single:${question.external_id || question.id}`;
  return `${question.channel || question.marketplace}:${itemId}:${buyerId}`;
}

function buildConversationGroups(questions) {
  const groups = new Map();
  questions.forEach((question) => {
    const key = getConversationGroupKey(question);
    const current = groups.get(key) || [];
    current.push(question);
    groups.set(key, current);
  });

  return Array.from(groups.entries()).map(([key, groupQuestions]) => {
    const sorted = [...groupQuestions].sort((a, b) => getQuestionTimestamp(a) - getQuestionTimestamp(b));
    const latest = sorted[sorted.length - 1];
    const hasPending = sorted.some((question) => question.status === "Pendente");
    const allAnswered = sorted.every((question) => question.status === "Respondida");
    const answeredSources = [...new Set(sorted.map((question) => normalizeAnsweredSource(question.answered_source)).filter(Boolean))];
    const priority = getHighestPriority(sorted);
    return {
      ...latest,
      id: `group:${key}`,
      group_key: key,
      questions: sorted,
      question_count: sorted.length,
      status: hasPending ? "Pendente" : allAnswered ? "Respondida" : latest.status,
      answered_source: hasPending ? "" : answeredSources.length === 1 ? answeredSources[0] : "",
      priority,
      question: latest.question,
      created_at: latest.created_at,
      latest_at: latest.answered_at || latest.created_at,
      buyer: latest.buyer || sorted.find((question) => question.buyer)?.buyer || { display_name: "Cliente ML" },
      customer_name: getBuyerDisplayName(latest.buyer, latest.customer_name),
    };
  }).sort((a, b) => getQuestionTimestamp(b) - getQuestionTimestamp(a));
}

function mapMercadoLivreQuestionToUi(question, index) {
  const rawPayload = question.raw_payload || {};
  const cachedProduct = question.cached_product || {};
  const externalId = question.external_id || rawPayload.id || index + 1;
  const externalProductId = question.external_product_id || rawPayload.item_id || rawPayload.item?.id || "";
  const productSku = firstDisplayableSku(
    externalProductId,
    question.product_sku,
    cachedProduct.seller_custom_field,
    cachedProduct.raw_payload?.seller_sku,
    rawPayload.seller_custom_field,
    rawPayload.seller_sku
  );

  return {
    id: question.id || `ml-${externalId}`,
    company_id: "cpap_express",
    marketplace: "Mercado Livre",
    product: question.product || question.product_title || rawPayload.item_id || "Produto Mercado Livre",
    product_title: question.product_title || question.product || rawPayload.item_id || "Produto Mercado Livre",
    product_sku: productSku,
    product_image_url: question.product_image_url || rawPayload.thumbnail || "",
    product_permalink: question.product_permalink || rawPayload.permalink || "",
    product_status: question.product_status || "",
    product_available_quantity: question.product_available_quantity ?? null,
    product_price: question.product_price || "",
    buyer: question.buyer || {
      id: question.external_customer_id || rawPayload.buyer_id || rawPayload.from?.id || null,
      display_name: question.customer_name || "Cliente ML",
    },
    customer_name: getBuyerDisplayName(question.buyer, question.customer_name),
    external_product_id: externalProductId,
    external_order_id: question.external_order_id || rawPayload.order_id || rawPayload.order?.id || "",
    external_customer_id: question.external_customer_id || rawPayload.buyer_id || rawPayload.from?.id || "",
    question: question.question || question.question_text || rawPayload.text || "",
    created_at: question.created_at || rawPayload.date_created || new Date().toISOString(),
    status: question.status || "Pendente",
    priority: "Media",
    ai_suggestion: question.ai_suggestion || "Sugestão ainda não gerada. Clique em gerar nova sugestão.",
    has_ai_suggestion: question.has_ai_suggestion ?? Boolean(question.ai_suggestion),
    sku: productSku,
    price: question.price || question.product_price || "",
    final_answer: question.final_answer || question.final_response || "",
    final_response: question.final_response || question.final_answer || "",
    answered_at: question.answered_at || "",
    answered_source: normalizeAnsweredSource(question.answered_source),
    raw_payload: rawPayload,
    external_id: String(externalId),
    is_real: true,
    channel: "mercado_livre",
  };
}

function isBackendIntegrationConnected(health) {
  if (!health) return false;
  if (typeof health.connected === "boolean") return health.connected;
  return health.token_status === "valid" || health.token_status === "expired";
}

function applyBackendHealthToIntegrations(integrations, healthItems, companyId, companyName = "CPAP Express") {
  const healthById = new Map((healthItems || []).map((health) => [health.id, health]));
  const mercadoLivreHealth = healthById.get("mercado-livre");
  const isMercadoLivreConnected =
    Boolean(companyId) && isBackendIntegrationConnected(mercadoLivreHealth);
  const isTemporaryConnection =
    isMercadoLivreConnected && mercadoLivreHealth?.token_status === "missing_refresh_token";

  return integrations.map((integration) => {
    if (integration.id !== "mercado-livre") {
      return integration;
    }

    return {
      ...integration,
      status: isTemporaryConnection
        ? "Conectado temporariamente"
        : isMercadoLivreConnected
          ? "Conectado"
          : "Não conectado",
      store: isMercadoLivreConnected ? `${companyName} Mercado Livre` : "",
      lastSync: isMercadoLivreConnected ? mercadoLivreHealth?.last_sync || new Date().toISOString() : "",
      token_status: mercadoLivreHealth?.token_status || "missing",
      last_error: mercadoLivreHealth?.last_error || "",
    };
  });
}

function Sidebar({ active, companies, currentCompany, permissions, onCompanyChange, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <Sparkles size={22} />
        </div>
        <div>
          <strong>Marketplace AI</strong>
          <span>Inbox</span>
        </div>
      </div>

      <nav className="nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={`nav-item ${active === item.label ? "active" : ""}`}
              key={item.label}
              onClick={() => onNavigate(item.label)}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-card">
        <span>Operação real</span>
        <strong>ML</strong>
        <p>Perguntas salvas no banco, revisadas com IA e enviadas ao Mercado Livre.</p>
      </div>
    </aside>
  );
}

function CompanySwitcher({ companies, currentCompany, permissions, onChange }) {
  const canSwitch = permissions?.can_switch_company;
  if (!canSwitch || companies.length <= 1) {
    if (canSwitch) console.log("Company selector fallback", { companiesCount: companies.length, companies });
    return (
      <div className="company-title-fallback">
        <span>{currentCompany?.name || "CPAP Express"}</span>
        <small>Empresas carregadas: {companies.length}</small>
      </div>
    );
  }
  return (
    <div className="company-switcher">
      <label>
        <select
          value={currentCompany?.id || "cpap_express"}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Selecionar empresa"
        >
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
        <small>Empresas carregadas: {companies.length}</small>
      </label>
    </div>
  );
}

function IntegrationLogo({ integration }) {
  return (
    <div className="integration-logo" style={{ "--integration-color": integration.color }}>
      <span>{integration.shortName}</span>
    </div>
  );
}

function IntegrationCard({
  integration,
  onConnect,
  onDisconnect,
  onFetchRealQuestions,
  onSyncProducts,
  canFetchRealQuestions,
  isFetchingRealQuestions,
  isSyncingProducts,
  isDisconnecting,
}) {
  const isConnected = integration.status === "Conectado" || integration.status === "Conectado temporariamente";

  return (
    <article className="integration-card">
      <div className="integration-card-top">
        <IntegrationLogo integration={integration} />
        <span className={`integration-status ${statusClass[integration.status] || "soon"}`}>
          {integration.status}
        </span>
      </div>

      <div className="integration-body">
        <h3>{integration.name}</h3>
        {isConnected ? (
          <>
            <p>{integration.store}</p>
            <small>Última sincronização: {formatDate(integration.lastSync)}</small>
            {integration.lastProductsSync ? (
              <small>Último sync de produtos: {formatDate(integration.lastProductsSync)}</small>
            ) : null}
            <small>Token: {integration.token_status || "valid"}</small>
          </>
        ) : (
          <p>Conecte por autorização oficial para importar perguntas e manter a inbox atualizada.</p>
        )}
      </div>

      <div className="integration-actions">
        {isConnected ? (
          <>
            {canFetchRealQuestions ? (
              <button
                className="primary"
                onClick={onFetchRealQuestions}
                disabled={isFetchingRealQuestions}
              >
                <RefreshCw size={17} className={isFetchingRealQuestions ? "spin" : ""} />
                {isFetchingRealQuestions ? "Sincronizando..." : "Sincronizar perguntas"}
              </button>
            ) : null}
            <button
              className="secondary"
              onClick={onSyncProducts}
              disabled={isSyncingProducts}
            >
              <RefreshCw size={17} className={isSyncingProducts ? "spin" : ""} />
              {isSyncingProducts ? "Sincronizando produtos..." : "Sincronizar produtos"}
            </button>
            <button
              className="danger"
              onClick={onDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? <RefreshCw size={17} className="spin" /> : <X size={17} />}
              {isDisconnecting ? "Desconectando..." : "Desconectar"}
            </button>
          </>
        ) : (
          <button className="primary" onClick={() => onConnect(integration)}>
            <ExternalLink size={17} />
            Conectar
          </button>
        )}
      </div>
    </article>
  );
}

function ConnectModal({ integration, onCancel, onConfirm, error }) {
  if (!integration) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="connect-modal" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onCancel} aria-label="Fechar modal">
          <X size={20} />
        </button>
        <IntegrationLogo integration={integration} />
        <span>Conexão segura via OAuth</span>
        <h2>Conectar {integration.name}</h2>
        <p>
          Ao continuar, você será redirecionado para a página oficial de login e autorização do
          marketplace. O Marketplace AI Inbox nunca pede nem armazena sua senha.
        </p>
        {error ? <p className="modal-error">{error}</p> : null}
        <div className="modal-actions">
          <button className="secondary" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="primary" type="button" onClick={() => onConfirm(integration.id)}>
            <ExternalLink size={17} />
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}

function IntegrationsPage({
  currentCompany,
  currentUser,
  integrations,
  integrationHealth,
  onConnect,
  onDisconnect,
  onFetchRealQuestions,
  onSyncProducts,
  onTestHealth,
  fetchingRealQuestions,
  syncingProducts,
  disconnecting,
  testingIntegrationId,
  pendingIntegration,
  connectError,
  onCancelConnect,
  onConfirmConnect,
}) {
  const connectedCount = integrations.filter((item) => item.status === "Conectado").length;
  const temporaryCount = integrations.filter((item) => item.status === "Conectado temporariamente").length;

  return (
    <section className="integrations-page">
      <header className="topbar">
        <div>
          <span>{currentCompany?.name || "CPAP Express"} · Marketplaces e operação</span>
          <h1>Integrações</h1>
        </div>
        <div className="topbar-actions">
          <span className="user-badge">{currentUser?.name || "Admin"}</span>
        </div>
      </header>

      <div className="integration-hero">
        <div>
          <span>Central de canais</span>
          <h2>{connectedCount + temporaryCount} integrações conectadas</h2>
          <p>
            Autorize canais oficiais, sincronize perguntas e deixe a IA pronta para responder sem
            pedir senha do marketplace.
          </p>
        </div>
        <div className="hero-icon">
          <Store size={34} />
        </div>
      </div>

      <div className="integrations-grid">
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
            onFetchRealQuestions={onFetchRealQuestions}
            onSyncProducts={onSyncProducts}
            canFetchRealQuestions={
              integration.id === "mercado-livre" &&
              (integration.status === "Conectado" || integration.status === "Conectado temporariamente")
            }
            isFetchingRealQuestions={fetchingRealQuestions}
            isSyncingProducts={syncingProducts}
            isDisconnecting={disconnecting}
          />
        ))}
      </div>

      <section className="integration-health-section">
        <div className="section-heading">
          <div>
            <span>Monitoramento</span>
            <h2>Integration Health</h2>
          </div>
        </div>

        <div className="health-grid">
          {integrationHealth.map((health) => (
            <article className="health-card" key={health.id}>
              <div className="health-card-top">
                <strong>{health.channel}</strong>
                <span className={`health-status ${health.api_status}`}>{health.api_status}</span>
              </div>
              <dl>
                <div>
                  <dt>Último sync</dt>
                  <dd>{health.last_sync ? formatDate(health.last_sync) : "Ainda não sincronizado"}</dd>
                </div>
                <div>
                  <dt>Token</dt>
                  <dd>{health.token_status}</dd>
                </div>
                <div>
                  <dt>Último erro</dt>
                  <dd>{health.last_error || "Sem erros recentes"}</dd>
                </div>
              </dl>
              <button
                className="secondary"
                onClick={() => onTestHealth(health.id)}
                disabled={testingIntegrationId === health.id}
              >
                <RefreshCw size={17} className={testingIntegrationId === health.id ? "spin" : ""} />
                {testingIntegrationId === health.id ? "Testando..." : "Testar conexão"}
              </button>
            </article>
          ))}
        </div>
      </section>

      <ConnectModal
        integration={pendingIntegration}
        onCancel={onCancelConnect}
        onConfirm={onConfirmConnect}
        error={connectError}
      />
    </section>
  );
}

function SettingsPage({ appData, currentCompany, currentUser, onSettingsSaved }) {
  const savedSettings = {
    ai_general_rules: appData.aiSettings.ai_general_rules || "",
    ai_product_knowledge: appData.aiSettings.ai_product_knowledge || "",
    ai_allow_web_search: Boolean(appData.aiSettings.ai_allow_web_search),
    ai_absolute_restrictions: appData.aiSettings.ai_absolute_restrictions || "",
  };
  const [settingsDraft, setSettingsDraft] = useState({
    ai_general_rules: appData.aiSettings.ai_general_rules || "",
    ai_product_knowledge: appData.aiSettings.ai_product_knowledge || "",
    ai_allow_web_search: Boolean(appData.aiSettings.ai_allow_web_search),
    ai_absolute_restrictions: appData.aiSettings.ai_absolute_restrictions || "",
  });
  const [settingsMessage, setSettingsMessage] = useState("");
  const [savingSection, setSavingSection] = useState("");
  const [editingSections, setEditingSections] = useState({});
  const [activeHelp, setActiveHelp] = useState("");
  const helpContent = {
    general: {
      title: "Regras Gerais da IA",
      body: "Defina como a IA deve se comportar nas respostas.",
      examples: [
        "Tom profissional e objetivo",
        "Priorizar venda consultiva",
        "Evitar respostas longas",
        "Sugerir acessórios relacionados",
        "Confirmar compatibilidade apenas quando validada",
      ],
    },
    knowledge: {
      title: "Conhecimento Técnico por Produto",
      body: "Adicione informações técnicas importantes sobre seus produtos.",
      examples: [
        "Compatibilidades",
        "Medidas",
        "Material",
        "Voltagem",
        "Conteúdo da embalagem",
        "Instalação",
        "Produtos relacionados",
      ],
    },
    web: {
      title: "Busca complementar na internet",
      body: "Permite que a IA consulte informações públicas quando não houver contexto suficiente na base interna.",
      note: "A IA continuará priorizando as informações da sua empresa.",
    },
    restrictions: {
      title: "Restrições Absolutas",
      body: "Defina informações que a IA nunca poderá afirmar.",
      examples: [
        "Compatibilidade sem validação",
        "Prazo exato de entrega",
        "Garantias não oficiais",
        "Informações não confirmadas",
      ],
    },
  };

  useEffect(() => {
    setSettingsDraft({
      ai_general_rules: appData.aiSettings.ai_general_rules || "",
      ai_product_knowledge: appData.aiSettings.ai_product_knowledge || "",
      ai_allow_web_search: Boolean(appData.aiSettings.ai_allow_web_search),
      ai_absolute_restrictions: appData.aiSettings.ai_absolute_restrictions || "",
    });
  }, [
    appData.aiSettings.ai_general_rules,
    appData.aiSettings.ai_product_knowledge,
    appData.aiSettings.ai_allow_web_search,
    appData.aiSettings.ai_absolute_restrictions,
  ]);

  useEffect(() => {
    function closeHelpOnOutsideClick(event) {
      if (!activeHelp) return;
      if (event.target.closest(".help-tooltip-wrap")) return;
      setActiveHelp("");
    }

    document.addEventListener("pointerdown", closeHelpOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeHelpOnOutsideClick);
  }, [activeHelp]);

  async function saveSettings(section) {
    setSettingsMessage("");
    setSavingSection(section);
    try {
      const response = await apiFetch(`${API_URL}/company/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(settingsDraft),
      });
      if (!response.ok) throw new Error("Não foi possível salvar as configurações.");
      const saved = await response.json();
      onSettingsSaved(saved);
      setEditingSections((current) => ({ ...current, [section]: false }));
      setSettingsMessage("Configurações salvas.");
    } catch (error) {
      setSettingsMessage(error.message || "Não foi possível salvar as configurações.");
    } finally {
      setSavingSection("");
    }
  }

  function updateSettingsDraft(patch) {
    setSettingsDraft((current) => ({ ...current, ...patch }));
  }

  function getSectionFields(section) {
    const sectionFields = {
      general: ["ai_general_rules"],
      knowledge: ["ai_product_knowledge"],
      web: ["ai_allow_web_search"],
      restrictions: ["ai_absolute_restrictions"],
    };
    return sectionFields[section];
  }

  function hasSavedSectionContent(section) {
    const savedContent = {
      general: savedSettings.ai_general_rules.trim().length > 0,
      knowledge: savedSettings.ai_product_knowledge.trim().length > 0,
      web: savedSettings.ai_allow_web_search,
      restrictions: savedSettings.ai_absolute_restrictions.trim().length > 0,
    };
    return savedContent[section];
  }

  function isSectionEditable(section) {
    return !hasSavedSectionContent(section) || Boolean(editingSections[section]);
  }

  function editSection(section) {
    setSettingsMessage("");
    setEditingSections((current) => ({ ...current, [section]: true }));
  }

  function cancelSectionEdit(section) {
    const restoredValues = getSectionFields(section).reduce(
      (values, field) => ({ ...values, [field]: savedSettings[field] }),
      {}
    );
    setSettingsMessage("");
    setSettingsDraft((current) => ({ ...current, ...restoredValues }));
    setEditingSections((current) => ({ ...current, [section]: false }));
  }

  function renderSectionActions(section) {
    if (hasSavedSectionContent(section) && !editingSections[section]) {
      return (
        <div className="settings-actions">
          <button type="button" className="secondary" onClick={() => editSection(section)}>
            Editar
          </button>
        </div>
      );
    }

    return (
      <div className="settings-actions">
        <button className="primary" onClick={() => saveSettings(section)} disabled={savingSection === section}>
          {savingSection === section ? <RefreshCw size={17} className="spin" /> : <Check size={17} />}
          {savingSection === section ? "Salvando..." : "Salvar"}
        </button>
        {hasSavedSectionContent(section) ? (
          <button
            type="button"
            className="secondary"
            onClick={() => cancelSectionEdit(section)}
            disabled={savingSection === section}
          >
            Sair
          </button>
        ) : null}
      </div>
    );
  }

  function renderHelpTooltip(section) {
    const content = helpContent[section];
    const tooltipId = `ai-settings-help-${section}`;
    const isOpen = activeHelp === section;
    const toggleTooltip = () => setActiveHelp((current) => (current === section ? "" : section));

    return (
      <div
        className="help-tooltip-wrap"
        onMouseEnter={() => setActiveHelp(section)}
        onMouseLeave={() => setActiveHelp((current) => (current === section ? "" : current))}
      >
        <button
          type="button"
          className="help-icon-button"
          aria-label={`Ajuda sobre ${content.title}`}
          aria-describedby={isOpen ? tooltipId : undefined}
          aria-expanded={isOpen}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleTooltip();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              toggleTooltip();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setActiveHelp("");
            }
          }}
        >
          ⓘ
        </button>
        {isOpen ? (
          <div className="help-tooltip" id={tooltipId} role="tooltip">
            <strong>{content.title}</strong>
            <p>{content.body}</p>
            {content.note ? <p>{content.note}</p> : null}
            {content.examples ? (
              <>
                <span>Exemplos:</span>
                <ul>
                  {content.examples.map((example) => (
                    <li key={example}>{example}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <section className="settings-page">
      <header className="topbar">
        <div>
          <span>{currentCompany?.name || "CPAP Express"} · Empresa e IA</span>
          <h1>Configurações IA</h1>
        </div>
        <div className="topbar-actions">
          <span className="user-badge">{currentUser?.name || "Admin"}</span>
        </div>
      </header>

      <section className="settings-layout ai-config-layout">
        <div className="settings-card settings-form ai-config-card">
          <div className="settings-card-header">
            <span>Regras Gerais da IA</span>
            {renderHelpTooltip("general")}
          </div>
          <label>
            <textarea
              className="large-textarea"
              value={settingsDraft.ai_general_rules}
              onChange={(event) => updateSettingsDraft({ ai_general_rules: event.target.value })}
              readOnly={!isSectionEditable("general")}
            />
          </label>
          {renderSectionActions("general")}
        </div>

        <div className="settings-card settings-form ai-config-card">
          <div className="settings-card-header">
            <span>Conhecimento Técnico por Produto</span>
            {renderHelpTooltip("knowledge")}
          </div>
          <label>
            <textarea
              className="xl-textarea"
              value={settingsDraft.ai_product_knowledge}
              onChange={(event) => updateSettingsDraft({ ai_product_knowledge: event.target.value })}
              readOnly={!isSectionEditable("knowledge")}
            />
          </label>
          {renderSectionActions("knowledge")}
        </div>

        <div className="settings-card settings-form ai-config-card">
          <div className="settings-card-header">
            <span>Busca complementar na internet</span>
            {renderHelpTooltip("web")}
          </div>
          <div className="toggle-row">
            <div>
              <strong>{settingsDraft.ai_allow_web_search ? "Ativada" : "Desativada"}</strong>
              <p>A IA poderá consultar especificações públicas e fabricantes apenas quando não encontrar informações suficientes na base interna ou nos produtos relacionados.</p>
            </div>
            <button
              type="button"
              className={`toggle-switch ${settingsDraft.ai_allow_web_search ? "active" : ""}`}
              onClick={() => updateSettingsDraft({ ai_allow_web_search: !settingsDraft.ai_allow_web_search })}
              aria-pressed={settingsDraft.ai_allow_web_search}
              disabled={!isSectionEditable("web")}
            >
              <span />
            </button>
          </div>
          <p className="settings-warning">Mesmo utilizando fontes externas, a IA nunca deve afirmar informações não confirmadas oficialmente.</p>
          {renderSectionActions("web")}
        </div>

        <div className="settings-card settings-form ai-config-card">
          <div className="settings-card-header">
            <span>Restrições Absolutas</span>
            {renderHelpTooltip("restrictions")}
          </div>
          <label>
            <textarea
              className="large-textarea"
              value={settingsDraft.ai_absolute_restrictions}
              onChange={(event) => updateSettingsDraft({ ai_absolute_restrictions: event.target.value })}
              readOnly={!isSectionEditable("restrictions")}
            />
          </label>
          {renderSectionActions("restrictions")}
        </div>
        {settingsMessage ? <p className="settings-message">{settingsMessage}</p> : null}
      </section>
    </section>
  );
}

function AnalyticsPage({ questions, appData, productsSummary, currentCompany, currentUser }) {
  const pending = questions.filter((question) => question.status === "Pendente").length;
  const answered = questions.filter((question) => question.status === "Respondida").length;
  const highPriority = questions.filter((question) => question.priority === "Alta").length;

  return (
    <section className="settings-page">
      <header className="topbar">
        <div>
          <span>{currentCompany?.name || "CPAP Express"} · Operação</span>
          <h1>Analytics</h1>
        </div>
        <div className="topbar-actions">
          <span className="user-badge">{currentUser?.name || "Admin"}</span>
        </div>
      </header>

      <div className="settings-grid">
        <article className="settings-card">
          <span>Pendentes</span>
          <h2>{pending}</h2>
          <p>Perguntas aguardando revisão humana antes do envio.</p>
        </article>
        <article className="settings-card">
          <span>Respondidas</span>
          <h2>{answered}</h2>
          <p>Respostas aprovadas e registradas no MVP.</p>
        </article>
        <article className="settings-card">
          <span>Prioridade alta</span>
          <h2>{highPriority}</h2>
          <p>Fila que merece atenção mais rápida.</p>
        </article>
        <article className="settings-card">
          <span>Produtos cacheados</span>
          <h2>{productsSummary.total}</h2>
          <p>{productsSummary.active} ativos · {productsSummary.inactive} inativos</p>
        </article>
      </div>
    </section>
  );
}

function ProductThumb({ question }) {
  const imageUrl = question.product_image_url || question.cached_product?.thumbnail;
  return (
    <div className="card-thumb" aria-hidden="true">
      {imageUrl ? <img src={imageUrl} alt="" loading="lazy" /> : <span>{question.marketplace?.slice(0, 2) || "ML"}</span>}
    </div>
  );
}

function QuestionRow({ question, selected, onSelect, sourceLabel, sourceColor }) {
  return (
    <button className={`question-row ${selected ? "selected" : ""}`} onClick={onSelect}>
      <div className="card-header">
        <ProductThumb question={question} />
        <div className="header-lines">
          <div className="header-line header-primary">
            <div className="source-pair">
              <span className="marketplace">{question.marketplace}</span>
              <span className="source-tag" style={{ "--source-color": sourceColor }}>
                {sourceLabel}
              </span>
            </div>
            <span className="time">
              <Clock3 size={14} />
              {formatDate(question.created_at)}
            </span>
          </div>
          <div className="header-line buyer-line">
            <span className="buyer-name">{getBuyerDisplayName(question.buyer, question.customer_name)}</span>
            {question.question_count > 1 ? <span className="count-badge">{question.question_count}</span> : null}
          </div>
        </div>
      </div>
      <div className="row-title">{question.product}</div>
      <p>{question.question}</p>
      <div className="row-meta">
        <span className={`pill status ${statusClass[question.status]}`}>{question.status}</span>
        {question.status === "Respondida" && question.answered_source ? (
          <span className="pill answer-source">{getAnsweredSourceLabel(question.answered_source)}</span>
        ) : null}
        <span className={`pill priority ${priorityClass[question.priority]}`}>
          {question.priority}
        </span>
      </div>
    </button>
  );
}

function PendingQuestionCard({ question, sourceLabel, sourceColor, onApprove, onEdit, onGenerate, isApproving, isGenerating }) {
  const editableQuestion = question.questions?.find((item) => item.status === "Pendente") || question;
  const hasSuggestion = editableQuestion.has_ai_suggestion !== false;

  return (
    <article className="pending-card">
      <div className="card-header">
        <ProductThumb question={question} />
        <div className="header-lines">
          <div className="header-line header-primary">
            <div className="source-pair">
              <span className="marketplace">{question.marketplace}</span>
              <span className="source-tag" style={{ "--source-color": sourceColor }}>
                {sourceLabel}
              </span>
            </div>
            <span className="time">
              <Clock3 size={14} />
              {formatDate(question.created_at)}
            </span>
          </div>
          <div className="header-line buyer-line">
            <span className="buyer-name">{getBuyerDisplayName(question.buyer, question.customer_name)}</span>
            {question.question_count > 1 ? <span className="count-badge">{question.question_count}</span> : null}
          </div>
        </div>
      </div>

      <h3>{question.product}</h3>
      <p className="pending-question">{question.question}</p>

      <div className="suggestion-preview">
        <span>Sugestão da IA</span>
        <p>{editableQuestion.ai_suggestion}</p>
      </div>

      <RelatedProducts products={question.related_products} />

      <div className="pending-actions">
        <button className="primary" onClick={() => onApprove(editableQuestion.id, editableQuestion.ai_suggestion)} disabled={isApproving}>
          {isApproving ? <RefreshCw size={18} className="spin" /> : <Check size={18} />}
          {isApproving ? "Enviando..." : "Aprovar e enviar"}
        </button>
        <button className="secondary" onClick={() => onEdit(question.id)}>
          <Sparkles size={17} />
          Editar / melhorar
        </button>
        {!hasSuggestion ? (
          <button className="secondary" onClick={() => onGenerate(editableQuestion.id)} disabled={isGenerating}>
            <RefreshCw size={17} className={isGenerating ? "spin" : ""} />
            {isGenerating ? "Gerando..." : "Gerar sugestão agora"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function RelatedProducts({ products }) {
  const visibleProducts = (products || []).slice(0, 3);
  if (visibleProducts.length === 0) return null;

  return (
    <div className="related-products">
      <span>Produtos relacionados encontrados</span>
      <div className="related-products-list">
        {visibleProducts.map((product) => (
          <article className="related-product" key={product.external_id || product.id || product.permalink}>
            {product.thumbnail ? <img src={product.thumbnail} alt="" /> : <div className="related-product-thumb" />}
            <div>
              <strong>{product.title}</strong>
              <small>
                {product.price ? `${product.currency_id || ""} ${product.price}`.trim() : "Preço não informado"}
              </small>
            </div>
            {product.permalink ? (
              <a href={product.permalink} target="_blank" rel="noreferrer">
                Abrir anúncio
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function DetailMetadata({ question }) {
  const productImage = question.product_image_url || question.cached_product?.thumbnail;
  const productTitle = question.product_title || question.product;
  const productSku = firstDisplayableSku(
    question.external_product_id,
    question.product_sku,
    question.cached_product?.seller_custom_field,
    question.cached_product?.raw_payload?.seller_sku,
    question.sku
  );
  const productPermalink = question.product_permalink || question.cached_product?.permalink;
  const listingStatus = question.product_status || question.cached_product?.status;
  const availableQuantity =
    question.product_available_quantity ?? question.cached_product?.available_quantity;
  const productPrice = question.product_price || question.price || question.cached_product?.price;
  const customerLabel =
    question.customer_name && question.customer_name !== "Cliente Mercado Livre"
      ? question.customer_name
      : question.external_customer_id;

  return (
    <div className="detail-metadata">
      <section className="detail-card product-info-card">
        <div className="detail-card-heading">
          <span>Informações do produto</span>
          {productPermalink ? (
            <a href={productPermalink} target="_blank" rel="noreferrer">
              Abrir anúncio
            </a>
          ) : null}
        </div>
        <div className="product-meta-row">
          {productImage ? (
            <img src={productImage} alt="" />
          ) : (
            <div className="product-meta-placeholder">
              <Store size={22} />
            </div>
          )}
          <div>
            <strong>{displayValue(productTitle)}</strong>
            <small>SKU: {displayValue(productSku)}</small>
            <small>Item: {displayValue(question.external_product_id)}</small>
          </div>
        </div>
        <dl>
          <div>
            <dt>Status do anúncio</dt>
            <dd>{displayValue(listingStatus)}</dd>
          </div>
          <div>
            <dt>Quantidade disponível</dt>
            <dd>{displayValue(availableQuantity)}</dd>
          </div>
          <div>
            <dt>Preço</dt>
            <dd>{displayValue(productPrice)}</dd>
          </div>
        </dl>
      </section>

      <section className="detail-card">
        <div className="detail-card-heading">
          <span>Informações da pergunta</span>
        </div>
        <dl>
          <div>
            <dt>Marketplace</dt>
            <dd>{displayValue(question.marketplace)}</dd>
          </div>
          <div>
            <dt>ID da pergunta</dt>
            <dd>{displayValue(question.external_id)}</dd>
          </div>
          <div>
            <dt>Data da pergunta</dt>
            <dd>{question.created_at ? formatDate(question.created_at) : "Não disponível"}</dd>
          </div>
          <div>
            <dt>Cliente</dt>
            <dd>{displayValue(customerLabel)}</dd>
          </div>
          <div>
            <dt>Pedido</dt>
            <dd>{displayOrderValue(question.external_order_id)}</dd>
          </div>
          <div>
            <dt>Origem da resposta</dt>
            <dd>{getAnsweredSourceLabel(question.answered_source)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function ConversationMessages({ questions }) {
  return (
    <div className="conversation-thread">
      {questions.map((item) => (
        <div className="thread-item" key={item.id}>
          <div className="message customer">
            <span>{getBuyerDisplayName(item.buyer, item.customer_name, { detail: true })}</span>
            <p>{item.question}</p>
            <small>{formatDate(item.created_at)}</small>
          </div>
          {item.status === "Respondida" && (item.final_response || item.final_answer || item.ai_suggestion) ? (
            <div className="message seller">
              <span>{getAnsweredSourceLabel(item.answered_source)}</span>
              <p>{item.final_response || item.final_answer || item.ai_suggestion}</p>
              <small>{item.answered_at ? formatDate(item.answered_at) : "Resposta registrada"}</small>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Conversation({ question, onBack, onApprove, onGenerate, onReject, readOnly, isApproving }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const [rewriteInstruction, setRewriteInstruction] = useState("");
  const [versions, setVersions] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState("original");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState("");
  const conversationQuestions = question?.questions || (question ? [question] : []);
  const editableQuestion = conversationQuestions.find((item) => item.status === "Pendente") || question;

  useEffect(() => {
    const pendingQuestion = (question?.questions || [question]).find((item) => item?.status === "Pendente") || question;
    const originalText = pendingQuestion?.ai_suggestion || "";
    setVersions([
      {
        id: "original",
        label: "Versão original",
        text: originalText,
        instruction: "",
        wasEdited: false,
      },
    ]);
    setSelectedVersionId("original");
    setEditDraft(originalText);
    setRewriteInstruction("");
    setRewriteError("");
    setIsEditing(false);
  }, [question]);

  const selectedVersion = versions.find((version) => version.id === selectedVersionId) || versions[0];
  const currentText = selectedVersion?.text || "";
  const hasSuggestion = editableQuestion?.has_ai_suggestion !== false;

  if (!question) {
    return (
      <section className="conversation empty-state">
        <div className="empty-icon">
          <MessageCircle size={34} />
        </div>
        <h2>Selecione uma pergunta</h2>
        <p>Revise sugestões da IA, edite quando precisar e envie respostas em poucos cliques.</p>
      </section>
    );
  }

  if (readOnly) {
    return (
      <section className="conversation">
        <header className="conversation-header">
          <button className="back-button" onClick={onBack} aria-label="Voltar para lista">
            <ChevronLeft size={22} />
          </button>
          <div>
            <span>{question.marketplace} · {getBuyerDisplayName(question.buyer, question.customer_name, { detail: true })}</span>
            <h2>{question.product}</h2>
            <p>
              Respondida em {question.answered_at ? formatDate(question.answered_at) : formatDate(question.created_at)}
            </p>
          </div>
          <div className="conversation-pills">
            <span className={`pill status ${statusClass[question.status]}`}>{question.status}</span>
            {question.answered_source ? (
              <span className="pill answer-source">{getAnsweredSourceLabel(question.answered_source)}</span>
            ) : null}
          </div>
        </header>

        <div className="chat-surface">
          <DetailMetadata question={question} />

          <ConversationMessages questions={conversationQuestions} />
        </div>
      </section>
    );
  }

  function summarizeInstruction(instruction) {
    const lower = normalizeInstruction(instruction);
    if (lower.includes("tecnic")) return "mais técnico";
    if (lower.includes("curt")) return "mais curto";
    if (lower.includes("garantia")) return "garantia";
    if (lower.includes("vendedor") || lower.includes("venda")) return "mais vendedor";
    return instruction.slice(0, 34);
  }

  function startEditing() {
    setEditDraft(currentText);
    setIsEditing(true);
  }

  function saveManualEdit() {
    if (!editDraft.trim()) return;
    const nextVersion = {
      id: `manual-${Date.now()}`,
      label: `Edição manual ${versions.filter((version) => version.wasEdited).length + 1}`,
      text: editDraft.trim(),
      instruction: "Edição manual",
      wasEdited: true,
    };
    setVersions((current) => [...current, nextVersion]);
    setSelectedVersionId(nextVersion.id);
    setIsEditing(false);
  }

  function cancelManualEdit() {
    setEditDraft(currentText);
    setIsEditing(false);
  }

  async function requestAiRewrite(originalResponse, instruction) {
    const response = await apiFetch(AI_REWRITE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: editableQuestion.question,
        original_response: originalResponse,
        instruction,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.detail || "Falha ao chamar a IA");
    }

    const data = await response.json();
    const rewrittenText = data.rewritten_text || data.revised_response;
    if (!rewrittenText || data.error) {
      throw new Error("A IA retornou uma resposta vazia");
    }
    return rewrittenText;
  }

  async function handleRewrite() {
    const instruction = rewriteInstruction.trim();
    if (!instruction) return;
    setIsRewriting(true);
    setRewriteError("");
    let revisedText = "";

    try {
      revisedText = await requestAiRewrite(currentText, instruction);
    } catch (error) {
      setRewriteError(error.message || "Não foi possível usar a IA agora. Tente novamente em instantes.");
      setIsRewriting(false);
      return;
    }

    const revisionNumber = versions.filter((version) => version.instruction && !version.wasEdited).length + 1;
    const nextVersion = {
      id: `rewrite-${Date.now()}`,
      label: `Ajuste ${revisionNumber}: ${summarizeInstruction(instruction)}`,
      text: revisedText,
      instruction,
      wasEdited: false,
    };
    setVersions((current) => [...current, nextVersion]);
    setSelectedVersionId(nextVersion.id);
    setRewriteInstruction("");
    setIsRewriting(false);
  }

  async function handleGenerate() {
    setIsGenerating(true);
    const suggestion = await onGenerate(editableQuestion.id);
    const nextVersion = {
      id: `generated-${Date.now()}`,
      label: `Ajuste ${versions.length}: nova sugestão`,
      text: suggestion,
      instruction: "Gerar nova sugestão",
      wasEdited: false,
    };
    setVersions((current) => [...current, nextVersion]);
    setSelectedVersionId(nextVersion.id);
    setIsGenerating(false);
  }

  function approveSelectedVersion() {
    onApprove(editableQuestion.id, {
      ai_suggestion: editableQuestion.ai_suggestion,
      final_response: currentText,
      was_edited: selectedVersion?.wasEdited || selectedVersionId !== "original",
      instruction_used: selectedVersion?.instruction || "",
    });
  }

  return (
    <section className="conversation">
      <header className="conversation-header">
        <button className="back-button" onClick={onBack} aria-label="Voltar para lista">
          <ChevronLeft size={22} />
        </button>
        <div>
          <span>{question.marketplace} · {getBuyerDisplayName(question.buyer, question.customer_name, { detail: true })}</span>
          <h2>{question.product}</h2>
          <p>
            SKU {displayValue(firstDisplayableSku(question.external_product_id, question.product_sku, question.sku))} · {displayValue(question.price)}
          </p>
        </div>
        <span className={`pill status ${statusClass[question.status]}`}>{question.status}</span>
      </header>

      <div className="chat-surface">
        <DetailMetadata question={question} />

        <ConversationMessages questions={conversationQuestions} />

        <div className="ai-card">
          <div className="ai-card-header">
            <div>
              <Sparkles size={18} />
              <strong>Sugestão da IA</strong>
            </div>
            <span>pronta para revisar</span>
          </div>

          {isEditing ? (
            <div className="manual-editor">
              <textarea value={editDraft} onChange={(event) => setEditDraft(event.target.value)} />
              <div className="editor-actions">
                <button className="primary" onClick={saveManualEdit} disabled={!editDraft.trim()}>
                  <Check size={17} />
                  Salvar edição
                </button>
                <button className="secondary" onClick={cancelManualEdit}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <p className="ai-response-text">{currentText}</p>
          )}

          <RelatedProducts products={question.related_products} />

          <div className="rewrite-box">
            <input
              value={rewriteInstruction}
              onChange={(event) => setRewriteInstruction(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !isRewriting) handleRewrite();
              }}
              placeholder="Peça uma alteração para a IA (ex: deixe mais técnico, mais curto, mais vendedor...)"
            />
            <button className="secondary" onClick={handleRewrite} disabled={!rewriteInstruction.trim() || isRewriting}>
              <RefreshCw size={17} className={isRewriting ? "spin" : ""} />
              {isRewriting ? "Reescrevendo..." : "Reescrever"}
            </button>
          </div>
          {rewriteError ? <p className="rewrite-error">{rewriteError}</p> : null}

          <div className="revision-history">
            {versions.map((version) => (
              <button
                key={version.id}
                className={selectedVersionId === version.id ? "active" : ""}
                onClick={() => {
                  setSelectedVersionId(version.id);
                  setIsEditing(false);
                }}
              >
                {version.label}
              </button>
            ))}
          </div>

          <div className="ai-actions">
            <button className="primary" onClick={approveSelectedVersion} disabled={isApproving}>
              {isApproving ? <RefreshCw size={18} className="spin" /> : <Check size={18} />}
              {isApproving ? "Enviando..." : "Aprovar e enviar"}
            </button>
            <button className="secondary" onClick={startEditing}>
              Editar texto
            </button>
            <button className="secondary" onClick={handleGenerate} disabled={isGenerating}>
              <RefreshCw size={17} className={isGenerating ? "spin" : ""} />
              {hasSuggestion ? "Gerar nova sugestão" : "Gerar sugestão agora"}
            </button>
            <button className="danger" onClick={() => onReject(editableQuestion.id)}>
              <ThumbsDown size={17} />
              Rejeitar
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [tenantContext, setTenantContext] = useState(FALLBACK_TENANT_CONTEXT);
  const [companies, setCompanies] = useState([FALLBACK_TENANT_CONTEXT.company]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(getStoredCompanyId);
  const currentUser = tenantContext.user;
  const currentCompany = tenantContext.company;
  const currentPermissions = tenantContext.permissions;
  const [appData, setAppData] = useState(initialAppData);
  const [active, setActive] = useState("Inbox");
  const [integrationHealth, setIntegrationHealth] = useState(initialIntegrationHealth);
  const [pendingIntegration, setPendingIntegration] = useState(null);
  const [connectError, setConnectError] = useState("");
  const [fetchingMlQuestions, setFetchingMlQuestions] = useState(false);
  const [syncingProducts, setSyncingProducts] = useState(false);
  const [disconnectingMl, setDisconnectingMl] = useState(false);
  const [productsSummary, setProductsSummary] = useState({ total: 0, active: 0, inactive: 0 });
  const [sendingAnswerId, setSendingAnswerId] = useState(null);
  const [generatingQuestionId, setGeneratingQuestionId] = useState(null);
  const [answerNotice, setAnswerNotice] = useState("");
  const [answerError, setAnswerError] = useState("");
  const [questionNotice, setQuestionNotice] = useState("");
  const [testingIntegrationId, setTestingIntegrationId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [marketplaceFilter, setMarketplaceFilter] = useState("Todos");
  const [priorityFilter, setPriorityFilter] = useState("Todos");
  const [answeredSourceFilter, setAnsweredSourceFilter] = useState("Todas");
  const [showConversation, setShowConversation] = useState(false);

  const questions = appData.questions;
  const integrations = appData.integrations;

  function setQuestions(nextQuestions) {
    setAppData((current) => ({
      ...current,
      questions:
        typeof nextQuestions === "function" ? nextQuestions(current.questions) : nextQuestions,
    }));
  }

  function setIntegrations(nextIntegrations) {
    setAppData((current) => ({
      ...current,
      integrations:
        typeof nextIntegrations === "function" ? nextIntegrations(current.integrations) : nextIntegrations,
    }));
  }

  function resetTenantScopedUi() {
    setQuestions([]);
    setProductsSummary({ total: 0, active: 0, inactive: 0 });
    setIntegrationHealth(initialIntegrationHealth);
    setIntegrations(integrationState());
    setSelectedId(null);
    setMarketplaceFilter("Todos");
    setPriorityFilter("Todos");
    setAnsweredSourceFilter("Todas");
    setShowConversation(false);
    setQuestionNotice("");
    setAnswerNotice("");
    setAnswerError("");
    setAppData((current) => ({
      ...current,
      aiSettings: {
        ai_general_rules: "",
        ai_product_knowledge: "",
        ai_allow_web_search: false,
        ai_absolute_restrictions: "",
      },
    }));
  }

  function switchCompany(companyId) {
    localStorage.setItem(SELECTED_COMPANY_STORAGE_KEY, companyId);
    resetTenantScopedUi();
    setSelectedCompanyId(companyId);
  }

  async function loadQuestionsFromDatabase() {
    const response = await apiFetch(`${API_URL}/questions`);
    const data = await response.json();
    if (!response.ok || !Array.isArray(data)) {
      throw new Error("Não foi possível carregar perguntas do banco.");
    }
    setQuestions(data);
    setSelectedId((current) =>
      current && data.some((question) => question.id === current)
        ? current
        : data[0]?.id || null
    );
    return data;
  }

  async function loadProductsSummary() {
    const response = await apiFetch(`${API_URL}/products`);
    const products = await response.json();
    if (!response.ok || !Array.isArray(products)) {
      throw new Error("Não foi possível carregar produtos cacheados.");
    }
    const active = products.filter((product) => product.status === "active").length;
    setProductsSummary({
      total: products.length,
      active,
      inactive: products.length - active,
    });
    return products;
  }

  async function refreshIntegrationHealth() {
    try {
      const response = await apiFetch(`${API_URL}/integrations/health`);
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) {
        throw new Error("Invalid integration health response");
      }
      const mercadoLivreHealth = data.filter((health) => health.id === "mercado-livre");
      setIntegrationHealth(mercadoLivreHealth);
      setIntegrations((current) =>
        applyBackendHealthToIntegrations(current, mercadoLivreHealth, currentCompany.id, currentCompany.name)
      );
      return mercadoLivreHealth;
    } catch {
      setIntegrationHealth(initialIntegrationHealth);
      setIntegrations((current) =>
        applyBackendHealthToIntegrations(current, initialIntegrationHealth, currentCompany.id, currentCompany.name)
      );
      return initialIntegrationHealth;
    }
  }

  useEffect(() => {
    setSelectedId((current) => current || questions[0]?.id || null);
  }, [questions]);

  useEffect(() => {
    async function loadTenantContext() {
      try {
        const response = await apiFetch(`${API_URL}/me`);
        const tenant = await response.json();
        console.log("/me response", tenant);
        if (!response.ok) throw new Error("Tenant context unavailable");
        setTenantContext({
          user: {
            ...FALLBACK_TENANT_CONTEXT.user,
            ...(tenant.user || {}),
          },
          company: {
            ...FALLBACK_TENANT_CONTEXT.company,
            ...(tenant.company || {}),
          },
          permissions: {
            ...FALLBACK_TENANT_CONTEXT.permissions,
            ...(tenant.permissions || {}),
          },
        });
      } catch {
        setTenantContext(FALLBACK_TENANT_CONTEXT);
      }
    }

    async function loadCompanies() {
      try {
        const response = await apiFetch(`${API_URL}/companies`);
        const data = await response.json();
        console.log("/companies response", data);
        if (response.ok && Array.isArray(data)) {
          if (data.length <= 1) console.log("/companies returned one or zero companies", data);
          setCompanies(data.length ? data : [FALLBACK_TENANT_CONTEXT.company]);
        }
      } catch {
        console.log("/companies request failed; using fallback company");
        setCompanies([FALLBACK_TENANT_CONTEXT.company]);
      }
    }

    async function loadPersistedQuestions() {
      try {
        await loadQuestionsFromDatabase();
      } catch (error) {
        setQuestionNotice(error.message || "Não foi possível carregar perguntas do banco.");
      }
    }

    async function loadCompanySettings() {
      try {
        const response = await apiFetch(`${API_URL}/company/settings`);
        const settings = await response.json();
        if (response.ok) {
          setAppData((current) => ({
            ...current,
            aiSettings: {
              ...current.aiSettings,
              ai_general_rules: settings.ai_general_rules || "",
              ai_product_knowledge: settings.ai_product_knowledge || "",
              ai_allow_web_search: Boolean(settings.ai_allow_web_search),
              ai_absolute_restrictions: settings.ai_absolute_restrictions || "",
            },
          }));
        }
      } catch {
        // Settings keep local defaults when backend is unavailable.
      }
    }

    loadTenantContext().then(loadCompanies);
    loadPersistedQuestions();
    loadCompanySettings();
    loadProductsSummary().catch(() => {});
  }, [selectedCompanyId]);

  useEffect(() => {
    refreshIntegrationHealth();
  }, [selectedCompanyId]);

  useEffect(() => {
    const rootState = {
      marketplaceAiApp: true,
      view: "screen",
      active: "Inbox",
      marketplaceFilter: "Todos",
      priorityFilter: "Todos",
      answeredSourceFilter: "Todas",
    };
    if (!window.history.state?.marketplaceAiApp) {
      window.history.replaceState(rootState, "", window.location.pathname + window.location.search);
      window.history.pushState(rootState, "", window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("ml_connected") !== "true") return;
    window.history.replaceState(
      window.history.state?.marketplaceAiApp
        ? { ...window.history.state }
        : {
            marketplaceAiApp: true,
            view: "screen",
            active: "Inbox",
            marketplaceFilter: "Todos",
            priorityFilter: "Todos",
            answeredSourceFilter: "Todas",
          },
      "",
      window.location.pathname
    );
  }, []);

  useEffect(() => {
    function handleBrowserBack(event) {
      const state = event.state;
      if (!state?.marketplaceAiApp) {
        const fallbackState = {
          marketplaceAiApp: true,
          view: "screen",
          active: "Inbox",
          marketplaceFilter: "Todos",
          priorityFilter: "Todos",
          answeredSourceFilter: "Todas",
        };
        setActive("Inbox");
        setMarketplaceFilter("Todos");
        setPriorityFilter("Todos");
        setAnsweredSourceFilter("Todas");
        setShowConversation(false);
        window.history.pushState(fallbackState, "", window.location.pathname);
        return;
      }

      setActive(state.active || "Inbox");
      setMarketplaceFilter(state.marketplaceFilter || "Todos");
      setPriorityFilter(state.priorityFilter || "Todos");
      setAnsweredSourceFilter(state.answeredSourceFilter || "Todas");
      setShowConversation(state.view === "question");
      if (state.questionId) setSelectedId(state.questionId);

      if ((state.active || "Inbox") === "Inbox" && state.view !== "question") {
        window.history.pushState(
          {
            marketplaceAiApp: true,
            view: "screen",
            active: "Inbox",
            marketplaceFilter: state.marketplaceFilter || "Todos",
            priorityFilter: state.priorityFilter || "Todos",
            answeredSourceFilter: state.answeredSourceFilter || "Todas",
          },
          "",
          window.location.pathname
        );
      }
    }

    window.addEventListener("popstate", handleBrowserBack);
    return () => window.removeEventListener("popstate", handleBrowserBack);
  }, []);

  const visibleQuestions = questions;

  const marketplaces = useMemo(
    () => ["Todos", ...new Set(visibleQuestions.map((question) => question.marketplace))],
    [visibleQuestions]
  );

  const filteredQuestions = useMemo(() => {
    const forcedStatus =
      active === "Respondidas"
          ? "Respondida"
          : active === "Pendentes"
            ? "Pendente"
            : null;

    return visibleQuestions.filter((question) => {
      const marketplaceMatches =
        marketplaceFilter === "Todos" || question.marketplace === marketplaceFilter;
      const statusMatches = forcedStatus ? question.status === forcedStatus : true;
      const priorityMatches =
        priorityFilter === "Todos" || question.priority === priorityFilter;
      const answeredSourceMatches =
        active !== "Respondidas" ||
        answeredSourceFilter === "Todas" ||
        normalizeAnsweredSource(question.answered_source) === normalizeAnsweredSource(answeredSourceFilter);
      return marketplaceMatches && statusMatches && priorityMatches && answeredSourceMatches;
    });
  }, [active, visibleQuestions, marketplaceFilter, priorityFilter, answeredSourceFilter]);

  const conversationGroups = useMemo(() => buildConversationGroups(filteredQuestions), [filteredQuestions]);
  const selectedQuestion =
    conversationGroups.find((question) => question.id === selectedId) ||
    visibleQuestions.find((question) => question.id === selectedId) ||
    conversationGroups[0] ||
    null;
  const selectedEditableQuestion =
    selectedQuestion?.questions?.find((question) => question.status === "Pendente") || selectedQuestion;

  const metrics = {
    pending: visibleQuestions.filter((question) => question.status === "Pendente").length,
    answered: visibleQuestions.filter((question) => question.status === "Respondida").length,
    high: visibleQuestions.filter((question) => question.priority === "Alta").length,
  };

  const hasVisibleQuestions = visibleQuestions.length > 0;
  const mercadoLivreIntegration = integrations.find((integration) => integration.id === "mercado-livre");
  const isMercadoLivreConnected = mercadoLivreIntegration?.status === "Conectado";
  const isPendingScreen = active === "Pendentes";
  const isReadOnlyAnsweredScreen = active === "Respondidas";
  const answerFeedbackClass = answerError
    ? "error"
    : answerNotice.includes("outro usuário")
      ? "info"
      : "success";

  function pushAppHistory(state) {
    window.history.pushState(
      {
        marketplaceAiApp: true,
        view: "screen",
        active,
        marketplaceFilter,
        priorityFilter,
        answeredSourceFilter,
        ...state,
      },
      "",
      window.location.pathname
    );
  }

  function applyMetricFilter(type) {
    setMarketplaceFilter("Todos");
    setAnsweredSourceFilter("Todas");
    setShowConversation(false);

    if (type === "pending") {
      pushAppHistory({
        active: "Pendentes",
        marketplaceFilter: "Todos",
        priorityFilter: "Todos",
        answeredSourceFilter: "Todas",
      });
      setActive("Pendentes");
      setPriorityFilter("Todos");
      setSelectedId(visibleQuestions.find((question) => question.status === "Pendente")?.id || null);
      return;
    }

    if (type === "answered") {
      pushAppHistory({
        active: "Respondidas",
        marketplaceFilter: "Todos",
        priorityFilter: "Todos",
        answeredSourceFilter: "Todas",
      });
      setActive("Respondidas");
      setPriorityFilter("Todos");
      setSelectedId(visibleQuestions.find((question) => question.status === "Respondida")?.id || null);
      return;
    }

    pushAppHistory({
      active: "Inbox",
      marketplaceFilter: "Todos",
      priorityFilter: "Alta",
      answeredSourceFilter: "Todas",
    });
    setActive("Inbox");
    setPriorityFilter("Alta");
    setSelectedId(visibleQuestions.find((question) => question.priority === "Alta")?.id || null);
  }

  useEffect(() => {
    if (selectedId && !conversationGroups.some((question) => question.id === selectedId)) {
      setSelectedId(conversationGroups[0]?.id || null);
      setShowConversation(false);
    } else if (!selectedId && conversationGroups.length > 0) {
      setSelectedId(conversationGroups[0].id);
    }

    if (marketplaceFilter !== "Todos" && !marketplaces.includes(marketplaceFilter)) {
      setMarketplaceFilter("Todos");
    }
  }, [conversationGroups, marketplaceFilter, marketplaces, selectedId]);

  function selectQuestion(id) {
    if (!(showConversation && selectedId === id)) {
      pushAppHistory({ view: "question", questionId: id });
    }
    setQuestionNotice("");
    setSelectedId(id);
    setShowConversation(true);
  }

  function openEditorForQuestion(id) {
    if (!(showConversation && selectedId === id)) {
      pushAppHistory({ view: "question", questionId: id });
    }
    setSelectedId(id);
    setShowConversation(true);
  }

  function closeConversation() {
    if (window.history.state?.marketplaceAiApp && window.history.state?.view === "question") {
      window.history.back();
      return;
    }
    setShowConversation(false);
  }

  function changeSection(section) {
    pushAppHistory({
      view: "screen",
      active: section,
      priorityFilter: "Todos",
      answeredSourceFilter: section === "Respondidas" ? answeredSourceFilter : "Todas",
    });
    setActive(section);
    setPriorityFilter("Todos");
    setShowConversation(false);
  }

  async function generateSuggestion(id) {
    setGeneratingQuestionId(id);
    const targetQuestion = questions.find((question) => question.id === id);
    try {
      if (!targetQuestion) return "";

      try {
      const response = await apiFetch(`${API_URL}/questions/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ question_id: id, external_id: targetQuestion.external_id, force: true }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ai_suggestion) {
          throw new Error(data.detail || "Falha ao gerar sugestão.");
        }
        const suggestion = data.ai_suggestion;
        setQuestions((current) =>
          current.map((question) =>
            question.id === id
              ? { ...question, ai_suggestion: suggestion, has_ai_suggestion: true }
              : question
          )
        );
        return suggestion;
      } catch {
        const suggestion =
          "Não foi possível gerar uma nova sugestão da IA agora. Edite a resposta manualmente antes de enviar.";
        setQuestions((current) =>
          current.map((question) =>
            question.id === id ? { ...question, ai_suggestion: suggestion } : question
          )
        );
        return suggestion;
      }
    } finally {
      setGeneratingQuestionId(null);
    }
  }

  async function approveQuestion(id, approval) {
    setAnswerNotice("");
    setAnswerError("");
    const approvalData =
      typeof approval === "string"
        ? {
            ai_suggestion: approval,
            final_response: approval,
            was_edited: false,
            instruction_used: "",
          }
        : approval;
    const finalResponse =
      approvalData.final_response || approvalData.ai_suggestion;
    const targetQuestion = questions.find((question) => question.id === id);
    const isRealMercadoLivreQuestion =
      targetQuestion?.is_real &&
      targetQuestion?.marketplace === "Mercado Livre" &&
      targetQuestion?.external_id;
    const alreadyAnsweredMessage =
      "Resposta já realizada por outro usuário. A pergunta saiu da fila de pendentes.";
    async function handleAlreadyAnsweredExternally(payload = {}) {
      setQuestions((current) =>
        current
          .filter((question) => question.id !== id)
          .concat(payload.question ? [{ ...payload.question, status: "Respondida" }] : [])
      );
      setShowConversation(false);
      setSelectedId(null);
      setAnswerNotice(payload.message || alreadyAnsweredMessage);
      setAnswerError("");
      await loadQuestionsFromDatabase().catch(() => {});
    }

    if (isRealMercadoLivreQuestion) {
      setSendingAnswerId(id);
      try {
        const response = await apiFetch(`${API_URL}/questions/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({
            question_id: targetQuestion.id,
            external_id: targetQuestion.external_id,
            answer: finalResponse,
            suggestion_text: approvalData.ai_suggestion || targetQuestion.ai_suggestion,
            was_edited: Boolean(approvalData.was_edited),
            instruction_used: approvalData.instruction_used || "",
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.error) {
          throw new Error(
            (typeof data.detail === "string" ? data.detail : data.message) ||
              "Não foi possível enviar a resposta ao Mercado Livre."
          );
        }

        if (data.already_answered) {
          await handleAlreadyAnsweredExternally(data);
          return;
        }

        const updatedQuestion = data.question || data;
        setQuestions((current) =>
          current.map((question) =>
            question.id === id
              ? {
                  ...question,
                  ...updatedQuestion,
                  status: "Respondida",
                  ai_suggestion:
                    updatedQuestion.ai_suggestion ||
                    approvalData.ai_suggestion ||
                    question.ai_suggestion,
                  final_response:
                    updatedQuestion.final_response ||
                    updatedQuestion.final_answer ||
                    finalResponse,
                  was_edited: Boolean(updatedQuestion.was_edited ?? approvalData.was_edited),
                  instruction_used: updatedQuestion.instruction_used || approvalData.instruction_used || "",
                  answered_at: updatedQuestion.answered_at || new Date().toISOString(),
                  answered_source: normalizeAnsweredSource(updatedQuestion.answered_source) || (data.already_answered ? "portal" : "app"),
                  approved_by: updatedQuestion.approved_by || currentUser?.name || "Usuário",
                  ml_answer_response: data.raw_response,
                }
              : question
          )
        );
        setAnswerNotice("Resposta enviada ao Mercado Livre");
      } catch (error) {
        if (
          isRealMercadoLivreQuestion &&
          String(error.message || "").toLowerCase().includes("pergunta não encontrada")
        ) {
          await handleAlreadyAnsweredExternally();
          return;
        }
        setAnswerError(error.message || "Não foi possível enviar a resposta ao Mercado Livre.");
      } finally {
        setSendingAnswerId(null);
      }
      return;
    }

    setAnswerError("Esta pergunta não possui vínculo real com o Mercado Livre.");
  }

  function rejectQuestion(id) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === id ? { ...question, status: "Rejeitada" } : question
      )
    );
  }

  function openConnectModal(integration) {
    setConnectError("");
    setPendingIntegration(integration);
  }

  async function confirmConnect(id) {
    if (id === "mercado-livre") {
      setConnectError("");
      try {
        const response = await apiFetch(`${API_URL}/integrations/mercadolivre/auth-url`);
        const data = await response.json().catch(() => ({}));
        const authUrl = data.auth_url || data.url;
        if (response.ok && authUrl) {
          window.location.href = authUrl;
          return;
        }
        setConnectError(
          data.message ||
            data.detail ||
            "Não foi possível iniciar conexão com Mercado Livre."
        );
      } catch (error) {
        console.error("Mercado Livre OAuth start failed", error);
        setConnectError("Não foi possível iniciar conexão com Mercado Livre.");
      }
      return;
    }
  }

  async function disconnectMercadoLivre() {
    setDisconnectingMl(true);
    setQuestionNotice("");
    try {
      const response = await apiFetch(`${API_URL}/integrations/mercadolivre/disconnect`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success !== true) {
        throw new Error(data.detail || data.message || "Não foi possível desconectar Mercado Livre.");
      }
      await refreshIntegrationHealth();
      setShowConversation(false);
      setSelectedId(null);
      setQuestionNotice("Mercado Livre desconectado.");
    } catch (error) {
      setQuestionNotice(error.message || "Não foi possível desconectar Mercado Livre.");
    } finally {
      setDisconnectingMl(false);
    }
  }

  async function fetchMercadoLivreQuestions() {
    setFetchingMlQuestions(true);
    setQuestionNotice("");
    try {
      const response = await apiFetch(`${API_URL}/integrations/mercadolivre/questions`);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const fallbackMessage =
          response.status === 401
            ? "Mercado Livre não conectado."
            : response.status === 403
              ? "Permissão insuficiente para acessar perguntas."
              : typeof data?.detail === "string"
                ? data.detail
                : data?.message || "Não foi possível buscar perguntas do Mercado Livre.";
        if (response.status === 401) {
          setIntegrations((current) =>
            current.map((integration) =>
              integration.id === "mercado-livre"
                ? {
                    ...integration,
                    status: "Não conectado",
                    store: "",
                    lastSync: "",
                    token_status: "missing",
                  }
                : integration
            )
          );
        }
        setQuestions([]);
        setSelectedId(null);
        setShowConversation(false);
        setQuestionNotice(fallbackMessage);
        return;
      }

      const syncedQuestions = Array.isArray(data) ? data.map(mapMercadoLivreQuestionToUi) : [];
      const databaseQuestions = await loadQuestionsFromDatabase();
      setShowConversation(false);
      setMarketplaceFilter("Todos");
      await refreshIntegrationHealth();

      if (syncedQuestions.length === 0 && databaseQuestions.length === 0) {
        setQuestionNotice("Nenhuma pergunta pendente encontrada no Mercado Livre.");
      }
    } catch {
      setShowConversation(false);
      setQuestionNotice("Não foi possível buscar perguntas do Mercado Livre.");
    } finally {
      setFetchingMlQuestions(false);
    }
  }

  async function syncMercadoLivreProducts() {
    setSyncingProducts(true);
    setQuestionNotice("");
    try {
      const response = await apiFetch(`${API_URL}/integrations/mercadolivre/products/sync`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || data.message || "Não foi possível sincronizar produtos.");
      }
      setProductsSummary({
        total: data.fetched || 0,
        active: data.active || 0,
        inactive: data.inactive || 0,
      });
      const syncedAt = new Date().toISOString();
      setIntegrations((current) =>
        current.map((integration) =>
          integration.id === "mercado-livre"
            ? { ...integration, lastProductsSync: syncedAt }
            : integration
        )
      );
      setQuestionNotice("Produtos do Mercado Livre sincronizados.");
    } catch (error) {
      setQuestionNotice(error.message || "Não foi possível sincronizar produtos.");
    } finally {
      setSyncingProducts(false);
    }
  }

  async function testIntegrationHealth(id) {
    setTestingIntegrationId(id);
    try {
      const response = await apiFetch(`${API_URL}/integrations/${id}/test`, { method: "POST" });
      const result = await response.json();
      setIntegrationHealth((current) =>
        current.map((health) =>
          health.id === id
            ? {
                ...health,
                api_status: result.ok ? "operational" : "down",
                last_error: result.ok ? null : result.message,
                last_sync: result.checked_at,
              }
            : health
        )
      );
    } catch {
      setIntegrationHealth((current) =>
        current.map((health) =>
          health.id === id
            ? {
                ...health,
                api_status: "down",
                last_error: "Não foi possível testar a conexão com a API local.",
              }
            : health
        )
      );
    } finally {
      window.setTimeout(() => setTestingIntegrationId(null), 500);
    }
  }

  const isIntegrations = active === "Integrações";
  const isSettings = active === "Configurações";
  const isAnalytics = active === "Analytics";
  const emptyQuestionTitle =
    active === "Pendentes"
      ? "Nenhuma pergunta pendente encontrada."
      : active === "Respondidas"
        ? "Nenhuma pergunta respondida encontrada."
        : "Nenhuma pergunta encontrada.";

  return (
    <div className="app-shell">
      <Sidebar
        active={active}
        companies={companies}
        currentCompany={currentCompany}
        permissions={currentPermissions}
        onCompanyChange={switchCompany}
        onNavigate={changeSection}
      />

      <main className={`workspace ${isIntegrations || isSettings || isAnalytics ? "single-view" : ""}`}>
        {isIntegrations ? (
          <IntegrationsPage
            currentCompany={currentCompany}
            currentUser={currentUser}
            integrations={integrations}
            integrationHealth={integrationHealth}
            onConnect={openConnectModal}
            onDisconnect={disconnectMercadoLivre}
            onFetchRealQuestions={fetchMercadoLivreQuestions}
            onSyncProducts={syncMercadoLivreProducts}
            onTestHealth={testIntegrationHealth}
            fetchingRealQuestions={fetchingMlQuestions}
            syncingProducts={syncingProducts}
            disconnecting={disconnectingMl}
            testingIntegrationId={testingIntegrationId}
            pendingIntegration={pendingIntegration}
            connectError={connectError}
            onCancelConnect={() => {
              setConnectError("");
              setPendingIntegration(null);
            }}
            onConfirmConnect={confirmConnect}
          />
        ) : isSettings ? (
          <SettingsPage
            appData={appData}
            currentCompany={currentCompany}
            currentUser={currentUser}
            onSettingsSaved={(settings) =>
              setAppData((current) => ({
                ...current,
                aiSettings: {
                  ...current.aiSettings,
                  ai_general_rules: settings.ai_general_rules || "",
                  ai_product_knowledge: settings.ai_product_knowledge || "",
                  ai_allow_web_search: Boolean(settings.ai_allow_web_search),
                  ai_absolute_restrictions: settings.ai_absolute_restrictions || "",
                },
              }))
            }
          />
        ) : isAnalytics ? (
          <AnalyticsPage
            questions={visibleQuestions}
            appData={appData}
            productsSummary={productsSummary}
            currentCompany={currentCompany}
            currentUser={currentUser}
          />
        ) : (
          <>
            <section className={`inbox-panel ${showConversation ? "hide-mobile" : ""}`}>
          <header className="topbar">
            <div>
              <CompanySwitcher
                companies={companies}
                currentCompany={currentCompany}
                permissions={currentPermissions}
                onChange={switchCompany}
              />
              <h1>{active}</h1>
            </div>
            <div className="topbar-actions">
              <span className="user-badge">{currentUser?.name || "Admin"}</span>
            </div>
          </header>

          <div className="metrics">
            <button
              type="button"
              className={`metric-card ${active === "Pendentes" ? "active" : ""}`}
              onClick={() => applyMetricFilter("pending")}
            >
              <span>Pendentes</span>
              <strong>{metrics.pending}</strong>
            </button>
            <button
              type="button"
              className={`metric-card ${active === "Respondidas" ? "active" : ""}`}
              onClick={() => applyMetricFilter("answered")}
            >
              <span>Respondidas</span>
              <strong>{metrics.answered}</strong>
            </button>
            <button
              type="button"
              className={`metric-card ${priorityFilter === "Alta" ? "active" : ""}`}
              onClick={() => applyMetricFilter("high")}
            >
              <span>Prioridade alta</span>
              <strong>{metrics.high}</strong>
            </button>
          </div>

          {answerNotice || answerError ? (
            <div className={`answer-feedback ${answerFeedbackClass}`}>
              {answerError || answerNotice}
            </div>
          ) : null}

          <div className="filters">
            <label>
              Marketplace
              <select
                value={marketplaceFilter}
                onChange={(event) => setMarketplaceFilter(event.target.value)}
              >
                {marketplaces.map((marketplace) => (
                  <option key={marketplace}>{marketplace}</option>
                ))}
              </select>
            </label>
            {active === "Respondidas" ? (
              <label>
                Origem da resposta
                <select
                  value={answeredSourceFilter}
                  onChange={(event) => setAnsweredSourceFilter(event.target.value)}
                >
                  <option value="Todas">Todas</option>
                  <option value="app">Respondidas pelo app</option>
                  <option value="portal">Respondidas pelo portal</option>
                </select>
              </label>
            ) : null}
          </div>

          <div className="question-list">
            {!isMercadoLivreConnected && !hasVisibleQuestions ? (
              <div className="inbox-empty">
                <div className="empty-icon">
                  <PlugZap size={30} />
                </div>
                <h2>{emptyQuestionTitle}</h2>
                <p>Conecte o Mercado Livre da {currentCompany?.name || "CPAP Express"} para buscar perguntas reais.</p>
                <button className="primary" onClick={() => changeSection("Integrações")}>
                  <PlugZap size={17} />
                  Abrir integrações
                </button>
              </div>
            ) : conversationGroups.length === 0 ? (
              <div className="inbox-empty">
                <div className="empty-icon">
                  <Inbox size={30} />
                </div>
                <h2>{emptyQuestionTitle}</h2>
                <p>{questionNotice || "Sincronize o Mercado Livre ou ajuste os filtros atuais."}</p>
              </div>
            ) : isPendingScreen ? (
              conversationGroups.map((question) => (
                <PendingQuestionCard
                  key={question.id}
                  question={question}
                  sourceLabel={getMarketplaceShortName(question.marketplace, integrations)}
                  sourceColor={getMarketplaceColor(question.marketplace, integrations)}
                  onApprove={approveQuestion}
                  onEdit={openEditorForQuestion}
                  onGenerate={generateSuggestion}
                  isApproving={sendingAnswerId === (question.questions?.find((item) => item.status === "Pendente") || question).id}
                  isGenerating={generatingQuestionId === (question.questions?.find((item) => item.status === "Pendente") || question).id}
                />
              ))
            ) : (
              conversationGroups.map((question) => (
                <QuestionRow
                  key={question.id}
                  question={question}
                  selected={selectedId === question.id}
                  onSelect={() => selectQuestion(question.id)}
                  sourceLabel={getMarketplaceShortName(question.marketplace, integrations)}
                  sourceColor={getMarketplaceColor(question.marketplace, integrations)}
                />
              ))
            )}
          </div>
            </section>

            <div className={`conversation-panel ${showConversation ? "show-mobile" : ""}`}>
              <Conversation
                question={selectedQuestion}
                onBack={closeConversation}
                onApprove={approveQuestion}
                onGenerate={generateSuggestion}
                onReject={rejectQuestion}
                readOnly={isReadOnlyAnsweredScreen || selectedQuestion?.status === "Respondida"}
                isApproving={sendingAnswerId === selectedEditableQuestion?.id}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}


