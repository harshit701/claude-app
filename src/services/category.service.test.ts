import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { createCategory, getAllCategories } from "./category.service.ts";
import { ConflictError } from "../utils/errors.ts";
import type { Category } from "../types/category.types.ts";

function buildCategory(overrides: Partial<Category> = {}): Category {
  return { id: "1", name: "Work", createdAt: "2026-01-01T00:00:00.000Z", ...overrides };
}

function duplicateNameError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
  });
}

function createFakeRepository(initial: Category[] = []) {
  const saved: Category[] = [...initial];
  return {
    saved,
    create: async (input: { name: string }) => {
      if (saved.some((category) => category.name === input.name)) {
        throw duplicateNameError();
      }
      const category = buildCategory({ id: String(saved.length + 1), name: input.name });
      saved.push(category);
      return category;
    },
    findAll: async () => saved,
  };
}

describe("createCategory", () => {
  it("creates and returns the category", async () => {
    const repository = createFakeRepository();

    const category = await createCategory({ name: "Work" }, repository);

    assert.equal(category.name, "Work");
    assert.equal(repository.saved.length, 1);
  });

  it("throws ConflictError when the name already exists", async () => {
    const repository = createFakeRepository([buildCategory({ name: "Work" })]);

    await assert.rejects(() => createCategory({ name: "Work" }, repository), ConflictError);
  });
});

describe("getAllCategories", () => {
  it("returns all categories from the repository", async () => {
    const categories = [buildCategory({ id: "1" }), buildCategory({ id: "2", name: "Home" })];
    const repository = createFakeRepository(categories);

    const result = await getAllCategories(repository);

    assert.deepEqual(result, categories);
  });

  it("returns an empty array when there are no categories", async () => {
    const repository = createFakeRepository([]);

    const result = await getAllCategories(repository);

    assert.deepEqual(result, []);
  });
});
