import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: AuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Identifiants",
      credentials: {
        username: { label: "Identifiant", type: "text" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const agent = await prisma.agent.findUnique({
          where: { loginHandle: credentials.username.trim().toLowerCase() },
        });
        if (!agent || !agent.active) return null;

        const valid = await bcrypt.compare(credentials.password, agent.passwordHash);
        if (!valid) return null;

        return {
          id: agent.id,
          name: `${agent.firstName} ${agent.lastName}`,
          username: agent.loginHandle,
          role: agent.role,
          mustChangePassword: agent.mustChangePassword,
          accentColor: agent.accentColor,
          editorMode: agent.editorMode,
          avatarUrl: agent.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.username = (user as { username: string }).username;
        token.role = (user as { role: string }).role;
        token.mustChangePassword = (user as { mustChangePassword: boolean }).mustChangePassword;
        token.accentColor = (user as { accentColor: string | null }).accentColor;
        token.editorMode = (user as { editorMode: boolean }).editorMode;
        token.avatarUrl = (user as { avatarUrl: string | null }).avatarUrl;
      }
      if (trigger === "update" && token.id) {
        const fresh = await prisma.agent.findUnique({ where: { id: token.id as string } });
        if (fresh) {
          token.accentColor = fresh.accentColor;
          token.editorMode = fresh.editorMode;
          token.mustChangePassword = fresh.mustChangePassword;
          token.avatarUrl = fresh.avatarUrl;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).id = token.id;
        (session.user as Record<string, unknown>).username = token.username;
        (session.user as Record<string, unknown>).role = token.role;
        (session.user as Record<string, unknown>).mustChangePassword = token.mustChangePassword;
        (session.user as Record<string, unknown>).accentColor = token.accentColor;
        (session.user as Record<string, unknown>).editorMode = token.editorMode;
        (session.user as Record<string, unknown>).avatarUrl = token.avatarUrl;
      }
      return session;
    },
  },
};
