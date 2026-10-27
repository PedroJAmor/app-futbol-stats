# Fase funcional — entrega del 25/10/2026

La aprobación estética global y la indicación «dale» habilitaron esta fase. Se conserva el diseño aprobado, las rutas y la arquitectura. No se hicieron migraciones, despliegues ni operaciones sobre producción.

## Funcionalidades implementadas

- Jugadores: control de actividad en creación/edición, identificación de inactivos en el directorio y búsqueda explícita de inactivos en el editor de partidos. Los seleccionados se conservan al editar.
- Borrado lógico de jugadores con confirmación. El servidor bloquea cualquier jugador con participaciones, incluso en partidos ocultos; ofrece inactivarlo para conservar historial. La comprobación y la modificación se realizan en una transacción Serializable.
- Partidos: movimiento explícito entre equipos, contadores y selección sin duplicados; conserva MVP al mover y lo limpia al quitar del partido. Campo clima recuperado, validación de fechas reales, hora, identificadores, resultados y MVP participante.
- El guardado verifica dentro de la transacción que los participantes sigan disponibles. Los jugadores inactivos pueden participar; los ocultos no. Respuestas 400/404/409 coherentes y errores internos sin detalles de Prisma.
- Ocultar partidos con confirmación; listado administrativo de ocultos y restauración. Las tarjetas ocultas permiten restaurar sin enlaces al detalle público. Los ocultos no cuentan en estadísticas ni en el contador público de participaciones.
- Filtros combinados por fechas, formato, cancha y varios jugadores. Se retiró el filtro por número a pedido del usuario. «Comparten equipo» exige el mismo equipo para todos. Se conserva la extensión previa de filtros y la respuesta completa de API.
- Comparación: puntos individuales y porcentaje de derrotas del grupo. Indicadores MVP en equipos e historial. Fechas, formatos, mínimos e identificadores de comparación validados; se requieren dos jugadores distintos.
- Cuenta: vinculación administrativa validada; roles modificables solo por SUPERADMIN y bloqueo del último superadministrador con aislamiento Serializable.
- Foro: publicación sin vínculo de cuenta, menciones públicas válidas y proyección explícita sin notas internas de partidos. Contenido moderado reemplazado por un marcador, conservando respuestas visibles. No se permite responder a padres moderados. Se conserva el rate limit con HMAC existente.
- Fotos: validación de MIME, base64, firma del formato y límite de 5 MB, timeout de Cloudinary y errores sin secretos.
- Carga, guardado, comparación, publicación, moderación y administración con recuperación de errores de red, reintentos y protección frente a solicitudes repetidas u obsoletas. Los formularios conservan datos ante errores; los diálogos de edición gestionan foco y bloquean cierre mientras guardan.

## Coordinación y revisión

Tres agentes trabajaron en áreas separadas: ciclo de vida de jugadores y seguridad/cuentas; editor de partidos y revisión independiente; ocultamiento/restauración y paridad de estadísticas. La coordinación integró contratos, validaciones de servidor, pruebas y compilación. La revisión independiente comprobó permisos y transacciones y detectó estados de error y accesibilidad que se corrigieron.

La copia previa a esta fase se conserva en `.local-backups/before-functional-phase-2026-10-24T22-32-39-333Z/workspace.tar.gz`. Los cambios locales previos permanecen en el árbol de trabajo.

## Verificación y límites

- 194 pruebas unitarias y de interacción en 28 archivos, ejecutadas con `DATABASE_URL` vacío. Incluyen ranking proporcional, puntos 4/2/1, grupos, filtros combinados, jugadores inactivos, borrado con historial, roles, uploads simulados y errores de red.
- Compilación optimizada de Next.js, validación de tipos y `git diff --check` aprobados. La compilación se ejecutó solo después del guard del entorno de pruebas; no ejecuta migraciones.
- Prueba integrada reproducible localmente en `.local-artifacts/functional/check.cjs`: guard de rama/host/etiqueta antes de crear fixtures, usuarios y sesiones temporales con NextAuth normal; sin accesos alternativos en las APIs. Limpia únicamente los registros identificados de esa ejecución. Las sesiones no se publican ni se guardan en capturas.
- Verificación integrada final: 67 comprobaciones aprobadas, incluyendo API, roles, anonimato, moderación y Chrome; comparación sin desbordamiento global a 340, 390, 768 y 1440 px. Los registros temporales se limpiaron al finalizar.
- Capturas y comprobaciones de navegador en `.local-artifacts/functional/`. Chrome con emulación móvil no equivale a validación manual en un teléfono real.
- Google OAuth real y una subida real de fotos a Cloudinary no se simulan como aprobados: permisos y uploads se verifican con pruebas de contrato; Google desde el celular requiere un callback de desarrollo HTTPS autorizado. La configuración actual de localhost no habilita ese recorrido desde otro dispositivo.
- Pendiente la revisión del usuario de los flujos administrativos desde su cuenta y la prueba manual en Chrome Android/Safari iOS. No se declara cierre integral de esos criterios hasta verificarlos.

## Ajustes de selección y desplazamiento solicitados después de la entrega

- Se retiró el filtro por número tanto de la interfaz como del procesamiento de filtros.
- La selección múltiple mantiene abiertos el panel de filtros de partidos y el selector de comparación. En estadísticas, el cierre restaura el foco sin saltar al buscador y mantiene visible la acción de comparar.
- Se quitaron las explicaciones debajo de Tabla de posiciones y Comparar jugadores.
- Tras aclarar que el problema era bajar hacia la comparación, se eliminó el scroll vertical interno de la tabla principal. El scroll horizontal de columnas permanece. Se añadió «Ir a comparar» debajo del filtro con respeto por movimiento reducido.
- Verificación actual: 190 pruebas en 29 archivos, TypeScript y compilación aprobados. Chrome móvil emulado comprobó gesto vertical sobre la tabla, selección consecutiva de tres jugadores en ambas vistas y botón de comparación visible sobre la barra inferior al cerrar. Sin escrituras a la base. Evidencia local: `.local-artifacts/stats-selection/verification.json` y captura de comparación.

El selector de comparación ahora muestra dentro del panel los jugadores seleccionados, un contador y acciones para quitarlos sin cerrar. Verificado con las cuatro pruebas de Estadísticas, TypeScript, compilación y Chrome móvil a 340 px. Respecto del scroll, se explicó la alternativa de restaurar la altura limitada con continuidad hacia la página al llegar al borde (`overscroll-behavior-y: auto`); no se restauró aún el scroll vertical interno.

Por aprobación posterior («hagamos eso»), se recuperó la altura compacta de la tabla principal: `min(55vh, 540px)`, con scroll vertical y continuidad nativa hacia la página en ambos bordes (`overscroll-behavior-y: auto`). Se conservan el desplazamiento horizontal y «Ir a comparar». Compilación y verificación táctil con Chrome móvil emulado aprobadas: movimiento interno, continuidad superior/inferior, columnas horizontales y acceso directo a comparación. Evidencia: `.local-artifacts/stats-scroll/verification.json`. Sin escrituras a la base.

## Validación manual del usuario — 26/10/2026

El usuario confirmó creación y edición de partidos (incluidos movimientos de equipos, MVP y persistencia), actividad/inactividad de jugadores, bloqueo de borrado con historial y ocultamiento/restauración de partidos. La subida real de foto falló: el ping de solo lectura de Cloudinary devuelve HTTP 401 `disabled api_key`. No se realizaron subidas de diagnóstico ni cambios en datos. Se requiere habilitar la clave en Cloudinary o configurar credenciales activas en `.env`; la aplicación ahora distingue ese motivo de otros errores externos sin devolver claves, firmas o mensajes sin filtrar. Doce pruebas de upload aprobadas con llamadas externas simuladas. El flujo de fotos permanece pendiente de una subida real correcta.

## Inicio y demo para amigos

Por pedido del usuario, Inicio invita a iniciar sesión solo a visitantes sin cuenta y reutiliza las tarjetas completas de Partidos: día, fecha, hora, cancha y formato. Se conservan la bienvenida y el resumen personal de quienes ya iniciaron sesión. El usuario eligió compartir una demo con la base de pruebas, separada del lanzamiento definitivo. La ampliación del acceso de Vercel se prepara y verifica por separado; los permisos administrativos de la aplicación se conservan.


## Seguridad posterior a la demo — 27/10/2026

Bloque local de protección de origen/cuerpos, cuotas distribuidas en la tabla existente, límites de complejidad del foro/consultas y parches compatibles. Detalles, resultados y pendientes de actualización mayor en [security-review.md](security-review.md). 249 pruebas, TypeScript, compilación y 23 comprobaciones HTTP aprobadas sin bases reales. Esta entrega aún no se publicó en Vercel.

## Actualización aprobada y prueba de permisos — 27/10/2026

Next 16, React 19, Zod 4 y Vitest 5 actualizados con sus adaptaciones. 254 pruebas, TypeScript y compilación aprobados; auditoría npm sin avisos conocidos. Otras 49 comprobaciones integradas verificaron permisos reales, sesiones falsificadas, revocación inmediata de roles y concurrencia del rate limit sobre PostgreSQL de pruebas. Todos los registros de prueba se limpiaron. Sin migraciones ni acceso a producción. Publicación en Preview pendiente; detalles en [security-review.md](security-review.md).
