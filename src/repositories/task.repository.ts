import { readFile, writeFile } from "node:fs/promises";
import type { Task } from "../types/task.types.ts";

const DEFAULT_DATA_FILE = new URL("../data/tasks.json", import.meta.url);

async function readTasks(dataFile: URL): Promise<Task[]> {
  try {
    const contents = await readFile(dataFile, "utf-8");
    if (!contents.trim()) {
      return [];
    }
    return JSON.parse(contents) as Task[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeTasks(dataFile: URL, tasks: Task[]): Promise<void> {
  await writeFile(dataFile, JSON.stringify(tasks, null, 2) + "\n", "utf-8");
}

export async function findAll(dataFile: URL = DEFAULT_DATA_FILE): Promise<Task[]> {
  return readTasks(dataFile);
}

export async function create(task: Task, dataFile: URL = DEFAULT_DATA_FILE): Promise<Task> {
  const tasks = await readTasks(dataFile);
  tasks.push(task);
  await writeTasks(dataFile, tasks);
  return task;
}

export async function findById(
  id: string,
  dataFile: URL = DEFAULT_DATA_FILE,
): Promise<Task | undefined> {
  const tasks = await readTasks(dataFile);
  return tasks.find((task) => task.id === id);
}

export async function update(
  id: string,
  updates: Partial<Task>,
  dataFile: URL = DEFAULT_DATA_FILE,
): Promise<Task | undefined> {
  const tasks = await readTasks(dataFile);
  const index = tasks.findIndex((task) => task.id === id);

  if (index === -1) {
    return undefined;
  }

  const updatedTask = { ...tasks[index], ...updates };
  tasks[index] = updatedTask;
  await writeTasks(dataFile, tasks);
  return updatedTask;
}

export async function remove(
  id: string,
  dataFile: URL = DEFAULT_DATA_FILE,
): Promise<boolean> {
  const tasks = await readTasks(dataFile);
  const remainingTasks = tasks.filter((task) => task.id !== id);

  if (remainingTasks.length === tasks.length) {
    return false;
  }

  await writeTasks(dataFile, remainingTasks);
  return true;
}
