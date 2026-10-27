import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), user: { findUnique: vi.fn(), findMany: vi.fn() } }));
vi.mock("next-auth", () => ({ getServerSession: mocks.session }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: mocks.user } }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`REDIRECT:${path}`); } }));
import { getCurrentUser, requireRole } from "./session";
import { GET as adminUsers } from "@/app/api/admin/users/route";
import AdminLayout from "@/app/admin/layout";

beforeEach(() => { vi.resetAllMocks(); });
it("sin sesión validada no consulta usuarios ni admite administración", async () => {
  mocks.session.mockResolvedValue(null);
  expect(await getCurrentUser()).toBeNull();
  await expect(requireRole("ADMIN")).rejects.toThrow("UNAUTHORIZED");
  expect((await adminUsers()).status).toBe(401);
  expect(mocks.user.findUnique).not.toHaveBeenCalled(); expect(mocks.user.findMany).not.toHaveBeenCalled();
});
it("ignora el rol de la sesión y consulta el rol vigente en servidor", async () => {
  mocks.session.mockResolvedValue({ user: { id: "normal", role: "SUPERADMIN" } });
  mocks.user.findUnique.mockResolvedValue({ id: "normal", role: "USER" });
  await expect(requireRole("ADMIN")).rejects.toThrow("FORBIDDEN");
  expect(mocks.user.findUnique).toHaveBeenCalledWith({ where: { id: "normal" } });
  expect((await adminUsers()).status).toBe(403); expect(mocks.user.findMany).not.toHaveBeenCalled();
  await expect(AdminLayout({ children: "contenido administrativo" })).rejects.toThrow("REDIRECT:/perfil");
});
it("un usuario eliminado pierde acceso aunque exista una sesión anterior", async () => {
  mocks.session.mockResolvedValue({ user: { id: "deleted", role: "SUPERADMIN" } });
  mocks.user.findUnique.mockResolvedValue(null);
  await expect(requireRole("ADMIN")).rejects.toThrow("UNAUTHORIZED");
  expect((await adminUsers()).status).toBe(401); expect(mocks.user.findMany).not.toHaveBeenCalled();
});
it("la misma sesión pierde permisos inmediatamente después de una degradación en DB", async () => {
  mocks.session.mockResolvedValue({ user: { id: "actor", role: "ADMIN" } });
  mocks.user.findUnique.mockResolvedValue({ id: "actor", role: "ADMIN" });
  mocks.user.findMany.mockResolvedValue([]);
  expect((await adminUsers()).status).toBe(200);
  expect(await AdminLayout({ children: "panel" })).toBe("panel");
  mocks.user.findUnique.mockResolvedValue({ id: "actor", role: "USER" });
  expect((await adminUsers()).status).toBe(403);
  expect(mocks.user.findMany).toHaveBeenCalledTimes(1);
});
it("ADMIN no satisface SUPERADMIN aunque altere el rol de su sesión", async () => {
  mocks.session.mockResolvedValue({ user: { id: "actor", role: "SUPERADMIN" } });
  mocks.user.findUnique.mockResolvedValue({ id: "actor", role: "ADMIN" });
  await expect(requireRole("SUPERADMIN")).rejects.toThrow("FORBIDDEN");
});
