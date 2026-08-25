import * as taskRepository from "../repositories/task.repository.ts";
import type {
  CreateTaskInput,
  Task,
  UpdateTaskInput,
} from "../types/task.types.ts";
import { NotFoundError } from "../utils/errors.ts";

type TaskRepository = Pick<
  typeof taskRepository,
  "create" | "findAll" | "findById" | "update" | "remove"
>;

export async function createTask(
  input: CreateTaskInput,
  repository: TaskRepository = taskRepository,
): Promise<Task> {
  return repository.create({
    title: input.title,
    description: input.description,
    completed: input.completed ?? false,
  });
}

export async function getAllTasks(
  completed?: boolean,
  repository: TaskRepository = taskRepository,
): Promise<Task[]> {
  return repository.findAll(completed);
}

export async function getTaskById(
  id: string,
  repository: TaskRepository = taskRepository,
): Promise<Task> {
  const task = await repository.findById(id);

  if (!task) {
    throw new NotFoundError(`Task not found`);
  }

  return task;
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput,
  repository: TaskRepository = taskRepository,
): Promise<Task> {
  const task = await repository.update(id, input);

  if (!task) {
    throw new NotFoundError(`Task not found`);
  }

  return task;
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
