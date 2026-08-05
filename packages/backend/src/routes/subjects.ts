import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createSubjectSchema, updateSubjectSchema } from '../validators/schemas';
import {
  calculateComponentAverage,
  calculateSubjectAverage,
} from '../services/gradeCalculator';

const router = Router();

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
    const subjectsWithAverages = subjects.map((subject: any) => {
      const componentsWithAverages = subject.components.map((comp: any) => ({
        ...comp,
        average: calculateComponentAverage(comp.grades),
      }));

      const subjectAverage = subject.isComposite
        ? calculateSubjectAverage(
            subject.components.map((comp: any) => ({
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
      const { name, isComposite, components, exemptionGrade } = req.body;

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
        : [{ name: 'General', weightPercentage: 100 }];

      const subject = await prisma.subject.create({
        data: {
          name,
          periodId,
          isComposite,
          exemptionGrade: exemptionGrade ?? null,
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
    const { name, isComposite, components, exemptionGrade } = req.body;

    // Verify ownership through period
    const existing = await prisma.subject.findFirst({
      where: { id },
      include: { period: true, components: true },
    });

    if (!existing || existing.period.userId !== req.userId) {
      res.status(404).json({ success: false, error: 'Subject not found' });
      return;
    }

    // Handle structural changes within a transaction
    if (isComposite !== undefined && isComposite !== existing.isComposite) {
      // isComposite actually changed — full structural change required
      await prisma.$transaction(async (tx) => {
        // Delete all existing components (cascades to their grades)
        await tx.subjectComponent.deleteMany({ where: { subjectId: id } });

        // Create new components based on the new structure
        if (isComposite) {
          // Converting to composite: create components from payload
          await tx.subjectComponent.createMany({
            data: components!.map((c: { name: string; weightPercentage: number }) => ({
              subjectId: id,
              name: c.name,
              weightPercentage: c.weightPercentage,
            })),
          });
        } else {
          // Converting to simple: create a single "General" component
          await tx.subjectComponent.create({
            data: {
              subjectId: id,
              name: 'General',
              weightPercentage: 100,
            },
          });
        }

        // Update the subject's isComposite flag and optionally name
        await tx.subject.update({
          where: { id },
          data: {
            isComposite,
            ...(name !== undefined && { name }),
            ...(exemptionGrade !== undefined && { exemptionGrade }),
          },
        });
      });
    } else if (components !== undefined && (existing.isComposite || isComposite === true)) {
      // Components provided and subject is (or stays) composite
      // Try to update weights/names in-place if component count matches (preserves grades)
      const canUpdateInPlace = existing.components.length === components.length &&
        existing.components.every((ec: { name: string }, i: number) => {
          const ic = components[i] as { name: string; weightPercentage: number };
          // Match by position — allow name and weight changes
          return ec.name === ic.name || existing.components.length === components.length;
        });

      // Better match: check if all incoming component names exist in the current set
      const existingNames = existing.components.map((c: { name: string }) => c.name);
      const incomingNames = components.map((c: { name: string; weightPercentage: number }) => c.name);
      const sameComponents = existingNames.length === incomingNames.length &&
        existingNames.every((n: string) => incomingNames.includes(n));

      if (sameComponents) {
        // Same components — update names and weights in-place (preserves grades)
        await prisma.$transaction(async (tx) => {
          for (const comp of components) {
            const existingComp = existing.components.find((c: { name: string }) => c.name === comp.name);
            if (existingComp) {
              await tx.subjectComponent.update({
                where: { id: existingComp.id },
                data: { name: comp.name, weightPercentage: comp.weightPercentage },
              });
            }
          }

          // Update subject name if provided
          if (name !== undefined || exemptionGrade !== undefined) {
            await tx.subject.update({
              where: { id },
              data: {
                ...(name !== undefined && { name }),
                ...(exemptionGrade !== undefined && { exemptionGrade }),
              },
            });
          }
        });
      } else if (existing.components.length === components.length) {
        // Same number of components but different names — update by position (preserves grades)
        await prisma.$transaction(async (tx) => {
          for (let i = 0; i < components.length; i++) {
            const existingComp = existing.components[i];
            const newComp = components[i] as { name: string; weightPercentage: number };
            await tx.subjectComponent.update({
              where: { id: existingComp.id },
              data: { name: newComp.name, weightPercentage: newComp.weightPercentage },
            });
          }

          if (name !== undefined || exemptionGrade !== undefined) {
            await tx.subject.update({
              where: { id },
              data: {
                ...(name !== undefined && { name }),
                ...(exemptionGrade !== undefined && { exemptionGrade }),
              },
            });
          }
        });
      } else {
        // Structure actually changed (different number of components) — must recreate
        await prisma.$transaction(async (tx) => {
          await tx.subjectComponent.deleteMany({ where: { subjectId: id } });

          await tx.subjectComponent.createMany({
            data: components.map((c: { name: string; weightPercentage: number }) => ({
              subjectId: id,
              name: c.name,
              weightPercentage: c.weightPercentage,
            })),
          });

          if (name !== undefined || exemptionGrade !== undefined) {
            await tx.subject.update({
              where: { id },
              data: {
                ...(name !== undefined && { name }),
                ...(exemptionGrade !== undefined && { exemptionGrade }),
              },
            });
          }
        });
      }
    } else {
      // Name-only update (no structural changes)
      if (name !== undefined || exemptionGrade !== undefined) {
        await prisma.subject.update({
          where: { id },
          data: {
            ...(name !== undefined && { name }),
            ...(exemptionGrade !== undefined && { exemptionGrade }),
          },
        });
      }
    }

    // Fetch and return the full updated subject with components and grades
    const subject = await prisma.subject.findUnique({
      where: { id },
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
