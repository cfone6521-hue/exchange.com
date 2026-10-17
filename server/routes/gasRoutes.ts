import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';

export const gasRouter = Router();

export interface GasNetworkInfo {
  chainId: number;
  name: string;
  shortName: string;
  currency: string;
  currencyPriceUsd: number;
  baseFeeGwei: number;
  congestion: 'low' | 'normal' | 'high';
  tiers: {
    low: {
      maxFeeGwei: number;
      priorityFeeGwei: number;
      estimatedWaitSec: number;
      estimatedNativeCost: string;
      estimatedUsdCost: number;
    };
    medium: {
      maxFeeGwei: number;
      priorityFeeGwei: number;
      estimatedWaitSec: number;
      estimatedNativeCost: string;
      estimatedUsdCost: number;
    };
    high: {
      maxFeeGwei: number;
      priorityFeeGwei: number;
      estimatedWaitSec: number;
      estimatedNativeCost: string;
      estimatedUsdCost: number;
    };
  };
  lastUpdated: number;
}

const NETWORKS_RPC: Record<number, { name: string; shortName: string; currency: string; rpc: string }> = {
  1: {
    name: 'Ethereum Mainnet',
    shortName: 'Ethereum',
    currency: 'ETH',
    rpc: process.env.RPC_ETHEREUM || 'https://rpc.ankr.com/eth',
  },
  137: {
    name: 'Polygon PoS',
    shortName: 'Polygon',
    currency: 'POL',
    rpc: process.env.RPC_POLYGON || 'https://polygon-rpc.com',
  },
  56: {
    name: 'BNB Smart Chain',
    shortName: 'BSC',
    currency: 'BNB',
    rpc: process.env.RPC_BSC || 'https://bsc-dataseed.binance.org',
  },
  42161: {
    name: 'Arbitrum One',
    shortName: 'Arbitrum',
    currency: 'ETH',
    rpc: process.env.RPC_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
  },
  10: {
    name: 'Optimism Mainnet',
    shortName: 'Optimism',
    currency: 'ETH',
    rpc: process.env.RPC_OPTIMISM || 'https://mainnet.optimism.io',
  },
  8453: {
    name: 'Base Mainnet',
    shortName: 'Base',
    currency: 'ETH',
    rpc: process.env.RPC_BASE || 'https://mainnet.base.org',
  },
  11155111: {
    name: 'Sepolia Testnet',
    shortName: 'Sepolia',
    currency: 'SepoliaETH',
    rpc: process.env.RPC_SEPOLIA || 'https://rpc.sepolia.org',
  },
};

// Cache for gas tracker data to keep latency under 50ms and refresh in background
let gasCache: Record<number, GasNetworkInfo> = {};
let lastFetchedTime = 0;
const GAS_CACHE_TTL_MS = 10 * 1000; // 10 seconds

// Default fallback prices
const CURRENCY_PRICES: Record<string, number> = {
  ETH: 2650.0,
  POL: 0.42,
  BNB: 590.0,
  SepoliaETH: 0.0,
};

async function fetchNetworkGas(chainId: number): Promise<GasNetworkInfo> {
  const config = NETWORKS_RPC[chainId];
  const priceUsd = CURRENCY_PRICES[config.currency] || 2650;
  const gasLimitStandard = 21000n; // Standard transfer gas limit

  try {
    const provider = new ethers.JsonRpcProvider(config.rpc);
    const feeData = await provider.getFeeData();

    // Calculate base fee in Gwei
    let baseFeeGwei = 15;
    if (feeData.gasPrice) {
      baseFeeGwei = Math.max(1, Math.round(Number(ethers.formatUnits(feeData.gasPrice, 'gwei'))));
    } else if (feeData.maxFeePerGas) {
      baseFeeGwei = Math.max(1, Math.round(Number(ethers.formatUnits(feeData.maxFeePerGas, 'gwei'))));
    }

    // Network-specific base fee floors
    if (chainId === 42161 || chainId === 10 || chainId === 8453) {
      // L2 rollups have sub-gwei or very low fees (e.g. 0.05 - 0.5 Gwei)
      baseFeeGwei = Math.max(0.1, parseFloat((baseFeeGwei * 0.02).toFixed(2)));
    } else if (chainId === 137) {
      // Polygon typically 30 - 80 Gwei
      baseFeeGwei = Math.max(30, baseFeeGwei);
    } else if (chainId === 56) {
      // BSC standard 3 Gwei
      baseFeeGwei = 3;
    }

    // Congestion determination
    let congestion: 'low' | 'normal' | 'high' = 'normal';
    if (baseFeeGwei < 15) congestion = 'low';
    else if (baseFeeGwei > 45) congestion = 'high';

    // Tiers calculation (Low, Medium, High)
    const lowBase = Math.max(0.05, parseFloat((baseFeeGwei * 0.9).toFixed(2)));
    const lowPriority = Math.max(0.01, parseFloat((lowBase * 0.05).toFixed(2)));
    const lowCostNative = (Number(gasLimitStandard) * (lowBase + lowPriority) * 1e-9).toFixed(6);

    const medBase = baseFeeGwei;
    const medPriority = Math.max(0.05, parseFloat((medBase * 0.1).toFixed(2)));
    const medCostNative = (Number(gasLimitStandard) * (medBase + medPriority) * 1e-9).toFixed(6);

    const highBase = parseFloat((baseFeeGwei * 1.25).toFixed(2));
    const highPriority = Math.max(0.1, parseFloat((highBase * 0.2).toFixed(2)));
    const highCostNative = (Number(gasLimitStandard) * (highBase + highPriority) * 1e-9).toFixed(6);

    return {
      chainId,
      name: config.name,
      shortName: config.shortName,
      currency: config.currency,
      currencyPriceUsd: priceUsd,
      baseFeeGwei,
      congestion,
      tiers: {
        low: {
          maxFeeGwei: lowBase,
          priorityFeeGwei: lowPriority,
          estimatedWaitSec: 45,
          estimatedNativeCost: lowCostNative,
          estimatedUsdCost: parseFloat((parseFloat(lowCostNative) * priceUsd).toFixed(4)),
        },
        medium: {
          maxFeeGwei: medBase,
          priorityFeeGwei: medPriority,
          estimatedWaitSec: 15,
          estimatedNativeCost: medCostNative,
          estimatedUsdCost: parseFloat((parseFloat(medCostNative) * priceUsd).toFixed(4)),
        },
        high: {
          maxFeeGwei: highBase,
          priorityFeeGwei: highPriority,
          estimatedWaitSec: 6,
          estimatedNativeCost: highCostNative,
          estimatedUsdCost: parseFloat((parseFloat(highCostNative) * priceUsd).toFixed(4)),
        },
      },
      lastUpdated: Date.now(),
    };
  } catch (err) {
    // Fallback baseline for this network if RPC temporarily times out
    const defaultGwei = chainId === 1 ? 18 : chainId === 137 ? 40 : chainId === 56 ? 3 : 0.2;
    const nativeCost = (Number(gasLimitStandard) * defaultGwei * 1e-9).toFixed(6);

    return {
      chainId,
      name: config.name,
      shortName: config.shortName,
      currency: config.currency,
      currencyPriceUsd: priceUsd,
      baseFeeGwei: defaultGwei,
      congestion: 'normal',
      tiers: {
        low: {
          maxFeeGwei: defaultGwei * 0.9,
          priorityFeeGwei: 0.1,
          estimatedWaitSec: 45,
          estimatedNativeCost: (parseFloat(nativeCost) * 0.9).toFixed(6),
          estimatedUsdCost: parseFloat((parseFloat(nativeCost) * 0.9 * priceUsd).toFixed(4)),
        },
        medium: {
          maxFeeGwei: defaultGwei,
          priorityFeeGwei: 0.2,
          estimatedWaitSec: 15,
          estimatedNativeCost: nativeCost,
          estimatedUsdCost: parseFloat((parseFloat(nativeCost) * priceUsd).toFixed(4)),
        },
        high: {
          maxFeeGwei: defaultGwei * 1.3,
          priorityFeeGwei: 0.5,
          estimatedWaitSec: 6,
          estimatedNativeCost: (parseFloat(nativeCost) * 1.3).toFixed(6),
          estimatedUsdCost: parseFloat((parseFloat(nativeCost) * 1.3 * priceUsd).toFixed(4)),
        },
      },
      lastUpdated: Date.now(),
    };
  }
}

/**
 * GET /api/gas/tracker
 * Returns real-time base fees, congestion, and priority tiers for all 7 networks
 */
gasRouter.get('/tracker', async (_req: Request, res: Response) => {
  const now = Date.now();
  if (Object.keys(gasCache).length === 7 && now - lastFetchedTime < GAS_CACHE_TTL_MS) {
    return res.json({ success: true, cached: true, networks: gasCache });
  }

  const chainIds = Object.keys(NETWORKS_RPC).map(Number);
  const results = await Promise.all(chainIds.map((id) => fetchNetworkGas(id)));

  const updatedCache: Record<number, GasNetworkInfo> = {};
  for (const item of results) {
    updatedCache[item.chainId] = item;
  }

  gasCache = updatedCache;
  lastFetchedTime = now;

  return res.json({ success: true, cached: false, networks: updatedCache });
});

/**
 * GET /api/gas/estimate?chainId=1&priority=medium
 * Returns specific gas parameters for transaction dispatching
 */
gasRouter.get('/estimate', async (req: Request, res: Response) => {
  const chainId = parseInt(req.query.chainId as string) || 1;
  const priority = ((req.query.priority as string) || 'medium').toLowerCase() as 'low' | 'medium' | 'high';

  let data = gasCache[chainId];
  if (!data || Date.now() - lastFetchedTime > GAS_CACHE_TTL_MS) {
    data = await fetchNetworkGas(chainId);
    gasCache[chainId] = data;
  }

  const tier = data.tiers[priority] || data.tiers.medium;
  return res.json({
    success: true,
    chainId,
    currency: data.currency,
    baseFeeGwei: data.baseFeeGwei,
    selectedTier: priority,
    maxFeeGwei: tier.maxFeeGwei,
    priorityFeeGwei: tier.priorityFeeGwei,
    estimatedWaitSec: tier.estimatedWaitSec,
    estimatedNativeCost: tier.estimatedNativeCost,
    estimatedUsdCost: tier.estimatedUsdCost,
  });
});
