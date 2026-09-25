import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTaskSchema, taskQuerySchema, updateTaskSchema } from "./task.schema.ts";

function validate(input: unknown) {
  return createTaskSchema.validate(input, {
    abortEarly: false,
    stripUnknown: true,
  });
}

function validateUpdate(input: unknown) {
  return updateTaskSchema.validate(input, {
    abortEarly: false,
    stripUnknown: true,
  });
}

function validateQuery(input: unknown) {
  return taskQuerySchema.validate(input, {
    abortEarly: false,
    stripUnknown: true,
  });
}

describe("createTaskSchema", () => {
  it("accepts a valid task with only a title", () => {
    const result = validate({ title: "Buy milk" });

    assert.equal(result.error, undefined);
  });

  it("accepts a valid task with all fields", () => {
    const result = validate({
      title: "Buy milk",
      description: "2% milk",
      completed: true,
    });

    assert.equal(result.error, undefined);
  });

  it("rejects a missing title", () => {
    const result = validate({ description: "no title here" });

    assert.ok(result.error);
  });

  it("rejects an empty/whitespace-only title", () => {
    const result = validate({ title: "   " });

    assert.ok(result.error);
  });

  it("rejects a non-string title", () => {
    const result = validate({ title: 123 });

    assert.ok(result.error);
  });

  it("rejects a non-string description", () => {
    const result = validate({ title: "Buy milk", description: 123 });

    assert.ok(result.error);
  });

  it("rejects a non-boolean completed value", () => {
    const result = validate({ title: "Buy milk", completed: "yes" });

    assert.ok(result.error);
  });

  it("strips a client-supplied id", () => {
    const result = validate({ title: "Buy milk", id: "client-id" });

    assert.equal(result.error, undefined);
    assert.equal("id" in result.value, false);
  });

  it("strips a client-supplied createdAt", () => {
    const result = validate({
      title: "Buy milk",
      createdAt: "2000-01-01T00:00:00.000Z",
    });

    assert.equal(result.error, undefined);
    assert.equal("createdAt" in result.value, false);
  });

  it("strips a client-supplied updatedAt", () => {
    const result = validate({
      title: "Buy milk",
      updatedAt: "2000-01-01T00:00:00.000Z",
    });

    assert.equal(result.error, undefined);
    assert.equal("updatedAt" in result.value, false);
  });
});

describe("createTaskSchema — dueDate", () => {
  it("accepts a valid ISO date string", () => {
    const result = validate({ title: "Buy milk", dueDate: "2026-12-31T00:00:00.000Z" });

    assert.equal(result.error, undefined);
  });

  it("rejects a non-ISO date string", () => {
    const result = validate({ title: "Buy milk", dueDate: "not-a-date" });

    assert.ok(result.error);
  });

  it("rejects a plain non-date string like 'tomorrow'", () => {
    const result = validate({ title: "Buy milk", dueDate: "tomorrow" });

    assert.ok(result.error);
  });
});

describe("createTaskSchema — categoryIds", () => {
  it("accepts an array of valid UUIDs", () => {
    const result = validate({
      title: "Buy milk",
      categoryIds: ["11111111-1111-1111-1111-111111111111"],
    });

    assert.equal(result.error, undefined);
  });

  it("rejects a non-UUID entry", () => {
    const result = validate({ title: "Buy milk", categoryIds: ["not-a-uuid"] });

    assert.ok(result.error);
  });

  it("rejects duplicate ids", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    const result = validate({ title: "Buy milk", categoryIds: [id, id] });

    assert.ok(result.error);
  });

  it("rejects more than 20 ids", () => {
    const ids = Array.from(
      { length: 21 },
      (_, i) => `11111111-1111-1111-1111-${String(i).padStart(12, "0")}`,
    );
    const result = validate({ title: "Buy milk", categoryIds: ids });

    assert.ok(result.error);
  });

  it("rejects a non-array value", () => {
    const result = validate({ title: "Buy milk", categoryIds: "not-an-array" });

    assert.ok(result.error);
  });
});

describe("updateTaskSchema", () => {
  it("accepts an empty object since all fields are optional", () => {
    const result = validateUpdate({});

    assert.equal(result.error, undefined);
  });

  it("accepts a partial update with only completed", () => {
    const result = validateUpdate({ completed: true });

    assert.equal(result.error, undefined);
  });

  it("accepts an update with all fields", () => {
    const result = validateUpdate({
      title: "Buy oat milk",
      description: "Updated description",
      completed: true,
    });

    assert.equal(result.error, undefined);
  });

  it("rejects an empty/whitespace-only title", () => {
    const result = validateUpdate({ title: "   " });

    assert.ok(result.error);
  });

  it("rejects a non-string title", () => {
    const result = validateUpdate({ title: 123 });

    assert.ok(result.error);
  });

  it("rejects a non-string description", () => {
    const result = validateUpdate({ description: 123 });

    assert.ok(result.error);
  });

  it("rejects a non-boolean completed value", () => {
    const result = validateUpdate({ completed: "yes" });

    assert.ok(result.error);
  });

  it("strips a client-supplied id", () => {
    const result = validateUpdate({ title: "Buy milk", id: "client-id" });

    assert.equal(result.error, undefined);
    assert.equal("id" in result.value, false);
  });

  it("strips a client-supplied createdAt", () => {
    const result = validateUpdate({
      title: "Buy milk",
      createdAt: "2000-01-01T00:00:00.000Z",
    });

    assert.equal(result.error, undefined);
    assert.equal("createdAt" in result.value, false);
  });

  it("strips a client-supplied updatedAt", () => {
    const result = validateUpdate({
      title: "Buy milk",
      updatedAt: "2000-01-01T00:00:00.000Z",
    });

    assert.equal(result.error, undefined);
    assert.equal("updatedAt" in result.value, false);
  });
});

describe("taskQuerySchema", () => {
  it("accepts an empty query (no filter) and fills in defaults", () => {
    const result = validateQuery({});

    assert.equal(result.error, undefined);
    assert.equal(result.value.completed, undefined);
    assert.equal(result.value.sortBy, "createdAt");
    assert.equal(result.value.order, "asc");
    assert.equal(result.value.limit, 20);
  });

  it("accepts a valid categoryId", () => {
    const result = validateQuery({ categoryId: "11111111-1111-1111-1111-111111111111" });

    assert.equal(result.error, undefined);
  });

  it("rejects a non-UUID categoryId", () => {
    const result = validateQuery({ categoryId: "not-a-uuid" });

    assert.ok(result.error);
  });

  it("accepts each allowed sortBy value", () => {
    for (const sortBy of ["createdAt", "dueDate", "priority", "completed"]) {
      const result = validateQuery({ sortBy });
      assert.equal(result.error, undefined, `expected ${sortBy} to be valid`);
    }
  });

  it("rejects an unsupported sortBy value", () => {
    const result = validateQuery({ sortBy: "title" });

    assert.ok(result.error);
  });

  it("rejects an invalid order value", () => {
    const result = validateQuery({ order: "sideways" });

    assert.ok(result.error);
  });

  it("accepts limit within 1-100 and rejects outside that range", () => {
    assert.equal(validateQuery({ limit: 1 }).error, undefined);
    assert.equal(validateQuery({ limit: 100 }).error, undefined);
    assert.ok(validateQuery({ limit: 0 }).error);
    assert.ok(validateQuery({ limit: 101 }).error);
  });

  it("rejects a non-integer limit", () => {
    const result = validateQuery({ limit: 5.5 });

    assert.ok(result.error);
  });

  it("accepts an opaque cursor string", () => {
    const result = validateQuery({ cursor: "dGFzay0x" });

    assert.equal(result.error, undefined);
  });

  it("rejects a cursor with invalid characters", () => {
    const result = validateQuery({ cursor: "not valid!" });

    assert.ok(result.error);
  });

  it("accepts and converts completed=true", () => {
    const result = validateQuery({ completed: "true" });

    assert.equal(result.error, undefined);
    assert.equal(result.value.completed, true);
  });

  it("accepts and converts completed=false", () => {
    const result = validateQuery({ completed: "false" });

    assert.equal(result.error, undefined);
    assert.equal(result.value.completed, false);
  });

  it("rejects an invalid completed value", () => {
    const result = validateQuery({ completed: "not-a-boolean" });

    assert.ok(result.error);
  });

  it("strips unknown query parameters", () => {
    const result = validateQuery({ sort: "asc" });

    assert.equal(result.error, undefined);
    assert.equal("sort" in result.value, false);
  });
});
