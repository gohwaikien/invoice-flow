import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Fetch user roles from database (with backward compatibility for legacy role field)
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { roles: true, role: true },
        });
        // Use roles array if available, otherwise convert legacy role to array
        if (dbUser?.roles && dbUser.roles.length > 0) {
          session.user.roles = dbUser.roles;
        } else if (dbUser?.role) {
          session.user.roles = [dbUser.role];
        } else {
          session.user.roles = [];
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});

// Helper function to check if user has a specific role
export function hasRole(user: { roles?: string[] } | null | undefined, role: string): boolean {
  return user?.roles?.includes(role) ?? false;
}

// Helper function to check if user has any of the specified roles
export function hasAnyRole(user: { roles?: string[] } | null | undefined, roles: string[]): boolean {
  return roles.some(role => user?.roles?.includes(role) ?? false);
}

