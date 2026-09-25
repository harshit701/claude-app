import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createTask,
  deleteTask,
  getAllTasks,
  getTaskById,
  updateTask,
} from "./task.service.ts";
import { NotFoundError, ValidationError } from "../utils/errors.ts";
import type { Category } from "../types/category.types.ts";
import type { Task } from "../types/task.types.ts";
import { encodeCursor } from "../utils/cursor.ts";

function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "1",
    title: "Buy milk",
    completed: false,
    priority: "medium",
    categories: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createFakeRepository(initialTasks: Task[] = []) {
  const saved: Task[] = [...initialTasks];
  let nextId = saved.length + 1;
  let lastFindAllArgs: unknown[] = [];
  let findAllResult = { tasks: saved, hasMore: false };

  return {
    saved,
    get lastFindAllArgs() {
      return lastFindAllArgs;
    },
    setFindAllResult(result: { tasks: Task[]; hasMore: boolean }) {
      findAllResult = result;
    },
    create: async (input: any) => {
      const now = new Date().toISOString();
      const task: Task = {
        id: String(nextId++),
        title: input.title,
        description: input.description,
        completed: input.completed,
        priority: input.priority,
        dueDate: input.dueDate,
        categories: [],
        createdAt: now,
        updatedAt: now,
      };
      saved.push(task);
      return task;
    },
    findAll: async (...args: unknown[]) => {
      lastFindAllArgs = args;
      return findAllResult;
    },
    findById: async (id: string) => saved.find((task) => task.id === id),
    update: async (id: string, updates: any) => {
      const index = saved.findIndex((task) => task.id === id);
      if (index === -1) {
        return undefined;
      }
      saved[index] = { ...saved[index], ...updates, updatedAt: new Date().toISOString() } as Task;
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

function createFakeCategoryRepository(categories: Category[] = []) {
  return {
    findByIds: async (ids: string[]) => categories.filter((category) => ids.includes(category.id)),
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

  it("defaults priority to medium when omitted", async () => {
    const repository = createFakeRepository();

    const task = await createTask({ title: "Buy milk" }, repository);

    assert.equal(task.priority, "medium");
  });

  it("keeps priority as provided when given", async () => {
    const repository = createFakeRepository();

    const task = await createTask({ title: "Buy milk", priority: "high" }, repository);

    assert.equal(task.priority, "high");
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

  it("computes daysRemaining from dueDate", async () => {
    const repository = createFakeRepository();
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const task = await createTask({ title: "Buy milk", dueDate }, repository);

    assert.equal(task.daysRemaining, 3);
  });

  it("leaves daysRemaining undefined when there is no dueDate", async () => {
    const repository = createFakeRepository();

    const task = await createTask({ title: "Buy milk" }, repository);

    assert.equal(task.daysRemaining, undefined);
  });

  it("proceeds when all given categoryIds exist", async () => {
    const repository = createFakeRepository();
    const categoryRepository = createFakeCategoryRepository([
      { id: "cat-1", name: "Work", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);

    const task = await createTask(
      { title: "Buy milk", categoryIds: ["cat-1"] },
      repository,
      categoryRepository,
    );

    assert.equal(task.title, "Buy milk");
  });

  it("throws ValidationError when a categoryId does not exist", async () => {
    const repository = createFakeRepository();
    const categoryRepository = createFakeCategoryRepository([]);

    await assert.rejects(
      () =>
        createTask(
          { title: "Buy milk", categoryIds: ["missing-cat"] },
          repository,
          categoryRepository,
        ),
      ValidationError,
    );
  });
});

describe("getAllTasks", () => {
  it("defaults sortBy, order, and limit when none are given", async () => {
    const repository = createFakeRepository();

    await getAllTasks({}, repository);

    assert.deepEqual(repository.lastFindAllArgs[0], {
      completed: undefined,
      priority: undefined,
      categoryId: undefined,
    });
    assert.deepEqual(repository.lastFindAllArgs[1], { sortBy: "createdAt", order: "asc" });
    assert.deepEqual(repository.lastFindAllArgs[2], { limit: 20, cursorId: undefined });
  });

  it("forwards completed, priority, and categoryId filters to the repository", async () => {
    const repository = createFakeRepository();

    await getAllTasks({ completed: true, priority: "high", categoryId: "cat-1" }, repository);

    assert.deepEqual(repository.lastFindAllArgs[0], {
      completed: true,
      priority: "high",
      categoryId: "cat-1",
    });
  });

  it("forwards sortBy, order, and limit to the repository", async () => {
    const repository = createFakeRepository();

    await getAllTasks({ sortBy: "dueDate", order: "desc", limit: 5 }, repository);

    assert.deepEqual(repository.lastFindAllArgs[1], { sortBy: "dueDate", order: "desc" });
    assert.deepEqual(repository.lastFindAllArgs[2], { limit: 5, cursorId: undefined });
  });

  it("decodes a given cursor into a cursorId for the repository", async () => {
    const repository = createFakeRepository();
    const cursor = encodeCursor("task-7");

    await getAllTasks({ cursor }, repository);

    assert.deepEqual(repository.lastFindAllArgs[2], { limit: 20, cursorId: "task-7" });
  });

  it("throws ValidationError when the cursor cannot be decoded", async () => {
    const repository = createFakeRepository();

    await assert.rejects(() => getAllTasks({ cursor: "" }, repository), ValidationError);
  });

  it("returns nextCursor: null when the repository reports no more pages", async () => {
    const repository = createFakeRepository();
    repository.setFindAllResult({ tasks: [buildTask({ id: "1" })], hasMore: false });

    const page = await getAllTasks({}, repository);

    assert.equal(page.nextCursor, null);
  });

  it("returns an encoded nextCursor from the last task when more pages remain", async () => {
    const repository = createFakeRepository();
    repository.setFindAllResult({
      tasks: [buildTask({ id: "1" }), buildTask({ id: "2" })],
      hasMore: true,
    });

    const page = await getAllTasks({}, repository);

    assert.equal(page.nextCursor, encodeCursor("2"));
  });

  it("computes daysRemaining for every returned task", async () => {
    const repository = createFakeRepository();
    const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    repository.setFindAllResult({ tasks: [buildTask({ id: "1", dueDate })], hasMore: false });

    const page = await getAllTasks({}, repository);

    assert.equal(page.tasks[0].daysRemaining, 1);
  });
});

describe("getTaskById", () => {
  it("returns the matching task", async () => {
    const task = buildTask();
    const repository = createFakeRepository([task]);

    const found = await getTaskById("1", repository);

    assert.deepEqual(found, task);
  });

  it("computes daysRemaining when the task has a dueDate", async () => {
    const dueDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const task = buildTask({ dueDate });
    const repository = createFakeRepository([task]);

    const found = await getTaskById("1", repository);

    assert.equal(found.daysRemaining, -2);
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

  it("recomputes daysRemaining after the update", async () => {
    const task = buildTask({ id: "1" });
    const repository = createFakeRepository([task]);
    const dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    const updated = await updateTask("1", { dueDate }, repository);

    assert.equal(updated.daysRemaining, 5);
  });

  it("proceeds when all given categoryIds exist", async () => {
    const task = buildTask({ id: "1" });
    const repository = createFakeRepository([task]);
    const categoryRepository = createFakeCategoryRepository([
      { id: "cat-1", name: "Work", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);

    const updated = await updateTask(
      "1",
      { categoryIds: ["cat-1"] },
      repository,
      categoryRepository,
    );

    assert.equal(updated.id, "1");
  });

  it("throws ValidationError when a categoryId does not exist", async () => {
    const task = buildTask({ id: "1" });
    const repository = createFakeRepository([task]);
    const categoryRepository = createFakeCategoryRepository([]);

    await assert.rejects(
      () => updateTask("1", { categoryIds: ["missing-cat"] }, repository, categoryRepository),
      ValidationError,
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
