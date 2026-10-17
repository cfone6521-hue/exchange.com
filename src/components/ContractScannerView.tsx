import React, { useState, useEffect } from 'react';
import { useWallet } from '../wallet/WalletContext';
import { NETWORKS } from '../config/networks';
import { ethers } from 'ethers';
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Code2,
  FileCode,
  Terminal,
  Cpu,
  Info,
  Sparkles,
  ChevronRight,
  Lock,
  Unlock,
} from 'lucide-react';

interface VulnerabilityItem {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  description: string;
  recommendation: string;
}

interface ContractScanResult {
  address: string;
  chainId: number;
  contractName: string;
  isContract: boolean;
  isVerified: boolean;
  compilerVersion?: string;
  optimizationUsed?: boolean;
  runs?: number;
  licenseType?: string;
  isProxy?: boolean;
  implementation?: string;
  securityScore: number;
  riskLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vulnerabilities: VulnerabilityItem[];
  sourceCodeSnippet?: string;
  abiSnippet?: string[];
  scanTimestamp: number;
  explorerUrl: string;
}

interface ContractScannerViewProps {
  lang: 'pt' | 'en';
}

const PRESET_CONTRACTS = [
  {
    name: 'USDT (Tether)',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    chainId: 1,
    tag: 'Stablecoin',
  },
  {
    name: 'Uniswap V3 Factory',
    address: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    chainId: 1,
    tag: 'DEX Protocol',
  },
  {
    name: 'WETH9 (Wrapped Ether)',
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    chainId: 1,
    tag: 'Canonical Wrapper',
  },
  {
    name: 'USDC (FiatTokenProxy)',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    chainId: 1,
    tag: 'Proxy EIP-1967',
  },
];

export const ContractScannerView: React.FC<ContractScannerViewProps> = ({ lang }) => {
  const { currentNetwork } = useWallet();

  const [inputAddress, setInputAddress] = useState<string>('0xdAC17F958D2ee523a2206206994597C13D831ec7');
  const [selectedChainId, setSelectedChainId] = useState<number>(currentNetwork?.chainId || 1);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<ContractScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'audit' | 'abi' | 'source'>('audit');
  const [copied, setCopied] = useState<boolean>(false);

  const t = {
    pt: {
      title: 'Smart Contract Scanner',
      subtitle: 'Audite a segurança de qualquer contrato na blockchain antes de interagir ou aprovar transações. Alimentado pela API Etherscan.',
      badge: 'Auditoria de Segurança Etherscan',
      inputPlaceholder: 'Insira o endereço do contrato (0x...)',
      btnScan: 'Escanear Contrato',
      btnScanning: 'Analisando Bytecode e Etherscan...',
      presetsTitle: 'Exemplos Verificados para Teste Rápido:',
      scoreLabel: 'Índice de Confiança & Segurança',
      verifiedSource: 'Código Fonte Verificado no Etherscan',
      unverifiedSource: 'Código Fonte Não Verificado (Bytecode Opaco)',
      contractDetails: 'Especificações Técnicas',
      compiler: 'Compilador',
      optimization: 'Otimização',
      license: 'Licença',
      proxyDetected: 'Contrato Proxy Atualizável (EIP-1967)',
      proxyImplementation: 'Implementação:',
      tabAudit: 'Vulnerabilidades Detectadas',
      tabAbi: 'Funções Públicas (ABI)',
      tabSource: 'Código Fonte Solidity',
      noVulnerabilities: 'Nenhuma vulnerabilidade crítica ou média encontrada.',
      recommendationLabel: 'Recomendação de Segurança:',
      copyAddress: 'Copiar Endereço',
      copied: 'Copiado!',
      viewExplorer: 'Ver no Etherscan',
      invalidAddress: 'Por favor, insira um endereço EVM válido (42 caracteres começando com 0x).',
      disclaimer: 'Aviso de Isenção: A análise heurística é baseada em padrões estáticos conhecidos no código fonte e dados públicos da API Etherscan. Sempre faça sua própria auditoria diligente (DYOR).',
    },
    en: {
      title: 'Smart Contract Scanner',
      subtitle: 'Audit any smart contract on the blockchain before interacting or approving token allowances. Powered by Etherscan API.',
      badge: 'Etherscan Security Audit',
      inputPlaceholder: 'Enter contract address (0x...)',
      btnScan: 'Scan Contract',
      btnScanning: 'Analyzing Bytecode & Etherscan...',
      presetsTitle: 'Verified Samples for Quick Testing:',
      scoreLabel: 'Trust & Security Score',
      verifiedSource: 'Verified Source Code on Etherscan',
      unverifiedSource: 'Unverified Source Code (Opaque Bytecode)',
      contractDetails: 'Technical Specifications',
      compiler: 'Compiler',
      optimization: 'Optimization',
      license: 'License',
      proxyDetected: 'Upgradeable Proxy Architecture (EIP-1967)',
      proxyImplementation: 'Implementation:',
      tabAudit: 'Detected Vulnerabilities',
      tabAbi: 'Public Functions (ABI)',
      tabSource: 'Solidity Source Code',
      noVulnerabilities: 'No critical or medium vulnerabilities detected.',
      recommendationLabel: 'Security Recommendation:',
      copyAddress: 'Copy Address',
      copied: 'Copied!',
      viewExplorer: 'View on Etherscan',
      invalidAddress: 'Please provide a valid EVM address (42 characters starting with 0x).',
      disclaimer: 'Disclaimer: Heuristic analysis is based on static source code patterns and public Etherscan data. Always conduct thorough diligence (DYOR) before depositing funds.',
    },
  }[lang];

  // Perform scan
  const handleScan = async (addressToScan?: string, chainToScan?: number) => {
    const targetAddr = (addressToScan || inputAddress).trim();
    const targetChain = chainToScan || selectedChainId;

    if (!targetAddr || !ethers.isAddress(targetAddr)) {
      setErrorMsg(t.invalidAddress);
      return;
    }

    setErrorMsg(null);
    setIsScanning(true);

    try {
      const res = await fetch(`/api/contract/scan?address=${targetAddr}&chainId=${targetChain}`);
      const json = await res.json();

      if (json.success && json.data) {
        setScanResult(json.data);
      } else {
        setErrorMsg(json.error || 'Falha ao analisar o contrato.');
      }
    } catch (err: any) {
      setErrorMsg('Erro de comunicação com o servidor de análise.');
    } finally {
      setIsScanning(false);
    }
  };

  // Run initial scan on mount
  useEffect(() => {
    handleScan(inputAddress, selectedChainId);
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'SAFE':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'LOW':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'MEDIUM':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'HIGH':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'CRITICAL':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'MEDIUM':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'LOW':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-[#0c1424] via-[#0a0f1d] to-[#070b14] p-6 lg:p-8">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-medium text-cyan-400 mb-2">
            <ShieldCheck className="h-4 w-4" />
            <span className="uppercase tracking-wider font-semibold">{t.badge}</span>
          </div>
          <h2 className="font-['Outfit'] text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {t.title}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400 leading-relaxed">{t.subtitle}</p>
        </div>

        {/* Background glow */}
        <div className="absolute -right-16 -bottom-16 h-64 w-64 rounded-full bg-cyan-600/10 blur-3xl pointer-events-none" />
      </div>

      {/* Input Box & Chain Selector */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c121e] p-5 shadow-sm space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleScan();
          }}
          className="flex flex-col sm:flex-row items-stretch gap-3"
        >
          {/* Network Selector */}
          <div className="sm:w-48 shrink-0">
            <select
              value={selectedChainId}
              onChange={(e) => setSelectedChainId(parseInt(e.target.value))}
              className="w-full h-11 rounded-xl border border-slate-800 bg-slate-900 px-3 text-xs font-semibold text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              {Object.values(NETWORKS).map((net) => (
                <option key={net.chainId} value={net.chainId}>
                  {net.name}
                </option>
              ))}
            </select>
          </div>

          {/* Address Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              placeholder={t.inputPlaceholder}
              className="w-full h-11 rounded-xl border border-slate-800 bg-slate-900/90 pl-10 pr-4 font-mono text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Scan Button */}
          <button
            type="submit"
            disabled={isScanning}
            className="h-11 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-xs font-bold text-slate-950 shadow-sm shadow-cyan-500/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {isScanning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>{t.btnScanning}</span>
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                <span>{t.btnScan}</span>
              </>
            )}
          </button>
        </form>

        {/* Error Message */}
        {errorMsg && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Presets List */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 text-[11px] mr-1">{t.presetsTitle}</span>
          {PRESET_CONTRACTS.map((p) => (
            <button
              key={p.address}
              type="button"
              onClick={() => {
                setInputAddress(p.address);
                setSelectedChainId(p.chainId);
                handleScan(p.address, p.chainId);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1 text-[11px] font-mono text-slate-300 hover:border-cyan-500/40 hover:text-cyan-400 transition-colors"
            >
              <span className="font-sans font-semibold text-white">{p.name}</span>
              <span className="text-slate-500 text-[10px]">({p.tag})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Audit Results View */}
      {scanResult && (
        <div className="space-y-6">
          {/* Main Result Card */}
          <div className="rounded-2xl border border-slate-800 bg-[#0c121e] p-6 lg:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
              {/* Contract Identity */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-['Outfit'] text-xl font-bold text-white">
                    {scanResult.contractName}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-mono font-bold border ${getRiskColor(
                      scanResult.riskLevel
                    )}`}
                  >
                    {scanResult.riskLevel} RISK
                  </span>
                  {scanResult.isProxy && (
                    <span className="rounded-md bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[11px] font-mono font-semibold text-purple-300">
                      PROXY
                    </span>
                  )}
                </div>

                {/* Address & Links */}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
                    <span className="text-slate-300">{scanResult.address}</span>
                    <button
                      onClick={() => handleCopy(scanResult.address)}
                      className="text-slate-500 hover:text-white"
                      title={t.copyAddress}
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  <a
                    href={scanResult.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
                  >
                    <span>{t.viewExplorer}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                {/* Verified Source status pill */}
                <div className="mt-3 flex items-center gap-2 text-xs">
                  {scanResult.isVerified ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{t.verifiedSource}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-rose-400 font-semibold">
                      <XCircle className="h-4 w-4" />
                      <span>{t.unverifiedSource}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Security Score Gauge */}
              <div className="flex items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 shrink-0">
                <div className="text-right">
                  <div className="text-xs text-slate-400">{t.scoreLabel}</div>
                  <div className="font-mono text-3xl font-black text-white tabular-nums">
                    {scanResult.securityScore}
                    <span className="text-base text-slate-500 font-normal">/100</span>
                  </div>
                </div>

                <div className="relative h-14 w-14 flex items-center justify-center">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-800"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={
                        scanResult.securityScore >= 80
                          ? 'text-emerald-400'
                          : scanResult.securityScore >= 60
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }
                      strokeDasharray={`${scanResult.securityScore}, 100`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute font-mono text-xs font-bold text-slate-200">
                    {scanResult.securityScore}%
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Specifications Bar */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/40">
                <div className="text-slate-500 text-[11px] font-sans">{t.compiler}</div>
                <div className="text-slate-200 font-semibold truncate mt-0.5">
                  {scanResult.compilerVersion || '---'}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/40">
                <div className="text-slate-500 text-[11px] font-sans">{t.optimization}</div>
                <div className="text-slate-200 font-semibold mt-0.5">
                  {scanResult.optimizationUsed ? `Ativa (${scanResult.runs} runs)` : 'Desativada'}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/40">
                <div className="text-slate-500 text-[11px] font-sans">{t.license}</div>
                <div className="text-slate-200 font-semibold truncate mt-0.5">
                  {scanResult.licenseType || 'Open Source'}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/40">
                <div className="text-slate-500 text-[11px] font-sans">Arquitetura</div>
                <div className="text-slate-200 font-semibold mt-0.5">
                  {scanResult.isProxy ? 'Proxy EIP-1967' : 'Imutável Padrão'}
                </div>
              </div>
            </div>

            {/* Proxy Implementation Address Note */}
            {scanResult.isProxy && scanResult.implementation && (
              <div className="mt-4 rounded-xl border border-purple-500/30 bg-purple-500/5 p-3 text-xs text-purple-200 flex items-center justify-between font-mono">
                <span>{t.proxyImplementation} {scanResult.implementation}</span>
                <a
                  href={`${(NETWORKS[scanResult.chainId] || NETWORKS[1]).blockExplorerUrl}/address/${scanResult.implementation}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <span>Explorar Lógica</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          {/* Details & Inspection Tabs */}
          <div className="rounded-2xl border border-slate-800 bg-[#0c121e] p-6 shadow-sm">
            {/* Tabs Bar */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <button
                onClick={() => setActiveTab('audit')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'audit'
                    ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldAlert className="h-4 w-4" />
                <span>{t.tabAudit}</span>
                <span className="font-mono text-[11px] px-1.5 py-0.2 rounded-md bg-slate-900 text-slate-300">
                  {scanResult.vulnerabilities.length}
                </span>
              </button>

              {scanResult.abiSnippet && scanResult.abiSnippet.length > 0 && (
                <button
                  onClick={() => setActiveTab('abi')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'abi'
                      ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Cpu className="h-4 w-4" />
                  <span>{t.tabAbi}</span>
                </button>
              )}

              {scanResult.sourceCodeSnippet && (
                <button
                  onClick={() => setActiveTab('source')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'source'
                      ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileCode className="h-4 w-4" />
                  <span>{t.tabSource}</span>
                </button>
              )}
            </div>

            {/* TAB 1: VULNERABILITY AUDIT LIST */}
            {activeTab === 'audit' && (
              <div className="mt-5 space-y-3">
                {scanResult.vulnerabilities.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400 mb-2" />
                    <span>{t.noVulnerabilities}</span>
                  </div>
                ) : (
                  scanResult.vulnerabilities.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-4 space-y-2 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold border uppercase ${getSeverityBadge(
                              v.severity
                            )}`}
                          >
                            {v.severity}
                          </span>
                          <span className="font-bold text-sm text-white">{v.title}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{v.description}</p>

                      <div className="rounded-lg bg-slate-900/90 p-2.5 text-[11px] text-slate-400 flex items-start gap-2 border border-slate-800">
                        <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-cyan-300">{t.recommendationLabel} </span>
                          <span>{v.recommendation}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: ABI FUNCTIONS */}
            {activeTab === 'abi' && scanResult.abiSnippet && (
              <div className="mt-5 space-y-2 font-mono text-xs">
                <div className="text-slate-400 text-xs mb-3 font-sans">
                  Assinaturas de métodos e funções públicas extraídas da ABI oficial verificada:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {scanResult.abiSnippet.map((fn, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5 text-cyan-300 break-all"
                    >
                      <span className="text-slate-500 mr-2 font-sans text-[10px]">#{i + 1}</span>
                      {fn}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: SOLIDITY SOURCE CODE */}
            {activeTab === 'source' && scanResult.sourceCodeSnippet && (
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-sans">
                    Trecho inicial do código fonte Solidity verificado no Etherscan:
                  </span>
                  <button
                    onClick={() => handleCopy(scanResult.sourceCodeSnippet || '')}
                    className="flex items-center gap-1 text-xs text-cyan-400 hover:underline"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copied ? t.copied : 'Copiar Código'}</span>
                  </button>
                </div>
                <pre className="max-h-96 overflow-y-auto rounded-xl border border-slate-800 bg-[#070b14] p-4 font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {scanResult.sourceCodeSnippet}
                </pre>
              </div>
            )}
          </div>

          {/* Legal Disclaimer */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3.5 text-[11px] leading-relaxed text-slate-500 flex items-start gap-2">
            <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <span>{t.disclaimer}</span>
          </div>
        </div>
      )}
    </div>
  );
};
