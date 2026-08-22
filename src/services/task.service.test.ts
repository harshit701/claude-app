import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createTask,
  deleteTask,
  getAllTasks,
  getTaskById,
  updateTask,
} from "./task.service.ts";
import { NotFoundError } from "../utils/errors.ts";
import type { Task } from "../types/task.types.ts";

function createFakeRepository(initialTasks: Task[] = []) {
  const saved: Task[] = [...initialTasks];
  let nextId = saved.length + 1;
  return {
    saved,
    create: async (input: Pick<Task, "title" | "description" | "completed">) => {
      const now = new Date().toISOString();
      const task: Task = {
        id: String(nextId++),
        title: input.title,
        description: input.description,
        completed: input.completed,
        createdAt: now,
        updatedAt: now,
      };
      saved.push(task);
      return task;
    },
    findAll: async () => saved,
    findById: async (id: string) => saved.find((task) => task.id === id),
    update: async (id: string, updates: Partial<Pick<Task, "title" | "description" | "completed">>) => {
      const index = saved.findIndex((task) => task.id === id);
      if (index === -1) {
        return undefined;
      }
      saved[index] = { ...saved[index], ...updates, updatedAt: new Date().toISOString() };
      return saved[index];
    },
    remove: async (id: string) => {
      const index = saved.findIndex((task) => task.id === id);
      if (index === -1) {
        return false;
      }
      saved.splice(index, 1);
      return true;
    },
  };
}

function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "1",
    title: "Buy milk",
    completed: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("createTask", () => {
  it("defaults completed to false when omitted", async () => {
    const repository = createFakeRepository();

    const task = await createTask({ title: "Buy milk" }, repository);

    assert.equal(task.completed, false);
  });

  it("keeps completed as provided when given", async () => {
    const repository = createFakeRepository();

    const task = await createTask({ title: "Buy milk", completed: true }, repository);

    assert.equal(task.completed, true);
  });

  it("generates an id server-side", async () => {
    const repository = createFakeRepository();

    const task = await createTask({ title: "Buy milk" }, repository);

    assert.equal(typeof task.id, "string");
    assert.ok(task.id.length > 0);
  });

  it("generates createdAt and updatedAt as matching valid ISO timestamps", async () => {
    const repository = createFakeRepository();

    const task = await createTask({ title: "Buy milk" }, repository);

    assert.equal(task.createdAt, task.updatedAt);
    assert.equal(new Date(task.createdAt).toISOString(), task.createdAt);
  });

  it("persists the created task via the repository", async () => {
    const repository = createFakeRepository();

    const task = await createTask({ title: "Buy milk" }, repository);

    assert.equal(repository.saved.length, 1);
    assert.deepEqual(repository.saved[0], task);
  });
});

describe("getAllTasks", () => {
  it("returns all tasks from the repository", async () => {
    const task = buildTask();
    const repository = createFakeRepository([task]);

    const tasks = await getAllTasks(repository);

    assert.deepEqual(tasks, [task]);
  });
});

describe("getTaskById", () => {
  it("returns the matching task", async () => {
    const task = buildTask();
    const repository = createFakeRepository([task]);

    const found = await getTaskById("1", repository);

    assert.deepEqual(found, task);
  });

  it("throws NotFoundError when no task matches", async () => {
    const repository = createFakeRepository([]);

    await assert.rejects(() => getTaskById("missing", repository), NotFoundError);
  });
});

describe("updateTask", () => {
  it("applies a partial update", async () => {
    const task = buildTask({ title: "Original" });
    const repository = createFakeRepository([task]);

    const updated = await updateTask("1", { title: "Updated" }, repository);

    assert.equal(updated.title, "Updated");
    assert.equal(updated.completed, false);
  });

  it("supports updating only one field at a time", async () => {
    const task = buildTask({ completed: false });
    const repository = createFakeRepository([task]);

    const updated = await updateTask("1", { completed: true }, repository);

    assert.equal(updated.completed, true);
    assert.equal(updated.title, task.title);
  });

  it("updates updatedAt", async () => {
    const task = buildTask({ updatedAt: "2020-01-01T00:00:00.000Z" });
    const repository = createFakeRepository([task]);

    const updated = await updateTask("1", { title: "Updated" }, repository);

    assert.notEqual(updated.updatedAt, "2020-01-01T00:00:00.000Z");
    assert.equal(new Date(updated.updatedAt).toISOString(), updated.updatedAt);
  });

  it("does not allow the id or createdAt to be modified", async () => {
    const task = buildTask({ id: "1", createdAt: "2020-01-01T00:00:00.000Z" });
    const repository = createFakeRepository([task]);

    const updated = await updateTask("1", { title: "Updated" }, repository);

    assert.equal(updated.id, "1");
    assert.equal(updated.createdAt, "2020-01-01T00:00:00.000Z");
  });

  it("throws NotFoundError when no task matches", async () => {
    const repository = createFakeRepository([]);

    await assert.rejects(
      () => updateTask("missing", { title: "Updated" }, repository),
      NotFoundError,
    );
  });
});

describe("deleteTask", () => {
  it("removes the matching task", async () => {
    const task = buildTask();
    const repository = createFakeRepository([task]);

    await deleteTask("1", repository);

    assert.equal(repository.saved.length, 0);
  });

  it("throws NotFoundError when no task matches", async () => {
    const repository = createFakeRepository([]);

    await assert.rejects(() => deleteTask("missing", repository), NotFoundError);
  });
});
