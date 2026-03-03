// src/lib/auth.ts
// Configuración de NextAuth con login por usuario/contraseña
// Un solo usuario admin por ahora, preparado para múltiples roles

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });
        if (!user) return null;

        const passwordOk = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!passwordOk) return null;

        return {
          id: String(user.id),
          name: user.username,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    // Guarda el rol en el token JWT
    jwt({ token, user }) {
      if (user) token.role = (user as any).role;
      return token;
    },
    // Expone el rol en la sesión del cliente
    session({ session, token }) {
      if (session.user) (session.user as any).role = token.role;
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
};
