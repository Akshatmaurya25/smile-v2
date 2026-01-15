import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().optional(),
  color: z.string().optional(),
});

// GET /api/categories - Get all categories (default + user's custom)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { isDefault: true },
          { userId: req.user!.id },
        ],
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/categories - Create custom category
router.post('/', authenticate, async (req, res, next) => {
  try {
    const data = createCategorySchema.parse(req.body);

    // Check if user already has a category with this name
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: data.name,
        userId: req.user!.id,
      },
    });

    if (existingCategory) {
      throw new AppError(409, 'You already have a category with this name');
    }

    const category = await prisma.category.create({
      data: {
        ...data,
        userId: req.user!.id,
        isDefault: false,
      },
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/categories/:id - Delete custom category
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const categoryId = req.params.id as string;
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new AppError(404, 'Category not found');
    }

    if (category.isDefault) {
      throw new AppError(403, 'Cannot delete default categories');
    }

    if (category.userId !== req.user!.id) {
      throw new AppError(403, 'You can only delete your own categories');
    }

    // Check if category has expenses
    const expenseCount = await prisma.expense.count({
      where: { categoryId: categoryId },
    });

    if (expenseCount > 0) {
      throw new AppError(400, 'Cannot delete category with existing expenses');
    }

    await prisma.category.delete({
      where: { id: categoryId },
    });

    res.json({
      success: true,
      message: 'Category deleted',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
