# Plan de mejoras del grupo — 28/10/2026

Estado: aprobado explícitamente por el usuario para comenzar por bloques, incluida la migración aditiva, la preparación acotada de datos de pruebas y la publicación del Preview. Implementación, verificación y publicación del Preview completadas. La revisión inicial fue de solo lectura; los cambios posteriores se registran al final de este documento.

## Decisiones de producto

- Inicio: tres últimos partidos en una única fila fija de tarjetas de igual ancho, sin carrusel. Mantener fecha legible y la información acordada.
- Categorías independientes del formato y la fecha: Liga, Intersemanal y Especial. Todos por defecto; selección múltiple por checkbox en los filtros, combinada por unión entre categorías e intersección con los demás filtros. Tarjeta: `Predio · Formato · Tipo`.
- Precio en el detalle: `Precio (por persona): $84.000 ($6.000)`. Dividir por participantes realmente registrados. Si no se puede dividir, no inventar un importe; conservar valores nulos y redondear solo la presentación.
- Jugadores: botón «Ver equipos del mes» hacia una página propia. Mejor y peor equipo, siete jugadores cada uno, en dos columnas y con enlaces a las fichas. Una selección total por mes, sin filtro de categoría. Último mes cerrado arriba y lista fija de meses anteriores desplegables debajo, con apertura independiente.
- Mejor: V−D descendente, luego PJ descendente. Peor: V−D ascendente, luego PJ ascendente. Ambas listas muestran V−D, incluidos negativos. Empates aportan cero. Solo quienes participaron ese mes, sin otro mínimo. Ante igualdad total, identificador estable en orden inverso entre ambas listas: el peor es el inverso del orden del mejor y no repiten jugadores si hay al menos 14 candidatos. Si un filtro deja menos candidatos, no duplicar ni inventar jugadores para completar lugares.
- Solo meses cerrados según Argentina. Al 28 de octubre, octubre no puede consultarse; se habilita el 1 de noviembre a las 00:00 de Argentina. El mes inicial es el calendario anterior. En pruebas no hay septiembre: presentar vacío y permitir consultar meses anteriores con partidos. No alterar fechas para rellenarlo.
- Historial mensual calculado desde los partidos vigentes; corregir un partido anterior actualiza su mes. Excluir ocultos. Sin snapshots, tareas programadas ni cambios en los puntos 4/2/1 existentes.

## Módulo de predios y canchas

Acceso público desde Partidos → Canchas, conservando las cinco secciones principales.

- Predio: nombre obligatorio; dirección, enlace a mapa y foto opcionales. Alta y edición por ADMIN/SUPERADMIN con comprobación de rol en servidor.
- Cancha física: pertenece a un predio; nombre, formato opcional, foto y par de arcos opcional. Crear un predio no exige crear canchas ni arcos.
- Creación rápida desde el editor de partido: conservar el alta solo con nombre; completar información después desde el módulo.
- Partido: predio, cancha física y arcos opcionales. Las nuevas opciones no eliminan los requisitos actuales de fecha, formato, equipos y participantes.
- Al elegir cancha, ofrecer sus arcos. Registrar el que defendió un equipo y completar el contrario cuando exista el par configurado. Nunca cambian de lado durante un encuentro.
- Validar en servidor que cancha y arcos correspondan al predio, que ambos equipos no defiendan el mismo arco. El formato del partido es independiente del formato físico de la cancha.
- Desde el partido, enlazar a la cancha asignada o al predio si falta la cancha. Permitir editar la asignación del encuentro desde el partido; la configuración del catálogo se edita desde el módulo.
- Reutilizar Cloudinary y sus controles de imágenes; una foto de portada por predio y por cancha en esta entrega. Dirección y botón de mapa, sin contratar geocodificación ni servicio nuevo. No inventar direcciones o fotos.

## Historial y filtros

- Ficha del predio: todos sus partidos públicos, incluidas las canchas todavía sin especificar.
- Ficha de cancha física: solo sus partidos asignados.
- Historial cronológico con fecha, formato, tipo, resultado y enlace al detalle, reutilizando presentación existente.
- Partidos: renombrar el filtro actual `Cancha` a `Predio`; agregar cancha física dependiente del predio. Conservar fechas, formato, jugadores y compartir equipo.
- Cambiar predio limpia una cancha incompatible. Desde una ficha, `Ver partidos` abre Partidos con filtro aplicado y visible; se puede limpiar.
- Recuentos del predio incluyen los encuentros sin cancha, sin adjudicarlos a una cancha concreta.

## Estadísticas por arco

Apartado separado dentro de Estadísticas, agrupado por predio y cancha física; reutilizable en sus fichas. Vista acumulada sin controles de filtros, según el ajuste posterior aprobado.

Ejemplo sobre diez partidos de Rebote F7: Estacionamiento 50 %, Empate 10 %, Pared 40 % representa cinco victorias del equipo que defendió Estacionamiento, un empate y cuatro victorias del que defendió Pared.

- Cada encuentro aporta una sola vez al denominador, independientemente del número de participantes.
- Usar solamente encuentros públicos con cancha y lados completos y válidos. Mostrar cantidad analizada y cantidad pendiente de asignación.
- Sin datos: estado vacío, sin porcentajes inventados. Redondeo de presentación consistente y recuentos visibles para interpretar la muestra.
- Identificadores estables: renombrar un arco no fragmenta sus estadísticas.

## Catálogo confirmado para pruebas

| Predio | Cancha | Formato | Arcos |
| --- | --- | --- | --- |
| Rebote | F7 | 7 | Estacionamiento / Pared |
| Rebote | F5 Cancha 1 | 5 | Estacionamiento / Pared |
| Rebote | F5 Cancha 2 | 5 | Cancha 1 / Calle |
| La Avenida | F7 | 7 | Buffet / Pared |
| La Avenida | F5 | 5 | Buffet / Pared |
| Corner | Cancha 1 | 5 | Buffet / Pared |
| Corner | Cancha 2 | 5 | Buffet / Pared |
| La Estación | F7 | 7 | Entrada / Arco 2 |
| La Bosch | Betharram | 5 | Buffet / Calle |
| La Bosch | Santos Vega | 5 | Buffet / Calle |

`Arco 2` de La Estación es el nombre provisional aportado por el usuario y será editable. Conservar también La Redonda, ya presente en pruebas, sin inventar sus canchas o arcos.

### Asignaciones de demostración autorizadas

El usuario autorizó elegir aleatoriamente según el catálogo para poder probar:

- Preparar una semilla reproducible y un manifiesto con valores anteriores/nuevos antes de escribir.
- Asignar solo campos nuevos de cancha/arco aún vacíos, dentro del predio existente y con formato compatible. No cambiar fechas, resultados, equipos, participantes ni precios.
- Si falta predio, no hay formato compatible o no hay catálogo, dejar pendiente y reportar.
- Marcar cada asignación sintética como de prueba, visible en el detalle y en las estadísticas que la incluyen. No presentarla como un dato real histórico. Al registrar una asignación real, retirar la marca correspondiente.
- No sobrescribir asignaciones reales, permitir reejecución sin duplicar y conservar reversión acotada únicamente a los cambios de esa ejecución.
- Predios nuevos sin partidos pueden quedar con historial vacío; no crear partidos ficticios para rellenarlos.

### Corrección puntual aprobada

Partido #46, Corner, 08/04/2026 20:00 Argentina: figuraba F7 con cinco participantes por equipo. El usuario confirmó que Corner solo tiene F5 y aprobó corregir exclusivamente su formato a F5 en pruebas.

### Clasificación histórica aprobada

Regla inicial aprobada con el plan: F7 en sábado → Liga; F11 → Especial; restantes → Intersemanal. Para nuevas cargas, sugerencia editable, con la elección explícita en el formulario. Las búsquedas sin selección de categorías conservan todos los partidos.

## Etapas, dependencias y aceptación

| Orden | Bloque | Dependencias y aceptación |
| --- | --- | --- |
| 1 | Tarjetas y precio | Fila fija a 340–430 px, sin desbordamiento global. Fecha legible; costo por participante correcto, nulos y redondeo contemplados. |
| 2 | Modelo, migración y catálogo | Migración aditiva nueva, sin ejecutar históricas ni resetear. Ampliar Venue existente; canchas/arcos relacionados y campos opcionales de partido, categoría y procedencia de demostración. Preservar IDs e historial. Guard de staging antes de toda operación. |
| 3 | Módulo y editor | Altas solo con nombre, edición opcional, roles backend, carga segura de fotos, validación de pertenencia y pares de arcos. Módulo público, enlaces y estados vacíos/errores. |
| 4 | Categorías e historiales | Multi selección combinable, tarjetas con tipo, filtros Predio/Cancha y enlaces con filtro aplicado. Historial correcto por nivel. Depende de 2–3. |
| 5 | Equipos mensuales | Solo meses cerrados en backend e interfaz; reglas acordadas, desempates, filtros e historial. No repetir con 14 o más candidatos; explicar si un filtro deja menos de 14. |
| 6 | Estadísticas por arco | Denominador por partido, tres resultados, exclusión de ocultos/incompletos y marca de datos de prueba. Depende de catálogo/asignaciones. |
| 7 | Integración y demo | Pruebas relevantes, TypeScript, compilación y recorridos de navegador; comprobar permisos directos, nuevos contratos, responsive y consultas acotadas. Publicar solo Preview y verificar el mismo enlace compartido. |

## Coordinación

La coordinación mantiene contratos, migración, validación del entorno e integración. Cuando convenga, hasta tres subagentes con límites de archivos: módulo de canchas/editor; cálculos y filtros; revisión/testing/seguridad. Los componentes y migraciones compartidos tienen un único responsable; no se amplía el alcance ni se usa producción.

## Límites de esta entrega

Sin consultas o cambios en producción, reseteos, ejecuciones de migraciones históricas ni borrado masivo. Sin fusión de predios, goles, inscripciones, generador de equipos, posiciones, galería múltiple, API de mapas paga ni publicación en main. Una aplicación de este esquema a producción requeriría su propia preparación y autorización.

## Registro de implementación y verificación

- Aplicada únicamente `0003_match_categories_courts` en la base de pruebas confirmada, dentro de una transacción y con registro estándar de checksum. El script de aplicación es de solo lectura por defecto y no ejecuta migraciones históricas.
- Catálogo: seis predios en total, diez canchas físicas y veinte arcos configurados. Se mantuvo La Redonda sin inventar canchas. No se agregaron direcciones ni fotos ficticias.
- Clasificados 55 partidos públicos: 24 Liga, 28 Intersemanal y 3 Especiales. Corregido #46 a F5 con autorización explícita.
- Asignados cancha y arcos de demostración a 17 partidos compatibles; 38 quedan pendientes por falta de predio o catálogo compatible. El detalle y las estadísticas identifican las asignaciones aleatorias. La edición conserva esa marca hasta cambiar la asignación o confirmarla expresamente como real.
- Semilla idempotente: una nueva ejecución de solo lectura propone cero clasificaciones, cero asignaciones y ninguna corrección de formato. El manifiesto recuperable anterior/posterior quedó en `.local-artifacts/friends-feedback/`, fuera de Git y sin credenciales. La reversión es acotada, serializable y no reemplaza partidos modificados desde esa ejecución; conserva el catálogo.
- Implementados tarjetas de Inicio, precio por participante, categorías, catálogo administrable, historiales por nivel, filtros y enlaces, equipos mensuales y estadísticas por arco. Los historiales de predios/canchas también muestran el resultado; la presentación del listado general conserva lo aprobado previamente.
- Pasaron 296 pruebas en 44 archivos, TypeScript y compilación optimizada. La compilación usa una URL local ficticia, sin acceso a datos.
- Verificación HTTP con sesiones de base de datos reales: 49 comprobaciones de seguridad existentes y 83 de mejoras. Incluyen roles falsificados, origen, CRUD mínimo, relaciones, formatos, arcos opuestos, edición compatible, marca de demostración, filtros combinados, meses cerrados, ocultamiento y precio. Todos los fixtures de cada ejecución se identificaron y limpiaron de forma acotada.
- Revisión estática independiente de permisos, privacidad, cálculos y compatibilidad sin hallazgos bloqueantes. Recorridos de navegador local con prioridad móvil; esto no sustituye una comprobación manual posterior en Android/iOS reales.

### Herramientas de esta entrega

- `prisma/migration-scripts/apply-feedback-migration.ts`: inspección por defecto; `--apply` aplica exclusivamente la migración nueva si el estado y el entorno coinciden.
- `prisma/migration-scripts/seed-feedback-staging.ts`: vista previa por defecto; `--apply` prepara los datos autorizados. `--rollback <manifiesto> --apply` revierte solo los cambios todavía intactos de ese manifiesto.
- `scripts/verify-feedback-staging.ts`: requiere la aplicación compilada y el entorno de pruebas cargado; inicia su propio servidor temporal y limpia sus propios registros.
- Los tres scripts validan la rama, etiqueta y host literal de pruebas antes de conectarse. No se incluyen scripts de despliegue ni acceso a producción.

### Publicación verificada

El código de la entrega quedó en `84da2f4` de `rebuild-v2`, publicado en el Preview `Bbv21YcHhMzTBUeE1jpt5bAjJRWk`, estado Ready. El alias compartido existente apunta a esa versión; no se cambiaron permisos, variables ni enlaces de acceso. Las 14 comprobaciones HTTP posteriores al despliegue pasaron y confirmaron ejecución en São Paulo (`gru1`): catálogo, categorías y filtros, arcos, equipos de mayo sin repetidos, bloqueo del mes actual, denegación del acceso administrativo sin sesión y páginas públicas. El navegador no registró errores de consola en el recorrido publicado.

Se comprobó ausencia de desbordamiento horizontal en el listado a 340, 360, 390, 430, 768, 1280 y 1440 px, y en las estadísticas de cancha a 340, 768 y 1440 px. Las capturas de Inicio y arcos de la versión publicada, y los resultados completos de pruebas, quedaron en `.local-artifacts/friends-feedback/`. Se restableció el tamaño habitual del navegador al finalizar. Para revisar equipos mensuales con los datos actuales, elegir mayo de 2026: septiembre no contiene partidos y octubre se habilitará el 1 de noviembre a las 00:00 de Argentina.

### Ampliación de ubicaciones autorizada por el usuario (28/10/2026)

El usuario confirmó tres canchas de La Redonda: F11 (Buffet/Calle), F8 y F5 (ambas Buffet/Estudiantes), y que los tres F11 históricos se jugaron en La Redonda F11. Autorizó completar predios vacíos: sábados F7 en Rebote; días de semana aleatorios entre Rebote, Corner y La Bosch, conservando compatibilidad de formato. Los F7 entre semana solo tienen cancha compatible en Rebote dentro de esos tres predios.

`complete-location-staging.ts` preparó y aplicó 36 asignaciones en staging mediante una transacción serializable y comprobación optimista de cada registro. Creó tres canchas y seis arcos en La Redonda. Rebote F7 ya existía y se conservó sin duplicar. Manifiesto con valores anteriores/posteriores en `.local-artifacts/friends-feedback/complete-locations-2026-10-28T18-14-17-006Z.json`. Una comparación de la información ajena a ubicación antes/después confirmó que no cambiaron fechas, formatos, precios, resultados ni participantes. Los arcos aleatorios permanecen marcados como demostración. TypeScript pasó; una nueva vista previa propone cero modificaciones.

Verificado en las APIs públicas de la demo: Rebote 35, Corner 7, La Bosch 5, La Avenida 3, La Redonda 3 y La Estación 0. Total: 53 partidos con ubicación completa. Quedan pendientes #1 (viernes F6) y #62 (domingo F7), fuera de las reglas confirmadas; se pidió al usuario su predio. No se cambiaron el código de aplicación ni la configuración de despliegue: los datos actualizados ya están visibles en el Preview existente.

El usuario indicó luego «pongamos que fue rebote f7» para ambos pendientes. Se asignaron #1 y #62 a Rebote F7 y se corrigió el formato de #1 de F6 a F7. Arcos de demostración, con marca conservada y manifiesto anterior/posterior en `.local-artifacts/friends-feedback/last-locations-1793211762376.json`. Transacción serializable con control de concurrencia y comparación de campos ajenos a ubicación/formato: fechas, precios, resultados, participantes y demás datos se conservaron. Verificación final: cero partidos públicos sin predio/cancha, 55 de 55 asignados; Rebote queda con 37.

### Ajustes de presentación solicitados después de la revisión

Por pedido explícito del usuario, se retiraron de la interfaz pública las leyendas de ubicación/asignaciones de prueba; se conserva la procedencia en los datos. El apartado de arcos muestra el acumulado sin controles de filtros. Las tarjetas de cancha muestran solo su nombre (y foto opcional), sin repetir formato ni enumerar arcos; estos siguen disponibles en la ficha. A 600 px o menos los resultados por arco usan filas con nombre, porcentaje y recuento; a 480 px o menos los nombres de los arcos se apilan en la ficha. Estacionamiento se verificó en una línea a 340 px, sin desbordamiento horizontal.

El detalle ahora etiqueta Clima y Temperatura. Aclaración del usuario: el formato del encuentro es independiente de la cancha física (por ejemplo F6 en Rebote F7). Se retiró la igualdad obligatoria en selector y servidor; se mantienen las validaciones de pertenencia predio/cancha y de arcos opuestos. No se modificó nuevamente #1: el usuario indicó que hará su corrección. Pasaron las 296 pruebas, compilación con TypeScript y 84 comprobaciones HTTP con fixtures acotados y limpieza verificada.

### Equipos mensuales en página propia

El usuario pidió acceso desde Jugadores mediante «Ver equipos del mes». Se trasladó la vista a `/jugadores/equipos-del-mes`, con encabezado propio y regreso mediante la flecha a Jugadores. Mejor y peor equipo se presentan en dos columnas de igual ancho también a 340 px; los PJ aparecen debajo del nombre para conservar legibilidad. Ambas listas muestran V−D, por lo que el peor equipo tiene puntajes negativos cuando acumula más derrotas. Se mantienen el orden de selección, los desempates, los meses cerrados y el total de tipos de partidos. Pruebas de cálculo actualizadas y verificación móvil: 296 pruebas y compilación con TypeScript aprobadas, sin desbordamiento horizontal a 340 px.

### Archivo mensual y revisión de cierre — 28/10/2026

Se reemplazó el selector por el último mes calendario cerrado y tarjetas completas enlazadas a los meses anteriores (`?mes=AAAA-MM`); cada tarjeta abre las dos listas del mes elegido. Se conserva el vacío de septiembre y la exclusión del mes actual, sin modificar fechas. Los enlaces permiten compartir y volver mediante el navegador. La prueba de cancelación conserva la protección frente a respuestas obsoletas y se comprobó el archivo con el último mes vacío.

Verificación de este bloque: 297 pruebas unitarias/interacción, compilación y TypeScript aprobados. Se ejecutaron nuevamente 84 comprobaciones integradas de canchas/partidos y 49 de seguridad, exclusivamente en staging con registros marcados por UUID y limpieza confirmada. Incluyen creación/edición, formatos independientes, pertenencia de cancha/arcos, filtros combinados, historiales, exclusión de ocultos, roles y sesiones falsificadas, cambios de rol inmediatos y rate limit.

Revisión visual local a 340/390 px y escritorio a 1440 px: dos columnas mensuales sin desbordamiento, navegación al archivo, botón de comparación visible y foto vertical completa. Las mediciones de páginas y APIs del Preview y la revisión de credenciales se detallan en los documentos de rendimiento y seguridad. Las sugerencias del grupo acordadas están implementadas; no se agrega un nuevo bloque funcional pendiente implícito.

### Meses desplegables sin navegación — 28/10/2026

La navegación entre tarjetas sustituía el mes principal y filtraba el archivo a meses más antiguos, por lo que desaparecían opciones al avanzar. El usuario pidió revisar esa interacción y propuso desplegables como los filtros. Se reemplazaron los enlaces del archivo por desplegables independientes: la lista permanece fija, varios meses pueden estar abiertos y cada consulta se realiza solo en la primera apertura. Al cerrar/reabrir se reutiliza el resultado durante la visita; un error y su reintento quedan limitados al mes correspondiente. La flecha del encabezado sigue volviendo a Jugadores porque abrir meses ya no cambia de página ni agrega pasos al historial. Los enlaces `?mes=` anteriores se conservan abriendo el mes correspondiente dentro del archivo sin sustituir el último mes cerrado.

298 pruebas y compilación con TypeScript aprobadas. Pruebas nuevas de apertura simultánea, cierre/reapertura sin nuevas consultas, reintento independiente, compatibilidad de enlaces anteriores y cancelación al abandonar la página. Navegador móvil: mayo y abril abiertos a la vez, diez meses presentes, URL estable y sin desbordamiento a 390 px. No hubo cambios de permisos, consultas de negocio, persistencia ni esquema.
