# RV.Web3 — Exchange & Wallet

Plataforma profissional de exchange de criptomoedas e carteira digital Web3 com backend próprio em Node.js/TypeScript, integração direta a 7 redes blockchain EVM (Ethereum, Polygon, BSC, Arbitrum, Optimism, Base e Sepolia), autenticação criptográfica off-chain (EIP-191/SIWE) com proteção anti-replay, livro de ofertas em tempo real e swap descentralizado Uniswap V3.

---

## 1. Arquitetura do Sistema

```
rv-web3/
├── server/                      # Backend REST API em Node.js (TypeScript)
│   ├── auth/                    # Armazenamento e validação de nonces & sessões
│   │   ├── nonceStore.ts        # Geração criptográfica, TTL de 5 min e proteção anti-replay
│   │   └── sessionStore.ts      # Emissão de tokens de sessão assinados com HMAC-SHA256
│   ├── middleware/              # Cabeçalhos de segurança, CORS e rate limiting
│   │   └── security.ts          # Rate limiter em memória e guards de autenticação
│   ├── routes/                  # Endpoints REST
│   │   ├── authRoutes.ts        # /api/auth/nonce, /verify, /session, /logout
│   │   ├── gasRoutes.ts         # /api/gas/tracker (7 redes), /api/gas/estimate (tiers)
│   │   ├── marketRoutes.ts      # /api/market/tickers, /depth, /candles (Binance feed)
│   │   ├── adminRoutes.ts       # /api/admin/rpc-status (ping em 7 redes), /metrics, /audit-logs
│   │   └── walletRoutes.ts      # /api/wallet/transactions (registro de hashes on-chain)
│   └── services/
│       └── auditLogger.ts       # Trilha de auditoria sanitizada (sem chaves nem segredos)
├── src/                         # Frontend React 19 SPA (Tailwind CSS v4)
│   ├── assets/                  # Identidade visual e imagens de alta fidelidade
│   ├── config/
│   │   └── networks.ts          # Configuração completa das 7 redes EVM, RPCs e tokens
│   ├── wallet/
│   │   ├── types.ts             # Tipagem estrita TypeScript (estados, transações, sessões)
│   │   └── WalletContext.tsx    # Hook central: EIP-1193, consulta de saldo, envio e assinatura
│   └── components/
│       ├── Header.tsx           # Top bar contract com seletor de rede, idioma e status Web3
│       ├── WalletView.tsx       # Visão do portfólio, envio com estimativa de gas, QR code e tokens
│       ├── ExchangeView.tsx     # Terminal de trading, livro de ofertas e gráfico de candles
│       ├── SwapView.tsx         # Roteamento Uniswap V3, aprovação ERC-20 e slippage
│       ├── MarketsView.tsx      # Tabela consolidada de ativos digitais em tempo real
│       ├── AdminView.tsx        # Painel com ping de latência RPC e métricas do servidor
│       └── Web3AuthModal.tsx    # Modal explicativo do desafio criptográfico SIWE
├── tests/
│   └── auth.test.ts             # Suíte de testes unitários para o fluxo de autenticação Web3
├── server.ts                    # Entry point full-stack Express + Vite Middleware
├── .env.example                 # Modelo de variáveis de ambiente seguras
└── package.json
```

---

## 2. Redes Blockchain Suportadas

| Rede | Chain ID | Moeda Nativa | Roteador Uniswap V3 | Explorador |
|---|---|---|---|---|
| **Ethereum Mainnet** | 1 | ETH | `0xE592427A0AEce92De3Edee1F18E0157C05861564` | [Etherscan](https://etherscan.io) |
| **Polygon PoS** | 137 | POL (MATIC) | `0xE592427A0AEce92De3Edee1F18E0157C05861564` | [Polygonscan](https://polygonscan.com) |
| **BNB Smart Chain** | 56 | BNB | `0xB3010b9e8A126D00F6236b3D5E4e29A72251a3F4` | [BscScan](https://bscscan.com) |
| **Arbitrum One** | 42161 | ETH | `0xE592427A0AEce92De3Edee1F18E0157C05861564` | [Arbiscan](https://arbiscan.io) |
| **Optimism** | 10 | ETH | `0xE592427A0AEce92De3Edee1F18E0157C05861564` | [Optimistic Etherscan](https://optimistic.etherscan.io) |
| **Base** | 8453 | ETH | `0x2626664c2603336E57B271c5C0b26F421741e481` | [Basescan](https://basescan.org) |
| **Sepolia Testnet** | 11155111 | SepoliaETH | `0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E` | [Sepolia Etherscan](https://sepolia.etherscan.io) |

---

## 3. Fluxo de Autenticação Criptográfica Web3 (SIWE)

1. **Solicitação do Nonce**: O frontend faz `POST /api/auth/nonce` passando o endereço da carteira e o `chainId`.
2. **Geração Segura**: O backend gera um nonce com 32 bytes de entropia criptográfica (`crypto.randomBytes(32)`), com expiração de 5 minutos, e constrói a mensagem padronizada EIP-4361.
3. **Assinatura do Usuário**: A carteira conectada solicita ao usuário que assine a mensagem via `personal_sign` (EIP-191). Não há custo de gas.
4. **Verificação & Proteção Anti-Replay**: O frontend envia `POST /api/auth/verify` com endereço, assinatura e nonce. O backend:
   - Recupera o endereço do signatário via `ethers.verifyMessage`.
   - Verifica se o nonce existe, pertence àquele endereço e não expirou.
   - **Consome o nonce imediatamente**, impedindo que qualquer invasor reutilize a assinatura (ataque de replay).
   - Emite um token de sessão assinado com HMAC-SHA256 contendo os privilégios (User ou Admin).

---

## 4. Instalação e Execução Local

### Pré-requisitos
- Node.js 20+ ou 22+
- Gerenciador de pacotes npm

### Passos
```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/rv-web3.git
cd rv-web3

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env

# 4. Execute a suíte de testes de autenticação
npm test

# 5. Inicie o servidor de desenvolvimento full-stack
npm run dev
```

O aplicativo estará acessível em `http://localhost:3000`.

---

## 5. Como Testar em Rede de Testes (Sepolia)

1. Abra a sua carteira MetaMask ou Coinbase Wallet.
2. Certifique-se de que a rede **Sepolia** está habilitada.
3. Obtenha tokens de teste gratuitos em um faucet oficial:
   - [Google Cloud Web3 Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)
   - [Alchemy Sepolia Faucet](https://sepoliafaucet.com)
4. No aplicativo RV.Web3, conecte sua carteira e selecione a rede **Sepolia Testnet** no seletor de redes do cabeçalho.
5. Seus saldos de SepoliaETH serão consultados em tempo real diretamente da blockchain.
6. Teste o envio de ativos para outro endereço, inspecione a estimativa de gas e confirme a transação na sua carteira.

---

## 6. Checklist de Segurança para Produção

- [x] **Zero Chaves Privadas**: O frontend e o backend nunca coletam nem armazenam frases-semente ou chaves privadas de usuários.
- [x] **Assinaturas EIP-191**: Toda ação sensível ou financeira exige a confirmação explícita na carteira do usuário.
- [x] **Proteção Anti-Replay**: Nonces de autenticação expiram em 5 minutos e são destruídos no primeiro uso.
- [x] **Rate Limiting Ativo**: Proteção contra força bruta em endpoints de API (150 req/min por IP).
- [x] **Cabeçalhos HTTP Seguros**: Configurados `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` e `Referrer-Policy`.
- [x] **Logs Sanitizados**: O `auditLogger` remove automaticamente chaves, tokens e dados sensíveis antes de registrar eventos.
- [x] **Validação com Zod**: Todos os payloads de entrada passam por validação de formato e esquema.

---

## 7. Instruções de Implantação (Deploy)

### Frontend (Hospedagem Estática: Vercel, Netlify ou GitHub Pages)
Execute:
```bash
npm run build
```
O diretório `dist/` conterá os arquivos estáticos otimizados. Caso hospede apenas o frontend em GitHub Pages, configure uma variável `VITE_API_URL` apontando para o seu backend Node.js.

### Backend (Node.js: Render, Railway, Google Cloud Run ou VPS)
1. Configure as variáveis de ambiente no painel do provedor conforme o `.env.example`:
   - `PORT=3000`
   - `JWT_SECRET`: uma chave aleatória de pelo menos 64 caracteres.
   - `ADMIN_WALLET_ADDRESS`: o endereço público da carteira com privilégios de administrador.
   - RPCs privadas opcionais (Infura/Alchemy) para garantir alta taxa de transferência.
2. Comando de inicialização:
```bash
npm start
```
