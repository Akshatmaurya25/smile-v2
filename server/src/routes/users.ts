import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const updateProfileSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  displayName: z.string().min(1).max(100).optional(),
  profileImage: z.string().url().optional(),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SGD']).optional(),
});

// PATCH /api/users/profile - Update user profile
router.patch('/profile', authenticate, async (req, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);

    // Check username uniqueness if updating
    if (data.username) {
      const existingUser = await prisma.user.findUnique({
        where: { username: data.username },
      });

      if (existingUser && existingUser.id !== req.user!.id) {
        throw new AppError(409, 'Username already taken');
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
    });

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/search - Search users by username or email
router.get('/search', authenticate, async (req, res, next) => {
  try {
    const query = req.query.q as string;

    if (!query || query.length < 2) {
      throw new AppError(400, 'Search query must be at least 2 characters');
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: req.user!.id } }, // Exclude current user
          {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
              { displayName: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        profileImage: true,
        email: true,
      },
      take: 20,
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        username: true,
        displayName: true,
        profileImage: true,
      },
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

export default router;
