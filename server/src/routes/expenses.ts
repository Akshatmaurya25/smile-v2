import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import { Prisma } from '@prisma/client';

const router = Router();

// Validation schemas
const createExpenseSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SGD']).default('INR'),
  description: z.string().min(1).max(500),
  notes: z.string().max(1000).optional(),
  categoryId: z.string().uuid(),
  date: z.string().datetime().optional(),
  splits: z.array(z.object({
    userId: z.string().uuid(),
    amount: z.number().positive(),
  })).optional(),
});

const updateExpenseSchema = createExpenseSchema.partial();

// GET /api/expenses - Get user's expenses
router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const categoryId = req.query.categoryId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const where: Prisma.ExpenseWhereInput = {
      paidById: req.user!.id,
      isDeleted: false,
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          category: true,
          splits: {
            include: { user: { select: { id: true, displayName: true, profileImage: true } } },
          },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({
      success: true,
      data: expenses,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/expenses/stats - Get expense statistics
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const period = req.query.period as 'week' | 'month' | 'year' || 'month';

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get total expenses
    const totalExpenses = await prisma.expense.aggregate({
      where: {
        paidById: req.user!.id,
        isDeleted: false,
        date: { gte: startDate },
      },
      _sum: { amount: true },
    });

    // Get expenses by category
    const expensesByCategory = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: {
        paidById: req.user!.id,
        isDeleted: false,
        date: { gte: startDate },
      },
      _sum: { amount: true },
    });

    // Get category details
    const categoryIds = expensesByCategory.map((e) => e.categoryId);
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const total = Number(totalExpenses._sum.amount) || 0;

    const categoryStats = expensesByCategory.map((e) => {
      const category = categoryMap.get(e.categoryId);
      const categoryTotal = Number(e._sum.amount) || 0;
      return {
        categoryId: e.categoryId,
        categoryName: category?.name || 'Unknown',
        total: categoryTotal,
        percentage: total > 0 ? (categoryTotal / total) * 100 : 0,
      };
    });

    // Get borrowings (where user owes money)
    const borrowings = await prisma.expenseSplit.aggregate({
      where: {
        userId: req.user!.id,
        isPaid: false,
        expense: { paidById: { not: req.user!.id } },
      },
      _sum: { amount: true },
    });

    // Monthly expenses for chart
    const monthlyExpenses = await prisma.$queryRaw<Array<{ month: string; total: number }>>`
      SELECT
        TO_CHAR(date, 'YYYY-MM') as month,
        SUM(amount)::float as total
      FROM "Expense"
      WHERE "paidById" = ${req.user!.id}
        AND "isDeleted" = false
        AND date >= ${startDate}
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month ASC
    `;

    res.json({
      success: true,
      data: {
        totalIncome: 0, // Income tracking not implemented yet
        totalExpenses: total,
        totalBorrowings: Number(borrowings._sum.amount) || 0,
        expensesByCategory: categoryStats,
        monthlyExpenses,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/expenses/:id - Get single expense
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const expense = await prisma.expense.findFirst({
      where: {
        id: req.params.id,
        paidById: req.user!.id,
        isDeleted: false,
      },
      include: {
        category: true,
        paidBy: { select: { id: true, displayName: true, profileImage: true } },
        splits: {
          include: { user: { select: { id: true, displayName: true, profileImage: true } } },
        },
      },
    });

    if (!expense) {
      throw new AppError(404, 'Expense not found');
    }

    res.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/expenses - Create expense
router.post('/', authenticate, async (req, res, next) => {
  try {
    const data = createExpenseSchema.parse(req.body);

    // Verify category exists
    const category = await prisma.category.findFirst({
      where: {
        id: data.categoryId,
        OR: [{ isDefault: true }, { userId: req.user!.id }],
      },
    });

    if (!category) {
      throw new AppError(404, 'Category not found');
    }

    // Verify split users are friends
    if (data.splits && data.splits.length > 0) {
      const friendIds = data.splits.map((s) => s.userId);

      const friendships = await prisma.friendship.findMany({
        where: {
          status: 'ACCEPTED',
          OR: [
            { userId: req.user!.id, friendId: { in: friendIds } },
            { friendId: req.user!.id, userId: { in: friendIds } },
          ],
        },
      });

      const validFriendIds = new Set([
        ...friendships.map((f) => f.userId),
        ...friendships.map((f) => f.friendId),
      ]);

      const invalidUsers = friendIds.filter((id) => !validFriendIds.has(id));

      if (invalidUsers.length > 0) {
        throw new AppError(400, 'Some users are not your friends');
      }
    }

    // Create expense with splits in transaction
    const expense = await prisma.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          amount: data.amount,
          currency: data.currency,
          description: data.description,
          notes: data.notes,
          categoryId: data.categoryId,
          paidById: req.user!.id,
          date: data.date ? new Date(data.date) : new Date(),
        },
        include: {
          category: true,
        },
      });

      // Create splits if provided
      if (data.splits && data.splits.length > 0) {
        await tx.expenseSplit.createMany({
          data: data.splits.map((split) => ({
            expenseId: exp.id,
            userId: split.userId,
            amount: split.amount,
          })),
        });

        // Create notifications for split users
        await tx.notification.createMany({
          data: data.splits.map((split) => ({
            userId: split.userId,
            type: 'BILL_SPLIT',
            title: 'Bill Split',
            message: `${req.user!.email} split a bill with you for ${data.currency} ${split.amount}`,
            data: { expenseId: exp.id, amount: split.amount },
          })),
        });
      }

      return tx.expense.findUnique({
        where: { id: exp.id },
        include: {
          category: true,
          splits: {
            include: { user: { select: { id: true, displayName: true, profileImage: true } } },
          },
        },
      });
    });

    res.status(201).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/expenses/:id - Update expense
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const data = updateExpenseSchema.parse(req.body);

    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: req.params.id,
        paidById: req.user!.id,
        isDeleted: false,
      },
    });

    if (!existingExpense) {
      throw new AppError(404, 'Expense not found');
    }

    const expense = await prisma.expense.update({
      where: { id: req.params.id },
      data: {
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        notes: data.notes,
        categoryId: data.categoryId,
        date: data.date ? new Date(data.date) : undefined,
      },
      include: {
        category: true,
        splits: {
          include: { user: { select: { id: true, displayName: true, profileImage: true } } },
        },
      },
    });

    res.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/expenses/:id - Soft delete expense
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: req.params.id,
        paidById: req.user!.id,
        isDeleted: false,
      },
    });

    if (!existingExpense) {
      throw new AppError(404, 'Expense not found');
    }

    await prisma.expense.update({
      where: { id: req.params.id },
      data: { isDeleted: true },
    });

    res.json({
      success: true,
      message: 'Expense deleted',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
