import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import apiRoutes from './routes/api.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3001;

// 1. Audit Logging (Top-level visibility)
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'No Origin'}`);
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`✅ [${res.statusCode}] ${req.method} ${req.url} (${duration}ms)`);
  });
  next();
});

// 2. High-Stability CORS (MUST be before security and rate limiting)
const allowedOrigins = [
  'http://localhost:5173',
  'https://saphyr-eight.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin || process.env.NODE_ENV !== 'production') return callback(null, true);
    
    // Check if origin is in our allowed list (supports trailing slashes)
    const normalizedOrigin = origin.replace(/\/$/, "");
    const isAllowed = allowedOrigins.some(ao => ao && ao.replace(/\/$/, "") === normalizedOrigin);
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`🚨 CORS BLOCKED: Origin '${origin}' not in allowed list:`, allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200 // Some older browsers/proxies choke on 204
}));

// 3. Security Headers (Helmet) - Adjusted for Cross-Origin compatibility
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 4. Global Rate Limiter (Prevent DDoS)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Significantly increased to handle high-volume dashboard refreshes
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS', // EXTREMELY IMPORTANT: Never rate limit preflights
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api', limiter);

app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Saphyr Private API is running' });
});

// 5. Global Error Handler (Ensures errors still send CORS headers)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('🔥 Server Error:', err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal Server Error',
    type: err.name || 'Error'
  });
});

// Startup: Ensure default user exists (Safeguard)
import db from './database/db.js';
import { TaxService } from './services/TaxService.js';
const USER_ID = '00000000-0000-0000-0000-000000000000';

const ensureDefaultUser = async () => {
  try {
    const user = await db('users').where({ id: USER_ID }).first();
    if (!user) {
      await db('users').insert({
        id: USER_ID,
        email: 'default@example.com',
        password_hash: '$2b$10$placeholder', // Use a real hash in prod
        full_name: 'System Root'
      });
      console.log("🛡️ Root system user verified");
    }
    
    // Auto-seed tax brackets on startup
    await TaxService.seed2025Brackets();
  } catch (e) {
    console.error("❌ Security context failure:", e);
  }
};

if (process.env.NODE_ENV !== 'test') {
  ensureDefaultUser();
}

app.listen(port, '0.0.0.0', () => {
  console.log(`🛡️  Saphyr Security Layer: ACTIVE`);
  console.log(`✅ Backend Server is LIVE on port ${port}`);
});
