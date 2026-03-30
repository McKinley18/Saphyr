import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../database/db.js';
import { EmailService } from '../services/EmailService.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'saphyr-secret-key-2025';

export class AuthController {
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
      }).returning(['id', 'email', 'full_name']);

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({ user, token });
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

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        user: { id: user.id, email: user.email, full_name: user.full_name },
        token
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async updatePassword(req: AuthRequest, res: Response) {
    try {
      const userId = req.userId;
      const { currentPassword, newPassword } = req.body;

      const user = await db('users').where({ id: userId }).first();
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Current password incorrect' });
      }

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
      res.json({ message: 'Account deleted' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const user = await db('users').where({ email }).first();

      if (!user) {
        return res.json({ message: 'If an account exists, a reset link has been sent' });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

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

      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

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
}
