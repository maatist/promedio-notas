# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Prisma Client Missing Generate Causes Initialization Failure
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists in the Vercel deployment configuration
  - **Scoped PBT Approach**: Scope the property to the concrete failing cases: (1) verify `prisma generate` is NOT in the current buildCommand, (2) verify `node_modules/.prisma/client/**` is NOT in includeFiles
  - Write a property-based test that reads `vercel.json` and asserts:
    - The `buildCommand` includes a `prisma generate` step before backend compilation
    - The `functions["api/index.ts"].includeFiles` includes `node_modules/.prisma/client/**`
    - The `functions["api/index.ts"].includeFiles` includes `node_modules/@prisma/client/**`
    - The `functions["api/index.ts"].includeFiles` includes `packages/backend/prisma/schema.prisma`
  - For each generated configuration variant (with/without prisma generate, with/without includeFiles), assert that deployment readiness holds only when both conditions are met
  - Run test on UNFIXED code - expect FAILURE (this confirms the bug exists: buildCommand lacks prisma generate, includeFiles lacks Prisma runtime)
  - Document counterexamples found (e.g., "buildCommand does not contain 'prisma generate'", "includeFiles only contains 'packages/backend/dist/**'")
  - _Requirements: 1.1, 1.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Local Development and Build Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: `vercel.json` rewrites array routes `/api/(.*)` to `/api/index.ts` and non-API routes to `/index.html`
  - Observe: `vercel.json` outputDirectory is `packages/frontend/dist`
  - Observe: `vercel.json` framework is `vite`
  - Observe: backend `build` script in `packages/backend/package.json` is `tsc` (unchanged)
  - Observe: backend `dev` script is `tsx watch src/index.ts` (unchanged)
  - Observe: frontend build produces output to `packages/frontend/dist` (unchanged)
  - Write property-based test that for any valid vercel.json configuration (after fix):
    - The `rewrites` array still contains the API rewrite `{ source: "/api/(.*)", destination: "/api/index.ts" }`
    - The `rewrites` array still contains the SPA rewrite `{ source: "/((?!api/).*)", destination: "/index.html" }`
    - The `outputDirectory` is still `packages/frontend/dist`
    - The `framework` is still `vite`
    - The `buildCommand` still includes `npm run build -w packages/shared`, `npm run build -w packages/backend`, and `npm run build -w packages/frontend`
    - The backend `package.json` `build` script remains `tsc`
    - The backend `package.json` `dev` script remains `tsx watch src/index.ts`
  - Verify tests PASS on UNFIXED code (confirms baseline behavior to preserve)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for Prisma Client Vercel initialization failure

  - [x] 3.1 Update `vercel.json` buildCommand to include `prisma generate`
    - Change buildCommand to: `"npm run build -w packages/shared && npm run db:generate -w packages/backend && npm run build -w packages/backend && npm run build -w packages/frontend"`
    - This runs `prisma generate` via the existing `db:generate` script before compiling TypeScript
    - Ensures the generated Prisma Client is available at `node_modules/.prisma/client/` during build
    - _Bug_Condition: isBugCondition(input) where "prisma generate" NOT executed during build_
    - _Expected_Behavior: buildCommand includes prisma generate step before backend compilation_
    - _Preservation: buildCommand still includes shared, backend, and frontend builds in correct order_
    - _Requirements: 2.1_

  - [x] 3.2 Update `vercel.json` includeFiles to bundle Prisma Client runtime
    - Change `functions["api/index.ts"].includeFiles` to: `"packages/backend/dist/**,node_modules/.prisma/client/**,node_modules/@prisma/client/**,packages/backend/prisma/schema.prisma"`
    - This ensures the serverless function bundles the generated Prisma Client runtime, the @prisma/client package, and the schema file
    - _Bug_Condition: isBugCondition(input) where "node_modules/.prisma/client/**" NOT in includeFiles_
    - _Expected_Behavior: includeFiles bundles all Prisma Client runtime files needed for initialization_
    - _Preservation: includeFiles still contains packages/backend/dist/**_
    - _Requirements: 2.2_

  - [x] 3.3 Update `packages/backend/src/lib/prisma.ts` to explicitly pass DATABASE_URL
    - Add `datasources: { db: { url: process.env.DATABASE_URL } }` to PrismaClient constructor
    - This ensures serverless cold starts pick up Vercel environment variables correctly
    - _Bug_Condition: PrismaClient may not resolve DATABASE_URL in serverless environments without explicit config_
    - _Expected_Behavior: PrismaClient uses DATABASE_URL from environment on every cold start_
    - _Preservation: Local dev still uses DATABASE_URL from .env via dotenv_
    - _Requirements: 2.1, 2.2_

  - [x] 3.4 Add `postinstall` script to `packages/backend/package.json`
    - Add `"postinstall": "prisma generate"` to scripts
    - This acts as a safety net: ensures prisma generate runs after npm install on any environment
    - _Preservation: Does not affect any existing scripts or build commands_
    - _Requirements: 2.1_

  - [x] 3.5 Document the one-time `prisma db push` command for production database setup
    - Add a section to the project README or create a deployment script documenting:
      `DATABASE_URL="<neon-connection-string>" npx prisma db push --schema=packages/backend/prisma/schema.prisma`
    - This creates the required tables in the Neon PostgreSQL production database
    - _Bug_Condition: isBugCondition(input) where production database has no tables matching schema_
    - _Expected_Behavior: All tables exist in production DB before serving requests_
    - _Requirements: 2.3_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Prisma Client Initializes on Vercel
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (buildCommand includes prisma generate, includeFiles includes Prisma runtime)
    - When this test passes, it confirms the deployment configuration bug is fixed
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Local Development and Build Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all rewrites, outputDirectory, framework, and existing scripts are unchanged
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run `npm test -w packages/backend` and verify all existing tests still pass
  - Verify exploration test (Property 1) passes after fix
  - Verify preservation tests (Property 2) pass after fix
  - Ensure no regressions in local build workflow
  - Ask the user if questions arise
