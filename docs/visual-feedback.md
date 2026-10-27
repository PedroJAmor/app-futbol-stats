# Ajustes de revisión visual — 24/10/2026

Estado: fase visual completa aprobada y cerrada por el usuario el 24/10/2026. Tras «podemos dar esto por cerrado», aclaró expresamente «todo lo visual está ok». La fase funcional está habilitada.

## Cambios

- Las tarjetas de la lista identifican el partido por fecha y hora, con día de semana en español: «Sábado 24/10/2026 15:00». Se usa la zona horaria de Buenos Aires también para calcular el día de semana.
- Debajo de la fecha se muestran cancha y formato, por ejemplo «Rebote · F7». Por pedido posterior se centró esa información y se retiró el resultado de las tarjetas del listado; el detalle y las tarjetas compactas de Inicio conservan el resultado.
- El detalle usa una tarjeta con cabecera lima para la fecha y franja clara para «Ganó Claro» o «Empate». Referencias Figma: `2234:2516` y `2234:2519`, capas separadas del frame principal `2234:2428`.
- Se eliminó de Inicio el texto explicativo del ranking; su regla de cálculo sigue vigente.
- La tabla de estadísticas individuales del comparador tiene su propio layout y deja de reservar ancho de nombre en la columna PJ. Todos sus valores caben desde 340 px.
- El contenido de la página acompaña el dedo durante el swipe, con encabezado y barra de navegación fijos. Hay retorno ante gesto corto o cancelado, resistencia en los extremos y recuperación si una navegación falla o demora. Se respeta movimiento reducido.

## Filtros: propuesta visual

Propuesta inicial: `/revision/partidos`, solo en desarrollo y con datos ficticios. Posteriormente el usuario autorizó conectar los filtros al listado real y cambiar formato por un desplegable con valores de la base: ver [entrega funcional de filtros](match-filters-live.md).

Semántica acordada, conectada posteriormente por autorización expresa del usuario:

- Sin jugadores seleccionados, no restringir por participantes.
- Con uno o más, exigir que **todos** hayan participado en el partido; no alcanza con que coincida cualquiera.
- Con «Comparten equipo», exigir además que todos pertenezcan al mismo equipo de ese partido. El control se habilita desde dos jugadores seleccionados.
- Combinar estas condiciones con fecha, formato y cancha por intersección.
- Casos a verificar en fase 2: seleccionados en equipos opuestos, seleccionados en el mismo equipo, un seleccionado ausente, tres o más seleccionados y limpieza completa de filtros.

## Evidencia

- 42 pruebas aprobadas en 9 archivos, incluidas fechas con cambio de día respecto de UTC y 17 escenarios de swipe.
- TypeScript y revisión independiente de código sin errores bloqueantes.
- Navegador Chrome: tarjetas y detalle; tabla comparativa a 340, 360, 390, 430, 768 y 1440 px sin recortes; controles del prototipo de filtros, checkbox y limpieza.
- Eventos táctiles nativos mediante Chrome: desplazamiento de −140 px para un gesto de −140 px, navegación entre secciones, retorno de gesto corto, estructura fija y movimiento reducido.
- Capturas e informes en `.local-artifacts/visual-feedback/`. Se usó emulación; queda la revisión del gesto en el celular físico del usuario.
- Respaldo previo a estos ajustes: `.local-backups/before-visual-feedback-2026-10-24T14-05-39-392Z/`.

Las verificaciones de datos utilizaron únicamente las lecturas existentes contra la base de pruebas validada. No se modificaron APIs, esquema, reglas de negocio ni datos.

## Ajuste posterior de orden y legibilidad

- Orden de navegación, gestos y precarga: Inicio → Partidos → Jugadores → Estadísticas → Foro.
- Tabla de Inicio: texto de 15 px y encabezados de al menos 11 px, filas más altas y nombres largos en varias líneas. Se reservó espacio para participaciones de tres dígitos y porcentajes de 100%.
- Detalle del partido: jugadores de 15 px en móvil y 16 px en escritorio, encabezados de equipo mayores, fecha de 16–18 px, resultado de 15 px y datos de 14 px. Las filas pueden crecer con los nombres.
- En el listado, cancha y formato quedan centrados, sin ganador visible ni incluido en el nombre accesible de la tarjeta.
- Pruebas de navegación actualizadas al orden solicitado; 71 pruebas y TypeScript aprobados, compilación local optimizada aprobada.

### Afinado posterior a las capturas del celular

- El selector de comparación limita su columna a `minmax(0, 1fr)` y mantiene 20 px laterales para encabezado, botón Cerrar, buscador y lista, incluyendo safe areas.
- Los nombres del ranking de Inicio se reducen a 13 px y peso 500 en móvil; los números mantienen 15 px. En escritorio los nombres usan 14 px.
- Los botones anterior/siguiente vuelven a 11 px, con texto sin salto de línea y área táctil mínima conservada.

### Nombres cortos y filas completas como enlaces

- Inicio usa `lineupPlayerName`, igual que Estadísticas: apodo cuando existe, nombre corto y desambiguación con inicial del apellido cuando corresponde. Conserva el nombre completo en el tooltip y evita forzar mayúsculas.
- Un único enlace nativo por fila cubre número, nombre, estadísticas y espacio de la fila, preservando la semántica de tabla y una sola parada de teclado.
- Aplicado al ranking de Inicio, ranking de Estadísticas, participación cruzada, head-to-head y estadísticas individuales; las tarjetas de jugadores en alineaciones y el chip MVP también son enlaces completos.
- La tarjeta del jugador vinculado de Perfil es clickeable cuando existe una ficha pública; si el jugador está oculto se conserva como texto para evitar un enlace a 404. La tarjeta de cuenta y sus controles conservan su comportamiento.
- Verificación: 71 pruebas, TypeScript y compilación aprobados. Chrome comprobó nombres iguales entre Inicio y Estadísticas, hit areas en cuatro anchos (340–1440 px), clic sobre estadísticas/espacios, Enter, apertura en nueva pestaña, encabezados ordenables y scroll táctil de tablas.
- Evidencia local: `.local-artifacts/player-links/verification.json` y capturas. No se agregaron consultas ni cambios de datos.
