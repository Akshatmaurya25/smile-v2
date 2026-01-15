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

    // Get total income from Income table (separate from expenses)
    const totalIncomeResult = await prisma.income.aggregate({
      where: {
        userId: req.user!.id,
        isDeleted: false,
        date: { gte: startDate },
      },
      _sum: { amount: true },
    });

    // Get all expenses paid by user in the period
    const userExpenses = await prisma.expense.findMany({
      where: {
        paidById: req.user!.id,
        isDeleted: false,
        date: { gte: startDate },
      },
      include: {
        splits: true,
        category: true,
      },
    });

    // Calculate actual expense for user (total paid - amount to be recovered from splits)
    // Your expense = What you paid - What others owe you
    // NOTE: Splits you owe to others are NOT expenses, they are borrowings/debts
    let totalExpenses = 0;
    const categoryTotals: Map<string, { total: number; category: typeof userExpenses[0]['category'] }> = new Map();

    for (const expense of userExpenses) {
      const totalPaid = Number(expense.amount);
      const splitsTotal = expense.splits.reduce((sum, split) => sum + Number(split.amount), 0);
      // User's actual expense = Total paid - What others owe (splits)
      const userPortion = totalPaid - splitsTotal;

      totalExpenses += userPortion;

      // Track by category
      const existing = categoryTotals.get(expense.categoryId);
      if (existing) {
        existing.total += userPortion;
      } else {
        categoryTotals.set(expense.categoryId, { total: userPortion, category: expense.category });
      }
    }

    // NOTE: We do NOT add splits assigned to user as expenses
    // Those are borrowings/debts, tracked separately in totalBorrowings

    // Build category stats
    const categoryStats = Array.from(categoryTotals.entries()).map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.category?.name || 'Unknown',
      categoryIcon: data.category?.icon || '📁',
      total: data.total,
      percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0,
    })).sort((a, b) => b.total - a.total);

    // Get borrowings (where user owes money - unpaid)
    const borrowings = await prisma.expenseSplit.aggregate({
      where: {
        userId: req.user!.id,
        isPaid: false,
        expense: { paidById: { not: req.user!.id } },
      },
      _sum: { amount: true },
    });

    // Daily expenses for the last 7 days (for weekly chart)
    // Only count expenses YOU paid (minus splits = your portion)
    // NOT including debts/borrowings (splits assigned to you by others)
    const weekStart = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    weekStart.setHours(0, 0, 0, 0);

    // Get expenses paid by user in last 7 days
    const weekExpenses = await prisma.expense.findMany({
      where: {
        paidById: req.user!.id,
        isDeleted: false,
        date: { gte: weekStart },
      },
      include: { splits: true },
    });

    // Calculate daily totals (only user's own expenses, not debts)
    const dailyTotals: Map<string, number> = new Map();

    for (const expense of weekExpenses) {
      const dateStr = expense.date.toISOString().split('T')[0];
      const splitsTotal = expense.splits.reduce((sum, split) => sum + Number(split.amount), 0);
      const userPortion = Number(expense.amount) - splitsTotal;
      dailyTotals.set(dateStr, (dailyTotals.get(dateStr) || 0) + userPortion);
    }

    // Fill in missing days with 0
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      weeklyData.push({
        day: dateStr,
        dayName: dayNames[date.getDay()],
        total: dailyTotals.get(dateStr) || 0,
      });
    }

    // Monthly expenses for chart (simplified - just user paid amounts minus splits)
    const monthlyExpenses = await prisma.$queryRaw<Array<{ month: string; total: number }>>`
      SELECT
        TO_CHAR(e.date, 'YYYY-MM') as month,
        SUM(e.amount - COALESCE(s.split_total, 0))::float as total
      FROM "Expense" e
      LEFT JOIN (
        SELECT "expenseId", SUM(amount) as split_total
        FROM "ExpenseSplit"
        GROUP BY "expenseId"
      ) s ON e.id = s."expenseId"
      WHERE e."paidById" = ${req.user!.id}
        AND e."isDeleted" = false
        AND e.date >= ${startDate}
      GROUP BY TO_CHAR(e.date, 'YYYY-MM')
      ORDER BY month ASC
    `;

    // Get user's savings goal
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { savingsGoal: true },
    });

    const totalIncome = Number(totalIncomeResult._sum.amount) || 0;
    const savings = Math.max(0, totalIncome - totalExpenses);
    const savingsGoal = user?.savingsGoal ? Number(user.savingsGoal) : null;
    const savingsGoalProgress = savingsGoal && savingsGoal > 0
      ? Math.min((savings / savingsGoal) * 100, 100)
      : null;

    res.json({
      success: true,
      data: {
        totalIncome,
        totalExpenses,
        totalBorrowings: Number(borrowings._sum.amount) || 0,
        savings,
        savingsGoal,
        savingsGoalProgress,
        expensesByCategory: categoryStats,
        weeklyExpenses: weeklyData,
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
