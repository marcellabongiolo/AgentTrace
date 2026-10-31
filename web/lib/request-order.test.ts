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
  it("ignores an older async response when a newer selection finishes first", async () => {
    let resolveOld!: (value: string) => void;
    let resolveNew!: (value: string) => void;
    const oldRequest = new Promise<string>((resolve) => { resolveOld = resolve; });
    const newRequest = new Promise<string>((resolve) => { resolveNew = resolve; });
    let latest = 0;
    let selected = "";
    const load = async (task: Promise<string>) => {
      const id = ++latest;
      const result = await task;
      if (isCurrentRequest(id, latest)) selected = result;
    };
    const first = load(oldRequest);
    const second = load(newRequest);
    resolveNew("new");
    await second;
    resolveOld("old");
    await first;
    expect(selected).toBe("new");
  });
});
