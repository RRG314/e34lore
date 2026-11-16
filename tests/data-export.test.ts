import { describe, it, expect } from "vitest";
import { fetchAllRows } from "../src/lib/data-export";

describe("complete account exports", () => {
  it("includes records beyond the first page and the final partial page", async () => {
    const source = [1, 2, 3, 4, 5];
    const ranges: number[][] = [];
    expect(
      await fetchAllRows(async (from, to) => {
        ranges.push([from, to]);
        return { data: source.slice(from, to + 1), error: null };
      }, 2),
    ).toEqual(source);
    expect(ranges).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
  });
  it("checks one final page when the total is an exact multiple", async () => {
    let calls = 0;
    expect(
      await fetchAllRows(async (from, to) => {
        calls++;
        return { data: [1, 2].slice(from, to + 1), error: null };
      }, 2),
    ).toEqual([1, 2]);
    expect(calls).toBe(2);
  });
  it("rejects failures instead of offering a silently incomplete file", async () => {
    await expect(
      fetchAllRows(async () => ({
        data: null,
        error: { message: "Permission denied" },
      })),
    ).rejects.toThrow("Permission denied");
  });
});
