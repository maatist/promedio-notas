# Requirements Document

## Introducción

Esta funcionalidad agrega campos opcionales de fecha y descripción a cada nota (Grade), permitiendo a los usuarios registrar cuándo se realizará una evaluación y qué contenidos abarcará. Además, se muestra un banner en la parte superior del dashboard con las evaluaciones próximas, codificadas por color según la proximidad de la fecha.

## Glosario

- **Sistema**: La aplicación promedio-notas (backend + frontend)
- **Grade**: Una evaluación/nota individual dentro de un componente de asignatura
- **Grade_Date**: Campo opcional de tipo fecha que representa cuándo se realizará la evaluación
- **Grade_Description**: Campo opcional de tipo texto que describe los contenidos de la evaluación
- **Upcoming_Banner**: Componente visual ubicado en la parte superior del dashboard que muestra las evaluaciones próximas
- **Dashboard**: Página principal de la aplicación donde el usuario gestiona sus períodos, asignaturas y notas
- **Usuario**: Persona autenticada que utiliza la aplicación

## Requisitos

### Requisito 1: Campo de fecha en la nota

**User Story:** Como usuario, quiero poder asignar una fecha opcional a cada nota, para saber cuándo se realizará la evaluación.

#### Criterios de Aceptación

1. THE Sistema SHALL almacenar un campo opcional Grade_Date de tipo fecha (sin hora) en cada Grade
2. WHEN el Usuario crea una Grade, THE Sistema SHALL permitir especificar opcionalmente una Grade_Date
3. WHEN el Usuario edita una Grade y proporciona una Grade_Date, THE Sistema SHALL actualizar el valor; WHEN el Usuario edita una Grade y envía Grade_Date como null, THE Sistema SHALL eliminar la Grade_Date existente; WHEN el Usuario edita una Grade y omite el campo Grade_Date, THE Sistema SHALL preservar el valor actual sin modificarlo
4. WHEN una Grade_Date es proporcionada, THE Sistema SHALL validar que sea una fecha válida en formato ISO 8601 (YYYY-MM-DD)
5. IF una Grade_Date tiene un formato inválido o no representa una fecha real del calendario, THEN THE Sistema SHALL rechazar la operación y retornar un mensaje de error indicando que el formato de fecha es inválido
6. WHEN el Sistema retorna una Grade en cualquier respuesta, THE Sistema SHALL incluir el campo Grade_Date con su valor actual o null si no fue asignado

### Requisito 2: Campo de descripción en la nota

**User Story:** Como usuario, quiero poder agregar una descripción opcional a cada nota, para registrar los contenidos o temas que abarcará la evaluación.

#### Criterios de Aceptación

1. THE Sistema SHALL almacenar un campo opcional Grade_Description de tipo texto en cada Grade, con valor por defecto null para Grades sin descripción
2. WHEN el Usuario crea una Grade, THE Sistema SHALL permitir especificar opcionalmente una Grade_Description
3. WHEN el Usuario edita una Grade y envía una Grade_Description vacía o nula, THE Sistema SHALL eliminar la Grade_Description existente estableciendo el valor a null
4. THE Sistema SHALL limitar la Grade_Description a un máximo de 500 caracteres, aplicando trim de espacios al inicio y al final antes de validar la longitud
5. IF una Grade_Description excede 500 caracteres después del trim, THEN THE Sistema SHALL rechazar la operación y retornar un mensaje de error indicando que la descripción supera el límite de 500 caracteres
6. IF una Grade_Description contiene únicamente espacios en blanco después del trim, THEN THE Sistema SHALL tratar el valor como null y no almacenar una cadena vacía

### Requisito 3: Endpoint de evaluaciones próximas

**User Story:** Como usuario, quiero obtener las evaluaciones próximas de todos mis períodos, para poder visualizarlas en el dashboard.

#### Criterios de Aceptación

1. THE Sistema SHALL exponer un endpoint autenticado que retorne todas las Grades del Usuario que tengan una Grade_Date desde el inicio del día actual (00:00:00 hora del servidor) hasta exactamente 30 días calendario posteriores (inclusive)
2. WHEN el Usuario solicita las evaluaciones próximas, THE Sistema SHALL incluir para cada Grade: el nombre de la Grade, la Grade_Date, la Grade_Description, el nombre del SubjectComponent y el nombre del Subject
3. THE Sistema SHALL ordenar las evaluaciones próximas por Grade_Date de forma ascendente
4. THE Sistema SHALL excluir Grades cuya Grade_Date sea NULL o anterior al inicio del día actual
5. WHEN el Usuario no tiene evaluaciones próximas dentro del rango de 30 días, THE Sistema SHALL retornar una lista vacía con estructura de respuesta exitosa
6. IF el Usuario no está autenticado o el token es inválido, THEN THE Sistema SHALL rechazar la solicitud con un error indicando que la autenticación es requerida
7. THE Sistema SHALL retornar únicamente Grades pertenecientes al Usuario autenticado, verificando la cadena de propiedad Grade → SubjectComponent → Subject → Period → User

### Requisito 4: Banner de evaluaciones próximas en el dashboard

**User Story:** Como usuario, quiero ver un banner con mis evaluaciones próximas al inicio del dashboard, para tener visibilidad inmediata de las fechas importantes.

#### Criterios de Aceptación

1. WHEN el Usuario tiene evaluaciones con Grade_Date dentro de los próximos 30 días calendario (desde el día actual inclusive), THE Dashboard SHALL mostrar el Upcoming_Banner en la parte superior del contenido principal, con las evaluaciones ordenadas por Grade_Date ascendente (más próxima primero) y mostrando un máximo de 10 evaluaciones
2. WHILE el Upcoming_Banner se muestra, THE Sistema SHALL codificar por color cada evaluación según su proximidad:
   - Evaluaciones con 0 a 7 días restantes (inclusive): color rojo
   - Evaluaciones con 8 a 14 días restantes (inclusive): color amarillo
   - Evaluaciones con 15 a 30 días restantes (inclusive): color verde
3. THE Upcoming_Banner SHALL mostrar para cada evaluación: el nombre de la Grade, la Grade_Date formateada según el locale activo del usuario en el sistema de i18n, y el nombre del Subject asociado
4. WHEN el Usuario no tiene evaluaciones con Grade_Date dentro de los próximos 30 días calendario, THE Dashboard SHALL ocultar el Upcoming_Banner completamente sin dejar espacio vacío
5. WHILE la aplicación está en modo oscuro, THE Upcoming_Banner SHALL mantener contraste de texto legible (ratio mínimo 4.5:1 según WCAG AA) sobre los colores indicadores rojo, amarillo y verde
6. THE Upcoming_Banner SHALL utilizar role="region" con aria-label descriptivo, y cada indicador de color SHALL incluir un texto alternativo accesible que indique la urgencia (por ejemplo aria-label indicando los días restantes) para que la información no dependa exclusivamente del color

### Requisito 5: Interfaz de edición de fecha y descripción en GradeRow

**User Story:** Como usuario, quiero poder editar la fecha y descripción de una nota directamente desde la fila de la nota, para mantener una experiencia fluida de edición.

#### Criterios de Aceptación

1. THE GradeRow SHALL mostrar la Grade_Date en formato corto localizado en una columna dedicada junto a los datos existentes de la nota
2. WHEN el Usuario hace clic sobre la Grade_Date mostrada, THE GradeRow SHALL reemplazar el texto por un campo input de tipo date, enfocado automáticamente
3. WHEN el Usuario presiona Enter o el campo de fecha pierde el foco (blur), THE GradeRow SHALL guardar la Grade_Date seleccionada invocando el callback onUpdate con el valor de fecha
4. IF el Usuario presiona Escape mientras edita la Grade_Date, THEN THE GradeRow SHALL cancelar la edición y restaurar el valor previo sin invocar onUpdate
5. WHEN la Grade_Date no está definida (null), THE GradeRow SHALL mostrar un ícono de calendario con opacidad reducida que al hacer clic active el campo de edición de fecha
6. THE GradeRow SHALL mostrar un ícono de nota de texto junto a la fila cuando la Grade tiene una Grade_Description asociada (no nula y no vacía)
7. WHEN el Usuario hace clic en el ícono de descripción o en el indicador de "sin descripción", THE GradeRow SHALL mostrar un campo textarea de máximo 500 caracteres para ver o editar la Grade_Description
8. WHEN el Usuario presiona Enter (sin Shift) o el textarea de descripción pierde el foco, THE GradeRow SHALL guardar la Grade_Description invocando el callback onUpdate con el texto ingresado (o null si está vacío)
9. IF el Usuario presiona Escape mientras edita la Grade_Description, THEN THE GradeRow SHALL cancelar la edición y restaurar el valor previo sin invocar onUpdate

### Requisito 6: Internacionalización de los nuevos campos

**User Story:** Como usuario, quiero que los textos relacionados con la fecha y descripción estén disponibles en todos los idiomas soportados por la aplicación.

#### Criterios de Aceptación

1. THE Sistema SHALL incluir traducciones en español (es) e inglés (en) para todos los textos visibles del Upcoming_Banner, incluyendo el título del banner, el texto de la fecha de la evaluación próxima, y el nombre de la asignatura asociada
2. THE Sistema SHALL incluir traducciones en español (es) e inglés (en) para el label y el placeholder del campo Grade_Date, y para el label y el placeholder del campo Grade_Description
3. WHILE la localización activa del usuario es "es", THE Sistema SHALL formatear la Grade_Date en formato corto regional (día/mes/año); WHILE la localización activa es "en", THE Sistema SHALL formatear la Grade_Date en formato corto regional (month/day/year)
4. THE Sistema SHALL incluir traducciones en español (es) e inglés (en) para los mensajes de error de validación de Grade_Date (fecha inválida) y Grade_Description (descripción excede el largo máximo permitido)
5. IF una clave de traducción para los campos Grade_Date, Grade_Description o Upcoming_Banner no se encuentra en el idioma activo, THEN THE Sistema SHALL mostrar el texto correspondiente en el idioma por defecto (es) en lugar de mostrar una clave sin resolver o texto vacío
