vi.mock("@/features/security/rate-limit", () => ({ checkReadRateLimit: vi.fn().mockResolvedValue(null), consumeUploadRateLimit: vi.fn().mockResolvedValue(undefined) }));
import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@/features/auth/session", () => ({ requireRole: vi.fn().mockResolvedValue({ role: "ADMIN" }), authErrorStatus: () => 500 }));
import { POST } from "@/app/api/upload/route";
const request = () => new NextRequest("http://localhost/api/upload", { method: "POST", body: JSON.stringify({ imagen: "data:image/png;base64,iVBORw0KGgo=" }), headers: { "Content-Type": "application/json", Origin: "http://localhost" } });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function configure(status: number, body: unknown) {
  vi.stubEnv("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", "test-cloud");
  vi.stubEnv("CLOUDINARY_API_KEY", "test-key");
  vi.stubEnv("CLOUDINARY_API_SECRET", "test-secret");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: status === 200, status, json: async () => body }));
}
it("explica la clave deshabilitada sin revelar el mensaje del proveedor", async () => {
  configure(401, { error: { message: "disabled api_key test-key" } });
  const response = await POST(request());
  expect(response.status).toBe(503);
  const text = await response.text();
  expect(text).toContain("deshabilitada");
  expect(text).not.toContain("test-key");
});
it("distingue credenciales rechazadas de otros fallos externos sin exponer secretos", async () => {
  configure(403, { error: { message: "Invalid signature test-secret" } });
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("test-secret");
  configure(400, { error: { message: "Internal detail test-key" } });
  const failure = await POST(request());
  expect(failure.status).toBe(502);
  expect(await failure.text()).not.toContain("test-key");
});
it("conserva la respuesta de la foto optimizada cuando la subida funciona", async () => {
  configure(200, { secure_url: "https://res.cloudinary.com/test-cloud/image/upload/v1/jugadores/photo.png" });
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ url: "https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_400,h_400/v1/jugadores/photo.png" });
});

it("las fotos de predio conservan su proporción y usan una carpeta controlada", async () => {
  configure(200, { secure_url: "https://res.cloudinary.com/test-cloud/image/upload/v1/predios/photo.png" });
  const req = new NextRequest("http://localhost/api/upload", { method: "POST", body: JSON.stringify({ imagen: "data:image/png;base64,iVBORw0KGgo=", purpose: "venue" }), headers: { "Content-Type": "application/json", Origin: "http://localhost" } });
  const response = await POST(req);
  expect(response.status).toBe(200);
  expect((await response.json()).url).toContain("/upload/c_limit,w_1200/");
  expect(vi.mocked(fetch).mock.calls[0][1]?.body).toBeInstanceOf(FormData);
  expect((vi.mocked(fetch).mock.calls[0][1]?.body as FormData).get("folder")).toBe("predios");
});
it("no admite carpetas arbitrarias enviadas por el navegador", async () => {
  configure(200, {});
  const req = new NextRequest("http://localhost/api/upload", { method: "POST", body: JSON.stringify({ imagen: "data:image/png;base64,iVBORw0KGgo=", purpose: "../../other" }), headers: { "Content-Type": "application/json", Origin: "http://localhost" } });
  expect((await POST(req)).status).toBe(400);
  expect(fetch).not.toHaveBeenCalled();
});
