import { Router } from 'express';
import { prisma } from '../index.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/borrowings - Get borrowings summary
router.get('/', authenticate, async (req, res, next) => {
  try {
    // Get what current user owes others (borrowings)
    const owes = await prisma.expenseSplit.findMany({
      where: {
        userId: req.user!.id,
        isPaid: false,
        expense: {
          paidById: { not: req.user!.id },
          isDeleted: false,
        },
      },
      include: {
        expense: {
          include: {
            paidBy: { select: { id: true, displayName: true, profileImage: true, email: true } },
            category: true,
          },
        },
      },
    });

    // Get what others owe current user (lending)
    const owed = await prisma.expenseSplit.findMany({
      where: {
        isPaid: false,
        expense: {
          paidById: req.user!.id,
          isDeleted: false,
        },
        userId: { not: req.user!.id },
      },
      include: {
        user: { select: { id: true, displayName: true, profileImage: true, email: true } },
        expense: {
          include: { category: true },
        },
      },
    });

    // Transform to borrowing format
    const borrowings = owes.map((split) => ({
      id: split.id,
      fromUser: { id: req.user!.id },
      toUser: split.expense.paidBy,
      amount: Number(split.amount),
      currency: split.expense.currency,
      expense: split.expense,
      isPaid: split.isPaid,
      confirmedByPayer: split.confirmedByPayer,
      confirmedByPayee: split.confirmedByPayee,
      type: 'owe' as const,
    }));

    const lendings = owed.map((split) => ({
      id: split.id,
      fromUser: split.user,
      toUser: { id: req.user!.id },
      amount: Number(split.amount),
      currency: split.expense.currency,
      expense: split.expense,
      isPaid: split.isPaid,
      confirmedByPayer: split.confirmedByPayer,
      confirmedByPayee: split.confirmedByPayee,
      type: 'lent' as const,
    }));

    res.json({
      success: true,
      data: [...borrowings, ...lendings],
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/borrowings/history - Get cleared/paid borrowings history
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get cleared borrowings where user owed others
    const clearedOwes = await prisma.expenseSplit.findMany({
      where: {
        userId: req.user!.id,
        isPaid: true,
        expense: {
          paidById: { not: req.user!.id },
          isDeleted: false,
        },
      },
      include: {
        expense: {
          include: {
            paidBy: { select: { id: true, displayName: true, profileImage: true, email: true } },
            category: true,
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    // Get cleared borrowings where others owed user
    const clearedOwed = await prisma.expenseSplit.findMany({
      where: {
        isPaid: true,
        expense: {
          paidById: req.user!.id,
          isDeleted: false,
        },
        userId: { not: req.user!.id },
      },
      include: {
        user: { select: { id: true, displayName: true, profileImage: true, email: true } },
        expense: {
          include: { category: true },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    // Transform and combine
    const history = [
      ...clearedOwes.map((split) => ({
        id: split.id,
        fromUser: { id: req.user!.id },
        toUser: split.expense.paidBy,
        amount: Number(split.amount),
        currency: split.expense.currency,
        expense: split.expense,
        isPaid: split.isPaid,
        paidAt: split.paidAt,
        confirmedByPayer: split.confirmedByPayer,
        confirmedByPayee: split.confirmedByPayee,
        type: 'owe' as const,
      })),
      ...clearedOwed.map((split) => ({
        id: split.id,
        fromUser: split.user,
        toUser: { id: req.user!.id },
        amount: Number(split.amount),
        currency: split.expense.currency,
        expense: split.expense,
        isPaid: split.isPaid,
        paidAt: split.paidAt,
        confirmedByPayer: split.confirmedByPayer,
        confirmedByPayee: split.confirmedByPayee,
        type: 'lent' as const,
      })),
    ]
      .sort((a, b) => new Date(b.paidAt || 0).getTime() - new Date(a.paidAt || 0).getTime())
      .slice(skip, skip + limit);

    const total = clearedOwes.length + clearedOwed.length;

    res.json({
      success: true,
      data: history,
      total,
      page,
      limit,
      hasMore: skip + limit < total,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/borrowings/friend/:friendId - Get borrowings with specific friend
router.get('/friend/:friendId', authenticate, async (req, res, next) => {
  try {
    const friendId = req.params.friendId;

    // Get what current user owes friend
    const owes = await prisma.expenseSplit.findMany({
      where: {
        userId: req.user!.id,
        expense: {
          paidById: friendId,
          isDeleted: false,
        },
      },
      include: {
        expense: {
          include: { category: true },
        },
      },
    });

    // Get what friend owes current user
    const owed = await prisma.expenseSplit.findMany({
      where: {
        userId: friendId,
        expense: {
          paidById: req.user!.id,
          isDeleted: false,
        },
      },
      include: {
        expense: {
          include: { category: true },
        },
      },
    });

    const transactions = [
      ...owes.map((split) => ({
        id: split.id,
        amount: Number(split.amount),
        currency: split.expense.currency,
        description: split.expense.description,
        category: split.expense.category,
        date: split.expense.date,
        isPaid: split.isPaid,
        confirmedByPayer: split.confirmedByPayer,
        confirmedByPayee: split.confirmedByPayee,
        type: 'owe' as const,
      })),
      ...owed.map((split) => ({
        id: split.id,
        amount: Number(split.amount),
        currency: split.expense.currency,
        description: split.expense.description,
        category: split.expense.category,
        date: split.expense.date,
        isPaid: split.isPaid,
        confirmedByPayer: split.confirmedByPayer,
        confirmedByPayee: split.confirmedByPayee,
        type: 'lent' as const,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate net balance
    const totalOwed = owed.filter((s) => !s.isPaid).reduce((sum, s) => sum + Number(s.amount), 0);
    const totalOwes = owes.filter((s) => !s.isPaid).reduce((sum, s) => sum + Number(s.amount), 0);
    const netBalance = totalOwed - totalOwes;

    res.json({
      success: true,
      data: {
        transactions,
        summary: {
          totalOwed,
          totalOwes,
          netBalance,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/borrowings/:id/confirm - Confirm payment (both parties must confirm)
router.post('/:id/confirm', authenticate, async (req, res, next) => {
  try {
    const split = await prisma.expenseSplit.findUnique({
      where: { id: req.params.id },
      include: {
        expense: true,
      },
    });

    if (!split) {
      throw new AppError(404, 'Borrowing not found');
    }

    // Check if user is involved in this split
    const isPayer = split.expense.paidById === req.user!.id;
    const isPayee = split.userId === req.user!.id;

    if (!isPayer && !isPayee) {
      throw new AppError(403, 'You are not involved in this transaction');
    }

    // Update confirmation status
    const updateData: { confirmedByPayer?: boolean; confirmedByPayee?: boolean; isPaid?: boolean; paidAt?: Date } = {};

    if (isPayer) {
      updateData.confirmedByPayer = true;
    }
    if (isPayee) {
      updateData.confirmedByPayee = true;
    }

    // Check if both parties will have confirmed after this update
    const willBeConfirmedByPayer = isPayer || split.confirmedByPayer;
    const willBeConfirmedByPayee = isPayee || split.confirmedByPayee;

    if (willBeConfirmedByPayer && willBeConfirmedByPayee) {
      updateData.isPaid = true;
      updateData.paidAt = new Date();
    }

    const updated = await prisma.expenseSplit.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        expense: {
          include: {
            paidBy: { select: { id: true, displayName: true, profileImage: true, email: true } },
            category: true,
          },
        },
        user: { select: { id: true, displayName: true, profileImage: true, email: true } },
      },
    });

    // Create notification for the other party
    const notifyUserId = isPayer ? split.userId : split.expense.paidById;
    await prisma.notification.create({
      data: {
        userId: notifyUserId,
        type: updated.isPaid ? 'PAYMENT_CONFIRMED' : 'PAYMENT_REQUEST',
        title: updated.isPaid ? 'Payment Confirmed' : 'Payment Confirmation',
        message: updated.isPaid
          ? 'Both parties have confirmed the payment'
          : `${req.user!.email} confirmed their part of the payment`,
        data: { splitId: updated.id },
      },
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        fromUser: updated.user,
        toUser: updated.expense.paidBy,
        amount: Number(updated.amount),
        currency: updated.expense.currency,
        expense: updated.expense,
        isPaid: updated.isPaid,
        confirmedByPayer: updated.confirmedByPayer,
        confirmedByPayee: updated.confirmedByPayee,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/borrowings/:id/remind - Send payment reminder
router.post('/:id/remind', authenticate, async (req, res, next) => {
  try {
    const split = await prisma.expenseSplit.findUnique({
      where: { id: req.params.id },
      include: {
        expense: {
          include: {
            paidBy: { select: { id: true, displayName: true, email: true } },
          },
        },
        user: { select: { id: true, displayName: true, email: true } },
      },
    });

    if (!split) {
      throw new AppError(404, 'Borrowing not found');
    }

    // Verify current user is the lender (the one who paid for the expense)
    if (split.expense.paidById !== req.user!.id) {
      throw new AppError(403, 'Only the lender can send payment reminders');
    }

    // Can only remind if not yet paid
    if (split.isPaid) {
      throw new AppError(400, 'This borrowing has already been paid');
    }

    // Create reminder notification for the borrower
    const borrowerName = split.user.displayName || split.user.email;
    const lenderName = req.user!.displayName || req.user!.email;

    await prisma.notification.create({
      data: {
        userId: split.userId,
        type: 'PAYMENT_REMINDER',
        title: 'Payment Reminder',
        message: `${lenderName} reminded you about ${split.expense.currency} ${Number(split.amount).toLocaleString()}`,
        data: { splitId: split.id, amount: Number(split.amount) },
      },
    });

    res.json({
      success: true,
      message: `Reminder sent to ${borrowerName}`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
