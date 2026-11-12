// Pure, offline-testable request boundary. The account ID can never come from the body.
export function validateDeletionBody(value: unknown): { password: string; confirmation: 'DELETE' } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).length !== 2 || !Object.hasOwn(body, 'password') || !Object.hasOwn(body, 'confirmation') || body.confirmation !== 'DELETE' || typeof body.password !== 'string' || body.password.length < 6 || body.password.length > 128) return null;
  return { password: body.password, confirmation: 'DELETE' };
}
