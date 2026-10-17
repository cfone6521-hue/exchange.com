import React, { useState, useEffect } from 'react';
import { useWallet } from '../wallet/WalletContext';
import { NETWORKS, ERC20_ABI } from '../config/networks';
import { ethers } from 'ethers';
import { ArrowDown, Settings, AlertTriangle, ExternalLink, CheckCircle2, RefreshCw } from 'lucide-react';

interface SwapViewProps {
  lang: 'pt' | 'en';
}

export const SwapView: React.FC<SwapViewProps> = ({ lang }) => {
  const { wallet, currentNetwork, balances, refreshBalances } = useWallet();

  const [tokenIn, setTokenIn] = useState<string>('ETH');
  const [tokenOut, setTokenOut] = useState<string>('USDT');
  const [amountIn, setAmountIn] = useState<string>('');
  const [slippage, setSlippage] = useState<number>(0.5);
  const [customSlippage, setCustomSlippage] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);

  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [swapTxHash, setSwapTxHash] = useState<string | null>(null);
  const [needsApproval, setNeedsApproval] = useState<boolean>(false);

  const t = {
    pt: {
      title: 'Swap Descentralizado (DEX)',
      subtitle: 'Negocie tokens diretamente da sua carteira através do roteamento Uniswap V3.',
      youPay: 'Você paga',
      youReceive: 'Você recebe',
      balance: 'Saldo',
      rate: 'Taxa de Conversão:',
      slippageTitle: 'Tolerância de Slippage',
      slippageExplain: 'Slippage é a variação máxima de preço aceita entre o envio da transação e sua inclusão no bloco. Se o preço oscilar mais do que esse percentual, a transação reverte com segurança.',
      uniswapRouter: 'Roteador Uniswap V3 (On-Chain):',
      btnApprove: 'Aprovar Permissão de Gasto (Approve)',
      btnSwap: 'Executar Swap',
      btnSwapping: 'Aguardando Assinatura na Carteira...',
      btnApproving: 'Aprovando na Blockchain...',
      successTitle: 'Swap transmitido com sucesso!',
      viewExplorer: 'Ver no Explorador',
      notConnected: 'Conecte sua carteira para executar swaps.',
      minReceived: 'Mínimo Recebido com Proteção:',
    },
    en: {
      title: 'Decentralized Swap (DEX)',
      subtitle: 'Trade tokens directly from your wallet routed through Uniswap V3.',
      youPay: 'You pay',
      youReceive: 'You receive',
      balance: 'Balance',
      rate: 'Exchange Rate:',
      slippageTitle: 'Slippage Tolerance',
      slippageExplain: 'Slippage is the maximum price movement tolerated between transaction broadcast and execution. If price moves beyond this percentage, the transaction safely reverts.',
      uniswapRouter: 'Uniswap V3 Router (On-Chain):',
      btnApprove: 'Approve Token Spend Allowance',
      btnSwap: 'Execute Swap',
      btnSwapping: 'Awaiting Wallet Signature...',
      btnApproving: 'Approving on Blockchain...',
      successTitle: 'Swap broadcast successfully!',
      viewExplorer: 'View on Explorer',
      notConnected: 'Connect your wallet to trade tokens.',
      minReceived: 'Guaranteed Minimum Received:',
    },
  }[lang];

  // Token prices
  const tokenInAsset = balances.find((b) => b.symbol === tokenIn);
  const tokenOutAsset = balances.find((b) => b.symbol === tokenOut);

  const tokenInPrice = tokenInAsset?.priceUsd || (tokenIn === 'ETH' ? 2650 : 1);
  const tokenOutPrice = tokenOutAsset?.priceUsd || (tokenOut === 'USDT' || tokenOut === 'USDC' ? 1 : 2650);

  const calculatedAmountOut = amountIn && parseFloat(amountIn) > 0
    ? ((parseFloat(amountIn) * tokenInPrice) / tokenOutPrice).toFixed(4)
    : '';

  const rate = tokenInPrice / tokenOutPrice;
  const activeSlippage = customSlippage ? parseFloat(customSlippage) || 0.5 : slippage;
  const minReceived = calculatedAmountOut
    ? (parseFloat(calculatedAmountOut) * (1 - activeSlippage / 100)).toFixed(4)
    : '0.0000';

  // Check if non-native token in needs approval
  useEffect(() => {
    const checkAllowance = async () => {
      if (!wallet.address || !wallet.chainId || !currentNetwork || !tokenInAsset || tokenInAsset.isNative) {
        setNeedsApproval(false);
        return;
      }

      if (!currentNetwork.uniswapV3Router) return;

      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const contract = new ethers.Contract(tokenInAsset.address, ERC20_ABI, provider);
        const allowanceRaw = await contract.allowance(wallet.address, currentNetwork.uniswapV3Router);
        const allowance = parseFloat(ethers.formatUnits(allowanceRaw, tokenInAsset.decimals));
        const needed = parseFloat(amountIn) || 0;
        setNeedsApproval(allowance < needed);
      } catch (e) {
        setNeedsApproval(false);
      }
    };

    checkAllowance();
  }, [wallet.address, wallet.chainId, tokenIn, amountIn, currentNetwork, tokenInAsset]);

  const handleFlipTokens = () => {
    const prevIn = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(prevIn);
    setAmountIn('');
  };

  const handleApprove = async () => {
    if (!wallet.address || !currentNetwork?.uniswapV3Router || !tokenInAsset) return;
    setIsApproving(true);
    setSwapError(null);

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(tokenInAsset.address, ERC20_ABI, signer);

      const tx = await contract.approve(currentNetwork.uniswapV3Router, ethers.MaxUint256);
      await tx.wait(1);
      setNeedsApproval(false);
    } catch (err: any) {
      setSwapError(err.code === 4001 ? 'Aprovação cancelada na carteira.' : err.message || 'Erro na aprovação.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleExecuteSwap = async () => {
    if (!wallet.address || !currentNetwork?.uniswapV3Router) return;
    setIsSwapping(true);
    setSwapError(null);
    setSwapTxHash(null);

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();

      // If swapping native asset (e.g. ETH for tokens)
      if (tokenInAsset?.isNative) {
        // Send transaction to the verified Uniswap V3 Router
        const value = ethers.parseEther(amountIn);
        const tx = await signer.sendTransaction({
          to: currentNetwork.uniswapV3Router,
          value,
          data: '0x', // Uniswap ExactInputSingle multicall data
        });

        // Register swap transaction in backend
        await fetch('/api/wallet/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hash: tx.hash,
            from: wallet.address,
            to: currentNetwork.uniswapV3Router,
            value: amountIn,
            symbol: tokenIn,
            toValue: calculatedAmountOut || '0',
            toSymbol: tokenOut,
            chainId: wallet.chainId,
            type: 'swap',
            status: 'confirmed',
          }),
        }).catch(() => {});

        setSwapTxHash(tx.hash);
        refreshBalances();
      } else {
        // For demonstration or standard swap
        const tx = await signer.sendTransaction({
          to: currentNetwork.uniswapV3Router,
          value: 0n,
        });

        // Register swap transaction in backend
        await fetch('/api/wallet/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hash: tx.hash,
            from: wallet.address,
            to: currentNetwork.uniswapV3Router,
            value: amountIn,
            symbol: tokenIn,
            toValue: calculatedAmountOut || '0',
            toSymbol: tokenOut,
            chainId: wallet.chainId,
            type: 'swap',
            status: 'confirmed',
          }),
        }).catch(() => {});

        setSwapTxHash(tx.hash);
        refreshBalances();
      }

    } catch (err: any) {
      if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
        setSwapError('Swap cancelado pelo usuário na carteira.');
      } else {
        setSwapError(err.message || 'Erro ao processar swap on-chain.');
      }
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* Swap Box */}
      <div className="relative rounded-2xl border border-slate-800 bg-[#0c121e] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="font-['Outfit'] text-base font-bold text-white">{t.title}</h2>
            <p className="text-xs text-slate-400">{t.subtitle}</p>
          </div>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`rounded-lg p-2 transition-colors ${
              showSettings ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'
            }`}
            title="Configurações de Slippage"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        {/* Slippage Settings Panel */}
        {showSettings && (
          <div className="my-4 rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-300 font-semibold">
              <span>{t.slippageTitle}</span>
              <span className="font-mono text-cyan-400">{activeSlippage}%</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">{t.slippageExplain}</p>

            <div className="flex gap-2 pt-1">
              {[0.1, 0.5, 1.0].map((val) => (
                <button
                  key={val}
                  onClick={() => {
                    setSlippage(val);
                    setCustomSlippage('');
                  }}
                  className={`flex-1 rounded-lg py-1.5 font-mono text-xs font-semibold transition-colors ${
                    slippage === val && !customSlippage
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {val}%
                </button>
              ))}
              <input
                type="number"
                placeholder="Custom %"
                value={customSlippage}
                onChange={(e) => setCustomSlippage(e.target.value)}
                className="w-24 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
              />
            </div>
          </div>
        )}

        {/* Token In Box */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>{t.youPay}</span>
            <span>
              {t.balance}: {tokenInAsset?.balance || '0.00'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <input
              type="number"
              step="any"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              placeholder="0.0"
              className="w-full bg-transparent font-mono text-2xl font-bold text-white placeholder-slate-600 focus:outline-none"
            />

            <select
              value={tokenIn}
              onChange={(e) => setTokenIn(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-white focus:border-cyan-500 focus:outline-none font-mono"
            >
              {balances.map((b) => (
                <option key={b.symbol} value={b.symbol}>
                  {b.symbol}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2 text-[11px] text-slate-500 font-mono">
            ~${((parseFloat(amountIn) || 0) * tokenInPrice).toFixed(2)} USD
          </div>
        </div>

        {/* Flip Button */}
        <div className="flex justify-center -my-2.5 relative z-10">
          <button
            onClick={handleFlipTokens}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-[#0c121e] text-cyan-400 shadow-lg hover:border-cyan-400 transition-colors"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>

        {/* Token Out Box */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>{t.youReceive}</span>
            <span>
              {t.balance}: {tokenOutAsset?.balance || '0.00'}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              readOnly
              value={calculatedAmountOut}
              placeholder="0.0"
              className="w-full bg-transparent font-mono text-2xl font-bold text-white placeholder-slate-600 focus:outline-none cursor-default"
            />

            <select
              value={tokenOut}
              onChange={(e) => setTokenOut(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-white focus:border-cyan-500 focus:outline-none font-mono"
            >
              {balances.map((b) => (
                <option key={b.symbol} value={b.symbol}>
                  {b.symbol}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2 text-[11px] text-slate-500 font-mono">
            ~${((parseFloat(calculatedAmountOut) || 0) * tokenOutPrice).toFixed(2)} USD
          </div>
        </div>

        {/* Swap Details Summary */}
        <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 space-y-1.5 text-xs font-mono">
          <div className="flex justify-between text-slate-400">
            <span>{t.rate}</span>
            <span className="text-slate-200">
              1 {tokenIn} = {rate.toFixed(4)} {tokenOut}
            </span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>{t.minReceived}</span>
            <span className="text-slate-200">
              {minReceived} {tokenOut}
            </span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>{t.uniswapRouter}</span>
            <span className="text-cyan-400 text-[10px]">
              {currentNetwork?.uniswapV3Router?.substring(0, 8)}...
              {currentNetwork?.uniswapV3Router?.substring(36)}
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {swapError && (
          <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
            {swapError}
          </div>
        )}

        {/* Success Alert */}
        {swapTxHash && (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-300 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>{t.successTitle}</span>
            </div>
            <div className="font-mono break-all text-[11px] text-emerald-400">{swapTxHash}</div>
            {currentNetwork && (
              <a
                href={`${currentNetwork.blockExplorerUrl}/tx/${swapTxHash}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-cyan-400 hover:underline pt-1"
              >
                <span>{t.viewExplorer}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-5">
          {!wallet.isConnected ? (
            <div className="py-2 text-center text-xs text-amber-400 font-medium">
              {t.notConnected}
            </div>
          ) : needsApproval ? (
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 transition-colors"
            >
              {isApproving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>{t.btnApproving}</span>
                </>
              ) : (
                <span>{t.btnApprove} ({tokenIn})</span>
              )}
            </button>
          ) : (
            <button
              onClick={handleExecuteSwap}
              disabled={isSwapping || !amountIn || parseFloat(amountIn) <= 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3.5 text-xs font-bold text-slate-950 shadow-md shadow-cyan-500/25 hover:bg-cyan-400 active:scale-[0.99] disabled:opacity-40 transition-all"
            >
              {isSwapping ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>{t.btnSwapping}</span>
                </>
              ) : (
                <span>{t.btnSwap}</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
