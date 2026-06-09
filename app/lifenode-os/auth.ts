import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { findCredentialUserByEmail } from "@/lib/auth-users-store";
import { provisionCoreSubscription } from "@/src/lib/billing/provisionCoreSubscription";

const googleConfigured =
  Boolean(process.env.GOOGLE_CLIENT_ID?.trim()) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim());

const githubConfigured =
  Boolean(process.env.GITHUB_CLIENT_ID?.trim()) &&
  Boolean(process.env.GITHUB_CLIENT_SECRET?.trim());

function resolveAuthSecret(): string | undefined {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.BETTER_AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim()
  );
}

const authSecret = resolveAuthSecret();

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: authSecret,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [
    ...(googleConfigured
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    ...(githubConfigured
      ? [
          GitHub({
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          }),
        ]
      : []),
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const { findCredentialUserByEmail, verifyCredentialPassword } =
          await import("@/lib/auth-users-store");
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email?.trim() || !password) return null;
        const user = await findCredentialUserByEmail(email);
        if (!user) return null;
        const ok = await verifyCredentialPassword(user, password);
        if (!ok) return null;
        // LifeNode OS requires email activation. Unverified accounts cannot
        // exchange credentials for a session. The UI pre-checks via
        // /api/auth/check-credentials and surfaces a specific resend CTA;
        // this is the defense-in-depth backstop.
        if (!user.emailVerified) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? email,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        let stableId = user.id ?? token.sub;

        if (
          account &&
          (account.provider === "google" || account.provider === "github")
        ) {
          token.oauth = true;
          const email = user.email?.trim().toLowerCase();
          if (email) {
            try {
              const cred = await findCredentialUserByEmail(email);
              if (cred?.id) {
                token.oauthSubject = stableId ?? undefined;
                stableId = cred.id;
              }
            } catch (e) {
              console.error("[auth] OAuth credential link lookup failed:", e);
            }
          }
        }

        token.sub = stableId ?? token.sub;
        token.email = user.email ?? token.email;
        token.name = user.name ?? token.name;
        provisionCoreSubscription(stableId ?? token.sub);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.sub as string) ?? "";
        if (typeof token.email === "string") {
          session.user.email = token.email;
        }
        if (typeof token.name === "string") {
          session.user.name = token.name;
        }
        if (typeof token.oauthSubject === "string") {
          session.user.legacyUserId = token.oauthSubject;
        }
      }
      return session;
    },
  },
});
