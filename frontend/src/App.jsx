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

const navItems = [
  { label: "Inbox", icon: Inbox },
  { label: "Pendentes", icon: Clock3 },
  { label: "Respondidas", icon: Send },
  { label: "Integrações", icon: PlugZap },
  { label: "Analytics", icon: BarChart3 },
  { label: "Configurações", icon: Settings },
];

const toneOptions = [
  "Técnico, claro e confiável",
  "Curto e objetivo",
  "Comercial e persuasivo",
  "Humanizado e cordial",
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

const CURRENT_COMPANY = { id: "cpap_express", name: "CPAP Express", plan: "Business" };
const CURRENT_USER = {
  id: "u-admin",
  name: "Admin",
  email: "admin@cpapexpress.com.br",
  role: "admin",
};

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
    greeting: "Olá! Obrigado pela pergunta.",
    closing: "Ficamos à disposição.",
    tone: "Técnico, claro e confiável",
    autoApprove: false,
    maxRewriteAttempts: 3,
    customPrompt: "",
  },
  usageLogs: [],
};

const statusClass = {
  Pendente: "pending",
  Respondida: "answered",
  Rejeitada: "rejected",
  Conectado: "approved",
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
  if (source === "app") return "Respondida pelo app";
  if (source === "mercado_livre_portal") return "Respondida no Mercado Livre";
  return "";
}

function normalizeInstruction(instruction) {
  return instruction
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function mapMercadoLivreQuestionToUi(question, index) {
  const rawPayload = question.raw_payload || {};
  const externalId = question.external_id || rawPayload.id || index + 1;

  return {
    id: question.id || `ml-${externalId}`,
    company_id: "cpap_express",
    marketplace: "Mercado Livre",
    product: question.product || question.product_title || rawPayload.item_id || "Produto Mercado Livre",
    customer_name: "Cliente Mercado Livre",
    question: question.question || question.question_text || rawPayload.text || "",
    created_at: question.created_at || rawPayload.date_created || new Date().toISOString(),
    status: question.status || "Pendente",
    priority: "Media",
    ai_suggestion: question.ai_suggestion || "Sugestão ainda não gerada. Clique em gerar nova sugestão.",
    has_ai_suggestion: question.has_ai_suggestion ?? Boolean(question.ai_suggestion),
    sku: rawPayload.item_id || "ML",
    price: "",
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

function applyBackendHealthToIntegrations(integrations, healthItems, companyId) {
  const healthById = new Map((healthItems || []).map((health) => [health.id, health]));
  const mercadoLivreHealth = healthById.get("mercado-livre");
  const isCpapExpress = companyId === CURRENT_COMPANY.id;
  const isMercadoLivreConnected =
    isCpapExpress && isBackendIntegrationConnected(mercadoLivreHealth);

  return integrations.map((integration) => {
    if (integration.id !== "mercado-livre") {
      return integration;
    }

    return {
      ...integration,
      status: isMercadoLivreConnected ? "Conectado" : "Não conectado",
      store: isMercadoLivreConnected ? "CPAP Express Mercado Livre" : "",
      lastSync: isMercadoLivreConnected ? mercadoLivreHealth?.last_sync || new Date().toISOString() : "",
      token_status: mercadoLivreHealth?.token_status || "missing",
      last_error: mercadoLivreHealth?.last_error || "",
    };
  });
}

function Sidebar({ active, setActive }) {
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
              onClick={() => setActive(item.label)}
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
  onFetchRealQuestions,
  onSyncProducts,
  canFetchRealQuestions,
  isFetchingRealQuestions,
  isSyncingProducts,
}) {
  const isConnected = integration.status === "Conectado";

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

function ConnectModal({ integration, onCancel, onConfirm }) {
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
        <div className="modal-actions">
          <button className="secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button className="primary" onClick={() => onConfirm(integration.id)}>
            <ExternalLink size={17} />
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}

function IntegrationsPage({
  integrations,
  integrationHealth,
  onConnect,
  onFetchRealQuestions,
  onSyncProducts,
  onTestHealth,
  fetchingRealQuestions,
  syncingProducts,
  testingIntegrationId,
  pendingIntegration,
  onCancelConnect,
  onConfirmConnect,
}) {
  const connectedCount = integrations.filter((item) => item.status === "Conectado").length;

  return (
    <section className="integrations-page">
      <header className="topbar">
        <div>
          <span>CPAP Express · Marketplaces e operação</span>
          <h1>Integrações</h1>
        </div>
        <div className="topbar-actions">
          <span className="user-badge">Admin</span>
        </div>
      </header>

      <div className="integration-hero">
        <div>
          <span>Central de canais</span>
          <h2>{connectedCount} integrações conectadas</h2>
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
            onFetchRealQuestions={onFetchRealQuestions}
            onSyncProducts={onSyncProducts}
            canFetchRealQuestions={
              integration.id === "mercado-livre" &&
              integration.status === "Conectado"
            }
            isFetchingRealQuestions={fetchingRealQuestions}
            isSyncingProducts={syncingProducts}
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
      />
    </section>
  );
}

function SettingsPage({ appData, onSettingsSaved }) {
  const [settingsDraft, setSettingsDraft] = useState({
    greeting: appData.aiSettings.greeting || "Olá! Obrigado pela pergunta.",
    closing: appData.aiSettings.closing || "Ficamos à disposição.",
    tone: appData.aiSettings.tone || "Técnico, claro e confiável",
    custom_prompt: appData.aiSettings.customPrompt || "",
  });
  const [settingsMessage, setSettingsMessage] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    setSettingsDraft({
      greeting: appData.aiSettings.greeting || "Olá! Obrigado pela pergunta.",
      closing: appData.aiSettings.closing || "Ficamos à disposição.",
      tone: appData.aiSettings.tone || "Técnico, claro e confiável",
      custom_prompt: appData.aiSettings.customPrompt || "",
    });
  }, [
    appData.aiSettings.greeting,
    appData.aiSettings.closing,
    appData.aiSettings.tone,
    appData.aiSettings.customPrompt,
  ]);

  async function saveSettings() {
    setSettingsMessage("");
    setIsSavingSettings(true);
    try {
      const response = await fetch(`${API_URL}/company/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(settingsDraft),
      });
      if (!response.ok) throw new Error("Não foi possível salvar as configurações.");
      const saved = await response.json();
      onSettingsSaved(saved);
      setSettingsMessage("Configurações salvas.");
    } catch (error) {
      setSettingsMessage(error.message || "Não foi possível salvar as configurações.");
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <section className="settings-page">
      <header className="topbar">
        <div>
          <span>CPAP Express · Empresa e IA</span>
          <h1>Configurações</h1>
        </div>
        <div className="topbar-actions">
          <span className="user-badge">Admin</span>
        </div>
      </header>

      <section className="settings-layout">
        <div className="settings-card settings-form">
          <span>Regras de resposta da IA</span>
          <h2>Como responder perguntas do Mercado Livre</h2>
          <p>
            Essas regras são usadas para novas sugestões e reescritas. Respostas já salvas não são
            alteradas automaticamente.
          </p>
          <label>
            Saudação padrão
            <input
              value={settingsDraft.greeting}
              onChange={(event) => setSettingsDraft((current) => ({ ...current, greeting: event.target.value }))}
            />
          </label>
          <label>
            Despedida padrão
            <input
              value={settingsDraft.closing}
              onChange={(event) => setSettingsDraft((current) => ({ ...current, closing: event.target.value }))}
            />
          </label>
          <label>
            Tom de resposta
            <select
              value={settingsDraft.tone}
              onChange={(event) => setSettingsDraft((current) => ({ ...current, tone: event.target.value }))}
            >
              {toneOptions.map((tone) => (
                <option key={tone} value={tone}>
                  {tone}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prompt personalizado
            <textarea
              placeholder="Ex: Sempre mencione que não podemos confirmar prazo sem CEP. Não prometer compatibilidade sem dados do anúncio."
              value={settingsDraft.custom_prompt}
              onChange={(event) => setSettingsDraft((current) => ({ ...current, custom_prompt: event.target.value }))}
            />
          </label>
          <button className="primary" onClick={saveSettings} disabled={isSavingSettings}>
            {isSavingSettings ? <RefreshCw size={17} className="spin" /> : <Check size={17} />}
            {isSavingSettings ? "Salvando..." : "Salvar configurações"}
          </button>
          {settingsMessage ? <p className="settings-message">{settingsMessage}</p> : null}
        </div>

        <aside className="settings-card settings-preview">
          <span>Prévia operacional</span>
          <h2>CPAP Express</h2>
          <dl>
            <div>
              <dt>Saudação</dt>
              <dd>{settingsDraft.greeting}</dd>
            </div>
            <div>
              <dt>Tom</dt>
              <dd>{settingsDraft.tone}</dd>
            </div>
            <div>
              <dt>Despedida</dt>
              <dd>{settingsDraft.closing}</dd>
            </div>
          </dl>
          <p>
            A IA continuará sem envio automático. Toda resposta precisa ser revisada e aprovada por
            Admin antes de ir para o Mercado Livre.
          </p>
        </aside>
      </section>
    </section>
  );
}

function AnalyticsPage({ questions, appData, productsSummary }) {
  const pending = questions.filter((question) => question.status === "Pendente").length;
  const answered = questions.filter((question) => question.status === "Respondida").length;
  const highPriority = questions.filter((question) => question.priority === "Alta").length;

  return (
    <section className="settings-page">
      <header className="topbar">
        <div>
          <span>CPAP Express · Operação</span>
          <h1>Analytics</h1>
        </div>
        <div className="topbar-actions">
          <span className="user-badge">Admin</span>
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

function QuestionRow({ question, selected, onSelect, sourceLabel, sourceColor }) {
  return (
    <button className={`question-row ${selected ? "selected" : ""}`} onClick={onSelect}>
      <div className="row-top">
        <div className="source-line">
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
  const hasSuggestion = question.has_ai_suggestion !== false;

  return (
    <article className="pending-card">
      <div className="row-top">
        <div className="source-line">
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

      <h3>{question.product}</h3>
      <p className="pending-question">{question.question}</p>

      <div className="suggestion-preview">
        <span>Sugestão da IA</span>
        <p>{question.ai_suggestion}</p>
      </div>

      <RelatedProducts products={question.related_products} />

      <div className="pending-actions">
        <button className="primary" onClick={() => onApprove(question.id, question.ai_suggestion)} disabled={isApproving}>
          {isApproving ? <RefreshCw size={18} className="spin" /> : <Check size={18} />}
          {isApproving ? "Enviando..." : "Aprovar e enviar"}
        </button>
        <button className="secondary" onClick={() => onEdit(question.id)}>
          <Sparkles size={17} />
          Editar / melhorar
        </button>
        {!hasSuggestion ? (
          <button className="secondary" onClick={() => onGenerate(question.id)} disabled={isGenerating}>
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

function Conversation({ question, onBack, onApprove, onGenerate, onReject, readOnly, isApproving }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState("");
  const [rewriteInstruction, setRewriteInstruction] = useState("");
  const [versions, setVersions] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState("original");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState("");

  useEffect(() => {
    const originalText = question?.ai_suggestion || "";
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
  const hasSuggestion = question?.has_ai_suggestion !== false;

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
            <span>{question.marketplace}</span>
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
          <div className="message customer">
            <span>{question.customer_name}</span>
            <p>{question.question}</p>
            <small>{formatDate(question.created_at)}</small>
          </div>

          <div className="read-only-answer">
            <div className="ai-card-header">
              <div>
                <Send size={18} />
                <strong>Resposta enviada</strong>
              </div>
              <span>{question.approved_by || "Sistema"}</span>
            </div>
            <p>{question.final_response || question.ai_suggestion}</p>
            <dl>
              <div>
                <dt>Marketplace</dt>
                <dd>{question.marketplace}</dd>
              </div>
              <div>
                <dt>Produto</dt>
                <dd>{question.product}</dd>
              </div>
              <div>
                <dt>Respondida em</dt>
                <dd>{question.answered_at ? formatDate(question.answered_at) : "Não informado"}</dd>
              </div>
              <div>
                <dt>Aprovada por</dt>
                <dd>{question.approved_by || "Não informado"}</dd>
              </div>
              <div>
                <dt>Origem</dt>
                <dd>{getAnsweredSourceLabel(question.answered_source) || "Não informado"}</dd>
              </div>
            </dl>
          </div>
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
    const response = await fetch(AI_REWRITE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: question.question,
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
    const suggestion = await onGenerate(question.id);
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
    onApprove(question.id, {
      ai_suggestion: question.ai_suggestion,
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
          <span>{question.marketplace}</span>
          <h2>{question.product}</h2>
          <p>
            SKU {question.sku} · {question.price}
          </p>
        </div>
        <span className={`pill status ${statusClass[question.status]}`}>{question.status}</span>
      </header>

      <div className="chat-surface">
        <div className="message customer">
          <span>{question.customer_name}</span>
          <p>{question.question}</p>
          <small>{formatDate(question.created_at)}</small>
        </div>

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
            <button className="danger" onClick={() => onReject(question.id)}>
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
  const currentUser = CURRENT_USER;
  const [appData, setAppData] = useState(initialAppData);
  const [active, setActive] = useState("Inbox");
  const [integrationHealth, setIntegrationHealth] = useState(initialIntegrationHealth);
  const [pendingIntegration, setPendingIntegration] = useState(null);
  const [fetchingMlQuestions, setFetchingMlQuestions] = useState(false);
  const [syncingProducts, setSyncingProducts] = useState(false);
  const [productsSummary, setProductsSummary] = useState({ total: 0, active: 0, inactive: 0 });
  const [sendingAnswerId, setSendingAnswerId] = useState(null);
  const [generatingQuestionId, setGeneratingQuestionId] = useState(null);
  const [answerNotice, setAnswerNotice] = useState("");
  const [answerError, setAnswerError] = useState("");
  const [questionNotice, setQuestionNotice] = useState("");
  const [testingIntegrationId, setTestingIntegrationId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [marketplaceFilter, setMarketplaceFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
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

  async function loadQuestionsFromDatabase() {
    const response = await fetch(`${API_URL}/questions`);
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
    const response = await fetch(`${API_URL}/products`);
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

  useEffect(() => {
    setSelectedId((current) => current || questions[0]?.id || null);
  }, [questions]);

  useEffect(() => {
    async function loadPersistedQuestions() {
      try {
        await loadQuestionsFromDatabase();
      } catch (error) {
        setQuestionNotice(error.message || "Não foi possível carregar perguntas do banco.");
      }
    }

    async function loadCompanySettings() {
      try {
        const response = await fetch(`${API_URL}/company/settings`);
        const settings = await response.json();
        if (response.ok) {
          setAppData((current) => ({
            ...current,
            aiSettings: {
              ...current.aiSettings,
              greeting: settings.greeting,
              closing: settings.closing,
              tone: settings.tone || current.aiSettings.tone,
              customPrompt: settings.custom_prompt || "",
            },
          }));
        }
      } catch {
        // Settings keep local defaults when backend is unavailable.
      }
    }

    loadPersistedQuestions();
    loadCompanySettings();
    loadProductsSummary().catch(() => {});
  }, []);

  useEffect(() => {
    async function loadIntegrationHealth() {
      try {
        const response = await fetch(`${API_URL}/integrations/health`);
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) {
          throw new Error("Invalid integration health response");
        }
        const mercadoLivreHealth = data.filter((health) => health.id === "mercado-livre");
        setIntegrationHealth(mercadoLivreHealth);
        setIntegrations((current) =>
          applyBackendHealthToIntegrations(current, mercadoLivreHealth, CURRENT_COMPANY.id)
        );
      } catch {
        setIntegrationHealth(initialIntegrationHealth);
        setIntegrations((current) =>
          applyBackendHealthToIntegrations(current, initialIntegrationHealth, CURRENT_COMPANY.id)
        );
      }
    }

    loadIntegrationHealth();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("ml_connected") !== "true") return;
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  useEffect(() => {
    function handleBrowserBack() {
      if (showConversation) {
        setShowConversation(false);
      }
    }

    window.addEventListener("popstate", handleBrowserBack);
    return () => window.removeEventListener("popstate", handleBrowserBack);
  }, [showConversation]);

  const visibleQuestions = questions;

  const selectedQuestion = visibleQuestions.find((question) => question.id === selectedId);
  const marketplaces = useMemo(
    () => ["Todos", ...new Set(visibleQuestions.map((question) => question.marketplace))],
    [visibleQuestions]
  );
  const statuses = useMemo(
    () => ["Todos", ...new Set(visibleQuestions.map((question) => question.status))],
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
      const statusMatches = forcedStatus
        ? question.status === forcedStatus
        : statusFilter === "Todos" || question.status === statusFilter;
      const answeredSourceMatches =
        active !== "Respondidas" ||
        answeredSourceFilter === "Todas" ||
        question.answered_source === answeredSourceFilter;
      return marketplaceMatches && statusMatches && answeredSourceMatches;
    });
  }, [active, visibleQuestions, marketplaceFilter, statusFilter, answeredSourceFilter]);

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

  useEffect(() => {
    if (selectedId && !visibleQuestions.some((question) => question.id === selectedId)) {
      setSelectedId(visibleQuestions[0]?.id || null);
      setShowConversation(false);
    }

    if (marketplaceFilter !== "Todos" && !marketplaces.includes(marketplaceFilter)) {
      setMarketplaceFilter("Todos");
    }
  }, [marketplaceFilter, marketplaces, selectedId, visibleQuestions]);

  function selectQuestion(id) {
    if (!(showConversation && selectedId === id)) {
      window.history.pushState({ marketplaceAiView: "question", questionId: id }, "");
    }
    setQuestionNotice("");
    setSelectedId(id);
    setShowConversation(true);
  }

  function openEditorForQuestion(id) {
    if (!(showConversation && selectedId === id)) {
      window.history.pushState({ marketplaceAiView: "question", questionId: id }, "");
    }
    setSelectedId(id);
    setShowConversation(true);
  }

  function closeConversation() {
    if (window.history.state?.marketplaceAiView === "question") {
      window.history.back();
      return;
    }
    setShowConversation(false);
  }

  function changeSection(section) {
    setActive(section);
    setShowConversation(false);
  }

  async function generateSuggestion(id) {
    setGeneratingQuestionId(id);
    const targetQuestion = questions.find((question) => question.id === id);
    try {
      if (!targetQuestion) return "";

      try {
        const response = await fetch(`${API_URL}/questions/generate`, {
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

    if (isRealMercadoLivreQuestion) {
      setSendingAnswerId(id);
      try {
        const response = await fetch(`${API_URL}/questions/answer`, {
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
                  answered_source: updatedQuestion.answered_source || (data.already_answered ? "mercado_livre_portal" : "app"),
                  approved_by: updatedQuestion.approved_by || currentUser?.name || "Usuário",
                  ml_answer_response: data.raw_response,
                }
              : question
          )
        );
        setAnswerNotice(
          data.already_answered
            ? data.message || "Essa pergunta já foi respondida no Mercado Livre."
            : "Resposta enviada ao Mercado Livre"
        );
      } catch (error) {
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
    setPendingIntegration(integration);
  }

  async function confirmConnect(id) {
    if (id === "mercado-livre") {
      try {
        const response = await fetch(`${API_URL}/integrations/mercadolivre/auth-url`);
        const data = await response.json();
        if (data.configured && data.auth_url) {
          window.location.href = data.auth_url;
          return;
        }
        setQuestionNotice("OAuth do Mercado Livre não está configurado no backend.");
      } catch {
        setQuestionNotice("Não foi possível iniciar a conexão com o Mercado Livre.");
      } finally {
        setPendingIntegration(null);
      }
      return;
    }
  }

  async function fetchMercadoLivreQuestions() {
    setFetchingMlQuestions(true);
    setQuestionNotice("");
    try {
      const response = await fetch(`${API_URL}/integrations/mercadolivre/questions`);
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
      setStatusFilter("Todos");
      setIntegrations((current) =>
        current.map((integration) =>
          integration.id === "mercado-livre"
            ? {
                ...integration,
                status: "Conectado",
                store: integration.store || "CPAP Express Mercado Livre",
                lastSync: new Date().toISOString(),
                token_status: "valid",
              }
            : integration
          )
      );

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
      const response = await fetch(`${API_URL}/integrations/mercadolivre/products/sync`, {
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
      const response = await fetch(`${API_URL}/integrations/${id}/test`, { method: "POST" });
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
      <Sidebar active={active} setActive={changeSection} />

      <main className={`workspace ${isIntegrations || isSettings || isAnalytics ? "single-view" : ""}`}>
        {isIntegrations ? (
          <IntegrationsPage
            integrations={integrations}
            integrationHealth={integrationHealth}
            onConnect={openConnectModal}
            onFetchRealQuestions={fetchMercadoLivreQuestions}
            onSyncProducts={syncMercadoLivreProducts}
            onTestHealth={testIntegrationHealth}
            fetchingRealQuestions={fetchingMlQuestions}
            syncingProducts={syncingProducts}
            testingIntegrationId={testingIntegrationId}
            pendingIntegration={pendingIntegration}
            onCancelConnect={() => setPendingIntegration(null)}
            onConfirmConnect={confirmConnect}
          />
        ) : isSettings ? (
          <SettingsPage
            appData={appData}
            onSettingsSaved={(settings) =>
              setAppData((current) => ({
                ...current,
                aiSettings: {
                  ...current.aiSettings,
                  greeting: settings.greeting,
                  closing: settings.closing,
                  tone: settings.tone || current.aiSettings.tone,
                  customPrompt: settings.custom_prompt || "",
                },
              }))
            }
          />
        ) : isAnalytics ? (
          <AnalyticsPage questions={visibleQuestions} appData={appData} productsSummary={productsSummary} />
        ) : (
          <>
            <section className={`inbox-panel ${showConversation ? "hide-mobile" : ""}`}>
          <header className="topbar">
            <div>
              <span>CPAP Express</span>
              <h1>{active}</h1>
            </div>
            <div className="topbar-actions">
              <span className="user-badge">Admin</span>
            </div>
          </header>

          <div className="metrics">
            <article>
              <span>Pendentes</span>
              <strong>{metrics.pending}</strong>
            </article>
            <article>
              <span>Respondidas</span>
              <strong>{metrics.answered}</strong>
            </article>
            <article>
              <span>Prioridade alta</span>
              <strong>{metrics.high}</strong>
            </article>
          </div>

          <div className="tenant-strip">
            <span>1 usuário</span>
            <span>IA: {appData.aiSettings.tone}</span>
            <span>
              Uso: {appData.usageLogs.reduce((total, log) => total + log.count, 0)} eventos
            </span>
          </div>

          {answerNotice || answerError ? (
            <div className={`answer-feedback ${answerError ? "error" : "success"}`}>
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
            <label>
              Status
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
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
                  <option value="mercado_livre_portal">Respondidas no Mercado Livre</option>
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
                <p>Conecte o Mercado Livre da CPAP Express para buscar perguntas reais.</p>
                <button className="primary" onClick={() => changeSection("Integrações")}>
                  <PlugZap size={17} />
                  Abrir integrações
                </button>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="inbox-empty">
                <div className="empty-icon">
                  <Inbox size={30} />
                </div>
                <h2>{emptyQuestionTitle}</h2>
                <p>{questionNotice || "Sincronize o Mercado Livre ou ajuste os filtros atuais."}</p>
              </div>
            ) : isPendingScreen ? (
              filteredQuestions.map((question) => (
                <PendingQuestionCard
                  key={question.id}
                  question={question}
                  sourceLabel={getMarketplaceShortName(question.marketplace, integrations)}
                  sourceColor={getMarketplaceColor(question.marketplace, integrations)}
                  onApprove={approveQuestion}
                  onEdit={openEditorForQuestion}
                  onGenerate={generateSuggestion}
                  isApproving={sendingAnswerId === question.id}
                  isGenerating={generatingQuestionId === question.id}
                />
              ))
            ) : (
              filteredQuestions.map((question) => (
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
                isApproving={sendingAnswerId === selectedQuestion?.id}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}


