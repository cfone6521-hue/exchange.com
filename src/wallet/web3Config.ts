import { createConfig, http } from 'wagmi'
import { mainnet, polygon, bsc, arbitrum, optimism, base, sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [mainnet, polygon, bsc, arbitrum, optimism, base, sepolia],
  connectors: [injected()],
  transports: {
    [mainnet.id]: http(import.meta.env.VITE_RPC_URL_ETHEREUM),
    [polygon.id]: http('https://polygon-rpc.com'),
    [bsc.id]: http('https://bsc-dataseed.binance.org'),
    [arbitrum.id]: http('https://arb1.arbitrum.io/rpc'),
    [optimism.id]: http('https://mainnet.optimism.io'),
    [base.id]: http('https://mainnet.base.org'),
    [sepolia.id]: http('https://rpc.sepolia.org'),
  },
})

export const chainNames: Record<number, string> = {
  1: 'Ethereum',
  137: 'Polygon',
  56: 'BNB Chain',
  42161: 'Arbitrum',
  10: 'Optimism',
  8453: 'Base',
  11155111: 'Sepolia',
}
