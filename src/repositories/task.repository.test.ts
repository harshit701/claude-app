import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { create, findAll, findById, remove, update } from "./task.repository.ts";
import type { Task } from "../types/task.types.ts";

let tempDir: string;
let tempFileUrl: URL;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "task-repo-test-"));
  tempFileUrl = pathToFileURL(join(tempDir, "tasks.json"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "test-id",
    title: "Buy milk",
    completed: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("task.repository", () => {
  it("creates the file and persists a task when none exists yet", async () => {
    const task = buildTask();

    await create(task, tempFileUrl);

    const tasks = await findAll(tempFileUrl);
    assert.deepEqual(tasks, [task]);
  });

  it("appends to existing tasks without overwriting them", async () => {
    const first = buildTask({ id: "1", title: "First" });
    const second = buildTask({ id: "2", title: "Second" });

    await create(first, tempFileUrl);
    await create(second, tempFileUrl);

    const tasks = await findAll(tempFileUrl);
    assert.deepEqual(tasks, [first, second]);
  });

  it("writes valid JSON that matches what was created", async () => {
    const task = buildTask();

    await create(task, tempFileUrl);

    const raw = await readFile(tempFileUrl, "utf-8");
    const parsed = JSON.parse(raw);
    assert.deepEqual(parsed, [task]);
  });

  it("findById returns the matching task", async () => {
    const task = buildTask({ id: "1" });
    await create(task, tempFileUrl);

    const found = await findById("1", tempFileUrl);
    assert.deepEqual(found, task);
  });

  it("findById returns undefined when no task matches", async () => {
    await create(buildTask({ id: "1" }), tempFileUrl);

    const found = await findById("missing", tempFileUrl);
    assert.equal(found, undefined);
  });

  it("update merges the given fields into the matching task", async () => {
    await create(buildTask({ id: "1", title: "Original" }), tempFileUrl);

    const updated = await update("1", { title: "Updated" }, tempFileUrl);

    assert.equal(updated?.title, "Updated");
    assert.equal(updated?.id, "1");
  });

  it("update returns undefined when no task matches", async () => {
    await create(buildTask({ id: "1" }), tempFileUrl);

    const updated = await update("missing", { title: "Updated" }, tempFileUrl);
    assert.equal(updated, undefined);
  });

  it("update leaves other tasks untouched", async () => {
    const first = buildTask({ id: "1", title: "First" });
    const second = buildTask({ id: "2", title: "Second" });
    await create(first, tempFileUrl);
    await create(second, tempFileUrl);

    await update("1", { title: "Updated" }, tempFileUrl);

    const tasks = await findAll(tempFileUrl);
    assert.deepEqual(
      tasks.find((task) => task.id === "2"),
      second,
    );
  });

  it("remove deletes the matching task and returns true", async () => {
    await create(buildTask({ id: "1" }), tempFileUrl);

    const removed = await remove("1", tempFileUrl);

    assert.equal(removed, true);
    assert.deepEqual(await findAll(tempFileUrl), []);
  });

  it("remove returns false when no task matches", async () => {
    await create(buildTask({ id: "1" }), tempFileUrl);

    const removed = await remove("missing", tempFileUrl);

    assert.equal(removed, false);
    assert.equal((await findAll(tempFileUrl)).length, 1);
  });

  it("remove leaves other tasks untouched", async () => {
    const first = buildTask({ id: "1", title: "First" });
    const second = buildTask({ id: "2", title: "Second" });
    await create(first, tempFileUrl);
    await create(second, tempFileUrl);

    await remove("1", tempFileUrl);

    const tasks = await findAll(tempFileUrl);
    assert.deepEqual(tasks, [second]);
  });
});
