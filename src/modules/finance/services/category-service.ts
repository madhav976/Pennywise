import { err, ok, Result } from '@/lib/result';
import { CategoryDTO } from '@/types/finance';
import { CategoryRepository } from '../repositories/category-repository';
import { CreateCategoryInput, UpdateCategoryInput } from '../validation/category-schemas';

export class CategoryService {
  constructor(private readonly categoryRepo: CategoryRepository) {}

  async listCategories(userId: string): Promise<Result<CategoryDTO[]>> {
    try {
      const list = await this.categoryRepo.listAccessible(userId);
      return ok(list.map((c) => this.mapToDTO(c)));
    } catch (e: any) {
      return err('CATEGORIES_FETCH_FAILED', e.message);
    }
  }

  async createCategory(userId: string, input: CreateCategoryInput): Promise<Result<CategoryDTO>> {
    try {
      const created = await this.categoryRepo.create({
        user_id: userId,
        name: input.name,
        category_type: input.categoryType,
        icon: input.icon || null,
        color: input.color || null,
        is_system: false,
        is_active: true,
      });

      return ok(this.mapToDTO(created));
    } catch (e: any) {
      return err('CATEGORY_CREATION_FAILED', e.message || 'Failed to create custom category');
    }
  }

  async updateCategory(userId: string, input: UpdateCategoryInput): Promise<Result<CategoryDTO>> {
    try {
      const existing = await this.categoryRepo.findById(input.categoryId, userId);
      if (!existing) {
        return err('CATEGORY_NOT_FOUND', 'Category not found or access denied');
      }

      if (existing.is_system) {
        return err('SYSTEM_CATEGORY_PROTECTED', 'System default categories cannot be modified');
      }

      const patch: Record<string, any> = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.icon !== undefined) patch.icon = input.icon;
      if (input.color !== undefined) patch.color = input.color;
      if (input.isActive !== undefined) patch.is_active = input.isActive;

      const updated = await this.categoryRepo.update(input.categoryId, userId, patch);
      return ok(this.mapToDTO(updated));
    } catch (e: any) {
      return err('CATEGORY_UPDATE_FAILED', e.message || 'Failed to update category');
    }
  }

  async deleteCategory(userId: string, categoryId: string): Promise<Result<{ id: string }>> {
    try {
      const existing = await this.categoryRepo.findById(categoryId, userId);
      if (!existing) {
        return err('CATEGORY_NOT_FOUND', 'Category not found or access denied');
      }

      if (existing.is_system) {
        return err('SYSTEM_CATEGORY_PROTECTED', 'System default categories cannot be deleted');
      }

      await this.categoryRepo.delete(categoryId, userId);
      return ok({ id: categoryId });
    } catch (e: any) {
      return err('CATEGORY_DELETE_FAILED', e.message || 'Failed to delete category');
    }
  }

  async validateCategoryForTransaction(
    categoryId: string,
    userId: string,
    expectedType: 'income' | 'expense'
  ): Promise<Result<boolean>> {
    const category = await this.categoryRepo.findById(categoryId, userId);
    if (!category) {
      return err('CATEGORY_NOT_FOUND', `Category with ID ${categoryId} does not exist or is inaccessible`);
    }

    if (!category.is_active) {
      return err('CATEGORY_INACTIVE', `Category '${category.name}' is inactive`);
    }

    if (category.category_type !== expectedType) {
      return err(
        'CATEGORY_TYPE_MISMATCH',
        `Category '${category.name}' is an ${category.category_type} category, but transaction is ${expectedType}`
      );
    }

    return ok(true);
  }

  private mapToDTO(cat: any): CategoryDTO {
    return {
      id: cat.id,
      userId: cat.user_id,
      name: cat.name,
      categoryType: cat.category_type,
      icon: cat.icon,
      color: cat.color,
      isSystem: cat.is_system,
      isActive: cat.is_active,
      createdAt: cat.created_at,
      updatedAt: cat.updated_at,
    };
  }
}

