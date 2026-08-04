import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createPeriodSchema, updatePeriodSchema } from '../validators/schemas';

const router = Router();

// All period routes require authentication
router.use(authenticate);

// GET /api/periods - returns only period metadata (id, name, createdAt)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const periods = await prisma.period.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    res.json({ success: true, data: periods });
  } catch (error) {
    console.error('Get periods error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/periods
router.post('/', validate(createPeriodSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;

    const period = await prisma.period.create({
      data: {
        name,
        userId: req.userId!,
      },
    });

    res.status(201).json({ success: true, data: period });
  } catch (error) {
    console.error('Create period error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/periods/:id
router.put('/:id', validate(updatePeriodSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Verify ownership
    const existing = await prisma.period.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Period not found' });
      return;
    }

    const period = await prisma.period.update({
      where: { id },
      data: { name },
    });

    res.json({ success: true, data: period });
  } catch (error) {
    console.error('Update period error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/periods/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.period.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Period not found' });
      return;
    }

    await prisma.period.delete({ where: { id } });

    res.json({ success: true, data: { message: 'Period deleted' } });
  } catch (error) {
    console.error('Delete period error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
