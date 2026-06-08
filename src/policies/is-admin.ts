import type { Core } from '@strapi/strapi';

type PolicyContext = {
  request?: { header?: { authorization?: string } };
};

type AdminSessionManager = (origin: string) => {
  validateAccessToken(token: string):
    | { isValid: true; payload: { sessionId: string; userId: string } }
    | { isValid: false; payload: null };
  isSessionActive(sessionId: string): Promise<boolean>;
};

// inputs request context, does verify the caller is an active admin (Bearer session token), returns boolean.
// Mirrors the built-in admin auth strategy (@strapi/admin server strategies/admin): validate access token,
// require an active session, and require the admin user to still exist and be active. Lets a content-api
// route stay auth:false yet remain reachable only from the authenticated admin panel - used to gate the
// order PDF, which exposes customer PII and must never be public.
export default async (
  policyContext: PolicyContext,
  _config: unknown,
  { strapi }: { strapi: Core.Strapi },
): Promise<boolean> => {
  const authorization = policyContext.request?.header?.authorization;
  if (!authorization) return false;

  const parts = authorization.split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return false;
  const token = parts[1];

  const sessionManager = (strapi as unknown as { sessionManager?: AdminSessionManager }).sessionManager;
  if (!sessionManager) return false;

  const result = sessionManager('admin').validateAccessToken(token);
  if (!result.isValid) return false;

  const active = await sessionManager('admin').isSessionActive(result.payload.sessionId);
  if (!active) return false;

  // Reject deactivated / deleted admins even while their access token is still within its lifespan.
  const rawUserId = result.payload.userId;
  const numericUserId = Number(rawUserId);
  const userId = Number.isFinite(numericUserId) && String(numericUserId) === rawUserId ? numericUserId : rawUserId;
  const user = await strapi.db.query('admin::user').findOne({ where: { id: userId } });
  return user?.isActive === true;
};
