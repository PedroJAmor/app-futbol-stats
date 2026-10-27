# Filtros conectados y navegación — 24/10/2026

La solicitud «añadí el filtro de los partidos» autorizó su conexión funcional al listado. Posteriormente el usuario aprobó toda la fase visual («todo lo visual está ok»), habilitando los pendientes funcionales restantes del plan.

## Filtros

- Fechas desde/hasta inclusivas en horario argentino, formato, cancha y varios jugadores.
- Todos los seleccionados deben participar; «Comparten equipo» los exige dentro de un mismo equipo.
- Formato es un desplegable «Todos» más los formatos de partidos públicos existentes. Prisma `groupBy` obtiene los valores únicos en PostgreSQL sin cargar el historial para deduplicarlo en la aplicación.
- Canchas y jugadores disponibles provienen de partidos públicos; no se muestran jugadores ocultos como sugerencias.
- La UI espera 180 ms para agrupar cambios, conserva el listado durante la carga, cancela peticiones obsoletas y permite reintentar errores. Limpiar restaura el listado inicial.
- Se conserva la autorización de `includeHidden=1`: únicamente ADMIN/SUPERADMIN pueden incluir ocultos.

El GET existente mantiene su respuesta completa por defecto. Parámetros opcionales: `dateFrom`, `dateTo`, `format`, `venueId`, `playerIds` separados por coma y `sameTeam=1`. Fechas imposibles, rangos invertidos o IDs inválidos devuelven 400 en vez de ignorar filtros.

La UI solicita `view=cards` para obtener únicamente los datos de tarjetas, evitando transferir historiales de participantes y campos innecesarios. No hay cambios de esquema ni migraciones.

## Navegación

Se eliminó la salida completa de la página antes de resolver la ruta. La navegación comienza al soltar el gesto y el contenido actual permanece visible mientras llega el destino. La entrada nueva usa un desplazamiento breve; encabezado y pestañas quedan fijos.

Se precargan rutas vecinas en producción y la ruta hacia la que se arrastra por intención, respetando ahorro de datos. No se mantiene una caché propia de datos: se utiliza el mecanismo de Next.js. En desarrollo Next desactiva prefetch y compila pantallas al abrirlas; para evaluar la navegación se ofrece `npm run preview:visual` después de compilar.

Si una navegación no resuelve, un límite de 10 segundos recupera el gesto para poder reintentar. Las pestañas y enlaces permanecen disponibles durante la espera.

## Login en celular

La configuración local usa `NEXTAUTH_URL=http://localhost:3000`. En el teléfono localhost identifica al teléfono; además, Google no permite callbacks HTTP sobre una IP LAN. Hace falta un dominio HTTPS de pruebas, configurar `NEXTAUTH_URL` con ese dominio y autorizar exactamente `https://DOMINIO/api/auth/callback/google` en el cliente OAuth de Google. No se modificaron credenciales, callbacks ni variables de producción.

Referencias: [validación de callbacks de Google](https://developers.google.com/identity/protocols/oauth2/web-server#redirect-uri-validation), [prefetch en Next.js 14](https://nextjs.org/docs/14/app/building-your-application/routing/linking-and-navigating#prefetching).

## Verificación

- 70 pruebas en 10 archivos y TypeScript aprobados.
- Pruebas de lecturas contra la base de pruebas validada: seis combinaciones de participantes/equipos, fechas+formato+cancha combinados, rechazo 400 y protección de ocultos.
- Navegador: desplegable coincide con formatos registrados, filtrado real, limpieza y anchos 340/390/768/1440 px.
- Navegación retrasada artificialmente: a los 600 ms el contenido anterior continúa visible, sin desplazamiento, y luego se abre el destino.
- Revisión independiente detectó y permitió corregir la recuperación del gesto ante fallo asíncrono.
- Compilación aprobada y vista local optimizada en ejecución con la base de pruebas validada. Se comprobó una solicitud RSC de precarga de Jugadores antes del gesto; el cambio Inicio → Jugadores con esa precarga resuelta tomó 46 ms en una medición de Chrome local. Es un caso con caché caliente, no una estimación de latencia de Vercel ni de dispositivos físicos. Evidencia: `.local-artifacts/match-filters-live/optimized-verification.json`.
- Evidencia local: `.local-artifacts/match-filters-live/verification.json` y capturas. Solo se realizaron lecturas existentes/nuevas de filtrado; no se escribieron datos ni se accedió a producción.
