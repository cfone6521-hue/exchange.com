import React, { useState, useEffect, useRef } from 'react';
import { MarketTicker, PriceAlert } from '../wallet/types';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Bell,
  BellRing,
  BellOff,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Volume2,
  VolumeX,
  X,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react';

interface MarketsViewProps {
  lang: 'pt' | 'en';
  onSelectPair?: (symbol: string) => void;
}

const STORAGE_KEY = 'rv_web3_price_alerts';

export const MarketsView: React.FC<MarketsViewProps> = ({ lang, onSelectPair }) => {
  const [tickers, setTickers] = useState<MarketTicker[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'markets' | 'alerts'>('markets');

  // Price Alerts State
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTickerForAlert, setSelectedTickerForAlert] = useState<MarketTicker | null>(null);
  const [targetPriceInput, setTargetPriceInput] = useState('');
  const [conditionInput, setConditionInput] = useState<'gte' | 'lte'>('gte');
  const [alertNoteInput, setAlertNoteInput] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Active Toast Notifications for triggered alerts
  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      alert: PriceAlert;
      currentPrice: number;
    }>
  >([]);

  // Tickers ref to prevent stale closures during evaluation
  const tickersRef = useRef<MarketTicker[]>([]);
  tickersRef.current = tickers;

  const t = {
    pt: {
      title: 'Mercados de Criptoativos',
      subtitle: 'Cotações em tempo real, livros consolidados e alertas de preço inteligentes.',
      tabMarkets: 'Todos os Mercados',
      tabAlerts: 'Alertas de Preço',
      searchPlaceholder: 'Buscar moeda ou par (ex: BTC, ETH)...',
      asset: 'Ativo',
      price: 'Último Preço',
      change24h: 'Variação 24h',
      high24h: 'Máxima 24h',
      low24h: 'Mínima 24h',
      volume24h: 'Volume (USDT)',
      action: 'Negociar',
      alerts: 'Alertas',
      createAlert: 'Criar Alerta',
      btnCreateAlert: '+ Novo Alerta',
      modalTitle: 'Configurar Alerta de Preço',
      modalSubtitle: 'Receba notificações instantâneas quando a cotação atingir seu objetivo.',
      selectAsset: 'Selecione o Ativo',
      currentPriceLabel: 'Preço Atual no Mercado',
      targetPriceLabel: 'Preço Alvo Desejado (USDT)',
      conditionLabel: 'Condição de Disparo',
      risesAbove: 'Atingir ou subir acima de (≥)',
      dropsBelow: 'Atingir ou cair abaixo de (≤)',
      noteLabel: 'Anotação pessoal (opcional)',
      notePlaceholder: 'Ex: Realizar 50% de lucro, Comprar no rompimento',
      soundNotice: 'Notificação sonora ativa',
      browserNotice: 'Permitir notificações do navegador',
      saveAlert: 'Ativar Alerta',
      cancel: 'Cancelar',
      noAlertsTitle: 'Nenhum Alerta Configurado',
      noAlertsSubtitle: 'Você ainda não possui alertas de preço. Monitore topos, fundos ou rompimentos.',
      btnCreateFirstAlert: 'Criar Primeiro Alerta',
      statusActive: 'Ativo',
      statusTriggered: 'Disparado',
      conditionGte: '≥ Maior ou Igual',
      conditionLte: '≤ Menor ou Igual',
      distance: 'Distância do Alvo',
      targetReached: 'Alvo Atingido!',
      testTrigger: 'Simular Disparo',
      testTriggerDesc: 'Testa a notificação visual e sonora instantaneamente',
      reactivate: 'Reativar',
      delete: 'Excluir',
      toastTitle: '🔔 Alerta de Preço Atingido!',
      toastDesc: 'atingiu o preço-alvo de',
      toastCurrent: 'Preço atual:',
      viewTrade: 'Ir para Terminal',
      dismiss: 'Dispensar',
      presets: 'Ajuste Rápido:',
      priceInvalid: 'Informe um preço-alvo válido maior que zero.',
      alertExistsNotice: 'Já existe um alerta ativo para este par',
      quickAlertTooltip: 'Definir alerta para este ativo',
    },
    en: {
      title: 'Crypto Asset Markets',
      subtitle: 'Real-time quotes, consolidated books and intelligent price alerts.',
      tabMarkets: 'All Markets',
      tabAlerts: 'Price Alerts',
      searchPlaceholder: 'Search coin or pair (e.g. BTC, ETH)...',
      asset: 'Asset',
      price: 'Last Price',
      change24h: '24h Change',
      high24h: '24h High',
      low24h: '24h Low',
      volume24h: 'Volume (USDT)',
      action: 'Trade',
      alerts: 'Alerts',
      createAlert: 'Create Alert',
      btnCreateAlert: '+ New Alert',
      modalTitle: 'Set Up Price Alert',
      modalSubtitle: 'Get notified immediately when the market price reaches your target.',
      selectAsset: 'Select Asset',
      currentPriceLabel: 'Current Market Price',
      targetPriceLabel: 'Target Price (USDT)',
      conditionLabel: 'Trigger Condition',
      risesAbove: 'Rises to or above (≥)',
      dropsBelow: 'Drops to or below (≤)',
      noteLabel: 'Personal note (optional)',
      notePlaceholder: 'e.g. Take 50% profit, Buy the breakout',
      soundNotice: 'Sound alert enabled',
      browserNotice: 'Enable browser desktop notifications',
      saveAlert: 'Set Alert',
      cancel: 'Cancel',
      noAlertsTitle: 'No Price Alerts Set',
      noAlertsSubtitle: 'You have no price alerts configured yet. Monitor highs, dips or key support levels.',
      btnCreateFirstAlert: 'Create First Alert',
      statusActive: 'Active',
      statusTriggered: 'Triggered',
      conditionGte: '≥ At or Above',
      conditionLte: '≤ At or Below',
      distance: 'Target Distance',
      targetReached: 'Target Reached!',
      testTrigger: 'Test Trigger',
      testTriggerDesc: 'Test sound and visual notification instantly',
      reactivate: 'Reactivate',
      delete: 'Delete',
      toastTitle: '🔔 Price Alert Triggered!',
      toastDesc: 'reached the target price of',
      toastCurrent: 'Current price:',
      viewTrade: 'Open Terminal',
      dismiss: 'Dismiss',
      presets: 'Quick Presets:',
      priceInvalid: 'Please enter a valid target price greater than zero.',
      alertExistsNotice: 'An active alert already exists for this pair',
      quickAlertTooltip: 'Set price alert for this asset',
    },
  }[lang];

  // Persist alerts to localStorage
  const saveAlerts = (newAlerts: PriceAlert[]) => {
    setAlerts(newAlerts);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAlerts));
    } catch {}
  };

  // Sound chime synthesizer via Web Audio API
  const playNotificationChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const now = ctx.currentTime;
      // Tone 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.2);

      // Tone 2: 880.00 Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.15);
      gain2.gain.setValueAtTime(0.18, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.45);
    } catch (e) {
      // Audio playback might be restricted if no user interaction yet
    }
  };

  // Trigger browser notification if allowed
  const sendBrowserNotification = (alert: PriceAlert, currentPrice: number) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`RV.Web3: ${alert.base} ${alert.condition === 'gte' ? '≥' : '≤'} $${alert.targetPrice.toLocaleString()}`, {
          body: `${alert.name} (${alert.base}) ${t.toastDesc} $${alert.targetPrice.toLocaleString()}. ${t.toastCurrent} $${currentPrice.toLocaleString()}`,
          icon: '/favicon.ico',
        });
      } catch {}
    }
  };

  // Trigger alert execution
  const executeAlertTrigger = (alert: PriceAlert, currentPrice: number) => {
    // 1. Play sound
    playNotificationChime();

    // 2. Browser push
    sendBrowserNotification(alert, currentPrice);

    // 3. Update alert record
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

    // 4. Show in-app Toast
    const toastId = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [
      {
        id: toastId,
        alert,
        currentPrice,
      },
      ...prev,
    ]);
  };

  // Evaluate alerts against fresh ticker prices
  const checkAlerts = (latestTickers: MarketTicker[]) => {
    setAlerts((currentAlerts) => {
      let hasChanges = false;
      const updatedAlerts = currentAlerts.map((alert) => {
        if (alert.status !== 'active') return alert;

        const ticker = latestTickers.find((t) => t.symbol === alert.symbol);
        if (!ticker) return alert;

        const currentPrice = ticker.price;
        const conditionMet =
          (alert.condition === 'gte' && currentPrice >= alert.targetPrice) ||
          (alert.condition === 'lte' && currentPrice <= alert.targetPrice);

        if (conditionMet) {
          hasChanges = true;
          // Trigger audio & toast
          playNotificationChime();
          sendBrowserNotification(alert, currentPrice);

          const toastId = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          setToasts((prev) => [
            {
              id: toastId,
              alert,
              currentPrice,
            },
            ...prev,
          ]);

          return {
            ...alert,
            status: 'triggered' as const,
            triggeredAt: Date.now(),
            triggeredPrice: currentPrice,
          };
        }

        return alert;
      });

      if (hasChanges) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedAlerts));
        } catch {}
      }

      return updatedAlerts;
    });
  };

  // Fetch tickers on mount and poll every 8 seconds
  useEffect(() => {
    let isMounted = true;

    const fetchTickers = () => {
      fetch('/api/market/tickers')
        .then((res) => res.json())
        .then((json) => {
          if (!isMounted) return;
          if (json.success && json.data) {
            setTickers(json.data);
            checkAlerts(json.data);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    };

    fetchTickers();
    const interval = setInterval(fetchTickers, 8000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Request browser notification permission if requested
  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  // Open modal with specific ticker
  const handleOpenModal = (ticker?: MarketTicker) => {
    const selected = ticker || tickers[0] || null;
    setSelectedTickerForAlert(selected);
    if (selected) {
      setTargetPriceInput(selected.price.toFixed(2));
      setConditionInput('gte');
    }
    setAlertNoteInput('');
    setIsModalOpen(true);
    requestNotificationPermission();
  };

  // Handle Quick Presets (+1%, +5%, +10%, -5%, -10%)
  const applyPreset = (percentage: number) => {
    if (!selectedTickerForAlert) return;
    const current = selectedTickerForAlert.price;
    const target = current * (1 + percentage / 100);
    setTargetPriceInput(target.toFixed(2));
    setConditionInput(percentage >= 0 ? 'gte' : 'lte');
  };

  // Save new alert
  const handleSaveAlert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTickerForAlert) return;

    const targetPrice = parseFloat(targetPriceInput);
    if (isNaN(targetPrice) || targetPrice <= 0) {
      alert(t.priceInvalid);
      return;
    }

    const newAlert: PriceAlert = {
      id: 'alert_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      symbol: selectedTickerForAlert.symbol,
      base: selectedTickerForAlert.base,
      name: selectedTickerForAlert.name,
      targetPrice,
      condition: conditionInput,
      initialPrice: selectedTickerForAlert.price,
      createdAt: Date.now(),
      status: 'active',
      note: alertNoteInput.trim() || undefined,
    };

    saveAlerts([newAlert, ...alerts]);
    setIsModalOpen(false);

    // If target is already reached right at creation, trigger immediately
    const conditionMet =
      (conditionInput === 'gte' && selectedTickerForAlert.price >= targetPrice) ||
      (conditionInput === 'lte' && selectedTickerForAlert.price <= targetPrice);

    if (conditionMet) {
      executeAlertTrigger(newAlert, selectedTickerForAlert.price);
    }
  };

  // Test trigger for demonstration & verification
  const handleTestTrigger = (alert: PriceAlert) => {
    const ticker = tickers.find((tk) => tk.symbol === alert.symbol);
    const mockPrice = alert.targetPrice;
    executeAlertTrigger(alert, ticker ? ticker.price : mockPrice);
  };

  // Reactivate triggered alert
  const handleReactivate = (id: string) => {
    const updated = alerts.map((a) => {
      if (a.id === id) {
        const ticker = tickers.find((t) => t.symbol === a.symbol);
        return {
          ...a,
          status: 'active' as const,
          triggeredAt: undefined,
          triggeredPrice: undefined,
          initialPrice: ticker ? ticker.price : a.initialPrice,
        };
      }
      return a;
    });
    saveAlerts(updated);
  };

  // Delete alert
  const handleDeleteAlert = (id: string) => {
    saveAlerts(alerts.filter((a) => a.id !== id));
  };

  // Filtered markets
  const filtered = tickers.filter(
    (item) =>
      item.symbol.toLowerCase().includes(search.toLowerCase()) ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.base.toLowerCase().includes(search.toLowerCase())
  );

  const activeAlertsCount = alerts.filter((a) => a.status === 'active').length;
  const triggeredAlertsCount = alerts.filter((a) => a.status === 'triggered').length;

  return (
    <div className="space-y-6">
      {/* Floating In-App Toast Notifications */}
      {toasts.length > 0 && (
        <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-auto">
          {toasts.map(({ id, alert, currentPrice }) => (
            <div
              key={id}
              className="animate-bounce-in rounded-2xl border border-cyan-500/50 bg-[#091122]/95 backdrop-blur-xl p-4 shadow-2xl shadow-cyan-500/20 text-white flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
                  <BellRing className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <div className="font-bold text-sm flex items-center gap-1.5 text-cyan-300">
                    <span>{t.toastTitle}</span>
                  </div>
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
                      <span className="block text-[11px] text-slate-400 italic mt-0.5">
                        "{alert.note}"
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (onSelectPair) onSelectPair(alert.symbol);
                        setToasts((prev) => prev.filter((t) => t.id !== id));
                      }}
                      className="rounded-lg bg-cyan-500 px-2.5 py-1 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition-colors flex items-center gap-1"
                    >
                      <span>{t.viewTrade}</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setToasts((prev) => prev.filter((t) => t.id !== id))}
                      className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      {t.dismiss}
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

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-['Outfit'] text-2xl font-bold text-white flex items-center gap-2">
            <span>{t.title}</span>
            {activeAlertsCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-mono font-medium border border-cyan-500/30">
                <Bell className="h-3 w-3" />
                {activeAlertsCount} {t.statusActive.toLowerCase()}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-sm shadow-cyan-500/20 hover:brightness-110 active:scale-[0.98] transition-all whitespace-nowrap"
          >
            <Bell className="h-4 w-4" />
            <span>{t.btnCreateAlert}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Markets vs Alerts) + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('markets')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'markets'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <span>{t.tabMarkets}</span>
            <span className="font-mono text-[11px] text-slate-400 bg-slate-900/80 px-1.5 py-0.2 rounded-md">
              {tickers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'alerts'
                ? 'bg-slate-800 text-cyan-400 shadow-sm border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            <span>{t.tabAlerts}</span>
            {alerts.length > 0 && (
              <span
                className={`font-mono text-[11px] px-1.5 py-0.2 rounded-md ${
                  triggeredAlertsCount > 0
                    ? 'bg-amber-500/20 text-amber-400 font-bold'
                    : 'bg-cyan-500/20 text-cyan-400'
                }`}
              >
                {alerts.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'markets' && (
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full sm:w-64 rounded-xl border border-slate-800 bg-slate-900/90 pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* VIEW 1: MARKETS TABLE */}
      {activeTab === 'markets' && (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0c121e]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400 font-semibold">
                  <th className="py-3.5 px-4">{t.asset}</th>
                  <th className="py-3.5 px-4 text-right">{t.price}</th>
                  <th className="py-3.5 px-4 text-right">{t.change24h}</th>
                  <th className="py-3.5 px-4 text-right hidden md:table-cell">{t.high24h}</th>
                  <th className="py-3.5 px-4 text-right hidden md:table-cell">{t.low24h}</th>
                  <th className="py-3.5 px-4 text-right">{t.volume24h}</th>
                  <th className="py-3.5 px-4 text-center">{t.alerts}</th>
                  <th className="py-3.5 px-4 text-right pr-6">{t.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-mono">
                {filtered.map((item) => {
                  const itemAlerts = alerts.filter((a) => a.symbol === item.symbol && a.status === 'active');
                  const hasActiveAlert = itemAlerts.length > 0;

                  return (
                    <tr key={item.symbol} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 font-sans">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 font-mono text-xs font-bold text-cyan-400">
                            {item.base.substring(0, 3)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-100 flex items-center gap-1.5">
                              <span>{item.name}</span>
                              <span className="font-mono text-xs text-slate-500">/{item.quote}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">{item.base}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-white tabular-nums">
                        ${item.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold tabular-nums">
                        <span
                          className={`inline-flex items-center gap-0.5 ${
                            item.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {item.change24h >= 0 ? '+' : ''}
                          {item.change24h.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 hidden md:table-cell tabular-nums">
                        ${item.high24h.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 hidden md:table-cell tabular-nums">
                        ${item.low24h.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-300 tabular-nums">
                        ${Math.round(item.volume24h).toLocaleString()}
                      </td>
                      {/* Alert button column */}
                      <td className="py-3 px-4 text-center font-sans">
                        <button
                          onClick={() => handleOpenModal(item)}
                          title={hasActiveAlert ? `${itemAlerts.length} ativo(s)` : t.quickAlertTooltip}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                            hasActiveAlert
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          <Bell className={`h-3.5 w-3.5 ${hasActiveAlert ? 'text-cyan-400 fill-cyan-400/20' : ''}`} />
                          {hasActiveAlert ? (
                            <span className="font-mono text-[11px] font-bold">{itemAlerts.length}</span>
                          ) : (
                            <span className="hidden sm:inline text-[11px]">+</span>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right pr-6 font-sans">
                        <button
                          onClick={() => onSelectPair && onSelectPair(item.symbol)}
                          className="rounded-lg bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                        >
                          {t.action}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: ALERTS MANAGER */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-[#0c121e] p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 mb-4">
                <BellRing className="h-7 w-7" />
              </div>
              <h3 className="font-['Outfit'] text-lg font-bold text-white">{t.noAlertsTitle}</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">{t.noAlertsSubtitle}</p>
              <button
                onClick={() => handleOpenModal()}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition-colors shadow-sm shadow-cyan-500/20"
              >
                <Plus className="h-4 w-4" />
                <span>{t.btnCreateFirstAlert}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alerts.map((alert) => {
                const liveTicker = tickers.find((tk) => tk.symbol === alert.symbol);
                const currentPrice = liveTicker ? liveTicker.price : alert.initialPrice;
                const isTriggered = alert.status === 'triggered';

                // Distance calculation
                const diff = alert.targetPrice - currentPrice;
                const distancePct = ((diff / currentPrice) * 100);

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
                      {/* Header: Asset & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 font-mono text-xs font-bold text-cyan-400">
                            {alert.base.substring(0, 3)}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white">{alert.name}</div>
                            <div className="font-mono text-xs text-slate-400">{alert.base}/USDT</div>
                          </div>
                        </div>

                        {isTriggered ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 border border-amber-500/30">
                            <CheckCircle2 className="h-3 w-3" />
                            {t.statusTriggered}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {t.statusActive}
                          </span>
                        )}
                      </div>

                      {/* Target Details */}
                      <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">{t.conditionLabel}:</span>
                          <span className="font-mono font-semibold text-white">
                            {alert.condition === 'gte' ? t.conditionGte : t.conditionLte}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-slate-400">{t.targetPriceLabel}:</span>
                          <span className="font-mono text-lg font-bold text-cyan-400">
                            ${alert.targetPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800 font-mono">
                          <span className="text-slate-500">{t.currentPriceLabel}:</span>
                          <span className="font-semibold text-slate-200">
                            ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Distance or Note */}
                      <div className="mt-3 text-xs">
                        {isTriggered ? (
                          <div className="text-[11px] text-amber-400/90 font-mono">
                            ✓ {t.targetReached} {alert.triggeredAt && `(${new Date(alert.triggeredAt).toLocaleTimeString()})`}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                            <span>{t.distance}:</span>
                            <span className={`font-semibold ${Math.abs(distancePct) < 2 ? 'text-amber-400' : 'text-slate-300'}`}>
                              {distancePct > 0 ? '+' : ''}{distancePct.toFixed(2)}%
                            </span>
                          </div>
                        )}

                        {alert.note && (
                          <div className="mt-2 text-[11px] text-slate-400 bg-slate-900/30 p-2 rounded-lg border border-slate-800/60 italic">
                            "{alert.note}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
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
                            onClick={() => handleTestTrigger(alert)}
                            title={t.testTriggerDesc}
                            className="rounded-lg bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-400 hover:bg-cyan-500/20 transition-colors flex items-center gap-1"
                          >
                            <Sparkles className="h-3 w-3" />
                            <span>{t.testTrigger}</span>
                          </button>
                        )}

                        <button
                          onClick={() => onSelectPair && onSelectPair(alert.symbol)}
                          className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:text-white transition-colors"
                        >
                          {t.action}
                        </button>
                      </div>

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
        </div>
      )}

      {/* MODAL: CREATE / CONFIGURE PRICE ALERT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0c121e] p-6 shadow-2xl my-8 text-slate-100">
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-['Outfit'] text-lg font-bold text-white">{t.modalTitle}</h3>
                <p className="text-xs text-slate-400">{t.modalSubtitle}</p>
              </div>
            </div>

            <form onSubmit={handleSaveAlert} className="space-y-4">
              {/* Asset Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.selectAsset}
                </label>
                <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 bg-slate-900/50 rounded-xl border border-slate-800">
                  {tickers.map((tk) => {
                    const isSelected = selectedTickerForAlert?.symbol === tk.symbol;
                    return (
                      <button
                        key={tk.symbol}
                        type="button"
                        onClick={() => {
                          setSelectedTickerForAlert(tk);
                          setTargetPriceInput(tk.price.toFixed(2));
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

              {/* Current Market Price Banner */}
              {selectedTickerForAlert && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-3 flex items-center justify-between text-xs">
                  <div className="text-slate-400">
                    <span>{t.currentPriceLabel} ({selectedTickerForAlert.base}):</span>
                  </div>
                  <div className="font-mono text-base font-bold text-white">
                    ${selectedTickerForAlert.price.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                  </div>
                </div>
              )}

              {/* Trigger Condition Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.conditionLabel}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConditionInput('gte')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border text-left ${
                      conditionInput === 'gte'
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
                    onClick={() => setConditionInput('lte')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border text-left ${
                      conditionInput === 'lte'
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

              {/* Target Price Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.targetPriceLabel}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-mono text-sm text-slate-500">$</span>
                  <input
                    type="number"
                    step="any"
                    value={targetPriceInput}
                    onChange={(e) => {
                      setTargetPriceInput(e.target.value);
                      const num = parseFloat(e.target.value);
                      if (selectedTickerForAlert && !isNaN(num)) {
                        setConditionInput(num >= selectedTickerForAlert.price ? 'gte' : 'lte');
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

              {/* Optional Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t.noteLabel}
                </label>
                <input
                  type="text"
                  value={alertNoteInput}
                  onChange={(e) => setAlertNoteInput(e.target.value)}
                  placeholder={t.notePlaceholder}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  maxLength={60}
                />
              </div>

              {/* Audio & Notification Toggles */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {soundEnabled ? (
                    <Volume2 className="h-4 w-4 text-cyan-400" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-slate-500" />
                  )}
                  <span className="text-slate-300">{t.soundNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !soundEnabled;
                    setSoundEnabled(next);
                    if (next) playNotificationChime();
                  }}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                    soundEnabled ? 'bg-cyan-500 justify-end' : 'bg-slate-800 justify-start'
                  }`}
                >
                  <span className="h-4 w-4 rounded-full bg-slate-950 shadow-sm" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-sm shadow-cyan-500/20 hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  {t.saveAlert}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
