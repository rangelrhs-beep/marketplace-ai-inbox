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
  ShieldCheck,
  Sparkles,
  Store,
  ThumbsDown,
  X,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const navItems = [
  { label: "Inbox", icon: Inbox },
  { label: "Aprovadas", icon: ShieldCheck },
  { label: "Respondidas", icon: Send },
  { label: "Integrações", icon: PlugZap },
  { label: "Analytics", icon: BarChart3 },
  { label: "Configuracoes", icon: Settings },
];

const initialIntegrations = [
  {
    id: "mercado-livre",
    name: "Mercado Livre",
    shortName: "ML",
    color: "#ffe600",
    status: "Conectado",
    store: "Loja Oficial Atlas Commerce",
    lastSync: "2026-04-29T08:42:00",
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
    status: "Conectado",
    store: "Magazine Seller Pro",
    lastSync: "2026-04-28T19:15:00",
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

function IntegrationCard({ integration, onConnect, onDisconnect, onSync, isSyncing }) {
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
  onConnect,
  onDisconnect,
  onSync,
  syncingIntegrationId,
  pendingIntegration,
  onCancelConnect,
  onConfirmConnect,
}) {
  const connectedCount = integrations.filter((item) => item.status === "Conectado").length;

  return (
    <section className="integrations-page">
      <header className="topbar">
        <div>
          <span>Marketplaces e operacao</span>
          <h1>Integrações</h1>
        </div>
        <button className="new-rule">
          <Plus size={18} />
          Adicionar
        </button>
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
            isSyncing={syncingIntegrationId === integration.id}
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

      <ConnectModal
        integration={pendingIntegration}
        onCancel={onCancelConnect}
        onConfirm={onConfirmConnect}
      />
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

function Conversation({ question, onBack, onApprove, onGenerate, onReject }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setDraft(question?.ai_suggestion || "");
    setIsEditing(false);
  }, [question]);

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

  async function handleGenerate() {
    setIsGenerating(true);
    const suggestion = await onGenerate(question.id);
    setDraft(suggestion);
    setIsGenerating(false);
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
              <strong>Sugestao da IA</strong>
            </div>
            <span>pronta para revisar</span>
          </div>

          {isEditing ? (
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} />
          ) : (
            <p>{draft}</p>
          )}

          <div className="ai-actions">
            <button className="primary" onClick={() => onApprove(question.id, draft)}>
              <Check size={18} />
              Aprovar e enviar
            </button>
            <button className="secondary" onClick={() => setIsEditing((value) => !value)}>
              {isEditing ? "Concluir edicao" : "Editar resposta"}
            </button>
            <button className="secondary" onClick={handleGenerate} disabled={isGenerating}>
              <RefreshCw size={17} className={isGenerating ? "spin" : ""} />
              Gerar nova sugestão
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
  const [active, setActive] = useState("Inbox");
  const [questions, setQuestions] = useState([]);
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [pendingIntegration, setPendingIntegration] = useState(null);
  const [syncingIntegrationId, setSyncingIntegrationId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [marketplaceFilter, setMarketplaceFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [showConversation, setShowConversation] = useState(false);

  useEffect(() => {
    async function loadQuestions() {
      const response = await fetch(`${API_URL}/questions`);
      const data = await response.json();
      setQuestions(data);
      setSelectedId(data[0]?.id || null);
    }

    loadQuestions();
  }, []);

  const connectedMarketplaces = useMemo(
    () =>
      integrations
        .filter((integration) => integration.status === "Conectado")
        .map((integration) => integration.name),
    [integrations]
  );

  const visibleQuestions = useMemo(
    () => questions.filter((question) => connectedMarketplaces.includes(question.marketplace)),
    [questions, connectedMarketplaces]
  );

  const selectedQuestion = visibleQuestions.find((question) => question.id === selectedId);
  const marketplaces = ["Todos", ...new Set(visibleQuestions.map((question) => question.marketplace))];
  const statuses = ["Todos", ...new Set(visibleQuestions.map((question) => question.status))];

  const filteredQuestions = useMemo(() => {
    const forcedStatus =
      active === "Aprovadas" ? "Aprovada" : active === "Respondidas" ? "Respondida" : null;

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

  useEffect(() => {
    if (selectedId && !visibleQuestions.some((question) => question.id === selectedId)) {
      setSelectedId(visibleQuestions[0]?.id || null);
      setShowConversation(false);
    }

    if (marketplaceFilter !== "Todos" && !connectedMarketplaces.includes(marketplaceFilter)) {
      setMarketplaceFilter("Todos");
    }
  }, [connectedMarketplaces, marketplaceFilter, selectedId, visibleQuestions]);

  function selectQuestion(id) {
    setSelectedId(id);
    setShowConversation(true);
  }

  function changeSection(section) {
    setActive(section);
    setShowConversation(false);
  }

  async function generateSuggestion(id) {
    const response = await fetch(`${API_URL}/questions/${id}/suggest`, { method: "POST" });
    const data = await response.json();
    setQuestions((current) =>
      current.map((question) =>
        question.id === id ? { ...question, ai_suggestion: data.suggestion } : question
      )
    );
    return data.suggestion;
  }

  async function approveQuestion(id, answer) {
    const response = await fetch(`${API_URL}/questions/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer }),
    });
    const updated = await response.json();
    setQuestions((current) =>
      current.map((question) => (question.id === id ? updated : question))
    );
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

  function confirmConnect(id) {
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

  const isIntegrations = active === "Integrações";

  return (
    <div className="app-shell">
      <Sidebar active={active} setActive={changeSection} />

      <main className={`workspace ${isIntegrations ? "single-view" : ""}`}>
        {isIntegrations ? (
          <IntegrationsPage
            integrations={integrations}
            onConnect={openConnectModal}
            onDisconnect={disconnectIntegration}
            onSync={syncIntegration}
            syncingIntegrationId={syncingIntegrationId}
            pendingIntegration={pendingIntegration}
            onCancelConnect={() => setPendingIntegration(null)}
            onConfirmConnect={confirmConnect}
          />
        ) : (
          <>
            <section className={`inbox-panel ${showConversation ? "hide-mobile" : ""}`}>
          <header className="topbar">
            <div>
              <span>Atendimento com IA</span>
              <h1>{active}</h1>
            </div>
            <button className="new-rule">
              <Sparkles size={18} />
              Nova regra IA
            </button>
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
            {!hasConnectedIntegrations ? (
              <div className="inbox-empty">
                <div className="empty-icon">
                  <PlugZap size={30} />
                </div>
                <h2>Nenhuma integração conectada</h2>
                <p>
                  Conecte ao menos um marketplace para carregar perguntas mockadas na Inbox.
                </p>
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
                <h2>Nenhuma pergunta encontrada</h2>
                <p>Ajuste os filtros ou sincronize os marketplaces conectados.</p>
              </div>
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
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
