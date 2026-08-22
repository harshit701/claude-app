import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import type { NextFunction, Request, Response } from "express";
import { NotFoundError } from "../utils/errors.ts";

// The controller imports named functions directly from the service module,
// so mocking them requires node:test's module-loader-level mock.module()
// (mock.method() can't redefine already-bound ESM named exports). The mocked
// implementations below delegate to this mutable object so each test can
// swap behavior without re-importing the controller module.
const serviceMock = {
  createTask: async (_input: unknown): Promise<unknown> => {
    throw new Error("createTask not stubbed for this test");
  },
  getAllTasks: async (): Promise<unknown> => {
    throw new Error("getAllTasks not stubbed for this test");
  },
  getTaskById: async (_id: string): Promise<unknown> => {
    throw new Error("getTaskById not stubbed for this test");
  },
  updateTask: async (_id: string, _input: unknown): Promise<unknown> => {
    throw new Error("updateTask not stubbed for this test");
  },
  deleteTask: async (_id: string): Promise<void> => {
    throw new Error("deleteTask not stubbed for this test");
  },
};

mock.module("../services/task.service.ts", {
  namedExports: {
    createTask: (input: unknown) => serviceMock.createTask(input),
    getAllTasks: () => serviceMock.getAllTasks(),
    getTaskById: (id: string) => serviceMock.getTaskById(id),
    updateTask: (id: string, input: unknown) => serviceMock.updateTask(id, input),
    deleteTask: (id: string) => serviceMock.deleteTask(id),
  },
});

const { postTask, getTasks, getTask, patchTask, removeTask } = await import(
  "./task.controller.ts"
);

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

describe("task.controller", () => {
  describe("postTask", () => {
    it("responds with 201 and the created task on success", async () => {
      const createdTask = {
        id: "1",
        title: "Buy milk",
        completed: false,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      };
      serviceMock.createTask = async () => createdTask;

      const { res, calls } = createFakeRes();
      const { next, errors } = createFakeNext();
      const req = { body: { title: "Buy milk" } } as Request;

      await postTask(req, res, next);

      assert.equal(calls.statusCode, 201);
      assert.deepEqual(calls.body, { message: "Task created successfully", data: createdTask });
      assert.equal(errors.length, 0);
    });

    it("forwards service errors to next() instead of throwing", async () => {
      const failure = new Error("db unavailable");
      serviceMock.createTask = async () => {
        throw failure;
      };

      const { res } = createFakeRes();
      const { next, errors } = createFakeNext();
      const req = { body: { title: "Buy milk" } } as Request;

      await postTask(req, res, next);

      assert.equal(errors[0], failure);
    });
  });

  describe("getTasks", () => {
    it("responds with 200 and the list of tasks", async () => {
      const tasks = [{ id: "1", title: "Buy milk", completed: false }];
      serviceMock.getAllTasks = async () => tasks;

      const { res, calls } = createFakeRes();
      const { next, errors } = createFakeNext();

      await getTasks({} as Request, res, next);

      assert.equal(calls.statusCode, 200);
      assert.deepEqual(calls.body, { message: "Tasks retrieved successfully", data: tasks });
      assert.equal(errors.length, 0);
    });
  });

  describe("getTask", () => {
    it("responds with 200 and the matching task", async () => {
      const task = { id: "1", title: "Buy milk", completed: false };
      serviceMock.getTaskById = async (id) => {
        assert.equal(id, "1");
        return task;
      };

      const { res, calls } = createFakeRes();
      const { next, errors } = createFakeNext();
      const req = { params: { id: "1" } } as unknown as Request;

      await getTask(req, res, next);

      assert.equal(calls.statusCode, 200);
      assert.deepEqual(calls.body, { message: "Task retrieved successfully", data: task });
      assert.equal(errors.length, 0);
    });

    it("forwards NotFoundError to next() so the error handler returns 404", async () => {
      serviceMock.getTaskById = async () => {
        throw new NotFoundError("Task with id missing not found");
      };

      const { res } = createFakeRes();
      const { next, errors } = createFakeNext();
      const req = { params: { id: "missing" } } as unknown as Request;

      await getTask(req, res, next);

      assert.ok(errors[0] instanceof NotFoundError);
    });
  });

  describe("patchTask", () => {
    it("responds with 200 and the updated task", async () => {
      const updated = { id: "1", title: "Updated", completed: false };
      serviceMock.updateTask = async () => updated;

      const { res, calls } = createFakeRes();
      const { next, errors } = createFakeNext();
      const req = { params: { id: "1" }, body: { title: "Updated" } } as unknown as Request;

      await patchTask(req, res, next);

      assert.equal(calls.statusCode, 200);
      assert.deepEqual(calls.body, { message: "Task updated successfully", data: updated });
      assert.equal(errors.length, 0);
    });
  });

  describe("removeTask", () => {
    it("responds with 200 and no data on success", async () => {
      serviceMock.deleteTask = async () => undefined;

      const { res, calls } = createFakeRes();
      const { next, errors } = createFakeNext();
      const req = { params: { id: "1" } } as unknown as Request;

      await removeTask(req, res, next);

      assert.equal(calls.statusCode, 200);
      assert.deepEqual(calls.body, { message: "Task deleted successfully", data: undefined });
      assert.equal(errors.length, 0);
    });

    it("forwards NotFoundError to next()", async () => {
      serviceMock.deleteTask = async () => {
        throw new NotFoundError("Task with id missing not found");
      };

      const { res } = createFakeRes();
      const { next, errors } = createFakeNext();
      const req = { params: { id: "missing" } } as unknown as Request;

      await removeTask(req, res, next);

      assert.ok(errors[0] instanceof NotFoundError);
    });
  });
});
