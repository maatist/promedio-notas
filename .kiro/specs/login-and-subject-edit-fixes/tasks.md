# Implementation Plan

- [x] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - Login Race and Subject Edit Structural Fields Ignored
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior - they will validate the fix when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate both bugs exist
  - **Scoped PBT Approach**: Scope the properties to the concrete failing cases for reproducibility
  - Test 1a — Login useEffect race: Mock `authService.me()` to reject after `login()` sets the token → assert that the token and user remain set (NOT cleared). On unfixed code, the useEffect catch block clears them, so test FAILS.
  - Test 1b — Interceptor 401 during auth: Simulate a 401 response on `/auth/me` during login flow → assert localStorage is NOT cleared and no redirect to `/login` occurs. On unfixed code, interceptor fires unconditionally, so test FAILS.
  - Test 1c — Subject edit structural fields: Send PUT `/subjects/:id` with `{ name, isComposite: true, components: [{name:"Exam",weight:60},{name:"Homework",weight:40}] }` → assert response includes updated `isComposite` and `components`. On unfixed code, schema strips fields and handler ignores them, so test FAILS.
  - Test 1d — Subject component weight change: Send PUT with only `components` weights changed → assert response shows new weights. On unfixed code, handler only updates `name`, so test FAILS.
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct - it proves the bugs exist)
  - Document counterexamples found to understand root cause
  - Mark task complete when tests are written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Bug-Condition Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - **GOAL**: Capture current correct behavior that must remain unchanged after the fix
  - Observe behavior on UNFIXED code for non-buggy inputs, then write tests asserting that observed behavior
  - Test 2a — Name-only subject update: PUT `/subjects/:id` with `{ name: "New Name" }` → observe subject name updates correctly and components remain unchanged. Write property-based test: for all valid name strings, name-only update preserves existing components.
  - Test 2b — 401 on non-auth endpoint clears credentials: Simulate 401 response on a non-auth endpoint (e.g., `/api/subjects`, `/api/grades`) → observe localStorage is cleared and redirect to `/login`. Write test asserting this behavior for any non-auth endpoint path.
  - Test 2c — Registration flow works correctly: Call register with valid credentials → observe token is stored, user is set, navigation to home occurs. Write test asserting full registration flow completes.
  - Test 2d — Subject creation works correctly: POST `/subjects` with composite payload → observe subject is created with components. Write test asserting creation with valid component arrays (≥2, weights sum to 100%) persists correctly.
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for login race condition and subject edit structural fields

  - [x] 3.1 Fix AuthContext — guard useEffect against login/register token changes
    - Add `isAuthenticating` ref (`useRef(false)`) to AuthContext
    - Set `isAuthenticating.current = true` before calling login/register API
    - Reset `isAuthenticating.current = false` after setting token and user from response
    - Guard the useEffect: if `isAuthenticating.current` is true, skip the `/me` call
    - Change useEffect to only verify token on mount (not on every token change)
    - _Bug_Condition: isBugCondition(input) where input.action == "LOGIN" AND tokenSetTriggersUseEffect_
    - _Expected_Behavior: Token and user remain set after login/register, no secondary /me call interferes_
    - _Preservation: Registration flow must still work identically (sets token, user, navigates)_
    - _Requirements: 2.1, 2.2, 3.1_

  - [x] 3.2 Fix Axios interceptor — skip 401 clear/redirect for auth endpoints
    - In `packages/frontend/src/api/client.ts`, modify the 401 response interceptor
    - Check `error.config.url` — if it matches `/auth/me`, `/auth/login`, or `/auth/register`, do NOT clear localStorage or redirect
    - For all other endpoints receiving 401, continue to clear localStorage and redirect to `/login`
    - _Bug_Condition: isBugCondition(input) where interceptorCanFire401() during login flow_
    - _Expected_Behavior: Interceptor does not interfere with auth flow requests_
    - _Preservation: 401 on non-auth endpoints still clears credentials and redirects_
    - _Requirements: 2.2, 3.2, 3.3_

  - [x] 3.3 Expand updateSubjectSchema — add isComposite and components validation
    - In `packages/backend/src/validators/schemas.ts`, expand `updateSubjectSchema`
    - Add `isComposite` as optional boolean (`z.boolean().optional()`)
    - Add `components` as optional array of `componentSchema` (`z.array(componentSchema).optional()`)
    - Add `.refine()` validation: if `isComposite` is `true`, require at least 2 components with weights summing to 100%
    - Ensure name-only payloads (`{ name: "..." }`) still pass validation
    - _Bug_Condition: isBugCondition(input) where input.action == "UPDATE_SUBJECT" AND payload HAS structural fields_
    - _Expected_Behavior: Schema accepts and validates isComposite and components fields_
    - _Preservation: Name-only payloads continue to validate correctly_
    - _Requirements: 2.3, 3.4_

  - [x] 3.4 Fix PUT /api/subjects/:id handler — persist structural changes
    - In `packages/backend/src/routes/subjects.ts`, update the PUT handler
    - Destructure `isComposite` and `components` from `req.body` alongside `name`
    - If `isComposite` is provided in payload:
      - Delete all existing `SubjectComponent` records for the subject
      - If `isComposite: true`: create new components from payload array
      - If `isComposite: false`: create a single "General" component with 100% weight
      - Update the subject's `isComposite` flag in database
    - If only `components` is provided (subject stays composite): replace existing components with new ones
    - Return full subject with components and grades in response
    - _Bug_Condition: isBugCondition(input) where backendStripsStructuralFields(input.payload)_
    - _Expected_Behavior: Structural changes persist to database, response reflects new structure_
    - _Preservation: Name-only updates still only update name, components unchanged_
    - _Requirements: 2.3, 2.4, 3.4_

  - [x] 3.5 Verify bug condition exploration tests now PASS
    - **Property 1: Expected Behavior** - Login Race and Subject Edit Structural Fields
    - **IMPORTANT**: Re-run the SAME tests from task 1 - do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms the expected behavior is satisfied
    - Run bug condition exploration tests from step 1
    - **EXPECTED OUTCOME**: Tests PASS (confirms bugs are fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.6 Verify preservation tests still PASS
    - **Property 2: Preservation** - Non-Bug-Condition Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite (`vitest --run` in both backend and frontend workspaces)
  - Ensure all bug condition exploration tests pass (bugs are fixed)
  - Ensure all preservation tests pass (no regressions)
  - Ensure no other existing tests have broken
  - Ask the user if questions arise
