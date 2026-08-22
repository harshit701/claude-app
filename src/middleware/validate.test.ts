import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Joi from "joi";
import type { Request, Response } from "express";
import { validate, validateQuery, ValidationError } from "./validate.ts";
import { createTaskSchema, taskQuerySchema } from "../schemas/task.schema.ts";

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

describe("validateQuery (generic middleware)", () => {
  it("calls next() with no error and converts a valid completed query value", () => {
    const middleware = validateQuery(taskQuerySchema);
    const req = { query: { completed: "true" } } as unknown as Request;
    const { next, calls } = createNextSpy();

    middleware(req, createFakeRes(), next);

    assert.equal(calls.length, 1);
    assert.equal(calls[0], undefined);
    assert.deepEqual(req.query, { completed: true });
  });

  it("calls next() with no error when the query is omitted entirely", () => {
    const middleware = validateQuery(taskQuerySchema);
    const req = { query: {} } as unknown as Request;
    const { next, calls } = createNextSpy();

    middleware(req, createFakeRes(), next);

    assert.equal(calls[0], undefined);
    assert.equal(req.query.completed, undefined);
  });

  it("calls next(error) with a ValidationError when completed is invalid", () => {
    const middleware = validateQuery(taskQuerySchema);
    const req = { query: { completed: "not-a-boolean" } } as unknown as Request;
    const { next, calls } = createNextSpy();

    middleware(req, createFakeRes(), next);

    assert.equal(calls.length, 1);
    assert.ok(calls[0] instanceof ValidationError);
  });

  it("works with a schema unrelated to Task, proving it is generic", () => {
    const paginationSchema = Joi.object({
      page: Joi.number().integer().min(1).required(),
    });
    const middleware = validateQuery(paginationSchema);

    const validReq = { query: { page: "2" } } as unknown as Request;
    const validSpy = createNextSpy();
    middleware(validReq, createFakeRes(), validSpy.next);
    assert.equal(validSpy.calls[0], undefined);
    assert.equal(validReq.query.page, 2);

    const invalidReq = { query: {} } as unknown as Request;
    const invalidSpy = createNextSpy();
    middleware(invalidReq, createFakeRes(), invalidSpy.next);
    assert.ok(invalidSpy.calls[0] instanceof ValidationError);
  });
});
