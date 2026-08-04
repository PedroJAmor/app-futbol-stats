import { getServerSession } from "next-auth";
import type { Role, User } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRole } from "./permissions";

export async function getCurrentUser(): Promise<User | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireRole(minimum: Role) {
  const user = await requireUser();
  if (!hasRole(user.role, minimum)) throw new Error("FORBIDDEN");
  return user;
}

export function authErrorStatus(error: unknown) {
  if (!(error instanceof Error)) return 500;
  if (error.message === "UNAUTHORIZED") return 401;
  if (error.message === "FORBIDDEN") return 403;
  return 500;
}
