import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import { z } from 'zod';
import { nonceStore } from '../auth/nonceStore';
import { sessionStore } from '../auth/sessionStore';
import { requireAuth } from '../middleware/security';
import { auditLogger } from '../services/auditLogger';

export const authRouter = Router();

const NonceRequestSchema = z.object({
  address: z.string().refine((val) => ethers.isAddress(val), {
    message: 'Endereço Ethereum inválido.',
  }),
  chainId: z.number().int().positive().default(1),
});

const VerifyRequestSchema = z.object({
  address: z.string().refine((val) => ethers.isAddress(val), {
    message: 'Endereço Ethereum inválido.',
  }),
  signature: z.string().min(10, 'Assinatura criptográfica necessária.'),
  nonce: z.string().min(32, 'Nonce inválido.'),
});

/**
 * POST /api/auth/nonce
 * Generates a unique, cryptographically random nonce with 5-minute TTL
 * and formats the SIWE authentication message.
 */
authRouter.post('/nonce', (req: Request, res: Response) => {
  try {
    const parseResult = NonceRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Parâmetros inválidos.',
      });
    }

    const { address, chainId } = parseResult.data;
    const host = req.get('host') || 'rv-web3.app';
    const record = nonceStore.createNonce(address, chainId, host);

    auditLogger.log('AUTH_NONCE_ISSUED', address, {
      chainId,
      noncePrefix: record.nonce.substring(0, 8) + '...',
      expiresAt: new Date(record.expiresAt).toISOString(),
    });

    return res.json({
      success: true,
      nonce: record.nonce,
      message: record.message,
      expiresAt: record.expiresAt,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Falha interna ao gerar nonce de autenticação.',
    });
  }
});

/**
 * POST /api/auth/verify
 * Cryptographically verifies the EIP-191 personal_sign signature against the issued nonce.
 * Enforces single-use replay protection and issues a secure session token.
 */
authRouter.post('/verify', (req: Request, res: Response) => {
  try {
    const parseResult = VerifyRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Parâmetros inválidos.',
      });
    }

    const { address, signature, nonce } = parseResult.data;
    const cleanAddress = address.toLowerCase();

    // Check nonce existence before consuming to get the exact message to verify
    const pendingRecord = nonceStore.get(nonce);
    if (!pendingRecord) {
      auditLogger.log('AUTH_FAILED_NONCE_NOT_FOUND', cleanAddress, { noncePrefix: nonce.substring(0, 8) });
      return res.status(400).json({
        success: false,
        error: 'Nonce expirado ou inexistente. Solicite uma nova assinatura.',
      });
    }

    // Single-use consumption (defends against replay attacks)
    const consumeResult = nonceStore.consumeNonce(nonce, address);
    if (!consumeResult.valid || !consumeResult.record) {
      auditLogger.log('AUTH_FAILED_REPLAY_OR_EXPIRED', cleanAddress, { reason: consumeResult.reason });
      return res.status(401).json({
        success: false,
        error: consumeResult.reason || 'Falha na validação do nonce.',
      });
    }

    // Cryptographic recovery of the signer address from the signature
    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(pendingRecord.message, signature).toLowerCase();
    } catch (cryptoErr) {
      auditLogger.log('AUTH_FAILED_CRYPTO_ERROR', cleanAddress, { error: String(cryptoErr) });
      return res.status(400).json({
        success: false,
        error: 'Assinatura criptográfica malformada ou inválida.',
      });
    }

    // Verify recovered signer matches claimed address
    if (recoveredAddress !== cleanAddress) {
      auditLogger.log('AUTH_FAILED_SIGNER_MISMATCH', cleanAddress, {
        claimed: cleanAddress,
        recovered: recoveredAddress,
      });
      return res.status(401).json({
        success: false,
        error: 'Assinatura inválida: o endereço recuperado não corresponde à carteira conectada.',
      });
    }

    // Success! Generate signed session token
    const { token, session } = sessionStore.createSession(cleanAddress, pendingRecord.chainId);

    auditLogger.log('AUTH_SUCCESS', cleanAddress, {
      role: session.role,
      chainId: session.chainId,
      sessionId: session.sessionId.substring(0, 8) + '...',
    });

    return res.json({
      success: true,
      token,
      session: {
        address: session.address,
        chainId: session.chainId,
        role: session.role,
        expiresAt: session.expiresAt,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Erro no servidor ao processar verificação de assinatura.',
    });
  }
});

/**
 * GET /api/auth/session
 * Validates the current Bearer session token
 */
authRouter.get('/session', requireAuth, (req: Request, res: Response) => {
  return res.json({
    success: true,
    session: {
      address: req.user!.address,
      chainId: req.user!.chainId,
      role: req.user!.role,
      expiresAt: req.user!.expiresAt,
    },
  });
});

/**
 * POST /api/auth/logout
 * Revokes the current session token
 */
authRouter.post('/logout', requireAuth, (req: Request, res: Response) => {
  if (req.user) {
    sessionStore.revokeSession(req.user.sessionId);
    auditLogger.log('AUTH_LOGOUT', req.user.address, { sessionId: req.user.sessionId.substring(0, 8) });
  }
  return res.json({ success: true, message: 'Sessão encerrada com sucesso.' });
});
