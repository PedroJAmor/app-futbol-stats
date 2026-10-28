/** Integration checks for the friends-feedback block.
 * Run after `npm run build` with the confirmed staging environment loaded:
 * node --env-file=.env --import tsx scripts/verify-feedback-staging.ts
 * Only UUID-prefixed fixtures are created/removed. No migration is executed.
 */
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { PrismaClient, type Role } from "@prisma/client";
import { assertSafeStagingEnvironment } from "../prisma/migration-scripts/guard-env";

type Check = { name: string; status?: number };
type Reply = { status: number; data: any; text: string; headers: Headers };

async function main() {
  // Validate before instantiating Prisma or starting the application.
  const safe = assertSafeStagingEnvironment();
  assert.equal(safe.host, "ep-flat-dew-ac0jqcc0-pooler.sa-east-1.aws.neon.tech", "El host no es la base de pruebas confirmada.");
  const base = "http://127.0.0.1:3104";
  const marker = `PRUEBA_MEJORAS_${randomUUID()}`;
  const rateSecret = randomUUID();
  const startedAt = Date.now();
  const checks: Check[] = [];
  const db = new PrismaClient();
  let output = "", completed = false, fixturesCleaned = false;
  const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", "3104"], {
    env: { ...process.env, VERCEL: undefined, VERCEL_ENV: "preview", NEXTAUTH_URL: base,
      NEXTAUTH_SECRET: randomUUID(), ANONYMOUS_RATE_LIMIT_SECRET: rateSecret, PUBLIC_API_RATE_LIMIT_MAX: "1000" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", chunk => { output = (output + chunk).slice(-80_000); });
  server.stderr.on("data", chunk => { output = (output + chunk).slice(-80_000); });
  function check(name: string, condition: unknown, status?: number) {
    assert.ok(condition, name); checks.push({ name, ...(status === undefined ? {} : { status }) });
  }
  async function api(path: string, method = "GET", body?: unknown, token?: string, extra: Record<string, string> = {}): Promise<Reply> {
    const response = await fetch(`${base}${path}`, {
      method, redirect: "manual", signal: AbortSignal.timeout(30_000),
      headers: { Origin: base, "User-Agent": marker, ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Cookie: `next-auth.session-token=${token}` }), ...extra },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    const data = response.headers.get("content-type")?.includes("application/json") ? JSON.parse(text) : null;
    return { status: response.status, data, text, headers: response.headers };
  }
  async function expectStatus(name: string, path: string, expected: number, method = "GET", body?: unknown, token?: string, extra?: Record<string, string>) {
    const reply = await api(path, method, body, token, extra);
    check(name, reply.status === expected, reply.status); return reply;
  }
  async function identity(role: Role) {
    const user = await db.user.create({ data: { role, name: marker } });
    const token = randomUUID();
    await db.session.create({ data: { userId: user.id, sessionToken: token, expires: new Date(Date.now() + 3_600_000) } });
    return token;
  }
  async function stopServer() {
    if (server.exitCode !== null || server.signalCode !== null) return;
    await new Promise<void>(resolve => {
      const timeout = setTimeout(() => { server.kill("SIGKILL"); }, 10_000);
      server.once("exit", () => { clearTimeout(timeout); resolve(); });
      server.kill("SIGTERM");
    });
  }
  try {
    await new Promise<void>((resolve, reject) => {
      const poll = setInterval(() => { if (output.includes("Ready in")) { clearInterval(poll); clearTimeout(timeout); resolve(); } }, 100);
      const timeout = setTimeout(() => { clearInterval(poll); reject(new Error("El servidor temporal no inició.")); }, 20_000);
      server.once("error", () => { clearInterval(poll); clearTimeout(timeout); reject(new Error("No se pudo iniciar el servidor temporal.")); });
      server.once("exit", () => { clearInterval(poll); clearTimeout(timeout); reject(new Error("El servidor temporal terminó antes de iniciar.")); });
    });
    const normal = await identity("USER"), admin = await identity("ADMIN");

    // No real record can be touched: authorization must run before route lookup.
    const mutations = [["POST", "/api/canchas"], ["PUT", "/api/canchas/1"],
      ["POST", "/api/canchas/1/pistas"], ["PUT", "/api/canchas/1/pistas/1"]];
    for (const [method, path] of mutations) {
      await expectStatus(`guest denied ${method} ${path}`, path, 401, method, {});
      await expectStatus(`USER denied despite forged role ${method} ${path}`, path, 403, method,
        { name: marker, role: "SUPERADMIN" }, normal, { "X-Role": "SUPERADMIN" });
    }
    const catalogue = await expectStatus("venue catalogue public", "/api/canchas", 200);
    check("public catalogue excludes internal metadata", Array.isArray(catalogue.data) && catalogue.data.every((venue: any) =>
      !Object.hasOwn(venue, "normalizedName") && !Object.hasOwn(venue, "createdAt") && !Object.hasOwn(venue, "updatedAt") &&
      venue.courts.every((court: any) => !Object.hasOwn(court, "normalizedName"))));
    await expectStatus("venue requires name", "/api/canchas", 400, "POST", {}, admin);
    await expectStatus("cross-origin creation denied", "/api/canchas", 403, "POST", { name: marker }, admin, { Origin: "https://evil.example" });
    for (const [field, value] of [["mapUrl", "http://example.com"], ["photoUrl", "https://user:password@example.com/image.jpg"], ["mapUrl", "javascript:alert(1)"]]) {
      await expectStatus(`invalid ${field} rejected`, "/api/canchas", 400, "POST", { name: marker, [field]: value }, admin);
    }
    const venue = (await expectStatus("name-only venue created", "/api/canchas", 201, "POST", { name: `${marker}_A` }, admin)).data;
    const otherVenue = (await expectStatus("second fixture venue created", "/api/canchas", 201, "POST", { name: `${marker}_B` }, admin)).data;
    check("optional venue details remain empty", venue.address === null && venue.mapUrl === null && venue.photoUrl === null && venue.courts.length === 0);
    await expectStatus("venue names normalized and unique", "/api/canchas", 409, "POST", { name: ` ${marker.toLowerCase()}_a ` }, admin);
    await expectStatus("public venue detail", `/api/canchas/${venue.id}`, 200);
    await expectStatus("venue details editable", `/api/canchas/${venue.id}`, 200, "PUT", {
      name: `${marker}_A`, address: "Dirección de prueba", mapUrl: "https://www.google.com/maps?query=prueba",
    }, admin);
    const skeleton = (await expectStatus("name-only court created", `/api/canchas/${venue.id}/pistas`, 201, "POST", { name: "Sin completar" }, admin)).data;
    check("court format and goals optional", skeleton.format === null && skeleton.goals.length === 0);
    await expectStatus("court requires name", `/api/canchas/${venue.id}/pistas`, 400, "POST", { format: 5 }, admin);
    await expectStatus("court goal names must differ", `/api/canchas/${venue.id}/pistas`, 400, "POST", { name: "Inválida", goalNames: ["Pared", "pared"] }, admin);
    await expectStatus("both court goals required together", `/api/canchas/${venue.id}/pistas`, 400, "POST", { name: "Inválida", goalNames: ["Pared"] }, admin);
    const court = (await expectStatus("court with goal pair created", `/api/canchas/${venue.id}/pistas`, 201, "POST", {
      name: "Cancha completa", format: 5, goalNames: ["Pared", "Calle"],
    }, admin)).data;
    const foreignCourt = (await expectStatus("foreign fixture court created", `/api/canchas/${otherVenue.id}/pistas`, 201, "POST", {
      name: "Otra cancha", format: 5, goalNames: ["Entrada", "Fondo"],
    }, admin)).data;
    const renamed = (await expectStatus("court goal names editable", `/api/canchas/${venue.id}/pistas/${court.id}`, 200, "PUT", {
      name: court.name, format: 5, goalNames: ["Pared renombrada", "Calle"],
    }, admin)).data;
    check("renaming goals retains historical IDs", renamed.goals[0].id === court.goals[0].id && renamed.goals[1].id === court.goals[1].id);
    await expectStatus("court edit rejects foreign parent", `/api/canchas/${otherVenue.id}/pistas/${court.id}`, 404, "PUT", { name: court.name }, admin);

    const players: number[] = [];
    for (const suffix of ["ganador", "perdedor"]) {
      const player = (await expectStatus("admin creates fixture player", "/api/jugadores", 201, "POST", { firstName: `${marker}_${suffix}` }, admin)).data;
      players.push(player.id);
    }
    const currentMonth = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit" }).format(new Date());
    const [year, monthNumber] = currentMonth.split("-").map(Number);
    const closedMonth = `${monthNumber === 1 ? year - 1 : year}-${String(monthNumber === 1 ? 12 : monthNumber - 1).padStart(2, "0")}`;
    const payload = {
      date: `${closedMonth}-15`, time: "15:00", format: 5, category: "MIDWEEK", venueId: venue.id, courtId: court.id,
      aGoalId: court.goals[0].id, priceCents: 8_400_000, notes: marker,
      teams: [{ side: "A", color: "Claro", result: "WIN", playerIds: [players[0]] },
        { side: "B", color: "Oscuro", result: "LOSS", playerIds: [players[1]] }],
    };
    await expectStatus("match rejects court from another venue", "/api/partidos", 400, "POST", { ...payload, courtId: foreignCourt.id }, admin);
    await expectStatus("match rejects incompatible court format", "/api/partidos", 400, "POST", { ...payload, format: 7 }, admin);
    await expectStatus("match rejects goal from another court", "/api/partidos", 400, "POST", { ...payload, aGoalId: foreignCourt.goals[0].id }, admin);
    await expectStatus("match rejects goal without court", "/api/partidos", 400, "POST", { ...payload, courtId: null }, admin);
    await expectStatus("match rejects unknown category", "/api/partidos", 400, "POST", { ...payload, category: "OTHER" }, admin);
    await expectStatus("unassigned location cannot be confirmed real", "/api/partidos", 400, "POST", { ...payload, courtId: null, aGoalId: null, confirmLocation: true }, admin);
    const match = (await expectStatus("match with category court and goals created", "/api/partidos", 201, "POST", payload, admin)).data;
    const path = `/api/partidos/${match.id}`;
    check("opposite goal automatically assigned to team B", match.teams.find((team: any) => team.side === "A").defendedGoalId === court.goals[0].id &&
      match.teams.find((team: any) => team.side === "B").defendedGoalId === court.goals[1].id && match.category === "MIDWEEK" && !match.locationIsDemo);
    await expectStatus("court format cannot invalidate existing match", `/api/canchas/${venue.id}/pistas/${court.id}`, 409, "PUT", { name: court.name, format: 7 }, admin);

    const query = `venueId=${venue.id}&courtId=${court.id}&format=5&dateFrom=${closedMonth}-01&dateTo=${closedMonth}-28&playerIds=${players.join(",")}`;
    const matching = (await expectStatus("combined filters include selected fixture", `/api/partidos?view=cards&${query}&categories=LEAGUE,MIDWEEK`, 200)).data;
    check("categories OR and other filters AND", matching.length === 1 && matching[0].id === match.id);
    const excluded = (await expectStatus("different category excludes fixture", `/api/partidos?view=cards&${query}&categories=LEAGUE`, 200)).data;
    check("category filtering applied server-side", excluded.length === 0);
    const sameTeam = (await expectStatus("same-team filter executes", `/api/partidos?view=cards&${query}&sameTeam=1`, 200)).data;
    check("opponents do not match same-team filter", sameTeam.length === 0);
    await expectStatus("unknown category filter rejected", "/api/partidos?categories=OTHER", 400);

    await db.match.updateMany({ where: { id: match.id, notes: marker }, data: { locationIsDemo: true } });
    // An old client omits the newly introduced location/category fields.
    const { courtId: _courtId, aGoalId: _aGoalId, category: _category, ...legacyPayload } = payload;
    const legacy = (await expectStatus("legacy match edit accepted", path, 200, "PUT", { ...legacyPayload, weather: "Prueba" }, admin)).data;
    check("legacy edit retains category court goals and demo marker", legacy.category === "MIDWEEK" && legacy.courtId === court.id && legacy.locationIsDemo &&
      legacy.teams.find((team: any) => team.side === "A").defendedGoalId === court.goals[0].id &&
      legacy.teams.find((team: any) => team.side === "B").defendedGoalId === court.goals[1].id);
    const unchanged = (await expectStatus("unrelated editor edit accepted", path, 200, "PUT", { ...payload, weather: "Otra edición" }, admin)).data;
    check("unchanged synthetic assignment remains visibly synthetic", unchanged.locationIsDemo === true);

    const goalQuery = `venueId=${venue.id}&courtId=${court.id}&dateFrom=${closedMonth}-01&dateTo=${closedMonth}-28&categories=MIDWEEK`;
    const goals = (await expectStatus("public goal statistics execute", `/api/stats/arcos?${goalQuery}`, 200)).data;
    const goalCourt = goals.venues.find((item: any) => item.id === venue.id)?.courts.find((item: any) => item.id === court.id);
    check("one match counted once with explicit demo marker", goalCourt?.matches === 1 && goalCourt.demoMatches === 1 &&
      JSON.stringify(goalCourt.counts) === "[1,0,0]" && JSON.stringify(goalCourt.percentages) === "[100,0,0]");
    check("goal percentages sum to 100", goalCourt.percentages.reduce((sum: number, value: number) => sum + value, 0) === 100);
    const confirmed = (await expectStatus("admin explicitly confirms real location", path, 200, "PUT", { ...payload, confirmLocation: true }, admin)).data;
    check("confirmation clears synthetic marker without changing goals", confirmed.locationIsDemo === false && confirmed.courtId === court.id &&
      confirmed.teams.find((team: any) => team.side === "A").defendedGoalId === court.goals[0].id);

    const venuePage = await expectStatus("public venue history renders", `/canchas/${venue.id}`, 200);
    const courtPage = await expectStatus("public court history renders", `/canchas/${venue.id}/pistas/${court.id}`, 200);
    const matchLink = `href="/partidos/${match.id}"`;
    check("venue history contains fixture match", venuePage.text.includes(matchLink));
    check("court history contains fixture match", courtPage.text.includes(matchLink));
    const deepLink = await expectStatus("deep-linked match filters render", `/partidos?venueId=${venue.id}&courtId=${court.id}`, 200);
    // Filtered results are intentionally fetched after hydration. The HTTP page
    // can prove the selected filters were server-rendered, not their later list.
    function selectedOption(label: string, value: number) {
      const options = deepLink.text.match(new RegExp(`<label\\b[^>]*>${label}<select\\b[^>]*>([\\s\\S]*?)</select>`))?.[1] ?? "";
      return new RegExp(`<option\\b(?=[^>]*\\bvalue="${value}")(?=[^>]*\\bselected(?:=""|(?=[\\s>])))[^>]*>`).test(options);
    }
    check("deep-linked venue filter selected in initial HTML", selectedOption("Predio", venue.id));
    check("deep-linked court filter selected in initial HTML", selectedOption("Cancha física", court.id));
    check("deep-linked results announce initial loading", deepLink.text.includes("Actualizando partidos…"));
    const detail = await expectStatus("match detail renders", `/partidos/${match.id}`, 200);
    check("match detail contains total and per-person price", detail.text.includes("Precio (por persona)") && detail.text.includes("84.000") && detail.text.includes("42.000"));

    const monthly = (await expectStatus("default monthly teams available", "/api/stats/equipos-mes", 200)).data;
    check("monthly default is previous Argentina calendar month", monthly.month === closedMonth && monthly.months.every((item: string) => item < currentMonth));
    check("monthly teams never repeat a player", new Set([...monthly.best, ...monthly.worst].map((item: any) => item.playerId)).size === monthly.best.length + monthly.worst.length);
    check("monthly scores use victories minus defeats and inverse", monthly.best.every((item: any) => item.score === item.v - item.d) && monthly.worst.every((item: any) => item.score === item.d - item.v));
    check("monthly teams contain at most seven per side", monthly.best.length <= 7 && monthly.worst.length <= 7 && monthly.candidateCount >= 2);
    await expectStatus("current month remains unavailable", `/api/stats/equipos-mes?month=${currentMonth}`, 400);
    await expectStatus("malformed month rejected", "/api/stats/equipos-mes?month=2026-13", 400);
    await expectStatus("unknown monthly category rejected", `/api/stats/equipos-mes?month=${closedMonth}&categories=OTHER`, 400);

    await expectStatus("admin hides fixture match", path, 200, "DELETE", undefined, admin);
    const hiddenGoalStats = (await expectStatus("goal stats exclude hidden fixture", `/api/stats/arcos?${goalQuery}`, 200)).data;
    check("hidden match not counted in goal denominator", hiddenGoalStats.venues[0].courts[0].matches === 0);
    const hiddenVenue = await expectStatus("venue history remains public after hide", `/canchas/${venue.id}`, 200);
    const hiddenCourt = await expectStatus("court history remains public after hide", `/canchas/${venue.id}/pistas/${court.id}`, 200);
    check("venue and court histories exclude hidden matches", !hiddenVenue.text.includes(matchLink) && !hiddenCourt.text.includes(matchLink));
    await expectStatus("hidden match denies guest", path, 404);
    completed = true;
    console.log(`${checks.length} comprobaciones de mejoras aprobadas sobre staging.`);
  } finally {
    // Stop HTTP work before cleanup, including an operation whose response timed out.
    await stopServer();
    try {
      await db.$transaction(async tx => {
        // Recover every fixture by its UUID marker, even if an HTTP response was lost.
        const ownedMatches = await tx.match.findMany({ where: { notes: marker }, select: { id: true } });
        const ownedPlayers = await tx.player.findMany({ where: { firstName: { startsWith: marker } }, select: { id: true } });
        const ownedVenues = await tx.venue.findMany({ where: { name: { startsWith: marker } }, select: { id: true } });
        assert.ok(ownedMatches.length <= 10 && ownedPlayers.length <= 10 && ownedVenues.length <= 3, "La limpieza excede el alcance de esta prueba.");
        const matchIds = ownedMatches.map(row => row.id), venueIds = ownedVenues.map(row => row.id);
        const unrelated = await tx.match.count({ where: { OR: [{ venueId: { in: venueIds } }, { court: { venueId: { in: venueIds } } }], NOT: { notes: marker } } });
        assert.equal(unrelated, 0, "Un predio de prueba recibió datos ajenos; no se elimina.");
        await tx.match.deleteMany({ where: { id: { in: matchIds }, notes: marker } });
        await tx.player.deleteMany({ where: { id: { in: ownedPlayers.map(row => row.id) }, firstName: { startsWith: marker } } });
        await tx.venue.deleteMany({ where: { id: { in: venueIds }, name: { startsWith: marker } } });
        await tx.user.deleteMany({ where: { name: marker } });
        // Only counters created with this run's random secret can match these hashes.
        const hashes: string[] = [], windowMs = 60_000;
        for (let time = Math.floor(startedAt / windowMs) * windowMs; time <= Date.now(); time += windowMs) {
          hashes.push(createHmac("sha256", rateSecret).update(JSON.stringify(["public-api", time, "local"])).digest("hex"));
        }
        await tx.anonymousRateLimit.deleteMany({ where: { fingerprintHash: { in: hashes } } });
        const remaining = await tx.match.count({ where: { notes: marker } }) +
          await tx.player.count({ where: { firstName: { startsWith: marker } } }) +
          await tx.venue.count({ where: { name: { startsWith: marker } } }) + await tx.user.count({ where: { name: marker } });
        assert.equal(remaining, 0, "Quedaron fixtures de esta prueba.");
      }, { timeout: 30_000, isolationLevel: "Serializable" });
      fixturesCleaned = true;
    } finally {
      mkdirSync(".local-artifacts/friends-feedback", { recursive: true });
      writeFileSync(".local-artifacts/friends-feedback/staging-verification.json", JSON.stringify({
        at: new Date().toISOString(), completed, checks, fixturesCleaned, stagingHost: safe.host,
      }, null, 2));
      await db.$disconnect();
    }
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Falló la verificación de mejoras."); process.exitCode = 1; });
