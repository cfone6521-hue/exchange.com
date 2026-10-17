import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../middleware/security';
import { auditLogger } from '../services/auditLogger';

export const adminRouter = Router();

interface NetworkRpcConfig {
  id: string;
  name: string;
  chainId: number;
  rpcUrl: string;
  currency: string;
}

const NETWORKS: NetworkRpcConfig[] = [
  {
    id: 'ethereum',
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: process.env.RPC_ETHEREUM || 'https://rpc.ankr.com/eth',
    currency: 'ETH',
  },
  {
    id: 'polygon',
    name: 'Polygon PoS',
    chainId: 137,
    rpcUrl: process.env.RPC_POLYGON || 'https://polygon-rpc.com',
    currency: 'POL',
  },
  {
    id: 'bsc',
    name: 'BNB Smart Chain',
    chainId: 56,
    rpcUrl: process.env.RPC_BSC || 'https://bsc-dataseed.binance.org',
    currency: 'BNB',
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum One',
    chainId: 42161,
    rpcUrl: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
    currency: 'ETH',
  },
  {
    id: 'optimism',
    name: 'Optimism Mainnet',
    chainId: 10,
    rpcUrl: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
    currency: 'ETH',
  },
  {
    id: 'base',
    name: 'Base Mainnet',
    chainId: 8453,
    rpcUrl: process.env.RPC_BASE || 'https://mainnet.base.org',
    currency: 'ETH',
  },
  {
    id: 'sepolia',
    name: 'Sepolia Testnet',
    chainId: 11155111,
    rpcUrl: process.env.RPC_SEPOLIA || 'https://rpc.sepolia.org',
    currency: 'SepoliaETH',
  },
];

/**
 * GET /api/admin/rpc-status
 * Performs live ping and block number retrieval across all 7 supported chains
 */
adminRouter.get('/rpc-status', async (_req: Request, res: Response) => {
  const results = await Promise.all(
    NETWORKS.map(async (net) => {
      const startTime = performance.now();
      try {
        const response = await fetch(net.rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: 1,
          }),
          signal: AbortSignal.timeout(5000),
        });

        const latencyMs = Math.round(performance.now() - startTime);

        if (response.ok) {
          const json: any = await response.json();
          if (json.result) {
            const blockNumber = parseInt(json.result, 16);
            return {
              id: net.id,
              name: net.name,
              chainId: net.chainId,
              rpcUrl: net.rpcUrl.replace(/(\/v[0-9]\/)[a-zA-Z0-9_-]+/, '$1***'), // Mask secret keys in URLs if any
              status: 'online',
              latencyMs,
              blockNumber,
              lastChecked: new Date().toISOString(),
            };
          }
        }

        return {
          id: net.id,
          name: net.name,
          chainId: net.chainId,
          rpcUrl: net.rpcUrl,
          status: 'degraded',
          latencyMs,
          blockNumber: null,
          lastChecked: new Date().toISOString(),
        };
      } catch (err: any) {
        return {
          id: net.id,
          name: net.name,
          chainId: net.chainId,
          rpcUrl: net.rpcUrl,
          status: 'offline',
          latencyMs: Math.round(performance.now() - startTime),
          blockNumber: null,
          error: err.name === 'TimeoutError' ? 'Timeout (>5000ms)' : 'Falha na conexão RPC',
          lastChecked: new Date().toISOString(),
        };
      }
    })
  );

  return res.json({ success: true, timestamp: Date.now(), networks: results });
});

/**
 * GET /api/admin/metrics
 * System metrics (Node.js runtime, memory, uptime, admin address)
 */
adminRouter.get('/metrics', requireAuth, requireAdmin, (req: Request, res: Response) => {
  const memory = process.memoryUsage();
  return res.json({
    success: true,
    server: {
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        rssMb: Math.round(memory.rss / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(memory.heapTotal / (1024 * 1024)),
      },
      configuredAdmin: process.env.ADMIN_WALLET_ADDRESS || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      currentUser: req.user?.address,
    },
  });
});

/**
 * GET /api/admin/audit-logs
 * Protected audit logs for security monitoring
 */
adminRouter.get('/audit-logs', requireAuth, requireAdmin, (_req: Request, res: Response) => {
  const logs = auditLogger.getEvents(60);
  return res.json({ success: true, count: logs.length, logs });
});
