# Login and Subject Edit Fixes — Bugfix Design

## Overview

Two bugs prevent core workflows from functioning. Bug 1: After login, the `useEffect` watching `token` fires a `/auth/me` call that can fail (cold start, timeout) and silently wipes the freshly-set token; additionally the Axios 401 interceptor races with the login flow and clears credentials. Bug 2: The backend `updateSubjectSchema` only validates `name`, and the PUT handler only persists `name`, so structural edits (composite toggle, component changes) are silently dropped.

The fix strategy is:
- **Bug 1**: Introduce an `isAuthenticating` ref so the verification `useEffect` skips when the token was set by login/register. Guard the Axios 401 interceptor so it doesn't fire during active authentication.
- **Bug 2**: Expand `updateSubjectSchema` to accept `isComposite` and `components` with the same composite validation as create. Update the PUT handler to persist structural changes (delete old components, create new ones).

## Glossary

- **Bug_Condition (C)**: The set of inputs/states that trigger the defective behavior — either a login attempt with valid credentials, or a subject edit that includes structural fields.
- **Property (P)**: The desired correct behavior — login completes without silent token wipe; subject structural edits persist to the database.
- **Preservation**: Existing behaviors that must remain unchanged — registration flow, 401 session expiration for non-login requests, name-only subject edits, subject creation, subject deletion.
- **AuthContext**: The React context in `contexts/AuthContext.tsx` that manages user/token state and provides login/register/logout.
- **apiClient interceptor**: The Axios response interceptor in `api/client.ts` that clears credentials on 401.
- **updateSubjectSchema**: Zod schema in `validators/schemas.ts` that validates the PUT `/subjects/:id` request body.
- **isComposite**: Boolean flag on `Subject` model indicating whether the subject has multiple weighted components.

## Bug Details

### Bug Condition

The bugs manifest in two distinct scenarios:

**Bug 1 — Login race condition**: When a user logs in with valid credentials, `login()` sets the token via `setToken()`, which triggers the `useEffect` dependency on `token`. The effect calls `/auth/me`, and if that request fails (network issue, Vercel cold start timeout), it clears the token and user from state and localStorage. Simultaneously, the Axios 401 interceptor can receive a 401 from the racing `/me` call and redirect to `/login`.

**Bug 2 — Subject edit not persisted**: When a user edits a subject's structure (changes `isComposite` or `components`), the frontend sends the full payload but the backend `updateSubjectSchema` strips everything except `name`, and the PUT handler only persists `name`.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { action: string, payload: any, context: AppState }
  OUTPUT: boolean

  // Bug 1: Login race condition
  IF input.action == "LOGIN" OR input.action == "REGISTER"
    RETURN input.payload.credentials ARE valid
           AND tokenSetTriggersUseEffect(input.context)
           AND (meRequestCanFail() OR interceptorCanFire401())

  // Bug 2: Subject edit not persisted
  IF input.action == "UPDATE_SUBJECT"
    RETURN input.payload HAS ("isComposite" OR "components")
           AND backendStripsStructuralFields(input.payload)

  RETURN false
END FUNCTION
```

### Examples

- **Login Bug**: User registers → logs out → logs in with same credentials → token is set → useEffect fires `/me` → Vercel cold start causes timeout → catch block clears token → user remains on login page with no error
- **Login Bug (interceptor race)**: User logs in → token set → `/me` fired → returns 401 before new token is attached → interceptor clears localStorage and redirects to `/login`
- **Subject Edit Bug**: User opens EditSubjectModal → toggles isComposite to true → adds 2 components (60%/40%) → saves → backend responds 200 but only updates name → page reload shows original simple subject
- **Subject Edit Bug (weight change)**: User changes component weights from 60/40 to 70/30 → saves → backend ignores components field → reload shows 60/40

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Registration flow must continue to create account, set token, and navigate to home
- The Axios request interceptor must continue to attach Bearer tokens to all authenticated requests
- When a 401 occurs outside the login/register flow (expired session), the interceptor must continue to clear localStorage and redirect to `/login`
- Name-only subject edits (`{ name: "New Name" }`) must continue to update and return the subject
- Creating new composite subjects with `POST` must continue to validate and persist correctly
- Deleting a subject must continue to cascade-delete components and grades
- Grade CRUD operations must remain unaffected

**Scope:**
All inputs that do NOT involve (a) a token being set by login/register while the useEffect is watching, or (b) a subject update payload containing `isComposite`/`components` fields should be completely unaffected by this fix. This includes:
- Normal page refreshes with existing valid token (useEffect verifies correctly)
- API calls with expired tokens (401 interceptor works as before)
- Creating new subjects
- Updating only subject names
- All grade operations

## Hypothesized Root Cause

Based on the code analysis, the confirmed root causes are:

1. **Login Race — useEffect depends on `token`**: In `AuthContext.tsx`, the `useEffect` has `[token]` as a dependency. When `login()` calls `setToken(response.token)`, React re-renders and the effect fires `authService.me()`. If that call fails for any reason, the catch block wipes the token. The user just logged in successfully but the verification undoes it.

2. **Login Race — No guard on interceptor**: In `client.ts`, the 401 interceptor unconditionally clears localStorage and redirects. During login, if the `/me` call races and gets a 401 (because the request was made before the new token was stored or attached), the interceptor fires and destroys the session.

3. **Subject Edit — Schema strips fields**: `updateSubjectSchema` in `schemas.ts` is `z.object({ name: z.string().optional() })`. Zod's default behavior strips unknown keys, so `isComposite` and `components` are removed from `req.body` before the handler sees them.

4. **Subject Edit — Handler ignores structure**: The PUT handler in `subjects.ts` destructures only `{ name }` from `req.body` and calls `prisma.subject.update({ data: { name } })`, never touching components.

## Correctness Properties

Property 1: Bug Condition — Login completes without silent token wipe

_For any_ login or register call with valid credentials, the fixed AuthContext SHALL set the token and user from the login/register response and NOT trigger a secondary `/me` verification that could clear them. The user SHALL be navigated to the home page with authentication intact.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition — Subject structural edits persist

_For any_ subject update request containing `isComposite` and/or `components` fields with valid data (at least 2 components summing to 100% for composite), the fixed backend SHALL validate and persist the structural changes to the database, returning the updated subject with its new components.

**Validates: Requirements 2.3, 2.4**

Property 3: Preservation — Non-login 401 handling unchanged

_For any_ authenticated API request that receives a 401 response outside of the login/register flow, the fixed interceptor SHALL continue to clear localStorage and redirect to `/login`, preserving existing session-expiration behavior.

**Validates: Requirements 3.2, 3.3**

Property 4: Preservation — Name-only subject updates unchanged

_For any_ subject update request containing only a `name` field (no `isComposite`, no `components`), the fixed backend SHALL update only the name and return the subject with its existing components intact, producing the same result as the original code.

**Validates: Requirements 3.4**

Property 5: Preservation — Registration flow unchanged

_For any_ registration with valid credentials, the fixed code SHALL create the account, store the token, set the user, and navigate to home, exactly as before.

**Validates: Requirements 3.1**

## Fix Implementation

### Changes Required

#### Bug 1: Login Race Condition

**File**: `packages/frontend/src/contexts/AuthContext.tsx`

**Specific Changes**:
1. **Add `isAuthenticating` ref**: Create a `useRef(false)` that login/register set to `true` before calling the API and reset after setting state.
2. **Guard useEffect**: The verification effect checks `isAuthenticating.current` — if true, skip the `/me` call and just set loading to false.
3. **Separate initial verification from token-change reaction**: Change the useEffect to only run on mount (empty deps or a dedicated `initialToken` state), not on every `token` change. Login/register already set the user from the response, so no secondary verification is needed.

**File**: `packages/frontend/src/api/client.ts`

**Specific Changes**:
4. **Export an `isAuthenticating` flag or use a request URL check**: The interceptor should skip the 401 clear/redirect when the failed request URL is `/auth/login`, `/auth/register`, or `/auth/me`. Alternatively, export a mutable flag from AuthContext that the interceptor reads.
5. **Simplest approach**: Check `error.config.url` — if it matches `/auth/me`, `/auth/login`, or `/auth/register`, don't clear credentials or redirect. This prevents the interceptor from interfering with auth flows while still handling expired sessions on other endpoints.

#### Bug 2: Subject Edit Not Persisted

**File**: `packages/backend/src/validators/schemas.ts`

**Specific Changes**:
1. **Expand `updateSubjectSchema`**: Add `isComposite` (optional boolean) and `components` (optional array of `componentSchema`) with the same `.refine()` validations as `createSubjectSchema`:
   - If `isComposite` is `true`, require at least 2 components summing to 100%.
   - If `isComposite` is `false` or not provided, components are ignored.

**File**: `packages/backend/src/routes/subjects.ts`

**Specific Changes**:
2. **Destructure additional fields**: Extract `isComposite` and `components` from `req.body` alongside `name`.
3. **Handle structural changes**: If `isComposite` is provided in the payload:
   - Delete all existing `SubjectComponent` records for the subject (cascade deletes their grades).
   - If converting to composite (`isComposite: true`): create new components from payload.
   - If converting to simple (`isComposite: false`): create a single "General" component with 100% weight.
   - Update the subject's `isComposite` flag.
4. **Handle component-only changes**: If `components` is provided but `isComposite` doesn't change (subject stays composite), replace existing components with new ones.
5. **Return full subject**: Include components and grades in the response (already done via the `include` clause).

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate the login race condition and subject edit flow on the UNFIXED code to observe failures and confirm root causes.

**Test Cases**:
1. **Login useEffect race**: Mock `authService.me()` to reject → call `login()` with valid credentials → assert user/token are cleared (will demonstrate bug on unfixed code)
2. **Interceptor 401 during login**: Simulate a 401 response on `/auth/me` → assert localStorage is cleared and redirect happens (will demonstrate interceptor race)
3. **Subject edit with structural fields**: Send PUT `/subjects/:id` with `{ name, isComposite: true, components: [...] }` → assert response still shows old structure (will demonstrate schema stripping)
4. **Subject edit component weight change**: Send PUT with only `components` changed → assert response shows old weights (will demonstrate handler ignoring fields)

**Expected Counterexamples**:
- Login: token and user get cleared after successful login API call
- Subject: PUT returns 200 but `isComposite` and `components` remain at original values
- Possible causes confirmed: useEffect dependency on token, Zod stripping unknown fields, handler only updating `name`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  IF input.action == "LOGIN":
    result := authContext_fixed.login(input.credentials)
    ASSERT result.token IS SET
    ASSERT result.user IS SET
    ASSERT localStorage.token == result.token
    ASSERT no redirect to /login occurred

  IF input.action == "UPDATE_SUBJECT" AND hasStructuralFields(input.payload):
    result := putSubject_fixed(input.subjectId, input.payload)
    ASSERT result.isComposite == input.payload.isComposite
    ASSERT result.components MATCHES input.payload.components
    ASSERT database reflects new structure
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed functions produce the same result as the original.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  IF input.action == "API_CALL_401" AND NOT isAuthFlow(input):
    ASSERT interceptor_fixed(input) == interceptor_original(input)
    // Still clears localStorage and redirects

  IF input.action == "UPDATE_SUBJECT" AND onlyHasName(input.payload):
    ASSERT putSubject_fixed(input) == putSubject_original(input)
    // Only name updated, components unchanged

  IF input.action == "REGISTER":
    ASSERT register_fixed(input) == register_original(input)
    // Registration still works identically
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many combinations of valid/invalid payloads to verify schema behavior
- It catches edge cases around partial payloads (only name, only components, etc.)
- It provides strong guarantees that the 401 interceptor still works for non-auth endpoints

**Test Plan**: Observe behavior on UNFIXED code first for name-only updates and 401 handling, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Name-only update preservation**: Verify updating only `name` continues to work and returns subject with existing components unchanged
2. **401 interceptor preservation**: Verify that 401 on non-auth endpoints still clears credentials and redirects
3. **Registration preservation**: Verify register flow still sets token/user and navigates to home
4. **Subject creation preservation**: Verify POST still creates composite/simple subjects correctly
5. **Subject deletion preservation**: Verify DELETE still cascades correctly

### Unit Tests

- Test AuthContext login/register don't trigger secondary verification
- Test Axios interceptor skips 401 handling for auth-related URLs
- Test Axios interceptor still fires for non-auth 401s
- Test `updateSubjectSchema` accepts `isComposite` and `components`
- Test `updateSubjectSchema` validates component weights sum to 100%
- Test `updateSubjectSchema` requires ≥2 components when composite
- Test `updateSubjectSchema` still accepts name-only payloads
- Test PUT handler persists structural changes to database
- Test PUT handler creates default "General" component when converting composite→simple

### Property-Based Tests

- Generate random valid component arrays (≥2, weights sum to 100%) and verify PUT persists them
- Generate random partial payloads (name-only, components-only, both) and verify correct behavior
- Generate random sequences of login→API call→logout and verify no race conditions
- Generate random subject structures and verify round-trip (edit→reload→same structure)

### Integration Tests

- Test full login flow: register → logout → login → verify dashboard loads
- Test full subject edit flow: create composite → edit weights → reload → verify persistence
- Test conversion flow: create simple → edit to composite → reload → verify components exist
- Test reverse conversion: create composite → edit to simple → reload → verify single component
- Test concurrent login scenario: login while `/me` is in-flight → verify no credential wipe
