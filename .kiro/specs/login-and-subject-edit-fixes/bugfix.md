# Bugfix Requirements Document

## Introduction

Two related bugs prevent core user workflows from functioning correctly in the grade-tracking app. First, login fails silently for existing accounts — after registering and logging out, attempting to log back in leaves the user stuck on the login page without any error. Second, editing a subject's structure (converting simple to composite, or changing component weights) appears to succeed in the UI but never persists to the backend, reverting on page reload. Both bugs result in data loss or access loss for the user.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user logs in with valid credentials THEN the system sets the token in state, which triggers a `useEffect` that calls `/api/auth/me`, and if that verification request fails (network timeout, Vercel cold start), the token and user are silently cleared from localStorage, leaving the user on the login page with no error message

1.2 WHEN a user logs in with valid credentials and the Axios response interceptor receives a 401 from any in-flight request during the login/token-verification race THEN the interceptor clears localStorage and redirects to `/login`, undoing the successful login

1.3 WHEN a user edits a subject to change `isComposite` or `components` (e.g., converting simple to composite, adding/removing components, changing weights) THEN the backend `updateSubjectSchema` strips those fields from the request body because it only validates `{ name?: string }`

1.4 WHEN a user edits a subject's structure THEN the backend PUT `/api/subjects/:id` handler only updates the `name` field and ignores `isComposite` and `components`, so the structural changes are never persisted to the database

### Expected Behavior (Correct)

2.1 WHEN a user logs in with valid credentials THEN the system SHALL store the token, set the user from the login response, and navigate to the home page without requiring a secondary `/me` verification call to confirm the login

2.2 WHEN a user is in the process of logging in THEN the Axios 401 interceptor SHALL NOT clear the freshly-set token or redirect away from the current navigation, allowing the login flow to complete without interference

2.3 WHEN a user edits a subject and sends `isComposite` and `components` in the request body THEN the backend validation schema SHALL accept and validate those fields (requiring at least 2 components summing to 100% weight for composite subjects)

2.4 WHEN a user edits a subject's structure (changing `isComposite` or `components`) THEN the backend PUT handler SHALL persist the structural changes to the database, including creating/updating/deleting components as needed

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user registers a new account THEN the system SHALL CONTINUE TO create the account, generate a token, store it, and navigate to the home page

3.2 WHEN a user makes an authenticated API call with a valid token THEN the Axios interceptor SHALL CONTINUE TO attach the Bearer token header to the request

3.3 WHEN an authenticated request receives a 401 response outside of the login flow THEN the interceptor SHALL CONTINUE TO clear localStorage and redirect to the login page (session expiration behavior)

3.4 WHEN a user edits only the subject name (without changing composite structure) THEN the backend SHALL CONTINUE TO update the name and return the updated subject

3.5 WHEN a user creates a new composite subject with components THEN the system SHALL CONTINUE TO validate and persist the subject with its components correctly

3.6 WHEN a user deletes a subject THEN the system SHALL CONTINUE TO delete the subject and all its associated components and grades
