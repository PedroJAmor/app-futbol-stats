/** Real HTTP/session checks against the confirmed test DB only.
 * Creates uniquely named fixtures and removes only this run's records. */
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { PrismaClient, type Role } from "@prisma/client";
import { assertSafeStagingEnvironment } from "../prisma/migration-scripts/guard-env";

async function main() {
  const safe = assertSafeStagingEnvironment();
  assert.equal(safe.host, "ep-flat-dew-ac0jqcc0-pooler.sa-east-1.aws.neon.tech", "El host no es la base de pruebas confirmada.");
  const base = "http://127.0.0.1:3102";
  const marker = `PRUEBA_SEGURIDAD_${randomUUID()}`;
  const rateSecret = randomUUID();
  const startedAt = Date.now();
  const users: string[] = [], players: number[] = [], matches: number[] = [];
  const checks: { name: string; status?: number }[] = [];
  const db = new PrismaClient();
  let serverOutput = "";
  const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", "3102"], {
    env: { ...process.env, VERCEL: undefined, VERCEL_ENV: "preview", NEXTAUTH_URL: base, NEXTAUTH_SECRET: randomUUID(),
      ANONYMOUS_RATE_LIMIT_SECRET: rateSecret, ANONYMOUS_RATE_LIMIT_MAX: "5", ANONYMOUS_RATE_LIMIT_WINDOW_MS: "600000",
      ANONYMOUS_RATE_LIMIT_NETWORK_MAX: "50", PUBLIC_API_RATE_LIMIT_MAX: "120" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", chunk => { serverOutput += chunk; });
  server.stderr.on("data", chunk => { serverOutput += chunk; });
  function check(name: string, condition: unknown) { assert.ok(condition, name); checks.push({ name }); }
  async function api(path: string, method = "GET", body?: unknown, token?: string, extra: Record<string, string> = {}) {
    const response = await fetch(`${base}${path}`, { method, redirect: "manual", signal: AbortSignal.timeout(20_000),
      headers: { Origin: base, "User-Agent": marker, ...extra, ...(body !== undefined && { "Content-Type": "application/json" }), ...(token && { Cookie: `next-auth.session-token=${token}` }) },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    const data = response.headers.get("content-type")?.includes("application/json") ? await response.json() : null;
    return { status: response.status, data, headers: response.headers };
  }
  async function identity(role: Role) {
    const user = await db.user.create({ data: { role, name: marker } }); users.push(user.id);
    const token = randomUUID();
    await db.session.create({ data: { userId: user.id, sessionToken: token, expires: new Date(Date.now() + 600_000) } });
    return { id: user.id, token };
  }
  try {
    await new Promise<void>((resolve, reject) => {
      const interval = setInterval(() => { if (serverOutput.includes("Ready in")) { clearInterval(interval); clearTimeout(timeout); resolve(); } }, 100);
      const timeout = setTimeout(() => { clearInterval(interval); reject(new Error("El servidor temporal no inició.")); }, 20_000);
      server.once("exit", () => { clearInterval(interval); clearTimeout(timeout); reject(new Error("El servidor temporal terminó antes de iniciar.")); });
    });
    const normal = await identity("USER"), admin = await identity("ADMIN"), superadmin = await identity("SUPERADMIN");
    const mutations = [["POST", "/api/jugadores"], ["PUT", "/api/jugadores/1"], ["DELETE", "/api/jugadores/1"], ["POST", "/api/partidos"], ["PUT", "/api/partidos/1"], ["DELETE", "/api/partidos/1"], ["PATCH", "/api/partidos/1"], ["PATCH", `/api/admin/users/${normal.id}`], ["DELETE", "/api/forum/cl000000000000000000000000"], ["POST", "/api/upload"]];
    for (const [method, path] of mutations) {
      check(`guest denied ${method} ${path}`, (await api(path, method, {})).status === 401);
      check(`USER denied despite forged role ${method} ${path}`, (await api(path, method, { role: "SUPERADMIN", userId: superadmin.id }, normal.token, { "X-Role": "SUPERADMIN" })).status === 403);
    }
    check("admin list denies guest", (await api("/api/admin/users")).status === 401);
    check("admin list denies USER via direct GET", (await api("/api/admin/users", "GET", undefined, normal.token, { "X-Role": "SUPERADMIN" })).status === 403);
    check("forged session cookie is rejected", (await api("/api/admin/users", "GET", undefined, JSON.stringify({ role: "SUPERADMIN", id: superadmin.id }))).status === 401);
    check("valid ADMIN can read admin list", (await api("/api/admin/users", "GET", undefined, admin.token)).status === 200);
    check("guest admin page redirects server-side", (await api("/admin")).headers.get("location") === "/perfil");
    check("USER admin page redirects server-side", (await api("/admin", "GET", undefined, normal.token)).headers.get("location") === "/perfil");
    check("ADMIN cannot promote own account", (await api(`/api/admin/users/${admin.id}`, "PATCH", { role: "SUPERADMIN" }, admin.token)).status === 403);
    check("SUPERADMIN can change fixture role", (await api(`/api/admin/users/${normal.id}`, "PATCH", { role: "ADMIN" }, superadmin.token)).status === 200);
    check("existing session sees server promotion", (await api("/api/admin/users", "GET", undefined, normal.token)).status === 200);
    await db.user.update({ where: { id: normal.id }, data: { role: "USER" } });
    check("existing session loses privilege immediately on demotion", (await api("/api/admin/users", "GET", undefined, normal.token)).status === 403);
    for (let i = 0; i < 2; i++) {
      const created = await api("/api/jugadores", "POST", { firstName: `${marker}_${i}` }, admin.token);
      check("admin creates test player", created.status === 201); players.push(created.data.id);
    }
    const hidden = await db.player.create({ data: { firstName: `${marker}_hidden`, isHidden: true } }); players.push(hidden.id);
    const publicPlayers = await api("/api/jugadores?includeHidden=1", "GET", undefined, normal.token);
    check("USER cannot opt into hidden players", publicPlayers.status === 200 && !publicPlayers.data.some((p: { id: number }) => p.id === hidden.id));
    const payload = { date: "2026-10-27", time: "15:00", format: 7, notes: marker, weather: "Prueba", teams: [{ side: "A", color: "Claro", result: "WIN", playerIds: [players[0]] }, { side: "B", color: "Oscuro", result: "LOSS", playerIds: [players[1]] }] };
    const created = await api("/api/partidos", "POST", payload, admin.token);
    check("admin creates fixture match", created.status === 201); matches.push(created.data.id);
    const path = `/api/partidos/${created.data.id}`;
    check("Next16 async route params allow edit", (await api(path, "PUT", { ...payload, weather: "Editado" }, admin.token)).status === 200);
    check("persisted match edit", (await api(path)).data.weather === "Editado");
    check("admin hides fixture match", (await api(path, "DELETE", undefined, admin.token)).status === 200);
    check("hidden detail denies guest", (await api(path)).status === 404);
    check("hidden detail denies USER", (await api(path, "GET", undefined, normal.token)).status === 404);
    check("hidden detail admits ADMIN", (await api(path, "GET", undefined, admin.token)).status === 200);
    const filtered = await api(`/api/partidos?view=cards&includeHidden=1&playerIds=${players[0]}`, "GET", undefined, normal.token);
    check("USER cannot opt into hidden matches", filtered.status === 200 && !filtered.data.some((m: { id: number }) => m.id === created.data.id));
    check("admin restores fixture match", (await api(path, "PATCH", undefined, admin.token)).status === 200);
    check("stats comparison runs on updated dependencies", (await api(`/api/stats/comparar?ids=${players[0]},${players[1]}`)).status === 200);
    check("cross-origin admin write denied", (await api(`/api/jugadores/${players[0]}`, "PUT", { firstName: "must-not-save" }, admin.token, { Origin: "https://evil.example" })).status === 403);
    check("forbidden write preserved data", (await db.player.findUniqueOrThrow({ where: { id: players[0] } })).firstName.startsWith(marker));
    const settled = await Promise.allSettled(Array.from({ length: 8 }, (_, i) => api("/api/forum", "POST", { text: `${marker} ${i}` })));
    assert.ok(settled.every(result => result.status === "fulfilled"), "Falló una solicitud concurrente.");
    const replies = settled.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
    check("real concurrent PostgreSQL quota admits exactly 5 posts", replies.filter(r => r.status === 201).length === 5);
    check("remaining concurrent posts return 429", replies.filter(r => r.status === 429).length === 3);
    check("429 includes retry delay", replies.filter(r => r.status === 429).every(r => Number(r.headers.get("retry-after")) > 0));
    check("posts have no account link", replies.filter(r => r.status === 201).every(r => !JSON.stringify(r.data).includes("userId") && !JSON.stringify(r.data).includes("fingerprint")));
    console.log(`${checks.length} comprobaciones integradas aprobadas sobre staging.`);
  } finally {
    try {
    // Recover IDs even if a response was lost after a committed creation.
    const ownedMatches = await db.match.findMany({ where: { notes: marker }, select: { id: true }, take: 10 });
    const ownedPlayers = await db.player.findMany({ where: { firstName: { startsWith: marker } }, select: { id: true }, take: 10 });
    matches.push(...ownedMatches.map(row => row.id)); players.push(...ownedPlayers.map(row => row.id));
    // Wait for all HTTP work before deleting only uniquely identified fixtures.
    if (matches.length) {
      await db.matchParticipation.deleteMany({ where: { matchId: { in: matches } } });
      await db.matchTeam.deleteMany({ where: { matchId: { in: matches } } });
      await db.match.deleteMany({ where: { id: { in: matches }, notes: marker } });
    }
    if (players.length) await db.player.deleteMany({ where: { id: { in: players }, firstName: { startsWith: marker } } });
    const posts = await db.forumPost.findMany({ where: { text: { startsWith: marker } }, select: { id: true } });
    if (posts.length) await db.forumPost.deleteMany({ where: { id: { in: posts.map(p => p.id) }, text: { startsWith: marker } } });
    if (users.length) await db.user.deleteMany({ where: { id: { in: users }, name: marker } });
    const hashes: string[] = [];
    for (const [scope, identity, windowMs] of [["public-api", "local", 60000], ["forum-network", "local", 600000], ["forum-browser", JSON.stringify(["local", marker]), 600000]] as const) {
      for (let t = Math.floor(startedAt / windowMs) * windowMs; t <= Date.now(); t += windowMs) {
        hashes.push(createHmac("sha256", rateSecret).update(JSON.stringify([scope, t, identity])).digest("hex"));
      }
    }
    await db.anonymousRateLimit.deleteMany({ where: { fingerprintHash: { in: hashes } } });
    const remaining = await db.user.count({ where: { name: marker } }) + await db.player.count({ where: { firstName: { startsWith: marker } } }) + await db.match.count({ where: { notes: marker } }) + await db.forumPost.count({ where: { text: { startsWith: marker } } });
    assert.equal(remaining, 0, "Quedaron fixtures de esta prueba.");
    mkdirSync(".local-artifacts/security-upgrade", { recursive: true });
    writeFileSync(".local-artifacts/security-upgrade/staging-verification.json", JSON.stringify({ at: new Date().toISOString(), checks, fixturesCleaned: true, stagingHost: safe.host }, null, 2));
    } finally {
      server.kill("SIGTERM"); await db.$disconnect();
    }
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Falló la verificación integrada."); process.exitCode = 1; });
