# Implementation Plan: Grade Dates and Upcoming Banner

## Overview

Implementación incremental de los campos opcionales `date` y `description` en el modelo Grade, un nuevo endpoint para evaluaciones próximas, y un componente visual `UpcomingBanner` en el dashboard con codificación por color según urgencia. Se extiende el `GradeRow` con edición inline de fecha y descripción, y se agregan las traducciones i18n correspondientes.

## Tasks

- [x] 1. Migración de base de datos y tipos compartidos
  - [x] 1.1 Crear migración Prisma para agregar campos `date` y `description` al modelo Grade
    - Agregar campo `date DateTime? @db.Date` al modelo Grade en `packages/backend/prisma/schema.prisma`
    - Agregar campo `description String? @db.VarChar(500)` al modelo Grade
    - Generar y aplicar la migración con `npx prisma migrate dev`
    - _Requirements: 1.1, 2.1_

  - [x] 1.2 Actualizar la interfaz Grade en el paquete shared
    - Agregar `date: string | null` y `description: string | null` a la interfaz `Grade` en `packages/shared/src/types.ts`
    - Agregar interfaz `UpcomingGrade` con campos: id, name, date, description, subjectComponentName, subjectName
    - Actualizar `UpdateGradeRequest` para incluir `date?: string | null` y `description?: string | null`
    - Reconstruir el paquete shared
    - _Requirements: 1.6, 2.1, 3.2_

- [x] 2. Validación y lógica de backend
  - [x] 2.1 Actualizar schemas de validación Zod para grades
    - Crear `gradeDateSchema` con regex ISO 8601 (YYYY-MM-DD) y validación de fecha real del calendario
    - Crear `gradeDescriptionSchema` con trim, transformación whitespace-only → null, y límite de 500 caracteres
    - Actualizar `createGradeSchema` y `updateGradeSchema` en `packages/backend/src/validators/schemas.ts` para incluir los nuevos campos
    - _Requirements: 1.4, 1.5, 2.4, 2.5, 2.6_

  - [x] 2.2 Escribir property tests para validación de fecha (Property 1)
    - **Property 1: Date validation round-trip**
    - Generar strings válidos ISO 8601 y verificar aceptación
    - Generar strings inválidos (formato incorrecto, fechas inexistentes como 2024-02-30) y verificar rechazo
    - Usar fast-check con mínimo 100 iteraciones
    - **Validates: Requirements 1.4, 1.5**

  - [x] 2.3 Escribir property tests para normalización de descripción (Property 3)
    - **Property 3: Description normalization**
    - Generar strings con whitespace y verificar que se almacena null
    - Generar strings ≤ 500 chars y verificar almacenamiento correcto con trim
    - Generar strings > 500 chars y verificar rechazo
    - Usar fast-check con mínimo 100 iteraciones
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.6**

  - [x] 2.4 Actualizar endpoints de creación y actualización de grades
    - Modificar POST `/api/components/:componentId/grades` en `packages/backend/src/routes/grades.ts` para aceptar y persistir `date` y `description`
    - Modificar PUT `/api/grades/:id` para implementar semántica de update: date explícito → actualizar, date null → eliminar, date omitido → preservar; description vacía/null → null, description con texto → actualizar
    - Asegurar que el GET de grades retorne los campos `date` y `description`
    - _Requirements: 1.2, 1.3, 1.6, 2.2, 2.3_

  - [x] 2.5 Escribir property tests para semántica de update de fecha (Property 2)
    - **Property 2: Grade update date semantics**
    - Verificar que enviar fecha explícita la actualiza, enviar null la elimina, omitir la preserva
    - Usar fast-check con mínimo 100 iteraciones
    - **Validates: Requirements 1.3**

- [x] 3. Endpoint de evaluaciones próximas
  - [x] 3.1 Implementar endpoint GET `/api/upcoming-grades`
    - Crear ruta autenticada en `packages/backend/src/routes/grades.ts`
    - Filtrar grades con date ≥ inicio del día actual y ≤ hoy + 30 días (inclusive)
    - Verificar cadena de propiedad Grade → SubjectComponent → Subject → Period → User
    - Incluir join con SubjectComponent y Subject para retornar nombres
    - Ordenar por date ASC
    - Retornar lista vacía con estructura exitosa si no hay resultados
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 3.2 Escribir property tests para filtrado de rango de fechas (Property 4)
    - **Property 4: Upcoming grades date range filter**
    - Generar conjuntos de grades con fechas variadas (null, pasadas, hoy, dentro de 30 días, más allá de 30 días)
    - Verificar que se retornan exactamente las grades dentro del rango
    - Usar fast-check con mínimo 100 iteraciones
    - **Validates: Requirements 3.1, 3.4**

  - [x] 3.3 Escribir property tests para ordenamiento (Property 5)
    - **Property 5: Upcoming grades sort order**
    - Verificar que el resultado está ordenado por fecha ASC
    - Usar fast-check con mínimo 100 iteraciones
    - **Validates: Requirements 3.3**

  - [x] 3.4 Escribir property tests para aislamiento por usuario (Property 6)
    - **Property 6: Upcoming grades user isolation**
    - Verificar que solo se retornan grades del usuario autenticado
    - Usar fast-check con mínimo 100 iteraciones
    - **Validates: Requirements 3.7**

- [x] 4. Checkpoint - Verificar backend completo
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Internacionalización
  - [x] 5.1 Agregar traducciones i18n para los nuevos campos
    - Agregar sección `upcomingBanner` con claves: title, daysRemaining, today, tomorrow en `packages/frontend/src/i18n/translations.ts`
    - Agregar claves al objeto `grade`: dateLabel, datePlaceholder, descriptionLabel, descriptionPlaceholder, invalidDate, descriptionTooLong
    - Actualizar el tipo `TranslationKeys` con las nuevas claves
    - Agregar traducciones para ambos locales (es, en)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6. Utilidades y funciones puras del frontend
  - [x] 6.1 Crear utilidad de formateo de fecha y clasificación de urgencia
    - Crear archivo `packages/frontend/src/utils/dateUtils.ts`
    - Implementar `formatGradeDate(isoDate: string, locale: 'es' | 'en'): string` usando `toLocaleDateString`
    - Implementar `getDaysRemaining(gradeDate: string, today: string): number`
    - Implementar `getUrgencyColor(daysRemaining: number): 'red' | 'yellow' | 'green'`
    - _Requirements: 4.2, 6.3_

  - [x] 6.2 Escribir property tests para clasificación de color de urgencia (Property 7)
    - **Property 7: Urgency color classification**
    - Generar enteros en rango [0, 30] y verificar mapeo correcto: 0-7 → red, 8-14 → yellow, 15-30 → green
    - Verificar que los rangos son exhaustivos y no se solapan
    - Usar fast-check con mínimo 100 iteraciones
    - **Validates: Requirements 4.2**

  - [x] 6.3 Escribir property tests para formateo de fecha por locale (Property 8)
    - **Property 8: Date formatting by locale**
    - Generar fechas ISO válidas y verificar formato regional correcto para cada locale
    - Usar fast-check con mínimo 100 iteraciones
    - **Validates: Requirements 6.3**

- [x] 7. Componente UpcomingBanner
  - [x] 7.1 Crear componente UpcomingBanner
    - Crear `packages/frontend/src/components/UpcomingBanner.tsx`
    - Implementar listado de evaluaciones con máximo 10 items, ordenadas por fecha ASC
    - Implementar codificación por color (rojo 0-7 días, amarillo 8-14, verde 15-30)
    - Formatear fecha según locale activo del usuario
    - Mostrar nombre de la grade, fecha formateada y nombre del subject
    - No renderizar nada si no hay evaluaciones próximas (ocultar completamente)
    - Agregar atributos de accesibilidad: role="region", aria-label descriptivo, texto alternativo en indicadores de color
    - Asegurar contraste legible (WCAG AA 4.5:1) en modo oscuro sobre indicadores de color
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 7.2 Escribir property test para límite de display del banner (Property 9)
    - **Property 9: Banner display limit**
    - Generar arreglos de upcoming grades con más de 10 items
    - Verificar que se muestran máximo 10 y son los primeros 10 por fecha ASC
    - Usar fast-check con mínimo 100 iteraciones
    - **Validates: Requirements 4.1**

  - [x] 7.3 Escribir unit tests para UpcomingBanner
    - Test: no renderizar cuando la lista de grades está vacía
    - Test: renderizar correctamente con datos (estructura DOM)
    - Test: verificar atributos de accesibilidad (role="region", aria-labels)
    - _Requirements: 4.4, 4.6_

- [x] 8. Integración del banner en el Dashboard y servicio API
  - [x] 8.1 Crear servicio de API para upcoming grades en el frontend
    - Agregar función `getUpcomingGrades()` al archivo de servicios API del frontend
    - Consumir endpoint GET `/api/upcoming-grades` con autenticación
    - Manejar errores silenciosamente (no romper el dashboard)
    - _Requirements: 3.1, 3.6_

  - [x] 8.2 Integrar UpcomingBanner en DashboardPage
    - Importar y renderizar `UpcomingBanner` en la parte superior del contenido principal de `packages/frontend/src/pages/DashboardPage.tsx`
    - Hacer fetch de upcoming grades al montar el componente
    - No mostrar el banner si el fetch falla (fail silently)
    - _Requirements: 4.1, 4.4_

- [x] 9. Edición inline de fecha y descripción en GradeRow
  - [x] 9.1 Agregar columna de fecha al GradeRow
    - Actualizar `packages/frontend/src/components/GradeRow.tsx`
    - Mostrar fecha formateada en columna dedicada; si es null, mostrar ícono de calendario con opacidad reducida
    - Click activa `<input type="date">` con autoFocus
    - Enter o blur guarda invocando onUpdate con el valor de fecha
    - Escape cancela y restaura valor previo
    - Actualizar la interfaz `GradeRowProps.onUpdate` para aceptar `date?: string | null`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 9.2 Agregar indicador y editor de descripción al GradeRow
    - Mostrar ícono de nota de texto cuando la grade tiene descripción (no nula y no vacía)
    - Click en ícono o indicador "sin descripción" muestra textarea con maxLength 500
    - Enter (sin Shift) o blur guarda invocando onUpdate con texto o null si vacío
    - Escape cancela y restaura valor previo
    - Actualizar la interfaz `GradeRowProps.onUpdate` para aceptar `description?: string | null`
    - _Requirements: 5.6, 5.7, 5.8, 5.9_

  - [x] 9.3 Escribir unit tests para edición inline en GradeRow
    - Test: click en fecha activa input de tipo date
    - Test: Enter guarda fecha, Escape cancela
    - Test: ícono de calendario cuando fecha es null
    - Test: click en descripción abre textarea
    - Test: Enter guarda descripción, Escape cancela
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 5.7, 5.8, 5.9_

- [x] 10. Final checkpoint - Verificar integración completa
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada task referencia requisitos específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Los property tests validan propiedades universales de correctitud definidas en el diseño
- Los unit tests validan ejemplos específicos y edge cases
- El backend se implementa primero para validar la API antes de construir el frontend
- La migración de Prisma debe ejecutarse antes de cualquier otra tarea

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "5.1"] },
    { "id": 3, "tasks": ["2.5", "3.1", "6.1"] },
    { "id": 4, "tasks": ["3.2", "3.3", "3.4", "6.2", "6.3"] },
    { "id": 5, "tasks": ["7.1", "8.1"] },
    { "id": 6, "tasks": ["7.2", "7.3", "8.2", "9.1"] },
    { "id": 7, "tasks": ["9.2"] },
    { "id": 8, "tasks": ["9.3"] }
  ]
}
```
