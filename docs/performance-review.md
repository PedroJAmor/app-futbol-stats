# Optimización de consultas — 27/10/2026

## Alcance

Se conserva el diseño, el contrato de las APIs, los cálculos, los controles de rol en servidor y las cuotas. No se incorpora caché entre usuarios, servicios nuevos, índices, cambios de esquema ni migraciones. Se utilizó exclusivamente la base de pruebas confirmada, con guard de rama/host/etiqueta y comprobación explícita del hostname; las mediciones de este bloque fueron de solo lectura de datos de negocio.

## Cambios

- Estadísticas comparte la primera carga sin filtros entre tabla y catálogo de comparación: una solicitud en lugar de dos. Si se cambia un filtro antes de terminar esa carga, se obtiene el catálogo completo aparte. Filtrar no restringe los jugadores del selector; se conservan cancelación de respuestas obsoletas y reintentos.
- Inicio, Jugadores, Perfil y las APIs de estadísticas/comparación seleccionan solamente los campos que utilizan los cálculos mediante `statParticipationSelect`.
- La ficha calcula sus totales a partir del historial que ya necesita, eliminando la segunda consulta del mismo historial. Las relaciones seleccionan solo los campos necesarios y mantienen la exclusión de partidos ocultos.
- Inicio inicia las consultas públicas en paralelo con la autenticación. El historial personal espera a la identidad validada por servidor. Las tarjetas usan la proyección compacta existente de Partidos.

La selección de campos sigue la [documentación de Prisma](https://www.prisma.io/docs/orm/v6/prisma-client/queries/select-fields).

## Evidencia

Comparación de ambas consultas en staging, sobre 723 participaciones visibles:

- Resultado serializado antes: 528.148 bytes; después: 205.191 bytes (61,1 % menos).
- Igualdad exacta de estadísticas, ranking de Inicio y comparación comprobada con ambos resultados.
- Este tamaño corresponde al objeto de resultados serializado por la herramienta de medición; no mide bytes del protocolo de PostgreSQL, consumo de memoria del proceso ni tráfico facturado.
- Cuatro muestras alternadas por consulta; latencias variables. No se atribuye una mejora fija de tiempos a la proyección.

Páginas locales compiladas: tres solicitudes por ruta, sin sesión, servidor reiniciado entre versiones. Primeras cargas afectadas por arranque y conexión. Tiempos posteriores observados:

| Ruta | Antes, ms | Después, ms |
| --- | --- | --- |
| Inicio | 804, 236 | 467, 224 |
| Jugadores | 253, 278 | 233, 219 |
| Ficha /jugadores/1 | 424, 421 | 201, 214 |
| API de estadísticas | 920, 328 | 569, 299 |

No es una prueba de carga ni garantiza esos tiempos en teléfonos o Vercel. Las respuestas conservaron el tamaño externo, porque la información presentada es la misma. Evidencia local ignorada: `.local-artifacts/performance/query-comparison.json`, `pages-before.json`, `pages-after.json`.

256 pruebas en 36 archivos, TypeScript, compilación optimizada y `git diff --check` aprobados. Dos pruebas nuevas comprueban una sola solicitud inicial y conservación del catálogo completo al filtrar. Navegador local: sesión existente, Inicio, ficha con estadísticas/historial, selección consecutiva y comparación con resultados, sin errores de consola.

## Próximos bloques

Medir navegación y arranque en Vercel con tráfico real; revisar región de ejecución frente a la DB de São Paulo antes de decidir un cambio de configuración. Evaluar paginación y caché solo si el volumen lo justifica, definiendo invalidación y frescura de los datos. No se cambian esos comportamientos en este bloque.


## Revisión del Preview y móvil — 28/10/2026

Mediciones HTTP desde esta conexión, con el enlace compartido existente y sin sesión de la aplicación. Tres solicitudes secuenciales por ruta. Inicio, Partidos, Jugadores, Estadísticas, Canchas y Corner Cancha 2 respondieron 200. Tiempos hasta primeras cabeceras: 72–335 ms; tiempos de cuerpo completo 74–339 ms. APIs de estadísticas, arcos, equipos mensuales de mayo y tarjetas de partidos: 75–389 ms por respuesta completa. No se observaron demoras de varios segundos en estas muestras; no equivalen a LCP/INP, tiempo total de hidratación, dispositivo físico, red celular, prueba de carga ni garantía de arranque frío. No se atribuye una mejora nueva al cambio visual mensual.

Navegador local sobre build optimizado: navegación Partidos → Estadísticas, botón Ir a comparar visible y destino dentro de pantalla; ancho global de 340 px sin desbordamiento. Foto vertical de Corner 2 cargada 720×1280 y mostrada con contain a 300 px de ancho. Archivo mensual a 340/390 y escritorio a 1440 sin desbordamiento; las dos listas conservan igual ancho. Sin errores de consola en el recorrido observado.

Evidencia local ignorada: `.local-artifacts/friends-feedback/review-preview.json`, `review-api-latency.json`, `meses-historial.jpg`. Las mediciones no requieren cambios de región, caché, consultas ni base de datos. Quedan como trabajo futuro opcional las métricas de campo en teléfonos/red celular, monitoreo y evaluación de paginación según crecimiento.
