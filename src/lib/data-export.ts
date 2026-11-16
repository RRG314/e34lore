type PageResult<T> = { data: T[] | null; error: { message: string } | null };

// Each caller supplies a stable database order; never export only a UI's loaded page.
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = 200,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1)
    throw new Error("Invalid export page size");
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const result = await fetchPage(from, from + pageSize - 1);
    if (result.error) throw new Error(result.error.message);
    if (!result.data) throw new Error("No export data returned");
    rows.push(...result.data);
    if (result.data.length < pageSize) return rows;
  }
}
