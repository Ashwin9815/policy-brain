import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateRuleDsl } from "./dsl.js";

describe("validateRuleDsl", () => {
  it("accepts valid DSL", () => {
    const result = validateRuleDsl({
      metadata: { name: "Test Rule", version: 1 },
      blocks: [
        { type: "condition", conditions: [{ field: "age", operator: ">=", value: 18 }] },
        { type: "decision", outcome: "APPROVE" },
      ],
    });
    assert.equal(result.success, true);
  });

  it("rejects DSL without decision block", () => {
    const result = validateRuleDsl({
      metadata: { name: "Bad Rule", version: 1 },
      blocks: [{ type: "condition", conditions: [] }],
    });
    assert.equal(result.success, false);
  });
});
