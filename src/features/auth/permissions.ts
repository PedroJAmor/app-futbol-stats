import type { Role } from "@prisma/client";

const roleWeight: Record<Role, number> = { USER: 0, ADMIN: 1, SUPERADMIN: 2 };

export function parseSuperadminEmails(value?: string) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function hasRole(role: Role, minimum: Role) {
  return roleWeight[role] >= roleWeight[minimum];
}

export const canManagePlayers = (role: Role) => hasRole(role, "ADMIN");
export const canManageMatches = (role: Role) => hasRole(role, "ADMIN");
export const canManageUsers = (role: Role) => role === "SUPERADMIN";
export const canLinkUsers = (role: Role) => hasRole(role, "ADMIN");
export const canUnlinkUsers = (role: Role) => hasRole(role, "ADMIN");
export const canModerateForum = (role: Role) => hasRole(role, "ADMIN");
