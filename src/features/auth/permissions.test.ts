import { describe, expect, it } from "vitest";
import { canLinkUsers, canManageMatches, canManageUsers, canModerateForum, canUnlinkUsers, parseSuperadminEmails } from "./permissions";

describe("permissions", () => {
  it("mantiene la jerarquía USER, ADMIN y SUPERADMIN", () => {
    expect(canManageMatches("USER")).toBe(false);
    expect(canManageMatches("ADMIN")).toBe(true);
    expect(canLinkUsers("ADMIN")).toBe(true);
    expect(canManageUsers("ADMIN")).toBe(false);
    expect(canUnlinkUsers("ADMIN")).toBe(true);
    expect(canUnlinkUsers("SUPERADMIN")).toBe(true);
    expect(canModerateForum("USER")).toBe(false);
    expect(canModerateForum("ADMIN")).toBe(true);
    expect(canModerateForum("SUPERADMIN")).toBe(true);
  });
  it("normaliza SUPERADMIN_EMAILS", () => {
    expect(parseSuperadminEmails(" ADMIN@example.com,otro@example.com ").has("admin@example.com")).toBe(true);
  });
});
