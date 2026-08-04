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
