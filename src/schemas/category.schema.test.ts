import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createCategorySchema } from "./category.schema.ts";

function validate(input: unknown) {
  return createCategorySchema.validate(input, { abortEarly: false, stripUnknown: true });
}

describe("createCategorySchema", () => {
  it("accepts a valid name", () => {
    const result = validate({ name: "Work" });

    assert.equal(result.error, undefined);
  });

  it("trims whitespace", () => {
    const result = validate({ name: "  Work  " });

    assert.equal(result.error, undefined);
    assert.equal(result.value.name, "Work");
  });

  it("rejects a missing name", () => {
    const result = validate({});

    assert.ok(result.error);
  });

  it("rejects an empty/whitespace-only name", () => {
    const result = validate({ name: "   " });

    assert.ok(result.error);
  });

  it("rejects a non-string name", () => {
    const result = validate({ name: 123 });

    assert.ok(result.error);
  });

  it("rejects a name longer than 50 characters", () => {
    const result = validate({ name: "a".repeat(51) });

    assert.ok(result.error);
  });

  it("strips a client-supplied id", () => {
    const result = validate({ name: "Work", id: "client-id" });

    assert.equal(result.error, undefined);
    assert.equal("id" in result.value, false);
  });
});
