# Bloque visual 1 — estructura general

Estado: implementado, verificado y aprobado por el usuario el 24/10/2026. Posteriormente confirmó la aprobación de toda la fase visual; la fase funcional está habilitada.

## Cambios de esta entrega

- Mantiene Poppins, la paleta de Figma, el fondo oscuro, el encabezado lima y cinco pestañas en el orden existente.
- Encabezado de 72 px en móvil y 80 px en escritorio, radios compartidos, títulos más cercanos a Figma y controles de al menos 44 px.
- Pestañas «Inicio» y «Foro» en español; se mantienen las rutas y el comportamiento de los gestos.
- Menú de cuenta como diálogo nativo: fondo inerte, scroll bloqueado, ciclo de foco con Tab/Shift+Tab, cierre con Escape o toque exterior y retorno al botón de apertura.
- Presentación del menú para invitado, usuario y administradores, usando la sesión existente.
- Enlace «Ir al contenido» para navegación por teclado.
- Lanzador `npm run dev:visual` que ejecuta el guard existente antes de arrancar y transmite el entorno validado a Next.

Al entregar este primer bloque quedaron pendientes las demás vistas, posteriormente aprobadas de forma global por el usuario. Esta entrega inicial no modificó sus consultas, reglas de negocio, esquema ni APIs, y no creó usuarios ni registros de prueba.

## Cómo revisar

1. Ejecutar `npm run dev:visual` y abrir `http://localhost:3000`.
2. Desde el celular en la misma Wi-Fi, usar la IP local de la computadora y el puerto 3000. La IP puede cambiar.
3. Revisar encabezado, navegación y menú de cuenta en las distintas secciones.
4. Dar aprobación explícita del bloque o indicar modificaciones. El contenido propio de Inicio se revisará en el bloque 2.

El comparativo local está en `.local-artifacts/visual-block-1/review.html`; allí están las capturas anteriores, posteriores y los estados por rol. Los artefactos y el backup están excluidos de Git.

## Verificación

| Control | Resultado |
| --- | --- |
| Pruebas existentes | 32 aprobadas en 9 archivos |
| TypeScript | Sin errores |
| Compilación de Next.js | Aprobada con configuración de pruebas validada; no implica despliegue |
| Anchos 340, 360, 390, 430, 768, 1280 y 1440 px | Sin overflow horizontal de página; cinco pestañas visibles y controles de al menos 44 px |
| Menú de cuenta | Foco contenido, Escape, cierre exterior, retorno al botón y restauración de scroll aprobados |
| Navegación | Pestaña activa, regreso desde ficha y enlace para saltar al contenido aprobados |
| Presentación de roles USER, ADMIN y SUPERADMIN | Aprobada con respuestas de sesión simuladas exclusivamente en el navegador; incluye nombres largos y teclado |
| Revisión independiente | Sin regresiones bloqueantes en el código de este bloque |

La prueba en navegador encontró y permitió corregir un escape de foco hacia la barra de Chrome desde los extremos del diálogo. La evidencia final está en `.local-artifacts/visual-block-1/verification.json`.

Se utilizó Chrome local con tamaños y entrada táctil emulados. No se declara validación en dispositivos físicos ni Safari/iOS. Los roles simulados prueban presentación, no permisos del servidor ni Google OAuth.

Observación preexistente: el navegador solicita `/favicon.ico`, que responde 404. No hay logo final definido en Figma; no se inventó uno en este bloque. Los avisos de tooling sobre Browserslist y Vite no bloquearon la compilación ni las pruebas.

## Próximo paso autorizado

Continuar con la fase funcional del plan. La aclaración explícita del usuario «todo lo visual está ok» cierra la fase visual completa; conservar la estética aprobada al completar comportamientos y verificaciones.
