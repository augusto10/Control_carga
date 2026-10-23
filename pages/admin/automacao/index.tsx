import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bot,
  Plus,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Server,
  ClipboardList,
  Loader2,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import AdminRoute from '@/components/admin/AdminRoute';
import { cn } from '@/utils/cn';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

type JobStatus = 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

interface Agent {
  id: string;
  agentCode: string;
  name: string;
  isEnabled: boolean;
  lastHeartbeatAt: string | null;
  createdAt: string;
  _count?: { jobs: number };
}

interface Job {
  id: string;
  type: string;
  status: JobStatus;
  payload: unknown;
  result: unknown;
  errorMessage: string | null;
  attempts: number;
  createdAt: string;
  startedAt: string | null;
  lastHeartbeatAt: string | null;
  finishedAt: string | null;
  agent: { id: string; agentCode: string; name: string } | null;
}

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

const JOB_STATUS_META: Record<JobStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  QUEUED: { label: 'Na fila', variant: 'warning' },
  RUNNING: { label: 'Executando', variant: 'info' },
  SUCCESS: { label: 'Sucesso', variant: 'success' },
  FAILED: { label: 'Falhou', variant: 'danger' },
  CANCELLED: { label: 'Cancelado', variant: 'neutral' },
};

const STATUS_FILTER_OPTIONS: Array<{ value: '' | JobStatus; label: string }> = [
  { value: '', label: 'Todos os status' },
  { value: 'QUEUED', label: 'Na fila' },
  { value: 'RUNNING', label: 'Executando' },
  { value: 'SUCCESS', label: 'Sucesso' },
  { value: 'FAILED', label: 'Falhou' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('pt-BR') : '—';

const isAgentOnline = (agent: Agent) =>
  agent.isEnabled &&
  !!agent.lastHeartbeatAt &&
  Date.now() - new Date(agent.lastHeartbeatAt).getTime() < ONLINE_THRESHOLD_MS;

// ============================== Aba Agents ==============================

function AgentsTab() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ agentCode: '', name: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/automacao/agents', { credentials: 'include' });
      if (!res.ok) throw new Error(`Falha ao carregar agents (${res.status})`);
      setAgents(await res.json());
    } catch (e) {
      setError('Não foi possível carregar os agents.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
    const interval = setInterval(loadAgents, 60_000);
    return () => clearInterval(interval);
  }, [loadAgents]);

  const closeModal = () => {
    setModalOpen(false);
    setForm({ agentCode: '', name: '' });
    setFormError(null);
    setCreatedToken(null);
    setCopied(false);
  };

  const handleCreate = async () => {
    if (!form.agentCode.trim() || !form.name.trim()) {
      setFormError('Preencha agentCode e nome.');
      return;
    }
    try {
      setSaving(true);
      setFormError(null);
      const res = await fetch('/api/admin/automacao/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ agentCode: form.agentCode.trim(), name: form.name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Erro ao criar agent');
      setCreatedToken(data.token);
      loadAgents();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Erro ao criar agent');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyToken = async () => {
    if (!createdToken) return;
    await navigator.clipboard.writeText(createdToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggle = async (agent: Agent) => {
    try {
      setTogglingId(agent.id);
      const res = await fetch(`/api/admin/automacao/agents/${agent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isEnabled: !agent.isEnabled }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar');
      setAgents((prev) =>
        prev.map((a) => (a.id === agent.id ? { ...a, isEnabled: !a.isEnabled } : a))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg text-white">
            <Server size={18} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Agents registrados</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadAgents} disabled={loading} className="bg-white">
            <RefreshCw size={14} className={cn('mr-2', loading && 'animate-spin')} />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={14} className="mr-2" />
            Novo Agent
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden" noPadding>
        {loading && agents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw size={28} className="text-primary animate-spin mx-auto" />
            <p className="text-slate-500 font-medium">Carregando agents...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle size={28} className="text-rose-500 mx-auto" />
            <p className="text-slate-500 font-medium">{error}</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <Bot size={56} className="mx-auto text-slate-200" />
            <p className="text-slate-400 font-medium">Nenhum agent cadastrado</p>
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <Plus size={14} className="mr-2" />
              Cadastrar primeiro agent
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3">Agent</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Último heartbeat</th>
                  <th className="px-6 py-3 text-center">Jobs</th>
                  <th className="px-6 py-3">Criado em</th>
                  <th className="px-6 py-3 text-right">Habilitado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {agents.map((agent) => {
                  const online = isAgentOnline(agent);
                  return (
                    <tr key={agent.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <Bot size={16} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{agent.agentCode}</p>
                            <p className="text-xs text-slate-400">{agent.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {!agent.isEnabled ? (
                          <Badge variant="neutral">Desabilitado</Badge>
                        ) : online ? (
                          <Badge variant="success">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                            Online
                          </Badge>
                        ) : (
                          <Badge variant="neutral">Offline</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={12} />
                          {formatDateTime(agent.lastHeartbeatAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-slate-700">
                        {agent._count?.jobs ?? 0}
                      </td>
                      <td className="px-6 py-4 text-slate-500">{formatDateTime(agent.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggle(agent)}
                          disabled={togglingId === agent.id}
                          className={cn(
                            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50',
                            agent.isEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                          )}
                          title={agent.isEnabled ? 'Desabilitar agent' : 'Habilitar agent'}
                        >
                          <span
                            className={cn(
                              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow',
                              agent.isEnabled ? 'translate-x-6' : 'translate-x-1'
                            )}
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={createdToken ? 'Agent criado' : 'Novo Agent'}
        footer={
          createdToken ? (
            <Button onClick={closeModal}>Concluir</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={closeModal}>Cancelar</Button>
              <Button onClick={handleCreate} loading={saving}>Criar Agent</Button>
            </>
          )
        }
      >
        {createdToken ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <p className="text-sm font-semibold text-emerald-800 mb-2">
                Token de autenticação gerado
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-white border border-emerald-200 rounded-lg px-3 py-2 break-all text-slate-700">
                  {createdToken}
                </code>
                <Button variant="outline" size="icon" onClick={handleCopyToken} className="shrink-0 bg-white">
                  {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                </Button>
              </div>
            </div>
            <div className="flex gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                <strong>Copie agora.</strong> Este token é exibido apenas uma vez — o sistema armazena
                somente o hash. Configure-o no Agent Windows junto ao agentCode.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Código do agent</label>
              <Input
                value={form.agentCode}
                onChange={(e) => setForm((f) => ({ ...f, agentCode: e.target.value }))}
                placeholder="ERP_AGENT_01"
              />
              <p className="text-xs text-slate-400">Identificador único da instalação</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Nome descritivo</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Computador do expedição"
              />
            </div>
            {formError && (
              <div className="flex gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-700">{formError}</p>
              </div>
            )}
            <p className="text-xs text-slate-400">
              Um token de autenticação será gerado automaticamente e exibido uma única vez após a criação.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============================== Aba Jobs ==============================

function JobsTab() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'' | JobStatus>('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const nextCursorRef = useRef<string | null>(null);
  const loadingMoreRef = useRef(false);

  const fetchJobs = useCallback(
    async (cursor: string | null, status: '' | JobStatus) => {
      const params = new URLSearchParams();
      if (cursor) params.set('cursor', cursor);
      if (status) params.set('status', status);
      const res = await fetch(`/api/admin/automacao/jobs?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Falha ao carregar jobs (${res.status})`);
      return (await res.json()) as { jobs: Job[]; nextCursor: string | null };
    },
    []
  );

  const loadInitial = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJobs(null, statusFilter);
      setJobs(data.jobs);
      setNextCursor(data.nextCursor);
      nextCursorRef.current = data.nextCursor;
    } catch (e) {
      setError('Não foi possível carregar os jobs.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [fetchJobs, statusFilter]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !nextCursorRef.current) return;
    try {
      loadingMoreRef.current = true;
      setLoadingMore(true);
      const data = await fetchJobs(nextCursorRef.current, statusFilter);
      setJobs((prev) => [...prev, ...data.jobs]);
      setNextCursor(data.nextCursor);
      nextCursorRef.current = data.nextCursor;
    } catch (e) {
      console.error(e);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [fetchJobs, statusFilter]);

  useEffect(() => {
    nextCursorRef.current = null;
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <ClipboardList size={18} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Jobs de automação</h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as '' | JobStatus)}
            className="h-8 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={loadInitial} disabled={loading} className="bg-white">
            <RefreshCw size={14} className={cn('mr-2', loading && 'animate-spin')} />
            Atualizar
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden" noPadding>
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw size={28} className="text-primary animate-spin mx-auto" />
            <p className="text-slate-500 font-medium">Carregando jobs...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle size={28} className="text-rose-500 mx-auto" />
            <p className="text-slate-500 font-medium">{error}</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <ClipboardList size={56} className="mx-auto text-slate-200" />
            <p className="text-slate-400 font-medium">
              {statusFilter ? 'Nenhum job com esse status' : 'Nenhum job registrado'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-3">Tipo</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Agent</th>
                    <th className="px-6 py-3 text-center">Tentativas</th>
                    <th className="px-6 py-3">Criado em</th>
                    <th className="px-6 py-3">Finalizado em</th>
                    <th className="px-6 py-3">Erro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {jobs.map((job) => {
                    const meta = JOB_STATUS_META[job.status] ?? JOB_STATUS_META.QUEUED;
                    return (
                      <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <code className="text-xs font-mono font-semibold text-slate-700 bg-slate-50 border border-slate-100 rounded-md px-2 py-1">
                            {job.type}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={meta.variant}>
                            {job.status === 'RUNNING' && (
                              <Loader2 size={11} className="mr-1 animate-spin" />
                            )}
                            {meta.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {job.agent ? job.agent.agentCode : '—'}
                        </td>
                        <td className="px-6 py-4 text-center font-semibold text-slate-700">
                          {job.attempts}
                        </td>
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                          {formatDateTime(job.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                          {formatDateTime(job.finishedAt)}
                        </td>
                        <td className="px-6 py-4">
                          {job.errorMessage ? (
                            <span
                              className="text-xs text-rose-600 line-clamp-2 max-w-[220px] inline-block"
                              title={job.errorMessage}
                            >
                              {job.errorMessage}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Sentinela do scroll infinito */}
            <div ref={sentinelRef} className="p-4 flex justify-center">
              {loadingMore ? (
                <span className="inline-flex items-center gap-2 text-xs text-slate-400 font-medium">
                  <Loader2 size={14} className="animate-spin" />
                  Carregando mais jobs...
                </span>
              ) : nextCursor ? (
                <span className="text-xs text-slate-300">Role para carregar mais</span>
              ) : (
                <span className="text-xs text-slate-300">Fim dos resultados</span>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// ============================== Página ==============================

type TabKey = 'agents' | 'jobs';

function AutomacaoContent() {
  const [tab, setTab] = useState<TabKey>('agents');

  return (
    <AppLayout title="Automação" subtitle="Agents Windows e jobs de execução no ERP">
      <div className="space-y-6 max-w-[1600px] mx-auto">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          {(
            [
              { key: 'agents', label: 'Agents', icon: Bot },
              { key: 'jobs', label: 'Jobs', icon: ClipboardList },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
                tab === key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {tab === 'agents' ? <AgentsTab /> : <JobsTab />}
      </div>
    </AppLayout>
  );
}

export default function AutomacaoAdminPage() {
  return (
    <AdminRoute>
      <AutomacaoContent />
    </AdminRoute>
  );
}

(AutomacaoAdminPage as any).usesAppLayout = true;
