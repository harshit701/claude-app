import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Response } from "express";
import { sendSuccess } from "./response.ts";

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

describe("sendSuccess", () => {
  it("sends the given status code", () => {
    const { res, calls } = createFakeRes();

    sendSuccess(res, 201, "Task created successfully", { id: "1" });

    assert.equal(calls.statusCode, 201);
  });

  it("wraps the message and data in a consistent envelope", () => {
    const { res, calls } = createFakeRes();
    const data = { id: "1", title: "Buy milk" };

    sendSuccess(res, 200, "Tasks retrieved successfully", data);

    assert.deepEqual(calls.body, {
      message: "Tasks retrieved successfully",
      data,
    });
  });

  it("supports array data", () => {
    const { res, calls } = createFakeRes();
    const data = [{ id: "1" }, { id: "2" }];

    sendSuccess(res, 200, "Tasks retrieved successfully", data);

    assert.deepEqual(calls.body, {
      message: "Tasks retrieved successfully",
      data,
    });
  });
});
