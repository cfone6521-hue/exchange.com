export type SupportedConnector = 'metamask' | 'coinbase' | 'walletconnect' | 'injected';

export interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  connector: SupportedConnector | null;
  error: string | null;
}

export interface UserBalance {
  symbol: string;
  name: string;
  balance: string; // formatted decimal string, e.g. "1.2504"
  rawBalance: string;
  decimals: number;
  address: string;
  isNative: boolean;
  priceUsd: number;
  valueUsd: number;
}

export interface AuthSession {
  address: string;
  chainId: number;
  role: 'admin' | 'user';
  expiresAt: number;
  token: string;
}

export interface TransactionPreparation {
  to: string;
  amount: string;
  symbol: string;
  tokenAddress: string;
  isNative: boolean;
  estimatedGasWei?: string;
  estimatedGasFeeEth?: string;
}

export interface MarketTicker {
  symbol: string;
  name: string;
  base: string;
  quote: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  updatedAt: number;
}

export interface RecordedTransaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  symbol: string;
  chainId: number;
  type?: 'transfer' | 'swap' | 'approval' | 'contract_interaction';
  toValue?: string;
  toSymbol?: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  blockNumber?: number;
  feeEth?: string;
}


export interface PriceAlert {
  id: string;
  symbol: string;
  base: string;
  name: string;
  targetPrice: number;
  condition: 'gte' | 'lte'; // 'gte': price >= targetPrice, 'lte': price <= targetPrice
  initialPrice: number;
  createdAt: number;
  status: 'active' | 'triggered' | 'dismissed';
  triggeredAt?: number;
  triggeredPrice?: number;
  note?: string;
}

