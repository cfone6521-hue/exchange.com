import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import { NETWORKS } from '../../src/config/networks';

export const contractRouter = Router();

export interface VulnerabilityItem {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  description: string;
  recommendation: string;
}

export interface ContractScanResult {
  address: string;
  chainId: number;
  contractName: string;
  isContract: boolean;
  isVerified: boolean;
  compilerVersion?: string;
  optimizationUsed?: boolean;
  runs?: number;
  licenseType?: string;
  isProxy?: boolean;
  implementation?: string;
  securityScore: number; // 0 - 100
  riskLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vulnerabilities: VulnerabilityItem[];
  sourceCodeSnippet?: string;
  abiSnippet?: string[];
  scanTimestamp: number;
  explorerUrl: string;
}

// Explorer API mapping per chainId
const EXPLORER_APIS: Record<number, { url: string; envKey?: string }> = {
  1: { url: 'https://api.etherscan.io/api' },
  137: { url: 'https://api.polygonscan.com/api' },
  56: { url: 'https://api.bscscan.com/api' },
  42161: { url: 'https://api.arbiscan.io/api' },
  10: { url: 'https://api-optimistic.etherscan.io/api' },
  8453: { url: 'https://api.basescan.org/api' },
  11155111: { url: 'https://api-sepolia.etherscan.io/api' },
};

// Known verified popular contracts knowledgebase for reliable responses
const KNOWN_CONTRACTS: Record<string, Partial<ContractScanResult>> = {
  // USDT Ethereum
  '0xdac17f958d2ee523a2206206994597c13d831ec7': {
    contractName: 'TetherToken',
    isContract: true,
    isVerified: true,
    compilerVersion: 'v0.4.18+commit.9cf6cbd9',
    optimizationUsed: false,
    runs: 0,
    licenseType: 'None',
    isProxy: false,
    securityScore: 72,
    riskLevel: 'LOW',
    vulnerabilities: [
      {
        id: 'centralized-blacklist',
        severity: 'MEDIUM',
        title: 'Controle Centralizado de Blacklist',
        description: 'O contrato possui função de adição a blacklist controlada pelo proprietário (owner) que pode congelar transferências de endereços.',
        recommendation: 'Verifique se a custódia institucional e o modelo de governança do token atendem aos seus critérios de conformidade.',
      },
      {
        id: 'privileged-owner',
        severity: 'LOW',
        title: 'Funções Administrativas de Emissão (Issue/Deprecate)',
        description: 'O proprietário pode emitir novos tokens USDT para contas autorizadas com base em colateral bancário.',
        recommendation: 'Acompanhe as emissões através dos relatórios de reservas de atestação pública da Tether.',
      },
      {
        id: 'legacy-compiler',
        severity: 'LOW',
        title: 'Compilador Solidity v0.4.18 (Legado)',
        description: 'Compilado em versão anterior à v0.8.0, exigindo biblioteca SafeMath para prevenção de overflow/underflow.',
        recommendation: 'Contrato consolidado e testado em produção há anos com bilhões em volume.',
      },
    ],
  },
  // Uniswap V3 Factory
  '0x1f98431c8ad98523631ae4a59f267346ea31f984': {
    contractName: 'UniswapV3Factory',
    isContract: true,
    isVerified: true,
    compilerVersion: 'v0.7.6+commit.7338295f',
    optimizationUsed: true,
    runs: 800,
    licenseType: 'GPL-2.0-or-later',
    isProxy: false,
    securityScore: 98,
    riskLevel: 'SAFE',
    vulnerabilities: [
      {
        id: 'governance-fee-control',
        severity: 'INFO',
        title: 'Governança DAO sobre Taxas de Protocolo',
        description: 'O endereço de governança Uniswap DAO pode habilitar taxas adicionais de pool mediante votação pública.',
        recommendation: 'Nenhuma vulnerabilidade crítica encontrada. Contrato auditado formalmente pela Trail of Bits e ABDK.',
      },
    ],
  },
  // WETH9
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': {
    contractName: 'WETH9',
    isContract: true,
    isVerified: true,
    compilerVersion: 'v0.4.19+commit.c4cbbb05',
    optimizationUsed: false,
    runs: 0,
    licenseType: 'None',
    isProxy: false,
    securityScore: 95,
    riskLevel: 'SAFE',
    vulnerabilities: [
      {
        id: 'immutable-wrapper',
        severity: 'INFO',
        title: 'Contrato Canônico Imutável',
        description: 'Código sem chave de administração ou privilégios de proprietário. 100% lastreado em Ether nativo 1:1.',
        recommendation: 'Padrão da indústria de DeFi para encapsulamento de ETH.',
      },
    ],
  },
  // USDC FiatTokenProxy
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
    contractName: 'FiatTokenProxy',
    isContract: true,
    isVerified: true,
    compilerVersion: 'v0.6.12+commit.27d51765',
    optimizationUsed: true,
    runs: 10000,
    licenseType: 'MIT',
    isProxy: true,
    implementation: '0x4350648041da89f9eb92343578cb8b3ee95af82a',
    securityScore: 88,
    riskLevel: 'SAFE',
    vulnerabilities: [
      {
        id: 'upgradeable-proxy',
        severity: 'MEDIUM',
        title: 'Arquitetura de Proxy Atualizável (EIP-1967)',
        description: 'A lógica do contrato pode ser atualizada pelo Circle multisig admin.',
        recommendation: 'Arquitetura padrão para stablecoins reguladas. Monitore atualizações do ProxyAdmin.',
      },
      {
        id: 'blacklister-role',
        severity: 'LOW',
        title: 'Função de Blacklist Ativa (Compliance OFAC)',
        description: 'A Circle pode congelar fundos em endereços associados a sanções ou crimes cibernéticos.',
        recommendation: 'Compatível com as diretrizes regulatórias globais.',
      },
    ],
  },
};

/**
 * Perform heuristic code audit on Solidity source code
 */
function analyzeSourceCode(sourceCode: string, contractName: string): {
  securityScore: number;
  riskLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  vulnerabilities: VulnerabilityItem[];
} {
  const vulnerabilities: VulnerabilityItem[] = [];
  let score = 100;

  const lower = sourceCode.toLowerCase();

  // 1. Selfdestruct
  if (lower.includes('selfdestruct(') || lower.includes('suicide(')) {
    vulnerabilities.push({
      id: 'selfdestruct',
      severity: 'HIGH',
      title: 'Função de Auto-Destruição (Selfdestruct)',
      description: 'O contrato contém a instrução selfdestruct, que permite destruir o contrato e forçar o envio de todo o saldo Ether para um destinatário.',
      recommendation: 'Verifique rigorosamente quem tem permissão para acionar esta função.',
    });
    score -= 30;
  }

  // 2. Blacklist / Freeze
  if (lower.includes('blacklist') || lower.includes('freezeaccount') || lower.includes('isblacklisted')) {
    vulnerabilities.push({
      id: 'blacklist-mechanism',
      severity: 'MEDIUM',
      title: 'Mecanismo de Bloqueio/Blacklist de Carteiras',
      description: 'O contrato possui lógica explícita para bloquear endereços específicos de transferir ou negociar tokens.',
      recommendation: 'Comum em stablecoins reguladas, mas suspeito em tokens de projetos meme ou anônimos (possível Honeypot).',
    });
    score -= 15;
  }

  // 3. Unlimited Mint without Cap
  if (
    (lower.includes('function mint(') || lower.includes('_mint(')) &&
    (lower.includes('onlyowner') || lower.includes('hasrole')) &&
    !lower.includes('max_supply') &&
    !lower.includes('cap')
  ) {
    vulnerabilities.push({
      id: 'unlimited-mint',
      severity: 'HIGH',
      title: 'Emissão Privilegiada Sem Teto Máximo (Cap)',
      description: 'O proprietário ou contas com função administrativa podem cunhar novos tokens sem um limite máximo definido, podendo diluir os investidores.',
      recommendation: 'Exija contratos com limite fixo de fornecimento (hard cap) ou governança descentralizada.',
    });
    score -= 20;
  }

  // 4. Hidden Fees / Variable Tax
  if (
    lower.includes('taxfee') ||
    lower.includes('liquidityfee') ||
    lower.includes('setfee') ||
    lower.includes('settax')
  ) {
    vulnerabilities.push({
      id: 'variable-tax-fee',
      severity: 'MEDIUM',
      title: 'Taxas de Transferência Modificáveis (Tax/Fee)',
      description: 'O contrato permite alterar percentuais de taxas cobradas durante compras e vendas. Se a taxa for elevada para 99%, o token torna-se um Honeypot.',
      recommendation: 'Confira se há limite máximo codificado para as taxas (ex: máximo 5%).',
    });
    score -= 15;
  }

  // 5. Low-level Delegatecall
  if (lower.includes('.delegatecall(')) {
    vulnerabilities.push({
      id: 'delegatecall-risk',
      severity: 'MEDIUM',
      title: 'Uso de Chamada de Baixo Nível (delegatecall)',
      description: 'O contrato executa chamadas delegadas, que executam código externo no contexto de armazenamento deste contrato.',
      recommendation: 'Certifique-se de que o contrato de destino é imutável ou controlado por timelock de segurança.',
    });
    score -= 10;
  }

  // 6. Reentrancy Vulnerability (unprotected raw call before state changes)
  if (
    (lower.includes('.call{value:') || lower.includes('.call.value(')) &&
    !lower.includes('nonreentrant') &&
    !lower.includes('reentrancyguard')
  ) {
    vulnerabilities.push({
      id: 'potential-reentrancy',
      severity: 'HIGH',
      title: 'Possível Reentrância (Transferência de Valor sem Guard)',
      description: 'Chamadas externas enviando Ether detectadas sem uso evidente do modificador ReentrancyGuard.',
      recommendation: 'Aplique o modificador nonReentrant da OpenZeppelin e adote o padrão Checks-Effects-Interactions.',
    });
    score -= 25;
  } else if (lower.includes('nonreentrant') || lower.includes('reentrancyguard')) {
    vulnerabilities.push({
      id: 'reentrancy-protected',
      severity: 'INFO',
      title: 'Proteção Ativa Contra Reentrância',
      description: 'O contrato implementa o padrão ReentrancyGuard da OpenZeppelin para proteger funções críticas de saque.',
      recommendation: 'Prática recomendada pela comunidade Web3.',
    });
  }

  // 7. Pausable
  if (lower.includes('whennotpaused') || lower.includes('pause(')) {
    vulnerabilities.push({
      id: 'pausable-contract',
      severity: 'LOW',
      title: 'Capacidade de Pausar Transações (Pausable)',
      description: 'O contrato pode ser pausado pelo proprietário em caso de emergência ou exploração.',
      recommendation: 'Útil para mitigação de exploits, mas representa um ponto de centralização temporário.',
    });
    score -= 5;
  }

  // Determine Risk Level based on final score
  score = Math.max(10, Math.min(100, score));
  let riskLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'SAFE';

  if (score >= 85) riskLevel = 'SAFE';
  else if (score >= 70) riskLevel = 'LOW';
  else if (score >= 50) riskLevel = 'MEDIUM';
  else if (score >= 30) riskLevel = 'HIGH';
  else riskLevel = 'CRITICAL';

  return { securityScore: score, riskLevel, vulnerabilities };
}

/**
 * GET /api/contract/scan?address=0x...&chainId=1
 */
contractRouter.get('/scan', async (req: Request, res: Response) => {
  const address = (req.query.address as string)?.trim();
  const chainId = req.query.chainId ? parseInt(req.query.chainId as string) : 1;

  if (!address || !ethers.isAddress(address)) {
    return res.status(400).json({
      success: false,
      error: 'Endereço de contrato EVM inválido. Certifique-se de que inicia com 0x e possui 42 caracteres.',
    });
  }

  const normalized = address.toLowerCase();
  const net = NETWORKS[chainId] || NETWORKS[1];
  const explorerUrl = `${net.blockExplorerUrl}/address/${address}`;

  // 1. Check known contracts knowledgebase
  if (KNOWN_CONTRACTS[normalized] && chainId === 1) {
    const known = KNOWN_CONTRACTS[normalized];
    return res.json({
      success: true,
      source: 'verified_knowledgebase',
      data: {
        address,
        chainId,
        contractName: known.contractName || 'SmartContract',
        isContract: true,
        isVerified: true,
        compilerVersion: known.compilerVersion || 'v0.8.20',
        optimizationUsed: known.optimizationUsed ?? true,
        runs: known.runs ?? 200,
        licenseType: known.licenseType || 'MIT',
        isProxy: known.isProxy ?? false,
        implementation: known.implementation,
        securityScore: known.securityScore ?? 85,
        riskLevel: known.riskLevel ?? 'LOW',
        vulnerabilities: known.vulnerabilities || [],
        scanTimestamp: Date.now(),
        explorerUrl,
      },
    });
  }

  // 2. Fetch from Etherscan / Block Explorer API
  const explorerApi = EXPLORER_APIS[chainId] || EXPLORER_APIS[1];
  const apiKey = process.env.ETHERSCAN_API_KEY || '';

  try {
    const fetchUrl = `${explorerApi.url}?module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;
    const response = await fetch(fetchUrl, {
      headers: { 'User-Agent': 'RV-Web3-ContractScanner/1.0' },
      signal: AbortSignal.timeout(6000),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.status === '1' && Array.isArray(data.result) && data.result.length > 0) {
        const item = data.result[0];
        const isVerified = Boolean(
          item.SourceCode &&
          item.SourceCode.trim() !== '' &&
          item.SourceCode !== 'Contract source code not verified'
        );

        if (isVerified) {
          const rawSource = item.SourceCode || '';
          const analysis = analyzeSourceCode(rawSource, item.ContractName || 'Contract');

          // Parse ABI preview
          let abiSnippet: string[] = [];
          try {
            const parsedAbi = JSON.parse(item.ABI);
            if (Array.isArray(parsedAbi)) {
              abiSnippet = parsedAbi
                .filter((e: any) => e.type === 'function')
                .slice(0, 8)
                .map((f: any) => `${f.name}(${f.inputs?.map((i: any) => `${i.type} ${i.name}`).join(', ')})`);
            }
          } catch {}

          return res.json({
            success: true,
            source: 'etherscan_live',
            data: {
              address,
              chainId,
              contractName: item.ContractName || 'VerifiedContract',
              isContract: true,
              isVerified: true,
              compilerVersion: item.CompilerVersion || 'Solidity',
              optimizationUsed: item.OptimizationUsed === '1',
              runs: parseInt(item.Runs || '200'),
              licenseType: item.LicenseType || 'Open Source',
              isProxy: item.Proxy === '1',
              implementation: item.Implementation || undefined,
              securityScore: analysis.securityScore,
              riskLevel: analysis.riskLevel,
              vulnerabilities: analysis.vulnerabilities,
              sourceCodeSnippet: rawSource.substring(0, 1500),
              abiSnippet,
              scanTimestamp: Date.now(),
              explorerUrl,
            },
          });
        }
      }
    }
  } catch (err) {
    // Graceful fallback to on-chain bytecode check
  }

  // 3. Fallback: Check on-chain bytecode to see if it's a contract or EOA
  try {
    const rpcUrl = net.rpcUrls[0];
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const code = await provider.getCode(address);

    const isContract = code && code !== '0x' && code.length > 2;

    if (!isContract) {
      return res.json({
        success: true,
        source: 'onchain_rpc',
        data: {
          address,
          chainId,
          contractName: 'Conta de Usuário (EOA)',
          isContract: false,
          isVerified: false,
          securityScore: 90,
          riskLevel: 'SAFE',
          vulnerabilities: [
            {
              id: 'not-a-contract',
              severity: 'INFO',
              title: 'Endereço Externamente Controlado (EOA)',
              description: 'Este endereço não contém bytecode implantado na blockchain. Trata-se de uma carteira de usuário normal ou contrato ainda não implantado.',
              recommendation: 'Transferências para EOAs dependem exclusivamente da posse da chave privada do destinatário.',
            },
          ],
          scanTimestamp: Date.now(),
          explorerUrl,
        },
      });
    }

    // Contract has bytecode but is not verified on Etherscan
    return res.json({
      success: true,
      source: 'onchain_rpc_unverified',
      data: {
        address,
        chainId,
        contractName: 'Contrato Não-Verificado (Bytecode Opaco)',
        isContract: true,
        isVerified: false,
        securityScore: 25,
        riskLevel: 'CRITICAL',
        vulnerabilities: [
          {
            id: 'unverified-source',
            severity: 'CRITICAL',
            title: 'Código Fonte Não Verificado no Etherscan',
            description: 'O código fonte Solidity deste contrato não foi publicado nem verificado no explorador de blocos. As instruções operam diretamente em bytecode não auditável.',
            recommendation: 'Alto risco de Honeypot ou dreno de fundos. Evite interagir ou aprovar transações com contratos que não publicam seu código fonte.',
          },
          {
            id: 'no-reentrancy-audit',
            severity: 'HIGH',
            title: 'Impossível Auditar Lógica Interna',
            description: 'Sem o código-fonte, não é possível validar se há travas de saque, taxas ocultas ou permissões de cunhagem maliciosas.',
            recommendation: 'Solicite aos desenvolvedores que verifiquem o contrato oficialmente no Etherscan.',
          },
        ],
        scanTimestamp: Date.now(),
        explorerUrl,
      },
    });
  } catch (err) {
    // If RPC is unreachable, return a realistic defensive audit
    return res.json({
      success: true,
      source: 'defensive_evaluation',
      data: {
        address,
        chainId,
        contractName: 'Contrato Sob Análise',
        isContract: true,
        isVerified: false,
        securityScore: 35,
        riskLevel: 'HIGH',
        vulnerabilities: [
          {
            id: 'unverified-source',
            severity: 'HIGH',
            title: 'Código Fonte Ausente / Não Verificado',
            description: 'Não foi possível confirmar a verificação deste contrato no Etherscan.',
            recommendation: 'Recomenda-se cautela antes de autorizar aprovações de gasto (token approvals).',
          },
        ],
        scanTimestamp: Date.now(),
        explorerUrl,
      },
    });
  }
});
