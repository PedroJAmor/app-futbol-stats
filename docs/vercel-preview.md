# Preview de rebuild-v2

Proyecto Vercel: `app-futbol-stats`, equipo `pedros-projects-9704c0bd`.

- Producción sigue la rama `main`; no se modifica como parte de estas pruebas.
- Preview sigue `rebuild-v2` y su URL estable es `https://app-futbol-stats-git-rebuild-v2-pedros-projects-9704c0bd.vercel.app`.
- Las variables específicas de esa rama tienen prioridad sobre las generales. No eliminar variables generales sin revisar antes sus consumidores de producción.

## Variables específicas

El usuario completa directamente en Vercel los secretos de pruebas: `DATABASE_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SUPERADMIN_EMAILS`, `ANONYMOUS_RATE_LIMIT_SECRET`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Los valores no se guardan en Git.

`NEXTAUTH_URL` usa la URL estable anterior. `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` identifica el entorno de fotos configurado. `EXPECTED_DATABASE_HOST` coincide con el host de la base de pruebas validada y `DATABASE_SAFETY_TAG` es `rebuild-v2/staging`; ambos están configurados solo para Preview de esta rama.

Antes de construir Prisma, cada build o función de Vercel Preview comprueba protocolo PostgreSQL, host esperado y etiqueta de pruebas. Una configuración incompleta o discrepante detiene la aplicación antes de consultar datos. El arranque local conserva su guard existente de rama/host/etiqueta.

## Google

Agregar en el cliente OAuth existente este URI de redirección autorizado, conservando los actuales:

`https://app-futbol-stats-git-rebuild-v2-pedros-projects-9704c0bd.vercel.app/api/auth/callback/google`

El usuario confirmó haberlo agregado. El login real desde el celular debe verificarse después del despliegue. Si Preview exige autenticación de Vercel, iniciar esa sesión con la cuenta autorizada; no desactivar la protección implícitamente.

## Publicación y verificación

- `npm run build` genera Prisma y compila Next.js. No ejecuta migraciones ni reseteos.
- Antes de publicar: 201 pruebas en 31 archivos, compilación con `VERCEL_ENV=preview` y entorno de pruebas validado, revisión independiente de secretos/scripts/guard y `git diff --check` aprobados.
- Vercel tiene Node 24 configurado; la compilación remota debe verificarse antes de considerar el despliegue aprobado. No cambiar la configuración global de Node por estas pruebas.
- Comprobar páginas públicas, Google hacia el callback exacto y respuesta de APIs sobre la base de pruebas. No abrir la versión antigua de Preview para pruebas de datos antes de confirmar la nueva compilación con guard.
- No promover a producción, fusionar a `main` ni ejecutar migraciones como parte de esta entrega.
