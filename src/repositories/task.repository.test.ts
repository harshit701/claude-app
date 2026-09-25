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
    priority: "medium",
    dueDate: null,
    categories: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function buildCategoryRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "cat-1",
    name: "Work",
    createdAt: NOW,
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

      const { tasks } = await findAll(undefined, undefined, undefined, client);

      assert.equal(tasks.length, 2);
      assert.equal(tasks[0].id, "1");
      assert.equal(tasks[0].createdAt, NOW.toISOString());
      assert.equal(tasks[1].title, "Second");
    });

    it("converts a null description to undefined", async () => {
      const client = createFakeClient({
        findMany: async () => [buildRow({ description: null })],
      });

      const { tasks } = await findAll(undefined, undefined, undefined, client);

      assert.equal(tasks[0].description, undefined);
    });

    it("maps a null dueDate to undefined and a set dueDate to an ISO string", async () => {
      const client = createFakeClient({
        findMany: async () => [
          buildRow({ id: "1", dueDate: null }),
          buildRow({ id: "2", dueDate: new Date("2026-02-01T00:00:00.000Z") }),
        ],
      });

      const { tasks } = await findAll(undefined, undefined, undefined, client);

      assert.equal(tasks[0].dueDate, undefined);
      assert.equal(tasks[1].dueDate, "2026-02-01T00:00:00.000Z");
    });

    it("maps categories on the row to the Task's categories array", async () => {
      const client = createFakeClient({
        findMany: async () => [buildRow({ categories: [buildCategoryRow()] })],
      });

      const { tasks } = await findAll(undefined, undefined, undefined, client);

      assert.deepEqual(tasks[0].categories, [
        { id: "cat-1", name: "Work", createdAt: NOW.toISOString() },
      ]);
    });

    it("queries without a where clause when no filter is given", async () => {
      let receivedArgs: unknown;
      const client = createFakeClient({
        findMany: async (args: unknown) => {
          receivedArgs = args;
          return [];
        },
      });

      await findAll(undefined, undefined, undefined, client);

      const args = receivedArgs as { where: unknown; orderBy: unknown };
      assert.equal(args.where, undefined);
      assert.deepEqual(args.orderBy, [{ createdAt: "asc" }, { id: "asc" }]);
    });

    it("filters by completed: true", async () => {
      let receivedArgs: unknown;
      const client = createFakeClient({
        findMany: async (args: unknown) => {
          receivedArgs = args;
          return [buildRow({ id: "1", completed: true })];
        },
      });

      const { tasks } = await findAll({ completed: true }, undefined, undefined, client);

      const args = receivedArgs as { where: unknown };
      assert.deepEqual(args.where, { completed: true });
      assert.equal(tasks[0].completed, true);
    });

    it("filters by priority", async () => {
      let receivedArgs: unknown;
      const client = createFakeClient({
        findMany: async (args: unknown) => {
          receivedArgs = args;
          return [buildRow({ id: "1", priority: "high" })];
        },
      });

      const { tasks } = await findAll({ priority: "high" }, undefined, undefined, client);

      const args = receivedArgs as { where: unknown };
      assert.deepEqual(args.where, { priority: "high" });
      assert.equal(tasks[0].priority, "high");
    });

    it("filters by categoryId using a relation 'some' clause", async () => {
      let receivedArgs: unknown;
      const client = createFakeClient({
        findMany: async (args: unknown) => {
          receivedArgs = args;
          return [];
        },
      });

      await findAll({ categoryId: "cat-1" }, undefined, undefined, client);

      const args = receivedArgs as { where: unknown };
      assert.deepEqual(args.where, { categories: { some: { id: "cat-1" } } });
    });

    it("combines completed, priority, and categoryId filters", async () => {
      let receivedArgs: unknown;
      const client = createFakeClient({
        findMany: async (args: unknown) => {
          receivedArgs = args;
          return [];
        },
      });

      await findAll(
        { completed: true, priority: "low", categoryId: "cat-1" },
        undefined,
        undefined,
        client,
      );

      const args = receivedArgs as { where: unknown };
      assert.deepEqual(args.where, {
        completed: true,
        priority: "low",
        categories: { some: { id: "cat-1" } },
      });
    });

    it("sorts by dueDate with nulls last, using id as a tiebreaker", async () => {
      let receivedArgs: unknown;
      const client = createFakeClient({
        findMany: async (args: unknown) => {
          receivedArgs = args;
          return [];
        },
      });

      await findAll(undefined, { sortBy: "dueDate", order: "desc" }, undefined, client);

      const args = receivedArgs as { orderBy: unknown };
      assert.deepEqual(args.orderBy, [
        { dueDate: { sort: "desc", nulls: "last" } },
        { id: "asc" },
      ]);
    });

    it("requests one extra row and reports hasMore when more rows exist", async () => {
      const client = createFakeClient({
        findMany: async () => [
          buildRow({ id: "1" }),
          buildRow({ id: "2" }),
          buildRow({ id: "3" }),
        ],
      });

      const { tasks, hasMore } = await findAll(undefined, undefined, { limit: 2 }, client);

      assert.equal(tasks.length, 2);
      assert.equal(hasMore, true);
    });

    it("reports hasMore: false when fewer rows than the limit come back", async () => {
      const client = createFakeClient({
        findMany: async () => [buildRow({ id: "1" })],
      });

      const { tasks, hasMore } = await findAll(undefined, undefined, { limit: 2 }, client);

      assert.equal(tasks.length, 1);
      assert.equal(hasMore, false);
    });

    it("passes limit + 1 as take, and forwards cursor/skip when a cursorId is given", async () => {
      let receivedArgs: unknown;
      const client = createFakeClient({
        findMany: async (args: unknown) => {
          receivedArgs = args;
          return [];
        },
      });

      await findAll(undefined, undefined, { limit: 10, cursorId: "task-5" }, client);

      assert.deepEqual(receivedArgs, {
        where: undefined,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: { categories: true },
        take: 11,
        cursor: { id: "task-5" },
        skip: 1,
      });
    });

    it("does not include cursor/skip when no cursorId is given", async () => {
      let receivedArgs: unknown;
      const client = createFakeClient({
        findMany: async (args: unknown) => {
          receivedArgs = args;
          return [];
        },
      });

      await findAll(undefined, undefined, { limit: 10 }, client);

      const args = receivedArgs as Record<string, unknown>;
      assert.equal("cursor" in args, false);
      assert.equal("skip" in args, false);
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

      const task = await create(
        { title: "Buy milk", description: undefined, completed: false, priority: "medium" },
        client,
      );

      assert.deepEqual(receivedData, {
        title: "Buy milk",
        description: undefined,
        completed: false,
        priority: "medium",
        dueDate: undefined,
        categories: undefined,
      });
      assert.equal(task.id, "generated-id");
      assert.equal(task.title, "Buy milk");
    });

    it("converts a given dueDate string to a Date for Prisma", async () => {
      let receivedData: unknown;
      const client = createFakeClient({
        create: async ({ data }: { data: unknown }) => {
          receivedData = data;
          return buildRow({ dueDate: new Date("2026-03-01T00:00:00.000Z") });
        },
      });

      await create(
        {
          title: "Buy milk",
          description: undefined,
          completed: false,
          priority: "medium",
          dueDate: "2026-03-01T00:00:00.000Z",
        },
        client,
      );

      const data = receivedData as { dueDate: Date };
      assert.ok(data.dueDate instanceof Date);
      assert.equal(data.dueDate.toISOString(), "2026-03-01T00:00:00.000Z");
    });

    it("connects given categoryIds", async () => {
      let receivedData: unknown;
      const client = createFakeClient({
        create: async ({ data }: { data: unknown }) => {
          receivedData = data;
          return buildRow({ categories: [buildCategoryRow()] });
        },
      });

      await create(
        {
          title: "Buy milk",
          description: undefined,
          completed: false,
          priority: "medium",
          categoryIds: ["cat-1", "cat-2"],
        },
        client,
      );

      const data = receivedData as { categories: unknown };
      assert.deepEqual(data.categories, { connect: [{ id: "cat-1" }, { id: "cat-2" }] });
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

    it("converts a given dueDate string to a Date for Prisma", async () => {
      let receivedData: unknown;
      const client = createFakeClient({
        update: async ({ data }: { data: unknown }) => {
          receivedData = data;
          return buildRow({ dueDate: new Date("2026-04-01T00:00:00.000Z") });
        },
      });

      await update("1", { dueDate: "2026-04-01T00:00:00.000Z" }, client);

      const data = receivedData as { dueDate: Date };
      assert.ok(data.dueDate instanceof Date);
    });

    it("does not touch dueDate in the update payload when omitted", async () => {
      let receivedData: unknown;
      const client = createFakeClient({
        update: async ({ data }: { data: unknown }) => {
          receivedData = data;
          return buildRow();
        },
      });

      await update("1", { title: "Updated" }, client);

      assert.equal("dueDate" in (receivedData as object), false);
    });

    it("replaces the full category set via 'set' when categoryIds is provided", async () => {
      let receivedData: unknown;
      const client = createFakeClient({
        update: async ({ data }: { data: unknown }) => {
          receivedData = data;
          return buildRow({ categories: [buildCategoryRow()] });
        },
      });

      await update("1", { categoryIds: ["cat-1"] }, client);

      const data = receivedData as { categories: unknown };
      assert.deepEqual(data.categories, { set: [{ id: "cat-1" }] });
    });

    it("clears all categories when categoryIds is an empty array", async () => {
      let receivedData: unknown;
      const client = createFakeClient({
        update: async ({ data }: { data: unknown }) => {
          receivedData = data;
          return buildRow({ categories: [] });
        },
      });

      await update("1", { categoryIds: [] }, client);

      const data = receivedData as { categories: unknown };
      assert.deepEqual(data.categories, { set: [] });
    });

    it("does not touch categories in the update payload when categoryIds is omitted", async () => {
      let receivedData: unknown;
      const client = createFakeClient({
        update: async ({ data }: { data: unknown }) => {
          receivedData = data;
          return buildRow();
        },
      });

      await update("1", { title: "Updated" }, client);

      assert.equal("categories" in (receivedData as object), false);
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
