import crypto from 'crypto';

export interface UserSession {
  sessionId: string;
  address: string;
  chainId: number;
  role: 'admin' | 'user';
  createdAt: number;
  expiresAt: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'rv_web3_secure_default_secret_key_change_in_production';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

class SessionStore {
  private activeSessions = new Map<string, UserSession>();

  /**
   * Generates a signed token encapsulating the session metadata with HMAC-SHA256 signature
   */
  public createSession(address: string, chainId: number): { token: string; session: UserSession } {
    const cleanAddress = address.toLowerCase();
    const adminAddress = (process.env.ADMIN_WALLET_ADDRESS || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8').toLowerCase();
    const role: 'admin' | 'user' = cleanAddress === adminAddress ? 'admin' : 'user';

    const sessionId = crypto.randomBytes(24).toString('hex');
    const now = Date.now();
    const expiresAt = now + SESSION_DURATION_MS;

    const session: UserSession = {
      sessionId,
      address: cleanAddress,
      chainId,
      role,
      createdAt: now,
      expiresAt,
    };

    this.activeSessions.set(sessionId, session);

    // Create compact token: base64(payload).signature
    const payloadStr = JSON.stringify({
      sid: sessionId,
      sub: cleanAddress,
      role,
      cid: chainId,
      exp: expiresAt,
    });

    const payloadBase64 = Buffer.from(payloadStr).toString('base64url');
    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(payloadBase64)
      .digest('base64url');

    const token = `${payloadBase64}.${signature}`;
    return { token, session };
  }

  /**
   * Verifies the cryptographic token signature and checks if session exists and is unexpired
   */
  public verifyToken(token: string): UserSession | null {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadBase64, providedSig] = parts;

    // Verify HMAC-SHA256
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(payloadBase64)
      .digest('base64url');

    // Constant-time comparison to prevent timing attacks
    if (providedSig.length !== expectedSig.length) return null;
    const isSigValid = crypto.timingSafeEqual(
      Buffer.from(providedSig),
      Buffer.from(expectedSig)
    );

    if (!isSigValid) return null;

    try {
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
      if (Date.now() > payload.exp) {
        if (payload.sid) this.activeSessions.delete(payload.sid);
        return null;
      }

      const session = this.activeSessions.get(payload.sid);
      if (!session) return null;

      return session;
    } catch {
      return null;
    }
  }

  public revokeSession(sessionId: string): boolean {
    return this.activeSessions.delete(sessionId);
  }

  public revokeAllForAddress(address: string): void {
    const cleanAddress = address.toLowerCase();
    for (const [id, session] of this.activeSessions.entries()) {
      if (session.address === cleanAddress) {
        this.activeSessions.delete(id);
      }
    }
  }
}

export const sessionStore = new SessionStore();
