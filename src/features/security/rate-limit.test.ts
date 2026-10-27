import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ upsert: vi.fn(), update: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { anonymousRateLimit: db } }));
import { clientNetwork, consumeRateLimit, consumeUploadRateLimit, checkReadRateLimit, positiveIntegerSetting } from "./rate-limit";
import { consumeAnonymousRateLimit } from "@/features/forum/rate-limit";
import { securityErrorResponse } from "./errors";
const req = (agent = "Browser A", ip = "203.0.113.1") => new Request("https://demo.example/api/forum", { headers: { "user-agent": agent, "x-vercel-forwarded-for": ip, "x-forwarded-for": "1.2.3.4" } });
let counters: Map<string, number>;
beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers();
  // Advance across clean-up intervals between tests without depending on module internals.
  vi.setSystemTime(new Date("2026-10-27T12:00:01Z"));
  vi.stubEnv("VERCEL", "1"); vi.stubEnv("ANONYMOUS_RATE_LIMIT_SECRET", "only-a-test-secret");
  counters = new Map();
  db.findMany.mockResolvedValue([]); db.deleteMany.mockResolvedValue({ count: 0 });
  db.upsert.mockImplementation(async ({ where }) => {
    const key = JSON.stringify(where); const count = (counters.get(key) ?? 0) + 1; counters.set(key, count); return { count };
  });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("identificación de red", () => {
  it("usa el header de Vercel sin aceptar listas o headers alternativos del cliente", () => {
    expect(clientNetwork(req())).toBe("203.0.113.1");
    for (const value of ["", "203.0.113.1, 1.2.3.4", "invalid"]) expect(() => clientNetwork(req("a", value))).toThrow(expect.objectContaining({ status: 503 }));
    expect(() => clientNetwork(new Request("https://demo.example", { headers: { "x-forwarded-for": "1.2.3.4" } }))).toThrow();
  });
  it("agrupa IPv6 /64 y normaliza IPv4 mapeado", () => {
    expect(clientNetwork(req("a", "2001:db8:1234:5678::1"))).toBe(clientNetwork(req("b", "2001:0db8:1234:5678:abcd::ffff")));
    expect(clientNetwork(req("a", "::ffff:203.0.113.1"))).toBe("203.0.113.1");
    expect(clientNetwork(req("a", "2001:db8:1234:5679::1"))).not.toBe(clientNetwork(req("a", "2001:db8:1234:5678::1")));
  });
  it("no confía en headers reenviados fuera de Vercel", () => {
    vi.stubEnv("VERCEL", ""); expect(clientNetwork(req())).toBe("local");
  });
});

describe("cuotas compartidas", () => {
  it("permite exactamente 5 de 20 solicitudes concurrentes usando el incremento atómico del almacén", async () => {
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => consumeRateLimit("test", "identity", 5, 600_000)));
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(5);
    for (const result of results.filter(result => result.status === "rejected")) expect(result.reason).toMatchObject({ status: 429, retryAfter: 599 });
    expect(db.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { count: { increment: 1 } } }));
  });
  it("recupera la carrera de creación entre instancias sin regalar solicitudes", async () => {
    db.upsert.mockRejectedValueOnce({ code: "P2002" }); db.update.mockResolvedValue({ count: 6 });
    await expect(consumeRateLimit("test", "id", 5, 600_000)).rejects.toMatchObject({ status: 429 });
    expect(db.update).toHaveBeenCalledWith(expect.objectContaining({ data: { count: { increment: 1 } } }));
  });
  it("la cuota de red frena la rotación de navegador, pero admite varios amigos", async () => {
    vi.stubEnv("ANONYMOUS_RATE_LIMIT_NETWORK_MAX", "10");
    for (let i = 0; i < 10; i++) await consumeAnonymousRateLimit(req(`browser${i}`));
    await expect(consumeAnonymousRateLimit(req("another browser"))).rejects.toMatchObject({ status: 429 });
    await expect(consumeAnonymousRateLimit(req("another browser", "203.0.113.2"))).resolves.toBeUndefined();
  });
  it("mantiene 5 publicaciones por huella, sin guardar identidad ni vincular publicaciones", async () => {
    for (let i = 0; i < 5; i++) await consumeAnonymousRateLimit(req());
    await expect(consumeAnonymousRateLimit(req())).rejects.toMatchObject({ status: 429 });
    const persisted = JSON.stringify(db.upsert.mock.calls);
    expect(persisted).not.toContain("203.0.113.1"); expect(persisted).not.toContain("Browser A"); expect(persisted).not.toContain("only-a-test-secret");
  });
  it("renueva el contador y cambia la huella al pasar de ventana", async () => {
    await consumeRateLimit("test", "id", 1, 60_000);
    await expect(consumeRateLimit("test", "id", 1, 60_000)).rejects.toMatchObject({ status: 429 });
    vi.advanceTimersByTime(60_000); await consumeRateLimit("test", "id", 1, 60_000);
    expect(counters.size).toBe(2);
  });
  it("cuotas separadas por propósito y cuenta para fotos", async () => {
    vi.stubEnv("UPLOAD_RATE_LIMIT_MAX", "1");
    await consumeUploadRateLimit("user1"); await expect(consumeUploadRateLimit("user1")).rejects.toMatchObject({ status: 429 });
    await consumeUploadRateLimit("user2"); await consumeRateLimit("public-api", "user1", 1, 600_000);
  });
  it("devuelve Retry-After y evita cachear bloqueos", async () => {
    vi.stubEnv("PUBLIC_API_RATE_LIMIT_MAX", "1");
    expect(await checkReadRateLimit(req())).toBeNull();
    const response = await checkReadRateLimit(req());
    expect(response?.status).toBe(429); expect(response?.headers.get("Retry-After")).toBe("59"); expect(response?.headers.get("Cache-Control")).toBe("no-store");
  });
  it("falla cerrado ante errores del almacén, configuración inválida o secreto ausente sin filtrar detalles", async () => {
    db.upsert.mockRejectedValue(new Error("private db connection and credentials"));
    const response = await checkReadRateLimit(req());
    expect(response?.status).toBe(503); expect(await response?.text()).not.toContain("credentials");
    vi.stubEnv("ANONYMOUS_RATE_LIMIT_SECRET", ""); await expect(consumeAnonymousRateLimit(req())).rejects.toMatchObject({ status: 503 });
    for (const raw of ["", "NaN", "-1", "0", "1.5", "Infinity", "99999"]) {
      vi.stubEnv("SETTING", raw); expect(() => positiveIntegerSetting("SETTING", 5, 100)).toThrow();
    }
    expect(securityErrorResponse(new Error("private"))).toBeNull();
  });
  it("limpia solamente un lote acotado de contadores expirados y tolera fallos de limpieza", async () => {
    vi.setSystemTime(new Date("2026-10-28T12:00:01Z"));
    db.findMany.mockResolvedValue([{ id: "expired1" }, { id: "expired2" }]);
    await consumeRateLimit("test", "id", 5, 60_000);
    expect(db.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100, where: { expiresAt: { lte: new Date() } } }));
    expect(db.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["expired1", "expired2"] }, expiresAt: { lte: new Date() } } });
    vi.advanceTimersByTime(60_000); db.findMany.mockRejectedValue(new Error("private"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(consumeRateLimit("test", "id", 5, 60_000)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith("No se pudieron limpiar contadores vencidos de solicitudes."); warn.mockRestore();
  });
});
