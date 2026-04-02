import { Router } from 'express';
import { AccountController } from '../controllers/AccountController.js';
import { TransactionController } from '../controllers/TransactionController.js';
import { TaxController } from '../controllers/TaxController.js';
import { SalaryProfileController } from '../controllers/SalaryProfileController.js';
import { BudgetController } from '../controllers/BudgetController.js';
import { IncomeSourceController } from '../controllers/IncomeSourceController.js';
import { SnapshotController } from '../controllers/SnapshotController.js';
import { SavingsGoalController } from '../controllers/SavingsGoalController.js';
import { AuthController } from '../controllers/AuthController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import db from '../database/db.js';

const router = Router();

// Public Auth Routes
router.post('/auth/signup', AuthController.signup);
router.post('/auth/login', AuthController.login);
router.post('/auth/logout', AuthController.logout);
router.post('/auth/verify-2fa', AuthController.verify2FA);
router.post('/auth/forgot-password', AuthController.forgotPassword);
router.post('/auth/reset-password', AuthController.resetPassword);

// Protected Routes (Require JWT)
router.use(authMiddleware);

// User/Settings Routes
router.post('/auth/update-password', AuthController.updatePassword);
router.post('/auth/reset-account', AuthController.resetAccount);
router.put('/auth/preferences', AuthController.updatePreferences);
router.delete('/auth/delete-account', AuthController.deleteAccount);

// TOTP Routes
router.post('/auth/totp/setup', AuthController.setupTOTP);
router.post('/auth/totp/verify', AuthController.verifyTOTPSetup);
router.post('/auth/totp/disable', AuthController.disableTOTP);

// Account Routes (Hardened with RLS)
router.post('/accounts', AccountController.createAccount);
router.get('/accounts', AccountController.getAccounts);
router.get('/accounts/:id', AccountController.getAccountById);
router.put('/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;
    const updatedCount = await db('accounts').where({ id, user_id: userId }).update(req.body);
    if (updatedCount === 0) return res.status(403).json({ error: 'Unauthorized or not found' });
    res.json({ message: 'Account updated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
router.delete('/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;
    const deletedCount = await db('accounts').where({ id, user_id: userId }).del();
    if (deletedCount === 0) return res.status(403).json({ error: 'Unauthorized or not found' });
    res.json({ message: 'Account deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Transaction Routes
router.post('/transactions', TransactionController.createTransaction);
router.get('/transactions', TransactionController.getTransactions);
router.delete('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).userId;
    const deletedCount = await db('transactions').where({ id, user_id: userId }).del();
    if (deletedCount === 0) return res.status(403).json({ error: 'Unauthorized or not found' });
    res.json({ message: 'Transaction deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Tax Routes
router.get('/tax/estimate', TaxController.getEstimate);
router.post('/tax/seed-brackets', TaxController.seedBrackets);
router.get('/tax/profile', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const profile = await db('tax_profiles').where({ user_id: userId }).first();
    res.json(profile || { filing_status: 'single' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
router.post('/tax/profile', async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { filing_status } = req.body;
    const existing = await db('tax_profiles').where({ user_id: userId }).first();
    if (existing) {
      await db('tax_profiles').where({ user_id: userId }).update({ filing_status, updated_at: new Date() });
    } else {
      await db('tax_profiles').insert({ user_id: userId, filing_status });
    }
    res.json({ message: 'Tax profile updated' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Salary Routes
router.get('/salary', SalaryProfileController.getSalaryProfile);
router.post('/salary', SalaryProfileController.updateSalaryProfile);
router.post('/salary/deductions', SalaryProfileController.addCustomDeduction);
router.delete('/salary/deductions/:id', SalaryProfileController.deleteCustomDeduction);

// Budget Routes
router.get('/budgets', BudgetController.getBudgets);
router.post('/budgets', BudgetController.createBudget);
router.delete('/budgets/:id', BudgetController.deleteBudget);

// Income Source Routes
router.get('/income-sources', IncomeSourceController.getSources);
router.post('/income-sources', IncomeSourceController.createSource);
router.delete('/income-sources/:id', IncomeSourceController.deleteSource);

// Snapshot Routes
router.get('/snapshots', SnapshotController.getSnapshots);
router.post('/snapshots', SnapshotController.createSnapshot);

// Savings Goals Routes
router.get('/goals', SavingsGoalController.getGoals);
router.post('/goals', SavingsGoalController.createGoal);
router.put('/goals/:id', SavingsGoalController.updateGoal);
router.delete('/goals/:id', SavingsGoalController.deleteGoal);

export default router;
