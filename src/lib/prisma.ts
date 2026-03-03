// src/lib/prisma.ts
// Singleton para evitar múltiples instancias de PrismaClient en desarrollo
// (Next.js recarga módulos con hot reload, esto lo previene)

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
