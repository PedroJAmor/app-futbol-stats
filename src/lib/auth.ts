import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma";
import { parseSuperadminEmails } from "@/features/auth/permissions";

const googleClientId = process.env.GOOGLE_CLIENT_ID ?? "google-client-id-not-configured";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "google-client-secret-not-configured";

export const isGoogleAuthConfigured =
  Boolean(process.env.GOOGLE_CLIENT_ID) && Boolean(process.env.GOOGLE_CLIENT_SECRET);

async function promoteConfiguredSuperadmin(user: { id: string; email?: string | null }) {
  if (!user.email) return;
  const superadmins = parseSuperadminEmails(process.env.SUPERADMIN_EMAILS);
  if (!superadmins.has(user.email.toLowerCase())) return;
  await prisma.user.updateMany({
    where: { id: user.id, role: { not: "SUPERADMIN" } },
    data: { role: "SUPERADMIN" },
  });
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  session: { strategy: "database" },
  callbacks: {
    async signIn({ user, account, profile }) {
      return account?.provider === "google" && Boolean(user.email) &&
        Boolean(profile && "email_verified" in profile && profile.email_verified === true);
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = user.role;
        session.user.playerId = user.playerId;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      await promoteConfiguredSuperadmin(user);
    },
    async signIn({ user }) {
      await promoteConfiguredSuperadmin(user);
    },
  },
};
