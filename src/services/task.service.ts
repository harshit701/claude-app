import { randomUUID } from "node:crypto";
import * as taskRepository from "../repositories/task.repository.ts";
import type { CreateTaskInput, Task, UpdateTaskInput } from "../types/task.types.ts";
import { NotFoundError } from "../utils/errors.ts";

type TaskRepository = Pick<
  typeof taskRepository,
  "create" | "findAll" | "findById" | "update" | "remove"
>;

export async function createTask(
  input: CreateTaskInput,
  repository: TaskRepository = taskRepository,
): Promise<Task> {
  const now = new Date().toISOString();

  const task: Task = {
    id: randomUUID(),
    title: input.title,
    description: input.description,
    completed: input.completed ?? false,
    createdAt: now,
    updatedAt: now,
  };

  return repository.create(task);
}

export async function getAllTasks(
  repository: TaskRepository = taskRepository,
): Promise<Task[]> {
  return repository.findAll();
}

export async function getTaskById(
  id: string,
  repository: TaskRepository = taskRepository,
): Promise<Task> {
  const task = await repository.findById(id);

  if (!task) {
    throw new NotFoundError(`Task with id ${id} not found`);
  }

  return task;
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput,
  repository: TaskRepository = taskRepository,
): Promise<Task> {
  const updates: Partial<Task> = {
    ...input,
    updatedAt: new Date().toISOString(),
  };

  const task = await repository.update(id, updates);

  if (!task) {
    throw new NotFoundError(`Task with id ${id} not found`);
  }

  return task;
}

export async function deleteTask(
  id: string,
  repository: TaskRepository = taskRepository,
): Promise<void> {
  const deleted = await repository.remove(id);

  if (!deleted) {
    throw new NotFoundError(`Task with id ${id} not found`);
  }
}
