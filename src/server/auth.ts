import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/db";

const devLoginEnabled = process.env.ENABLE_DEV_LOGIN === "true";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Self-hosted behind a reverse proxy / on a VPS with no fixed platform
  // integration (unlike Vercel), so Auth.js needs to be told explicitly to
  // trust the Host header instead of rejecting every request.
  trustHost: true,
  // Credentials provider (used for the dev-login fallback) requires JWT
  // sessions — database sessions only work with adapter-managed OAuth
  // providers. OAuth account linking still goes through the Prisma adapter
  // either way.
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Google({
      authorization: {
        params: {
          // drive.file is a *non-sensitive* scope: it only grants access to
          // files this app itself creates in the user's Drive, not their
          // whole Drive. That keeps Google's OAuth consent screen out of the
          // "restricted scope" verification process for a personal/small
          // team deployment.
          scope: "openid email profile https://www.googleapis.com/auth/drive.file",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    ...(devLoginEnabled
      ? [
          Credentials({
            id: "dev-login",
            name: "Dev Login",
            credentials: {
              email: { label: "Email", type: "email" },
              password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
              const email = String(credentials?.email || "").toLowerCase().trim();
              const password = String(credentials?.password || "");
              const expectedEmail = (process.env.DEV_LOGIN_EMAIL || "").toLowerCase().trim();
              const expectedPassword = process.env.DEV_LOGIN_PASSWORD || "";

              if (!expectedEmail || !expectedPassword) return null;
              if (email !== expectedEmail || password !== expectedPassword) return null;

              const user = await prisma.user.upsert({
                where: { email },
                update: {},
                create: { email, name: email.split("@")[0] },
              });

              return { id: user.id, email: user.email, name: user.name };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
  events: {
    // Mirror the Google OAuth tokens onto the User row so our storage layer
    // (server/storage/index.ts) can build a Drive client without having to
    // join through the Account table on every request.
    async linkAccount({ account, user }) {
      if (account.provider !== "google") return;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          googleAccessToken: (account.access_token as string) ?? null,
          googleRefreshToken:
            (account.refresh_token as string) ?? undefined /* keep old one if Google omits it */,
          googleTokenExpiry: account.expires_at
            ? new Date((account.expires_at as number) * 1000)
            : null,
        },
      });
    },
  },
});
