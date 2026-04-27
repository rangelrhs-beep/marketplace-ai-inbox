import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Check,
  ChevronLeft,
  Clock3,
  Inbox,
  MessageCircle,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const navItems = [
  { label: "Inbox", icon: Inbox },
  { label: "Aprovadas", icon: ShieldCheck },
  { label: "Respondidas", icon: Send },
  { label: "Analytics", icon: BarChart3 },
  { label: "Configuracoes", icon: Settings },
];

const statusClass = {
  Pendente: "pending",
  Aprovada: "approved",
  Respondida: "answered",
  Rejeitada: "rejected",
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

function QuestionRow({ question, selected, onSelect }) {
  return (
    <button className={`question-row ${selected ? "selected" : ""}`} onClick={onSelect}>
      <div className="row-top">
        <span className="marketplace">{question.marketplace}</span>
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
              Gerar nova
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

  const selectedQuestion = questions.find((question) => question.id === selectedId);
  const marketplaces = ["Todos", ...new Set(questions.map((question) => question.marketplace))];
  const statuses = ["Todos", ...new Set(questions.map((question) => question.status))];

  const filteredQuestions = useMemo(() => {
    const forcedStatus =
      active === "Aprovadas" ? "Aprovada" : active === "Respondidas" ? "Respondida" : null;

    return questions.filter((question) => {
      const marketplaceMatches =
        marketplaceFilter === "Todos" || question.marketplace === marketplaceFilter;
      const statusMatches = forcedStatus
        ? question.status === forcedStatus
        : statusFilter === "Todos" || question.status === statusFilter;
      return marketplaceMatches && statusMatches;
    });
  }, [active, questions, marketplaceFilter, statusFilter]);

  const metrics = {
    pending: questions.filter((question) => question.status === "Pendente").length,
    answered: questions.filter((question) => question.status === "Respondida").length,
    high: questions.filter((question) => question.priority === "Alta").length,
  };

  function selectQuestion(id) {
    setSelectedId(id);
    setShowConversation(true);
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

  return (
    <div className="app-shell">
      <Sidebar active={active} setActive={setActive} />

      <main className="workspace">
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
            {filteredQuestions.map((question) => (
              <QuestionRow
                key={question.id}
                question={question}
                selected={selectedId === question.id}
                onSelect={() => selectQuestion(question.id)}
              />
            ))}
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
      </main>
    </div>
  );
}
