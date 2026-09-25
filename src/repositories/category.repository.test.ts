import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Prisma, type PrismaClient } from "@prisma/client";
import { create, findAll, findByIds, isDuplicateName } from "./category.repository.ts";

const NOW = new Date("2026-01-01T00:00:00.000Z");

function buildRow(overrides: Partial<Record<string, unknown>> = {}) {
  return { id: "cat-1", name: "Work", createdAt: NOW, ...overrides };
}

function duplicateNameError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
  });
}

function createFakeClient(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    category: {
      findMany: async () => [],
      create: async () => buildRow(),
      ...overrides,
    },
  } as unknown as PrismaClient;
}

describe("category.repository", () => {
  describe("findAll", () => {
    it("maps database rows to Category objects, ordered by name", async () => {
      let receivedArgs: unknown;
      const client = createFakeClient({
        findMany: async (args: unknown) => {
          receivedArgs = args;
          return [buildRow({ id: "1", name: "Home" }), buildRow({ id: "2", name: "Work" })];
        },
      });

      const categories = await findAll(client);

      assert.deepEqual(receivedArgs, { orderBy: { name: "asc" } });
      assert.equal(categories.length, 2);
      assert.equal(categories[0].createdAt, NOW.toISOString());
    });
  });

  describe("findByIds", () => {
    it("queries by an 'in' filter on id", async () => {
      let receivedArgs: unknown;
      const client = createFakeClient({
        findMany: async (args: unknown) => {
          receivedArgs = args;
          return [buildRow({ id: "1" })];
        },
      });

      const categories = await findByIds(["1", "2"], client);

      assert.deepEqual(receivedArgs, { where: { id: { in: ["1", "2"] } } });
      assert.equal(categories.length, 1);
    });
  });

  describe("create", () => {
    it("passes the given name through and returns the created category", async () => {
      let receivedData: unknown;
      const client = createFakeClient({
        create: async ({ data }: { data: unknown }) => {
          receivedData = data;
          return buildRow({ id: "generated-id", name: "Work" });
        },
      });

      const category = await create({ name: "Work" }, client);

      assert.deepEqual(receivedData, { name: "Work" });
      assert.equal(category.id, "generated-id");
    });

    it("throws the raw Prisma error on a duplicate name (caller classifies it)", async () => {
      const client = createFakeClient({
        create: async () => {
          throw duplicateNameError();
        },
      });

      await assert.rejects(() => create({ name: "Work" }, client));
    });
  });

  describe("isDuplicateName", () => {
    it("returns true for a P2002 unique constraint error", () => {
      assert.equal(isDuplicateName(duplicateNameError()), true);
    });

    it("returns false for an unrelated error", () => {
      assert.equal(isDuplicateName(new Error("connection lost")), false);
    });
  });
});
