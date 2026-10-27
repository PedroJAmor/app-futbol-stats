# Desarrollo de Fútbol Amigos

Plan aprobado el 24 de octubre de 2026. Este documento registra alcance y decisiones; no sustituye las aprobaciones visuales del usuario.

## Estado y límites de autorización

| Hito | Estado |
| --- | --- |
| Plan de desarrollo | Aprobado explícitamente |
| Preparación y bloque visual 1: estructura general | Implementado y verificado; ver [entrega del bloque 1](visual-block-1.md) |
| Aprobación visual del bloque 1 | Aprobada por el usuario al cerrar esta ronda de revisión |
| Bloques visuales 2–7 | Cerrados por aprobación global del usuario |
| Aprobación estética global | Aprobada explícitamente: «todo lo visual está ok» |
| Fase 2: desarrollo funcional | Implementación y verificaciones automatizadas realizadas; pendiente revisión manual y OAuth real desde celular. Ver [entrega funcional](functional-phase.md) |

Durante la fase visual se trabajó sobre presentación e interacción, con autorización puntual para conectar los filtros reales de Partidos. La aprobación estética global posterior habilita ahora la fase funcional completa del plan. Se mantienen el uso exclusivo de pruebas y las restricciones de datos y arquitectura. No introducir accesos alternativos a las APIs para simular roles.

## Referencias y preservación

- Referencia funcional auditada: `main` local, commit `1d988b9`.
- Base de trabajo existente: `rebuild-v2`, commit `a2e1657`, más cambios locales pendientes de revisión.
- [Figma: WEB FUTBOL AMIGOS](https://www.figma.com/design/Oe2H6ouF71lJZLEm1hdNTG/WEB---FUTBOL-AMIGOS?node-id=0-1).
- Copia recuperable previa a este trabajo: `.local-backups/before-visual-block-1-2026-10-24T03-11-20-172Z/`, con `workspace.tar.gz`, `working-tree.patch`, `manifest.json` y listado de archivos. Excluye archivos ignorados, credenciales, dependencias, `.git` y compilados. No publicar la copia.
- Verificación inicial: 32 pruebas en 9 archivos y TypeScript aprobados; no certifica flujos completos ni paridad visual.

La presentación de los cambios locales previos queda cubierta por la aprobación visual global. Su comportamiento se comprobará durante la fase funcional. Clasificación de referencia:

| Categoría | Cambios previos |
| --- | --- |
| Presentación | Poppins local, iconos, colores, CSS responsive, encabezado compartido, tarjetas compactas, disposición de inicio, fichas y directorios |
| Interacción y estados | Gestos de navegación, foco y cierre del menú de cuenta, filtros plegables, estados de carga/error/reintento del foro y estados vacíos |
| Soporte de verificación | Dependencia jsdom, configuración de Vitest y pruebas de gestos |

Conservar los cambios recuperables, contrastarlos con Figma y adoptar o ajustar cada parte dentro de su bloque. No eliminar avances ni reproducir defectos de `main` para conseguir paridad.

## Decisiones acordadas

- Mantener Next.js App Router, React, TypeScript, Prisma/PostgreSQL, NextAuth con Google y Cloudinary.
- Un grupo de amigos; consulta pública sin login. Foro anónimo, sin asociar publicaciones a cuentas.
- Google opcional para perfil e inicio personalizado; administración identificada y protegida por roles.
- Cinco secciones: Inicio, Partidos, Jugadores, Estadísticas y Foro. Conservar gestos sin interferir con tablas, formularios ni scroll.
- Inicio con ranking de porcentaje de victorias; tabla de puntos completa en Estadísticas.
- Umbral del ranking: `ceil(máximo PJ individual / 5)`. Puntos: victoria 4, empate 2, derrota 1.
- Inactivos mantienen ficha y estadísticas: no aparecen en sugerencias rápidas de partidos, pero sí al buscarlos expresamente.
- Borrar significa ocultar, no eliminar físicamente. Si un jugador tiene participaciones, bloquear su borrado y explicar el motivo. No fusionar ni reparar automáticamente registros; cualquier reparación manual de datos es una tarea separada.
- Buscar partidos con filtros combinables de rango de fechas, formato, cancha y varios jugadores. Deben participar todos los seleccionados; «Comparten equipo» exige además que todos hayan jugado en el mismo equipo. Actualizado por pedido del usuario del 24/10/2026.
- Pulir el formulario actual de partidos; no reemplazarlo por un asistente de pasos.
- Prioridad móvil y revisión por bloques. Completar vistas faltantes de Figma y desktop mediante propuestas coherentes con su estética.
- Revisión local y desde celular en la misma Wi-Fi, acompañada de capturas. Validar Google con callback de desarrollo en localhost.
- Fuera de alcance: goles, inscripción a futuros partidos, equipos equilibrados, PWA, fusión de jugadores, reparación manual de datos y despliegues.

## Matriz de paridad funcional

La columna de aceptación describe el destino acordado; su implementación funcional pertenece a la fase 2.

| Área | `main` y estado de V2 | Destino y aceptación |
| --- | --- | --- |
| Estadísticas | V2 conserva PJ, V/E/D, puntos 4/2/1, %V/%D, filtros, mínimo de partidos y ordenación | Verificar cálculos conocidos; fechas de Argentina y exclusión de partidos ocultos |
| Inicio | `main` mostraba puntos y %V; V2 muestra %V con nuevo umbral proporcional | Mantener %V y umbral V2; puntos accesibles en Estadísticas |
| Comparación | Conserva grupos, participación cruzada e individuales; faltan Pts individuales y %D grupal en UI | Recuperar esas columnas; verificar enfrentamiento de dos jugadores y grupos de 2+ |
| Directorio de jugadores | V2 añade búsqueda por nombre/apodo sin distinguir acentos y fotos con vista previa | Conservar búsqueda y presentación; no perder información por nombres largos o ausencia de foto |
| Actividad de jugadores | `main` tenía control de actividad; V2 conserva `isActive` en API pero carece de control UI | Administrar actividad; búsqueda explícita encuentra inactivos y permite seleccionarlos |
| Borrado de jugadores | V2 separa actividad y ocultamiento; rechaza ocultamiento si existen participaciones | Acción UI con confirmación y bloqueo consistente en servidor; conservar historial |
| Ficha e historial | V2 conserva métricas y resultados y añade forma; faltan marcas MVP de `main` | Recuperar MVP y conservar historial y forma |
| Crear/editar partido | V2 mejora buscadores por equipo, frecuentes, canchas y validación; persiste equipos correctamente | Preservar esas mejoras, pulir selección/cambio de equipo y estados; no copiar el PUT incompleto de `main` |
| Datos de partido | Clima existe en estado/API/detalle pero perdió control editable; formato V2 admite enteros positivos | Recuperar clima; mantener equipos de tamaño variable y MVP participante |
| Buscar partidos | Conectado en V2 por autorización posterior del usuario | Filtros combinables con varios jugadores y equipo compartido, limpieza, carga/error/sin resultados; respuesta anterior del API conservada |
| Borrado de partidos | `main` eliminaba físicamente; V2 tiene API de ocultar/restaurar pero faltan acciones UI | Borrado lógico con confirmación; ocultos excluidos de consulta y estadísticas públicas |
| Detalle y tarjetas | V2 reduce información en algunas tarjetas y omite marcas MVP | Mostrar cancha y resultado, recuperar MVP y conectar navegación anterior/siguiente |
| Cuentas | `main` usaba credenciales/JWT; V2 usa Google, sesiones DB y USER/ADMIN/SUPERADMIN | Mantener V2; comprobar vinculación cuenta-jugador y permisos, sin reconstruir login anterior |
| Foro | Nuevo en V2: publicaciones/respuestas anónimas, menciones y moderación | Conservar y verificar anonimato, menciones válidas y acciones por rol |

No se prevé migración de esquema. Presentar cualquier necesidad nueva antes de ejecutarla. El roadmap del README de `main` no equivale a funcionalidades implementadas.

### Ajustes solicitados durante la revisión visual

La solicitud del 24/10/2026 autoriza ajustes puntuales de presentación en varios bloques: fecha como título de las tarjetas de partidos, cancha y formato debajo, tarjeta de fecha/resultado en detalle según Figma, slide que acompaña el dedo, eliminación del texto explicativo de Home y corrección de ancho de la comparación individual. Ver [entrega de ajustes](visual-feedback.md).

El diseño de filtros se revisó inicialmente aislado en `/revision/partidos`, con datos ficticios. Por pedido explícito posterior se conectó al listado real de `/partidos`, con un desplegable de formatos existentes y consultas SQL validadas. Posteriormente el usuario confirmó que toda la fase visual está aprobada, habilitando los pendientes funcionales restantes.

Detalles y verificaciones de esa autorización puntual: [filtros conectados y navegación](match-filters-live.md).

## Entregas visuales y aceptación

1. **Estructura general:** colores, tipografía, espacios, tarjetas, encabezados, menú de cuenta y cinco secciones. Requiere aprobación de base antes de extenderla.
2. **Inicio:** invitado/cuenta vinculada, últimos resultados, tarjetas y ranking %V.
3. **Jugadores:** directorio, ficha, historial, MVP, nombres largos y estados sin foto/partidos.
4. **Partidos:** listado, detalle, equipos, datos, diseño de filtros y acciones administrativas.
5. **Estadísticas:** tabla completa, filtros, comparación y adaptación al ancho de escritorio.
6. **Foro, cuenta y administración:** propuestas para vistas faltantes, formularios y estados.
7. **Revisión integral:** responsive, consistencia y aprobación estética global.

En cada bloque: comparar referencia y render real; presentar decisiones visuales faltantes; reutilizar componentes; entregar capturas y versión local; incorporar ajustes; registrar la versión aprobada. Una modificación sustancial de algo aprobado requiere nueva revisión.

Validar a 340, 360, 390 y 430 px, tablet a 768 px y escritorio a 1280 y 1440 px. Sin solapamientos, contenido tapado por barras fijas ni scroll horizontal de página; las tablas pueden desplazarse dentro de su contenedor. Tacto y teclado deben funcionar. Las barras del sistema dibujadas en Figma son contexto del dispositivo, no elementos de la web.

## Datos, agentes y verificaciones

- Usar exclusivamente la base de pruebas confirmada. Antes de arrancar o probar con datos, verificar host esperado, etiqueta y credenciales; detenerse ante discrepancias. No registrar credenciales en documentación o capturas.
- No consultar, escribir, migrar ni exportar producción. No resetear pruebas ni ejecutar migraciones históricas. Identificar datos de prueba y limpiar solo registros creados para ese propósito.
- Coordinación central para alcance, dependencias e integración. Hasta tres subagentes simultáneos con áreas separadas: implementación del bloque autorizado, revisión y testing; seguridad en fase 2 según corresponda.
- No editar simultáneamente archivos compartidos. Los agentes no pueden saltarse aprobaciones ni ampliar alcance.
- Mantener pruebas y TypeScript; añadir verificaciones relevantes de interacción, cálculos, filtros, actividad, borrado, permisos y errores. Verificar compilación y recorridos de navegador antes de cerrar cada entrega.
- Prioridad Chrome en Android y Safari en iOS; comprobación adicional de escritorio. No declarar validación en dispositivos reales cuando solo se haya usado emulación.

### Registro de aprobación

| Fecha | Entrega | Resultado |
| --- | --- | --- |
| 2026-10-24 | Plan completo | Aprobado por el usuario; autoriza preparación y comienzo exclusivo de fase visual |
| 2026-10-24 | Bloque visual 1 y ajustes revisados | El usuario indicó «podemos dar esto por cerrado» y luego aclaró que el cierre abarca toda la fase visual |
| 2026-10-24 | Estética global | Aprobación explícita: «digo que todo lo visual está ok». Fase visual cerrada y fase funcional habilitada |
