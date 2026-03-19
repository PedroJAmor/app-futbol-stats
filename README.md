# ⚽ Fútbol Amigos — Stats Tracker

Aplicación web fullstack para registrar y analizar estadísticas de partidos de fútbol amateur. Desarrollada para uso real con un grupo de 60+ jugadores, con datos históricos desde octubre 2025.

🔗 **[Ver app en producción](https://app-futbol-stats.vercel.app)**

---

## Motivación

El grupo usa WhatsApp para coordinar partidos y llevaba el registro de resultados de forma manual. El objetivo fue reemplazar eso con una herramienta propia que centralice la información, permita explorar estadísticas avanzadas y escale fácilmente con nuevas funcionalidades.

---

## Stack

| Capa | Tecnología | Decisión |
|---|---|---|
| Frontend + Backend | Next.js 14 (App Router) | Un solo proyecto, API routes integradas, deploy trivial en Vercel |
| Base de datos | PostgreSQL (Neon) | Datos relacionales con esquema bien definido, serverless y gratuito |
| ORM | Prisma | Type-safety en las queries, migraciones declarativas |
| Auth | NextAuth.js | Sesión JWT con credenciales, preparado para roles futuros |
| Imágenes | Cloudinary | Upload directo desde el browser, transformaciones automáticas por URL |
| Hosting | Vercel | Deploy automático en cada push, sin configuración de servidor |

---

## Modelo de datos

El desafío principal del schema fue modelar partidos donde la cantidad de jugadores por equipo es variable (un F7 puede tener 8 jugadores en un equipo por rotaciones).

```
Player
  └── MatchPlayerStat (N)
        └── MatchTeam (resultado: WIN/LOSS/DRAW)
              └── Match (formato, fecha, cancha, clima...)
```

La tabla intermedia `MatchPlayerStat` desacopla jugadores de equipos: una fila por jugador por equipo por partido, sin restricción de cantidad. Esto también facilita agregar estadísticas individuales (goles, asistencias) en el futuro sin cambiar el schema.

---

## Funcionalidades

### Estadísticas individuales
- Sistema de puntos propio: Victoria 4pts · Empate 2pts · Derrota 1pt (premia la participación)
- Filtros por formato (F5/F7/F11) y rango de fechas, aplicados en la query a la DB
- Tabla ordenable por cualquier columna con toggle ascendente/descendente
- Los porcentajes responden al filtro activo: el %V de un jugador en F7 es distinto al %V general

### Comparación de jugadores
- Selección de 2 o más jugadores para analizar su rendimiento jugando juntos
- Calcula partidos compartidos, V/E/D y %V del grupo como unidad
- Participación cruzada: qué porcentaje de los partidos de cada jugador los jugó con el grupo seleccionado
- Permite validar hipótesis del tipo "cuando X juega con Y siempre pierde"

### Panel de admin
- Carga de jugadores con foto (upload a Cloudinary)
- Carga de partidos: selección de jugadores por equipo con UI que previene asignar el mismo jugador a los dos equipos
- Resultado inteligente: al marcar ganador a un equipo, el otro se actualiza automáticamente

### Importación de datos
- Script de migración para importar datos desde la app anterior (JSON) a la nueva DB
- Mapeo de IDs string → IDs numéricos con manejo de errores por registro

---

## Arquitectura

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Home: últimos partidos + tablas resumen
│   ├── jugadores/          # Lista y ficha individual con historial
│   ├── partidos/           # Lista y ficha con equipos clickeables
│   ├── estadisticas/       # Tabla avanzada + comparador (client component)
│   ├── admin/              # Panel de carga protegido por sesión
│   └── api/                # REST API: jugadores, partidos, stats, upload
├── lib/
│   ├── stats.ts            # Lógica de estadísticas desacoplada de la UI
│   ├── auth.ts             # Configuración NextAuth
│   └── prisma.ts           # Singleton del cliente Prisma
└── components/
    ├── Navbar.tsx
    └── SessionProvider.tsx
```

Las páginas públicas son Server Components (renderizan en el servidor con datos frescos). Solo la página de estadísticas avanzadas es un Client Component, porque los filtros y el comparador requieren interactividad sin recargar la página.

---

## Decisiones técnicas destacadas

**¿Por qué Next.js en lugar de React + Express separados?**
Un solo proyecto simplifica el deploy y elimina la fricción de mantener dos repositorios, dos configuraciones y dos dominios. Las API routes de Next.js cubren perfectamente las necesidades de esta app.

**¿Por qué PostgreSQL y no MongoDB?**
Los datos tienen relaciones bien definidas y las consultas más importantes son joins (jugador → partidos → estadísticas filtradas). SQL es la herramienta correcta para eso. MongoDB hubiera complicado queries como "estadísticas de un jugador solo en F7 entre dos fechas".

**¿Por qué soft delete en jugadores?**
Un jugador se marca como inactivo en lugar de borrarse, para preservar el historial de partidos. Borrar un jugador invalidaría todas sus estadísticas históricas.

**Estadísticas calculadas en el servidor**
La lógica de puntos, porcentajes y comparación de grupos vive en `src/lib/stats.ts`, completamente desacoplada de la UI. Esto facilita testearla y reutilizarla tanto en las páginas (Server Components) como en las API routes.

---

## Roadmap

- [ ] Goles por jugador (campos ya en el schema, en null)
- [ ] Sistema de anotación: crear un partido con cupo y que los jugadores se anoten
- [ ] Generador de equipos parejos basado en estadísticas
- [ ] PWA para instalación como app en el celular
- [ ] Comentarios por partido
- [ ] Racha actual y head-to-head entre jugadores

---

## Setup local

```bash
# 1. Clonar e instalar
git clone https://github.com/PedroJAmor/app-futbol-stats.git
cd app-futbol-stats
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Completar con credenciales de Neon, Cloudinary y NextAuth

# 3. Crear tablas y usuario admin
npm run db:push
npm run db:seed

# 4. Correr
npm run dev
```

Ver `.env.example` para las instrucciones de cada variable.
