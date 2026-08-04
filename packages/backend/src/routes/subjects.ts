import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createSubjectSchema, updateSubjectSchema } from '../validators/schemas.js';
import {
  calculateComponentAverage,
  calculateSubjectAverage,
} from '../services/gradeCalculator.js';

const router = Router();
const prisma = new PrismaClient();

// All subject routes require authentication
router.use(authenticate);

// GET /api/periods/:periodId/subjects
router.get('/periods/:periodId/subjects', async (req: AuthRequest, res: Response) => {
  try {
    const { periodId } = req.params;

    // Verify period ownership
    const period = await prisma.period.findFirst({
      where: { id: periodId, userId: req.userId },
    });

    if (!period) {
      res.status(404).json({ success: false, error: 'Period not found' });
      return;
    }

    const subjects = await prisma.subject.findMany({
      where: { periodId },
      include: {
        components: {
          include: {
            grades: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    // Calculate averages
    const subjectsWithAverages = subjects.map((subject) => {
      const componentsWithAverages = subject.components.map((comp) => ({
        ...comp,
        average: calculateComponentAverage(comp.grades),
      }));

      const subjectAverage = subject.isComposite
        ? calculateSubjectAverage(
            subject.components.map((comp) => ({
              weightPercentage: comp.weightPercentage,
              grades: comp.grades,
            }))
          )
        : calculateComponentAverage(subject.components[0]?.grades || []);

      return {
        ...subject,
        components: componentsWithAverages,
        calculatedAverage: subjectAverage,
      };
    });

    res.json({ success: true, data: subjectsWithAverages });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/periods/:periodId/subjects
router.post(
  '/periods/:periodId/subjects',
  validate(createSubjectSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { periodId } = req.params;
      const { name, isComposite, components } = req.body;

      // Verify period ownership
      const period = await prisma.period.findFirst({
        where: { id: periodId, userId: req.userId },
      });

      if (!period) {
        res.status(404).json({ success: false, error: 'Period not found' });
        return;
      }

      // For simple subjects, create a default component
      const componentData = isComposite
        ? components!.map((c: { name: string; weightPercentage: number }) => ({
            name: c.name,
            weightPercentage: c.weightPercentage,
          }))
        : [{ name: 'General', weightPercentage: 1.0 }];

      const subject = await prisma.subject.create({
        data: {
          name,
          periodId,
          isComposite,
          components: {
            create: componentData,
          },
        },
        include: {
          components: {
            include: {
              grades: true,
            },
          },
        },
      });

      res.status(201).json({ success: true, data: subject });
    } catch (error) {
      console.error('Create subject error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
);

// PUT /api/subjects/:id
router.put('/subjects/:id', validate(updateSubjectSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Verify ownership through period
    const existing = await prisma.subject.findFirst({
      where: { id },
      include: { period: true },
    });

    if (!existing || existing.period.userId !== req.userId) {
      res.status(404).json({ success: false, error: 'Subject not found' });
      return;
    }

    const subject = await prisma.subject.update({
      where: { id },
      data: { name },
      include: {
        components: {
          include: { grades: true },
        },
      },
    });

    res.json({ success: true, data: subject });
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/subjects/:id
router.delete('/subjects/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify ownership through period
    const existing = await prisma.subject.findFirst({
      where: { id },
      include: { period: true },
    });

    if (!existing || existing.period.userId !== req.userId) {
      res.status(404).json({ success: false, error: 'Subject not found' });
      return;
    }

    await prisma.subject.delete({ where: { id } });

    res.json({ success: true, data: { message: 'Subject deleted' } });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
