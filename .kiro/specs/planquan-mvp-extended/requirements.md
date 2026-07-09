# Requirements Document

## Introduction

Este documento define los requisitos para las funcionalidades pendientes del MVP extendido de PlanQuan, un software de takeoff y estimación para construcción orientado al mercado de USA/Florida. Estas funcionalidades complementan el core ya implementado (autenticación, proyectos, visor PDF 2D, calibración de escala, mediciones y exportación básica) para ofrecer un producto competitivo con capacidades de estimación vinculada a catálogos, reportes visuales, control de calidad, gestión de catálogos por Excel, acciones rápidas de cómputo y mejoras de experiencia en el visor de planos.

## Glossary

- **Sistema**: La aplicación PlanQuan en su conjunto (frontend React + backend Supabase).
- **Visor**: El componente de visualización de planos PDF/imagen con capa SVG interactiva.
- **Catálogo_de_Ítems**: Colección estructurada de ítems de construcción (materiales, mano de obra, equipos) con precios unitarios y unidades de medida.
- **Ítem_de_Catálogo**: Entrada individual dentro del Catálogo_de_Ítems que contiene nombre, categoría, unidad de medida, precio unitario y descripción.
- **Takeoff**: Proceso de extracción de cantidades a partir de mediciones sobre planos de construcción.
- **Medición**: Dato geométrico registrado sobre un plano (lineal, polilínea, área, conteo o anotación) con valor numérico y unidad.
- **Asignación_de_Ítem**: Vinculación entre una Medición y uno o más Ítems_de_Catálogo para calcular cantidades y costos.
- **Reporte**: Documento exportado (PDF) que presenta las mediciones, cantidades e ítems asociados de un proyecto.
- **Miniatura**: Imagen reducida de una página de PDF utilizada para previsualización.
- **Gate_de_Calidad**: Proceso formal de validación que verifica el cumplimiento de reglas antes de aprobar un proyecto.
- **Regla_de_Validación**: Condición verificable que forma parte del Gate_de_Calidad (por ejemplo: todas las páginas calibradas).
- **Acción_Rápida**: Operación de conversión matemática aplicada a una Medición para derivar cantidades útiles (longitud a área, área a cantidad de piezas).
- **Factor_de_Conversión**: Valor numérico utilizado por una Acción_Rápida para transformar un tipo de magnitud en otro.
- **Sidebar**: Panel lateral del Visor que muestra información contextual y controles de navegación.
- **Viewport**: Área visible del plano dentro del Visor.
- **Cursor**: Posición del puntero del ratón dentro del Viewport.
- **Rotación_de_Vista**: Transformación angular aplicada al plano renderizado en el Viewport.
- **Usuario**: Persona autenticada que utiliza PlanQuan para realizar takeoffs y estimaciones.
- **Proyecto**: Entidad principal que agrupa archivos, mediciones y estimaciones de una obra de construcción.

## Requirements

### Requisito 1: Catálogo de Ítems de Construcción

**User Story:** Como estimador, quiero gestionar un catálogo de ítems de construcción con precios y unidades, para poder vincular mediciones a costos de forma estructurada.

#### Criterios de Aceptación

1. THE Sistema SHALL permitir al Usuario crear, editar y eliminar Ítems_de_Catálogo con los campos: nombre, categoría, unidad de medida, precio unitario, descripción y código opcional
2. THE Sistema SHALL organizar los Ítems_de_Catálogo en categorías jerárquicas (materiales, mano de obra, equipos, subcontratos)
3. THE Sistema SHALL validar que cada Ítem_de_Catálogo tenga nombre, unidad de medida y precio unitario como campos obligatorios
4. WHEN el Usuario busca en el Catálogo_de_Ítems, THE Sistema SHALL filtrar ítems por nombre, categoría o código en tiempo real
5. THE Sistema SHALL almacenar los catálogos vinculados al Usuario con aislamiento por Row Level Security
6. IF el Usuario intenta eliminar un Ítem_de_Catálogo que tiene Asignaciones_de_Ítem activas, THEN THE Sistema SHALL mostrar una advertencia y solicitar confirmación

### Requisito 2: Asignación de Ítems a Mediciones (Takeoff con Catálogo)

**User Story:** Como estimador, quiero asociar ítems del catálogo a mis mediciones, para obtener cantidades y costos estimados automáticamente.

#### Criterios de Aceptación

1. WHEN el Usuario selecciona una Medición existente, THE Sistema SHALL permitir asignar uno o más Ítems_de_Catálogo desde el catálogo
2. WHEN se crea una Asignación_de_Ítem, THE Sistema SHALL calcular la cantidad del ítem multiplicando el valor de la Medición por el Factor_de_Conversión definido
3. WHEN se crea una Asignación_de_Ítem, THE Sistema SHALL calcular el costo estimado multiplicando la cantidad resultante por el precio unitario del Ítem_de_Catálogo
4. WHEN el valor de una Medición cambia, THE Sistema SHALL recalcular automáticamente las cantidades y costos de todas las Asignaciones_de_Ítem vinculadas
5. THE Sistema SHALL permitir al Usuario definir un Factor_de_Conversión personalizado al crear la Asignación_de_Ítem (valor por defecto: 1.0)
6. THE Sistema SHALL mostrar un resumen por proyecto con el total de cantidades por ítem y el costo estimado global
7. IF la unidad de la Medición es incompatible con la unidad del Ítem_de_Catálogo asignado, THEN THE Sistema SHALL mostrar una advertencia visual al Usuario

### Requisito 3: Reportes con Imágenes y Miniaturas

**User Story:** Como estimador, quiero que los reportes PDF incluyan capturas visuales de las áreas del plano donde se tomaron mediciones, para proporcionar evidencia visual a los clientes.

#### Criterios de Aceptación

1. WHEN el Usuario exporta un reporte PDF, THE Sistema SHALL incluir una miniatura de la zona del plano asociada a cada Medición
2. THE Sistema SHALL generar las miniaturas recortando el área del plano alrededor de las coordenadas de la Medición con un margen contextual de al menos 20% del área de la medición
3. THE Sistema SHALL renderizar las mediciones y sus etiquetas sobre las miniaturas en el reporte
4. WHEN el reporte contiene más de 50 mediciones, THE Sistema SHALL agrupar las miniaturas por página del plano para optimizar el tamaño del archivo
5. THE Sistema SHALL generar el reporte PDF con un tamaño máximo de 50 MB
6. IF una miniatura no puede generarse por error de renderizado, THEN THE Sistema SHALL incluir un marcador de posición con el texto "Imagen no disponible" y continuar la generación del reporte
7. THE Sistema SHALL incluir en el reporte una tabla resumen con las columnas: medición, valor, unidad, ítem asignado, cantidad, costo unitario y costo total

### Requisito 4: Gate de Calidad

**User Story:** Como jefe de proyecto, quiero un proceso formal de validación antes de marcar un proyecto como "Aprobado", para garantizar que el takeoff cumple estándares mínimos de calidad.

#### Criterios de Aceptación

1. WHEN el Usuario solicita cambiar el estado del Proyecto a "Aprobado", THE Sistema SHALL ejecutar todas las Reglas_de_Validación configuradas
2. THE Sistema SHALL incluir las siguientes Reglas_de_Validación predefinidas: (a) todas las páginas del proyecto tienen calibración de escala, (b) todas las mediciones tienen etiqueta asignada, (c) existe al menos una medición en el proyecto, (d) todas las mediciones de tipo área y lineal tienen valor mayor a cero
3. WHILE el Proyecto no cumple todas las Reglas_de_Validación, THE Sistema SHALL bloquear la transición al estado "Aprobado"
4. WHEN la validación detecta reglas incumplidas, THE Sistema SHALL mostrar un listado detallado indicando la regla fallida, la página y la medición afectada
5. WHEN todas las Reglas_de_Validación se cumplen, THE Sistema SHALL permitir la transición a "Aprobado" y registrar la fecha y el Usuario que aprobó
6. THE Sistema SHALL permitir al Usuario ejecutar el Gate_de_Calidad en modo consulta sin intentar cambiar el estado, para verificar el progreso del proyecto
7. IF el Usuario tiene rol de administrador, THEN THE Sistema SHALL permitir forzar la aprobación con un comentario justificativo, registrando que fue una aprobación forzada

### Requisito 5: Importación y Exportación de Catálogos por Excel

**User Story:** Como estimador, quiero importar y exportar catálogos de ítems mediante archivos Excel/CSV, para reutilizar listas de precios existentes y compartirlas entre proyectos.

#### Criterios de Aceptación

1. WHEN el Usuario selecciona un archivo Excel (.xlsx) o CSV (.csv) para importación, THE Sistema SHALL parsear el archivo y mostrar una previsualización de los datos antes de confirmar
2. THE Sistema SHALL mapear las columnas del archivo a los campos del Ítem_de_Catálogo mediante un paso de configuración de mapeo
3. WHEN el archivo contiene ítems con códigos duplicados respecto al catálogo existente, THE Sistema SHALL permitir al Usuario elegir entre: sobrescribir, omitir o crear como nuevo
4. WHEN la importación se confirma, THE Sistema SHALL procesar el archivo e informar el resultado: ítems creados, actualizados, omitidos y errores
5. IF una fila del archivo tiene datos inválidos (campos obligatorios vacíos, precio no numérico), THEN THE Sistema SHALL marcar la fila como error y continuar procesando las filas válidas
6. WHEN el Usuario solicita exportar el catálogo, THE Sistema SHALL generar un archivo Excel (.xlsx) con todos los Ítems_de_Catálogo incluyendo columnas: código, nombre, categoría, unidad, precio unitario, descripción
7. THE Sistema SHALL soportar archivos de importación de hasta 10,000 filas
8. FOR ALL archivos Excel válidos exportados por el Sistema, importar el archivo exportado SHALL producir un catálogo equivalente al original (propiedad de ida y vuelta)

### Requisito 6: Acciones Rápidas de Cómputo

**User Story:** Como estimador, quiero aplicar conversiones rápidas sobre mediciones (longitud a área, área a cantidad de piezas), para agilizar el cálculo de materiales sin herramientas externas.

#### Criterios de Aceptación

1. WHEN el Usuario selecciona una Medición de tipo lineal, THE Sistema SHALL ofrecer la acción rápida "Longitud × Altura = Área" solicitando el valor de altura
2. WHEN el Usuario selecciona una Medición de tipo área, THE Sistema SHALL ofrecer la acción rápida "Área ÷ Tamaño de pieza = Cantidad" solicitando las dimensiones de la pieza
3. WHEN el Usuario ejecuta una Acción_Rápida, THE Sistema SHALL crear una nueva Medición derivada con el resultado del cálculo y una referencia a la Medición original
4. THE Sistema SHALL permitir al Usuario incluir un porcentaje de desperdicio (waste factor) en las acciones rápidas, aplicándolo al resultado final
5. WHEN se modifica el valor de la Medición original, THE Sistema SHALL recalcular automáticamente las Mediciones derivadas vinculadas
6. THE Sistema SHALL mostrar las Mediciones derivadas con un indicador visual que las distinga de las mediciones directas
7. IF el Usuario proporciona un valor de altura o tamaño de pieza igual a cero, THEN THE Sistema SHALL mostrar un error de validación y no ejecutar el cálculo

### Requisito 7: Miniaturas de PDF en Sidebar

**User Story:** Como estimador, quiero ver miniaturas de las páginas del PDF en el panel lateral, para navegar rápidamente entre páginas sin usar controles secuenciales.

#### Criterios de Aceptación

1. WHILE un archivo PDF de múltiples páginas está abierto en el Visor, THE Sistema SHALL mostrar miniaturas de todas las páginas en la Sidebar
2. THE Sistema SHALL generar las miniaturas de forma asíncrona y mostrar un indicador de carga mientras se procesan
3. WHEN el Usuario hace clic en una miniatura, THE Sistema SHALL navegar a la página correspondiente en el Visor
4. THE Sistema SHALL resaltar visualmente la miniatura de la página actualmente visible en el Visor
5. WHEN una página tiene calibración de escala completada, THE Sistema SHALL mostrar un indicador visual sobre la miniatura de esa página
6. THE Sistema SHALL renderizar las miniaturas a una resolución suficiente para distinguir el contenido general de la página (mínimo 150px de ancho)
7. WHILE el PDF tiene más de 20 páginas, THE Sistema SHALL implementar carga virtualizada de miniaturas para mantener el rendimiento de la Sidebar

### Requisito 8: Rotación de Vista del Plano

**User Story:** Como estimador, quiero rotar la vista del plano en el visor, para poder alinear el plano según mi orientación preferida de trabajo.

#### Criterios de Aceptación

1. THE Sistema SHALL proporcionar controles para rotar la vista del plano en incrementos de 90° (0°, 90°, 180°, 270°)
2. WHEN el Usuario aplica una rotación, THE Sistema SHALL rotar el plano renderizado y la capa SVG de mediciones de forma sincronizada
3. THE Sistema SHALL mantener la funcionalidad completa de medición (dibujo, snap, selección) en cualquier ángulo de Rotación_de_Vista
4. WHEN el Usuario cambia de página, THE Sistema SHALL preservar el ángulo de Rotación_de_Vista aplicado
5. THE Sistema SHALL proporcionar un botón de "Restablecer rotación" que devuelva la vista a 0°
6. THE Sistema SHALL mostrar el ángulo de rotación actual en la barra de estado del Visor
7. WHEN el Usuario activa la rotación libre, THE Sistema SHALL permitir rotar el plano en incrementos de 1° mediante un control deslizante o entrada numérica

### Requisito 9: Selector de Unidades en el Viewport

**User Story:** Como estimador, quiero poder cambiar entre sistema imperial y métrico directamente desde el visor, para adaptar las unidades de visualización según las necesidades del plano o del cliente.

#### Criterios de Aceptación

1. THE Sistema SHALL mostrar un selector de sistema de unidades (imperial/métrico) accesible desde la barra de herramientas del Visor
2. WHEN el Usuario cambia el sistema de unidades en el Viewport, THE Sistema SHALL convertir y mostrar todos los valores de mediciones visibles en la unidad seleccionada
3. THE Sistema SHALL preservar los valores originales de las mediciones sin modificar la base de datos al cambiar la vista de unidades
4. WHEN el Usuario selecciona el sistema imperial, THE Sistema SHALL mostrar mediciones lineales en pies y pulgadas (ft-in), áreas en pies cuadrados (ft²) y volúmenes en pies cúbicos (ft³)
5. WHEN el Usuario selecciona el sistema métrico, THE Sistema SHALL mostrar mediciones lineales en metros (m), áreas en metros cuadrados (m²) y volúmenes en metros cúbicos (m³)
6. THE Sistema SHALL recordar la preferencia de unidades seleccionada por el Usuario entre sesiones, almacenándola en el perfil
7. WHEN el Usuario exporta un reporte, THE Sistema SHALL utilizar el sistema de unidades actualmente seleccionado en el Viewport para los valores del reporte

### Requisito 10: Zoom Centrado en Cursor

**User Story:** Como estimador, quiero que el zoom con la rueda del ratón se centre en la posición del cursor, para poder ampliar directamente la zona de interés sin necesidad de panear.

#### Criterios de Aceptación

1. WHEN el Usuario gira la rueda del ratón hacia adelante, THE Sistema SHALL ampliar la vista (zoom in) centrado en la posición del Cursor dentro del Viewport
2. WHEN el Usuario gira la rueda del ratón hacia atrás, THE Sistema SHALL reducir la vista (zoom out) centrado en la posición del Cursor dentro del Viewport
3. THE Sistema SHALL mantener el punto bajo el Cursor en la misma posición visual durante la operación de zoom
4. THE Sistema SHALL aplicar un factor de zoom de entre 1.1x y 1.3x por cada evento de rueda del ratón
5. THE Sistema SHALL limitar el nivel de zoom entre un mínimo de 10% y un máximo de 3000% del tamaño original del documento
6. WHILE el Usuario realiza zoom, THE Sistema SHALL mantener la capa SVG de mediciones alineada con el plano sin desfase visual
7. THE Sistema SHALL procesar los eventos de rueda del ratón con throttling para mantener una tasa de renderizado fluida (mínimo 30 fps durante el zoom)
