import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import type { NextFunction, Request, Response } from "express";

// Same reasoning as task.controller.test.ts: the controller imports named
// functions directly from the service module, so mocking them requires
// node:test's module-loader-level mock.module().
const serviceMock = {
  createCategory: async (_input: unknown): Promise<unknown> => {
    throw new Error("createCategory not stubbed for this test");
  },
  getAllCategories: async (): Promise<unknown> => {
    throw new Error("getAllCategories not stubbed for this test");
  },
};

mock.module("../services/category.service.ts", {
  namedExports: {
    createCategory: (input: unknown) => serviceMock.createCategory(input),
    getAllCategories: () => serviceMock.getAllCategories(),
  },
});

const { postCategory, getCategories } = await import("./category.controller.ts");

function createFakeRes() {
  const calls: { statusCode?: number; body?: unknown } = {};
  const res = {
    status(code: number) {
      calls.statusCode = code;
      return res;
    },
    json(body: unknown) {
      calls.body = body;
      return res;
    },
  } as unknown as Response;
  return { res, calls };
}

function createFakeNext() {
  const errors: unknown[] = [];
  const next = ((error?: unknown) => {
    if (error !== undefined) errors.push(error);
  }) as NextFunction;
  return { next, errors };
}

describe("category.controller", () => {
  describe("postCategory", () => {
    it("responds with 201 and the created category on success", async () => {
      const createdCategory = {
        id: "1",
        name: "Work",
        createdAt: "2026-01-01T00:00:00.000Z",
      };
      serviceMock.createCategory = async () => createdCategory;

      const { res, calls } = createFakeRes();
      const { next, errors } = createFakeNext();
      const req = { body: { name: "Work" } } as Request;

      await postCategory(req, res, next);

      assert.equal(calls.statusCode, 201);
      assert.deepEqual(calls.body, {
        message: "Category created successfully",
        data: createdCategory,
      });
      assert.equal(errors.length, 0);
    });

    it("forwards service errors to next() instead of throwing", async () => {
      const failure = new Error("db unavailable");
      serviceMock.createCategory = async () => {
        throw failure;
      };

      const { res } = createFakeRes();
      const { next, errors } = createFakeNext();
      const req = { body: { name: "Work" } } as Request;

      await postCategory(req, res, next);

      assert.equal(errors[0], failure);
    });
  });

  describe("getCategories", () => {
    it("responds with 200 and the list of categories", async () => {
      const categories = [{ id: "1", name: "Work", createdAt: "2026-01-01T00:00:00.000Z" }];
      serviceMock.getAllCategories = async () => categories;

      const { res, calls } = createFakeRes();
      const { next, errors } = createFakeNext();
      const req = {} as Request;

      await getCategories(req, res, next);

      assert.equal(calls.statusCode, 200);
      assert.deepEqual(calls.body, {
        message: "Categories retrieved successfully",
        data: categories,
      });
      assert.equal(errors.length, 0);
    });

    it("forwards service errors to next() instead of throwing", async () => {
      const failure = new Error("db unavailable");
      serviceMock.getAllCategories = async () => {
        throw failure;
      };

      const { res } = createFakeRes();
      const { next, errors } = createFakeNext();
      const req = {} as Request;

      await getCategories(req, res, next);

      assert.equal(errors[0], failure);
    });
  });
});
