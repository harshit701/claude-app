import {
  Prisma,
  type PrismaClient,
  type Category as CategoryRow,
} from "@prisma/client";
import { prisma } from "../config/database.ts";
import type { Category, CreateCategoryInput } from "../types/category.types.ts";

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
  };
}

export function isDuplicateName(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function findAll(client: PrismaClient = prisma): Promise<Category[]> {
  const rows = await client.category.findMany({ orderBy: { name: "asc" } });
  return rows.map(toCategory);
}

export async function findByIds(
  ids: string[],
  client: PrismaClient = prisma,
): Promise<Category[]> {
  const rows = await client.category.findMany({ where: { id: { in: ids } } });
  return rows.map(toCategory);
}

export async function create(
  input: CreateCategoryInput,
  client: PrismaClient = prisma,
): Promise<Category> {
  const row = await client.category.create({ data: input });
  return toCategory(row);
}
