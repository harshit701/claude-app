import type { Category } from "./category.types.ts";

export type Priority = "low" | "medium" | "high";

export type SortableField = "createdAt" | "dueDate" | "priority" | "completed";
export type SortOrder = "asc" | "desc";

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  dueDate?: string;
  // Computed on read from `dueDate`; never persisted (see task.service.ts).
  // undefined when the task has no dueDate, negative when overdue.
  daysRemaining?: number;
  categories: Category[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  completed?: boolean;
  priority?: Priority;
  dueDate?: string;
  categoryIds?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: Priority;
  dueDate?: string;
  categoryIds?: string[];
}

export interface TaskPage {
  tasks: Task[];
  nextCursor: string | null;
}
