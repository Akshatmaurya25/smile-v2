import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';
import { Prisma } from '@prisma/client';

const router = Router();

// Income sources for categorization
const INCOME_SOURCES = ['Salary', 'Freelance', 'Investment', 'Gift', 'Refund', 'Bonus', 'Other'] as const;

// Validation schemas
const createIncomeSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SGD']).default('INR'),
  description: z.string().min(1).max(500),
  source: z.enum(INCOME_SOURCES).optional(),
  date: z.string().datetime().optional(),
});

const updateIncomeSchema = createIncomeSchema.partial();

// GET /api/income - Get user's income entries
router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const source = req.query.source as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const where: Prisma.IncomeWhereInput = {
      userId: req.user!.id,
      isDeleted: false,
    };

    if (source) {
      where.source = source;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [incomes, total] = await Promise.all([
      prisma.income.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.income.count({ where }),
    ]);

    res.json({
      success: true,
      data: incomes.map(income => ({
        ...income,
        amount: Number(income.amount),
      })),
      total,
      page,
      limit,
      hasMore: page * limit < total,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/income/stats - Get income statistics
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

    // Get total income for period
    const totalIncome = await prisma.income.aggregate({
      where: {
        userId: req.user!.id,
        isDeleted: false,
        date: { gte: startDate },
      },
      _sum: { amount: true },
    });

    // Get income by source
    const incomeBySource = await prisma.income.groupBy({
      by: ['source'],
      where: {
        userId: req.user!.id,
        isDeleted: false,
        date: { gte: startDate },
      },
      _sum: { amount: true },
    });

    const total = Number(totalIncome._sum.amount) || 0;

    const sourceStats = incomeBySource.map((item) => ({
      source: item.source || 'Other',
      total: Number(item._sum.amount) || 0,
      percentage: total > 0 ? ((Number(item._sum.amount) || 0) / total) * 100 : 0,
    }));

    // Monthly income for chart
    const monthlyIncome = await prisma.$queryRaw<Array<{ month: string; total: number }>>`
      SELECT
        TO_CHAR(date, 'YYYY-MM') as month,
        SUM(amount)::float as total
      FROM "Income"
      WHERE "userId" = ${req.user!.id}
        AND "isDeleted" = false
        AND date >= ${startDate}
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month ASC
    `;

    res.json({
      success: true,
      data: {
        totalIncome: total,
        incomeBySource: sourceStats,
        monthlyIncome,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/income/sources - Get available income sources
router.get('/sources', authenticate, async (_req, res) => {
  res.json({
    success: true,
    data: INCOME_SOURCES,
  });
});

// GET /api/income/:id - Get single income entry
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const income = await prisma.income.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
        isDeleted: false,
      },
    });

    if (!income) {
      throw new AppError(404, 'Income entry not found');
    }

    res.json({
      success: true,
      data: {
        ...income,
        amount: Number(income.amount),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/income - Create income entry
router.post('/', authenticate, async (req, res, next) => {
  try {
    const data = createIncomeSchema.parse(req.body);

    const income = await prisma.income.create({
      data: {
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        source: data.source,
        date: data.date ? new Date(data.date) : new Date(),
        userId: req.user!.id,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...income,
        amount: Number(income.amount),
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/income/:id - Update income entry
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const data = updateIncomeSchema.parse(req.body);

    const existingIncome = await prisma.income.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
        isDeleted: false,
      },
    });

    if (!existingIncome) {
      throw new AppError(404, 'Income entry not found');
    }

    const income = await prisma.income.update({
      where: { id: req.params.id },
      data: {
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        source: data.source,
        date: data.date ? new Date(data.date) : undefined,
      },
    });

    res.json({
      success: true,
      data: {
        ...income,
        amount: Number(income.amount),
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/income/:id - Soft delete income entry
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const existingIncome = await prisma.income.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
        isDeleted: false,
      },
    });

    if (!existingIncome) {
      throw new AppError(404, 'Income entry not found');
    }

    await prisma.income.update({
      where: { id: req.params.id },
      data: { isDeleted: true },
    });

    res.json({
      success: true,
      message: 'Income entry deleted',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
