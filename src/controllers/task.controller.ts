import type { NextFunction, Request, Response } from "express";
import {
  createTask,
  deleteTask,
  getAllTasks,
  getTaskById,
  updateTask,
} from "../services/task.service.ts";
import type {
  CreateTaskInput,
  Priority,
  UpdateTaskInput,
} from "../types/task.types.ts";
import { sendSuccess } from "../utils/response.ts";

export async function postTask(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const task = await createTask(req.body as CreateTaskInput);
    sendSuccess(res, 201, "Task created successfully", task);
  } catch (error) {
    next(error);
  }
}

export async function getTasks(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // Safe only because validateQuery(taskQuerySchema) already validated these.
    const completed = req.query.completed as boolean | undefined;
    const priority = req.query.priority as Priority | undefined;
    const tasks = await getAllTasks(completed, undefined, priority);
    sendSuccess(res, 200, "Tasks retrieved successfully", tasks);
  } catch (error) {
    next(error);
  }
}

export async function getTask(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await getTaskById(req.params.id);
    sendSuccess(res, 200, "Task retrieved successfully", task);
  } catch (error) {
    next(error);
  }
}

export async function patchTask(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const task = await updateTask(req.params.id, req.body as UpdateTaskInput);
    sendSuccess(res, 200, "Task updated successfully", task);
  } catch (error) {
    next(error);
  }
}

export async function removeTask(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await deleteTask(req.params.id);
    sendSuccess(res, 200, "Task deleted successfully");
  } catch (error) {
    next(error);
  }
}
