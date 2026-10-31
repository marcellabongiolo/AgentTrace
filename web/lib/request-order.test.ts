import { describe, expect, it } from "vitest";
import { isCurrentRequest } from "./request-order";

describe("isCurrentRequest", () => {
  it("accepts the most recent request", () => {
    expect(isCurrentRequest(3, 3)).toBe(true);
  });

  it("rejects a stale response after a newer selection", () => {
    expect(isCurrentRequest(1, 2)).toBe(false);
  });

  it("rejects a response invalidated by refresh or unmount", () => {
    expect(isCurrentRequest(4, 5)).toBe(false);
  });
});
