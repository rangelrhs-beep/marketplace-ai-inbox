import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  BarChart3,
  Check,
  ChevronLeft,
  Clock3,
  ExternalLink,
  Inbox,
  Mail,
  MessageCircle,
  Lock,
  Eye,
  EyeOff,
  PlugZap,
  RefreshCw,
  Send,
  Settings,
  Sparkles,
  Store,
  ThumbsDown,
  Users,
  X,
} from "lucide-react";
import perggoIcon from "./assets/perggo/perggo-icon-source.png";
import perggoWordmark from "./assets/perggo/perggo-wordmark-source.png";

const API_URL = (import.meta.env.VITE_API_URL || "https://marketplace-ai-backend-ky72.onrender.com").replace(/\/$/, "");
const AI_REWRITE_URL = `${API_URL}/ai/rewrite`;
const SELECTED_COMPANY_STORAGE_KEY = "marketplace_ai_selected_company_id";
const NOTIFICATION_PREFERENCE_STORAGE_KEY = "notifications_enabled";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const isSupabaseAuthConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabase = isSupabaseAuthConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const AUTH_REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_FRONTEND_URL = "https://marketplace-ai-inbox.vercel.app";

function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}


function getBrowserNotificationPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

function getStoredNotificationPreference() {
  return localStorage.getItem(NOTIFICATION_PREFERENCE_STORAGE_KEY) !== "false";
}

function isNotificationEffectivelyEnabled(permission, appNotificationsEnabled) {
  return permission === "granted" && appNotificationsEnabled !== false;
}

function getNotificationStatusLabel(permission, appEnabled) {
  return isNotificationEffectivelyEnabled(permission, appEnabled) ? "Notificações Ativas" : "Notificações Inativas";
}

function getNotificationButtonLabel(permission, appNotificationsEnabled) {
  return isNotificationEffectivelyEnabled(permission, appNotificationsEnabled) ? "Desativar notificações" : "Ativar notificações";
}

function getBlockedNotificationMessage() {
  return "As notificações estão bloqueadas no navegador. Ative nas permissões do site/app para receber alertas.";
}

function getBlockedNotificationHelpText() {
  return "Para ativar novamente, abra as permissões do site/app no Android e permita notificações.";
}

function getStoredCompanyId() {
  return localStorage.getItem(SELECTED_COMPANY_STORAGE_KEY) || "cpap_express";
}

async function getSupabaseAccessToken() {
  if (!supabase) return "";
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const companyId = getStoredCompanyId();
  const accessToken = await getSupabaseAccessToken();
  if (companyId) headers.set("X-Company-ID", companyId);
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return fetch(url, { ...options, headers });
}


function getErrorMessageFromException(error, fallbackMessage) {
  if (error?.message === "Failed to fetch") return "Não foi possível conectar ao servidor. Verifique o deploy/backend.";
  return error?.message || fallbackMessage;
}

function getUserCompaniesLabel(user, companyNameById) {
  if (user.role === "platform_admin") {
    if (user.access_scope === "all") return "Todas as empresas";
    const names = (user.company_ids || []).map((id) => companyNameById.get(id) || id);
    return names.length ? names.join(", ") : "Empresas selecionadas";
  }
  return user.company_id ? `${companyNameById.get(user.company_id) || user.company_id} (${user.company_id})` : "-";
}

function CompanyAccessSelector({ companies, accessScope, companyIds, onScopeChange, onCompanyToggle }) {
  return (
    <div className="company-access-selector">
      <span>Acesso de empresas</span>
      <label className="company-access-option">
        <input type="radio" name="access_scope" value="all" checked={accessScope === "all"} onChange={() => onScopeChange("all")} />
        <span>Todas as empresas</span>
      </label>
      <label className="company-access-option">
        <input type="radio" name="access_scope" value="selected" checked={accessScope === "selected"} onChange={() => onScopeChange("selected")} />
        <span>Empresas selecionadas</span>
      </label>
      {accessScope === "selected" ? (
        <div className="company-access-checkboxes">
          {companies.map((company) => (
            <label key={`company-access-${company.id}`} className="company-access-option">
              <input type="checkbox" checked={companyIds.includes(company.id)} onChange={() => onCompanyToggle(company.id)} />
              <span>{company.name}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

async function apiFetchWithRetry(url, options = {}, { retries = 1, retryDelayMs = 500 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      const response = await apiFetch(url, options);
      if (response.status >= 500 && attempt < retries) {
        attempt += 1;
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
        continue;
      }
      return response;
    } catch (error) {
      if (attempt >= retries) throw error;
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
    }
  }
}

function clearTenantQuestionStorage() {
  const keys = [
    "questions",
    "groupedQuestions",
    "selectedQuestion",
    "demoQuestions",
    "answeredQuestions",
    "pendingQuestions",
  ];
  keys.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
    localStorage.removeItem(`marketplace_ai_${key}`);
    sessionStorage.removeItem(`marketplace_ai_${key}`);
  });
}

const navItems = [
  { label: "Inbox", icon: Inbox },
  { label: "Pendentes", icon: Clock3 },
  { label: "Respondidas", icon: Send },
  { label: "Integrações", icon: PlugZap },
  { label: "Analytics", icon: BarChart3 },
  { label: "Configurações", icon: Settings },
  { label: "Empresas", icon: Store },
  { label: "Usuários", icon: Users },
];

const navItemsByRole = {
  platform_admin: navItems,
  company_admin: navItems.filter((item) => !["Analytics", "Empresas", "Usuários"].includes(item.label)),
  operator: navItems.filter(
    (item) => !["Integrações", "Configurações", "Analytics", "Empresas", "Usuários"].includes(item.label)
  ),
};

function CompaniesAdminPage({
  companies,
  currentCompany,
  currentUser,
  permissions,
  onCompanyChange,
  isAuthenticated,
  onLogout,
  onEnableNotifications,
  notificationPermission,
  notificationsEnabled,
  notificationButtonLabel,
  notificationHelpText,
  onCompanyCreated,
}) {
  const [form, setForm] = useState({ id: "", name: "" });
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitMessage("");
    setIsSubmitting(true);
    try {
      const response = await apiFetch(`${API_URL}/admin/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form.role === "platform_admin" ? { ...form, company_id: undefined, company_ids: form.access_scope === "selected" ? form.company_ids : [], access_scope: form.access_scope } : { ...form, access_scope: "selected", company_ids: [] }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || "Não foi possível criar a empresa.");
      }
      setSubmitMessage(`Empresa ${data.name} criada com sucesso.`);
      setForm({ id: "", name: "" });
      await onCompanyCreated(data.id);
    } catch (error) {
      setSubmitMessage(error.message || "Não foi possível criar a empresa.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="settings-page">
      <ScreenHeader
        title="Empresas"
        subtitle="Onboarding de empresas"
        companies={companies}
        currentCompany={currentCompany}
        currentUser={currentUser}
        permissions={permissions}
        onCompanyChange={onCompanyChange}
        isAuthenticated={isAuthenticated}
        onLogout={onLogout}
        onEnableNotifications={onEnableNotifications}
        notificationPermission={notificationPermission}
        notificationsEnabled={notificationsEnabled}
        notificationButtonLabel={notificationButtonLabel}
        notificationHelpText={notificationHelpText}
      />
      <div className="settings-card users-admin-card">
        <form className="settings-form users-admin-form" onSubmit={handleSubmit}>
          <label>ID da empresa<input value={form.id} onChange={(event) => setForm((current) => ({ ...current, id: event.target.value }))} required /></label>
          <label>Nome da empresa<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></label>
          <p className="settings-warning">Use um ID curto em minúsculas, sem espaços. Ex: minha_loja</p>
          <div className="settings-actions">
            <button className="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Criando..." : "Criar empresa"}</button>
          </div>
        </form>
        {submitMessage ? <p className="settings-message">{submitMessage}</p> : null}
        <div className="users-admin-table-wrap">
          <table className="users-admin-table">
            <thead><tr><th>ID</th><th>Nome</th></tr></thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id}>
                  <td>{company.id}</td>
                  <td>{company.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function UsersAdminPage({
  companies,
  currentCompany,
  currentUser,
  permissions,
  onCompanyChange,
  isAuthenticated,
  onLogout,
  onEnableNotifications,
  notificationPermission,
  notificationsEnabled,
  notificationButtonLabel,
  notificationHelpText,
}) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteEmailSent, setInviteEmailSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingEmail, setIsResettingEmail] = useState("");
  const [isDeletingUserId, setIsDeletingUserId] = useState("");
  const [editingUserId, setEditingUserId] = useState("");
  const [editForm, setEditForm] = useState({ email: "", name: "", company_id: "", role: "operator", access_scope: "selected", company_ids: [], active: true });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", company_id: "", role: "operator", access_scope: "selected", company_ids: [] });

  useEffect(() => {
    const defaultCompanyId = currentCompany?.id || companies[0]?.id || "";
    setForm((current) => ({ ...current, company_id: current.company_id || defaultCompanyId }));
  }, [companies, currentCompany?.id]);

  async function loadAdminUsers() {
    setLoadingUsers(true);
    setErrorMessage("");
    try {
      const response = await apiFetch(`${API_URL}/admin/users`);
      const data = await response.json().catch(() => []);
      if (response.status === 403) {
        setErrorMessage("Acesso negado. Esta área é permitida apenas para administrador da plataforma.");
        setUsers([]);
        return;
      }
      if (!response.ok || !Array.isArray(data)) {
        throw new Error("Não foi possível carregar usuários.");
      }
      setUsers(data);
    } catch (error) {
      setErrorMessage(error.message || "Não foi possível carregar usuários.");
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    loadAdminUsers();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitMessage("");
    setInviteLink("");
    setInviteEmailSent(false);
    setIsSubmitting(true);
    try {
      const response = await apiFetch(`${API_URL}/admin/users/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form.role === "platform_admin" ? { ...form, company_id: undefined, company_ids: form.access_scope === "selected" ? form.company_ids : [], access_scope: form.access_scope } : { ...form, access_scope: "selected", company_ids: [] }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 403) {
        setSubmitMessage("Acesso negado. Apenas platform_admin pode convidar usuários.");
        return;
      }
      if (!response.ok) throw new Error(data.detail || data.message || "Não foi possível convidar usuário.");
      setInviteEmailSent(!data.invite_link);
      setSubmitMessage(data.message || "Usuário criado/vinculado com sucesso.");
      setInviteLink(data.invite_link || "");
      setForm((current) => ({ ...current, email: "", name: "" }));
      await loadAdminUsers();
    } catch (error) {
      setSubmitMessage(getErrorMessageFromException(error, "Não foi possível convidar usuário."));
    } finally {
      setIsSubmitting(false);
    }
  }
  async function handleSendReset(email) {
    setIsResettingEmail(email);
    setSubmitMessage("");
    try {
      const response = await apiFetch(`${API_URL}/admin/users/send-password-reset`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || "Não foi possível enviar redefinição.");
      setSubmitMessage(`Redefinição enviada para ${email}.`);
    } catch (error) {
      setSubmitMessage(getErrorMessageFromException(error, "Não foi possível enviar redefinição."));
    } finally {
      setIsResettingEmail("");
    }
  }

  function startEdit(user) {
    setEditingUserId(user.id);
    setEditForm({
      email: user.email || "",
      name: user.name || "",
      company_id: user.company_id || companies[0]?.id || "",
      role: user.role || "operator",
      access_scope: user.access_scope || "selected",
      company_ids: user.company_ids || [],
      active: user.active !== false,
    });
    setSubmitMessage("");
  }

  async function handleSaveEdit(userId, overridePayload = null, successMessage = "") {
    setIsSavingEdit(true);
    setSubmitMessage("");
    try {
      const response = await apiFetch(`${API_URL}/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(overridePayload || (editForm.role === "platform_admin" ? { ...editForm, company_id: undefined, company_ids: editForm.access_scope === "selected" ? editForm.company_ids : [], access_scope: editForm.access_scope } : { ...editForm, access_scope: "selected", company_ids: [] })),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || data.message || "Não foi possível atualizar usuário.");
      setSubmitMessage(successMessage || `Usuário ${data.email} atualizado com sucesso.`);
      setEditingUserId("");
      await loadAdminUsers();
      if (currentUser?.id && currentUser.id === userId) {
        const meResponse = await apiFetch(`${API_URL}/me`);
        const meData = await meResponse.json().catch(() => ({}));
        const companiesResponse = await apiFetch(`${API_URL}/companies`);
        await companiesResponse.json().catch(() => []);
        const allowedCompanyIds = Array.isArray(meData?.user?.allowed_company_ids) ? meData.user.allowed_company_ids : [];
        const storedCompanyId = getStoredCompanyId();
        if (allowedCompanyIds.length > 0 && !allowedCompanyIds.includes(storedCompanyId)) {
          localStorage.setItem(SELECTED_COMPANY_STORAGE_KEY, allowedCompanyIds[0]);
          window.location.reload();
        }
      }
    } catch (error) {
      setSubmitMessage(getErrorMessageFromException(error, "Não foi possível atualizar usuário."));
    } finally {
      setIsSavingEdit(false);
    }
  }
  async function handleSendReset(userId) {
    setIsResettingEmail(userId);
    setSubmitMessage("");
    try {
      const response = await apiFetch(`${API_URL}/admin/users/${userId}/send-password-reset`, { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || data.message || "Não foi possível enviar redefinição.");
      setSubmitMessage(data.message || "Redefinição enviada.");
    } catch (error) {
      setSubmitMessage(getErrorMessageFromException(error, "Não foi possível enviar redefinição."));
    } finally { setIsResettingEmail(""); }
  }

  async function handleDeleteUser(userId) {
    if (!window.confirm("Tem certeza que deseja excluir este usuário? O histórico será preservado.")) return;
    setIsDeletingUserId(userId);
    try {
      const response = await apiFetch(`${API_URL}/admin/users/${userId}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || data.message || "Não foi possível excluir usuário.");
      setSubmitMessage(data.message || "Usuário excluído.");
      await loadAdminUsers();
    } catch (error) {
      setSubmitMessage(getErrorMessageFromException(error, "Não foi possível excluir usuário."));
    } finally { setIsDeletingUserId(""); }
  }

  const companyNameById = new Map(companies.map((company) => [company.id, company.name]));
  const activePlatformAdmins = users.filter((user) => user.role === "platform_admin" && user.active !== false);
  const lastActivePlatformAdminId = activePlatformAdmins.length === 1 ? activePlatformAdmins[0].id : "";
  const isLastPlatformAdmin = (user) => user.id === lastActivePlatformAdminId;

  return (
    <section className="settings-page">
      <ScreenHeader
        title="Usuários"
        subtitle="Convites e gestão de usuários"
        companies={companies}
        currentCompany={currentCompany}
        currentUser={currentUser}
        permissions={permissions}
        onCompanyChange={onCompanyChange}
        isAuthenticated={isAuthenticated}
        onLogout={onLogout}
        onEnableNotifications={onEnableNotifications}
        notificationPermission={notificationPermission}
        notificationsEnabled={notificationsEnabled}
        notificationButtonLabel={notificationButtonLabel}
        notificationHelpText={notificationHelpText}
      />
      <div className="settings-card users-admin-card">
        <form className="settings-form users-admin-form" onSubmit={handleSubmit}>
          <label>Email<input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></label>
          <label>Nome<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
          {form.role !== "platform_admin" ? <label>Empresa
            <select value={form.company_id} onChange={(event) => setForm((current) => ({ ...current, company_id: event.target.value }))} required>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
          </label> : null}
          <label>Role
            <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} required>
              <option value="platform_admin">platform_admin</option>
              <option value="company_admin">company_admin</option>
              <option value="operator">operator</option>
            </select>
          </label>
          {form.role === "platform_admin" ? <CompanyAccessSelector
            companies={companies}
            accessScope={form.access_scope}
            companyIds={form.company_ids}
            onScopeChange={(scope) => setForm((current) => ({ ...current, access_scope: scope }))}
            onCompanyToggle={(companyId) => setForm((current) => ({ ...current, company_ids: current.company_ids.includes(companyId) ? current.company_ids.filter((id) => id !== companyId) : [...current.company_ids, companyId] }))}
          /> : null}
          <div className="settings-actions">
            <button className="primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Convidando..." : "Criar / Convidar usuário"}</button>
          </div>
        </form>
        {submitMessage ? <p className="settings-message">{submitMessage}</p> : null}
        {inviteLink ? <div className="settings-actions"><button className="secondary" type="button" onClick={() => navigator.clipboard?.writeText(inviteLink)}>{inviteEmailSent ? "Copiar link de convite" : "Copiar link de convite"}</button></div> : null}
        {errorMessage ? <p className="settings-warning">{errorMessage}</p> : null}
        <div className="users-admin-mobile-list">
          {loadingUsers ? <p>Carregando usuários...</p> : users.map((user) => {
            const isEditing = editingUserId === user.id;
            const protectedLastAdmin = isLastPlatformAdmin(user);
            return (
              <article className="users-admin-mobile-card" key={`mobile-${user.id}`}>
                {isEditing ? (
                  <div className="users-admin-edit-grid">
                    <label>Nome<input value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} /></label>
                    <label>Email<input value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} required /></label>
                    {editForm.role !== "platform_admin" ? <label>Empresa
                      <select value={editForm.company_id} onChange={(event) => setEditForm((current) => ({ ...current, company_id: event.target.value }))} required>
                        {companies.map((company) => <option key={`mobile-edit-${user.id}-${company.id}`} value={company.id}>{company.name}</option>)}
                      </select>
                    </label> : null}
                    <label>Role
                      <select value={editForm.role} onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value }))} required>
                        <option value="platform_admin">platform_admin</option><option value="company_admin">company_admin</option><option value="operator">operator</option>
                      </select>
                    </label>
                    {editForm.role === "platform_admin" ? <CompanyAccessSelector
                      companies={companies}
                      accessScope={editForm.access_scope}
                      companyIds={editForm.company_ids}
                      onScopeChange={(scope) => setEditForm((current) => ({ ...current, access_scope: scope }))}
                      onCompanyToggle={(companyId) => setEditForm((current) => ({ ...current, company_ids: current.company_ids.includes(companyId) ? current.company_ids.filter((id) => id !== companyId) : [...current.company_ids, companyId] }))}
                    /> : null}
                  </div>
                ) : (
                  <div className="users-admin-mobile-meta">
                    <strong>{user.name || "-"}</strong><span>{user.email || "-"}</span><span>{user.active === false ? "Inativo" : "Ativo"}</span><span>{user.role || "-"}</span><span>{getUserCompaniesLabel(user, companyNameById)}</span>
                  </div>
                )}
                <div className="settings-actions">
                  {isEditing ? <button type="button" className="primary" onClick={() => handleSaveEdit(user.id)} disabled={isSavingEdit}>Salvar</button> : <button type="button" className="secondary" onClick={() => startEdit(user)}>Editar</button>}
                  {isEditing ? <button type="button" className="secondary" onClick={() => setEditingUserId("")}>Cancelar</button> : null}
                  <button type="button" className="secondary" onClick={() => handleSendReset(user.id)} disabled={isResettingEmail === user.id}>Enviar redefinição de senha</button>
                  <button type="button" className="secondary" onClick={() => handleSaveEdit(user.id, { active: user.active === false }, user.active === false ? "Usuário reativado com sucesso." : "Usuário desativado com sucesso.")} disabled={protectedLastAdmin}>{user.active === false ? "Reativar usuário" : "Desativar usuário"}</button>
                  <button type="button" className="danger" onClick={() => handleDeleteUser(user.id)} disabled={isDeletingUserId === user.id || protectedLastAdmin}>Excluir usuário</button>
                  {protectedLastAdmin ? <small>Último administrador da plataforma.</small> : null}
                </div>
              </article>
            );
          })}
        </div>
        <div className="users-admin-table-wrap">
          <table className="users-admin-table">
            <thead><tr><th>Nome</th><th>Email</th><th>Role</th><th>Empresa</th><th>Ações</th></tr></thead>
            <tbody>
              {loadingUsers ? <tr><td colSpan={5}>Carregando usuários...</td></tr> : users.map((user) => {
                const protectedLastAdmin = isLastPlatformAdmin(user);
                return (
                <tr key={user.id}>
                  <td>{editingUserId === user.id ? <input value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} /> : (user.name || "-")}</td>
                  <td>{editingUserId === user.id ? <input value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} required /> : (user.email || "-")}</td>
                  <td>{editingUserId === user.id ? <select value={editForm.role} onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value }))} disabled={protectedLastAdmin}><option value="platform_admin">platform_admin</option><option value="company_admin">company_admin</option><option value="operator">operator</option></select> : (user.role || "-")}</td>
                  <td>{editingUserId === user.id ? <select value={editForm.company_id} onChange={(event) => setEditForm((current) => ({ ...current, company_id: event.target.value }))}>{companies.map((company) => <option key={`edit-${user.id}-${company.id}`} value={company.id}>{company.name}</option>)}</select> : getUserCompaniesLabel(user, companyNameById)}</td>
                  <td><button type="button" className="secondary" onClick={() => editingUserId === user.id ? handleSaveEdit(user.id) : startEdit(user)} disabled={isSavingEdit}>{editingUserId === user.id ? "Salvar" : "Editar"}</button> {editingUserId === user.id ? <button type="button" className="secondary" onClick={() => setEditingUserId("")}>Cancelar</button> : null} <button type="button" className="secondary" onClick={() => handleSendReset(user.id)} disabled={isResettingEmail === user.id}>Enviar redefinição de senha</button> <button type="button" className="secondary" onClick={() => handleSaveEdit(user.id, { active: user.active === false }, user.active === false ? "Usuário reativado com sucesso." : "Usuário desativado com sucesso.")} disabled={protectedLastAdmin}>{user.active === false ? "Reativar usuário" : "Desativar usuário"}</button> <button type="button" className="danger" onClick={() => handleDeleteUser(user.id)} disabled={isDeletingUserId === user.id || protectedLastAdmin}>Excluir</button>{protectedLastAdmin ? <small> Último administrador da plataforma.</small> : null}</td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// TODO security: backend must enforce role access for platform/admin/debug routes regardless of frontend menu visibility.
function getRoleAwareNavItems(role) {
  return navItemsByRole[role] || navItemsByRole.operator;
}

function canAccessScreen(role, screen) {
  return getRoleAwareNavItems(role).some((item) => item.label === screen);
}

const initialIntegrations = [
  {
    id: "mercado-livre",
    name: "Mercado Livre",
    shortName: "ML",
    color: "#ffe600",
    status: "Não conectado",
    store: "",
    lastSync: "",
    lastMlHistoryImportAt: "",
    lastMlHistoryImportDays: null,
    lastMlHistoryImportResult: null,
    lastProductsSync: "",
    company_id: "",
  },
];

const initialIntegrationHealth = [];

const loadingIntegrationHealth = [
  {
    id: "mercado-livre",
    channel: "Mercado Livre",
    connected: false,
    api_status: "degraded",
    last_sync: null,
    last_error: "Carregando integração...",
    token_status: "loading",
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
    lastMlHistoryImportAt: "",
    lastMlHistoryImportDays: null,
    lastMlHistoryImportResult: null,
    lastProductsSync: "",
    company_id: "",
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
  "Não respondível": "blocked",
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

function getQuestionCreatedTimestamp(question) {
  return new Date(question.created_at || question.answered_at || 0).getTime() || 0;
}

function sortQuestionsChronologically(questions) {
  return [...(questions || [])].filter(Boolean).sort((a, b) => {
    const timeDiff = getQuestionCreatedTimestamp(a) - getQuestionCreatedTimestamp(b);
    if (timeDiff !== 0) return timeDiff;
    return String(a.external_id || a.id || "").localeCompare(String(b.external_id || b.id || ""));
  });
}

function getNewestPendingQuestion(questions) {
  const pendingQuestions = sortQuestionsChronologically(questions).filter((question) => question.status === "Pendente");
  return pendingQuestions[pendingQuestions.length - 1];
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
    const sorted = sortQuestionsChronologically(groupQuestions);
    const latest = sorted[sorted.length - 1];
    const pendingCount = sorted.filter((question) => question.status === "Pendente").length;
    const answeredCount = sorted.filter((question) => question.status === "Respondida").length;
    const totalQuestions = sorted.length;
    const hasPending = pendingCount > 0;
    const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;
    const answeredSources = [...new Set(sorted.map((question) => normalizeAnsweredSource(question.answered_source)).filter(Boolean))];
    const priority = getHighestPriority(sorted);
    return {
      ...latest,
      id: `group:${key}`,
      group_key: key,
      questions: sorted,
      question_count: totalQuestions,
      totalQuestions,
      pendingCount,
      answeredCount,
      hasPending,
      allAnswered,
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

function getCardCompanyId(card) {
  return card.company_id || card.questions?.[0]?.company_id || "";
}

function cardBelongsToCompany(card, companyId) {
  if (!companyId) return false;
  if (card.questions?.length) {
    return card.questions.every((question) => question.company_id === companyId);
  }
  return getCardCompanyId(card) === companyId;
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
    answer_error_code: question.answer_error_code || "",
    answer_error_message: question.answer_error_message || "",
    answer_blocked_at: question.answer_blocked_at || "",
    is_unanswerable: Boolean(question.is_unanswerable || question.status === "Não respondível"),
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

function getCompanyNameById(companies, companyId, fallbackName = "CPAP Express") {
  return companies.find((company) => company.id === companyId)?.name || fallbackName;
}

function getHealthCompanyId(health) {
  return health?.company_id || health?.companyId || null;
}

function applyBackendHealthToIntegrations(integrations, healthItems, companyId, companyName = "CPAP Express") {
  const tenantHealthItems = (healthItems || []).filter((health) => {
    const responseCompanyId = getHealthCompanyId(health);
    return !responseCompanyId || responseCompanyId === companyId;
  });
  const healthById = new Map(tenantHealthItems.map((health) => [health.id, health]));
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
      company_id: companyId || "",
      store: isMercadoLivreConnected ? `${companyName} Mercado Livre` : "",
      lastSync: isMercadoLivreConnected ? mercadoLivreHealth?.last_sync || new Date().toISOString() : "",
      token_status: mercadoLivreHealth?.token_status || "missing",
      last_error: mercadoLivreHealth?.last_error || "",
      lastMlHistoryImportAt: mercadoLivreHealth?.last_ml_history_import_at || "",
      lastMlHistoryImportDays: mercadoLivreHealth?.last_ml_history_import_days || null,
      lastMlHistoryImportResult: mercadoLivreHealth?.last_ml_history_import_result || null,
    };
  });
}

function Sidebar({ active, onNavigate, navItems }) {
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
              {item.badgeCount > 0 ? <span className="nav-badge">{item.badgeCount}</span> : null}
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

function AuthBrand({ showTagline = false }) {
  return (
    <div className="auth-brand">
      <img src={perggoIcon} alt="Ícone Perggo" className="auth-brand-icon" />
      <img src={perggoWordmark} alt="Perggo" className="auth-brand-wordmark" />
      {showTagline ? <p className="auth-brand-tagline">O inbox inteligente dos marketplaces</p> : null}
    </div>
  );
}

function LoadingScreen({ message }) {
  return (
    <main className="auth-shell">
      <div className="auth-background" aria-hidden="true">
        <span className="auth-aura auth-aura-top" />
        <span className="auth-aura auth-aura-bottom" />
      </div>
      <section className="auth-content auth-content-center" aria-live="polite">
        <AuthBrand showTagline />
        <p className="loading-copy">{message}</p>
        <div className="loading-dots" aria-label="Carregando" />
      </section>
    </main>
  );
}

function LoginScreen({ email, password, error, isLoading, onEmailChange, onPasswordChange, onSubmit, onForgotPassword, onBackToLogin, recoverySent }) {
  const [showPassword, setShowPassword] = useState(false);

  const handleCreateAccountClick = () => {
    window.alert("Criação de conta disponível somente por convite da sua empresa.");
  };

  const handleInviteClick = () => {
    window.alert("Use o link de convite enviado pela sua empresa para acessar o Perggo.");
  };

  return (
    <main className="auth-shell">
      <div className="auth-background" aria-hidden="true">
        <span className="auth-aura auth-aura-top" />
        <span className="auth-aura auth-aura-bottom" />
      </div>
      <section className="auth-content" aria-labelledby="login-title">
        <AuthBrand showTagline />
        {recoverySent ? (
          <div className="auth-success-state">
            <h1 id="login-title" className="auth-title">Enviamos um link para seu e-mail</h1>
            <p className="auth-subtitle">Verifique sua caixa de entrada e spam.</p>
            <button className="auth-primary-btn" type="button" onClick={onBackToLogin}>Voltar ao login</button>
          </div>
        ) : (
          <>
            <h1 id="login-title" className="auth-title">Bem-vindo de volta</h1>
            <p className="auth-subtitle">Entre para acessar sua central de respostas</p>

            <form className="login-form" onSubmit={onSubmit}>
              <label className="auth-field">
                <span className="auth-field-label">E-mail</span>
                <span className="auth-input-wrap">
                  <Mail size={18} className="auth-input-icon-left" aria-hidden="true" />
                  <input
                    className="auth-input"
                    type="email"
                    value={email}
                    onChange={(event) => onEmailChange(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </span>
              </label>
              <label className="auth-field">
                <span className="auth-field-label">Senha</span>
                <span className="auth-input-wrap">
                  <Lock size={18} className="auth-input-icon-left" aria-hidden="true" />
                  <input
                    className="auth-input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    className="auth-input-action"
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </span>
              </label>

              <button className="auth-forgot-link" type="button" onClick={onForgotPassword} disabled={isLoading}>Esqueci minha senha</button>
              {error ? <div className="login-error">{error}</div> : null}
              <button className="auth-primary-btn" type="submit" disabled={isLoading}>
                {isLoading ? "Entrando..." : "Entrar"}
              </button>
              <button className="auth-secondary-btn" type="button" onClick={handleCreateAccountClick}>Criar conta</button>
              <button className="auth-tertiary-link" type="button" onClick={handleInviteClick}>Fui convidado</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

function PasswordRecoveryScreen({ password, confirmPassword, message, isSaving, onPasswordChange, onConfirmPasswordChange, onSubmit, isSuccess, onBackToLogin }) {
  return (
    <main className="auth-shell">
      <div className="auth-background" aria-hidden="true">
        <span className="auth-aura auth-aura-top" />
        <span className="auth-aura auth-aura-bottom" />
      </div>
      <section className="auth-content" aria-labelledby="password-recovery-title">
        <AuthBrand showTagline />
        {isSuccess ? (
          <div className="auth-success-state">
            <h1 id="password-recovery-title" className="auth-title">Senha criada com sucesso</h1>
            <p className="auth-subtitle">Agora você já pode acessar sua empresa no Perggo.</p>
            <button className="auth-primary-btn" type="button" onClick={onBackToLogin}>Entrar no Perggo</button>
          </div>
        ) : (
          <>
            <h1 id="password-recovery-title" className="auth-title">Definir nova senha</h1>
            <p className="auth-subtitle">Crie uma senha segura para acessar sua conta.</p>
            <form className="login-form" onSubmit={onSubmit}>
              <label className="auth-field">
                <span className="auth-field-label">Nova senha</span>
                <span className="auth-input-wrap">
                  <Lock size={18} className="auth-input-icon-left" aria-hidden="true" />
                  <input className="auth-input" type="password" value={password} onChange={(event) => onPasswordChange(event.target.value)} autoComplete="new-password" required />
                </span>
              </label>
              <label className="auth-field">
                <span className="auth-field-label">Confirmar senha</span>
                <span className="auth-input-wrap">
                  <Lock size={18} className="auth-input-icon-left" aria-hidden="true" />
                  <input className="auth-input" type="password" value={confirmPassword} onChange={(event) => onConfirmPasswordChange(event.target.value)} autoComplete="new-password" required />
                </span>
              </label>
              <small className="recovery-helper">Depois de salvar, você poderá acessar sua empresa no Perggo.</small>
              {message ? <div className="login-error">{message}</div> : null}
              <button className="auth-primary-btn" type="submit" disabled={isSaving}>{isSaving ? "Salvando..." : "Salvar nova senha"}</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

function CompanySwitcher({ companies, currentCompany, permissions, currentUserRole, onChange }) {
  const canSwitch = permissions?.can_switch_company && currentUserRole === "platform_admin";
  if (!canSwitch || companies.length <= 1) {
    return (
      <div className="company-title-fallback">
        <span>{currentCompany?.name || "CPAP Express"}</span>
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
      </label>
    </div>
  );
}

function ScreenHeader({
  title,
  subtitle,
  companies,
  currentCompany,
  currentUser,
  permissions,
  onCompanyChange,
  isAuthenticated,
  onLogout,
  onEnableNotifications = () => {},
  notificationPermission = "unsupported",
  notificationsEnabled = false,
  notificationHelpText = "",
}) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userName = currentUser?.name || "";
  const userEmail = currentUser?.email || "";
  const companyName = currentCompany?.name || "";
  const userRole = currentUser?.role || "";
  const isNotificationsActive = notificationPermission === "granted" && notificationsEnabled !== false;

  useEffect(() => {
    function handleDocumentClick(event) {
      if (!event.target.closest(".header-user-menu")) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  return (
    <header className="topbar">
      <div>
        {isAuthenticated ? (
          <div className="header-user-menu">
            <button
              type="button"
              className="header-user-menu-trigger"
              onClick={() => setIsUserMenuOpen((current) => !current)}
              aria-haspopup="menu"
              aria-expanded={isUserMenuOpen}
            >
              <Sparkles size={16} />
              <span>Marketplace AI</span>
            </button>
            {isUserMenuOpen ? (
              <div className="header-user-menu-dropdown" role="menu">
                {userName ? <div className="header-user-menu-user">{userName}</div> : null}
                {userEmail ? <div className="header-user-menu-meta">{userEmail}</div> : null}
                {companyName ? <div className="header-user-menu-meta">{companyName}</div> : null}
                {userRole ? <div className="header-user-menu-meta">{userRole}</div> : null}
                <label className="notification-toggle-row">
                  <span className="notification-toggle-label">
                    {isNotificationsActive ? "Notificações Ativas" : "Notificações Inativas"}
                  </span>
                  <button
                    type="button"
                    className={`notification-toggle ${isNotificationsActive ? "active" : ""}`}
                    onClick={onEnableNotifications}
                    aria-pressed={isNotificationsActive}
                  >
                    <span />
                  </button>
                </label>
                <button
                  type="button"
                  className="header-user-menu-logout"
                  onClick={async () => {
                    setIsUserMenuOpen(false);
                    const passwordHandler = window.__marketplaceChangePassword;
                    if (typeof passwordHandler === "function") await passwordHandler();
                  }}
                  role="menuitem"
                >
                  Alterar senha
                </button>
                <button
                  type="button"
                  className="header-user-menu-logout"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout();
                  }}
                  role="menuitem"
                >
                  Sair
                </button>
                {notificationHelpText ? <div className="header-user-menu-help">{notificationHelpText}</div> : null}
              </div>
            ) : null}
          </div>
        ) : null}
        <CompanySwitcher
          companies={companies}
          currentCompany={currentCompany}
          permissions={permissions}
          currentUserRole={currentUser?.role}
          onChange={onCompanyChange}
        />
        {subtitle ? <span>{subtitle}</span> : null}
        <h1>{title}</h1>
      </div>
      <div className="topbar-actions">
        <span className="user-badge">{currentUser?.name || "Admin"}</span>
      </div>
    </header>
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
  onOpenHistoryImport,
  onSyncProducts,
  canFetchRealQuestions,
  isFetchingRealQuestions,
  isImportingHistory,
  isSyncingProducts,
  isDisconnecting,
  isLoadingIntegration,
  currentCompanyId,
}) {
  const isTenantScoped = !integration.company_id || integration.company_id === currentCompanyId;
  const isConnected =
    isTenantScoped && (integration.status === "Conectado" || integration.status === "Conectado temporariamente");
  const historyResult = isTenantScoped ? integration.lastMlHistoryImportResult || {} : {};
  const displayedStatus = isLoadingIntegration ? "Carregando" : isTenantScoped ? integration.status : "Não conectado";

  return (
    <article className="integration-card">
      <div className="integration-card-top">
        <IntegrationLogo integration={integration} />
        <span className={`integration-status ${statusClass[displayedStatus] || "soon"}`}>
          {isLoadingIntegration ? "Carregando..." : displayedStatus}
        </span>
      </div>

      <div className="integration-body">
        <h3>{integration.name}</h3>
        {isLoadingIntegration ? (
          <p>Carregando integração...</p>
        ) : isConnected ? (
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
        {!isLoadingIntegration && isConnected && integration.lastMlHistoryImportAt ? (
          <div className="integration-import-summary">
            <strong>Última importação:</strong>
            <span>{formatDate(integration.lastMlHistoryImportAt)}</span>
            <small>{historyResult.imported || 0} importadas</small>
            <small>{historyResult.updated || 0} atualizadas</small>
            <small>{historyResult.failed || 0} falhas</small>
          </div>
        ) : null}
      </div>

      <div className="integration-actions">
        {isLoadingIntegration ? (
          <>
            <button className="primary" disabled>
              <RefreshCw size={17} className="spin" />
              Carregando integração...
            </button>
            <button className="secondary" disabled>
              <RefreshCw size={17} />
              Importar histórico ML
            </button>
          </>
        ) : isConnected ? (
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
              onClick={() => onOpenHistoryImport(integration)}
              disabled={isImportingHistory}
            >
              <RefreshCw size={17} className={isImportingHistory ? "spin" : ""} />
              {isImportingHistory ? "Importando histórico..." : "Importar histórico ML"}
            </button>
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
          <>
            <button className="primary" onClick={() => onConnect(integration)}>
              <ExternalLink size={17} />
              Conectar
            </button>
            <button className="secondary" disabled>
              <RefreshCw size={17} />
              Importar histórico ML
            </button>
          </>
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

function HistoryImportModal({ integration, onCancel, onConfirm, isImporting }) {
  const [days, setDays] = useState(30);
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
        <span>Importação manual segura</span>
        <h2>Importar histórico ML</h2>
        <p>Importa perguntas e respostas do Mercado Livre somente para a empresa selecionada.</p>
        <label className="modal-select">
          Período
          <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
            <option value={15}>Últimos 15 dias</option>
            <option value={30}>Últimos 30 dias</option>
          </select>
        </label>
        <div className="modal-actions">
          <button className="secondary" type="button" onClick={onCancel} disabled={isImporting}>
            Cancelar
          </button>
          <button className="primary" type="button" onClick={() => onConfirm(days)} disabled={isImporting}>
            <RefreshCw size={17} className={isImporting ? "spin" : ""} />
            {isImporting ? "Importando..." : "Importar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function IntegrationsPage({
  companies,
  currentCompany,
  currentUser,
  permissions,
  integrations,
  integrationHealth,
  onCompanyChange,
  onConnect,
  onDisconnect,
  onFetchRealQuestions,
  onOpenHistoryImport,
  onSyncProducts,
  onTestHealth,
  fetchingRealQuestions,
  importingHistory,
  syncingProducts,
  disconnecting,
  testingIntegrationId,
  pendingIntegration,
  pendingHistoryImport,
  connectError,
  onCancelConnect,
  onConfirmConnect,
  onCancelHistoryImport,
  onConfirmHistoryImport,
  isIntegrationHealthLoading,
  selectedCompanyId,
  isAuthenticated,
  onLogout,
  onEnableNotifications,
  notificationPermission,
  notificationsEnabled,
  notificationButtonLabel,
  notificationHelpText,
}) {
  const tenantIntegrations = integrations.filter((item) => !item.company_id || item.company_id === selectedCompanyId);
  const connectedCount = isIntegrationHealthLoading ? 0 : tenantIntegrations.filter((item) => item.status === "Conectado").length;
  const temporaryCount = isIntegrationHealthLoading
    ? 0
    : tenantIntegrations.filter((item) => item.status === "Conectado temporariamente").length;

  return (
    <section className="integrations-page">
      <ScreenHeader
        title="Integrações"
        subtitle="Marketplaces e operação"
        companies={companies}
        currentCompany={currentCompany}
        currentUser={currentUser}
        permissions={permissions}
        onCompanyChange={onCompanyChange}
        isAuthenticated={isAuthenticated}
        onLogout={onLogout}
        onEnableNotifications={onEnableNotifications}
        notificationPermission={notificationPermission}
        notificationsEnabled={notificationsEnabled}
        notificationButtonLabel={notificationButtonLabel}
        notificationHelpText={notificationHelpText}
      />

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
            onOpenHistoryImport={onOpenHistoryImport}
            onSyncProducts={onSyncProducts}
            canFetchRealQuestions={
              integration.id === "mercado-livre" &&
              (integration.status === "Conectado" || integration.status === "Conectado temporariamente")
            }
            isFetchingRealQuestions={fetchingRealQuestions}
            isImportingHistory={importingHistory}
            isSyncingProducts={syncingProducts}
            isDisconnecting={disconnecting}
            isLoadingIntegration={isIntegrationHealthLoading}
            currentCompanyId={selectedCompanyId}
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
          {(isIntegrationHealthLoading ? loadingIntegrationHealth : integrationHealth).map((health) => (
            <article className="health-card" key={health.id}>
              <div className="health-card-top">
                <strong>{health.channel}</strong>
                <span className={`health-status ${health.api_status}`}>{health.api_status}</span>
              </div>
              <dl>
                <div>
                  <dt>Último sync</dt>
                  <dd>{isIntegrationHealthLoading ? "Carregando integração..." : health.last_sync ? formatDate(health.last_sync) : "Ainda não sincronizado"}</dd>
                </div>
                <div>
                  <dt>Token</dt>
                  <dd>{isIntegrationHealthLoading ? "Carregando integração..." : health.token_status}</dd>
                </div>
                <div>
                  <dt>Último erro</dt>
                  <dd>{isIntegrationHealthLoading ? "Carregando integração..." : health.last_error || "Sem erros recentes"}</dd>
                </div>
              </dl>
              <button
                className="secondary"
                onClick={() => onTestHealth(health.id)}
                disabled={isIntegrationHealthLoading || testingIntegrationId === health.id}
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
      <HistoryImportModal
        integration={pendingHistoryImport}
        onCancel={onCancelHistoryImport}
        onConfirm={onConfirmHistoryImport}
        isImporting={importingHistory}
      />
    </section>
  );
}

function SettingsPage({
  appData,
  companies,
  currentCompany,
  currentUser,
  permissions,
  onCompanyChange,
  onSettingsSaved,
  isAuthenticated,
  onLogout,
  onEnableNotifications,
  notificationPermission,
  notificationsEnabled,
  notificationButtonLabel,
  notificationHelpText,
}) {
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
      <ScreenHeader
        title="Configurações IA"
        subtitle="Empresa e IA"
        companies={companies}
        currentCompany={currentCompany}
        currentUser={currentUser}
        permissions={permissions}
        onCompanyChange={onCompanyChange}
        isAuthenticated={isAuthenticated}
        onLogout={onLogout}
        onEnableNotifications={onEnableNotifications}
        notificationPermission={notificationPermission}
        notificationsEnabled={notificationsEnabled}
        notificationButtonLabel={notificationButtonLabel}
        notificationHelpText={notificationHelpText}
      />

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

function AnalyticsPage({
  questions,
  appData,
  productsSummary,
  companies,
  currentCompany,
  currentUser,
  permissions,
  onCompanyChange,
  isAuthenticated,
  onLogout,
  onEnableNotifications,
  notificationPermission,
  notificationsEnabled,
  notificationButtonLabel,
  notificationHelpText,
}) {
  const pending = questions.filter((question) => question.status === "Pendente").length;
  const answered = questions.filter((question) => question.status === "Respondida").length;
  const highPriority = questions.filter((question) => question.priority === "Alta").length;

  return (
    <section className="settings-page">
      <ScreenHeader
        title="Analytics"
        subtitle="Operação"
        companies={companies}
        currentCompany={currentCompany}
        currentUser={currentUser}
        permissions={permissions}
        onCompanyChange={onCompanyChange}
        isAuthenticated={isAuthenticated}
        onLogout={onLogout}
        onEnableNotifications={onEnableNotifications}
        notificationPermission={notificationPermission}
        notificationsEnabled={notificationsEnabled}
        notificationButtonLabel={notificationButtonLabel}
        notificationHelpText={notificationHelpText}
      />

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
            {question.totalQuestions > 1 ? <span className="count-badge">{question.totalQuestions}</span> : null}
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
  const conversationQuestions = sortQuestionsChronologically(question.questions || [question]);
  const editableQuestion = getNewestPendingQuestion(conversationQuestions) || question;
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
            {question.totalQuestions > 1 ? <span className="count-badge">{question.totalQuestions}</span> : null}
          </div>
        </div>
      </div>

      <h3>{question.product}</h3>
      <div className="pending-thread-preview">
        {conversationQuestions.map((item) => (
          <div className="pending-thread-item" key={item.id || item.external_id}>
            <div>
              <span>{formatDate(item.created_at)}</span>
              <p>{item.question}</p>
            </div>
            {item.status === "Respondida" && (item.final_response || item.final_answer || item.ai_suggestion) ? (
              <div className="pending-thread-answer">
                <span>{getAnsweredSourceLabel(item.answered_source)}</span>
                <p>{item.final_response || item.final_answer || item.ai_suggestion}</p>
              </div>
            ) : null}
          </div>
        ))}
      </div>

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
  const sortedQuestions = sortQuestionsChronologically(questions || []);
  return (
    <div className="conversation-thread">
      {sortedQuestions.map((item) => (
        <div className="thread-item" key={item.id || item.external_id}>
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
  const conversationQuestions = sortQuestionsChronologically(question?.questions || (question ? [question] : []));
  const editableQuestion = getNewestPendingQuestion(conversationQuestions) || question;
  const isUnanswerable = Boolean(question?.is_unanswerable || question?.status === "Não respondível");

  useEffect(() => {
    const pendingQuestion = getNewestPendingQuestion(question?.questions || [question]) || question;
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

  if (isUnanswerable) {
    return (
      <section className="conversation">
        <header className="conversation-header">
          <button className="back-button" onClick={onBack} aria-label="Voltar para lista">
            <ChevronLeft size={22} />
          </button>
          <div>
            <span>{question.marketplace} · {getBuyerDisplayName(question.buyer, question.customer_name, { detail: true })}</span>
            <h2>{question.product}</h2>
            <p>{question.answer_blocked_at ? `Bloqueada em ${formatDate(question.answer_blocked_at)}` : "Resposta bloqueada"}</p>
          </div>
          <span className={`pill status ${statusClass[question.status]}`}>{question.status}</span>
        </header>

        <div className="chat-surface">
          <DetailMetadata question={question} />
          <div className="answer-feedback info">
            {question.answer_error_message || "Esta pergunta não pode mais ser respondida porque o anúncio não está ativo no Mercado Livre."}
          </div>
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


function InstallAppHint() {
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  if (!installPrompt) return null;

  return (
    <button
      type="button"
      className="install-app-hint"
      onClick={async () => {
        installPrompt.prompt();
        await installPrompt.userChoice;
        setInstallPrompt(null);
      }}
    >
      Instalar app
    </button>
  );
}

export default function App() {
  const inFlightQuestionsRequestsRef = useRef(new Set());
  const lastQuestionsLoadKeyRef = useRef("");
  const questionsAbortControllersRef = useRef(new Map());
  const debouncedQuestionsLoadRef = useRef(null);
  const [authSession, setAuthSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(isSupabaseAuthConfigured);
  const [isTenantContextLoading, setIsTenantContextLoading] = useState(Boolean(isSupabaseAuthConfigured));
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [isSavingRecoveryPassword, setIsSavingRecoveryPassword] = useState(false);
  const [isRecoverySuccess, setIsRecoverySuccess] = useState(false);
  const [isRecoveryEmailSent, setIsRecoveryEmailSent] = useState(false);
  const [tenantContext, setTenantContext] = useState(FALLBACK_TENANT_CONTEXT);
  const [companies, setCompanies] = useState([FALLBACK_TENANT_CONTEXT.company]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(getStoredCompanyId);
  const currentUser = tenantContext.user;
  const currentCompany = tenantContext.company;
  const currentPermissions = tenantContext.permissions;
  const [appData, setAppData] = useState(initialAppData);
  const [active, setActive] = useState("Inbox");
  const [integrationHealth, setIntegrationHealth] = useState(initialIntegrationHealth);
  const [isIntegrationHealthLoading, setIsIntegrationHealthLoading] = useState(true);
  const [pendingIntegration, setPendingIntegration] = useState(null);
  const [connectError, setConnectError] = useState("");
  const [fetchingMlQuestions, setFetchingMlQuestions] = useState(false);
  const [importingMlHistory, setImportingMlHistory] = useState(false);
  const [syncingProducts, setSyncingProducts] = useState(false);
  const [disconnectingMl, setDisconnectingMl] = useState(false);
  const [pendingHistoryImport, setPendingHistoryImport] = useState(null);
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
  const [historyDays, setHistoryDays] = useState(15);
  const [showConversation, setShowConversation] = useState(false);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(false);
  const [isLoadingMoreQuestions, setIsLoadingMoreQuestions] = useState(false);
  const [questionsPageInfo, setQuestionsPageInfo] = useState({
    total: 0,
    page: 1,
    page_size: 20,
    has_more: false,
  });
  const [pendingBadgeCount, setPendingBadgeCount] = useState(0);
  const [lastPendingCount, setLastPendingCount] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState("unsupported");
  const [appNotificationsEnabled, setAppNotificationsEnabled] = useState(getStoredNotificationPreference);
  const [notificationHelpText, setNotificationHelpText] = useState("");
  const notificationDebounceRef = useRef(null);

  const questions = appData.questions;
  const integrations = appData.integrations;

  useEffect(() => {
    if (isSupabaseAuthConfigured && !authSession) return undefined;

    let permissionStatus = null;

    function refreshNotificationPermission() {
      setNotificationPermission(getBrowserNotificationPermission());
    }

    refreshNotificationPermission();
    window.addEventListener("focus", refreshNotificationPermission);

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "notifications" })
        .then((status) => {
          permissionStatus = status;
          status.onchange = refreshNotificationPermission;
        })
        .catch(() => {
          permissionStatus = null;
        });
    }

    return () => {
      window.removeEventListener("focus", refreshNotificationPermission);
      if (permissionStatus) permissionStatus.onchange = null;
    };
  }, [authSession?.access_token]);

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
    if (!supabase) return;
    const hashParams = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
    const queryParams = new URLSearchParams(window.location.search || "");
    const flowType = (hashParams.get("type") || queryParams.get("type") || "").toLowerCase();
    const hasAccessToken = Boolean(hashParams.get("access_token") || queryParams.get("access_token"));
    const errorDescription = hashParams.get("error_description") || queryParams.get("error_description") || hashParams.get("error") || queryParams.get("error") || "";
    if (errorDescription) {
      setRecoveryMessage(decodeURIComponent(errorDescription));
    }
    if ((flowType === "recovery" || flowType === "invite") && hasAccessToken) {
      setIsRecoveryFlow(true);
      setLoginError("");
    }
  }, []);

  function resetTenantScopedUi() {
    setIsQuestionsLoading(true);
    clearTenantQuestionStorage();
    setQuestions([]);
    setAppData((current) => ({
      ...current,
      questions: [],
      integrations: integrationState(),
      aiSettings: {
        ai_general_rules: "",
        ai_product_knowledge: "",
        ai_allow_web_search: false,
        ai_absolute_restrictions: "",
      },
    }));
    setProductsSummary({ total: 0, active: 0, inactive: 0 });
    setIntegrationHealth(initialIntegrationHealth);
    setIsIntegrationHealthLoading(true);
    setQuestionsPageInfo({ total: 0, page: 1, page_size: 20, has_more: false });
    setIsLoadingMoreQuestions(false);
    setSelectedId(null);
    setMarketplaceFilter("Todos");
    setPriorityFilter("Todos");
    setAnsweredSourceFilter("Todas");
    setShowConversation(false);
    setQuestionNotice("");
    setAnswerNotice("");
    setAnswerError("");
    setSendingAnswerId(null);
    setGeneratingQuestionId(null);
    setImportingMlHistory(false);
    setPendingIntegration(null);
    setPendingHistoryImport(null);
    setConnectError("");
    setTestingIntegrationId(null);
    setPendingBadgeCount(0);
    setLastPendingCount(0);
  }

  function resetAuthUiState(errorMessage = "") {
    resetTenantScopedUi();
    localStorage.removeItem(SELECTED_COMPANY_STORAGE_KEY);
    clearTenantQuestionStorage();
    setSelectedCompanyId(getStoredCompanyId());
    setActive("Inbox");
    setTenantContext(FALLBACK_TENANT_CONTEXT);
    setIsTenantContextLoading(Boolean(isSupabaseAuthConfigured));
    setCompanies([FALLBACK_TENANT_CONTEXT.company]);
    if (errorMessage) setLoginError(errorMessage);
  }

  function queueNewQuestionNotification(nextCount, sampleQuestion) {
    if (notificationDebounceRef.current) return;
    notificationDebounceRef.current = window.setTimeout(() => {
      const productTitle = sampleQuestion?.product_title || sampleQuestion?.product || "";
      setQuestionNotice(productTitle ? `Nova pergunta recebida: ${productTitle}` : "Nova pergunta recebida");
      if (isNotificationEffectivelyEnabled(notificationPermission, appNotificationsEnabled) && typeof Notification !== "undefined") {
        new Notification("Nova pergunta no Marketplace", { body: productTitle || sampleQuestion?.question || "Nova pergunta pendente" });
      }
      notificationDebounceRef.current = null;
    }, 1200);
  }

async function handleEnableNotifications() {
    const permission = getBrowserNotificationPermission();
    setNotificationPermission(permission);

    if (permission === "unsupported") {
      setNotificationHelpText("");
      setQuestionNotice("Seu navegador não suporta notificações.");
      return;
    }

    if (isNotificationEffectivelyEnabled(permission, appNotificationsEnabled)) {
      localStorage.setItem(NOTIFICATION_PREFERENCE_STORAGE_KEY, "false");
      setAppNotificationsEnabled(false);
      setNotificationHelpText("");
      setQuestionNotice("Notificações desativadas neste app.");
      return;
    }

    if (permission === "granted") {
      localStorage.setItem(NOTIFICATION_PREFERENCE_STORAGE_KEY, "true");
      setAppNotificationsEnabled(true);
      setNotificationHelpText("");
      setQuestionNotice("Notificações ativadas neste app.");
      return;
    }

    if (permission === "denied") {
      localStorage.setItem(NOTIFICATION_PREFERENCE_STORAGE_KEY, "false");
      setAppNotificationsEnabled(false);
      setNotificationHelpText("Notificações bloqueadas. Ative nas permissões do site/app no Android.");
      setQuestionNotice(getBlockedNotificationMessage());
      return;
    }

    setNotificationHelpText("");
    const requestedPermission = await Notification.requestPermission();
    setNotificationPermission(requestedPermission);
    if (requestedPermission === "granted") {
      localStorage.setItem(NOTIFICATION_PREFERENCE_STORAGE_KEY, "true");
      setAppNotificationsEnabled(true);
      setNotificationHelpText("");
      setQuestionNotice("Notificações ativadas neste app.");
    } else {
      localStorage.setItem(NOTIFICATION_PREFERENCE_STORAGE_KEY, "false");
      setAppNotificationsEnabled(false);
      if (requestedPermission === "denied") {
        setNotificationHelpText("Notificações bloqueadas. Ative nas permissões do site/app no Android.");
        setQuestionNotice(getBlockedNotificationMessage());
      } else {
        setNotificationHelpText("");
        setQuestionNotice("Notificações não ativadas. Você pode tentar novamente pelo menu.");
      }
    }
  }

  function handleNotificationToggle() {
    return handleEnableNotifications();
  }

  function switchCompany(companyId) {
    const previousCompanyId = getStoredCompanyId();
    questionsAbortControllersRef.current.forEach((controller) => controller.abort());
    questionsAbortControllersRef.current.clear();
    inFlightQuestionsRequestsRef.current.clear();
    localStorage.setItem(SELECTED_COMPANY_STORAGE_KEY, companyId);
    resetTenantScopedUi();
    setSelectedCompanyId(companyId);
  }

  async function fetchCompanies() {
    try {
      const response = await apiFetch(`${API_URL}/companies`);
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setCompanies(data.length ? data : [FALLBACK_TENANT_CONTEXT.company]);
      }
    } catch {
      setCompanies([FALLBACK_TENANT_CONTEXT.company]);
    }
  }

  function changeHistoryDays(days) {
    const nextDays = Number(days) === 30 ? 30 : 15;
    resetTenantScopedUi();
    setHistoryDays(nextDays);
  }


  async function loadMeForSession(session, requestCompanyId = getStoredCompanyId()) {
    try {
      const headers = new Headers();
      if (requestCompanyId) headers.set("X-Company-ID", requestCompanyId);
      if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
      const response = await withTimeout(
        fetch(`${API_URL}/me`, { headers }),
        AUTH_REQUEST_TIMEOUT_MS,
        "Tempo esgotado ao carregar dados do usuário."
      );
      const tenant = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(tenant.detail || "Não foi possível carregar dados do usuário.");
      }
      return tenant;
    } catch (error) {
      console.error("ME_LOAD_ERROR", { message: error.message });
      throw error;
    }
  }

  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      return undefined;
    }

    let isMounted = true;
    withTimeout(
      supabase.auth.getSession(),
      AUTH_REQUEST_TIMEOUT_MS,
      "Tempo esgotado ao restaurar sessão."
    )
      .then(({ data }) => {
        if (!isMounted) return;
        setAuthSession(data.session || null);
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error("LOGIN_ERROR", { message: error.message });
        setAuthSession(null);
        setLoginError("Não foi possível restaurar sua sessão. Tente entrar novamente.");
      })
      .finally(() => {
        if (isMounted) setIsAuthLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthSession(session || null);
      setIsAuthLoading(false);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    if (!supabase) return;
    setLoginError("");
    setIsAuthLoading(true);
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
        AUTH_REQUEST_TIMEOUT_MS,
        "Tempo esgotado ao entrar. Tente novamente."
      );
      if (error) throw error;
      const session = data?.session;
      if (!session?.access_token) {
        throw new Error("Sessão não retornada pelo Supabase.");
      }
      await loadMeForSession(session);
      setActive("Inbox");
      setAuthSession(session);
    } catch (error) {
      console.error("LOGIN_ERROR", { message: error.message });
      setAuthSession(null);
      setLoginError(error.message || "Não foi possível entrar.");
      await supabase.auth.signOut().catch(() => {});
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!supabase) return;
    const email = loginEmail.trim();
    if (!email) {
      setLoginError("Informe seu e-mail para receber o link de redefinição.");
      return;
    }
    setLoginError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: DEFAULT_FRONTEND_URL });
    if (error) {
      setLoginError(error.message || "Não foi possível enviar a redefinição.");
      return;
    }
    setIsRecoveryEmailSent(true);
  }

  async function handleRecoveryPasswordSubmit(event) {
    event.preventDefault();
    if (!supabase) return;
    if (recoveryPassword !== recoveryConfirmPassword) {
      setRecoveryMessage("As senhas não conferem.");
      return;
    }
    setIsSavingRecoveryPassword(true);
    setRecoveryMessage("");
    const { error } = await supabase.auth.updateUser({ password: recoveryPassword });
    if (error) {
      setRecoveryMessage(error.message || "Não foi possível salvar a nova senha.");
      setIsSavingRecoveryPassword(false);
      return;
    }
    setIsRecoverySuccess(true);
    setRecoveryPassword("");
    setRecoveryConfirmPassword("");
    window.history.replaceState({}, document.title, window.location.pathname);
    await supabase.auth.signOut().catch(() => {});
    setAuthSession(null);
    setIsSavingRecoveryPassword(false);
  }

  function goToLoginAfterRecovery() {
    setIsRecoveryFlow(false);
    setIsRecoverySuccess(false);
    setRecoveryMessage("");
  }

  async function handleLogout() {
    setIsTenantContextLoading(Boolean(isSupabaseAuthConfigured));
    resetAuthUiState("");
    setLoginPassword("");
    setLoginError("");
    setAuthSession(null);
    if (supabase) await supabase.auth.signOut();
  }

  async function handleChangePassword() {
    if (!supabase || !authSession) {
      setQuestionNotice("Sessão inválida para alterar senha.");
      return;
    }
    const newPassword = window.prompt("Digite a nova senha:");
    if (!newPassword) return;
    const confirmPassword = window.prompt("Confirme a nova senha:");
    if (newPassword !== confirmPassword) {
      setQuestionNotice("As senhas não conferem.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setQuestionNotice(error.message || "Não foi possível alterar senha.");
      return;
    }
    setQuestionNotice("Senha atualizada com sucesso.");
  }

  useEffect(() => {
    window.__marketplaceChangePassword = handleChangePassword;
    return () => {
      delete window.__marketplaceChangePassword;
    };
  }, [authSession?.access_token]);

  async function loadMoreQuestions() {
    if (isLoadingMoreQuestions || !questionsPageInfo.has_more) return;
    try {
      await loadQuestionsFromDatabase({ page: questionsPageInfo.page + 1, append: true });
    } catch (error) {
      setQuestionNotice(error.message || "Não foi possível carregar mais perguntas.");
      setIsLoadingMoreQuestions(false);
    }
  }

  async function loadQuestionsFromDatabase({ page = 1, append = false } = {}) {
    const requestCompanyId = getStoredCompanyId();
    const pageSize = questionsPageInfo.page_size || 20;
    const requestKey = `${requestCompanyId}|${historyDays}|${page}`;
    if (inFlightQuestionsRequestsRef.current.has(requestKey)) {
      return [];
    }
    const previousController = questionsAbortControllersRef.current.get(requestKey);
    if (previousController) {
      previousController.abort();
    }
    const controller = new AbortController();
    questionsAbortControllersRef.current.set(requestKey, controller);
    inFlightQuestionsRequestsRef.current.add(requestKey);
    if (append) {
      setIsLoadingMoreQuestions(true);
    } else {
      setIsQuestionsLoading(true);
    }
    try {
      const response = await apiFetchWithRetry(
        `${API_URL}/questions?days=${historyDays}&page=${page}&page_size=${pageSize}`,
        { signal: controller.signal },
        { retries: 1, retryDelayMs: 600 }
      );
      const data = await response.json();
      const responseItems = Array.isArray(data) ? data : data.items;
      if (!response.ok || !Array.isArray(responseItems)) {
        throw new Error("Não foi possível carregar perguntas do banco.");
      }
      if (requestCompanyId !== getStoredCompanyId()) {
        return [];
      }
      const tenantQuestions = responseItems.filter((question) => {
        return question.company_id && question.company_id === requestCompanyId;
      });
      const pendingCount = tenantQuestions.filter((question) => question.status === "Pendente").length;
      setPendingBadgeCount((current) => (active === "Inbox" ? 0 : pendingCount));
      if (pendingCount > lastPendingCount) {
        queueNewQuestionNotification(pendingCount, tenantQuestions.find((question) => question.status === "Pendente"));
      }
      setLastPendingCount(pendingCount);
      const nextPageInfo = Array.isArray(data)
        ? { total: tenantQuestions.length, page, page_size: pageSize, has_more: false }
        : {
            total: data.total || tenantQuestions.length,
            page: data.page || page,
            page_size: data.page_size || pageSize,
            has_more: Boolean(data.has_more),
          };
      setQuestionsPageInfo(nextPageInfo);
      setQuestions((current) => {
        if (!append) return tenantQuestions;
        const byKey = new Map(current.map((question) => [question.id || question.external_id, question]));
        tenantQuestions.forEach((question) => byKey.set(question.id || question.external_id, question));
        return Array.from(byKey.values());
      });
      setSelectedId((current) =>
        current && (append || tenantQuestions.some((question) => question.id === current))
          ? current
          : tenantQuestions[0]?.id || null
      );
      return tenantQuestions;
    } catch (error) {
      if (error?.name === "AbortError") return [];
      throw error;
    } finally {
      inFlightQuestionsRequestsRef.current.delete(requestKey);
      if (questionsAbortControllersRef.current.get(requestKey) === controller) {
        questionsAbortControllersRef.current.delete(requestKey);
      }
      setIsQuestionsLoading(false);
      setIsLoadingMoreQuestions(false);
    }
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

  async function refreshIntegrationHealth(companyId = selectedCompanyId) {
    const requestCompanyId = companyId || getStoredCompanyId();
    const requestCompanyName = getCompanyNameById(companies, requestCompanyId, requestCompanyId);
    setIsIntegrationHealthLoading(true);
    setIntegrationHealth(initialIntegrationHealth);
    setIntegrations(() => integrationState());
    try {
      const response = await apiFetch(`${API_URL}/integrations/health`, {
        headers: { "X-Company-ID": requestCompanyId },
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data)) {
        throw new Error("Invalid integration health response");
      }
      const responseCompanyIds = Array.from(new Set(data.map(getHealthCompanyId).filter(Boolean)));
      const responseCompanyId = responseCompanyIds[0] || "missing";
      const staleResponseCompanyId = responseCompanyIds.find((id) => id !== requestCompanyId);
      if (staleResponseCompanyId || requestCompanyId !== getStoredCompanyId()) {
        return initialIntegrationHealth;
      }
      const mercadoLivreHealth = data.filter((health) => {
        const healthCompanyId = getHealthCompanyId(health);
        return health.id === "mercado-livre" && (!healthCompanyId || healthCompanyId === requestCompanyId);
      });
      setIntegrationHealth(mercadoLivreHealth);
      setIntegrations((current) =>
        applyBackendHealthToIntegrations(current, mercadoLivreHealth, requestCompanyId, requestCompanyName)
      );
      return mercadoLivreHealth;
    } catch {
      if (requestCompanyId === getStoredCompanyId()) {
        setIntegrationHealth(initialIntegrationHealth);
        setIntegrations((current) =>
          applyBackendHealthToIntegrations(current, initialIntegrationHealth, requestCompanyId, requestCompanyName)
        );
      }
      return initialIntegrationHealth;
    } finally {
      if (requestCompanyId === getStoredCompanyId()) {
        setIsIntegrationHealthLoading(false);
      }
    }
  }

  useEffect(() => {
    if (isQuestionsLoading) return;
    setSelectedId((current) => current || questions[0]?.id || null);
  }, [questions, isQuestionsLoading, selectedCompanyId, currentCompany?.id]);

  useEffect(() => {
    if (isSupabaseAuthConfigured && !authSession) {
      setIsQuestionsLoading(false);
      setIsTenantContextLoading(false);
      return;
    }

    setIsTenantContextLoading(true);
    resetTenantScopedUi();
    const requestCompanyId = selectedCompanyId;

    async function loadTenantContext() {
      try {
        const tenant = await loadMeForSession(authSession, requestCompanyId);
        if (requestCompanyId !== getStoredCompanyId()) {
          return;
        }
        const resolvedRole = tenant?.user?.role || "";
        const roleForCheck = resolvedRole;
        const backendCompanyId = tenant?.company?.id || "";
        const allowedCompanyIds = Array.isArray(tenant?.user?.allowed_company_ids) ? tenant.user.allowed_company_ids : [];
        const nextSelectedCompanyId = allowedCompanyIds.includes(requestCompanyId)
          ? requestCompanyId
          : (backendCompanyId || allowedCompanyIds[0] || requestCompanyId);
        if (nextSelectedCompanyId !== requestCompanyId) {
          localStorage.setItem(SELECTED_COMPANY_STORAGE_KEY, nextSelectedCompanyId);
          clearTenantQuestionStorage();
          setSelectedCompanyId(nextSelectedCompanyId);
          return;
        }
        if (resolvedRole !== "platform_admin" && backendCompanyId) {
          // TODO security: enforce role-based tenant lock server-side for all admin-only routes.
          if (requestCompanyId !== backendCompanyId) {
            localStorage.setItem(SELECTED_COMPANY_STORAGE_KEY, backendCompanyId);
            clearTenantQuestionStorage();
            setSelectedCompanyId(backendCompanyId);
            return;
          }
        }
        if (backendCompanyId && backendCompanyId !== requestCompanyId) {
          localStorage.setItem(SELECTED_COMPANY_STORAGE_KEY, backendCompanyId);
          clearTenantQuestionStorage();
          setSelectedCompanyId(backendCompanyId);
          return;
        }
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
        if (!canAccessScreen(roleForCheck, active)) {
          console.info("AUTH_SAVED_SCREEN_RESET role=%s screen=%s", roleForCheck, active);
          setActive("Inbox");
        }
        setIsTenantContextLoading(false);
      } catch {
        resetAuthUiState("Usuário desativado. Entre em contato com o administrador.");
        if (supabase) await supabase.auth.signOut().catch(() => {});
        setAuthSession(null);
        setIsTenantContextLoading(false);
      }
    }


    async function loadPersistedQuestions() {
      try {
        await loadQuestionsFromDatabase();
      } catch (error) {
        setQuestionNotice(error.message || "Não foi possível carregar perguntas do banco.");
        setIsQuestionsLoading(false);
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

    loadTenantContext().then(fetchCompanies);
    const initialLoadKey = `${selectedCompanyId}|${historyDays}|${authSession?.access_token || "no-token"}`;
    if (lastQuestionsLoadKeyRef.current !== initialLoadKey) {
      lastQuestionsLoadKeyRef.current = initialLoadKey;
      if (debouncedQuestionsLoadRef.current) window.clearTimeout(debouncedQuestionsLoadRef.current);
      debouncedQuestionsLoadRef.current = window.setTimeout(loadPersistedQuestions, 180);
    }
    loadCompanySettings();
    loadProductsSummary().catch(() => {});
    return () => {
      if (debouncedQuestionsLoadRef.current) {
        window.clearTimeout(debouncedQuestionsLoadRef.current);
        debouncedQuestionsLoadRef.current = null;
      }
    };
  }, [selectedCompanyId, historyDays, authSession?.access_token]);

  useEffect(() => {
    if (isSupabaseAuthConfigured && !authSession) {
      setIsIntegrationHealthLoading(false);
      return;
    }
    refreshIntegrationHealth(selectedCompanyId);
  }, [selectedCompanyId, authSession?.access_token]);

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

  const visibleQuestions = useMemo(() => {
    const companyId = selectedCompanyId || currentCompany?.id || getStoredCompanyId();
    const filtered = questions.filter((question) => {
      if (!question.company_id || question.company_id !== companyId) {
        return false;
      }
      return true;
    });
    return filtered;
  }, [questions, selectedCompanyId, currentCompany?.id]);

  const marketplaces = useMemo(
    () => ["Todos", ...new Set(visibleQuestions.map((question) => question.marketplace))],
    [visibleQuestions]
  );

  const conversationGroups = useMemo(
    () => buildConversationGroups(visibleQuestions),
    [visibleQuestions]
  );

  const filteredConversationGroups = useMemo(() => {
    return conversationGroups.filter((conversation) => {
      const marketplaceMatches =
        marketplaceFilter === "Todos" || conversation.marketplace === marketplaceFilter;
      const priorityMatches =
        priorityFilter === "Todos" || conversation.priority === priorityFilter;
      const statusMatches =
        active === "Respondidas"
          ? conversation.allAnswered
          : active === "Pendentes"
            ? conversation.hasPending
            : true;
      const answeredSourceMatches =
        active !== "Respondidas" ||
        answeredSourceFilter === "Todas" ||
        conversation.questions.some(
          (question) => normalizeAnsweredSource(question.answered_source) === normalizeAnsweredSource(answeredSourceFilter)
        );
      return marketplaceMatches && priorityMatches && statusMatches && answeredSourceMatches;
    });
  }, [active, conversationGroups, marketplaceFilter, priorityFilter, answeredSourceFilter]);

  const finalCards = useMemo(() => {
    const companyId = selectedCompanyId || currentCompany?.id || getStoredCompanyId();
    return filteredConversationGroups.filter((card) => cardBelongsToCompany(card, companyId));
  }, [filteredConversationGroups, selectedCompanyId, currentCompany?.id]);
  const selectedQuestion = isQuestionsLoading
    ? null
    : finalCards.find((question) => question.id === selectedId) ||
      finalCards[0] ||
      null;
  const selectedEditableQuestion =
    getNewestPendingQuestion(selectedQuestion?.questions || (selectedQuestion ? [selectedQuestion] : [])) || selectedQuestion;

  const metrics = {
    pending: visibleQuestions.filter((question) => question.status === "Pendente").length,
    answered: visibleQuestions.filter((question) => question.status === "Respondida").length,
    high: visibleQuestions.filter((question) => question.priority === "Alta").length,
  };

  const hasVisibleQuestions = finalCards.length > 0;
  const mercadoLivreIntegration = integrations.find((integration) => integration.id === "mercado-livre");
  const isMercadoLivreConnected = mercadoLivreIntegration?.status === "Conectado";
  const isPendingScreen = active === "Pendentes";
  const isReadOnlyAnsweredScreen = active === "Respondidas";
  const answerFeedbackClass = answerError
    ? "error"
    : answerNotice.includes("outro usuário") || answerNotice.includes("não pode mais ser respondida")
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
      setSelectedId(conversationGroups.find((conversation) => conversation.hasPending)?.id || null);
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
      setSelectedId(conversationGroups.find((conversation) => conversation.allAnswered)?.id || null);
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
    setSelectedId(conversationGroups.find((conversation) => conversation.priority === "Alta")?.id || null);
  }

  useEffect(() => {
    if (selectedId && !finalCards.some((question) => question.id === selectedId)) {
      setSelectedId(finalCards[0]?.id || null);
      setShowConversation(false);
    } else if (!selectedId && finalCards.length > 0) {
      setSelectedId(finalCards[0].id);
    }

    if (marketplaceFilter !== "Todos" && !marketplaces.includes(marketplaceFilter)) {
      setMarketplaceFilter("Todos");
    }
  }, [finalCards, marketplaceFilter, marketplaces, selectedId]);

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

        if (data.answer_blocked) {
          const updatedQuestion = data.question || targetQuestion;
          setQuestions((current) =>
            current.map((question) =>
              question.id === id
                ? {
                    ...question,
                    ...updatedQuestion,
                    status: "Não respondível",
                    is_unanswerable: true,
                    answer_error_message:
                      data.message ||
                      updatedQuestion.answer_error_message ||
                      "Esta pergunta não pode mais ser respondida porque o anúncio não está ativo no Mercado Livre.",
                    answer_error_code: data.error_code || updatedQuestion.answer_error_code || "answer_blocked",
                    answer_blocked_at: updatedQuestion.answer_blocked_at || new Date().toISOString(),
                  }
                : question
            )
          );
          setAnswerNotice(data.message || "Esta pergunta não pode mais ser respondida porque o anúncio não está ativo no Mercado Livre.");
          setShowConversation(false);
          setSelectedId(null);
          await loadQuestionsFromDatabase().catch(() => {});
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

  function openHistoryImport(integration) {
    setPendingHistoryImport(integration);
  }

  async function importMercadoLivreHistory(days = 30) {
    setImportingMlHistory(true);
    setQuestionNotice("");
    try {
      const response = await apiFetch(`${API_URL}/integrations/mercadolivre/questions/import-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || data.message || "Não foi possível importar o histórico do Mercado Livre.");
      }
      await loadQuestionsFromDatabase();
      await refreshIntegrationHealth();
      setQuestionNotice(
        `Histórico importado: ${data.imported || 0} novos, ${data.updated || 0} atualizados, ${data.failed || 0} falhas.`
      );
      setPendingHistoryImport(null);
    } catch (error) {
      setQuestionNotice(error.message || "Não foi possível importar o histórico do Mercado Livre.");
    } finally {
      setImportingMlHistory(false);
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

  const allowedNavItems = getRoleAwareNavItems(currentUser?.role);
  const navItemsWithBadge = allowedNavItems.map((item) => item.label === "Inbox" ? { ...item, badgeCount: pendingBadgeCount } : item);
  useEffect(() => {
    if (active === "Inbox") setPendingBadgeCount(0);
  }, [active]);
  const isIntegrations = active === "Integrações";
  const isSettings = active === "Configurações";
  const isAnalytics = active === "Analytics";
  const isCompaniesAdmin = active === "Empresas";
  const isUsersAdmin = active === "Usuários";
  useEffect(() => {
    if (!allowedNavItems.some((item) => item.label === active)) {
      setActive("Inbox");
    }
  }, [active, allowedNavItems]);

  const emptyQuestionTitle =
    active === "Pendentes"
      ? "Nenhuma pergunta pendente encontrada."
      : active === "Respondidas"
        ? "Nenhuma pergunta respondida encontrada."
        : "Nenhuma pergunta encontrada.";

  const notificationsEnabled = appNotificationsEnabled;
  const notificationButtonLabel = getNotificationButtonLabel(notificationPermission, notificationsEnabled);

  if (isSupabaseAuthConfigured && isTenantContextLoading) {
    return <LoadingScreen message="Preparando sua central de respostas..." />;
  }

  if (isSupabaseAuthConfigured && isRecoveryFlow) {
    return (
      <PasswordRecoveryScreen
        password={recoveryPassword}
        confirmPassword={recoveryConfirmPassword}
        message={recoveryMessage}
        isSaving={isSavingRecoveryPassword}
        onPasswordChange={setRecoveryPassword}
        onConfirmPasswordChange={setRecoveryConfirmPassword}
        onSubmit={handleRecoveryPasswordSubmit}
        isSuccess={isRecoverySuccess}
        onBackToLogin={goToLoginAfterRecovery}
      />
    );
  }

  if (isSupabaseAuthConfigured && !authSession) {
    return (
      <LoginScreen
        email={loginEmail}
        password={loginPassword}
        error={loginError}
        isLoading={isAuthLoading}
        onEmailChange={setLoginEmail}
        onPasswordChange={setLoginPassword}
        onSubmit={handleLogin}
        onForgotPassword={handleForgotPassword}
        recoverySent={isRecoveryEmailSent}
        onBackToLogin={() => {
          setIsRecoveryEmailSent(false);
          setLoginError("");
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        active={active}
        onNavigate={changeSection}
        navItems={navItemsWithBadge}
      />

      <main className={`workspace ${isIntegrations || isSettings || isAnalytics || isCompaniesAdmin || isUsersAdmin ? "single-view" : ""}`}>
        {isIntegrations ? (
          <IntegrationsPage
            companies={companies}
            currentCompany={currentCompany}
            currentUser={currentUser}
            permissions={currentPermissions}
            integrations={integrations}
            integrationHealth={integrationHealth}
            isIntegrationHealthLoading={isIntegrationHealthLoading}
            selectedCompanyId={selectedCompanyId}
            isAuthenticated={Boolean(authSession)}
            onLogout={handleLogout}
            onEnableNotifications={handleNotificationToggle}
            notificationPermission={notificationPermission}
            notificationsEnabled={notificationsEnabled}
            notificationButtonLabel={notificationButtonLabel}
            notificationHelpText={notificationHelpText}
            onCompanyChange={switchCompany}
            onConnect={openConnectModal}
            onDisconnect={disconnectMercadoLivre}
            onFetchRealQuestions={fetchMercadoLivreQuestions}
            onOpenHistoryImport={openHistoryImport}
            onSyncProducts={syncMercadoLivreProducts}
            onTestHealth={testIntegrationHealth}
            fetchingRealQuestions={fetchingMlQuestions}
            importingHistory={importingMlHistory}
            syncingProducts={syncingProducts}
            disconnecting={disconnectingMl}
            testingIntegrationId={testingIntegrationId}
            pendingIntegration={pendingIntegration}
            pendingHistoryImport={pendingHistoryImport}
            connectError={connectError}
            onCancelConnect={() => {
              setConnectError("");
              setPendingIntegration(null);
            }}
            onConfirmConnect={confirmConnect}
            onCancelHistoryImport={() => setPendingHistoryImport(null)}
            onConfirmHistoryImport={importMercadoLivreHistory}
          />
        ) : isSettings ? (
          <SettingsPage
            appData={appData}
            companies={companies}
            currentCompany={currentCompany}
            currentUser={currentUser}
            permissions={currentPermissions}
            isAuthenticated={Boolean(authSession)}
            onLogout={handleLogout}
            onEnableNotifications={handleNotificationToggle}
            notificationPermission={notificationPermission}
            notificationsEnabled={notificationsEnabled}
            notificationButtonLabel={notificationButtonLabel}
            notificationHelpText={notificationHelpText}
            onCompanyChange={switchCompany}
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
            companies={companies}
            currentCompany={currentCompany}
            currentUser={currentUser}
            permissions={currentPermissions}
            isAuthenticated={Boolean(authSession)}
            onLogout={handleLogout}
            onEnableNotifications={handleNotificationToggle}
            notificationPermission={notificationPermission}
            notificationsEnabled={notificationsEnabled}
            notificationButtonLabel={notificationButtonLabel}
            notificationHelpText={notificationHelpText}
            onCompanyChange={switchCompany}
          />
        ) : isCompaniesAdmin ? (
          <CompaniesAdminPage
            companies={companies}
            currentCompany={currentCompany}
            currentUser={currentUser}
            permissions={currentPermissions}
            onCompanyChange={switchCompany}
            isAuthenticated={Boolean(authSession)}
            onLogout={handleLogout}
            onEnableNotifications={handleNotificationToggle}
            notificationPermission={notificationPermission}
            notificationsEnabled={notificationsEnabled}
            notificationButtonLabel={notificationButtonLabel}
            notificationHelpText={notificationHelpText}
            onCompanyCreated={async (newCompanyId) => {
              await fetchCompanies();
              await switchCompany(newCompanyId);
            }}
          />
        ) : isUsersAdmin ? (
          <UsersAdminPage
            companies={companies}
            currentCompany={currentCompany}
            currentUser={currentUser}
            permissions={currentPermissions}
            onCompanyChange={switchCompany}
            isAuthenticated={Boolean(authSession)}
            onLogout={handleLogout}
            onEnableNotifications={handleNotificationToggle}
            notificationPermission={notificationPermission}
            notificationsEnabled={notificationsEnabled}
            notificationButtonLabel={notificationButtonLabel}
            notificationHelpText={notificationHelpText}
          />
        ) : (
          <>
            <section
              key={selectedCompanyId}
              className={`inbox-panel ${showConversation ? "hide-mobile" : ""}`}
            >
              <ScreenHeader
                title={active}
                companies={companies}
                currentCompany={currentCompany}
                currentUser={currentUser}
                permissions={currentPermissions}
                onCompanyChange={switchCompany}
                isAuthenticated={Boolean(authSession)}
                onLogout={handleLogout}
                onEnableNotifications={handleNotificationToggle}
                notificationPermission={notificationPermission}
                notificationsEnabled={notificationsEnabled}
                notificationButtonLabel={notificationButtonLabel}
                notificationHelpText={notificationHelpText}
              />

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
            {active === "Respondidas" ? (
              <label>
                Período
                <select
                  value={historyDays}
                  onChange={(event) => changeHistoryDays(event.target.value)}
                >
                  <option value={15}>Últimos 15 dias</option>
                  <option value={30}>Últimos 30 dias</option>
                </select>
              </label>
            ) : null}
          </div>

          <div className="question-list">
            {isQuestionsLoading ? (
              <div className="inbox-empty">
                <div className="empty-icon">
                  <RefreshCw size={30} className="spin" />
                </div>
                <h2>Carregando perguntas...</h2>
                <p>Buscando dados da empresa selecionada.</p>
              </div>
            ) : !isMercadoLivreConnected && !hasVisibleQuestions ? (
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
            ) : finalCards.length === 0 ? (
              <div className="inbox-empty">
                <div className="empty-icon">
                  <Inbox size={30} />
                </div>
                <h2>{emptyQuestionTitle}</h2>
                <p>{questionNotice || "Sincronize o Mercado Livre ou ajuste os filtros atuais."}</p>
              </div>
            ) : isPendingScreen ? (
              finalCards.map((question) => (
                <PendingQuestionCard
                  key={question.id}
                  question={question}
                  sourceLabel={getMarketplaceShortName(question.marketplace, integrations)}
                  sourceColor={getMarketplaceColor(question.marketplace, integrations)}
                  onApprove={approveQuestion}
                  onEdit={openEditorForQuestion}
                  onGenerate={generateSuggestion}
                  isApproving={sendingAnswerId === (getNewestPendingQuestion(question.questions || [question]) || question).id}
                  isGenerating={generatingQuestionId === (getNewestPendingQuestion(question.questions || [question]) || question).id}
                />
              ))
            ) : (
              finalCards.map((question) => (
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
            {!isQuestionsLoading && questionsPageInfo.has_more ? (
              <button className="load-more-button" onClick={loadMoreQuestions} disabled={isLoadingMoreQuestions}>
                <RefreshCw size={17} className={isLoadingMoreQuestions ? "spin" : ""} />
                {isLoadingMoreQuestions ? "Carregando..." : "Carregar mais"}
              </button>
            ) : null}
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
      <InstallAppHint />
    </div>
  );
}
