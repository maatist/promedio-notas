# Implementation Plan: Share Subject Structure

## Overview

Implement a token-based sharing mechanism that allows users to share subject structures (components, grade slots, weights) via a link. Recipients can preview and import the structure into their own period. The implementation spans the Prisma data model, three new backend API endpoints, a new frontend page for imports, a share modal component, and i18n support.

## Tasks

- [x] 1. Database schema and migration
  - [x] 1.1 Add ShareToken model to Prisma schema and generate migration
    - Add the `ShareToken` model to `packages/backend/prisma/schema.prisma` with fields: id, token (unique), subjectId, createdAt, expiresAt
    - Add `onDelete: Cascade` on the subject relation
    - Add the `shareTokens ShareToken[]` relation field to the existing `Subject` model
    - Add indexes on `token` (unique), `subjectId`, and `expiresAt`
    - Generate the Prisma migration and client
    - _Requirements: 1.1, 1.2, 6.1_

- [x] 2. Backend: Share token validation helper and schemas
  - [x] 2.1 Create token validation helper and Zod schemas
    - Create `packages/backend/src/services/shareToken.ts` with the `validateShareToken` function
    - The function looks up a token, returns 404 if not found, 410 if expired, or the associated subjectId if valid
    - Add the `importSubjectSchema` Zod schema to `packages/backend/src/validators/schemas.ts` validating `{ periodId: z.string().uuid() }`
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Backend: Share route endpoints
  - [x] 3.1 Implement POST `/api/share/subjects/:subjectId` (generate share link)
    - Create `packages/backend/src/routes/share.ts`
    - Verify the subject exists and belongs to the authenticated user (via period.userId); return 404 if not
    - Generate token with `crypto.randomBytes(32).toString('hex')`
    - Set expiration to exactly 7 days from now
    - Store the ShareToken record and return `{ shareLink, token, expiresAt }`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 3.2 Implement GET `/api/share/:token/preview` (preview structure)
    - Use the `validateShareToken` helper to verify the token
    - Fetch the subject with all components and grades, excluding grade values
    - Return the subject structure preview (name, isComposite, exemptionGrade, components with grades)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 5.1, 5.2_

  - [x] 3.3 Implement POST `/api/share/:token/import` (import structure)
    - Validate the token using the helper
    - Validate the request body with `importSubjectSchema`
    - Verify the target period belongs to the authenticated user; return 403 if not
    - Fetch original subject structure (components + grades)
    - Use `prisma.$transaction` to create the new subject, components, and grade slots with `value: null`
    - Return the created subject with full structure
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 6.1_

  - [x] 3.4 Register share routes in the backend entry point
    - Import share routes in `packages/backend/src/index.ts`
    - Mount with `app.use('/api', shareRoutes)`
    - _Requirements: 1.1_

  - [ ]* 3.5 Write property tests for share token and import logic
    - **Property 1: Token expiration is exactly 7 days after creation**
    - **Property 2: Token length meets minimum security requirement (>= 32 chars)**
    - **Property 6: Import preserves subject structure completely**
    - **Property 7: Imported grades have null values**
    - **Property 9: Imported subject has unique IDs (fully independent)**
    - **Validates: Requirements 1.2, 1.4, 4.1, 4.2, 4.3, 4.4, 6.1**

- [x] 4. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Frontend: API service and types
  - [x] 5.1 Add share API functions and TypeScript types
    - Create `packages/frontend/src/api/share.ts` (or extend existing API module) with `generateLink`, `getPreview`, `importSubject` functions
    - Define TypeScript interfaces: `ShareLinkResponse`, `SubjectPreviewResponse`, `ImportResponse`
    - _Requirements: 1.3, 5.1, 4.1_

- [x] 6. Frontend: Share modal component
  - [x] 6.1 Create ShareSubjectModal component
    - Create `packages/frontend/src/components/ShareSubjectModal.tsx`
    - On open, call the generate link endpoint
    - Display the share link in a readonly input with a copy-to-clipboard button
    - Show the expiration date formatted in user's locale
    - Show loading and error states
    - _Requirements: 7.2, 7.3, 7.4_

  - [x] 6.2 Add share button to SubjectCard
    - Add a share icon button to `packages/frontend/src/components/SubjectCard.tsx`
    - Clicking the button opens the ShareSubjectModal
    - _Requirements: 7.1_

- [x] 7. Frontend: Import page
  - [x] 7.1 Create ImportSubjectPage component
    - Create `packages/frontend/src/pages/ImportSubjectPage.tsx`
    - Extract token from URL params
    - If user not authenticated, redirect to login with return URL
    - Call preview endpoint and display subject structure
    - Show error states for invalid (404) and expired (410) links
    - _Requirements: 8.1, 8.5, 3.1_

  - [x] 7.2 Add period selector and import confirmation flow
    - Fetch user's periods and display in a dropdown selector
    - On confirm, call the import endpoint with selected periodId
    - On success, show success toast and navigate to the target period view
    - _Requirements: 8.2, 8.3, 8.4_

  - [x] 7.3 Register `/import/:token` route in the frontend router
    - Add the new route to the router configuration in `App.tsx` (or the router file)
    - Wrap with authentication guard (ProtectedRoute or redirect logic)
    - _Requirements: 8.1, 3.1_

- [x] 8. Internationalization
  - [x] 8.1 Add share-related i18n keys to translations
    - Add all share and import UI labels, messages, and error texts to both `es` and `en` locales in `packages/frontend/src/i18n/translations.ts`
    - Include keys for: share button, modal title, link label, copy button, copied toast, expiration, import title, preview, select period, confirm button, success toast, and error messages
    - _Requirements: 9.1, 9.2_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The import uses `prisma.$transaction` to ensure atomic creation of subject + components + grades
- The frontend import page handles the case where a user is not authenticated by redirecting to login with a return URL

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "5.1", "8.1"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 3, "tasks": ["3.4", "3.5", "6.1"] },
    { "id": 4, "tasks": ["6.2", "7.1"] },
    { "id": 5, "tasks": ["7.2", "7.3"] }
  ]
}
```
