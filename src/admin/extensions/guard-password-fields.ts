import { getFetchClient } from '@strapi/admin/strapi-admin';

// Mirrors the backend guard in src/index.ts (guardAdminPasswordChanges): non-super-admins may edit admin
// users but not their passwords. The core Users EditPage has no extension point for its fields, so we hide
// the Password / Confirm Password inputs from the DOM. The backend remains the source of truth.

const SUPER_ADMIN_CODE = 'strapi-super-admin';
const PASSWORD_FIELD_NAMES = ['password', 'confirmPassword'];

// matches the admin Users management area (edit page + create modal); excludes /me self-profile and /auth
const USERS_PAGE = /\/settings\/users(\/|$)/;

// inputs nothing, does call /admin/users/me, returns whether the logged-in admin holds the super-admin role
const isSuperAdmin = async (): Promise<boolean> => {
  try {
    const { get } = getFetchClient();
    const res = await get('/admin/users/me');
    const roles = (res.data?.data?.roles ?? []) as Array<{ code?: string }>;
    return roles.some((role) => role.code === SUPER_ADMIN_CODE);
  } catch {
    return false; // fail closed - hide the fields when the role cannot be confirmed
  }
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

// inputs nothing, does hide password fields when on a Users page, returns void
const hidePasswordFields = () => {
  if (!USERS_PAGE.test(window.location.pathname)) return;
  PASSWORD_FIELD_NAMES.forEach((name) => {
    const input = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
    if (input) hideEnclosingField(input);
  });
};

// inputs nothing, does install a DOM observer that strips password fields for non-super-admins, returns void
export const guardPasswordFields = async () => {
  if (await isSuperAdmin()) return;

  const observer = new MutationObserver(hidePasswordFields);
  observer.observe(document.body, { childList: true, subtree: true });
  hidePasswordFields();
};
