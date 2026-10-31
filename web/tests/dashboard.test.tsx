// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import DashboardPage from "../pages/index";
import { fetchStats, fetchTrace, fetchTraces } from "../lib/api";

vi.mock("../lib/api", () => ({
  fetchStats: vi.fn(),
  fetchTrace: vi.fn(),
  fetchTraces: vi.fn(),
}));

const summaries = [
  { trace_id: "trace-a", name: "Research Agent", start_time: 1, end_time: 2, status: "success", duration: 1, span_count: 0, created_at: "2026-10-31" },
  { trace_id: "trace-b", name: "Search Agent", start_time: 2, end_time: 3, status: "error", duration: 1, span_count: 0, created_at: "2026-10-31" },
  { trace_id: "trace-c", name: "Running Agent", start_time: 3, end_time: null, status: "running", duration: null, span_count: 0, created_at: "2026-10-31" },
];
const details = Object.fromEntries(summaries.map((trace) => [
  trace.trace_id,
  { ...trace, metadata: {}, spans: [] },
]));

beforeEach(() => {
  vi.mocked(fetchTraces).mockReset().mockResolvedValue(summaries);
  vi.mocked(fetchStats).mockReset().mockResolvedValue({
    trace_count: 3, error_count: 1, error_rate: 1 / 3, avg_duration: 1, span_count: 0,
  });
  vi.mocked(fetchTrace).mockReset().mockImplementation(async (id) => details[id]);
});
afterEach(() => cleanup());

describe("DashboardPage interactions", () => {
  it("loads traces and marks the first selected trace", async () => {
    render(<DashboardPage />);
    expect(screen.getByRole("status").textContent).toContain("Loading traces");
    await waitFor(() => expect(screen.getByRole("button", { name: /Research Agent/ }).getAttribute("aria-pressed")).toBe("true"));
    expect(screen.getByText("trace-a")).toBeTruthy();
  });

  it("filters visible trace buttons using search input and status selection", async () => {
    render(<DashboardPage />);
    await screen.findByRole("button", { name: /Research Agent/ });
    fireEvent.change(screen.getByRole("textbox", { name: "Search traces" }), { target: { value: "agent" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Filter trace status" }), { target: { value: "error" } });
    expect(screen.getByRole("button", { name: /Search Agent/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Research Agent/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Running Agent/ })).toBeNull();
    fireEvent.change(screen.getByRole("textbox", { name: "Search traces" }), { target: { value: "missing" } });
    expect(screen.getByRole("status").textContent).toContain("No traces match");
  });

  it("selects a different trace after a click", async () => {
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: /Research Agent/ }).getAttribute("aria-pressed")).toBe("true"));
    fireEvent.click(screen.getByRole("button", { name: /Search Agent/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Search Agent/ }).getAttribute("aria-pressed")).toBe("true"));
    expect(screen.getByText("trace-b")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Research Agent/ }).getAttribute("aria-pressed")).toBe("false");
  });

  it("shows an accessible alert when loading fails", async () => {
    vi.mocked(fetchTraces).mockRejectedValueOnce(new Error("Telemetry unavailable"));
    render(<DashboardPage />);
    expect((await screen.findByRole("alert")).textContent).toContain("Telemetry unavailable");
  });

  it("refreshes metrics and shows an empty state after the API returns no traces", async () => {
    render(<DashboardPage />);
    await screen.findByRole("button", { name: /Research Agent/ });
    vi.mocked(fetchTraces).mockResolvedValueOnce([]);
    vi.mocked(fetchStats).mockResolvedValueOnce({
      trace_count: 0, error_count: 0, error_rate: 0, avg_duration: 0, span_count: 0,
    });
    fireEvent.click(screen.getByRole("button", { name: "Refresh data" }));
    await waitFor(() => expect(screen.getByText(/No traces yet/)).toBeTruthy());
    expect(vi.mocked(fetchTraces)).toHaveBeenCalledTimes(2);
  });
});
