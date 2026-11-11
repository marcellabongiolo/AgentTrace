import { describe, expect, it } from "vitest";
import { createSession, safePasswordEquals, verifySession } from "./session";

const secret = "this-is-a-long-random-demo-secret-1234567890";
const now = 1_800_000_000_000;

describe("dashboard session", () => {
  it("accepts a signed session within its lifetime", () => {
    const token = createSession(secret, now);
    expect(verifySession(token, secret, now + 1000)).toBe(true);
  });

  it("rejects expired, forged and unsigned sessions", () => {
    const token = createSession(secret, now);
    expect(verifySession(token, secret, now + 9 * 60 * 60 * 1000)).toBe(false);
    expect(verifySession(token, "different-secret", now)).toBe(false);
    expect(verifySession(token + "forged", secret, now)).toBe(false);
    expect(verifySession(undefined, secret, now)).toBe(false);
    expect(verifySession("malformed", secret, now)).toBe(false);
  });

  it("compares the dashboard password", () => {
    expect(safePasswordEquals("correct", "correct")).toBe(true);
    expect(safePasswordEquals("wrong", "correct")).toBe(false);
    expect(safePasswordEquals("", "")).toBe(false);
  });
});
