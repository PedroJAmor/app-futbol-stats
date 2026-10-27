import { expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { authOptions } from "@/lib/auth";

it("solo permite Google con correo verificado antes de persistir/promover cuentas", async () => {
  const callback = authOptions.callbacks!.signIn!;
  const invoke = (provider: string, verified: unknown, email: string | null = "friend@example.com") => callback({
    user: { id: "user", email, role: "USER", playerId: null }, account: { provider, type: "oauth", providerAccountId: "account" },
    profile: { email: email ?? undefined, email_verified: verified },
  } as Parameters<typeof callback>[0]);
  expect(await invoke("google", true)).toBe(true);
  for (const value of [false, undefined, "true", 1]) expect(await invoke("google", value)).toBe(false);
  expect(await invoke("other", true)).toBe(false);
  expect(await invoke("google", true, null)).toBe(false);
});
