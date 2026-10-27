import { afterEach, describe, expect, it, vi } from "vitest";
import { assertSameOrigin, readJsonBody } from "./request";

afterEach(() => vi.unstubAllEnvs());
const url = "https://demo.example/api/forum";
const request = (headers: HeadersInit = {}, body = "{}") => new Request(url, { method: "POST", body, headers: { "content-type": "application/json", origin: "https://demo.example", ...headers } });

describe("origen de escrituras", () => {
  it("admite el origen exacto y el fallback Referer de navegadores antiguos", () => {
    expect(() => assertSameOrigin(request())).not.toThrow();
    expect(() => assertSameOrigin(new Request(url, { headers: { referer: "https://demo.example/foro" } }))).not.toThrow();
  });
  it.each(["https://evil.example", "https://demo.example.evil.test", "http://demo.example", "https://demo.example:444", "null", "https://demo.example/", "https://user@demo.example"])("rechaza origen %s", origin => {
    expect(() => assertSameOrigin(request({ origin }))).toThrow(expect.objectContaining({ status: 403 }));
  });
  it.each(["cross-site", "same-site"])("rechaza Fetch Metadata %s aunque Origin coincida", site => {
    expect(() => assertSameOrigin(request({ "sec-fetch-site": site }))).toThrow(expect.objectContaining({ status: 403 }));
  });
  it("rechaza ausencia de evidencia de origen y no confía en X-Forwarded-Host", () => {
    expect(() => assertSameOrigin(new Request(url))).toThrow(expect.objectContaining({ status: 403 }));
    expect(() => assertSameOrigin(request({ origin: "https://evil.example", "x-forwarded-host": "evil.example" }))).toThrow();
  });
  it("acepta LAN con su puerto y HTTPS Vercel aunque la URL interna sea HTTP", () => {
    expect(() => assertSameOrigin(new Request("http://192.168.0.104:3000/api/forum", { headers: { origin: "http://192.168.0.104:3000" } }))).not.toThrow();
    vi.stubEnv("VERCEL", "1");
    expect(() => assertSameOrigin(new Request("http://localhost:3000/api/forum", { headers: { host: "branch.vercel.app", origin: "https://branch.vercel.app" } }))).not.toThrow();
  });
});

describe("cuerpos acotados", () => {
  it("acepta JSON y charset y rechaza formatos simples utilizables desde formularios externos", async () => {
    expect(await readJsonBody(request({ "content-type": "application/json; charset=utf-8" }, '{"text":"hola"}'))).toEqual({ text: "hola" });
    for (const type of ["text/plain", "application/x-www-form-urlencoded", "multipart/form-data"]) await expect(readJsonBody(request({ "content-type": type }))).rejects.toMatchObject({ status: 415 });
  });
  it("valida los bytes reales sin Content-Length o con un valor mentiroso", async () => {
    for (const headers of [{}, { "content-length": "1" }] as HeadersInit[]) await expect(readJsonBody(request(headers, '"ááá"'), 6)).rejects.toMatchObject({ status: 413 });
    await expect(readJsonBody(request({ "content-length": "9999999" }))).rejects.toMatchObject({ status: 413 });
  });
  it("interrumpe streams grandes y rechaza JSON roto", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(8)); }, cancel });
    const req = new Request(url, { method: "POST", headers: { "content-type": "application/json" }, body: stream, duplex: "half" } as RequestInit);
    await expect(readJsonBody(req, 10)).rejects.toMatchObject({ status: 413 });
    expect(cancel).toHaveBeenCalled();
    await expect(readJsonBody(request({}, '{"text":'))).rejects.toMatchObject({ status: 400 });
  });
});
