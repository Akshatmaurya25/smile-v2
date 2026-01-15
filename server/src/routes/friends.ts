import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Validation schemas
const sendRequestSchema = z.object({
  userId: z.string().uuid(),
});

// GET /api/friends - Get all friends
router.get('/', authenticate, async (req, res, next) => {
  try {
    const friendships = await prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { userId: req.user!.id },
          { friendId: req.user!.id },
        ],
      },
      include: {
        user: { select: { id: true, username: true, displayName: true, profileImage: true, email: true } },
        friend: { select: { id: true, username: true, displayName: true, profileImage: true, email: true } },
      },
    });

    // Transform to consistent friend format
    const friends = friendships.map((f) => {
      const isFriend = f.userId === req.user!.id;
      return {
        id: isFriend ? f.friend.id : f.user.id,
        friendshipId: f.id,
        user: isFriend ? f.friend : f.user,
        status: f.status,
      };
    });

    res.json({
      success: true,
      data: friends,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/friends/pending - Get pending friend requests
router.get('/pending', authenticate, async (req, res, next) => {
  try {
    // Requests received by current user
    const received = await prisma.friendship.findMany({
      where: {
        friendId: req.user!.id,
        status: 'PENDING',
      },
      include: {
        user: { select: { id: true, username: true, displayName: true, profileImage: true, email: true } },
      },
    });

    // Requests sent by current user
    const sent = await prisma.friendship.findMany({
      where: {
        userId: req.user!.id,
        status: 'PENDING',
      },
      include: {
        friend: { select: { id: true, username: true, displayName: true, profileImage: true, email: true } },
      },
    });

    res.json({
      success: true,
      data: {
        received: received.map((f) => ({
          id: f.user.id,
          friendshipId: f.id,
          user: f.user,
          status: f.status,
          type: 'received',
        })),
        sent: sent.map((f) => ({
          id: f.friend.id,
          friendshipId: f.id,
          user: f.friend,
          status: f.status,
          type: 'sent',
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/friends/request - Send friend request
router.post('/request', authenticate, async (req, res, next) => {
  try {
    const { userId } = sendRequestSchema.parse(req.body);

    if (userId === req.user!.id) {
      throw new AppError(400, 'Cannot send friend request to yourself');
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      throw new AppError(404, 'User not found');
    }

    // Check if friendship already exists
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: req.user!.id, friendId: userId },
          { userId: userId, friendId: req.user!.id },
        ],
      },
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'ACCEPTED') {
        throw new AppError(400, 'Already friends');
      }
      if (existingFriendship.status === 'PENDING') {
        throw new AppError(400, 'Friend request already pending');
      }
    }

    // Create friendship request
    const friendship = await prisma.friendship.create({
      data: {
        userId: req.user!.id,
        friendId: userId,
        status: 'PENDING',
      },
      include: {
        friend: { select: { id: true, username: true, displayName: true, profileImage: true, email: true } },
      },
    });

    // Create notification for target user
    await prisma.notification.create({
      data: {
        userId: userId,
        type: 'FRIEND_REQUEST',
        title: 'Friend Request',
        message: `${req.user!.email} sent you a friend request`,
        data: { friendshipId: friendship.id },
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: friendship.friend.id,
        friendshipId: friendship.id,
        user: friendship.friend,
        status: friendship.status,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/friends/accept/:id - Accept friend request
router.post('/accept/:id', authenticate, async (req, res, next) => {
  try {
    const friendshipId = req.params.id as string;
    const friendship = await prisma.friendship.findFirst({
      where: {
        id: friendshipId,
        friendId: req.user!.id,
        status: 'PENDING',
      },
    });

    if (!friendship) {
      throw new AppError(404, 'Friend request not found');
    }

    const updated = await prisma.friendship.update({
      where: { id: friendship.id },
      data: { status: 'ACCEPTED' },
      include: {
        user: { select: { id: true, username: true, displayName: true, profileImage: true, email: true } },
      },
    });

    // Notify the requester
    await prisma.notification.create({
      data: {
        userId: updated.userId,
        type: 'FRIEND_ACCEPTED',
        title: 'Friend Request Accepted',
        message: `${req.user!.email} accepted your friend request`,
        data: { friendshipId: updated.id },
      },
    });

    res.json({
      success: true,
      data: {
        id: updated.user.id,
        friendshipId: updated.id,
        user: updated.user,
        status: updated.status,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/friends/reject/:id - Reject friend request
router.post('/reject/:id', authenticate, async (req, res, next) => {
  try {
    const friendshipId = req.params.id as string;
    const friendship = await prisma.friendship.findFirst({
      where: {
        id: friendshipId,
        friendId: req.user!.id,
        status: 'PENDING',
      },
    });

    if (!friendship) {
      throw new AppError(404, 'Friend request not found');
    }

    await prisma.friendship.update({
      where: { id: friendship.id },
      data: { status: 'REJECTED' },
    });

    res.json({
      success: true,
      message: 'Friend request rejected',
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/friends/:id - Remove friend
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const friendshipId = req.params.id as string;
    const friendship = await prisma.friendship.findFirst({
      where: {
        id: friendshipId,
        status: 'ACCEPTED',
        OR: [
          { userId: req.user!.id },
          { friendId: req.user!.id },
        ],
      },
    });

    if (!friendship) {
      throw new AppError(404, 'Friendship not found');
    }

    await prisma.friendship.delete({
      where: { id: friendship.id },
    });

    res.json({
      success: true,
      message: 'Friend removed',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
