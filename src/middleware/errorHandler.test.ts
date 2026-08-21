import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import { errorHandler } from "./errorHandler.ts";
import { AppError } from "../utils/AppError.ts";

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

describe("errorHandler", () => {
  it("responds with the AppError's statusCode and message", () => {
    const { res, calls } = createFakeRes();
    const error = new AppError("Task not found", 404);

    errorHandler(error, {} as Request, res, () => {});

    assert.equal(calls.statusCode, 404);
    assert.deepEqual(calls.body, { message: "Task not found" });
  });

  it("falls back to 500 with a generic message for unknown errors", () => {
    const { res, calls } = createFakeRes();
    const error = new Error("Something exploded with a secret stack trace");

    errorHandler(error, {} as Request, res, () => {});

    assert.equal(calls.statusCode, 500);
    assert.deepEqual(calls.body, { message: "Internal server error" });
  });

  it("does not leak the original error message for unknown errors", () => {
    const { res, calls } = createFakeRes();
    const error = new Error("db password is hunter2");

    errorHandler(error, {} as Request, res, () => {});

    const body = calls.body as { message: string };
    assert.equal(body.message.includes("hunter2"), false);
  });

  it("logs the original error server-side for unknown errors", () => {
    const { res } = createFakeRes();
    const error = new Error("Something exploded with a secret stack trace");
    const originalConsoleError = console.error;
    const loggedArgs: unknown[] = [];
    console.error = (...args: unknown[]) => {
      loggedArgs.push(...args);
    };

    try {
      errorHandler(error, {} as Request, res, () => {});
    } finally {
      console.error = originalConsoleError;
    }

    assert.equal(loggedArgs.includes(error), true);
  });
});
