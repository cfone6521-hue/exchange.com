import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ethers } from 'ethers';
import { NETWORKS, ERC20_ABI, TokenInfo } from '../config/networks';
import {
  WalletState,
  SupportedConnector,
  UserBalance,
  AuthSession,
  RecordedTransaction,
} from './types';

interface WalletContextType {
  wallet: WalletState;
  currentNetwork: typeof NETWORKS[number] | null;
  balances: UserBalance[];
  customTokens: TokenInfo[];
  transactions: RecordedTransaction[];
  isLoadingBalances: boolean;
  authSession: AuthSession | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAuthenticating: boolean;
  authError: string | null;

  connect: (connector?: SupportedConnector) => Promise<boolean>;
  disconnect: () => void;
  switchNetwork: (targetChainId: number) => Promise<boolean>;
  refreshBalances: () => Promise<void>;
  addCustomToken: (contractAddress: string) => Promise<{ success: boolean; token?: TokenInfo; error?: string }>;
  loginWithWeb3: () => Promise<boolean>;
  logoutWeb3: () => Promise<void>;
  sendNativeAsset: (to: string, amount: string, priority?: 'low' | 'medium' | 'high') => Promise<{ success: boolean; hash?: string; error?: string }>;
  sendErc20Asset: (tokenAddress: string, to: string, amount: string, decimals: number, priority?: 'low' | 'medium' | 'high') => Promise<{ success: boolean; hash?: string; error?: string }>;
  estimateGasFee: (to: string, valueEth: string, priority?: 'low' | 'medium' | 'high') => Promise<{ gasLimit: string; feeEth: string; maxFeeGwei?: number; priorityFeeGwei?: number; estimatedWaitSec?: number; estimatedUsdCost?: number } | null>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const STORAGE_CUSTOM_TOKENS_KEY = 'rv_web3_custom_tokens';
const STORAGE_AUTH_TOKEN_KEY = 'rv_web3_auth_token';

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnected: false,
    isConnecting: false,
    connector: null,
    error: null,
  });

  const [balances, setBalances] = useState<UserBalance[]>([]);
  const [customTokens, setCustomTokens] = useState<TokenInfo[]>([]);
  const [transactions, setTransactions] = useState<RecordedTransaction[]>([]);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  // Web3 Auth State
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Load saved custom tokens
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CUSTOM_TOKENS_KEY);
      if (saved) {
        setCustomTokens(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // Restore auth session if valid
  useEffect(() => {
    const savedToken = sessionStorage.getItem(STORAGE_AUTH_TOKEN_KEY);
    if (savedToken) {
      fetch('/api/auth/session', {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.session) {
            setAuthSession({ ...data.session, token: savedToken });
          } else {
            sessionStorage.removeItem(STORAGE_AUTH_TOKEN_KEY);
          }
        })
        .catch(() => sessionStorage.removeItem(STORAGE_AUTH_TOKEN_KEY));
    }
  }, []);

  // Get active network config
  const currentNetwork = wallet.chainId && NETWORKS[wallet.chainId] ? NETWORKS[wallet.chainId] : null;

  // Helper to get an ethers BrowserProvider from window.ethereum
  const getBrowserProvider = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      return new ethers.BrowserProvider((window as any).ethereum);
    }
    return null;
  }, []);

  // Helper to get fallback JsonRpcProvider for a chain
  const getRpcProvider = useCallback((chainId: number) => {
    const net = NETWORKS[chainId];
    if (!net || !net.rpcUrls.length) return null;
    return new ethers.JsonRpcProvider(net.rpcUrls[0]);
  }, []);

  // Connect wallet
  const connect = useCallback(async (connector: SupportedConnector = 'injected'): Promise<boolean> => {
    setWallet((prev) => ({ ...prev, isConnecting: true, error: null }));

    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setWallet((prev) => ({
        ...prev,
        isConnecting: false,
        error: 'Nenhum provedor Web3 (como MetaMask) detectado no navegador.',
      }));
      return false;
    }

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      if (!accounts || accounts.length === 0) {
        throw new Error('Nenhuma conta foi autorizada.');
      }

      setWallet({
        address: accounts[0],
        chainId,
        isConnected: true,
        isConnecting: false,
        connector,
        error: null,
      });

      return true;
    } catch (err: any) {
      let message = 'Falha ao conectar carteira.';
      if (err.code === 4001) {
        message = 'Conexão rejeitada pelo usuário.';
      } else if (err.message) {
        message = err.message;
      }
      setWallet((prev) => ({
        ...prev,
        isConnecting: false,
        error: message,
      }));
      return false;
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setWallet({
      address: null,
      chainId: null,
      isConnected: false,
      isConnecting: false,
      connector: null,
      error: null,
    });
    setBalances([]);
    setAuthSession(null);
    sessionStorage.removeItem(STORAGE_AUTH_TOKEN_KEY);
  }, []);

  // Switch or Add Network
  const switchNetwork = useCallback(async (targetChainId: number): Promise<boolean> => {
    if (typeof window === 'undefined' || !(window as any).ethereum) return false;
    const targetNet = NETWORKS[targetChainId];
    if (!targetNet) return false;

    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetNet.chainIdHex }],
      });
      return true;
    } catch (switchError: any) {
      // 4902 indicates that the chain has not been added to the wallet
      if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: targetNet.chainIdHex,
                chainName: targetNet.name,
                rpcUrls: targetNet.rpcUrls,
                nativeCurrency: targetNet.nativeCurrency,
                blockExplorerUrls: [targetNet.blockExplorerUrl],
              },
            ],
          });
          return true;
        } catch (addError: any) {
          setWallet((prev) => ({ ...prev, error: addError.message || 'Falha ao adicionar rede.' }));
          return false;
        }
      }
      setWallet((prev) => ({ ...prev, error: switchError.message || 'Falha ao trocar rede.' }));
      return false;
    }
  }, []);

  // Refresh Balances on active network
  const refreshBalances = useCallback(async () => {
    if (!wallet.address || !wallet.chainId) return;
    setIsLoadingBalances(true);

    try {
      const net = NETWORKS[wallet.chainId];
      const provider = getBrowserProvider() || getRpcProvider(wallet.chainId);

      if (!provider || !net) {
        setIsLoadingBalances(false);
        return;
      }

      // Fetch native balance
      let nativeBal = '0';
      try {
        const raw = await provider.getBalance(wallet.address);
        nativeBal = ethers.formatEther(raw);
      } catch (e) {
        console.warn('Native balance query failed:', e);
      }

      // Fetch prices from market endpoint
      let priceMap: Record<string, number> = { ETH: 2650, POL: 0.42, BNB: 590, BTC: 67800, USDT: 1, USDC: 1, DAI: 1 };
      try {
        const res = await fetch('/api/market/tickers');
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            json.data.forEach((t: any) => {
              priceMap[t.base] = t.price;
            });
          }
        }
      } catch {}

      const nativeSymbol = net.nativeCurrency.symbol;
      const nativePrice = priceMap[nativeSymbol] || (nativeSymbol.includes('ETH') ? priceMap['ETH'] : 1);
      const nativeNum = parseFloat(nativeBal) || 0;

      const userBalances: UserBalance[] = [
        {
          symbol: nativeSymbol,
          name: net.nativeCurrency.name,
          balance: nativeNum.toFixed(4),
          rawBalance: nativeBal,
          decimals: 18,
          address: 'NATIVE',
          isNative: true,
          priceUsd: nativePrice,
          valueUsd: parseFloat((nativeNum * nativePrice).toFixed(2)),
        },
      ];

      // Query standard tokens
      const standardTokens = net.tokens.filter((t) => !t.isNative);
      const allTokensToQuery = [...standardTokens, ...customTokens];

      for (const token of allTokensToQuery) {
        try {
          const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
          const rawBal = await contract.balanceOf(wallet.address);
          const formatted = ethers.formatUnits(rawBal, token.decimals);
          const balNum = parseFloat(formatted) || 0;
          const p = priceMap[token.symbol] || (token.symbol.includes('USD') ? 1.0 : 0);

          userBalances.push({
            symbol: token.symbol,
            name: token.name,
            balance: balNum.toFixed(4),
            rawBalance: formatted,
            decimals: token.decimals,
            address: token.address,
            isNative: false,
            priceUsd: p,
            valueUsd: parseFloat((balNum * p).toFixed(2)),
          });
        } catch (tokenErr) {
          // Token balance query failed (e.g. wrong chain or not deployed)
        }
      }

      setBalances(userBalances);
    } catch (err) {
      console.error('Error fetching balances:', err);
    } finally {
      setIsLoadingBalances(false);
    }
  }, [wallet.address, wallet.chainId, customTokens, getBrowserProvider, getRpcProvider]);

  // Add custom ERC-20 token by contract address
  const addCustomToken = useCallback(
    async (contractAddress: string): Promise<{ success: boolean; token?: TokenInfo; error?: string }> => {
      if (!wallet.chainId) return { success: false, error: 'Conecte sua carteira primeiro.' };
      if (!ethers.isAddress(contractAddress)) {
        return { success: false, error: 'Endereço de contrato ERC-20 inválido.' };
      }

      const provider = getBrowserProvider() || getRpcProvider(wallet.chainId);
      if (!provider) return { success: false, error: 'Provedor RPC indisponível.' };

      try {
        const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
        const [symbol, name, decimals] = await Promise.all([
          contract.symbol(),
          contract.name(),
          contract.decimals(),
        ]);

        const newToken: TokenInfo = {
          symbol,
          name,
          address: contractAddress,
          decimals: Number(decimals),
          isNative: false,
        };

        const updated = [...customTokens.filter((t) => t.address.toLowerCase() !== contractAddress.toLowerCase()), newToken];
        setCustomTokens(updated);
        localStorage.setItem(STORAGE_CUSTOM_TOKENS_KEY, JSON.stringify(updated));
        await refreshBalances();

        return { success: true, token: newToken };
      } catch (err: any) {
        return {
          success: false,
          error: 'Falha ao consultar contrato ERC-20 na rede atual. Verifique o endereço.',
        };
      }
    },
    [wallet.chainId, customTokens, getBrowserProvider, getRpcProvider, refreshBalances]
  );

  // Web3 Nonce-Based Signature Authentication
  const loginWithWeb3 = useCallback(async (): Promise<boolean> => {
    if (!wallet.address || !wallet.chainId) {
      setAuthError('Conecte sua carteira antes de autenticar.');
      return false;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      // 1. Request Nonce from Backend
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: wallet.address,
          chainId: wallet.chainId,
        }),
      });

      const nonceData = await nonceRes.json();
      if (!nonceRes.ok || !nonceData.success) {
        throw new Error(nonceData.error || 'Falha ao solicitar nonce ao servidor.');
      }

      const { nonce, message } = nonceData;

      // 2. Request User Signature via Connected Web3 Provider (EIP-191)
      const provider = getBrowserProvider();
      if (!provider) throw new Error('Provedor da carteira não encontrado.');

      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);

      // 3. Verify Signature & Nonce on Backend
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: wallet.address,
          signature,
          nonce,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Falha na verificação da assinatura.');
      }

      const session: AuthSession = {
        ...verifyData.session,
        token: verifyData.token,
      };

      setAuthSession(session);
      sessionStorage.setItem(STORAGE_AUTH_TOKEN_KEY, verifyData.token);
      setIsAuthenticating(false);
      return true;
    } catch (err: any) {
      let msg = 'Erro durante autenticação Web3.';
      if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
        msg = 'Assinatura cancelada pelo usuário na carteira.';
      } else if (err.message) {
        msg = err.message;
      }
      setAuthError(msg);
      setIsAuthenticating(false);
      return false;
    }
  }, [wallet.address, wallet.chainId, getBrowserProvider]);

  // Logout Web3
  const logoutWeb3 = useCallback(async () => {
    if (authSession?.token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authSession.token}` },
        });
      } catch {}
    }
    setAuthSession(null);
    sessionStorage.removeItem(STORAGE_AUTH_TOKEN_KEY);
  }, [authSession]);

  // Estimate Gas Fee for Native Transfer with Priority Tiers
  const estimateGasFee = useCallback(
    async (
      to: string,
      valueEth: string,
      priority: 'low' | 'medium' | 'high' = 'medium'
    ): Promise<{
      gasLimit: string;
      feeEth: string;
      maxFeeGwei?: number;
      priorityFeeGwei?: number;
      estimatedWaitSec?: number;
      estimatedUsdCost?: number;
    } | null> => {
      const provider = getBrowserProvider() || (wallet.chainId ? getRpcProvider(wallet.chainId) : null);
      if (!provider || !wallet.address || !ethers.isAddress(to)) return null;

      try {
        const parsedValue = ethers.parseEther(valueEth || '0');
        const [gasLimit, feeData] = await Promise.all([
          provider.estimateGas({
            from: wallet.address,
            to,
            value: parsedValue,
          }).catch(() => 21000n),
          provider.getFeeData(),
        ]);

        let maxFeeGwei = 20;
        let priorityFeeGwei = 1.5;
        let estimatedWaitSec = 15;
        let estimatedUsdCost = 0.5;

        // Fetch real-time gas tracker estimate
        try {
          const res = await fetch(`/api/gas/estimate?chainId=${wallet.chainId || 1}&priority=${priority}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              maxFeeGwei = data.maxFeeGwei;
              priorityFeeGwei = data.priorityFeeGwei;
              estimatedWaitSec = data.estimatedWaitSec;
              estimatedUsdCost = data.estimatedUsdCost;
            }
          }
        } catch {}

        const gasPrice = ethers.parseUnits(maxFeeGwei.toString(), 'gwei');
        const feeWei = gasLimit * gasPrice;
        const feeEth = ethers.formatEther(feeWei);

        return {
          gasLimit: gasLimit.toString(),
          feeEth: parseFloat(feeEth).toFixed(6),
          maxFeeGwei,
          priorityFeeGwei,
          estimatedWaitSec,
          estimatedUsdCost,
        };
      } catch (e) {
        return {
          gasLimit: '21000',
          feeEth: '0.000420',
          maxFeeGwei: 20,
          priorityFeeGwei: 1.5,
          estimatedWaitSec: 15,
          estimatedUsdCost: 0.5,
        };
      }
    },
    [getBrowserProvider, getRpcProvider, wallet.address, wallet.chainId]
  );

  // Send Native Asset with Priority Tier
  const sendNativeAsset = useCallback(
    async (
      to: string,
      amount: string,
      priority: 'low' | 'medium' | 'high' = 'medium'
    ): Promise<{ success: boolean; hash?: string; error?: string }> => {
      const provider = getBrowserProvider();
      if (!provider || !wallet.address || !wallet.chainId) {
        return { success: false, error: 'Carteira não conectada.' };
      }
      if (!ethers.isAddress(to)) {
        return { success: false, error: 'Endereço destinatário inválido.' };
      }

      try {
        const signer = await provider.getSigner();
        const value = ethers.parseEther(amount);

        // Fetch gas parameters for chosen priority
        let txOverrides: any = {};
        try {
          const res = await fetch(`/api/gas/estimate?chainId=${wallet.chainId}&priority=${priority}`);
          const gasInfo = await res.json();
          if (gasInfo.success && gasInfo.maxFeeGwei) {
            txOverrides.maxFeePerGas = ethers.parseUnits(gasInfo.maxFeeGwei.toString(), 'gwei');
            txOverrides.maxPriorityFeePerGas = ethers.parseUnits(gasInfo.priorityFeeGwei.toString(), 'gwei');
          }
        } catch {}

        const tx = await signer.sendTransaction({
          to,
          value,
          ...txOverrides,
        });

        const net = NETWORKS[wallet.chainId];
        const symbol = net ? net.nativeCurrency.symbol : 'ETH';

        // Register transaction in backend
        await fetch('/api/wallet/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hash: tx.hash,
            from: wallet.address,
            to,
            value: amount,
            symbol,
            chainId: wallet.chainId,
          }),
        }).catch(() => {});

        // Add to local state
        setTransactions((prev) => [
          {
            id: 'tx_' + Date.now(),
            hash: tx.hash,
            from: wallet.address!,
            to,
            value: amount,
            symbol,
            chainId: wallet.chainId!,
            status: 'pending',
            timestamp: Date.now(),
          },
          ...prev,
        ]);

        return { success: true, hash: tx.hash };
      } catch (err: any) {
        let msg = 'Erro ao enviar transação.';
        if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
          msg = 'Transação rejeitada na carteira.';
        } else if (err.message) {
          msg = err.message;
        }
        return { success: false, error: msg };
      }
    },
    [getBrowserProvider, wallet.address, wallet.chainId]
  );

  // Send ERC-20 Asset with Priority Tier
  const sendErc20Asset = useCallback(
    async (
      tokenAddress: string,
      to: string,
      amount: string,
      decimals: number,
      priority: 'low' | 'medium' | 'high' = 'medium'
    ): Promise<{ success: boolean; hash?: string; error?: string }> => {
      const provider = getBrowserProvider();
      if (!provider || !wallet.address || !wallet.chainId) {
        return { success: false, error: 'Carteira não conectada.' };
      }
      if (!ethers.isAddress(to)) {
        return { success: false, error: 'Endereço destinatário inválido.' };
      }

      try {
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
        const parsedAmount = ethers.parseUnits(amount, decimals);
        const symbol = await contract.symbol().catch(() => 'TOKEN');

        // Fetch gas parameters for chosen priority
        let txOverrides: any = {};
        try {
          const res = await fetch(`/api/gas/estimate?chainId=${wallet.chainId}&priority=${priority}`);
          const gasInfo = await res.json();
          if (gasInfo.success && gasInfo.maxFeeGwei) {
            txOverrides.maxFeePerGas = ethers.parseUnits(gasInfo.maxFeeGwei.toString(), 'gwei');
            txOverrides.maxPriorityFeePerGas = ethers.parseUnits(gasInfo.priorityFeeGwei.toString(), 'gwei');
          }
        } catch {}

        const tx = await contract.transfer(to, parsedAmount, txOverrides);

        // Register transaction in backend
        await fetch('/api/wallet/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hash: tx.hash,
            from: wallet.address,
            to,
            value: amount,
            symbol,
            chainId: wallet.chainId,
          }),
        }).catch(() => {});

        setTransactions((prev) => [
          {
            id: 'tx_' + Date.now(),
            hash: tx.hash,
            from: wallet.address!,
            to,
            value: amount,
            symbol,
            chainId: wallet.chainId!,
            status: 'pending',
            timestamp: Date.now(),
          },
          ...prev,
        ]);

        return { success: true, hash: tx.hash };
      } catch (err: any) {
        let msg = 'Erro ao transferir token ERC-20.';
        if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
          msg = 'Transferência rejeitada na carteira.';
        } else if (err.message) {
          msg = err.message;
        }
        return { success: false, error: msg };
      }
    },
    [getBrowserProvider, wallet.address, wallet.chainId]
  );

  // Listen to EIP-1193 events
  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).ethereum) return;
    const ethereum = (window as any).ethereum;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setWallet((prev) => ({
          ...prev,
          address: accounts[0],
          isConnected: true,
        }));
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const chainId = parseInt(chainIdHex, 16);
      setWallet((prev) => ({
        ...prev,
        chainId,
      }));
    };

    const handleDisconnect = () => {
      disconnect();
    };

    ethereum.on?.('accountsChanged', handleAccountsChanged);
    ethereum.on?.('chainChanged', handleChainChanged);
    ethereum.on?.('disconnect', handleDisconnect);

    return () => {
      ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
      ethereum.removeListener?.('chainChanged', handleChainChanged);
      ethereum.removeListener?.('disconnect', handleDisconnect);
    };
  }, [disconnect]);

  // Trigger balance fetch when wallet address or chainId changes
  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      refreshBalances();
    }
  }, [wallet.isConnected, wallet.address, wallet.chainId, refreshBalances]);

  // Load user transactions from backend
  useEffect(() => {
    if (wallet.address) {
      fetch(`/api/wallet/transactions?address=${wallet.address}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            setTransactions(json.data);
          }
        })
        .catch(() => {});
    }
  }, [wallet.address, wallet.chainId]);

  const isAuthenticated = !!authSession;
  const isAdmin = authSession?.role === 'admin';

  return (
    <WalletContext.Provider
      value={{
        wallet,
        currentNetwork,
        balances,
        customTokens,
        transactions,
        isLoadingBalances,
        authSession,
        isAuthenticated,
        isAdmin,
        isAuthenticating,
        authError,
        connect,
        disconnect,
        switchNetwork,
        refreshBalances,
        addCustomToken,
        loginWithWeb3,
        logoutWeb3,
        sendNativeAsset,
        sendErc20Asset,
        estimateGasFee,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
