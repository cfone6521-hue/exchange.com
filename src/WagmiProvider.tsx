import { config } from './wallet/web3Config'
import { WagmiProvider } from 'wagmi'

export function WagmiProviderWrapper({ children }: { children: React.ReactNode }) {
  return <WagmiProvider config={config}>{children}</WagmiProvider>
}
