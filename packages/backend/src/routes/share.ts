import { Router, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { importSubjectSchema } from '../validators/schemas';
import { validateShareToken } from '../services/shareToken';

const router = Router();

// All share routes require authentication
router.use(authenticate);

// POST /api/share/subjects/:subjectId — Generate share link
router.post('/share/subjects/:subjectId', async (req: AuthRequest, res: Response) => {
  try {
    const { subjectId } = req.params;

    // Verify the subject exists and belongs to the authenticated user (via period.userId)
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId },
      include: { period: true },
    });

    if (!subject || subject.period.userId !== req.userId) {
      res.status(404).json({ success: false, error: 'Subject not found' });
      return;
    }

    // Generate token with crypto.randomBytes(32)
    const token = crypto.randomBytes(32).toString('hex');

    // Set expiration to exactly 7 days from now
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Store the ShareToken record
    await prisma.shareToken.create({
      data: {
        token,
        subjectId,
        expiresAt,
      },
    });

    // Build the share link using FRONTEND_URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const shareLink = `${frontendUrl}/import/${token}`;

    res.status(201).json({
      success: true,
      data: {
        shareLink,
        token,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Generate share link error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/share/:token/preview — Preview subject structure
router.get('/share/:token/preview', async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.params;

    // Validate the token
    const result = await validateShareToken(token);
    if (!result.valid) {
      res.status(result.status).json({ success: false, error: result.error });
      return;
    }

    // Fetch the subject with components and grades, excluding grade values
    const subject = await prisma.subject.findUnique({
      where: { id: result.subjectId },
      include: {
        components: {
          include: {
            grades: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    if (!subject) {
      res.status(404).json({ success: false, error: 'Subject not found' });
      return;
    }

    // Return the preview without grade values
    const preview = {
      subjectName: subject.name,
      isComposite: subject.isComposite,
      exemptionGrade: subject.exemptionGrade,
      components: subject.components.map((comp) => ({
        name: comp.name,
        weightPercentage: comp.weightPercentage,
        grades: comp.grades.map((grade) => ({
          name: grade.name,
          weightPercentage: grade.weightPercentage,
          order: grade.order,
          date: grade.date ? grade.date.toISOString().split('T')[0] : null,
          description: grade.description,
        })),
      })),
    };

    res.json({ success: true, data: preview });
  } catch (error) {
    console.error('Preview share error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/share/:token/import — Import subject structure
router.post('/share/:token/import', validate(importSubjectSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.params;
    const { periodId } = req.body;

    // Validate the token
    const result = await validateShareToken(token);
    if (!result.valid) {
      res.status(result.status).json({ success: false, error: result.error });
      return;
    }

    // Verify the target period belongs to the authenticated user
    const period = await prisma.period.findFirst({
      where: { id: periodId, userId: req.userId },
    });

    if (!period) {
      res.status(403).json({ success: false, error: 'You do not have access to this period' });
      return;
    }

    // Fetch the original subject structure
    const originalSubject = await prisma.subject.findUnique({
      where: { id: result.subjectId },
      include: {
        components: {
          include: {
            grades: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    if (!originalSubject) {
      res.status(404).json({ success: false, error: 'Original subject not found' });
      return;
    }

    // Use prisma.$transaction to create the new subject, components, and grade slots
    const newSubject = await prisma.$transaction(async (tx) => {
      const created = await tx.subject.create({
        data: {
          name: originalSubject.name,
          periodId,
          isComposite: originalSubject.isComposite,
          exemptionGrade: originalSubject.exemptionGrade,
        },
      });

      for (const comp of originalSubject.components) {
        const newComponent = await tx.subjectComponent.create({
          data: {
            subjectId: created.id,
            name: comp.name,
            weightPercentage: comp.weightPercentage,
          },
        });

        for (const grade of comp.grades) {
          await tx.grade.create({
            data: {
              subjectComponentId: newComponent.id,
              name: grade.name,
              value: null,
              weightPercentage: grade.weightPercentage,
              order: grade.order,
              date: grade.date,
              description: grade.description,
            },
          });
        }
      }

      // Return the full created subject with structure
      return tx.subject.findUnique({
        where: { id: created.id },
        include: {
          components: {
            include: {
              grades: { orderBy: { order: 'asc' } },
            },
          },
        },
      });
    });

    res.status(201).json({ success: true, data: newSubject });
  } catch (error) {
    console.error('Import share error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
