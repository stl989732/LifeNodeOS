import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      /** OAuth provider subject when linked to a credential account. */
      legacyUserId?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    oauth?: boolean;
    /** Original OAuth subject before linking to credential_users.id */
    oauthSubject?: string;
  }
}
