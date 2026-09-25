import * as categoryRepository from "../repositories/category.repository.ts";
import type { Category, CreateCategoryInput } from "../types/category.types.ts";
import { ConflictError } from "../utils/errors.ts";

type CategoryRepository = Pick<typeof categoryRepository, "create" | "findAll">;

export async function createCategory(
  input: CreateCategoryInput,
  repository: CategoryRepository = categoryRepository,
): Promise<Category> {
  try {
    return await repository.create(input);
  } catch (error) {
    if (categoryRepository.isDuplicateName(error)) {
      throw new ConflictError(`Category "${input.name}" already exists`);
    }
    throw error;
  }
}

export async function getAllCategories(
  repository: CategoryRepository = categoryRepository,
): Promise<Category[]> {
  return repository.findAll();
}
