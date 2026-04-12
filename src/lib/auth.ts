import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

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
      if (account?.provider !== "google") return true;

      const email = user.email?.toLowerCase();
      if (!email) return false;

      // Check if this Google account is already linked
      const existingOAuth = await prisma.oauth_accounts.findUnique({
        where: {
          provider_provider_account_id: {
            provider: "google",
            provider_account_id: account.providerAccountId,
          },
        },
        include: { profiles: true },
      });

      if (existingOAuth) {
        // Already linked — set the profile id on the user object
        user.id = existingOAuth.profile_id;
        return true;
      }

      // Check if a profile with this email already exists
      const existingProfile = await prisma.profiles.findFirst({
        where: { email },
      });

      if (existingProfile) {
        // Link Google account to existing profile
        await prisma.oauth_accounts.create({
          data: {
            profile_id: existingProfile.id,
            provider: "google",
            provider_account_id: account.providerAccountId,
          },
        });
        user.id = existingProfile.id;
        return true;
      }

      // Create a new profile + link
      const newProfile = await prisma.profiles.create({
        data: {
          display_name: user.name ?? email.split("@")[0],
          email,
        },
      });

      await prisma.oauth_accounts.create({
        data: {
          profile_id: newProfile.id,
          provider: "google",
          provider_account_id: account.providerAccountId,
        },
      });

      user.id = newProfile.id;
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
