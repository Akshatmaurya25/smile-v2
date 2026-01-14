import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { prisma } from '../index.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} from '../services/jwt.js';

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Validation schemas
const googleAuthSchema = z.object({
  idToken: z.string().min(1, 'ID token is required'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// POST /api/auth/google - Authenticate with Google
router.post('/google', async (req, res, next) => {
  try {
    console.log('[Auth] Google auth request received');
    const { idToken } = googleAuthSchema.parse(req.body);
    console.log('[Auth] ID token length:', idToken?.length);

    // Verify Google token
    console.log('[Auth] Verifying token with Google Client ID:', process.env.GOOGLE_CLIENT_ID?.slice(0, 20) + '...');
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    console.log('[Auth] Token verified successfully');

    const payload = ticket.getPayload();

    if (!payload || !payload.email || !payload.sub) {
      throw new AppError(400, 'Invalid Google token');
    }

    const { email, sub: googleId, name, picture } = payload;
    console.log('[Auth] User email:', email);

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { googleId },
    });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await prisma.user.create({
        data: {
          email,
          googleId,
          displayName: name || null,
          profileImage: picture || null,
        },
      });
    } else {
      // Update user info from Google if changed
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          displayName: user.displayName || name || null,
          profileImage: user.profileImage || picture || null,
        },
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });
    const refreshToken = await generateRefreshToken(user.id);

    console.log('[Auth] Login successful for user:', user.id);
    res.json({
      success: true,
      data: {
        user,
        tokens: {
          accessToken,
          refreshToken,
        },
        isNewUser,
      },
    });
  } catch (error) {
    console.error('[Auth] Google auth error:', error);
    next(error);
  }
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    const result = await verifyRefreshToken(refreshToken);

    if (!result) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    const user = await prisma.user.findUnique({
      where: { id: result.userId },
    });

    if (!user) {
      throw new AppError(401, 'User not found');
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    res.json({
      success: true,
      data: { accessToken },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me - Get current user
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout - Logout (revoke refresh token)
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    } else {
      // Revoke all tokens for this user
      await revokeAllUserTokens(req.user!.id);
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
