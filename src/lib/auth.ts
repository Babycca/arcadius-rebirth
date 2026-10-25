import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit-log";

type ExtendedUser = {
  username: string;
  role: string;
  mustChangePassword: boolean;
  accentColor: string | null;
  editorMode: boolean;
  avatarUrl: string | null;
  permissionsJson: string;
};

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

        const actorName = `${agent.firstName} ${agent.lastName}`;
        await logActivity({
          actorId: agent.id,
          actorName,
          action: "LOGIN",
          entityType: "Agent",
          entityId: agent.id,
          summary: `${actorName} s'est connecté(e)`,
        });

        return {
          id: agent.id,
          name: `${agent.firstName} ${agent.lastName}`,
          username: agent.loginHandle,
          role: agent.role,
          mustChangePassword: agent.mustChangePassword,
          accentColor: agent.accentColor,
          editorMode: agent.editorMode,
          avatarUrl: agent.avatarUrl,
          permissionsJson: agent.permissionsJson,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        const extended = user as unknown as ExtendedUser;
        token.id = user.id;
        token.username = extended.username;
        token.role = extended.role;
        token.mustChangePassword = extended.mustChangePassword;
        token.accentColor = extended.accentColor;
        token.editorMode = extended.editorMode;
        token.avatarUrl = extended.avatarUrl;
        token.permissionsJson = extended.permissionsJson;
      }
      if (trigger === "update" && token.id) {
        const fresh = await prisma.agent.findUnique({ where: { id: token.id as string } });
        if (fresh) {
          token.accentColor = fresh.accentColor;
          token.editorMode = fresh.editorMode;
          token.mustChangePassword = fresh.mustChangePassword;
          token.avatarUrl = fresh.avatarUrl;
          token.permissionsJson = fresh.permissionsJson;
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
        (session.user as Record<string, unknown>).permissionsJson = token.permissionsJson;
      }
      return session;
    },
  },
};
