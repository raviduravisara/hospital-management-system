export function extractRoleFromToken(token) {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      const normalizedToken = token.toLowerCase();
      if (normalizedToken.includes('doctor')) return 'doctor';
      if (normalizedToken.includes('admin')) return 'admin';
      if (normalizedToken.includes('patient')) return 'patient';
      return null;
    }

    const payloadPart = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = payloadPart.padEnd(
      payloadPart.length + ((4 - (payloadPart.length % 4)) % 4),
      '='
    );
    const payload = JSON.parse(atob(paddedPayload));

    const roleClaim =
      payload.role ??
      payload.roles ??
      payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ??
      payload['https://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

    if (Array.isArray(roleClaim)) return String(roleClaim[0] ?? '').toLowerCase() || null;
    if (typeof roleClaim === 'string') return roleClaim.toLowerCase();
    return null;
  } catch {
    return null;
  }
}
