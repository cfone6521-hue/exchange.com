import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ethers } from 'ethers';

export const walletRouter = Router();

export interface RecordedTx {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  symbol: string;
  chainId: number;
  type: 'transfer' | 'swap' | 'approval' | 'contract_interaction';
  toValue?: string;
  toSymbol?: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  blockNumber?: number;
  feeEth?: string;
}

// In-memory store for user submitted transactions
const transactionStore: RecordedTx[] = [];

// Track initialized addresses so we don't re-seed
const initializedAddresses = new Set<string>();

const SubmitTxSchema = z.object({
  hash: z.string().regex(/^0x([A-Fa-f0-9]{64})$/, 'Hash de transação Ethereum inválido.'),
  from: z.string().refine((val) => ethers.isAddress(val), 'Endereço de origem inválido.'),
  to: z.string().refine((val) => ethers.isAddress(val), 'Endereço de destino inválido.'),
  value: z.string(),
  symbol: z.string().min(1).max(10),
  chainId: z.number().int().positive(),
  type: z.enum(['transfer', 'swap', 'approval', 'contract_interaction']).optional().default('transfer'),
  toValue: z.string().optional(),
  toSymbol: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'failed']).optional().default('pending'),
  feeEth: z.string().optional(),
});

/**
 * Generates initial realistic on-chain transactions for an address if empty
 */
function seedInitialTransactions(address: string, chainId: number) {
  const normAddress = address.toLowerCase();
  const addressKey = `${normAddress}_${chainId}`;
  if (initializedAddresses.has(addressKey)) return;
  initializedAddresses.add(addressKey);

  const now = Date.now();
  const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

  const mockTxs: RecordedTx[] = [
    {
      id: 'tx_seed_1_' + normAddress.substring(2, 6),
      hash: '0x3a4b7f8e1c2d9a0e6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a',
      from: normAddress,
      to: UNISWAP_V3_ROUTER,
      value: '0.25',
      symbol: 'ETH',
      toValue: '662.50',
      toSymbol: 'USDT',
      chainId,
      type: 'swap',
      status: 'confirmed',
      timestamp: now - 18 * 60 * 1000, // 18 mins ago
      blockNumber: 19842100,
      feeEth: '0.00072',
    },
    {
      id: 'tx_seed_2_' + normAddress.substring(2, 6),
      hash: '0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e',
      from: normAddress,
      to: '0x388C818CA8B9251b393131C08a73683246A16699',
      value: '150.00',
      symbol: 'USDC',
      chainId,
      type: 'transfer',
      status: 'confirmed',
      timestamp: now - 3 * 3600 * 1000, // 3 hours ago
      blockNumber: 19841450,
      feeEth: '0.00035',
    },
    {
      id: 'tx_seed_3_' + normAddress.substring(2, 6),
      hash: '0x1c2b3a4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      from: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      to: normAddress,
      value: '0.50',
      symbol: 'ETH',
      chainId,
      type: 'transfer',
      status: 'confirmed',
      timestamp: now - 14 * 3600 * 1000, // 14 hours ago
      blockNumber: 19839800,
      feeEth: '0.00041',
    },
    {
      id: 'tx_seed_4_' + normAddress.substring(2, 6),
      hash: '0x8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c',
      from: normAddress,
      to: UNISWAP_V3_ROUTER,
      value: '250.00',
      symbol: 'USDT',
      toValue: '0.094',
      toSymbol: 'ETH',
      chainId,
      type: 'swap',
      status: 'confirmed',
      timestamp: now - 28 * 3600 * 1000, // 28 hours ago
      blockNumber: 19836200,
      feeEth: '0.00085',
    },
  ];

  transactionStore.push(...mockTxs);
}

/**
 * GET /api/wallet/transactions?address=0x...&chainId=1&type=all|transfer|swap&status=all|confirmed|pending
 */
walletRouter.get('/transactions', (req: Request, res: Response) => {
  const address = (req.query.address as string)?.toLowerCase();
  const chainId = req.query.chainId ? parseInt(req.query.chainId as string) : undefined;
  const typeFilter = req.query.type as string | undefined;
  const statusFilter = req.query.status as string | undefined;

  if (address && chainId) {
    seedInitialTransactions(address, chainId);
  }

  let filtered = [...transactionStore];

  if (address) {
    filtered = filtered.filter(
      (tx) => tx.from.toLowerCase() === address || tx.to.toLowerCase() === address
    );
  }

  if (chainId) {
    filtered = filtered.filter((tx) => tx.chainId === chainId);
  }

  if (typeFilter && typeFilter !== 'all') {
    filtered = filtered.filter((tx) => tx.type === typeFilter);
  }

  if (statusFilter && statusFilter !== 'all') {
    filtered = filtered.filter((tx) => tx.status === statusFilter);
  }

  // Simulate pending transactions confirming after 20 seconds
  const now = Date.now();
  filtered.forEach((tx) => {
    if (tx.status === 'pending' && now - tx.timestamp > 20000) {
      tx.status = 'confirmed';
      if (!tx.blockNumber) tx.blockNumber = 19842200 + Math.floor(Math.random() * 50);
    }
  });

  return res.json({
    success: true,
    data: filtered.sort((a, b) => b.timestamp - a.timestamp),
  });
});

/**
 * POST /api/wallet/transactions
 * Registers a transaction submitted by the client wallet
 */
walletRouter.post('/transactions', (req: Request, res: Response) => {
  const parseResult = SubmitTxSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: parseResult.error.issues[0]?.message || 'Dados de transação inválidos.',
    });
  }

  const { hash, from, to, value, symbol, chainId, type, toValue, toSymbol, status, feeEth } = parseResult.data;

  // Check if already registered
  const existing = transactionStore.find((t) => t.hash.toLowerCase() === hash.toLowerCase());
  if (existing) {
    return res.json({ success: true, data: existing });
  }

  const newTx: RecordedTx = {
    id: 'tx_' + Math.random().toString(36).substring(2, 9),
    hash,
    from,
    to,
    value,
    symbol,
    chainId,
    type,
    toValue,
    toSymbol,
    status,
    timestamp: Date.now(),
    feeEth: feeEth || '0.00045',
  };

  transactionStore.unshift(newTx);
  if (transactionStore.length > 500) {
    transactionStore.pop();
  }

  return res.json({ success: true, data: newTx });
});
