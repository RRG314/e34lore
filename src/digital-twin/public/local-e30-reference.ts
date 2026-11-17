export type E30Release = {
  id: string; revision: number; manifestUrl: string; sha256: string; label: string;
  renderableCount: number; assetBytes: number; year: number; model: string;
  engine: string; body: string; transmission: string; contextId?: string; exteriorOnly?: boolean;
  equipment?: string;
};
const reference: E30Release | null = null;
export const localE30Variants: E30Release[] = [];
export const localE30Archives: E30Release[] = [];
export default reference;
