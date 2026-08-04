import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createGradeSchema, updateGradeSchema } from '../validators/schemas';
import { validateWeightsTotal } from '../services/gradeCalculator';

const router = Router();

// All grade routes require authentication
router.use(authenticate);

/**
 * Verify that the component belongs to the authenticated user.
 */
async function verifyComponentOwnership(
  componentId: string,
  userId: string
): Promise<boolean> {
  const component = await prisma.subjectComponent.findFirst({
    where: { id: componentId },
    include: {
      subject: {
        include: { period: true },
      },
    },
  });

  if (!component) return false;
  return component.subject.period.userId === userId;
}

/**
 * Verify that the grade belongs to the authenticated user.
 */
async function verifyGradeOwnership(
  gradeId: string,
  userId: string
): Promise<{ owned: boolean; componentId?: string }> {
  const grade = await prisma.grade.findFirst({
    where: { id: gradeId },
    include: {
      subjectComponent: {
        include: {
          subject: {
            include: { period: true },
          },
        },
      },
    },
  });

  if (!grade) return { owned: false };
  const owned = grade.subjectComponent.subject.period.userId === userId;
  return { owned, componentId: grade.subjectComponentId };
}

// GET /api/components/:componentId/grades
router.get('/components/:componentId/grades', async (req: AuthRequest, res: Response) => {
  try {
    const { componentId } = req.params;

    const hasAccess = await verifyComponentOwnership(componentId, req.userId!);
    if (!hasAccess) {
      res.status(404).json({ success: false, error: 'Component not found' });
      return;
    }

    const grades = await prisma.grade.findMany({
      where: { subjectComponentId: componentId },
      orderBy: { order: 'asc' },
    });

    res.json({ success: true, data: grades });
  } catch (error) {
    console.error('Get grades error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/components/:componentId/grades
router.post(
  '/components/:componentId/grades',
  validate(createGradeSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { componentId } = req.params;
      const { name, value, weightPercentage } = req.body;

      const hasAccess = await verifyComponentOwnership(componentId, req.userId!);
      if (!hasAccess) {
        res.status(404).json({ success: false, error: 'Component not found' });
        return;
      }

      // Check weight total
      const existingGrades = await prisma.grade.findMany({
        where: { subjectComponentId: componentId },
        select: { weightPercentage: true },
      });

      const existingWeights = existingGrades.map((g: { weightPercentage: number }) => g.weightPercentage);
      if (!validateWeightsTotal(existingWeights, weightPercentage)) {
        res.status(400).json({
          success: false,
          error: 'Total weight would exceed 100%',
        });
        return;
      }

      // Get next order number
      const maxOrder = await prisma.grade.aggregate({
        where: { subjectComponentId: componentId },
        _max: { order: true },
      });

      const grade = await prisma.grade.create({
        data: {
          name,
          value: value ?? null,
          weightPercentage,
          subjectComponentId: componentId,
          order: (maxOrder._max.order ?? -1) + 1,
        },
      });

      res.status(201).json({ success: true, data: grade });
    } catch (error) {
      console.error('Create grade error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// PUT /api/grades/:id
router.put('/grades/:id', validate(updateGradeSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, value, weightPercentage } = req.body;

    const { owned, componentId } = await verifyGradeOwnership(id, req.userId!);
    if (!owned) {
      res.status(404).json({ success: false, error: 'Grade not found' });
      return;
    }

    // If weight is changing, validate new total
    if (weightPercentage !== undefined && componentId) {
      const existingGrades = await prisma.grade.findMany({
        where: { subjectComponentId: componentId, id: { not: id } },
        select: { weightPercentage: true },
      });

      const existingWeights = existingGrades.map((g: { weightPercentage: number }) => g.weightPercentage);
      if (!validateWeightsTotal(existingWeights, weightPercentage)) {
        res.status(400).json({
          success: false,
          error: 'Total weight would exceed 100%',
        });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (value !== undefined) updateData.value = value;
    if (weightPercentage !== undefined) updateData.weightPercentage = weightPercentage;

    const grade = await prisma.grade.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: grade });
  } catch (error) {
    console.error('Update grade error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/grades/:id
router.delete('/grades/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { owned } = await verifyGradeOwnership(id, req.userId!);
    if (!owned) {
      res.status(404).json({ success: false, error: 'Grade not found' });
      return;
    }

    await prisma.grade.delete({ where: { id } });

    res.json({ success: true, data: { message: 'Grade deleted' } });
  } catch (error) {
    console.error('Delete grade error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
