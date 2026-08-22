import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Prisma, type PrismaClient } from "@prisma/client";
import { create, findAll, findById, remove, update } from "./task.repository.ts";

const NOW = new Date("2026-01-01T00:00:00.000Z");

function buildRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "test-id",
    title: "Buy milk",
    description: null,
    completed: false,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function notFoundError() {
  return new Prisma.PrismaClientKnownRequestError("An operation failed because it depends on one or more records that were required but not found.", {
    code: "P2025",
    clientVersion: "test",
  });
}

function invalidIdError() {
  return new Prisma.PrismaClientKnownRequestError(
    "Inconsistent column data: Error creating UUID, invalid character.",
    {
      code: "P2023",
      clientVersion: "test",
    },
  );
}

function createFakeClient(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    task: {
      findMany: async () => [],
      create: async () => buildRow(),
      findUnique: async () => null,
      update: async () => {
        throw notFoundError();
      },
      delete: async () => {
        throw notFoundError();
      },
      ...overrides,
    },
  } as unknown as PrismaClient;
}

describe("task.repository", () => {
  describe("findAll", () => {
    it("maps database rows to Task objects", async () => {
      const client = createFakeClient({
        findMany: async () => [buildRow({ id: "1" }), buildRow({ id: "2", title: "Second" })],
      });

      const tasks = await findAll(client);

      assert.equal(tasks.length, 2);
      assert.equal(tasks[0].id, "1");
      assert.equal(tasks[0].createdAt, NOW.toISOString());
      assert.equal(tasks[1].title, "Second");
    });

    it("converts a null description to undefined", async () => {
      const client = createFakeClient({
        findMany: async () => [buildRow({ description: null })],
      });

      const [task] = await findAll(client);

      assert.equal(task.description, undefined);
    });
  });

  describe("create", () => {
    it("passes the given fields to the database and returns the created task", async () => {
      let receivedData: unknown;
      const client = createFakeClient({
        create: async ({ data }: { data: unknown }) => {
          receivedData = data;
          return buildRow({ id: "generated-id", title: "Buy milk" });
        },
      });

      const task = await create({ title: "Buy milk", description: undefined, completed: false }, client);

      assert.deepEqual(receivedData, { title: "Buy milk", description: undefined, completed: false });
      assert.equal(task.id, "generated-id");
      assert.equal(task.title, "Buy milk");
    });
  });

  describe("findById", () => {
    it("returns the matching task", async () => {
      const client = createFakeClient({
        findUnique: async () => buildRow({ id: "1" }),
      });

      const task = await findById("1", client);

      assert.equal(task?.id, "1");
    });

    it("returns undefined when no task matches", async () => {
      const client = createFakeClient({ findUnique: async () => null });

      const task = await findById("missing", client);

      assert.equal(task, undefined);
    });

    it("returns undefined instead of throwing when the id is not a valid UUID", async () => {
      const client = createFakeClient({
        findUnique: async () => {
          throw invalidIdError();
        },
      });

      const task = await findById("not-a-uuid", client);

      assert.equal(task, undefined);
    });
  });

  describe("update", () => {
    it("returns the updated task on success", async () => {
      const client = createFakeClient({
        update: async () => buildRow({ id: "1", title: "Updated" }),
      });

      const task = await update("1", { title: "Updated" }, client);

      assert.equal(task?.title, "Updated");
    });

    it("returns undefined when the task does not exist", async () => {
      const client = createFakeClient({
        update: async () => {
          throw notFoundError();
        },
      });

      const task = await update("missing", { title: "Updated" }, client);

      assert.equal(task, undefined);
    });

    it("returns undefined instead of throwing when the id is not a valid UUID", async () => {
      const client = createFakeClient({
        update: async () => {
          throw invalidIdError();
        },
      });

      const task = await update("not-a-uuid", { title: "Updated" }, client);

      assert.equal(task, undefined);
    });

    it("rethrows unexpected errors", async () => {
      const client = createFakeClient({
        update: async () => {
          throw new Error("connection lost");
        },
      });

      await assert.rejects(() => update("1", { title: "Updated" }, client), /connection lost/);
    });
  });

  describe("remove", () => {
    it("returns true when the task is deleted", async () => {
      const client = createFakeClient({ delete: async () => buildRow({ id: "1" }) });

      const removed = await remove("1", client);

      assert.equal(removed, true);
    });

    it("returns false when the task does not exist", async () => {
      const client = createFakeClient({
        delete: async () => {
          throw notFoundError();
        },
      });

      const removed = await remove("missing", client);

      assert.equal(removed, false);
    });

    it("returns false instead of throwing when the id is not a valid UUID", async () => {
      const client = createFakeClient({
        delete: async () => {
          throw invalidIdError();
        },
      });

      const removed = await remove("not-a-uuid", client);

      assert.equal(removed, false);
    });

    it("rethrows unexpected errors", async () => {
      const client = createFakeClient({
        delete: async () => {
          throw new Error("connection lost");
        },
      });

      await assert.rejects(() => remove("1", client), /connection lost/);
    });
  });
});
