# Bugfix Requirements Document

## Introduction

The application fails on Vercel production deployment with the error `@prisma/client did not initialize yet`. The root cause is threefold: (1) `prisma generate` is not run during the Vercel build, so the generated client files are missing at runtime; (2) the serverless function bundle does not include the generated Prisma Client files from `node_modules/.prisma/client/`; and (3) the database tables were never created in the Neon PostgreSQL production database. This results in a complete backend failure on every API request.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the Vercel build command runs (`npm run build -w packages/shared && npm run build -w packages/backend && npm run build -w packages/frontend`) THEN the system compiles TypeScript without first running `prisma generate`, resulting in a missing or stale Prisma Client at runtime

1.2 WHEN the serverless function is invoked on Vercel THEN the system throws `Error: @prisma/client did not initialize yet` because the generated Prisma Client files are not included in the function bundle via `functions.includeFiles`

1.3 WHEN an API request reaches the backend that requires database access THEN the system fails because no tables exist in the Neon production database (schema was never pushed/migrated)

### Expected Behavior (Correct)

2.1 WHEN the Vercel build command runs THEN the system SHALL execute `prisma generate` (from the backend workspace) before compiling the backend TypeScript, ensuring the Prisma Client is generated

2.2 WHEN the serverless function is bundled for deployment THEN the system SHALL include the generated Prisma Client files (`node_modules/.prisma/client/**`) and the Prisma schema in the function's `includeFiles` so the client can initialize at runtime

2.3 WHEN the production database is set up THEN the system SHALL provide a mechanism (script or documented command) to push the Prisma schema to the Neon database so that all required tables exist before the application serves requests

### Unchanged Behavior (Regression Prevention)

3.1 WHEN running the application locally with `npm run dev` THEN the system SHALL CONTINUE TO start the backend and serve API requests normally

3.2 WHEN running the frontend build (`npm run build -w packages/frontend`) THEN the system SHALL CONTINUE TO produce a valid Vite production bundle in `packages/frontend/dist`

3.3 WHEN the API receives authenticated requests with valid data THEN the system SHALL CONTINUE TO perform CRUD operations on periods, subjects, and grades correctly

3.4 WHEN the backend TypeScript is compiled (`tsc` in the backend workspace) THEN the system SHALL CONTINUE TO output JavaScript files to `packages/backend/dist/`

3.5 WHEN the frontend routes are accessed (non-API paths) THEN the system SHALL CONTINUE TO serve the SPA via the rewrite to `/index.html`
