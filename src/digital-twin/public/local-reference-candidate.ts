import type accepted from '../../../data/digital-twin/525i-automatic-reference.json';
import type checks from '../../../data/digital-twin/geometry-checks.json';
/** Production has no candidate. The serve-only disposable review plugin can
 * substitute a generated local receipt; URL parameters cannot enable one. */
const localReferenceCandidate: typeof accepted | null = null;
export const localGeometryChecks: typeof checks.checks = [];
export const localReferenceArchives: typeof accepted[] = [];
export default localReferenceCandidate;
