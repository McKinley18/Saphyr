import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../database/db.js';
import { EmailService } from '../services/EmailService.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'saphyr-secret-key-2025';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true, // Always true for production cross-domain
  sameSite: 'none' as const, // Required for cross-domain cookies
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

export class AuthController {
  private static userResponse(user: any) {
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      last_login_at: user.last_login_at,
      auto_logout_minutes: user.auto_logout_minutes,
      two_factor_method: user.two_factor_method,
      accent_color: user.accent_color,
      currency_symbol: user.currency_symbol,
      visible_tabs: user.visible_tabs ? (typeof user.visible_tabs === 'string' ? JSON.parse(user.visible_tabs) : user.visible_tabs) : null,
      stealth_mode: !!user.stealth_mode
    };
  }

  static async signup(req: Request, res: Response) {
    try {
      const { email, password, full_name } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const existingUser = await db('users').where({ email }).first();
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const password_hash = await bcrypt.hash(password, 10);
      
      const [user] = await db('users').insert({
        email,
        password_hash,
        full_name: full_name || null
      }).returning('*');

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.cookie('token', token, COOKIE_OPTIONS);
      res.status(201).json({ user: AuthController.userResponse(user) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const user = await db('users').where({ email }).first();
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (user.two_factor_method === 'email') {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const codeHash = await bcrypt.hash(code, 10);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await db('users').where({ id: user.id }).update({
          two_factor_code: codeHash,
          two_factor_expires_at: expiresAt
        });

        await EmailService.send2FACode(user.email, code);

        return res.json({ 
          require_2fa: true, 
          email: user.email,
          userId: user.id 
        });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      await db('users').where({ id: user.id }).update({ 
        last_login_at: new Date() 
      });

      const updatedUser = await db('users').where({ id: user.id }).first();

      res.cookie('token', token, COOKIE_OPTIONS);
      res.json({ user: AuthController.userResponse(updatedUser) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async logout(req: Request, res: Response) {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
  }

  static async updatePassword(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const { currentPassword, newPassword } = req.body;

      const user = await db('users').where({ id: userId }).first();
      if (!user) return res.status(404).json({ error: 'User not found' });

      const isValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValid) return res.status(401).json({ error: 'Current password incorrect' });

      const newHash = await bcrypt.hash(newPassword, 10);
      await db('users').where({ id: userId }).update({ password_hash: newHash });

      res.json({ message: 'Password updated successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteAccount(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      await db('users').where({ id: userId }).del();
      res.clearCookie('token');
      res.json({ message: 'Account deleted' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async resetAccount(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      await db.transaction(async trx => {
        await trx('transactions').where({ user_id: userId }).del();
        await trx('accounts').where({ user_id: userId }).del();
        await trx('budget_categories').where({ user_id: userId }).del();
        await trx('income_sources').where({ user_id: userId }).del();
        await trx('salary_profiles').where({ user_id: userId }).del();
        await trx('tax_profiles').where({ user_id: userId }).del();
        await trx('savings_goals').where({ user_id: userId }).del();
        await trx('daily_snapshots').where({ user_id: userId }).del();
        await trx('custom_deductions').where({ user_id: userId }).del();
      });
      res.json({ message: 'Account has been reset to zero.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const user = await db('users').where({ email }).first();
      if (!user) return res.json({ message: 'If an account exists, a reset link has been sent' });

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000);

      await db('users').where({ id: user.id }).update({
        reset_token: resetToken,
        reset_token_expiry: resetTokenExpiry
      });

      await EmailService.sendResetEmail(email, resetToken);
      res.json({ message: 'If an account exists, a reset link has been sent' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;
      const user = await db('users')
        .where({ reset_token: token })
        .andWhere('reset_token_expiry', '>', new Date())
        .first();

      if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

      const password_hash = await bcrypt.hash(newPassword, 10);
      await db('users').where({ id: user.id }).update({
        password_hash,
        reset_token: null,
        reset_token_expiry: null
      });

      res.json({ message: 'Password has been reset successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updatePreferences(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const { auto_logout_minutes, two_factor_method, accent_color, currency_symbol, visible_tabs, stealth_mode } = req.body;

      const updateData: any = { updated_at: new Date() };
      if (auto_logout_minutes !== undefined) updateData.auto_logout_minutes = auto_logout_minutes;
      if (two_factor_method !== undefined) updateData.two_factor_method = two_factor_method;
      if (accent_color !== undefined) updateData.accent_color = accent_color;
      if (currency_symbol !== undefined) updateData.currency_symbol = currency_symbol;
      if (visible_tabs !== undefined) updateData.visible_tabs = JSON.stringify(visible_tabs);
      if (stealth_mode !== undefined) updateData.stealth_mode = stealth_mode;

      await db('users').where({ id: userId }).update(updateData);
      const updatedUser = await db('users').where({ id: userId }).first();

      res.json({ message: 'Preferences updated', user: AuthController.userResponse(updatedUser) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async verify2FA(req: Request, res: Response) {
    try {
      const { userId, code } = req.body;
      const user = await db('users').where({ id: userId }).first();
      
      if (!user || !user.two_factor_code || new Date() > new Date(user.two_factor_expires_at)) {
        return res.status(400).json({ error: 'Code expired or invalid. Please try logging in again.' });
      }

      const isValid = await bcrypt.compare(code, user.two_factor_code);
      if (!isValid) return res.status(401).json({ error: 'Invalid verification code' });

      await db('users').where({ id: user.id }).update({
        two_factor_code: null,
        two_factor_expires_at: null,
        last_login_at: new Date()
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', token, COOKIE_OPTIONS);
      res.json({ user: AuthController.userResponse(user) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
