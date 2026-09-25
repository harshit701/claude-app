import {
  Prisma,
  type PrismaClient,
  type Category as CategoryRow,
  type Task as TaskRow,
} from "@prisma/client";
import { prisma } from "../config/database.ts";
import type {
  Priority,
  SortableField,
  SortOrder,
  Task,
} from "../types/task.types.ts";

type NewTask = Pick<Task, "title" | "description" | "completed" | "priority"> & {
  dueDate?: string;
  categoryIds?: string[];
};
type TaskUpdate = Partial<
  Pick<Task, "title" | "description" | "completed" | "priority">
> & {
  dueDate?: string;
  categoryIds?: string[];
};

export interface TaskFilters {
  completed?: boolean;
  priority?: Priority;
  categoryId?: string;
}

export interface TaskSort {
  sortBy: SortableField;
  order: SortOrder;
}

export interface TaskPagination {
  limit: number;
  cursorId?: string;
}

export interface TaskPageResult {
  tasks: Task[];
  hasMore: boolean;
}

type TaskRowWithCategories = TaskRow & { categories: CategoryRow[] };

const taskInclude = { categories: true } as const;

function toTask(row: TaskRowWithCategories): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    completed: row.completed,
    priority: row.priority,
    dueDate: row.dueDate ? row.dueDate.toISOString() : undefined,
    categories: row.categories.map((category) => ({
      id: category.id,
      name: category.name,
      createdAt: category.createdAt.toISOString(),
    })),
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

function buildOrderBy(sort: TaskSort) {
  const primary =
    sort.sortBy === "dueDate"
      ? { dueDate: { sort: sort.order, nulls: "last" as const } }
      : { [sort.sortBy]: sort.order };
  // `id` is a stable tiebreaker: without it, rows sharing the same sort value
  // (e.g. two "medium" priority tasks) could be skipped or repeated across pages.
  return [primary, { id: "asc" as const }];
}

export async function findAll(
  filters: TaskFilters = {},
  sort: TaskSort = { sortBy: "createdAt", order: "asc" },
  pagination: TaskPagination = { limit: 20 },
  client: PrismaClient = prisma,
): Promise<TaskPageResult> {
  const where = {
    ...(filters.completed === undefined ? {} : { completed: filters.completed }),
    ...(filters.priority === undefined ? {} : { priority: filters.priority }),
    ...(filters.categoryId === undefined
      ? {}
      : { categories: { some: { id: filters.categoryId } } }),
  };

  const rows = await client.task.findMany({
    where: Object.keys(where).length === 0 ? undefined : where,
    orderBy: buildOrderBy(sort),
    include: taskInclude,
    take: pagination.limit + 1,
    ...(pagination.cursorId
      ? { cursor: { id: pagination.cursorId }, skip: 1 }
      : {}),
  });

  const hasMore = rows.length > pagination.limit;
  const page = hasMore ? rows.slice(0, pagination.limit) : rows;
  return { tasks: page.map(toTask), hasMore };
}

export async function create(
  task: NewTask,
  client: PrismaClient = prisma,
): Promise<Task> {
  const { dueDate, categoryIds, ...rest } = task;
  const row = await client.task.create({
    data: {
      ...rest,
      dueDate: dueDate === undefined ? undefined : new Date(dueDate),
      categories:
        categoryIds === undefined
          ? undefined
          : { connect: categoryIds.map((id) => ({ id })) },
    },
    include: taskInclude,
  });
  return toTask(row);
}

export async function findById(
  id: string,
  client: PrismaClient = prisma,
): Promise<Task | undefined> {
  try {
    const row = await client.task.findUnique({
      where: { id },
      include: taskInclude,
    });
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
  const { dueDate, categoryIds, ...rest } = updates;
  try {
    const row = await client.task.update({
      where: { id },
      data: {
        ...rest,
        ...(dueDate === undefined ? {} : { dueDate: new Date(dueDate) }),
        ...(categoryIds === undefined
          ? {}
          : { categories: { set: categoryIds.map((catId) => ({ id: catId })) } }),
      },
      include: taskInclude,
    });
    return toTask(row);
  } catch (error) {
    if (isTaskNotFound(error)) {
      return undefined;
    }
    throw error;
  }
}

export async function remove(
  id: string,
  client: PrismaClient = prisma,
): Promise<boolean> {
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
