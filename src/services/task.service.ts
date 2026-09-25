import * as categoryRepository from "../repositories/category.repository.ts";
import * as taskRepository from "../repositories/task.repository.ts";
import type {
  CreateTaskInput,
  Priority,
  SortableField,
  SortOrder,
  Task,
  TaskPage,
  UpdateTaskInput,
} from "../types/task.types.ts";
import { decodeCursor, encodeCursor } from "../utils/cursor.ts";
import { NotFoundError, ValidationError } from "../utils/errors.ts";

type TaskRepository = Pick<
  typeof taskRepository,
  "create" | "findAll" | "findById" | "update" | "remove"
>;
type CategoryRepository = Pick<typeof categoryRepository, "findByIds">;

export interface GetAllTasksOptions {
  completed?: boolean;
  priority?: Priority;
  categoryId?: string;
  sortBy?: SortableField;
  order?: SortOrder;
  limit?: number;
  cursor?: string;
}

const DEFAULT_SORT_BY: SortableField = "createdAt";
const DEFAULT_ORDER: SortOrder = "asc";
const DEFAULT_LIMIT = 20;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Computed fresh on every read rather than stored, so it's never stale.
function withDaysRemaining(task: Task): Task {
  if (!task.dueDate) {
    return task;
  }
  const daysRemaining = Math.ceil(
    (new Date(task.dueDate).getTime() - Date.now()) / MS_PER_DAY,
  );
  return { ...task, daysRemaining };
}

async function assertCategoriesExist(
  categoryIds: string[] | undefined,
  repository: CategoryRepository,
): Promise<void> {
  if (!categoryIds || categoryIds.length === 0) {
    return;
  }
  const found = await repository.findByIds(categoryIds);
  const foundIds = new Set(found.map((category) => category.id));
  const missing = categoryIds.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw new ValidationError(`Unknown category id(s): ${missing.join(", ")}`);
  }
}

export async function createTask(
  input: CreateTaskInput,
  repository: TaskRepository = taskRepository,
  categoryRepositoryOverride: CategoryRepository = categoryRepository,
): Promise<Task> {
  await assertCategoriesExist(input.categoryIds, categoryRepositoryOverride);

  const task = await repository.create({
    title: input.title,
    description: input.description,
    completed: input.completed ?? false,
    priority: input.priority ?? "medium",
    dueDate: input.dueDate,
    categoryIds: input.categoryIds,
  });

  return withDaysRemaining(task);
}

export async function getAllTasks(
  options: GetAllTasksOptions = {},
  repository: TaskRepository = taskRepository,
): Promise<TaskPage> {
  let cursorId: string | undefined;
  if (options.cursor !== undefined) {
    cursorId = decodeCursor(options.cursor);
    if (!cursorId) {
      throw new ValidationError("Invalid cursor");
    }
  }

  const { tasks, hasMore } = await repository.findAll(
    {
      completed: options.completed,
      priority: options.priority,
      categoryId: options.categoryId,
    },
    {
      sortBy: options.sortBy ?? DEFAULT_SORT_BY,
      order: options.order ?? DEFAULT_ORDER,
    },
    { limit: options.limit ?? DEFAULT_LIMIT, cursorId },
  );

  const lastTask = tasks[tasks.length - 1];
  return {
    tasks: tasks.map(withDaysRemaining),
    nextCursor: hasMore && lastTask ? encodeCursor(lastTask.id) : null,
  };
}

export async function getTaskById(
  id: string,
  repository: TaskRepository = taskRepository,
): Promise<Task> {
  const task = await repository.findById(id);

  if (!task) {
    throw new NotFoundError(`Task not found`);
  }

  return withDaysRemaining(task);
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput,
  repository: TaskRepository = taskRepository,
  categoryRepositoryOverride: CategoryRepository = categoryRepository,
): Promise<Task> {
  await assertCategoriesExist(input.categoryIds, categoryRepositoryOverride);

  const task = await repository.update(id, input);

  if (!task) {
    throw new NotFoundError(`Task not found`);
  }

  return withDaysRemaining(task);
}

export async function deleteTask(
  id: string,
  repository: TaskRepository = taskRepository,
): Promise<void> {
  const deleted = await repository.remove(id);

  if (!deleted) {
    throw new NotFoundError(`Task not found`);
  }
}
