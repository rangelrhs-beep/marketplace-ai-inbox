import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Check,
  ChevronLeft,
  Clock3,
  ExternalLink,
  Inbox,
  MessageCircle,
  Plus,
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
const AI_SUGGEST_URL = `${API_URL}/ai/suggest`;

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
  {
    id: "shopee",
    name: "Shopee",
    shortName: "Shopee",
    color: "#ee4d2d",
    status: "Não conectado",
    store: "",
    lastSync: "",
  },
  {
    id: "magalu",
    name: "Magalu",
    shortName: "Magalu",
    color: "#0086ff",
    status: "Não conectado",
    store: "",
    lastSync: "",
  },
  {
    id: "amazon",
    name: "Amazon",
    shortName: "Amazon",
    color: "#ff9900",
    status: "Não conectado",
    store: "",
    lastSync: "",
  },
  {
    id: "tiny-erp",
    name: "Tiny ERP",
    shortName: "Tiny",
    color: "#16a34a",
    status: "Em breve",
    store: "",
    lastSync: "",
  },
];

const demoQuestions = [
  {
    id: 1,
    marketplace: "Mercado Livre",
    product: "Kit 3 Camisetas Premium Algodao",
    customer_name: "Mariana",
    question: "Boa tarde! Esse kit tem a camiseta preta no tamanho M? Entrega chega antes de sexta?",
    created_at: "2026-04-25T10:42:00",
    status: "Pendente",
    priority: "Alta",
    ai_suggestion:
      "Ola, Mariana! Temos sim a camiseta preta no tamanho M. Para confirmar o prazo de chegada antes de sexta, basta inserir seu CEP no anuncio que o Mercado Livre mostra a estimativa atualizada.",
    sku: "CAM-KIT-003",
    price: "R$ 129,90",
  },
  {
    id: 2,
    marketplace: "Mercado Livre",
    product: "Fone Bluetooth Noise Canceling Pro",
    customer_name: "Diego",
    question: "O produto e original? Tem garantia?",
    created_at: "2026-04-25T09:18:00",
    status: "Pendente",
    priority: "Media",
    ai_suggestion:
      "Ola, Diego! Sim, o produto e original, acompanha nota fiscal e possui garantia de 12 meses contra defeitos de fabricacao.",
    sku: "FON-BT-PRO",
    price: "R$ 249,00",
  },
  {
    id: 3,
    marketplace: "Mercado Livre",
    product: "Suporte Articulado para Monitor",
    customer_name: "Carla",
    question: "Serve para monitor ultrawide de 34 polegadas?",
    created_at: "2026-04-24T17:05:00",
    status: "Pendente",
    priority: "Baixa",
    ai_suggestion:
      "Ola, Carla! Esse suporte e compativel com monitores de ate 32 polegadas. Para ultrawide de 34 polegadas, recomendamos verificar peso e padrao VESA.",
    sku: "SUP-MON-ARM",
    price: "R$ 189,90",
  },
  {
    id: 4,
    marketplace: "Mercado Livre",
    product: "Mochila Executiva Impermeavel USB",
    customer_name: "Renato",
    question: "Cabe notebook de 15.6 e tem divisoria acolchoada?",
    created_at: "2026-04-24T14:32:00",
    status: "Respondida",
    priority: "Media",
    ai_suggestion:
      "Ola, Renato! Cabe notebook de ate 15.6 polegadas e possui divisoria acolchoada para melhor protecao.",
    sku: "MOC-EXEC-USB",
    price: "R$ 159,90",
  },
  {
    id: 5,
    marketplace: "Shopee",
    product: "Organizador de Cabos Mesa Home Office",
    customer_name: "Luciana",
    question: "Vem com fita dupla face para instalar?",
    created_at: "2026-04-23T11:20:00",
    status: "Pendente",
    priority: "Baixa",
    ai_suggestion:
      "Ola, Luciana! Sim, o organizador acompanha fita dupla face para uma instalacao pratica na mesa.",
    sku: "ORG-CAB-HO",
    price: "R$ 39,90",
  },
  {
    id: 6,
    marketplace: "Shopee",
    product: "Luminaria LED Articulada para Mesa",
    customer_name: "Paulo",
    question: "A luz tem ajuste de intensidade? Funciona ligada no USB do notebook?",
    created_at: "2026-04-26T16:10:00",
    status: "Pendente",
    priority: "Media",
    ai_suggestion:
      "Ola, Paulo! Sim, a luminaria possui ajuste de intensidade e funciona via USB, inclusive conectada ao notebook.",
    sku: "LUM-LED-USB",
    price: "R$ 74,90",
  },
  {
    id: 7,
    marketplace: "Magalu",
    product: "Cafeteira Espresso Compacta 20 Bar",
    customer_name: "Bianca",
    question: "Ela aceita capsula ou somente po de cafe?",
    created_at: "2026-04-26T13:48:00",
    status: "Pendente",
    priority: "Alta",
    ai_suggestion:
      "Ola, Bianca! Esse modelo utiliza po de cafe e acompanha filtro proprio. Ele nao e compativel com capsulas.",
    sku: "CAF-ESP-20B",
    price: "R$ 599,00",
  },
  {
    id: 8,
    marketplace: "Amazon",
    product: "Echo Speaker Smart Home Hub",
    customer_name: "Andre",
    question: "Consigo controlar lampadas inteligentes de outras marcas?",
    created_at: "2026-04-26T08:25:00",
    status: "Respondida",
    priority: "Baixa",
    ai_suggestion:
      "Ola, Andre! Sim, voce consegue controlar lampadas inteligentes compativeis com Alexa.",
    sku: "ECH-HUB-5G",
    price: "R$ 429,00",
  },
  {
    id: 9,
    marketplace: "Magalu",
    product: "Aspirador Robo Smart Mapeamento",
    customer_name: "Fernanda",
    question: "Ele passa pano tambem ou so aspira?",
    created_at: "2026-04-25T19:04:00",
    status: "Pendente",
    priority: "Media",
    ai_suggestion:
      "Ola, Fernanda! Esse modelo aspira e tambem passa pano com reservatorio de agua.",
    sku: "ASP-ROB-MAP",
    price: "R$ 899,90",
  },
  {
    id: 10,
    marketplace: "Amazon",
    product: "Kindle Paperwhite 16 GB",
    customer_name: "Roberto",
    question: "O aparelho vem com anuncios na tela de bloqueio?",
    created_at: "2026-04-25T15:36:00",
    status: "Respondida",
    priority: "Baixa",
    ai_suggestion:
      "Ola, Roberto! Este anuncio e da versao sem ofertas especiais, portanto nao exibe anuncios na tela de bloqueio.",
    sku: "KDL-PW-16",
    price: "R$ 699,00",
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
  {
    id: "shopee",
    channel: "Shopee",
    connected: false,
    api_status: "degraded",
    last_sync: null,
    last_error: "Integração mockada até conectar API real.",
    token_status: "missing",
  },
  {
    id: "magalu",
    channel: "Magalu",
    connected: false,
    api_status: "down",
    last_sync: null,
    last_error: "Integração mockada até conectar API real.",
    token_status: "missing",
  },
  {
    id: "amazon",
    channel: "Amazon",
    connected: false,
    api_status: "down",
    last_sync: null,
    last_error: "Mocked API failure: Amazon SP-API credentials not configured.",
    token_status: "missing",
  },
  {
    id: "tiny-erp",
    channel: "Tiny ERP",
    connected: false,
    api_status: "degraded",
    last_sync: null,
    last_error: "Question sync is not available for Tiny ERP yet.",
    token_status: "not_required",
  },
];

const CURRENT_COMPANY = { id: "cpap_express", name: "CPAP Express", plan: "Business" };
const CURRENT_USER = {
  id: "u-admin",
  name: "Admin",
  email: "admin@cpapexpress.demo",
  role: "admin",
};

function integrationState(overrides = {}) {
  return initialIntegrations.map((integration) => ({
    ...integration,
    status: integration.id === "tiny-erp" ? "Em breve" : "Não conectado",
    store: "",
    lastSync: "",
    token_status: integration.id === "tiny-erp" ? "not_required" : "missing",
    ...overrides[integration.id],
  }));
}

function getDemoQuestions() {
  return demoQuestions
    .filter((question) => question.marketplace === "Mercado Livre")
    .map((question) => ({ ...question, company_id: CURRENT_COMPANY.id }));
}

const initialAppData = {
  integrations: integrationState(),
  questions: [],
  aiSettings: {
    tone: "Técnico, claro e confiável",
    autoApprove: false,
    maxRewriteAttempts: 3,
  },
  usageLogs: [
    { id: 1, action: "ml_oauth_connected", count: 1, created_at: "2026-05-01T09:15:00" },
    { id: 2, action: "ai_rewrite", count: 12, created_at: "2026-05-01T09:40:00" },
  ],
};

const statusClass = {
  Pendente: "pending",
  Aprovada: "approved",
  Respondida: "answered",
  Rejeitada: "rejected",
  Conectado: "approved",
  "Não conectado": "disconnected",
  "Em breve": "soon",
};

const priorityClass = {
  Alta: "high",
  Media: "medium",
  Baixa: "low",
};

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getMarketplaceShortName(marketplace, integrations) {
  return integrations.find((integration) => integration.name === marketplace)?.shortName || marketplace;
}

function getMarketplaceColor(marketplace, integrations) {
  return integrations.find((integration) => integration.name === marketplace)?.color || "#2563eb";
}

function normalizeInstruction(instruction) {
  return instruction
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function generateMockAiRewrite(originalResponse, instruction, question) {
  const normalizedInstruction = normalizeInstruction(instruction);
  const product = question?.product || "produto";
  const customerName = question?.customer_name || "cliente";

  // Future integration point: replace these branches with a backend call to an OpenAI rewrite endpoint.
  if (normalizedInstruction.includes("tecnica") || normalizedInstruction.includes("tecnico")) {
    return `Ola, ${customerName}! Sobre o ${product}, confirmamos as informacoes conforme as especificacoes do anuncio. Recomendamos verificar compatibilidade, dimensoes, variacoes disponiveis e prazo de entrega diretamente no checkout antes da compra. Ficamos a disposicao para ajudar com qualquer detalhe tecnico.`;
  }

  if (normalizedInstruction.includes("curta") || normalizedInstruction.includes("curto")) {
    return `Ola, ${customerName}! Sim, as informacoes do anuncio estao atualizadas. Para prazo e disponibilidade, confira pelo CEP no checkout. Ficamos a disposicao!`;
  }

  if (normalizedInstruction.includes("vendedor") || normalizedInstruction.includes("comercial") || normalizedInstruction.includes("venda")) {
    return `Ola, ${customerName}! Esse ${product} e uma otima escolha. As informacoes estao atualizadas no anuncio e nosso time esta pronto para enviar com agilidade. Pode comprar com tranquilidade, seguimos a disposicao para ajudar.`;
  }

  if (normalizedInstruction.includes("garantia")) {
    return `Ola, ${customerName}! O ${product} acompanha garantia de 12 meses contra defeitos de fabricacao, conforme as condicoes do vendedor. Tambem recomendamos conferir prazo de entrega e disponibilidade pelo checkout antes de finalizar a compra.`;
  }

  return originalResponse
    .replace("Ficamos a disposicao!", "Seguimos a disposicao para ajudar.")
    .replace("Pode comprar com tranquilidade.", "A compra pode ser feita com tranquilidade.");
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
        <span>IA ativa</span>
        <strong>92%</strong>
        <p>das perguntas com sugestao pronta para revisao.</p>
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
  onDisconnect,
  onSync,
  onFetchRealQuestions,
  isSyncing,
  canFetchRealQuestions,
  isFetchingRealQuestions,
}) {
  const isConnected = integration.status === "Conectado";
  const isComingSoon = integration.status === "Em breve";

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
            <small>Ultima sincronizacao: {formatDate(integration.lastSync)}</small>
            <small>Token: {integration.token_status || "valid"}</small>
          </>
        ) : (
          <p>
            {isComingSoon
              ? "Integracao planejada para uma proxima etapa do produto."
              : "Conecte por autorizacao oficial para importar perguntas e manter a inbox atualizada."}
          </p>
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
                {isFetchingRealQuestions ? "Buscando..." : "Buscar perguntas reais"}
              </button>
            ) : null}
            <button className="secondary" onClick={() => onSync(integration.id)} disabled={isSyncing}>
              <RefreshCw size={17} className={isSyncing ? "spin" : ""} />
              {isSyncing ? "Sincronizando..." : "Sincronizar agora"}
            </button>
            <button className="danger" onClick={() => onDisconnect(integration.id)}>
              <X size={17} />
              Desconectar
            </button>
          </>
        ) : (
          <button className="primary" onClick={() => onConnect(integration)} disabled={isComingSoon}>
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
        <span>Conexao segura via OAuth</span>
        <h2>Conectar {integration.name}</h2>
        <p>
          Ao continuar, voce sera redirecionado para a pagina oficial de login e autorizacao do
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
  onDisconnect,
  onSync,
  onFetchRealQuestions,
  onTestHealth,
  syncingIntegrationId,
  fetchingRealQuestions,
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
          <button className="new-rule">
            <Plus size={18} />
            Adicionar
          </button>
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
            onDisconnect={onDisconnect}
            onSync={onSync}
            onFetchRealQuestions={onFetchRealQuestions}
            isSyncing={syncingIntegrationId === integration.id}
            canFetchRealQuestions={
              integration.id === "mercado-livre" &&
              integration.status === "Conectado"
            }
            isFetchingRealQuestions={fetchingRealQuestions}
          />
        ))}
      </div>

      <section className="add-marketplace">
        <div className="add-icon">
          <Plus size={24} />
        </div>
        <div>
          <span>Adicionar marketplace</span>
          <h2>Quer conectar outro canal?</h2>
          <p>
            Cadastre uma solicitacao para priorizar novos marketplaces, ERPs ou hubs de venda no
            roadmap de integracoes.
          </p>
        </div>
        <button className="secondary">
          <Plus size={17} />
          Solicitar integracao
        </button>
      </section>

      <section className="integration-health-section">
        <div className="section-heading">
          <div>
            <span>Monitoramento mockado</span>
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
                  <dt>Ultimo sync</dt>
                  <dd>{health.last_sync ? formatDate(health.last_sync) : "Ainda nao sincronizado"}</dd>
                </div>
                <div>
                  <dt>Token</dt>
                  <dd>{health.token_status}</dd>
                </div>
                <div>
                  <dt>Ultimo erro</dt>
                  <dd>{health.last_error || "Sem erros recentes"}</dd>
                </div>
              </dl>
              <button
                className="secondary"
                onClick={() => onTestHealth(health.id)}
                disabled={testingIntegrationId === health.id}
              >
                <RefreshCw size={17} className={testingIntegrationId === health.id ? "spin" : ""} />
                {testingIntegrationId === health.id ? "Testando..." : "Testar conexao"}
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
    greeting: appData.aiSettings.greeting || "Olá!",
    closing: appData.aiSettings.closing || "Ficamos à disposição.",
    tone: appData.aiSettings.tone || "",
    custom_prompt: appData.aiSettings.customPrompt || "",
  });
  const [settingsMessage, setSettingsMessage] = useState("");

  async function saveSettings() {
    setSettingsMessage("");
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
    }
  }

  return (
    <section className="settings-page">
      <header className="topbar">
        <div>
          <span>CPAP Express · Preparação para banco de dados</span>
          <h1>Configurações</h1>
        </div>
        <div className="topbar-actions">
          <span className="user-badge">Admin</span>
        </div>
      </header>

      <div className="settings-grid">
        <article className="settings-card">
          <span>Empresa</span>
          <h2>CPAP Express</h2>
          <p>Plano Business. Este MVP está simplificado para uma única empresa antes do banco de dados.</p>
        </article>
        <article className="settings-card">
          <span>Usuário</span>
          <h2>Admin</h2>
          <p>Login e multiusuário ficam preparados para uma próxima etapa.</p>
        </article>
        <article className="settings-card">
          <span>IA</span>
          <h2>{appData.aiSettings.tone}</h2>
          <p>{appData.aiSettings.maxRewriteAttempts} ajustes por resposta no MVP atual.</p>
        </article>
      </div>

      <section className="settings-card settings-form">
        <span>Prompt da empresa</span>
        <label>
          Saudação
          <input
            value={settingsDraft.greeting}
            onChange={(event) => setSettingsDraft((current) => ({ ...current, greeting: event.target.value }))}
          />
        </label>
        <label>
          Fechamento
          <input
            value={settingsDraft.closing}
            onChange={(event) => setSettingsDraft((current) => ({ ...current, closing: event.target.value }))}
          />
        </label>
        <label>
          Tom
          <input
            value={settingsDraft.tone}
            onChange={(event) => setSettingsDraft((current) => ({ ...current, tone: event.target.value }))}
          />
        </label>
        <label>
          Prompt personalizado
          <textarea
            value={settingsDraft.custom_prompt}
            onChange={(event) => setSettingsDraft((current) => ({ ...current, custom_prompt: event.target.value }))}
          />
        </label>
        <button className="primary" onClick={saveSettings}>
          <Check size={17} />
          Salvar configurações
        </button>
        {settingsMessage ? <p>{settingsMessage}</p> : null}
      </section>
    </section>
  );
}

function AnalyticsPage({ questions, appData }) {
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
          <span>Uso</span>
          <h2>{appData.usageLogs.reduce((total, log) => total + log.count, 0)}</h2>
          <p>Eventos mockados de IA e operação.</p>
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
        <p>Revise sugestoes da IA, edite quando precisar e envie respostas em poucos cliques.</p>
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
          <span className={`pill status ${statusClass[question.status]}`}>{question.status}</span>
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
                <dd>{question.answered_at ? formatDate(question.answered_at) : "Nao informado"}</dd>
              </div>
              <div>
                <dt>Aprovada por</dt>
                <dd>{question.approved_by || "Nao informado"}</dd>
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
      revisedText = generateMockAiRewrite(currentText, instruction, question);
      setRewriteError("Nao foi possivel usar a IA real agora. Aplicamos uma versao mockada.");
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
  const [syncingIntegrationId, setSyncingIntegrationId] = useState(null);
  const [fetchingMlQuestions, setFetchingMlQuestions] = useState(false);
  const [sendingAnswerId, setSendingAnswerId] = useState(null);
  const [generatingQuestionId, setGeneratingQuestionId] = useState(null);
  const [answerNotice, setAnswerNotice] = useState("");
  const [answerError, setAnswerError] = useState("");
  const [questionNotice, setQuestionNotice] = useState("");
  const [testingIntegrationId, setTestingIntegrationId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [marketplaceFilter, setMarketplaceFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
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

  useEffect(() => {
    setSelectedId((current) => current || questions[0]?.id || null);
  }, [questions]);

  useEffect(() => {
    async function loadPersistedQuestions() {
      try {
        const response = await fetch(`${API_URL}/questions`);
        const data = await response.json();
        if (response.ok && Array.isArray(data)) {
          setQuestions(data);
          setSelectedId(data[0]?.id || null);
        }
      } catch {
        // Keep the empty state or manually loaded demo questions.
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
  }, []);

  useEffect(() => {
    async function loadIntegrationHealth() {
      try {
        const response = await fetch(`${API_URL}/integrations/health`);
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) {
          throw new Error("Invalid integration health response");
        }
        setIntegrationHealth(data);
        setIntegrations((current) =>
          applyBackendHealthToIntegrations(current, data, CURRENT_COMPANY.id)
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

  const connectedMarketplaces = useMemo(
    () =>
      integrations
        .filter((integration) => integration.status === "Conectado")
        .map((integration) => integration.name),
    [integrations]
  );

  const visibleQuestions = useMemo(
    () =>
      questions.filter(
        (question) => !question.is_real || connectedMarketplaces.includes(question.marketplace)
      ),
    [questions, connectedMarketplaces]
  );

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
      return marketplaceMatches && statusMatches;
    });
  }, [active, visibleQuestions, marketplaceFilter, statusFilter]);

  const metrics = {
    pending: visibleQuestions.filter((question) => question.status === "Pendente").length,
    answered: visibleQuestions.filter((question) => question.status === "Respondida").length,
    high: visibleQuestions.filter((question) => question.priority === "Alta").length,
  };

  const hasConnectedIntegrations = connectedMarketplaces.length > 0;
  const hasVisibleQuestions = visibleQuestions.length > 0;
  const mercadoLivreIntegration = integrations.find((integration) => integration.id === "mercado-livre");
  const isMercadoLivreConnected = mercadoLivreIntegration?.status === "Conectado";
  const shouldShowMercadoLivreDisconnected =
    !isMercadoLivreConnected && !hasConnectedIntegrations && !hasVisibleQuestions;
  const shouldShowMercadoLivreNoQuestions =
    isMercadoLivreConnected && visibleQuestions.length === 0;
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
    setQuestionNotice("");
    setSelectedId(id);
    setShowConversation(true);
  }

  function openEditorForQuestion(id) {
    setSelectedId(id);
    setShowConversation(true);
  }

  function changeSection(section) {
    setActive(section);
    setShowConversation(false);
  }

  function loadDemoQuestions() {
    setQuestionNotice("");
    const demoQuestionsForMvp = getDemoQuestions();
    const demoMarketplaces = new Set(demoQuestionsForMvp.map((question) => question.marketplace));
    setQuestions(demoQuestionsForMvp);
    setIntegrations((current) =>
      current.map((integration) =>
        demoMarketplaces.has(integration.name) && integration.id !== "mercado-livre"
          ? {
              ...integration,
              status: "Conectado",
              store: integration.store || `${integration.name} Demo Store`,
              lastSync: new Date().toISOString(),
              token_status: "valid",
            }
          : integration
      )
    );
    setMarketplaceFilter("Todos");
    setStatusFilter("Todos");
    setSelectedId(demoQuestionsForMvp[0]?.id || null);
    setShowConversation(false);
  }

  async function requestInitialAiSuggestion(question) {
    const response = await fetch(AI_SUGGEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        product_title: question.product,
        question_text: question.question,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error || !data.suggestion) {
      throw new Error(
        (typeof data.detail === "string" ? data.detail : data.message) ||
          "Não foi possível gerar sugestão inicial."
      );
    }
    return data.suggestion;
  }

  async function generateSuggestion(id) {
    setGeneratingQuestionId(id);
    const targetQuestion = questions.find((question) => question.id === id);
    try {
      if (targetQuestion?.is_real) {
        let suggestion = "";
        try {
          const response = await fetch(`${API_URL}/questions/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify({ question_id: id, external_id: targetQuestion.external_id }),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.ai_suggestion) {
            throw new Error(data.detail || "Falha ao gerar sugestão.");
          }
          suggestion = data.ai_suggestion;
          setQuestions((current) =>
            current.map((question) =>
              question.id === id
                ? { ...question, ai_suggestion: suggestion, has_ai_suggestion: true }
                : question
            )
          );
          return suggestion;
        } catch {
          suggestion =
            "Não foi possível gerar uma nova sugestão da IA agora. Edite a resposta manualmente antes de enviar.";
          setQuestions((current) =>
            current.map((question) =>
              question.id === id ? { ...question, ai_suggestion: suggestion } : question
            )
          );
          return suggestion;
        }
      }

      let suggestion = "";
      try {
        const response = await fetch(`${API_URL}/questions/${id}/suggest`, { method: "POST" });
        if (response.ok) {
          const data = await response.json();
          suggestion = data.suggestion;
        }
      } catch {
        suggestion = "";
      }

      setQuestions((current) =>
        current.map((question) =>
          question.id === id
            ? {
                ...question,
                ai_suggestion:
                  suggestion ||
                  generateMockAiRewrite(question.ai_suggestion, "mais vendedor", question),
              }
            : question
        )
      );
      return (
        suggestion ||
        generateMockAiRewrite(
          questions.find((question) => question.id === id)?.ai_suggestion || "",
          "mais vendedor",
          questions.find((question) => question.id === id)
        )
      );
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

        setQuestions((current) =>
          current.map((question) =>
            question.id === id
              ? {
                  ...question,
                  status: "Respondida",
                  ai_suggestion: approvalData.ai_suggestion || question.ai_suggestion,
                  final_response: finalResponse,
                  was_edited: Boolean(approvalData.was_edited),
                  instruction_used: approvalData.instruction_used || "",
                  answered_at: new Date().toISOString(),
                  approved_by: currentUser?.name || "Usuário",
                  ml_answer_response: data.raw_response,
                }
              : question
          )
        );
        setAnswerNotice("Resposta enviada ao Mercado Livre");
      } catch (error) {
        setAnswerError(error.message || "Não foi possível enviar a resposta ao Mercado Livre.");
      } finally {
        setSendingAnswerId(null);
      }
      return;
    }

    let updated = null;
    try {
      const response = await fetch(`${API_URL}/questions/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: finalResponse }),
      });
      if (response.ok) {
        updated = await response.json();
      }
    } catch {
      updated = null;
    }

    setQuestions((current) =>
      current.map((question) =>
        question.id === id
          ? {
              ...question,
              ...(updated || {}),
              status: "Respondida",
              ai_suggestion: approvalData.ai_suggestion || updated?.ai_suggestion || question.ai_suggestion,
              final_response: finalResponse,
              was_edited: Boolean(approvalData.was_edited),
              instruction_used: approvalData.instruction_used || "",
              answered_at: new Date().toISOString(),
              approved_by: currentUser?.name || "Usuário",
            }
          : question
      )
    );
  }

  function rejectQuestion(id) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === id ? { ...question, status: "Rejeitada" } : question
      )
    );
  }

  async function openConnectModal(integration) {
    if (integration.id === "mercado-livre") {
      try {
        const response = await fetch(`${API_URL}/integrations/mercadolivre/auth-url`);
        const data = await response.json();
        if (data.configured && data.auth_url) {
          window.location.href = data.auth_url;
          return;
        }
      } catch {
        // Keep mock fallback below when OAuth is unavailable.
      }
    }
    setPendingIntegration(integration);
  }

  function confirmConnect(id) {
    if (id === "mercado-livre") {
      setPendingIntegration(null);
      return;
    }

    setIntegrations((current) =>
      current.map((integration) =>
        integration.id === id
          ? {
              ...integration,
              status: "Conectado",
              store: `${integration.name} Store Oficial`,
              lastSync: new Date().toISOString(),
            }
          : integration
      )
    );
    setPendingIntegration(null);
  }

  function disconnectIntegration(id) {
    if (id === "mercado-livre") {
      return;
    }

    setIntegrations((current) =>
      current.map((integration) =>
        integration.id === id
          ? { ...integration, status: "Não conectado", store: "", lastSync: "" }
          : integration
      )
    );
  }

  function syncIntegration(id) {
    setSyncingIntegrationId(id);
    window.setTimeout(() => {
      setIntegrations((current) =>
        current.map((integration) =>
          integration.id === id ? { ...integration, lastSync: new Date().toISOString() } : integration
        )
      );
      setSyncingIntegrationId(null);
    }, 900);
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

      const realQuestions = Array.isArray(data) ? data.map(mapMercadoLivreQuestionToUi) : [];
      setQuestions(realQuestions);
      setSelectedId(realQuestions[0]?.id || null);
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

      if (realQuestions.length === 0) {
        setQuestionNotice("Nenhuma pergunta pendente encontrada no Mercado Livre.");
      }
    } catch {
      setQuestions([]);
      setSelectedId(null);
      setShowConversation(false);
      setQuestionNotice("Não foi possível buscar perguntas do Mercado Livre.");
    } finally {
      setFetchingMlQuestions(false);
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
                last_error: "Nao foi possivel testar a conexao com a API local.",
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

  return (
    <div className="app-shell">
      <Sidebar active={active} setActive={changeSection} />

      <main className={`workspace ${isIntegrations || isSettings || isAnalytics ? "single-view" : ""}`}>
        {isIntegrations ? (
          <IntegrationsPage
            integrations={integrations}
            integrationHealth={integrationHealth}
            onConnect={openConnectModal}
            onDisconnect={disconnectIntegration}
            onSync={syncIntegration}
            onFetchRealQuestions={fetchMercadoLivreQuestions}
            onTestHealth={testIntegrationHealth}
            syncingIntegrationId={syncingIntegrationId}
            fetchingRealQuestions={fetchingMlQuestions}
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
          <AnalyticsPage questions={visibleQuestions} appData={appData} />
        ) : (
          <>
            <section className={`inbox-panel ${showConversation ? "hide-mobile" : ""}`}>
          <header className="topbar">
            <div>
              <span>CPAP Express</span>
              <h1>{active}</h1>
            </div>
            <div className="topbar-actions">
              <button className="new-rule">
                <Sparkles size={18} />
                Nova regra IA
              </button>
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
          </div>

          <div className="question-list">
            {!hasConnectedIntegrations && !hasVisibleQuestions ? (
              <div className="inbox-empty">
                <div className="empty-icon">
                  <PlugZap size={30} />
                </div>
                <h2>
                  {shouldShowMercadoLivreDisconnected
                    ? "Mercado Livre não conectado"
                    : "Nenhuma integração conectada"}
                </h2>
                <p>
                  {shouldShowMercadoLivreDisconnected
                    ? "Conecte o Mercado Livre da CPAP Express para buscar perguntas reais."
                    : "Conecte ao menos um marketplace para carregar perguntas mockadas na Inbox."}
                </p>
                <button className="primary" onClick={() => changeSection("Integrações")}>
                  <PlugZap size={17} />
                  Abrir integrações
                </button>
                <button className="secondary" onClick={loadDemoQuestions}>
                  <Inbox size={17} />
                  Carregar perguntas demo
                </button>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="inbox-empty">
                <div className="empty-icon">
                  <Inbox size={30} />
                </div>
                <h2>
                  {shouldShowMercadoLivreNoQuestions
                    ? "Nenhuma pergunta pendente encontrada no Mercado Livre"
                    : "Nenhuma pergunta encontrada"}
                </h2>
                <p>
                  {shouldShowMercadoLivreNoQuestions
                    ? "Clique em Buscar perguntas reais para consultar novamente ou carregue perguntas demo separadamente."
                    : questionNotice || "Ajuste os filtros ou sincronize os marketplaces conectados."}
                </p>
                <button className="primary" onClick={loadDemoQuestions}>
                  <Inbox size={17} />
                  Carregar perguntas demo
                </button>
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
                onBack={() => setShowConversation(false)}
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


