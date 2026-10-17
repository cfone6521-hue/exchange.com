import React, { useState, useEffect } from 'react';
import { useWallet } from '../wallet/WalletContext';
import { Fuel, RefreshCw, Zap, Clock, ShieldCheck, ArrowRight, ChevronRight, Check } from 'lucide-react';

export interface GasTierInfo {
  maxFeeGwei: number;
  priorityFeeGwei: number;
  estimatedWaitSec: number;
  estimatedNativeCost: string;
  estimatedUsdCost: number;
}

export interface GasNetworkTrackerData {
  chainId: number;
  name: string;
  shortName: string;
  currency: string;
  currencyPriceUsd: number;
  baseFeeGwei: number;
  congestion: 'low' | 'normal' | 'high';
  tiers: {
    low: GasTierInfo;
    medium: GasTierInfo;
    high: GasTierInfo;
  };
  lastUpdated: number;
}

interface GasTrackerProps {
  lang: 'pt' | 'en';
  onSelectNetwork?: (chainId: number) => void;
  compact?: boolean;
}

export const GasTracker: React.FC<GasTrackerProps> = ({ lang, onSelectNetwork, compact = false }) => {
  const { wallet, switchNetwork } = useWallet();
  const [gasData, setGasData] = useState<Record<number, GasNetworkTrackerData>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [selectedChainDetail, setSelectedChainDetail] = useState<number>(wallet.chainId || 1);

  const t = {
    pt: {
      title: 'Monitor de Gas & Base Fee On-Chain',
      subtitle: 'Acompanhamento em tempo real das taxas de gas e congestionamento em 7 redes EVM.',
      refresh: 'Atualizar',
      network: 'Rede',
      baseFee: 'Base Fee',
      congestion: 'Congestionamento',
      stdTransfer: 'Custo de Transferência (USD)',
      tiers: 'Prioridades de Execução',
      low: 'Low (Econômico)',
      medium: 'Medium (Padrão)',
      high: 'High (Rápido)',
      lowDesc: 'Ideal para transações sem urgência (~45s)',
      mediumDesc: 'Recomendado para inclusão no próximo bloco (~15s)',
      highDesc: 'Prioridade máxima no topo do bloco (~6s)',
      switchNet: 'Trocar para esta rede',
      activeNet: 'Rede Ativa na Carteira',
      lowCongestion: 'Baixo',
      normalCongestion: 'Normal',
      highCongestion: 'Elevado',
    },
    en: {
      title: 'On-Chain Gas & Base Fee Tracker',
      subtitle: 'Real-time tracking of base fee prices and congestion across 7 EVM networks.',
      refresh: 'Refresh',
      network: 'Network',
      baseFee: 'Base Fee',
      congestion: 'Congestion',
      stdTransfer: 'Standard Transfer Cost (USD)',
      tiers: 'Execution Priorities',
      low: 'Low (Economy)',
      medium: 'Medium (Standard)',
      high: 'High (Fast)',
      lowDesc: 'Ideal for non-urgent transactions (~45s)',
      mediumDesc: 'Recommended for next block inclusion (~15s)',
      highDesc: 'Highest priority at block top (~6s)',
      switchNet: 'Switch to this network',
      activeNet: 'Active Wallet Network',
      lowCongestion: 'Low',
      normalCongestion: 'Normal',
      highCongestion: 'High',
    },
  }[lang];

  const fetchGasData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/gas/tracker');
      const json = await res.json();
      if (json.success && json.networks) {
        setGasData(json.networks);
        setLastRefreshed(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.warn('Failed to fetch gas tracker:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGasData();
    const interval = setInterval(fetchGasData, 12000); // 12 seconds block sync
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (wallet.chainId && gasData[wallet.chainId]) {
      setSelectedChainDetail(wallet.chainId);
    }
  }, [wallet.chainId, gasData]);

  const activeChainData = gasData[selectedChainDetail] || gasData[1];

  if (compact) {
    // Compact widget strip for quick glancing
    const currentGas = wallet.chainId ? gasData[wallet.chainId] : gasData[1];
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-[#0c121e] px-3 py-1.5 text-xs">
        <Fuel className="h-4 w-4 text-cyan-400 shrink-0" />
        <span className="font-semibold text-slate-300">Gas:</span>
        {currentGas ? (
          <div className="flex items-center gap-2 font-mono tabular-nums">
            <span className="font-bold text-cyan-400">{currentGas.baseFeeGwei} Gwei</span>
            <span className="text-slate-500 text-[11px]">(~${currentGas.tiers.medium.estimatedUsdCost})</span>
          </div>
        ) : (
          <span className="text-slate-500 font-mono">--- Gwei</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Fuel className="h-4 w-4" />
            </div>
            <h2 className="font-['Outfit'] text-xl font-bold text-white">{t.title}</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs text-slate-500 font-mono">Sincronizado: {lastRefreshed}</span>
          )}
          <button
            onClick={fetchGasData}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-700 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{t.refresh}</span>
          </button>
        </div>
      </div>

      {/* Grid: 7 Networks cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.values(gasData).map((net) => {
          const isSelected = selectedChainDetail === net.chainId;
          const isCurrentWallet = wallet.chainId === net.chainId;

          return (
            <div
              key={net.chainId}
              onClick={() => setSelectedChainDetail(net.chainId)}
              className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                isSelected
                  ? 'border-cyan-500 bg-gradient-to-b from-[#0e1828] to-[#0a101d] shadow-lg shadow-cyan-950/30'
                  : 'border-slate-800 bg-[#0c121e] hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-white text-sm">{net.shortName}</div>
                {isCurrentWallet && (
                  <span className="rounded bg-cyan-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-300">
                    Ativa
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <div className="text-[11px] text-slate-500">Base Fee</div>
                  <div className="font-mono text-2xl font-bold text-cyan-400 tabular-nums">
                    {net.baseFeeGwei} <span className="text-xs text-slate-400 font-normal">Gwei</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-slate-500">Transf. 21k Gas</div>
                  <div className="font-mono text-sm font-semibold text-slate-200 tabular-nums">
                    ${net.tiers.medium.estimatedUsdCost.toFixed(4)}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-slate-800/60 text-xs">
                <span className="text-slate-500 text-[11px]">{t.congestion}:</span>
                <span
                  className={`font-mono text-[11px] font-semibold ${
                    net.congestion === 'low'
                      ? 'text-emerald-400'
                      : net.congestion === 'high'
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}
                >
                  {net.congestion === 'low'
                    ? t.lowCongestion
                    : net.congestion === 'high'
                    ? t.highCongestion
                    : t.normalCongestion}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Network Priority Tiers Detail Box */}
      {activeChainData && (
        <div className="rounded-2xl border border-slate-800 bg-[#0c121e] p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-['Outfit'] text-base font-bold text-white">
                  {activeChainData.name} — {t.tiers}
                </h3>
                <span className="text-xs font-mono text-slate-500">#{activeChainData.chainId}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Valores calculados em tempo real com base no bloco atual da rede.
              </p>
            </div>

            {wallet.chainId !== activeChainData.chainId && (
              <button
                onClick={() => switchNetwork(activeChainData.chainId)}
                className="flex items-center gap-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-4 py-2 text-xs font-semibold text-cyan-400 hover:bg-cyan-500/20 transition-colors whitespace-nowrap"
              >
                <span>{t.switchNet}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Low Priority */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 text-xs">{t.low}</span>
                <Clock className="h-4 w-4 text-slate-400" />
              </div>
              <div className="font-mono text-2xl font-bold text-slate-300 tabular-nums">
                {activeChainData.tiers.low.maxFeeGwei} <span className="text-xs font-normal text-slate-500">Gwei</span>
              </div>
              <p className="text-[11px] text-slate-400">{t.lowDesc}</p>
              <div className="pt-2 border-t border-slate-800 text-xs font-mono space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Custo Est.:</span>
                  <span className="text-slate-200">{activeChainData.tiers.low.estimatedNativeCost} {activeChainData.currency}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Valor USD:</span>
                  <span className="text-emerald-400 font-semibold">${activeChainData.tiers.low.estimatedUsdCost.toFixed(4)}</span>
                </div>
              </div>
            </div>

            {/* Medium Priority */}
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-400 text-xs">{t.medium}</span>
                <Zap className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="font-mono text-2xl font-bold text-cyan-400 tabular-nums">
                {activeChainData.tiers.medium.maxFeeGwei} <span className="text-xs font-normal text-slate-500">Gwei</span>
              </div>
              <p className="text-[11px] text-slate-400">{t.mediumDesc}</p>
              <div className="pt-2 border-t border-cyan-500/20 text-xs font-mono space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Custo Est.:</span>
                  <span className="text-slate-200">{activeChainData.tiers.medium.estimatedNativeCost} {activeChainData.currency}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Valor USD:</span>
                  <span className="text-cyan-400 font-semibold">${activeChainData.tiers.medium.estimatedUsdCost.toFixed(4)}</span>
                </div>
              </div>
            </div>

            {/* High Priority */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400 text-xs">{t.high}</span>
                <Zap className="h-4 w-4 text-amber-400" />
              </div>
              <div className="font-mono text-2xl font-bold text-amber-400 tabular-nums">
                {activeChainData.tiers.high.maxFeeGwei} <span className="text-xs font-normal text-slate-500">Gwei</span>
              </div>
              <p className="text-[11px] text-slate-400">{t.highDesc}</p>
              <div className="pt-2 border-t border-slate-800 text-xs font-mono space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Custo Est.:</span>
                  <span className="text-slate-200">{activeChainData.tiers.high.estimatedNativeCost} {activeChainData.currency}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Valor USD:</span>
                  <span className="text-amber-400 font-semibold">${activeChainData.tiers.high.estimatedUsdCost.toFixed(4)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
