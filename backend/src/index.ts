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

// 1. Security Headers (Helmet)
app.use(helmet());

// 2. Global Rate Limiter (Prevent DDoS)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api', limiter);

// 3. Auth Rate Limiter (Brute-force protection)
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts per hour
  message: 'Too many login attempts, please try again in an hour'
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);

// 4. Restricted CORS
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://saphyr-eight.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());

// Log all requests for auditing
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} [${res.statusCode}] - ${duration}ms`);
  });
  next();
});

// API Routes
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Saphyr Private API is running' });
});

// Startup: Ensure default user exists (Safeguard)
import db from './database/db.js';
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
