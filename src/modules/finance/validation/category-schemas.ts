import { z } from 'zod';

export const CategoryTypeEnum = z.enum(['income', 'expense']);

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required').max(60),
  categoryType: CategoryTypeEnum,
  icon: z.string().trim().max(50).optional().nullable(),
  color: z
    .string()
    .trim()
    .regex(/^#([A-Fa-f0-9]{6})$/, 'Color must be a valid 6-character hex code (e.g., #3B82F6)')
    .optional()
    .nullable(),
});

export const updateCategorySchema = z.object({
  categoryId: z.string().uuid('Invalid category UUID'),
  name: z.string().trim().min(1).max(60).optional(),
  icon: z.string().trim().max(50).optional().nullable(),
  color: z
    .string()
    .trim()
    .regex(/^#([A-Fa-f0-9]{6})$/, 'Color must be a valid 6-character hex code')
    .optional()
    .nullable(),
  isActive: z.boolean().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

