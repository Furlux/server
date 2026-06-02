import { getFetchClient } from '@strapi/admin/strapi-admin';

// Mirrors the backend guard in src/index.ts (guardAdminPasswordChanges): non-super-admins may edit admin
// users but not their passwords. The core Users EditPage has no extension point for its fields, so we hide
// the Password / Confirm Password inputs from the DOM. The backend remains the source of truth, so the UI
// only hides the fields once the current user is positively confirmed to be a NON-super-admin; while the
// role is still unknown (pre-login, request in flight, request failed) the fields stay visible.

const SUPER_ADMIN_CODE = 'strapi-super-admin';
const PASSWORD_FIELD_NAMES = ['password', 'confirmPassword'];

// matches the admin Users management area (edit page + create modal); excludes /me self-profile and /auth
const USERS_PAGE = /\/settings\/users(\/|$)/;

// null = not yet resolved (do not hide); true/false = confirmed role
let cachedIsSuperAdmin: boolean | null = null;
let inflight: Promise<void> | null = null;

// inputs nothing, does resolve the current admin role via /admin/users/me once and cache it, returns void
// Resolution only succeeds after login (token present); before that the request 401s and the status stays null.
const resolveRole = (): Promise<void> => {
  if (cachedIsSuperAdmin !== null) return Promise.resolve();
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const { get } = getFetchClient();
      const res = await get('/admin/users/me');
      const roles = (res.data?.data?.roles ?? []) as Array<{ code?: string }>;
      cachedIsSuperAdmin = roles.some((role) => role.code === SUPER_ADMIN_CODE);
    } catch {
      cachedIsSuperAdmin = null; // unknown - leave fields visible and retry on the next mutation
    } finally {
      inflight = null;
    }
  })();

  return inflight;
};

// inputs a password input element, does hide its surrounding Field.Root (the label+input wrapper), returns void
const hideEnclosingField = (input: HTMLElement) => {
  let el: HTMLElement | null = input;
  for (let depth = 0; depth < 6 && el; depth += 1) {
    el = el.parentElement;
    if (el?.querySelector('label')) {
      el.style.display = 'none';
      return;
    }
  }
};

// inputs nothing, does hide the password fields currently in the DOM, returns void
const hidePasswordFields = () => {
  PASSWORD_FIELD_NAMES.forEach((name) => {
    const input = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
    if (input) hideEnclosingField(input);
  });
};

// inputs nothing, does hide password fields only when on a Users page AND the user is a confirmed non-super-admin
const maybeHidePasswordFields = () => {
  if (!USERS_PAGE.test(window.location.pathname)) return;
  void resolveRole().then(() => {
    if (cachedIsSuperAdmin === false) hidePasswordFields();
  });
};

// inputs nothing, does install a DOM observer that strips password fields for non-super-admins, returns void
export const guardPasswordFields = () => {
  const observer = new MutationObserver(maybeHidePasswordFields);
  observer.observe(document.body, { childList: true, subtree: true });
  maybeHidePasswordFields();
};
