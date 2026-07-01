/** Post-auth gate: session is checked against server allowlist before /admin. */
export const ADMIN_VERIFY_PATH = "/auth/admin-verify";

export const ADMIN_SIGNIN_QUERY = "admin";
export const ADMIN_FORBIDDEN_ERROR = "admin_forbidden";

export function adminSignInSearchParams(): string {
  return `${ADMIN_SIGNIN_QUERY}=1`;
}

export function adminForbiddenMessage(): string {
  return "Admin access is restricted to the LifeNode OS developer team. Use the regular Sign in button for your account, or contact support if you need help.";
}

export function adminSignupBlockedMessage(): string {
  return "Public admin registration is not available. Only authorized developers can access the admin dashboard.";
}
