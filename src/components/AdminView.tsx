import React, { useState, useEffect } from 'react';
import { useWallet } from '../wallet/WalletContext';
import {
  Activity,
  Server,
  Shield,
  ShieldAlert,
  Clock,
  RefreshCw,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';

interface AdminViewProps {
  lang: 'pt' | 'en';
  onOpenAuthModal: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ lang, onOpenAuthModal }) => {
  const { wallet, authSession, isAuthenticated, isAdmin } = useWallet();

  const [rpcStatus, setRpcStatus] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<string>('');

  const t = {
    pt: {
      title: 'Console de Monitoramento & Administração',
      subtitle: 'Disponibilidade de nós RPC blockchain, integridade operacional e auditoria de segurança.',
      rpcMonitor: 'Monitor de Nós RPC EVM (Tempo Real)',
      serverMetrics: 'Métricas do Servidor Backend',
      auditLogsTitle: 'Trilha de Auditoria & Segurança',
      refreshAll: 'Testar Conexões RPC Agora',
      adminStatus: 'Status de Acesso:',
      adminAuthNeeded: 'Autenticação de Administrador Necessária',
      adminAuthDesc: 'Para visualizar métricas internas e logs de auditoria, faça login assinando a mensagem com o endereço administrativo configurado.',
      btnAuth: 'Autenticar com Carteira',
      chainCol: 'Rede Blockchain',
      statusCol: 'Status',
      latencyCol: 'Latência (Ping)',
      blockCol: 'Altura do Bloco',
      rpcEndpointCol: 'Endpoint RPC',
      uptime: 'Tempo de Atividade (Uptime):',
      memoryUsed: 'Memória Utilizada (RSS):',
      nodeVersion: 'Versão do Node.js:',
      activeAdmin: 'Carteira Admin Configurada:',
      noLogs: 'Nenhum evento registrado.',
    },
    en: {
      title: 'Administration & Monitoring Console',
      subtitle: 'Blockchain RPC node availability, operational health and cryptographic security audits.',
      rpcMonitor: 'EVM RPC Node Health (Real-Time)',
      serverMetrics: 'Backend Server Metrics',
      auditLogsTitle: 'Security Audit Trail',
      refreshAll: 'Ping RPC Nodes Now',
      adminStatus: 'Access Status:',
      adminAuthNeeded: 'Admin Authentication Required',
      adminAuthDesc: 'To view internal server metrics and audit logs, authenticate with the configured admin wallet signature.',
      btnAuth: 'Authenticate with Wallet',
      chainCol: 'Blockchain Network',
      statusCol: 'Status',
      latencyCol: 'Latency (Ping)',
      blockCol: 'Block Height',
      rpcEndpointCol: 'RPC Endpoint',
      uptime: 'Uptime:',
      memoryUsed: 'Memory Footprint (RSS):',
      nodeVersion: 'Node.js Version:',
      activeAdmin: 'Configured Admin Wallet:',
      noLogs: 'No events logged.',
    },
  }[lang];

  // Fetch RPC health (public endpoint)
  const fetchRpcHealth = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/rpc-status');
      const data = await res.json();
      if (data.success && data.networks) {
        setRpcStatus(data.networks);
        setLastCheck(new Date().toLocaleTimeString());
      }
    } catch {}
    setIsLoading(false);
  };

  // Fetch protected admin data if authenticated as admin
  useEffect(() => {
    fetchRpcHealth();
    const timer = setInterval(fetchRpcHealth, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (authSession?.token && isAdmin) {
      // Metrics
      fetch('/api/admin/metrics', {
        headers: { Authorization: `Bearer ${authSession.token}` },
      })
        .then((res) => res.json())
        .then((json) => {
          if (json.success) setMetrics(json.server);
        })
        .catch(() => {});

      // Audit logs
      fetch('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${authSession.token}` },
      })
        .then((res) => res.json())
        .then((json) => {
          if (json.success) setAuditLogs(json.logs);
        })
        .catch(() => {});
    }
  }, [authSession, isAdmin]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-['Outfit'] text-xl font-bold text-white">{t.title}</h2>
          <p className="text-xs text-slate-400">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          {lastCheck && (
            <span className="text-xs text-slate-500 font-mono">Última checagem: {lastCheck}</span>
          )}
          <button
            onClick={fetchRpcHealth}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 px-3.5 py-2 text-xs font-semibold text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{t.refreshAll}</span>
          </button>
        </div>
      </div>

      {/* Admin Access Status Notice */}
      {!isAdmin && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-white text-xs">{t.adminAuthNeeded}</h4>
              <p className="text-xs text-amber-300/80 mt-0.5">{t.adminAuthDesc}</p>
            </div>
          </div>
          <button
            onClick={onOpenAuthModal}
            className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap"
          >
            {t.btnAuth}
          </button>
        </div>
      )}

      {/* RPC Nodes Health Table */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c121e] p-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            <h3 className="font-['Outfit'] text-sm font-bold text-white">{t.rpcMonitor}</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">7 Redes Monitoradas</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold font-sans">
                <th className="pb-3">{t.chainCol}</th>
                <th className="pb-3">{t.statusCol}</th>
                <th className="pb-3 text-right">{t.latencyCol}</th>
                <th className="pb-3 text-right">{t.blockCol}</th>
                <th className="pb-3 text-right pr-2">{t.rpcEndpointCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {rpcStatus.map((net) => {
                const isOnline = net.status === 'online';
                return (
                  <tr key={net.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="py-3 font-sans">
                      <div className="font-bold text-white">{net.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">Chain ID: {net.chainId}</div>
                    </td>
                    <td className="py-3 font-sans">
                      {isOnline ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                          Online
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-rose-400 text-xs font-medium">
                          <span className="h-2 w-2 rounded-full bg-rose-400" />
                          Degradado
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      <span className={net.latencyMs < 500 ? 'text-emerald-400' : 'text-amber-400'}>
                        {net.latencyMs} ms
                      </span>
                    </td>
                    <td className="py-3 text-right tabular-nums text-slate-200">
                      {net.blockNumber ? `#${net.blockNumber.toLocaleString()}` : '---'}
                    </td>
                    <td className="py-3 text-right pr-2 text-slate-400 text-[11px]">
                      {net.rpcUrl}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Protected Admin Content (Metrics & Logs) */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Server Metrics (1 col) */}
          <div className="rounded-2xl border border-slate-800 bg-[#0c121e] p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Server className="h-4 w-4 text-cyan-400" />
              <h3 className="font-['Outfit'] text-sm font-bold text-white">{t.serverMetrics}</h3>
            </div>

            {metrics ? (
              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-slate-400">{t.uptime}</div>
                  <div className="font-mono text-white text-base font-bold">
                    {Math.floor(metrics.uptimeSeconds / 3600)}h {Math.floor((metrics.uptimeSeconds % 3600) / 60)}m {metrics.uptimeSeconds % 60}s
                  </div>
                </div>

                <div>
                  <div className="text-slate-400">{t.memoryUsed}</div>
                  <div className="font-mono text-cyan-400 font-bold">{metrics.memory.rssMb} MB</div>
                </div>

                <div>
                  <div className="text-slate-400">{t.nodeVersion}</div>
                  <div className="font-mono text-slate-300">{metrics.nodeVersion} ({metrics.platform})</div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <div className="text-slate-400">{t.activeAdmin}</div>
                  <div className="font-mono text-[11px] text-slate-300 break-all">{metrics.configuredAdmin}</div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500">Carregando métricas...</div>
            )}
          </div>

          {/* Audit Logs (2 cols) */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-[#0c121e] p-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-3">
              <Shield className="h-4 w-4 text-cyan-400" />
              <h3 className="font-['Outfit'] text-sm font-bold text-white">{t.auditLogsTitle}</h3>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2">
              {auditLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">{t.noLogs}</div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-2.5 text-xs font-mono"
                  >
                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span className="font-bold text-cyan-400">{log.type}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="mt-1 text-slate-300">
                      Ator: <span className="text-slate-400">{log.actor}</span>
                    </div>
                    {Object.keys(log.metadata).length > 0 && (
                      <div className="mt-1 text-[11px] text-slate-500 break-all">
                        {JSON.stringify(log.metadata)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
