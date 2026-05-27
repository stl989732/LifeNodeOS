import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

const googleConfigured =
  Boolean(process.env.GOOGLE_CLIENT_ID?.trim()) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim());

const githubConfigured =
  Boolean(process.env.GITHUB_CLIENT_ID?.trim()) &&
  Boolean(process.env.GITHUB_CLIENT_SECRET?.trim());

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/auth/signin",
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
        token.sub = user.id ?? token.sub;
        token.email = user.email ?? token.email;
        token.name = user.name ?? token.name;
      }
      if (account?.provider === "google" || account?.provider === "github") {
        token.oauth = true;
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
      }
      return session;
    },
  },
});
