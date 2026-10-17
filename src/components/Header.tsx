import React, { useState } from 'react';
import { useWallet } from '../wallet/WalletContext';
import { NETWORKS } from '../config/networks';
import { ShieldCheck, ChevronDown, Check, Globe, Fuel, Bell } from 'lucide-react';


interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lang: 'pt' | 'en';
  setLang: (lang: 'pt' | 'en') => void;
  onOpenAuthModal: () => void;
  onOpenGasTracker?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  lang,
  setLang,
  onOpenAuthModal,
  onOpenGasTracker,
}) => {
  const {
    wallet,
    currentNetwork,
    connect,
    disconnect,
    switchNetwork,
    isAuthenticated,
    isAdmin,
  } = useWallet();

  const [showNetworkMenu, setShowNetworkMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const t = {
    pt: {
      wallet: 'Carteira',
      exchange: 'Exchange',
      swap: 'Swap DeFi',
      markets: 'Mercados',
      alerts: 'Alertas',
      scanner: 'Scanner',
      admin: 'Admin',
      connect: 'Conectar Carteira',
      connecting: 'Conectando...',
      disconnect: 'Desconectar',
      authenticated: 'Autenticado',
      authenticate: 'Autenticar Web3',
      adminBadge: 'Administrador',
      wrongNetwork: 'Rede Desconhecida',
      copied: 'Copiado!',
    },
    en: {
      wallet: 'Wallet',
      exchange: 'Exchange',
      swap: 'DeFi Swap',
      markets: 'Markets',
      alerts: 'Alerts',
      scanner: 'Scanner',
      admin: 'Admin',
      connect: 'Connect Wallet',
      connecting: 'Connecting...',
      disconnect: 'Disconnect',
      authenticated: 'Authenticated',
      authenticate: 'Web3 Auth',

      adminBadge: 'Admin',
      wrongNetwork: 'Unknown Network',
      copied: 'Copied!',
    },
  }[lang];

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#090d16]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('wallet')}
            className="flex items-center gap-2.5 text-left transition-opacity hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-600 to-cyan-400 text-slate-950 shadow-sm shadow-cyan-500/20">
              <span className="font-mono text-base font-black tracking-tighter">RV</span>
            </div>
            <span className="font-['Outfit'] text-lg font-bold tracking-tight text-white whitespace-nowrap">
              RV.Web3
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('wallet')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'wallet'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.wallet}
          </button>
          <button
            onClick={() => setActiveTab('exchange')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'exchange'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.exchange}
          </button>
          <button
            onClick={() => setActiveTab('swap')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'swap'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.swap}
          </button>
          <button
            onClick={() => setActiveTab('markets')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'markets'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.markets}
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`whitespace-nowrap transition-colors py-1 flex items-center gap-1.5 ${
              activeTab === 'alerts'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            <span>{t.alerts}</span>
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            className={`whitespace-nowrap transition-colors py-1 flex items-center gap-1.5 ${
              activeTab === 'scanner'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{t.scanner}</span>
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'admin'
                ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.admin}
          </button>
        </nav>



        {/* Zone 3: Primary Action & Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Language Switch */}
          <button
            onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')}
            className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-700 transition-colors"
            title="Alternar Idioma"
          >
            <Globe className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-mono uppercase font-semibold text-[11px]">{lang}</span>
          </button>

          {/* Gas Tracker Button */}
          {onOpenGasTracker && (
            <button
              onClick={onOpenGasTracker}
              className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-300 hover:border-cyan-500/40 hover:text-cyan-400 transition-colors"
              title="Monitor de Gas em Tempo Real"
            >
              <Fuel className="h-3.5 w-3.5 text-cyan-400" />
              <span className="font-mono text-[11px] font-semibold text-cyan-400">Gas</span>
            </button>
          )}

          {/* Network Selector */}
          {wallet.isConnected && (
            <div className="relative">
              <button
                onClick={() => setShowNetworkMenu(!showNetworkMenu)}
                className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-700 transition-colors"
              >
                <div className="h-2 w-2 rounded-full bg-cyan-400" />
                <span className="whitespace-nowrap">{currentNetwork ? currentNetwork.shortName : t.wrongNetwork}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {showNetworkMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-800 bg-[#0f172a] p-1.5 shadow-2xl shadow-black/80 z-50">
                  <div className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Redes EVM Suportadas
                  </div>
                  {Object.values(NETWORKS).map((net) => {
                    const isSelected = wallet.chainId === net.chainId;
                    return (
                      <button
                        key={net.chainId}
                        onClick={() => {
                          switchNetwork(net.chainId);
                          setShowNetworkMenu(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors ${
                          isSelected
                            ? 'bg-cyan-500/10 text-cyan-400 font-medium'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-slate-500">#{net.chainId}</span>
                          <span>{net.name}</span>
                        </div>
                        {isSelected && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Connect / Account Button */}
          {!wallet.isConnected ? (
            <button
              onClick={() => connect('injected')}
              disabled={wallet.isConnecting}
              className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-sm shadow-cyan-500/20 hover:bg-cyan-400 active:scale-[0.98] transition-all whitespace-nowrap"
            >
              {wallet.isConnecting ? t.connecting : t.connect}
            </button>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-500/50 transition-colors"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-[10px]">
                  0x
                </div>
                <span className="font-mono">{formatAddress(wallet.address!)}</span>
                {isAuthenticated ? (
                  <span title={t.authenticated} className="flex items-center">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  </span>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-amber-400" title="Assinatura Web3 pendente" />
                )}
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {showAccountMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-800 bg-[#0f172a] p-2 shadow-2xl shadow-black/80 z-50">
                  <div className="p-2 border-b border-slate-800">
                    <div className="text-[11px] text-slate-400">Endereço Conectado</div>
                    <div className="mt-0.5 font-mono text-xs text-white break-all">{wallet.address}</div>
                    {isAdmin && (
                      <div className="mt-1.5 inline-block text-[10px] font-semibold text-cyan-400">
                        {t.adminBadge}
                      </div>
                    )}
                  </div>

                  <div className="p-1 space-y-1">
                    {!isAuthenticated ? (
                      <button
                        onClick={() => {
                          setShowAccountMenu(false);
                          onOpenAuthModal();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg bg-cyan-500/10 px-2.5 py-2 text-xs font-medium text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>{t.authenticate}</span>
                      </button>
                    ) : (
                      <div className="px-2.5 py-1.5 text-xs text-emerald-400 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Sessão Autenticada</span>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setShowAccountMenu(false);
                        disconnect();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <span>{t.disconnect}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
