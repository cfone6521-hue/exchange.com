import React, { useState } from 'react';
import { WalletProvider } from './wallet/WalletContext';
import { Header } from './components/Header';
import { WalletView } from './components/WalletView';
import { ExchangeView } from './components/ExchangeView';
import { SwapView } from './components/SwapView';
import { MarketsView } from './components/MarketsView';
import { AdminView } from './components/AdminView';
import { AlertsManagerView } from './components/AlertsManagerView';
import { ContractScannerView } from './components/ContractScannerView';
import { Web3AuthModal } from './components/Web3AuthModal';

import { GasTracker } from './components/GasTracker';
import { ShieldCheck, AlertTriangle, XCircle } from 'lucide-react';


export default function App() {
  const [activeTab, setActiveTab] = useState<string>('wallet');
  const [lang, setLang] = useState<'pt' | 'en'>('pt');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isGasModalOpen, setIsGasModalOpen] = useState<boolean>(false);

  const t = {
    pt: {
      riskNotice: 'Aviso de Risco Web3: Negociações com criptoativos envolvem volatilidade de mercado e riscos de contratos inteligentes. Verifique sempre o endereço do destinatário e os parâmetros de transação antes de assinar com sua carteira.',
      rights: '© 2026 RV.Web3. Plataforma descentralizada de ativos digitais e carteira multichain. Todos os direitos reservados.',
      auditBadge: 'Assinatura Criptográfica EIP-191 & Proteção Anti-Replay Ativa',
    },
    en: {
      riskNotice: 'Web3 Risk Disclosure: Digital asset trading carries market volatility and smart contract risks. Always inspect recipient addresses and gas fees before authorizing transactions with your wallet.',
      rights: '© 2026 RV.Web3. Decentralized digital asset exchange & multichain wallet. All rights reserved.',
      auditBadge: 'EIP-191 Cryptographic Signatures & Anti-Replay Protection Active',
    },
  }[lang];

  return (
    <WalletProvider>
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans'] selection:bg-cyan-500/20 selection:text-cyan-400">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          lang={lang}
          setLang={setLang}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onOpenGasTracker={() => setIsGasModalOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'wallet' && (
            <WalletView lang={lang} onOpenAuthModal={() => setIsAuthModalOpen(true)} />
          )}

          {activeTab === 'exchange' && <ExchangeView lang={lang} />}

          {activeTab === 'swap' && <SwapView lang={lang} />}

          {activeTab === 'markets' && (
            <MarketsView
              lang={lang}
              onSelectPair={() => setActiveTab('exchange')}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsManagerView
              lang={lang}
              onNavigateToTrade={() => setActiveTab('exchange')}
            />
          )}

          {activeTab === 'scanner' && (
            <ContractScannerView lang={lang} />
          )}

          {activeTab === 'admin' && (
            <AdminView lang={lang} onOpenAuthModal={() => setIsAuthModalOpen(true)} />
          )}


        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-slate-900 bg-[#060a12] py-8 text-xs text-slate-500">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-400" />
                <span className="font-semibold text-slate-400">{t.auditBadge}</span>
              </div>
              <div className="text-[11px] font-mono text-slate-600">
                EVM Multichain: Ethereum · Polygon · BSC · Arbitrum · Optimism · Base · Sepolia
              </div>
            </div>

            <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-3 text-[11px] leading-relaxed text-slate-400 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500/80 shrink-0 mt-0.5" />
              <span>{t.riskNotice}</span>
            </div>

            <div className="text-center text-[11px] text-slate-600 pt-2">
              {t.rights}
            </div>
          </div>
        </footer>

        {/* Web3 Cryptographic Auth Modal */}
        <Web3AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          lang={lang}
        />

        {/* Global Gas Tracker Modal */}
        {isGasModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="relative w-full max-w-4xl rounded-2xl border border-slate-800 bg-[#090d16] p-6 shadow-2xl my-8">
              <button
                onClick={() => setIsGasModalOpen(false)}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
              <GasTracker lang={lang} />
            </div>
          </div>
        )}
      </div>
    </WalletProvider>
  );
}
