import review from '../../data/catalog-position-exclusions.json';
const excluded = new Set(review.excludedPositions);
/** Applicability notes describe a parent part; they are not ordering positions. */
export function catalogPositionAllowed(id?: string | null) { return !id || !excluded.has(id); }
export function catalogOrderingRows<T extends { position_id?: string | null; id?: string }>(rows: T[]): T[] {
    return rows.filter(row => catalogPositionAllowed(row.position_id || row.id));
}
export function correctedCatalogInventory<T extends { id: string; position_count: number; distinct_parts: number }>(rows: T[]): T[] {
    return rows.map(row => {
        const correction = review.contexts.find(c => c.id === row.id);
        return correction && row.position_count === correction.beforePositionCount ? { ...row, position_count: correction.correctedPositionCount, distinct_parts: correction.correctedDistinctNumbers } : row;
    });
}
