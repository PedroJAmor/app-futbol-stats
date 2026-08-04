import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      playerId: number | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    playerId: number | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    playerId?: number | null;
  }
}
