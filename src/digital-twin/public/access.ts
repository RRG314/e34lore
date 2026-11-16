/** UI gate mirrors existing staff roles; database/Storage policies remain authoritative. */
export function reconstructionAccess(roles: unknown, aal: string | null) { return aal === 'aal2' && Array.isArray(roles) && roles.some(role => role === 'admin' || role === 'reviewer'); }
