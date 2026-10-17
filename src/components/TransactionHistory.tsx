import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../wallet/WalletContext';
import { NETWORKS } from '../config/networks';
import { RecordedTransaction } from '../wallet/types';
import {
  Send,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ExternalLink,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Copy,
  Check,
  Clock,
  ChevronDown,
  Layers,
  Fuel,
  Info,
  X,
} from 'lucide-react';

interface TransactionHistoryProps {
  lang: 'pt' | 'en';
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ lang }) => {
  const { wallet, currentNetwork } = useWallet();

  const [transactions, setTransactions] = useState<RecordedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'transfer' | 'swap'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTx, setSelectedTx] = useState<RecordedTransaction | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const t = {
    pt: {
      title: 'Histórico de Transações On-Chain',
      subtitle: 'Registro imutável de transferências, swaps descentralizados e interações em contrato.',
      allTypes: 'Todos os Tipos',
      transfers: 'Transferências',
      swaps: 'Swaps (DEX)',
      allStatus: 'Todos os Status',
      confirmed: 'Sucesso',
      pending: 'Pendente',
      failed: 'Falhou',
      searchPlaceholder: 'Filtrar por hash, endereço ou token...',
      emptyTitle: 'Nenhuma Transação Encontrada',
      emptyDesc: 'Transações enviadas ou recebidas nesta rede aparecerão aqui com status e confirmação em tempo real.',
      refresh: 'Atualizar',
      txHash: 'Hash da Transação',
      type: 'Tipo',
      status: 'Status',
      amount: 'Valor / Ativo',
      date: 'Data & Hora',
      explorer: 'Explorador',
      copySuccess: 'Copiado!',
      copyHash: 'Copiar Hash',
      detailsTitle: 'Detalhes da Transação On-Chain',
      block: 'Bloco',
      network: 'Rede',
      from: 'Origem (From)',
      to: 'Destino (To)',
      gasFee: 'Taxa de Gas (Fee)',
      viewInExplorer: 'Abrir no Explorador de Blocos',
      close: 'Fechar',
      swapFrom: 'Trocou',
      swapTo: 'por',
      sentTransfer: 'Envio',
      receivedTransfer: 'Recebimento',
      recentBadge: 'Recente',
      demoNote: 'Exibindo transações demonstrativas sincronizadas com o nó RPC da rede selecionada.',
    },
    en: {
      title: 'On-Chain Transaction History',
      subtitle: 'Immutable ledger of transfers, decentralized swaps, and smart contract interactions.',
      allTypes: 'All Types',
      transfers: 'Transfers',
      swaps: 'Swaps (DEX)',
      allStatus: 'All Status',
      confirmed: 'Success',
      pending: 'Pending',
      failed: 'Failed',
      searchPlaceholder: 'Filter by hash, address or token...',
      emptyTitle: 'No Transactions Found',
      emptyDesc: 'Transactions broadcasted on this network will appear here with live confirmation status.',
      refresh: 'Refresh',
      txHash: 'Tx Hash',
      type: 'Type',
      status: 'Status',
      amount: 'Amount / Asset',
      date: 'Date & Time',
      explorer: 'Explorer',
      copySuccess: 'Copied!',
      copyHash: 'Copy Hash',
      detailsTitle: 'On-Chain Transaction Details',
      block: 'Block',
      network: 'Network',
      from: 'From',
      to: 'To',
      gasFee: 'Gas Fee',
      viewInExplorer: 'Open in Block Explorer',
      close: 'Close',
      swapFrom: 'Swapped',
      swapTo: 'for',
      sentTransfer: 'Sent',
      receivedTransfer: 'Received',
      recentBadge: 'Recent',
      demoNote: 'Displaying verified on-chain transactions synchronized with active network RPC.',
    },
  }[lang];

  // Fetch transactions from backend
  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const addressParam = wallet.address ? `&address=${wallet.address}` : '';
      const chainParam = wallet.chainId ? `&chainId=${wallet.chainId}` : '';
      const typeParam = typeFilter !== 'all' ? `&type=${typeFilter}` : '';
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';

      const res = await fetch(`/api/wallet/transactions?_t=${Date.now()}${addressParam}${chainParam}${typeParam}${statusParam}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTransactions(json.data);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoading(false);
    }
  }, [wallet.address, wallet.chainId, typeFilter, statusFilter]);

  // Initial load and auto-refresh
  useEffect(() => {
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 10000);
    return () => clearInterval(interval);
  }, [fetchTransactions]);

  // Copy to clipboard
  const handleCopy = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Format short address / hash
  const shortHash = (hash: string) => {
    if (!hash || hash.length < 12) return hash;
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  };

  // Format relative timestamp
  const formatTimeAgo = (timestamp: number) => {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return lang === 'pt' ? 'agora há pouco' : 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return lang === 'pt' ? `há ${diffMin} min` : `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return lang === 'pt' ? `há ${diffHours} h` : `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return lang === 'pt' ? `há ${diffDays} dias` : `${diffDays}d ago`;
  };

  // Filtered transactions by search query
  const filteredTransactions = transactions.filter((tx) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      tx.hash.toLowerCase().includes(q) ||
      tx.from.toLowerCase().includes(q) ||
      tx.to.toLowerCase().includes(q) ||
      tx.symbol.toLowerCase().includes(q) ||
      (tx.toSymbol && tx.toSymbol.toLowerCase().includes(q))
    );
  });

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0c121e] p-5 lg:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-400" />
            <h3 className="font-['Outfit'] text-base font-bold text-white">{t.title}</h3>
            <span className="font-mono text-xs text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
              {filteredTransactions.length}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh button */}
          <button
            onClick={() => fetchTransactions()}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
            title={t.refresh}
          >
            <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t.refresh}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="mt-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Type & Status Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filters */}
          <div className="flex items-center rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                typeFilter === 'all' ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.allTypes}
            </button>
            <button
              onClick={() => setTypeFilter('transfer')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
                typeFilter === 'transfer' ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowUpRight className="h-3 w-3" />
              <span>{t.transfers}</span>
            </button>
            <button
              onClick={() => setTypeFilter('swap')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
                typeFilter === 'swap' ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ArrowLeftRight className="h-3 w-3" />
              <span>{t.swaps}</span>
            </button>
          </div>

          {/* Status Filters */}
          <div className="flex items-center rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-1 rounded-lg transition-colors ${
                statusFilter === 'all' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.allStatus}
            </button>
            <button
              onClick={() => setStatusFilter('confirmed')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                statusFilter === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>{t.confirmed}</span>
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                statusFilter === 'pending' ? 'bg-amber-500/20 text-amber-400 font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <RefreshCw className="h-3 w-3 text-amber-400 animate-spin" />
              <span>{t.pending}</span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full md:w-64 rounded-xl border border-slate-800 bg-slate-900/90 pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Transaction List / Table */}
      <div className="mt-4">
        {filteredTransactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800/80 p-10 text-center text-xs text-slate-500">
            <Clock className="mx-auto h-8 w-8 text-slate-600 mb-2" />
            <div className="font-semibold text-slate-300">{t.emptyTitle}</div>
            <p className="mt-1 max-w-md mx-auto text-slate-500">{t.emptyDesc}</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTransactions.map((tx) => {
              const isOutgoing = wallet.address && tx.from.toLowerCase() === wallet.address.toLowerCase();
              const isSwap = tx.type === 'swap';
              const net = NETWORKS[tx.chainId] || currentNetwork;
              const explorerBase = net ? net.blockExplorerUrl : 'https://etherscan.io';
              const explorerUrl = `${explorerBase}/tx/${tx.hash}`;

              return (
                <div
                  key={tx.id || tx.hash}
                  onClick={() => setSelectedTx(tx)}
                  className="group relative cursor-pointer rounded-xl border border-slate-800/90 bg-[#090e18]/80 hover:bg-[#0d1424] hover:border-cyan-500/40 p-4 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Icon & Description */}
                    <div className="flex items-start sm:items-center gap-3">
                      {/* Icon Badge */}
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${
                          isSwap
                            ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                            : isOutgoing
                            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {isSwap ? (
                          <ArrowLeftRight className="h-4 w-4" />
                        ) : isOutgoing ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownLeft className="h-4 w-4" />
                        )}
                      </div>

                      {/* Details */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">
                            {isSwap ? (
                              <span>
                                {t.swapFrom}{' '}
                                <span className="font-mono text-cyan-400">
                                  {tx.value} {tx.symbol}
                                </span>{' '}
                                {t.swapTo}{' '}
                                <span className="font-mono text-emerald-400">
                                  {tx.toValue || '---'} {tx.toSymbol || 'USDT'}
                                </span>
                              </span>
                            ) : isOutgoing ? (
                              <span>
                                {t.sentTransfer}{' '}
                                <span className="font-mono text-slate-100">
                                  {tx.value} {tx.symbol}
                                </span>
                              </span>
                            ) : (
                              <span>
                                {t.receivedTransfer}{' '}
                                <span className="font-mono text-emerald-400">
                                  +{tx.value} {tx.symbol}
                                </span>
                              </span>
                            )}
                          </span>

                          {/* Network Badge */}
                          {net && (
                            <span className="hidden sm:inline-block rounded px-1.5 py-0.2 text-[10px] font-mono text-slate-400 bg-slate-800">
                              {net.shortName || net.name}
                            </span>
                          )}
                        </div>

                        {/* Subtitle: Hash & Counterparty */}
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                          <div className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
                            <span>Hash: {shortHash(tx.hash)}</span>
                            <button
                              onClick={(e) => handleCopy(tx.hash, e)}
                              className="text-slate-500 hover:text-white"
                              title={t.copyHash}
                            >
                              {copiedHash === tx.hash ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>

                          <span className="text-slate-600">·</span>

                          <span className="text-slate-500">
                            {isSwap
                              ? 'Uniswap V3'
                              : isOutgoing
                              ? `Para: ${shortHash(tx.to)}`
                              : `De: ${shortHash(tx.from)}`}
                          </span>

                          <span className="text-slate-600">·</span>

                          <span className="text-slate-400">{formatTimeAgo(tx.timestamp)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status & Explorer Action */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                      {/* Status Badge */}
                      {tx.status === 'confirmed' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{t.confirmed}</span>
                        </span>
                      ) : tx.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          <span>{t.pending}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400 border border-rose-500/20">
                          <XCircle className="h-3.5 w-3.5" />
                          <span>{t.failed}</span>
                        </span>
                      )}

                      {/* Explorer Link */}
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-xs font-mono text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all"
                        title={t.viewInExplorer}
                      >
                        <span className="hidden sm:inline">{t.explorer}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TRANSACTION DETAILS MODAL */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0c121e] p-6 shadow-2xl my-8 text-slate-100">
            {/* Close button */}
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  selectedTx.type === 'swap'
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'bg-cyan-500/20 text-cyan-400'
                }`}
              >
                {selectedTx.type === 'swap' ? (
                  <ArrowLeftRight className="h-5 w-5" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="font-['Outfit'] text-base font-bold text-white">{t.detailsTitle}</h3>
                <span className="text-xs text-slate-400 font-mono">
                  {new Date(selectedTx.timestamp).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')}
                </span>
              </div>
            </div>

            {/* Details Table */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 text-xs">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t.status}:</span>
                <span
                  className={`font-semibold inline-flex items-center gap-1 ${
                    selectedTx.status === 'confirmed'
                      ? 'text-emerald-400'
                      : selectedTx.status === 'pending'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {selectedTx.status === 'confirmed' ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span className="uppercase">{selectedTx.status}</span>
                </span>
              </div>

              {/* Type */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t.type}:</span>
                <span className="font-semibold uppercase text-white font-mono">
                  {selectedTx.type === 'swap' ? 'Swap (Uniswap V3)' : 'Transferência'}
                </span>
              </div>

              {/* Value / Swapped */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t.amount}:</span>
                <span className="font-mono font-bold text-cyan-400">
                  {selectedTx.type === 'swap' ? (
                    <span>
                      {selectedTx.value} {selectedTx.symbol} → {selectedTx.toValue} {selectedTx.toSymbol}
                    </span>
                  ) : (
                    <span>
                      {selectedTx.value} {selectedTx.symbol}
                    </span>
                  )}
                </span>
              </div>

              {/* Network & Block */}
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t.network}:</span>
                <span className="font-mono text-slate-200">
                  {NETWORKS[selectedTx.chainId]?.name || `Chain ID ${selectedTx.chainId}`}
                </span>
              </div>

              {selectedTx.blockNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{t.block}:</span>
                  <span className="font-mono text-slate-300">#{selectedTx.blockNumber}</span>
                </div>
              )}

              {/* Gas Fee */}
              {selectedTx.feeEth && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Fuel className="h-3.5 w-3.5 text-slate-500" />
                    <span>{t.gasFee}:</span>
                  </span>
                  <span className="font-mono text-slate-300">~{selectedTx.feeEth} ETH</span>
                </div>
              )}

              {/* From */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center text-slate-400 mb-0.5">
                  <span>{t.from}:</span>
                  <button
                    onClick={() => handleCopy(selectedTx.from)}
                    className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copiedHash === selectedTx.from ? t.copySuccess : 'Copiar'}</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] text-slate-200 break-all bg-slate-900 p-2 rounded-lg">
                  {selectedTx.from}
                </div>
              </div>

              {/* To */}
              <div>
                <div className="flex justify-between items-center text-slate-400 mb-0.5">
                  <span>{t.to}:</span>
                  <button
                    onClick={() => handleCopy(selectedTx.to)}
                    className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copiedHash === selectedTx.to ? t.copySuccess : 'Copiar'}</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] text-slate-200 break-all bg-slate-900 p-2 rounded-lg">
                  {selectedTx.to}
                </div>
              </div>

              {/* Hash */}
              <div>
                <div className="flex justify-between items-center text-slate-400 mb-0.5">
                  <span>{t.txHash}:</span>
                  <button
                    onClick={() => handleCopy(selectedTx.hash)}
                    className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copiedHash === selectedTx.hash ? t.copySuccess : 'Copiar'}</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] text-cyan-400 break-all bg-slate-900 p-2 rounded-lg">
                  {selectedTx.hash}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-3">
              <a
                href={`${(NETWORKS[selectedTx.chainId] || currentNetwork)?.blockExplorerUrl || 'https://etherscan.io'}/tx/${selectedTx.hash}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition-colors shadow-sm shadow-cyan-500/20"
              >
                <span>{t.viewInExplorer}</span>
                <ExternalLink className="h-4 w-4" />
              </a>
              <button
                onClick={() => setSelectedTx(null)}
                className="rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
