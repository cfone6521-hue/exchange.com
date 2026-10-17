import crypto from 'crypto';

export interface NonceRecord {
  nonce: string;
  address: string;
  chainId: number;
  message: string;
  issuedAt: number;
  expiresAt: number;
  used: boolean;
}

// In-memory store for nonces with automatic TTL cleanup
// In a distributed production deployment, this can be backed by Redis
class NonceStore {
  private nonces = new Map<string, NonceRecord>();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes expiration

  constructor() {
    // Run cleanup every 60 seconds
    setInterval(() => this.cleanup(), 60 * 1000).unref();
  }

  /**
   * Generates a cryptographically secure random nonce and constructs
   * a standardized EIP-4361 / SIWE style message for the user to sign.
   */
  public createNonce(address: string, chainId: number, domain: string = 'rv-web3.app'): NonceRecord {
    const cleanAddress = address.toLowerCase();
    
    // Invalidate any prior active unused nonce for this address to prevent race conditions
    for (const [key, record] of this.nonces.entries()) {
      if (record.address === cleanAddress && !record.used) {
        this.nonces.delete(key);
      }
    }

    const nonce = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + this.TTL_MS;

    const issuedAtIso = new Date(now).toISOString();
    const expiresAtIso = new Date(expiresAt).toISOString();

    // Standardized secure human-readable message with SIWE structure
    const message = [
      `${domain} deseja que você entre com sua carteira Ethereum:`,
      cleanAddress,
      '',
      'Assine esta mensagem para autenticar sua sessão com segurança na plataforma RV.Web3.',
      'Esta solicitação não executará nenhuma transação e não cobrará nenhuma taxa de gas.',
      '',
      `URI: https://${domain}`,
      'Versão: 1',
      `ID da Rede (Chain ID): ${chainId}`,
      `Nonce: ${nonce}`,
      `Emitido Em (Issued At): ${issuedAtIso}`,
      `Expira Em (Expires At): ${expiresAtIso}`,
    ].join('\n');

    const record: NonceRecord = {
      nonce,
      address: cleanAddress,
      chainId,
      message,
      issuedAt: now,
      expiresAt,
      used: false,
    };

    this.nonces.set(nonce, record);
    return record;
  }

  /**
   * Validates if a nonce exists, matches the address, is unexpired and unused.
   * If valid, immediately marks it as used to protect against replay attacks.
   */
  public consumeNonce(nonce: string, address: string): { valid: boolean; reason?: string; record?: NonceRecord } {
    const record = this.nonces.get(nonce);

    if (!record) {
      return { valid: false, reason: 'Nonce não encontrado ou expirado.' };
    }

    if (record.used) {
      return { valid: false, reason: 'Ataque de Replay detectado: Este nonce já foi utilizado.' };
    }

    if (Date.now() > record.expiresAt) {
      this.nonces.delete(nonce);
      return { valid: false, reason: 'Nonce expirado. Solicite uma nova assinatura.' };
    }

    if (record.address !== address.toLowerCase()) {
      return { valid: false, reason: 'Endereço da carteira não corresponde ao nonce emitido.' };
    }

    // Mark as used immediately (Single-Use Replay Protection)
    record.used = true;
    this.nonces.delete(nonce); // Delete from pool to enforce single-use

    return { valid: true, record };
  }

  public get(nonce: string): NonceRecord | undefined {
    return this.nonces.get(nonce);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.nonces.entries()) {
      if (now > record.expiresAt || record.used) {
        this.nonces.delete(key);
      }
    }
  }
}

export const nonceStore = new NonceStore();
