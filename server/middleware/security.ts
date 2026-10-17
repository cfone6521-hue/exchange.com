import { Request, Response, NextFunction } from 'express';
import { sessionStore, UserSession } from '../auth/sessionStore';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: UserSession;
    }
  }
}

// In-memory token bucket rate limiter
const ipRequests = new Map<string, { count: number; resetAt: number }>();

export function rateLimiter(limit: number = 100, windowMs: number = 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = ipRequests.get(ip);

    if (!record || now > record.resetAt) {
      ipRequests.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= limit) {
      return res.status(429).json({
        success: false,
        error: 'Muitas requisições. Por favor, aguarde alguns instantes.',
      });
    }

    record.count++;
    next();
  };
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

/**
 * Authentication middleware that verifies the Bearer session token
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Autenticação necessária. Token de sessão ausente.',
    });
  }

  const token = authHeader.substring(7);
  const session = sessionStore.verifyToken(token);

  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Sessão inválida ou expirada. Faça login novamente com sua carteira.',
    });
  }

  req.user = session;
  next();
}

/**
 * Guard that requires admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Acesso negado. Esta rota exige privilégios de administrador.',
    });
  }
  next();
}
