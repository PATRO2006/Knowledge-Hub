import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  basePath: "/api/auth",
  trustHost: true,
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
    ...(process.env.AUTH_GITHUB_ID
      ? [GitHub({
          clientId: process.env.AUTH_GITHUB_ID!,
          clientSecret: process.env.AUTH_GITHUB_SECRET!,
          checks: ["state"],
        })]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // For GitHub OAuth: if the email already exists as a password account,
      // link the GitHub account to it so we don't get OAuthAccountNotLinked.
      if (account?.provider === "github" && user.email) {
        const existing = await prisma.user.findUnique({ where: { email: user.email } });
        if (existing) {
          // Check if GitHub account is already linked
          const linked = await prisma.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: "github",
                providerAccountId: account.providerAccountId,
              },
            },
          });
          if (!linked) {
            await prisma.account.create({
              data: {
                userId: existing.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token as string | undefined,
                token_type: account.token_type as string | undefined,
                scope: account.scope as string | undefined,
              },
            });
          }
          // Point user to the existing DB record so jwt gets the right id
          user.id = existing.id;
        }
      }
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token?.id) session.user.id = token.id as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
