# Design Document: Share Subject Structure

## Architecture Overview

This feature adds a token-based sharing mechanism that allows users to share subject structures (components, grades, weights) via a link. The architecture follows the existing patterns in the codebase: a new Prisma model for token storage, a new Express route file for share endpoints, and a new frontend page for the import flow.

**Key architectural decisions:**
- ShareToken model follows the PasswordResetToken pattern (token + expiration + association)
- Share endpoints are a new route module (`/api/share`) registered alongside existing routes
- The import creates a fully independent copy — no foreign keys or references to the original
- Frontend uses a new `/import/:token` route accessible to authenticated users

---

## Data Model

### New Prisma Model: ShareToken

```prisma
model ShareToken {
  id        String   @id @default(uuid())
  token     String   @unique
  subjectId String
  createdAt DateTime @default(now())
  expiresAt DateTime
  subject   Subject  @relation(fields: [subjectId], references: [id], onDelete: Cascade)
}
```

**Relation on Subject model (addition):**
```prisma
model Subject {
  // ... existing fields ...
  shareTokens ShareToken[]
}
```

**Design rationale:**
- `onDelete: Cascade` ensures tokens are cleaned up when the subject is deleted
- No `used` flag — tokens are reusable until expiration (Requirement 2.4)
- The token field is a hex string from `crypto.randomBytes(32)` yielding 64 hex characters (satisfies >= 32 char requirement)

---

## Backend Components

### New Route File: `src/routes/share.ts`

Three endpoints:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/share/subjects/:subjectId` | Required | Generate share link (Owner) |
| GET | `/api/share/:token/preview` | Required | Preview subject structure (Recipient) |
| POST | `/api/share/:token/import` | Required | Import subject structure (Recipient) |

### Endpoint: POST `/api/share/subjects/:subjectId`

**Request:** Empty body (subjectId from URL param)

**Logic:**
1. Authenticate user via `authenticate` middleware
2. Verify the subject exists and belongs to the authenticated user (via period.userId)
3. Generate token: `crypto.randomBytes(32).toString('hex')`
4. Compute expiration: `new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)`
5. Store ShareToken record
6. Return share link URL: `${FRONTEND_URL}/import/${token}`

**Response (201):**
```typescript
{
  success: true,
  data: {
    shareLink: string,   // Full URL
    token: string,       // Raw token
    expiresAt: string    // ISO timestamp
  }
}
```

**Error responses:**
- 401: Unauthenticated
- 404: Subject not found or not owned by user

### Endpoint: GET `/api/share/:token/preview`

**Logic:**
1. Authenticate user
2. Look up ShareToken by token value
3. If not found → 404
4. If expired (expiresAt < now) → 410
5. Fetch subject with components and grades (excluding grade values)
6. Return preview structure

**Response (200):**
```typescript
{
  success: true,
  data: {
    subjectName: string,
    isComposite: boolean,
    exemptionGrade: number | null,
    components: Array<{
      name: string,
      weightPercentage: number,
      grades: Array<{
        name: string,
        weightPercentage: number,
        order: number,
        date: string | null,
        description: string | null
      }>
    }>
  }
}
```

### Endpoint: POST `/api/share/:token/import`

**Request body:**
```typescript
{
  periodId: string  // Target period UUID
}
```

**Validation schema (Zod):**
```typescript
export const importSubjectSchema = z.object({
  periodId: z.string().uuid('Invalid period ID'),
});
```

**Logic:**
1. Authenticate user
2. Validate token (same as preview: exists → not expired)
3. Verify target period belongs to authenticated user → 403 if not
4. Fetch full subject structure (components + grades) from the token's associated subject
5. Create new subject in target period using `prisma.$transaction`:
   - Create Subject (name, isComposite, exemptionGrade, periodId)
   - Create SubjectComponents (name, weightPercentage)
   - Create Grades per component (name, weightPercentage, order, date, description, value: null)
6. Return the created subject with full structure

**Response (201):**
```typescript
{
  success: true,
  data: {
    id: string,
    name: string,
    periodId: string,
    isComposite: boolean,
    exemptionGrade: number | null,
    components: Array<{
      id: string,
      name: string,
      weightPercentage: number,
      grades: Array<{
        id: string,
        name: string,
        value: null,
        weightPercentage: number,
        order: number,
        date: string | null,
        description: string | null
      }>
    }>
  }
}
```

**Error responses:**
- 401: Unauthenticated
- 403: Target period does not belong to user
- 404: Token not found
- 410: Token expired

### Token Validation Helper

Shared logic extracted into a helper function used by both preview and import:

```typescript
async function validateShareToken(token: string): Promise<
  | { valid: true; subjectId: string }
  | { valid: false; status: 404 | 410; error: string }
> {
  const shareToken = await prisma.shareToken.findUnique({
    where: { token },
  });

  if (!shareToken) {
    return { valid: false, status: 404, error: 'Share link not found' };
  }

  if (shareToken.expiresAt < new Date()) {
    return { valid: false, status: 410, error: 'Share link has expired' };
  }

  return { valid: true, subjectId: shareToken.subjectId };
}
```

### Route Registration

In `src/index.ts`:
```typescript
import shareRoutes from './routes/share';
// ...
app.use('/api', shareRoutes);
```

---

## Frontend Components

### New Page: ImportSubjectPage

**Route:** `/import/:token`

**Location:** `packages/frontend/src/pages/ImportSubjectPage.tsx`

**Behavior:**
1. Extract token from URL params
2. If user not authenticated → redirect to login with return URL
3. Call `GET /api/share/:token/preview`
4. On error: display appropriate message (invalid link, expired link)
5. On success: display preview card with subject structure
6. Show period selector dropdown (fetch user's periods)
7. On confirm: call `POST /api/share/:token/import` with selected periodId
8. On success: toast notification + navigate to `/periods/:periodId`

**State management:**
```typescript
interface ImportPageState {
  loading: boolean;
  preview: SubjectPreview | null;
  error: { type: 'not_found' | 'expired' | 'unknown'; message: string } | null;
  periods: Period[];
  selectedPeriodId: string | null;
  importing: boolean;
}
```

### Share Modal Component

**Location:** `packages/frontend/src/components/ShareSubjectModal.tsx`

**Props:**
```typescript
interface ShareSubjectModalProps {
  subjectId: string;
  subjectName: string;
  isOpen: boolean;
  onClose: () => void;
}
```

**Behavior:**
1. On open: call `POST /api/share/subjects/:subjectId`
2. Display generated link in a readonly input field
3. Show expiration date formatted in user's locale
4. Copy button → `navigator.clipboard.writeText(link)` → success toast
5. Close button dismisses modal

### Share Button Integration

Add a share icon button to the existing SubjectCard component. Clicking it opens ShareSubjectModal.

### Route Registration (Frontend)

In the router configuration, add:
```typescript
{ path: '/import/:token', element: <ImportSubjectPage /> }
```

---

## API Service Layer (Frontend)

New functions in the API service:

```typescript
// Share API calls
export const shareApi = {
  generateLink: (subjectId: string) =>
    api.post<ShareLinkResponse>(`/share/subjects/${subjectId}`),

  getPreview: (token: string) =>
    api.get<SubjectPreviewResponse>(`/share/${token}/preview`),

  importSubject: (token: string, periodId: string) =>
    api.post<ImportResponse>(`/share/${token}/import`, { periodId }),
};
```

---

## Internationalization

New i18n keys added to both `es` and `en` locale files:

```typescript
share: {
  button: "Compartir" / "Share",
  modalTitle: "Compartir asignatura" / "Share subject",
  linkLabel: "Enlace para compartir" / "Share link",
  copyButton: "Copiar enlace" / "Copy link",
  copiedToast: "Enlace copiado al portapapeles" / "Link copied to clipboard",
  expiresAt: "Expira el {{date}}" / "Expires on {{date}}",
  import: {
    title: "Importar asignatura" / "Import subject",
    preview: "Vista previa de la estructura" / "Structure preview",
    selectPeriod: "Seleccionar período destino" / "Select target period",
    confirmButton: "Importar asignatura" / "Import subject",
    successToast: "Asignatura importada exitosamente" / "Subject imported successfully",
    errorNotFound: "El enlace no es válido" / "This link is not valid",
    errorExpired: "El enlace ha expirado" / "This link has expired",
    errorForbidden: "No tienes acceso a este período" / "You don't have access to this period",
  }
}
```

---

## Error Handling

| Scenario | HTTP Status | Frontend Behavior |
|----------|-------------|-------------------|
| Unauthenticated access | 401 | Redirect to login with return URL |
| Subject not owned (generate) | 404 | Should not occur in normal flow (button only on own subjects) |
| Token not found | 404 | Display "invalid link" error page |
| Token expired | 410 | Display "link expired" error page |
| Period not owned (import) | 403 | Display error toast |
| Server error | 500 | Display generic error toast |

---

## Database Migration

New migration file: `prisma/migrations/YYYYMMDD_add_share_token/migration.sql`

```sql
CREATE TABLE "ShareToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShareToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShareToken_token_key" ON "ShareToken"("token");
CREATE INDEX "ShareToken_subjectId_idx" ON "ShareToken"("subjectId");
CREATE INDEX "ShareToken_expiresAt_idx" ON "ShareToken"("expiresAt");

ALTER TABLE "ShareToken" ADD CONSTRAINT "ShareToken_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

**Indexes:**
- Unique on `token` for fast lookup during validation
- Index on `subjectId` for cascade deletion efficiency
- Index on `expiresAt` for potential cleanup jobs

---

## Security Considerations

1. **Token entropy:** 32 bytes (256 bits) of randomness from `crypto.randomBytes` — computationally infeasible to guess
2. **Authentication required:** All share endpoints require a valid JWT
3. **Ownership verification:** Share generation verifies subject ownership; import verifies period ownership
4. **No data leakage:** Grade values are never included in preview or transmitted via the share mechanism
5. **Expiration enforcement:** Tokens checked server-side on every access; expired tokens are rejected
6. **Rate limiting:** Consider adding rate limiting to share generation endpoint (future enhancement)

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Token expiration is exactly 7 days after creation

*For any* generated ShareToken, the difference between `expiresAt` and `createdAt` SHALL equal exactly 7 days (604,800,000 milliseconds).

**Validates: Requirements 1.2**

### Property 2: Token length meets minimum security requirement

*For any* generated Share_Token string, its length SHALL be at least 32 characters.

**Validates: Requirements 1.4**

### Property 3: Non-owner share generation is rejected

*For any* authenticated user and any subject that does not belong to that user, requesting a share link SHALL return a 404 error.

**Validates: Requirements 1.5**

### Property 4: Invalid token returns 404, expired token returns 410

*For any* token string that does not exist in the database, accessing the preview or import endpoint SHALL return 404. *For any* token whose `expiresAt` is in the past, accessing the preview or import endpoint SHALL return 410.

**Validates: Requirements 2.2, 2.3**

### Property 5: Valid tokens are reusable

*For any* valid, non-expired ShareToken, accessing the preview or import endpoint multiple times (N >= 1) SHALL all succeed without invalidating the token.

**Validates: Requirements 2.4**

### Property 6: Import preserves subject structure completely

*For any* subject with components and grades, importing the structure SHALL produce a new subject with identical `name`, `isComposite`, `exemptionGrade`, and for each component: identical `name` and `weightPercentage`, and for each grade within a component: identical `name`, `weightPercentage`, `order`, `date`, and `description`.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 7: Imported grades have null values

*For any* imported subject structure, regardless of the original grade values, ALL grade slots in the imported subject SHALL have `value` equal to `null`. This also applies to the preview response — no grade values are exposed.

**Validates: Requirements 4.4, 5.2**

### Property 8: Import rejects unauthorized target period

*For any* authenticated user attempting to import into a period that does not belong to them, the system SHALL return a 403 error and no subject shall be created.

**Validates: Requirements 4.5, 4.6**

### Property 9: Imported subject is fully independent

*For any* imported subject, the new subject and all its components and grades SHALL have unique IDs (different from the original), and no database field on the imported records SHALL reference the original subject's ID.

**Validates: Requirements 6.1**
