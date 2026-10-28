# Latencia de la demo — 28/10/2026

## Diagnóstico

Demo medida: rama `rebuild-v2`, commit `e61e85f`. Quince solicitudes secuenciales (tres por ruta), sin sesión de aplicación, utilizando el enlace compartido existente y la base de pruebas protegida por el guard de Preview. Sin escrituras de datos de negocio ni cambios en configuración durante el diagnóstico. Las APIs actualizan sus contadores de rate limit como parte del funcionamiento normal.

Las respuestas dinámicas llevan regiones `gru1::iad1` en `x-vercel-id` y caché `MISS`. Esto indica entrada por São Paulo y ejecución en Washington. La base de pruebas confirmada tiene región `sa-east-1` (São Paulo). La región de compilación no se utilizó para inferir la de ejecución.

| Ruta | Primera muestra (ms) | Muestras posteriores (ms) |
| --- | --- | --- |
| Proveedores de autenticación | 489 | 198, 195 |
| Inicio | 1442 | 877, 797 |
| Ficha /jugadores/1 | 1213 | 668, 1126 |
| API de estadísticas | 2253 | 905, 1332 |
| Comparación 1,4 | 1230 | 763, 1330 |

Tiempos del cliente hasta leer todo el cuerpo de respuesta. No son una prueba de carga ni una medición aislada del tiempo de PostgreSQL. La primera muestra no demuestra un arranque en frío controlado: puede combinar conexión, inicialización de función y activación de base. Tres muestras no permiten prometer un percentil ni una mejora estable.

Evidencia local ignorada: `.local-artifacts/latency/before.json`. No contiene cookies, credenciales ni el enlace con token.

## Cambio aprobado

El usuario aprobó probar São Paulo. Se incorpora en esta rama un `vercel.json` con una región, `gru1`. Requiere redeploy de Preview; no modifica las variables, mueve la DB ni ejecuta migraciones. La configuración global del proyecto no se cambia. Una futura incorporación de este archivo a otra rama trasladaría también esa preferencia de región y debe revisarse al preparar producción.

Comparar con mantener `iad1`: evita el cambio de ubicación, pero conserva las consultas transregionales. Caché requiere además acordar frescura/invalidation y no es necesaria para probar primero la ubicación.

## Verificación prevista

- Vercel debe confirmar Ready para el commit con la configuración.
- Confirmar `gru1` como región efectiva en las respuestas de funciones dinámicas.
- Repetir el mismo conjunto acotado de solicitudes y comparar cada ruta, separando primera muestra y posteriores.
- Comprobar las páginas, las estadísticas/comparación, rechazo de administración sin sesión y una sesión existente en navegador.
- Conservar el enlace compartido y no cambiar main ni producción.
- Si empeora el comportamiento o falla una función, revertir el commit de configuración en rebuild-v2 y verificar nuevamente la versión anterior.

Fuentes: [regiones y configuración de funciones](https://vercel.com/docs/functions/configuring-functions/region), [códigos de regiones](https://vercel.com/docs/regions), [cabecera x-vercel-id](https://vercel.com/docs/headers/request-headers#x-vercel-id).
