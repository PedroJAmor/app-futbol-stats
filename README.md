# Fútbol Amigos V2

Reconstrucción controlada de la app de estadísticas del grupo. Mantiene Next.js App Router, PostgreSQL, Prisma, NextAuth v4 con Google y Cloudinary.

## Setup local

```bash
npm install
cp .env.example .env
npm run db:guard
npm run dev
```

Google OAuth puede quedar sin credenciales durante el desarrollo: la app compila y Perfil informa que falta configuración.

## Revisión visual local

```bash
npm run dev:visual
```

Este comando valida la rama, el host y la etiqueta de staging antes de iniciar Next.js, y transmite al servidor el mismo entorno validado. Escucha en el puerto 3000 para revisar desde `localhost` y desde un celular en la misma Wi-Fi. No ejecuta migraciones ni carga datos de prueba.

Para revisar la versión optimizada sin compilación de pantallas al navegar, ejecutar `npm run build` con el entorno de pruebas validado y luego `npm run preview:visual`. La precarga de secciones de Next.js se habilita en este modo; sigue siendo una vista local, sin despliegue y conectada exclusivamente a pruebas.

Google OAuth usa `NEXTAUTH_URL`. La dirección LAN sirve para revisar la app, pero Google no admite callbacks HTTP con IP privada; para probar login desde el celular se necesita un dominio HTTPS de pruebas y autorizar su ruta `/api/auth/callback/google` en Google. No cambiar las credenciales o bases de producción para hacerlo.

El alcance y las aprobaciones pendientes están en [docs/development-plan.md](docs/development-plan.md). La entrega del primer bloque está documentada en [docs/visual-block-1.md](docs/visual-block-1.md).

## Migraciones seguras

La base V1 fue creada históricamente con `prisma db push`. V2 usa migraciones reales y bloquea escrituras accidentales mediante branch Git, host esperado y etiqueta de staging.

```bash
# Solo contra Neon rebuild-v2/staging:
npm run db:guard
npm run db:export:v1
npm run db:preflight:v1
npm run db:migrate:baseline
npm run db:migrate:staging
npm run db:validate:v2
```

`db:migrate:baseline` se ejecuta una vez para registrar el baseline V1 sin recrear tablas. `db:migrate:staging` transforma los datos en sitio, preservando IDs. No usar `prisma db push`. Para desarrollar migraciones nuevas con `prisma migrate dev`, configurar `SHADOW_DATABASE_URL` contra una base descartable.

El wrapper protegido de staging desactiva el advisory lock de Prisma porque el endpoint Neon pooler puede retenerlo entre conexiones. Esa excepción existe únicamente dentro del wrapper que valida branch, host y etiqueta de staging.

## Dominio V2

- `User` representa una cuenta Google y puede vincularse manualmente a un único `Player`.
- `Player` conserva historial, nombres legacy y estado activo separado del ocultamiento visual.
- `Match.format` acepta cualquier entero positivo y no depende de la cantidad de participantes.
- Partidos, jugadores con cero participaciones y publicaciones del foro se ocultan mediante soft delete.
- El foro es anónimo. El rate limit guarda solamente HMAC temporales de IP y User-Agent.
- Las menciones `@[match:ID:TOKEN]` se validan y se vinculan relacionalmente a partidos reales.

## Variables

Ver `.env.example`. Las variables críticas para protección de staging son `EXPECTED_DATABASE_HOST` y `DATABASE_SAFETY_TAG=rebuild-v2/staging`.
