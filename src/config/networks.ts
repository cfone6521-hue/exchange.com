export interface TokenInfo {
  symbol: string;
  name: string;
  address: string; // '0x...' or 'NATIVE'
  decimals: number;
  logoURI?: string;
  isNative?: boolean;
}

export interface NetworkConfig {
  id: string;
  name: string;
  shortName: string;
  chainId: number;
  chainIdHex: string;
  rpcUrls: string[];
  blockExplorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  uniswapV3Router?: string;
  tokens: TokenInfo[];
}

export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 value) returns (bool)',
  'function transfer(address to, uint256 value) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
];

export const NETWORKS: Record<number, NetworkConfig> = {
  1: {
    id: 'ethereum',
    name: 'Ethereum Mainnet',
    shortName: 'Ethereum',
    chainId: 1,
    chainIdHex: '0x1',
    rpcUrls: ['https://rpc.ankr.com/eth', 'https://eth.llamarpc.com', 'https://cloudflare-eth.com'],
    blockExplorerUrl: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    uniswapV3Router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    tokens: [
      { symbol: 'ETH', name: 'Ether (Native)', address: 'NATIVE', decimals: 18, isNative: true },
      { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
      { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
      { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
      { symbol: 'WBTC', name: 'Wrapped BTC', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
      { symbol: 'LINK', name: 'Chainlink', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18 },
      { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18 },
    ],
  },
  137: {
    id: 'polygon',
    name: 'Polygon PoS',
    shortName: 'Polygon',
    chainId: 137,
    chainIdHex: '0x89',
    rpcUrls: ['https://polygon-rpc.com', 'https://rpc.ankr.com/polygon', 'https://1rpc.io/matic'],
    blockExplorerUrl: 'https://polygonscan.com',
    nativeCurrency: {
      name: 'POL (MATIC)',
      symbol: 'POL',
      decimals: 18,
    },
    uniswapV3Router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    tokens: [
      { symbol: 'POL', name: 'Polygon (Native)', address: 'NATIVE', decimals: 18, isNative: true },
      { symbol: 'USDC', name: 'USD Coin (Native)', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 },
      { symbol: 'USDT', name: 'Tether USD', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
      { symbol: 'WETH', name: 'Wrapped Ether', address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18 },
      { symbol: 'WBTC', name: 'Wrapped BTC', address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', decimals: 8 },
    ],
  },
  56: {
    id: 'bsc',
    name: 'BNB Smart Chain',
    shortName: 'BSC',
    chainId: 56,
    chainIdHex: '0x38',
    rpcUrls: ['https://bsc-dataseed.binance.org', 'https://rpc.ankr.com/bsc', 'https://binance.llamarpc.com'],
    blockExplorerUrl: 'https://bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    uniswapV3Router: '0xB3010b9e8A126D00F6236b3D5E4e29A72251a3F4',
    tokens: [
      { symbol: 'BNB', name: 'BNB (Native)', address: 'NATIVE', decimals: 18, isNative: true },
      { symbol: 'BUSD', name: 'Binance USD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18 },
      { symbol: 'USDT', name: 'Tether USD', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
      { symbol: 'ETH', name: 'Binance-Peg Ethereum', address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', decimals: 18 },
      { symbol: 'CAKE', name: 'PancakeSwap Token', address: '0x0E09FaBB73BD3Ade0a17ECC321fD13a19e81cE82', decimals: 18 },
    ],
  },
  42161: {
    id: 'arbitrum',
    name: 'Arbitrum One',
    shortName: 'Arbitrum',
    chainId: 42161,
    chainIdHex: '0xa4b1',
    rpcUrls: ['https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum'],
    blockExplorerUrl: 'https://arbiscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    uniswapV3Router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    tokens: [
      { symbol: 'ETH', name: 'Ether (Native)', address: 'NATIVE', decimals: 18, isNative: true },
      { symbol: 'ARB', name: 'Arbitrum Token', address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18 },
      { symbol: 'USDC', name: 'USD Coin', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      { symbol: 'USDT', name: 'Tether USD', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
    ],
  },
  10: {
    id: 'optimism',
    name: 'Optimism Mainnet',
    shortName: 'Optimism',
    chainId: 10,
    chainIdHex: '0xa',
    rpcUrls: ['https://mainnet.optimism.io', 'https://rpc.ankr.com/optimism'],
    blockExplorerUrl: 'https://optimistic.etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    uniswapV3Router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    tokens: [
      { symbol: 'ETH', name: 'Ether (Native)', address: 'NATIVE', decimals: 18, isNative: true },
      { symbol: 'OP', name: 'Optimism Token', address: '0x4200000000000000000000000000000000000042', decimals: 18 },
      { symbol: 'USDC', name: 'USD Coin', address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6 },
      { symbol: 'USDT', name: 'Tether USD', address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', decimals: 6 },
    ],
  },
  8453: {
    id: 'base',
    name: 'Base Mainnet',
    shortName: 'Base',
    chainId: 8453,
    chainIdHex: '0x2105',
    rpcUrls: ['https://mainnet.base.org', 'https://base.llamarpc.com'],
    blockExplorerUrl: 'https://basescan.org',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    uniswapV3Router: '0x2626664c2603336E57B271c5C0b26F421741e481',
    tokens: [
      { symbol: 'ETH', name: 'Ether (Native)', address: 'NATIVE', decimals: 18, isNative: true },
      { symbol: 'USDC', name: 'USD Coin', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      { symbol: 'cbETH', name: 'Coinbase Wrapped Staked ETH', address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', decimals: 18 },
    ],
  },
  11155111: {
    id: 'sepolia',
    name: 'Sepolia Testnet',
    shortName: 'Sepolia',
    chainId: 11155111,
    chainIdHex: '0xaa36a7',
    rpcUrls: ['https://rpc.sepolia.org', 'https://sepolia.drpc.org'],
    blockExplorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'SepoliaETH',
      decimals: 18,
    },
    uniswapV3Router: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
    tokens: [
      { symbol: 'SepoliaETH', name: 'Sepolia Ether (Native)', address: 'NATIVE', decimals: 18, isNative: true },
      { symbol: 'USDC', name: 'Sepolia Test USDC', address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', decimals: 6 },
      { symbol: 'UNI', name: 'Uniswap Sepolia Test', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18 },
    ],
  },
};

export const SUPPORTED_CHAIN_IDS = Object.keys(NETWORKS).map(Number);
