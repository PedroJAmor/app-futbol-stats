# Seguridad y límites de uso — 27/10/2026

Bloque autorizado después de compartir la demo de pruebas. Publicado en Preview rebuild-v2, commit b086f17, con autorización explícita para actualizar la demo compartida. No se modificó la configuración de Vercel. La verificación integrada posterior utilizó exclusivamente la base de pruebas confirmada, con registros temporales identificados y limpieza acotada. Sin acceso a producción, migraciones ni modificaciones del esquema.

## Controles implementados

- Todas las escrituras propias comprueban el origen exacto (esquema, host y puerto), rechazan `cross-site`/`same-site` y admiten Referer como fallback cuando falta Origin. No aceptan escrituras sin evidencia de origen. LAN conserva su origen HTTP y puerto; Vercel usa HTTPS y el Host de destino. No se confía en X-Forwarded-Host. Las rutas de NextAuth conservan sus propios controles OAuth/CSRF.
- Las escrituras JSON verifican el tipo de contenido y cuentan bytes reales mientras leen el stream, aunque Content-Length falte o mienta. Máximos: 8 KiB foro, 32 KiB formularios y 7 MiB para el JSON de fotos (se conserva el límite existente de imagen de 5 MiB). Las operaciones administrativas autentican antes de leer el cuerpo.
- Se exige correo verificado por Google antes de aceptar un nuevo inicio de sesión. Se conservan las sesiones actuales y las comprobaciones de rol en servidor.
- Cabeceras contra MIME sniffing, inclusión de la app en iframes y objetos embebidos, restricción de base URI, política de referrer y permisos de cámara/micrófono/geolocalización. No se introduce aún una política estricta de scripts: requiere comprobar nonces y compatibilidad con Next y Google.
- Filtros y comparación: hasta 100 IDs por consulta y URLs públicas de hasta 8192 caracteres, rechazadas antes de consultas de datos costosas.
- Foro: hasta 20 niveles de respuestas; el render de datos anteriores también acota profundidad y ciclos, conservando como raíces los posts que no puede anidar de forma segura. No modifica publicaciones existentes en DB.

## Rate limit

Se reutiliza la tabla `AnonymousRateLimit` de PostgreSQL. No requiere Redis, servicios pagos ni migración. Incrementos atómicos y recuperación de una colisión de creación entre instancias; errores del almacén o configuración inválida cierran la operación con 503, sin detalles internos.

| Operación | Valor predeterminado | Agrupación |
| --- | --- | --- |
| Publicar o responder en foro | 5 / 10 minutos | Red + User-Agent, como la huella anterior |
| Techo agregado del foro | 50 / 10 minutos | Red, independientemente del navegador |
| GET públicos de API | 120 / minuto | Red; cuota compartida entre endpoints |
| Subir foto | 10 / 10 minutos | Cuenta administrativa |

Valores ajustables en `.env.example`. El secreto existente `ANONYMOUS_RATE_LIMIT_SECRET` ahora protege también las cuotas de lecturas/fotos; debe estar presente en runtime. Variables nuevas opcionales, con defaults. Ninguna configuración se cambió en Vercel.

En Vercel se usa exclusivamente `x-vercel-forwarded-for`, con validación de IP, normalización de IPv4 mapeado y agrupación IPv6 /64. No se acepta una lista de IP ni fallback a headers arbitrarios. Fuera de Vercel se usa un bucket local compartido: habilitar otro proxy requiere diseñar explícitamente su confianza. La verificación remota confirmó lecturas y una escritura legítima detrás del proxy de Vercel, sin fallos de validación del header.

El HMAC incluye propósito y ventana temporal. No se almacenan IP, User-Agent o ID de cuenta en texto plano, ni se relacionan los contadores con publicaciones. No equivale a anonimato frente a logs del proveedor. Amigos con la misma red y User-Agent pueden compartir la cuota de 5; se conserva esta característica del límite anterior y el agregado de 50 evita evadir el techo cambiando navegador.

Se devuelve 429 con `Retry-After`, mensaje con segundos y `Cache-Control: no-store`. Los mensajes de error existentes muestran esa espera sin perder el formulario. Son ventanas fijas: permiten ráfagas entre dos ventanas contiguas; no son una ventana móvil ni protección DDoS.

La limpieza es oportunista, esperada antes de la comprobación, una vez por minuto por instancia y de hasta 100 contadores vencidos. Revalida ID y vencimiento al borrar. No toca datos de negocio. Sin tráfico pueden permanecer registros vencidos; no es una garantía de eliminación en un plazo exacto. Los GET limitados se declaran dinámicos para no cachear cuotas ni ejecutarlas al compilar.

## Dependencias

Tras la aprobación explícita del usuario, se actualizaron Next.js a 16.4.3, React/React DOM a 19.3.1, Zod a 4.6.7 y Vitest/Vite a 5.0.5/8.3.5. NextAuth queda en 4.24.15 y Prisma permanece en 5.22.0. Se actualizaron tipos y dependencias compatibles, incluido tsx. Node admitido: 22.12+ de la rama 22 o rama 24; Vercel ya usa 24.

Se adaptaron los parámetros asíncronos de rutas/páginas, los errores de Zod y las pruebas de interacción de React. Vitest usa configuración ESM y Oxc. La compilación optimizada con Turbopack pasó. No se utilizó `--force` ni `--legacy-peer-deps`.

La auditoría final de npm informa **0 vulnerabilidades conocidas**; no equivale a ausencia de riesgos ni sustituye la revisión del código.

## Autorización en servidor

`getCurrentUser` obtiene la sesión de NextAuth y consulta el usuario y su rol actual en DB. No confía en el rol enviado por el navegador. Las APIs administrativas exigen el rol en servidor y `/admin` incorpora además un layout de servidor que redirige a `/perfil` si falta autorización. Modificar roles exige SUPERADMIN.

La comprobación integrada verificó rechazo de sesiones falsificadas, invitados y usuarios comunes; los cambios de rol tienen efecto con la misma sesión. Los datos públicos acordados siguen siendo públicos.

## Verificación y pendientes

- Base anterior: 201 pruebas aprobadas.
- 254 pruebas unitarias/de interacción en 36 archivos, TypeScript y compilación optimizada. La compilación usa una URL ficticia de localhost:1 y guard de Preview; no hubo consultas a ninguna base real.
- Pruebas nuevas: las once mutaciones rechazan origen externo antes de consultar; cuerpos grandes, Content-Length falso, LAN/HTTPS, cuota por red, IPv6, separación por propósito/cuenta, 429 con espera, 503 ante fallos, limpieza acotada y carrera P2002.
- 23 comprobaciones HTTP sobre el servidor compilado: once mutaciones externas rechazadas, origen legítimo admitido sin escribir mediante honeypot, JSON y tamaños, permisos de upload, fallos cerrados con Retry-After y ruta CSRF de NextAuth operativa. Servidor temporal en loopback, cerrado al finalizar, sin intentos de consulta a DB. Evidencia: `.local-artifacts/security/http-verification.json`.
- Verificación integrada: 49 comprobaciones HTTP con PostgreSQL de pruebas y sesiones reales de NextAuth. Incluye permisos, cambios de rol inmediatos, datos ocultos, creación/edición, origen externo y ocho publicaciones concurrentes (cinco admitidas y tres rechazadas con 429). Todos los registros temporales se limpiaron. Script reproducible: `scripts/verify-security-staging.ts`; exige host, rama y etiqueta confirmados. Evidencia: `.local-artifacts/security-upgrade/staging-verification.json`.
- Cadena de 5000 respuestas y ciclos serializan sin desbordar ni perder posts; consultas de IDs excesivos se rechazan; Google exige el claim booleano verificado.
- Revisión independiente del diff: sin hallazgos bloqueantes; condicionada a comprobar headers reales de Vercel y una escritura legítima desde celular en Preview.
- Las cuotas de API no cubren las consultas SSR de Inicio/Jugadores ni reemplazan las defensas del proveedor. Medición de latencias, paginación, caché, monitoreo, backups y política estricta de scripts siguen siendo bloques posteriores.
- El proveedor puede imponer un límite de cuerpo menor al límite local de fotos base64. Revisar compresión/subida en el bloque de optimización; no se cambió aquí el contrato de fotos.

Evidencia local ignorada por Git: `.local-artifacts/security/` (snapshot previo, auditorías npm y comprobaciones). Ningún secreto ni URL con token de acceso se guarda en este documento.

Fuentes consultadas: [headers de Vercel](https://vercel.com/docs/headers/request-headers), [CSRF de OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [claim Google en NextAuth](https://next-auth.js.org/providers/google), [parche OAuth de NextAuth](https://github.com/nextauthjs/next-auth/security/advisories/GHSA-x445-f3h2-j279), [soporte de Next.js](https://nextjs.org/support-policy).

Navegador local sobre la compilación actualizada: sesión existente, Inicio, navegación a Estadísticas, selección consecutiva de dos jugadores, comparación y filtro F5 (15 de 55 partidos) comprobados sin errores de consola. No se modificaron datos de negocio en este recorrido.

## Publicación verificada

Vercel confirmó Ready para `b086f17` en Preview (despliegue `42KGzrfcxPQnZvzqEMzbU5xXyLnG`). El enlace compartido existente permanece válido. No se cambió main ni producción.

24 comprobaciones remotas aprobadas: cinco páginas y cuatro APIs públicas, cabeceras de seguridad, rechazo de acceso administrativo sin sesión, redirección de /admin, rechazo de origen externo y publicación legítima. La publicación se identificó por marcador único, se confirmó en la base de staging autorizada y se eliminó exclusivamente ese registro. Evidencia ignorada: `.local-artifacts/security-upgrade/preview-verification.json`.

Chrome confirmó sesión existente, Inicio, navegación a Partidos y detalle sin errores de consola. Después de la publicación, el usuario confirmó que el inicio de sesión funciona correctamente. La revisión automática usó Chrome y sesiones existentes; no sustituye las comprobaciones manuales del usuario. Los avisos de build fueron configuración cache-dir de npm y aprobación futura de scripts de instalación, sin error de compilación.
