import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { authRouter } from './server/routes/authRoutes';
import { marketRouter } from './server/routes/marketRoutes';
import { adminRouter } from './server/routes/adminRoutes';
import { walletRouter } from './server/routes/walletRoutes';
import { gasRouter } from './server/routes/gasRoutes';
import { contractRouter } from './server/routes/contractRoutes';
import { securityHeaders, rateLimiter } from './server/middleware/security';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // Global Middlewares
  app.use(express.json({ limit: '1mb' }));
  app.use(securityHeaders);
  app.use(rateLimiter(150, 60 * 1000)); // 150 requests per minute per IP

  // CORS setup
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // REST API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/market', marketRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/wallet', walletRouter);
  app.use('/api/gas', gasRouter);
  app.use('/api/contract', contractRouter);


  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'RV.Web3 Engine',
      timestamp: new Date().toISOString(),
    });
  });

  // Full-Stack: Vite Middleware in dev, Static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RV.Web3] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[RV.Web3] Failed to start server:', err);
  process.exit(1);
});
