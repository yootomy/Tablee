import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ensureOperationalSchema } from "@/lib/app-schema";
import { assertRateLimit, RateLimitExceededError } from "@/lib/rate-limit";
import {
  getClientIpFromRequest,
  normalizeEmailAddress,
} from "@/lib/request-context";

export const { handlers, signIn, signOut, auth } = NextAuth({
  basePath: "/api/auth",
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials, request) {
        await ensureOperationalSchema();

        if (!credentials?.email || !credentials?.password) return null;

        const email = normalizeEmailAddress(credentials.email as string);
        const password = credentials.password as string;
        const clientIp = getClientIpFromRequest(request);

        try {
          await Promise.all([
            assertRateLimit({
              scope: "auth-login:ip",
              identifier: clientIp,
              limit: Number(process.env.AUTH_LOGIN_IP_LIMIT ?? 20),
              windowMs: 15 * 60 * 1000,
            }),
            assertRateLimit({
              scope: "auth-login:email",
              identifier: email,
              limit: Number(process.env.AUTH_LOGIN_EMAIL_LIMIT ?? 8),
              windowMs: 15 * 60 * 1000,
            }),
          ]);
        } catch (error) {
          if (error instanceof RateLimitExceededError) {
            return null;
          }

          throw error;
        }

        const profile = await prisma.profiles.findFirst({
          where: { email },
        });

        if (!profile || !profile.password_hash) return null;

        const isValid = await bcrypt.compare(password, profile.password_hash);
        if (!isValid) return null;

        return {
          id: profile.id,
          name: profile.display_name,
          email: profile.email,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      await ensureOperationalSchema();

      if (account?.provider !== "google") return true;

      const email = user.email?.toLowerCase();
      if (!email) return false;

      const resolvedProfileId = await prisma.$transaction(async (tx) => {
        const existingOAuth = await tx.oauth_accounts.findUnique({
          where: {
            provider_provider_account_id: {
              provider: "google",
              provider_account_id: account.providerAccountId,
            },
          },
        });

        if (existingOAuth) {
          return existingOAuth.profile_id;
        }

        const existingProfile = await tx.profiles.findFirst({
          where: { email },
        });

        if (existingProfile) {
          await tx.oauth_accounts.create({
            data: {
              profile_id: existingProfile.id,
              provider: "google",
              provider_account_id: account.providerAccountId,
            },
          });

          return existingProfile.id;
        }

        const newProfile = await tx.profiles.create({
          data: {
            display_name: user.name ?? email.split("@")[0],
            email,
          },
        });

        await tx.oauth_accounts.create({
          data: {
            profile_id: newProfile.id,
            provider: "google",
            provider_account_id: account.providerAccountId,
          },
        });

        return newProfile.id;
      });

      user.id = resolvedProfileId;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
