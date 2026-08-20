import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be at most 100 characters'),
  email: z.string().email('Invalid email format').optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const resetPasswordSchema = z.object({
  token: z.string().uuid('Invalid token format'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be at most 100 characters'),
});

export const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Google credential is required'),
});

export const createPeriodSchema = z.object({
  name: z
    .string()
    .min(1, 'Period name is required')
    .max(100, 'Period name must be at most 100 characters'),
});

export const updatePeriodSchema = z.object({
  name: z
    .string()
    .min(1, 'Period name is required')
    .max(100, 'Period name must be at most 100 characters'),
});

const componentSchema = z.object({
  name: z.string().min(1, 'Component name is required'),
  weightPercentage: z
    .number()
    .min(1, 'Weight must be at least 1%')
    .max(100, 'Weight must be at most 100%'),
});

export const createSubjectSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Subject name is required')
      .max(200, 'Subject name must be at most 200 characters'),
    isComposite: z.boolean(),
    components: z.array(componentSchema).optional(),
    exemptionGrade: z.number().min(1.0).max(7.0).nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.isComposite) {
        return data.components && data.components.length >= 2;
      }
      return true;
    },
    { message: 'Composite subjects must have at least 2 components' }
  )
  .refine(
    (data) => {
      if (data.isComposite && data.components) {
        const totalWeight = data.components.reduce(
          (sum, c) => sum + c.weightPercentage,
          0
        );
        return Math.abs(totalWeight - 100) < 0.1;
      }
      return true;
    },
    { message: 'Component weights must sum to 100%' }
  );

export const updateSubjectSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Subject name is required')
      .max(200, 'Subject name must be at most 200 characters')
      .optional(),
    isComposite: z.boolean().optional(),
    components: z.array(componentSchema).optional(),
    exemptionGrade: z.number().min(1.0).max(7.0).nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.isComposite === true) {
        return data.components && data.components.length >= 2;
      }
      return true;
    },
    { message: 'Composite subjects must have at least 2 components' }
  )
  .refine(
    (data) => {
      if (data.isComposite === true && data.components) {
        const totalWeight = data.components.reduce(
          (sum, c) => sum + c.weightPercentage,
          0
        );
        return Math.abs(totalWeight - 100) < 0.1;
      }
      return true;
    },
    { message: 'Component weights must sum to 100%' }
  );

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const gradeDateSchema = z.string()
  .regex(isoDateRegex, 'Invalid date format, expected YYYY-MM-DD')
  .refine((val) => {
    const d = new Date(val + 'T00:00:00Z');
    return !isNaN(d.getTime()) && d.toISOString().startsWith(val);
  }, 'Date does not represent a valid calendar date');

export const gradeDescriptionSchema = z.string()
  .transform((val) => val.trim())
  .pipe(
    z.string().max(500, 'Description exceeds 500 character limit')
  )
  .transform((val) => val === '' ? null : val);

export const createGradeSchema = z.object({
  name: z
    .string()
    .min(1, 'Grade name is required')
    .max(100, 'Grade name must be at most 100 characters'),
  value: z
    .number()
    .min(1.0, 'Grade must be at least 1.0')
    .max(7.0, 'Grade must be at most 7.0')
    .nullable()
    .optional(),
  weightPercentage: z
    .number()
    .min(1, 'Weight must be at least 1%')
    .max(100, 'Weight must be at most 100%'),
  date: gradeDateSchema.nullable().optional(),
  description: gradeDescriptionSchema.nullable().optional(),
});

export const importSubjectSchema = z.object({
  periodId: z.string().uuid('Invalid period ID'),
});

export const updateGradeSchema = z.object({
  name: z
    .string()
    .min(1, 'Grade name is required')
    .max(100, 'Grade name must be at most 100 characters')
    .optional(),
  value: z
    .number()
    .min(1.0, 'Grade must be at least 1.0')
    .max(7.0, 'Grade must be at most 7.0')
    .nullable()
    .optional(),
  weightPercentage: z
    .number()
    .min(1, 'Weight must be at least 1%')
    .max(100, 'Weight must be at most 100%')
    .optional(),
  date: gradeDateSchema.nullable().optional(),
  description: gradeDescriptionSchema.nullable().optional(),
});
