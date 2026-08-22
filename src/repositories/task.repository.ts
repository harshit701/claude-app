import { Prisma, type PrismaClient, type Task as TaskRow } from "@prisma/client";
import { prisma } from "../config/database.ts";
import type { Task } from "../types/task.types.ts";

type NewTask = Pick<Task, "title" | "description" | "completed">;
type TaskUpdate = Partial<Pick<Task, "title" | "description" | "completed">>;

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    completed: row.completed,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// P2025: record not found. P2023: malformed id (e.g. not a valid UUID) rejected
// by the database before a row lookup could even happen — both mean "no such task".
function isTaskNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2025" || error.code === "P2023")
  );
}

export async function findAll(client: PrismaClient = prisma): Promise<Task[]> {
  const rows = await client.task.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toTask);
}

export async function create(task: NewTask, client: PrismaClient = prisma): Promise<Task> {
  const row = await client.task.create({ data: task });
  return toTask(row);
}

export async function findById(
  id: string,
  client: PrismaClient = prisma,
): Promise<Task | undefined> {
  try {
    const row = await client.task.findUnique({ where: { id } });
    return row ? toTask(row) : undefined;
  } catch (error) {
    if (isTaskNotFound(error)) {
      return undefined;
    }
    throw error;
  }
}

export async function update(
  id: string,
  updates: TaskUpdate,
  client: PrismaClient = prisma,
): Promise<Task | undefined> {
  try {
    const row = await client.task.update({ where: { id }, data: updates });
    return toTask(row);
  } catch (error) {
    if (isTaskNotFound(error)) {
      return undefined;
    }
    throw error;
  }
}

export async function remove(id: string, client: PrismaClient = prisma): Promise<boolean> {
  try {
    await client.task.delete({ where: { id } });
    return true;
  } catch (error) {
    if (isTaskNotFound(error)) {
      return false;
    }
    throw error;
  }
}
