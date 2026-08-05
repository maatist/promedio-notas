# Prisma Client Vercel Initialization Bugfix Design

## Overview

The application's backend fails on Vercel with `@prisma/client did not initialize yet` because the deployment pipeline never runs `prisma generate`, never bundles the generated client into the serverless function, and the production database has no tables. The fix involves three targeted changes: updating the Vercel build command, expanding `includeFiles`, and providing a one-time schema push mechanism. The Prisma Client initialization code also needs adjustment for serverless cold starts.

## Glossary

- **Bug_Condition (C)**: The Vercel serverless function is invoked but the Prisma Client runtime files are absent from the bundle and/or the database has no tables
- **Property (P)**: The serverless function initializes the Prisma Client successfully and performs database operations without errors
- **Preservation**: Local development, frontend build, TypeScript compilation, and existing API behavior remain unchanged
- **prisma generate**: CLI command that reads `schema.prisma` and outputs the generated client to `node_modules/.prisma/client/`
- **prisma db push**: CLI command that syncs the schema to the database without creating migration files (suitable for initial deploy)
- **includeFiles**: Vercel function config that specifies additional files to bundle into the serverless function beyond the entry point's imports
- **Cold start**: First invocation of a serverless function after deployment or idle timeout

## Bug Details

### Bug Condition

The bug manifests when the Vercel serverless function attempts to use PrismaClient but the generated runtime files are missing from the bundle, or the database has no tables to query.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type VercelDeploymentState
  OUTPUT: boolean
  
  missingGenerate := "prisma generate" NOT executed during build
  missingBundle := "node_modules/.prisma/client/**" NOT in includeFiles
  missingTables := production database has no tables matching schema
  
  RETURN (missingGenerate OR missingBundle) AND input.isAPIRequest
         OR (missingTables AND input.isAPIRequest AND input.requiresDBAccess)
END FUNCTION
```

### Examples

- **Example 1**: User calls `GET /api/periods` → serverless function starts → PrismaClient constructor runs → throws `@prisma/client did not initialize yet` because generated files are missing
- **Example 2**: User calls `POST /api/auth/register` → Prisma query executes → Postgres returns error `relation "User" does not exist` because tables were never created
- **Example 3**: User calls `GET /api/health` → responds `{ status: 'ok' }` (works because no Prisma usage, but only if the import of prisma.ts doesn't crash the module load)
- **Edge case**: Build succeeds on Vercel, function deploys, but first cold start fails because `@prisma/client` package exists (as dependency) but the generated runtime in `.prisma/client/` was never created

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Local `npm run dev` continues to start the backend on port 3001 with hot reload
- `npm run build -w packages/frontend` continues to produce a Vite bundle in `packages/frontend/dist/`
- `tsc` in the backend workspace continues to output JS to `packages/backend/dist/`
- Authenticated API requests continue to perform CRUD on periods, subjects, and grades
- Non-API frontend routes continue to serve the SPA via rewrite to `/index.html`

**Scope:**
All inputs that do NOT involve Vercel serverless deployment configuration should be completely unaffected by this fix. This includes:
- Local development workflow
- Frontend build process
- Backend TypeScript compilation (unchanged `tsc` command)
- Database schema itself (no model changes)
- Existing API route handlers logic

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Missing `prisma generate` in build pipeline**: The `buildCommand` in `vercel.json` runs `npm run build -w packages/backend` which only executes `tsc`. It never runs `prisma generate`, so the generated client at `node_modules/.prisma/client/` is either missing or stale on the Vercel build environment.

2. **Incomplete `includeFiles` configuration**: The current `includeFiles` is `"packages/backend/dist/**"` which only bundles the compiled JS. The Prisma Client runtime lives in `node_modules/.prisma/client/` and `node_modules/@prisma/client/`, both of which are excluded from the serverless function bundle.

3. **No database schema push to production**: The Neon PostgreSQL database was provisioned but `prisma db push` or `prisma migrate deploy` was never executed against it, so all tables are missing.

4. **Potential Prisma Client initialization pattern**: The current `prisma.ts` uses a global singleton pattern that caches the client in non-production. In serverless environments, each cold start creates a new PrismaClient instance. While this pattern is acceptable, the client cannot instantiate at all because the generated files are missing.

## Correctness Properties

Property 1: Bug Condition - Prisma Client Initializes on Vercel

_For any_ API request to the Vercel serverless function where the deployment was built with the fixed `buildCommand` and `includeFiles`, the PrismaClient SHALL initialize without errors and be ready to execute database queries.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Local Development and Build Unchanged

_For any_ local development command (`npm run dev`, `npm run build`, `tsc`) or frontend route access, the fixed configuration SHALL produce the same result as the original configuration, preserving all local workflows and frontend serving behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `vercel.json`

**Change 1: Add `prisma generate` to the build command**

Update `buildCommand` to run `prisma generate` in the backend workspace before compiling TypeScript:

```json
"buildCommand": "npm run build -w packages/shared && cd packages/backend && npx prisma generate && cd ../.. && npm run build -w packages/backend && npm run build -w packages/frontend"
```

Alternatively, using the workspace script approach:
```json
"buildCommand": "npm run build -w packages/shared && npm run db:generate -w packages/backend && npm run build -w packages/backend && npm run build -w packages/frontend"
```

The second approach is preferred because it uses the existing `db:generate` script defined in the backend package.json, which is cleaner and more maintainable.

**Change 2: Expand `includeFiles` to bundle Prisma Client runtime**

```json
"functions": {
  "api/index.ts": {
    "includeFiles": "packages/backend/dist/**,node_modules/.prisma/client/**,node_modules/@prisma/client/**,packages/backend/prisma/schema.prisma"
  }
}
```

Files needed:
- `node_modules/.prisma/client/**` — The generated Prisma Client runtime (query engine, DMMF, etc.)
- `node_modules/@prisma/client/**` — The `@prisma/client` package entry point
- `packages/backend/prisma/schema.prisma` — Schema file referenced by the client at runtime
- `packages/backend/dist/**` — Compiled backend JS (already present)

**File**: `packages/backend/src/lib/prisma.ts`

**Change 3: Optimize PrismaClient for serverless (optional but recommended)**

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

This explicitly passes the `DATABASE_URL` from environment variables, ensuring serverless environments pick up Vercel's env config correctly.

**File**: `packages/backend/package.json`

**Change 4: Add a `postinstall` script as a safety net (optional)**

```json
"scripts": {
  ...
  "postinstall": "prisma generate"
}
```

This ensures `prisma generate` runs after `npm install` on any environment, providing a fallback if the build command order changes.

**One-time manual step: Database schema push**

**Change 5: Push schema to production database**

This is a one-time manual operation (not an automated part of the build):

```bash
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require" npx prisma db push --schema=packages/backend/prisma/schema.prisma
```

Or using the workspace script:
```bash
DATABASE_URL="<neon-connection-string>" npm run db:push -w packages/backend
```

For future schema changes, `prisma db push` can be run manually or added as a deploy hook. Using `prisma migrate deploy` is a more robust option for production schema management long-term but requires setting up migrations first with `prisma migrate dev`.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code (via deployment simulation), then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Deploy the current (unfixed) code to Vercel and observe the error responses. Alternatively, simulate the build locally by running the exact `buildCommand` and inspecting what's present in the output.

**Test Cases**:
1. **Missing Generate Test**: Run `npm run build -w packages/backend` without `prisma generate` first, then check `node_modules/.prisma/client/` — expect it's empty/stale (will fail on unfixed code)
2. **Bundle Inspection Test**: Check if `node_modules/.prisma/client/libquery_engine-*` binary exists after build — expect it's not bundled (will fail on unfixed code)
3. **API Health Test on Deploy**: Call `GET /api/health` — may work since it doesn't use Prisma directly
4. **API Database Test on Deploy**: Call `GET /api/periods` with valid auth — expect 500 error with Prisma initialization failure (will fail on unfixed code)

**Expected Counterexamples**:
- PrismaClient throws `@prisma/client did not initialize yet` on any DB-accessing endpoint
- Possible causes confirmed: missing `prisma generate` step, missing bundle files

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (API requests to Vercel deployment), the fixed function initializes PrismaClient and serves responses.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := deployAndInvoke_fixed(input)
  ASSERT result.statusCode != 500
  ASSERT result.body NOT CONTAINS "@prisma/client did not initialize"
  ASSERT result.body NOT CONTAINS "relation does not exist"
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (local dev, frontend, non-API paths), the fixed configuration produces the same result as the original.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalBehavior(input) = fixedBehavior(input)
END FOR
```

**Testing Approach**: Manual verification and script-based testing because the bug is in deployment configuration (not runtime logic). Property-based testing is applicable to the Prisma Client initialization code change.

**Test Plan**: After applying the fix, verify all local workflows still work:

**Test Cases**:
1. **Local Dev Preservation**: Run `npm run dev -w packages/backend` and verify server starts on port 3001
2. **Local Build Preservation**: Run `npm run build -w packages/backend` and verify `dist/` output is unchanged
3. **Frontend Build Preservation**: Run `npm run build -w packages/frontend` and verify `dist/` output is produced
4. **Test Suite Preservation**: Run `npm test -w packages/backend` and verify all existing tests pass

### Unit Tests

- Test that `prisma.ts` exports a valid PrismaClient instance (mock-based)
- Test that the health endpoint responds without requiring Prisma
- Verify `db:generate` script runs without error in the backend workspace

### Property-Based Tests

- Generate random environment configurations (with/without `DATABASE_URL`) and verify PrismaClient initialization handles them gracefully
- Generate random API request paths and verify routing still directs them correctly (Vercel rewrites unchanged)

### Integration Tests

- Deploy to Vercel preview environment and verify:
  - `GET /api/health` returns 200
  - `POST /api/auth/register` creates a user successfully
  - `GET /api/periods` with auth token returns data
  - Frontend routes (`/`, `/login`, `/dashboard`) serve the SPA
- Verify the Vercel build logs show `prisma generate` executing
- Verify the function bundle size increased (indicating Prisma Client is included)
