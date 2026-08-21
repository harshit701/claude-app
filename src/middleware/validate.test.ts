import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Joi from "joi";
import type { Request, Response } from "express";
import { validate, ValidationError } from "./validate.ts";
import { createTaskSchema } from "../schemas/task.schema.ts";

function createFakeRes() {
  return {} as Response;
}

function createNextSpy() {
  const calls: unknown[] = [];
  const next = (arg?: unknown) => {
    calls.push(arg);
  };
  return { next, calls };
}

describe("validate (generic middleware)", () => {
  it("calls next() with no error when the body is valid", () => {
    const middleware = validate(createTaskSchema);
    const req = { body: { title: "Buy milk" } } as Request;
    const { next, calls } = createNextSpy();

    middleware(req, createFakeRes(), next);

    assert.equal(calls.length, 1);
    assert.equal(calls[0], undefined);
    assert.deepEqual(req.body, { title: "Buy milk" });
  });

  it("calls next(error) with a ValidationError when the body is invalid", () => {
    const middleware = validate(createTaskSchema);
    const req = { body: {} } as Request;
    const { next, calls } = createNextSpy();

    middleware(req, createFakeRes(), next);

    assert.equal(calls.length, 1);
    assert.ok(calls[0] instanceof ValidationError);
  });

  it("works with a schema unrelated to Task, proving it is generic", () => {
    const pingSchema = Joi.object({
      message: Joi.string().required(),
    });
    const middleware = validate(pingSchema);

    const validReq = { body: { message: "hello" } } as Request;
    const validSpy = createNextSpy();
    middleware(validReq, createFakeRes(), validSpy.next);
    assert.equal(validSpy.calls[0], undefined);

    const invalidReq = { body: {} } as Request;
    const invalidSpy = createNextSpy();
    middleware(invalidReq, createFakeRes(), invalidSpy.next);
    assert.ok(invalidSpy.calls[0] instanceof ValidationError);
  });
});
