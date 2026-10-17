import React, { useState, useEffect, useRef } from 'react';
import { MarketTicker, PriceAlert } from '../wallet/types';
import {
  Bell,
  BellRing,
  BellOff,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Volume2,
  VolumeX,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Layers,
  Clock,
  Check,
  X,
  SlidersHorizontal,
} from 'lucide-react';

interface AlertsManagerViewProps {
  lang: 'pt' | 'en';
  onNavigateToTrade?: (symbol: string) => void;
}

const STORAGE_KEY = 'rv_web3_price_alerts';

export const AlertsManagerView: React.FC<AlertsManagerViewProps> = ({
  lang,
  onNavigateToTrade,
}) => {
  const [tickers, setTickers] = useState<MarketTicker[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'triggered'>('all');
  const [assetFilter, setAssetFilter] = useState<string>('all');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [modalSymbol, setModalSymbol] = useState<string>('ETHUSDT');
  const [modalTargetPrice, setModalTargetPrice] = useState<string>('');
  const [modalCondition, setModalCondition] = useState<'gte' | 'lte'>('gte');
  const [modalNote, setModalNote] = useState<string>('');

  // Active Toast notifications
  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      alert: PriceAlert;
      currentPrice: number;
    }>
  >([]);

  const t = {
    pt: {
      title: 'Gerenciador Central de Alertas',
      subtitle: 'Monitore, edite e gerencie alertas de cotação em tempo real para todos os seus ativos cripto.',
      btnNewAlert: '+ Criar Novo Alerta',
      totalAlerts: 'Total de Alertas',
      activeAlerts: 'Alertas Ativos',
      triggeredAlerts: 'Disparados',
      allAssets: 'Todos os Ativos',
      allStatus: 'Todos os Status',
      activeOnly: 'Apenas Ativos',
      triggeredOnly: 'Apenas Disparados',
      searchPlaceholder: 'Buscar por ativo ou anotação...',
      noAlertsTitle: 'Nenhum Alerta Configurado',
      noAlertsDesc: 'Crie alertas de preço para ser notificado com sinais sonoros e visuais quando ativos atingirem seus alvos.',
      btnCreateFirst: 'Criar Meu Primeiro Alerta',
      modalCreateTitle: 'Novo Alerta de Preço',
      modalEditTitle: 'Editar Alerta de Preço',
      modalSubtitle: 'Defina a cotação desejada e receba notificações automáticas.',
      selectAsset: 'Criptoativo',
      targetPrice: 'Preço-Alvo (USDT)',
      currentPrice: 'Preço Atual no Mercado',
      condition: 'Condição de Disparo',
      risesAbove: 'Atingir ou subir acima de (≥)',
      dropsBelow: 'Atingir ou cair abaixo de (≤)',
      noteLabel: 'Anotação (opcional)',
      notePlaceholder: 'Ex: Rompimento de resistência, realizar 50% de lucro',
      soundAlert: 'Sinal sonoro',
      browserAlert: 'Notificações push do navegador',
      btnSave: 'Salvar Alerta',
      btnCancel: 'Cancelar',
      edit: 'Editar',
      delete: 'Excluir',
      reactivate: 'Reativar',
      testTrigger: 'Simular Disparo',
      trade: 'Negociar',
      distance: 'Distância do Alvo',
      targetHit: 'Alvo Atingido!',
      createdAt: 'Criado em',
      triggeredAt: 'Disparado em',
      toastTitle: '🔔 Alerta de Preço Atingido!',
      toastDesc: 'atingiu o preço-alvo de',
      toastCurrent: 'Preço atual:',
      clearTriggered: 'Limpar Disparados',
      presets: 'Ajuste Rápido:',
      invalidPrice: 'Informe um preço válido maior que zero.',
      confirmClear: 'Deseja remover todos os alertas disparados?',
      confirmDelete: 'Deseja remover este alerta?',
    },
    en: {
      title: 'Central Alerts Management',
      subtitle: 'Track, edit, and manage real-time price alerts across all your cryptocurrency holdings.',
      btnNewAlert: '+ New Price Alert',
      totalAlerts: 'Total Alerts',
      activeAlerts: 'Active Alerts',
      triggeredAlerts: 'Triggered',
      allAssets: 'All Assets',
      allStatus: 'All Status',
      activeOnly: 'Active Only',
      triggeredOnly: 'Triggered Only',
      searchPlaceholder: 'Search by asset or note...',
      noAlertsTitle: 'No Price Alerts Configured',
      noAlertsDesc: 'Set up price targets to receive audio and visual notifications the moment markets reach your goal.',
      btnCreateFirst: 'Create My First Alert',
      modalCreateTitle: 'New Price Alert',
      modalEditTitle: 'Edit Price Alert',
      modalSubtitle: 'Specify target quotes and receive automatic browser notifications.',
      selectAsset: 'Cryptocurrency Asset',
      targetPrice: 'Target Price (USDT)',
      currentPrice: 'Current Market Price',
      condition: 'Trigger Condition',
      risesAbove: 'Rises to or above (≥)',
      dropsBelow: 'Drops to or below (≤)',
      noteLabel: 'Personal Note (optional)',
      notePlaceholder: 'e.g. Resistance breakout, take 50% profit',
      soundAlert: 'Sound chime',
      browserAlert: 'Browser desktop notifications',
      btnSave: 'Save Alert',
      btnCancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      reactivate: 'Reactivate',
      testTrigger: 'Test Trigger',
      trade: 'Trade',
      distance: 'Target Distance',
      targetHit: 'Target Reached!',
      createdAt: 'Created',
      triggeredAt: 'Triggered',
      toastTitle: '🔔 Price Alert Triggered!',
      toastDesc: 'reached the target price of',
      toastCurrent: 'Current price:',
      clearTriggered: 'Clear Triggered',
      presets: 'Quick Presets:',
      invalidPrice: 'Please specify a valid price above zero.',
      confirmClear: 'Remove all triggered alerts?',
      confirmDelete: 'Delete this price alert?',
    },
  }[lang];

  // Persist alerts to localStorage
  const saveAlerts = (newAlerts: PriceAlert[]) => {
    setAlerts(newAlerts);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAlerts));
    } catch {}
  };

  // Sound chime synthesizer using Web Audio API
  const playNotificationChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Note 1: 659.25 Hz (E5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.2);

      // Note 2: 880 Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0.16, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.45);
    } catch (e) {}
  };

  // Desktop browser push notification
  const sendBrowserNotification = (alert: PriceAlert, currentPrice: number) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`RV.Web3: ${alert.base} ${alert.condition === 'gte' ? '≥' : '≤'} $${alert.targetPrice.toLocaleString()}`, {
          body: `${alert.name} ${t.toastDesc} $${alert.targetPrice.toLocaleString()}. ${t.toastCurrent} $${currentPrice.toLocaleString()}`,
          icon: '/favicon.ico',
        });
      } catch {}
    }
  };

  // Execute trigger
  const triggerAlert = (alert: PriceAlert, currentPrice: number) => {
    playNotificationChime();
    sendBrowserNotification(alert, currentPrice);

    const updated = alerts.map((a) =>
      a.id === alert.id
        ? {
            ...a,
            status: 'triggered' as const,
            triggeredAt: Date.now(),
            triggeredPrice: currentPrice,
          }
        : a
    );
    saveAlerts(updated);

    const toastId = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [{ id: toastId, alert, currentPrice }, ...prev]);
  };

  // Check alerts against ticker prices
  const evaluateAlerts = (latestTickers: MarketTicker[]) => {
    setAlerts((currentAlerts) => {
      let changed = false;
      const updated = currentAlerts.map((alert) => {
        if (alert.status !== 'active') return alert;
        const ticker = latestTickers.find((t) => t.symbol === alert.symbol);
        if (!ticker) return alert;

        const conditionMet =
          (alert.condition === 'gte' && ticker.price >= alert.targetPrice) ||
          (alert.condition === 'lte' && ticker.price <= alert.targetPrice);

        if (conditionMet) {
          changed = true;
          playNotificationChime();
          sendBrowserNotification(alert, ticker.price);

          const toastId = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          setToasts((prev) => [{ id: toastId, alert, currentPrice: ticker.price }, ...prev]);

          return {
            ...alert,
            status: 'triggered' as const,
            triggeredAt: Date.now(),
            triggeredPrice: ticker.price,
          };
        }

        return alert;
      });

      if (changed) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {}
      }

      return updated;
    });
  };

  // Fetch real-time market tickers
  useEffect(() => {
    let isMounted = true;
    const fetchTickers = () => {
      fetch('/api/market/tickers')
        .then((res) => res.json())
        .then((json) => {
          if (!isMounted) return;
          if (json.success && json.data) {
            setTickers(json.data);
            evaluateAlerts(json.data);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    };

    fetchTickers();
    const interval = setInterval(fetchTickers, 7000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingAlertId(null);
    const defaultSymbol = tickers[0]?.symbol || 'ETHUSDT';
    setModalSymbol(defaultSymbol);
    const activeTicker = tickers.find((t) => t.symbol === defaultSymbol);
    if (activeTicker) {
      setModalTargetPrice(activeTicker.price.toFixed(2));
      setModalCondition('gte');
    } else {
      setModalTargetPrice('2650.00');
    }
    setModalNote('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (alert: PriceAlert) => {
    setEditingAlertId(alert.id);
    setModalSymbol(alert.symbol);
    setModalTargetPrice(alert.targetPrice.toString());
    setModalCondition(alert.condition);
    setModalNote(alert.note || '');
    setIsModalOpen(true);
  };

  // Apply quick presets (±1%, ±2%, ±5%, ±10%)
  const applyPreset = (percentage: number) => {
    const curTicker = tickers.find((t) => t.symbol === modalSymbol);
    if (!curTicker) return;
    const newTarget = curTicker.price * (1 + percentage / 100);
    setModalTargetPrice(newTarget.toFixed(2));
    setModalCondition(percentage >= 0 ? 'gte' : 'lte');
  };

  // Save (Create or Update) Alert
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(modalTargetPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert(t.invalidPrice);
      return;
    }

    const matchedTicker = tickers.find((t) => t.symbol === modalSymbol);
    const base = matchedTicker ? matchedTicker.base : modalSymbol.replace('USDT', '');
    const name = matchedTicker ? matchedTicker.name : base;
    const curPrice = matchedTicker ? matchedTicker.price : priceNum;

    if (editingAlertId) {
      // Edit existing alert
      const updated = alerts.map((a) =>
        a.id === editingAlertId
          ? {
              ...a,
              symbol: modalSymbol,
              base,
              name,
              targetPrice: priceNum,
              condition: modalCondition,
              note: modalNote.trim() || undefined,
              status: 'active' as const, // re-activate on edit
              triggeredAt: undefined,
              triggeredPrice: undefined,
            }
          : a
      );
      saveAlerts(updated);
    } else {
      // Create new alert
      const newAlert: PriceAlert = {
        id: 'alert_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        symbol: modalSymbol,
        base,
        name,
        targetPrice: priceNum,
        condition: modalCondition,
        initialPrice: curPrice,
        createdAt: Date.now(),
        status: 'active',
        note: modalNote.trim() || undefined,
      };

      const updatedList = [newAlert, ...alerts];
      saveAlerts(updatedList);

      // Check if target price is already met
      const conditionMet =
        (modalCondition === 'gte' && curPrice >= priceNum) ||
        (modalCondition === 'lte' && curPrice <= priceNum);

      if (conditionMet) {
        triggerAlert(newAlert, curPrice);
      }
    }

    setIsModalOpen(false);
  };

  // Delete Alert
  const handleDeleteAlert = (id: string) => {
    saveAlerts(alerts.filter((a) => a.id !== id));
  };

  // Clear all triggered alerts
  const handleClearTriggered = () => {
    saveAlerts(alerts.filter((a) => a.status !== 'triggered'));
  };

  // Reactivate triggered alert
  const handleReactivate = (id: string) => {
    const updated = alerts.map((a) => {
      if (a.id === id) {
        const curTicker = tickers.find((t) => t.symbol === a.symbol);
        return {
          ...a,
          status: 'active' as const,
          triggeredAt: undefined,
          triggeredPrice: undefined,
          initialPrice: curTicker ? curTicker.price : a.initialPrice,
        };
      }
      return a;
    });
    saveAlerts(updated);
  };

  // Filter alerts
  const filteredAlerts = alerts.filter((alert) => {
    // Status filter
    if (statusFilter === 'active' && alert.status !== 'active') return false;
    if (statusFilter === 'triggered' && alert.status !== 'triggered') return false;

    // Asset filter
    if (assetFilter !== 'all' && alert.symbol !== assetFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSymbol = alert.symbol.toLowerCase().includes(q);
      const matchBase = alert.base.toLowerCase().includes(q);
      const matchName = alert.name.toLowerCase().includes(q);
      const matchNote = alert.note ? alert.note.toLowerCase().includes(q) : false;
      if (!matchSymbol && !matchBase && !matchName && !matchNote) return false;
    }

    return true;
  });

  const activeCount = alerts.filter((a) => a.status === 'active').length;
  const triggeredCount = alerts.filter((a) => a.status === 'triggered').length;

  // Unique symbols present in alerts for quick filter
  const alertSymbols = Array.from(new Set(alerts.map((a) => a.symbol)));

  return (
    <div className="space-y-6">
      {/* Floating In-App Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-auto">
          {toasts.map(({ id, alert, currentPrice }) => (
            <div
              key={id}
              className="rounded-2xl border border-cyan-500/50 bg-[#091122]/95 backdrop-blur-xl p-4 shadow-2xl shadow-cyan-500/20 text-white flex items-start justify-between gap-3 animate-bounce-in"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
                  <BellRing className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <div className="font-bold text-sm text-cyan-300">{t.toastTitle}</div>
                  <div className="text-xs text-slate-200 mt-1">
                    <span className="font-bold text-white">{alert.name} ({alert.base})</span>{' '}
                    {t.toastDesc}{' '}
                    <span className="font-mono font-bold text-cyan-400">
                      ${alert.targetPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {t.toastCurrent}{' '}
                    <span className="font-semibold text-emerald-400">
                      ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    {alert.note && (
                      <span className="block text-[11px] text-slate-400 italic mt-0.5">"{alert.note}"</span>
                    )}
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    {onNavigateToTrade && (
                      <button
                        onClick={() => {
                          onNavigateToTrade(alert.symbol);
                          setToasts((prev) => prev.filter((t) => t.id !== id));
                        }}
                        className="rounded-lg bg-cyan-500 px-2.5 py-1 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition-colors flex items-center gap-1"
                      >
                        <span>{t.trade}</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      onClick={() => setToasts((prev) => prev.filter((t) => t.id !== id))}
                      className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== id))}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Top Banner / Hero Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-[#0c1424] via-[#0a0f1d] to-[#070b14] p-6 lg:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-cyan-400">
              <BellRing className="h-4 w-4" />
              <span className="uppercase tracking-wider font-semibold">Web3 Market Watcher</span>
            </div>
            <h2 className="mt-1 font-['Outfit'] text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {t.title}
            </h2>
            <p className="mt-1 text-xs text-slate-400 max-w-xl">{t.subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Audio Toggle */}
            <button
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) playNotificationChime();
              }}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-all ${
                soundEnabled
                  ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400'
                  : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white'
              }`}
              title={soundEnabled ? 'Sinal sonoro ativo' : 'Sinal sonoro mudo'}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              <span className="hidden sm:inline">{soundEnabled ? t.soundAlert : 'Mudo'}</span>
            </button>

            {/* Create Alert Button */}
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-sm shadow-cyan-500/20 hover:brightness-110 active:scale-[0.98] transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>{t.btnNewAlert}</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3">
            <div className="text-[11px] text-slate-400">{t.totalAlerts}</div>
            <div className="mt-1 font-mono text-xl font-bold text-white">{alerts.length}</div>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="text-[11px] text-emerald-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{t.activeAlerts}</span>
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-emerald-400">{activeCount}</div>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="text-[11px] text-amber-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3" />
              <span>{t.triggeredAlerts}</span>
            </div>
            <div className="mt-1 font-mono text-xl font-bold text-amber-400">{triggeredCount}</div>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-3">
            <div className="text-[11px] text-slate-400">Ativos Monitorados</div>
            <div className="mt-1 font-mono text-xl font-bold text-cyan-400">
              {alertSymbols.length} / {tickers.length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status and Asset Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.allStatus} ({alerts.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'active'
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>{t.activeOnly} ({activeCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('triggered')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === 'triggered'
                  ? 'bg-amber-500/20 text-amber-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>{t.triggeredOnly} ({triggeredCount})</span>
            </button>
          </div>

          {/* Asset Dropdown Filter */}
          {alertSymbols.length > 0 && (
            <select
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-mono text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">{t.allAssets}</option>
              {alertSymbols.map((sym) => (
                <option key={sym} value={sym}>
                  {sym}
                </option>
              ))}
            </select>
          )}

          {/* Clear Triggered Button */}
          {triggeredCount > 0 && (
            <button
              onClick={handleClearTriggered}
              className="rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
            >
              {t.clearTriggered}
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full md:w-64 rounded-xl border border-slate-800 bg-slate-900/90 pl-8 pr-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Alerts Grid */}
      {filteredAlerts.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#0c121e] p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 mb-4">
            <BellRing className="h-7 w-7" />
          </div>
          <h3 className="font-['Outfit'] text-lg font-bold text-white">{t.noAlertsTitle}</h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">{t.noAlertsDesc}</p>
          <button
            onClick={handleOpenCreate}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition-colors shadow-sm shadow-cyan-500/20"
          >
            <Plus className="h-4 w-4" />
            <span>{t.btnCreateFirst}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAlerts.map((alert) => {
            const liveTicker = tickers.find((t) => t.symbol === alert.symbol);
            const currentPrice = liveTicker ? liveTicker.price : alert.initialPrice;
            const isTriggered = alert.status === 'triggered';

            // Distance calculation
            const diff = alert.targetPrice - currentPrice;
            const distancePct = (diff / currentPrice) * 100;
            const absDistancePct = Math.abs(distancePct);

            return (
              <div
                key={alert.id}
                className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                  isTriggered
                    ? 'border-amber-500/40 bg-amber-500/5 shadow-lg shadow-amber-500/5'
                    : 'border-slate-800 bg-[#0c121e] hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Card Header: Asset Info & Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 font-mono text-xs font-bold text-cyan-400 shadow-inner">
                        {alert.base.substring(0, 3)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-1.5">
                          <span>{alert.name}</span>
                          <span className="font-mono text-xs text-slate-500">/{alert.symbol.replace(alert.base, '')}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{alert.symbol}</div>
                      </div>
                    </div>

                    {/* Status badge */}
                    {isTriggered ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 border border-amber-500/30">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{t.triggeredAlerts}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>{t.activeAlerts}</span>
                      </span>
                    )}
                  </div>

                  {/* Target & Price Box */}
                  <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3.5 space-y-2.5">
                    {/* Condition Pill & Label */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{t.condition}:</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-semibold ${
                          alert.condition === 'gte'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {alert.condition === 'gte' ? (
                          <>
                            <TrendingUp className="h-3 w-3" />
                            <span>≥ {alert.base} sobe</span>
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-3 w-3" />
                            <span>≤ {alert.base} cai</span>
                          </>
                        )}
                      </span>
                    </div>

                    {/* Target Price */}
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-400">{t.targetPrice}:</span>
                      <span className="font-mono text-xl font-bold text-cyan-400">
                        ${alert.targetPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Live Market Price */}
                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800 font-mono">
                      <span className="text-slate-500">{t.currentPrice}:</span>
                      <span className="font-semibold text-slate-200">
                        ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Distance Meter or Trigger Notice */}
                  <div className="mt-3 text-xs">
                    {isTriggered ? (
                      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-[11px] text-amber-300 font-mono flex items-center justify-between">
                        <span>✓ {t.targetHit}</span>
                        <span>
                          {alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleTimeString() : ''}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span>{t.distance}:</span>
                          <span
                            className={`font-semibold ${
                              absDistancePct < 2 ? 'text-amber-400' : 'text-slate-300'
                            }`}
                          >
                            {distancePct > 0 ? '+' : ''}{distancePct.toFixed(2)}%
                          </span>
                        </div>
                        {/* Visual Progress Bar */}
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full transition-all duration-500 ${
                              absDistancePct < 2 ? 'bg-amber-400' : 'bg-cyan-500'
                            }`}
                            style={{
                              width: `${Math.max(5, Math.min(100, 100 - absDistancePct))}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Note if any */}
                    {alert.note && (
                      <div className="mt-2 text-[11px] text-slate-400 bg-slate-900/40 p-2 rounded-lg border border-slate-800/60 italic">
                        "{alert.note}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {isTriggered ? (
                      <button
                        onClick={() => handleReactivate(alert.id)}
                        className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                      >
                        {t.reactivate}
                      </button>
                    ) : (
                      <button
                        onClick={() => triggerAlert(alert, alert.targetPrice)}
                        title="Simular disparo imediato"
                        className="rounded-lg bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-400 hover:bg-cyan-500/20 transition-colors flex items-center gap-1"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>{t.testTrigger}</span>
                      </button>
                    )}

                    {/* Edit button */}
                    <button
                      onClick={() => handleOpenEdit(alert)}
                      className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>{t.edit}</span>
                    </button>

                    {/* Trade button */}
                    {onNavigateToTrade && (
                      <button
                        onClick={() => onNavigateToTrade(alert.symbol)}
                        className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:text-white transition-colors"
                      >
                        {t.trade}
                      </button>
                    )}
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="rounded-lg p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title={t.delete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT ALERT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0c121e] p-6 shadow-2xl my-8 text-slate-100">
            {/* Close button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Title */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                {editingAlertId ? <Edit3 className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="font-['Outfit'] text-lg font-bold text-white">
                  {editingAlertId ? t.modalEditTitle : t.modalCreateTitle}
                </h3>
                <p className="text-xs text-slate-400">{t.modalSubtitle}</p>
              </div>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              {/* Asset Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.selectAsset}
                </label>
                <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-900/50 rounded-xl border border-slate-800">
                  {tickers.map((tk) => {
                    const isSelected = modalSymbol === tk.symbol;
                    return (
                      <button
                        key={tk.symbol}
                        type="button"
                        onClick={() => {
                          setModalSymbol(tk.symbol);
                          if (!editingAlertId) {
                            setModalTargetPrice(tk.price.toFixed(2));
                          }
                        }}
                        className={`p-2 rounded-lg text-left text-xs transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-cyan-500/20 text-white border border-cyan-500/60 shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
                        }`}
                      >
                        <span className="font-bold">{tk.base}</span>
                        <span className="font-mono text-[11px] text-slate-300">
                          ${tk.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current Price Reference */}
              {(() => {
                const cur = tickers.find((t) => t.symbol === modalSymbol);
                return cur ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      {t.currentPrice} ({cur.base}):
                    </span>
                    <span className="font-mono text-base font-bold text-white">
                      ${cur.price.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                    </span>
                  </div>
                ) : null;
              })()}

              {/* Condition Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.condition}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalCondition('gte')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border text-left ${
                      modalCondition === 'gte'
                        ? 'bg-emerald-500/10 border-emerald-500/60 text-emerald-400 shadow-sm'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4" />
                      <span>{t.risesAbove}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalCondition('lte')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border text-left ${
                      modalCondition === 'lte'
                        ? 'bg-rose-500/10 border-rose-500/60 text-rose-400 shadow-sm'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <TrendingDown className="h-4 w-4" />
                      <span>{t.dropsBelow}</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Target Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.targetPrice}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-mono text-sm text-slate-500">$</span>
                  <input
                    type="number"
                    step="any"
                    value={modalTargetPrice}
                    onChange={(e) => {
                      setModalTargetPrice(e.target.value);
                      const num = parseFloat(e.target.value);
                      const cur = tickers.find((t) => t.symbol === modalSymbol);
                      if (cur && !isNaN(num)) {
                        setModalCondition(num >= cur.price ? 'gte' : 'lte');
                      }
                    }}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-8 pr-4 py-2.5 font-mono text-sm text-white focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Quick Presets */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-slate-500 mr-1">{t.presets}</span>
                  {[-10, -5, -2, 2, 5, 10].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => applyPreset(pct)}
                      className="rounded-lg bg-slate-800/80 px-2 py-0.5 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors font-mono"
                    >
                      {pct > 0 ? `+${pct}%` : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.noteLabel}
                </label>
                <input
                  type="text"
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                  placeholder={t.notePlaceholder}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  maxLength={60}
                />
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-sm shadow-cyan-500/20 hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  {t.btnSave}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
