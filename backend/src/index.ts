import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

// Log all requests for debugging
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
  res.json({ status: 'ok', message: 'Finance App API is running' });
});

// Startup: Ensure default user exists
import db from './database/db.js';
const USER_ID = '00000000-0000-0000-0000-000000000000';

const ensureDefaultUser = async () => {
  try {
    const user = await db('users').where({ id: USER_ID }).first();
    if (!user) {
      await db('users').insert({
        id: USER_ID,
        email: 'default@example.com',
        password_hash: 'placeholder',
        full_name: 'Default User'
      });
      console.log("✅ Created default system user");
    }
  } catch (e) {
    console.error("❌ Failed to ensure default user:", e);
  }
};

if (process.env.NODE_ENV !== 'test') {
  ensureDefaultUser();
}

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Backend Server is LIVE on port ${port}`);
  console.log(`🔗 Local URL: http://localhost:${port}`);
});
