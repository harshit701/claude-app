import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTaskSchema, updateTaskSchema } from "./task.schema.ts";

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
