import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { Prisma } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma';
import { getJwtSecret } from '../lib/jwt';
import { validate } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import { registerSchema, loginSchema, updateProfileSchema, forgotPasswordSchema, resetPasswordSchema, googleAuthSchema } from '../validators/schemas';
import { sendPasswordResetEmail } from '../lib/email';
import crypto from 'crypto';

const router = Router();

// Rate limit for auth endpoints: 10 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: { success: false, error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: true },
  skipSuccessfulRequests: true, // only count failed attempts
});

// Rate limit for forgot-password: 3 requests per 15 minutes per IP
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 requests per windowMs
  message: { success: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false, default: true },
});

function generateToken(userId: string): string {
  const secret = getJwtSecret();
  return jwt.sign({ userId }, secret, { expiresIn: '7d' });
}

// POST /api/auth/register
router.post('/register', authLimiter, validate(registerSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, email } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      res.status(409).json({ success: false, error: 'Username already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { username, passwordHash, ...(email ? { email } : {}) },
    });

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          authProvider: user.authProvider,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = error.meta?.target as string[] | undefined;
      if (target?.includes('email')) {
        res.status(409).json({ success: false, error: 'Email already in use' });
        return;
      }
    }
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, validate(loginSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body;

    console.log(`[LOGIN] Attempt for username: "${username}"`);

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      console.log(`[LOGIN] User not found: "${username}"`);
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    if (!user.passwordHash) {
      console.log(`[LOGIN] User "${username}" has no password (Google-only account)`);
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    console.log(`[LOGIN] User found: "${username}", hash length: ${user.passwordHash.length}`);
    console.log(`[LOGIN] Password received: "${password}", length: ${password.length}`);
    console.log(`[LOGIN] Hash from DB: "${user.passwordHash}"`);

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    console.log(`[LOGIN] bcrypt.compare result: ${validPassword}`);

    if (!validPassword) {
      console.log(`[LOGIN] Password mismatch for user: "${username}"`);
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    console.log(`[LOGIN] Success for user: "${username}"`);
    const token = generateToken(user.id);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          authProvider: user.authProvider,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, username: true, email: true, authProvider: true, createdAt: true },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, validate(updateProfileSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { ...(email !== undefined ? { email } : {}) },
      select: { id: true, username: true, email: true, authProvider: true, createdAt: true },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = error.meta?.target as string[] | undefined;
      if (target?.includes('email')) {
        res.status(409).json({ success: false, error: 'Email already in use' });
        return;
      }
    }
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

      try {
        await sendPasswordResetEmail(email, resetUrl);
      } catch (emailError) {
        console.error('[forgot-password] Failed to send email:', emailError);
      }
    }

    // Always return 200 to prevent email enumeration
    res.json({
      success: true,
      data: { message: 'If an account with that email exists, a reset link has been sent.' },
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', validate(resetPasswordSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { token, password } = req.body;

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      res.status(400).json({ success: false, error: 'Invalid or expired token' });
      return;
    }

    if (resetToken.used) {
      res.status(400).json({ success: false, error: 'Token has already been used' });
      return;
    }

    if (resetToken.expiresAt < new Date()) {
      res.status(400).json({ success: false, error: 'Token has expired' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const updateData: { passwordHash: string; authProvider?: string } = { passwordHash };

    // If user was Google-only, update authProvider to "both"
    if (resetToken.user.authProvider === 'google') {
      updateData.authProvider = 'both';
    }

    await prisma.user.update({
      where: { id: resetToken.userId },
      data: updateData,
    });

    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    res.json({
      success: true,
      data: { message: 'Password reset successfully' },
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/auth/google
router.post('/google', validate(googleAuthSchema), async (req: AuthRequest, res: Response) => {
  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;

    if (!googleClientId) {
      console.error('[google-auth] GOOGLE_CLIENT_ID environment variable is not set');
      res.status(500).json({ success: false, error: 'Google authentication is not configured' });
      return;
    }

    const { credential } = req.body;

    const googleClient = new OAuth2Client(googleClientId);

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: googleClientId,
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error('[google-auth] Token verification failed:', verifyError);
      res.status(401).json({ success: false, error: 'Invalid or expired Google token' });
      return;
    }

    if (!payload || !payload.sub || !payload.email) {
      res.status(401).json({ success: false, error: 'Invalid Google token payload' });
      return;
    }

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || '';

    // Case 1: User exists with this googleId → issue JWT
    let user = await prisma.user.findUnique({
      where: { googleId },
    });

    if (user) {
      const token = generateToken(user.id);
      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            authProvider: user.authProvider,
            createdAt: user.createdAt,
          },
        },
      });
      return;
    }

    // Case 2: User exists with same email → link Google, issue JWT
    user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId,
          authProvider: 'both',
        },
      });

      const token = generateToken(user.id);
      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            authProvider: user.authProvider,
            createdAt: user.createdAt,
          },
        },
      });
      return;
    }

    // Case 3: New user → create user, issue JWT
    // Auto-generate username from email or name, ensure uniqueness
    let baseUsername = email.split('@')[0] || name.replace(/\s+/g, '').toLowerCase() || 'user';
    // Sanitize: keep only alphanumeric and underscores, limit length
    baseUsername = baseUsername.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 30);
    if (baseUsername.length < 3) {
      baseUsername = 'user' + baseUsername;
    }

    let username = baseUsername;
    let attempt = 0;
    while (true) {
      const existing = await prisma.user.findUnique({ where: { username } });
      if (!existing) break;
      attempt++;
      username = `${baseUsername}${Math.floor(Math.random() * 9000) + 1000}`;
      if (attempt > 10) {
        username = `${baseUsername}${Date.now().toString(36)}`;
        break;
      }
    }

    user = await prisma.user.create({
      data: {
        username,
        email,
        googleId,
        passwordHash: null,
        authProvider: 'google',
      },
    });

    const token = generateToken(user.id);
    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          authProvider: user.authProvider,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
