# Implementation Plan

## Phase 0: Database & Shared Types

- [x] 1. Update Prisma schema and shared types
  - Add `email String? @unique` to User model
  - Change `passwordHash String` to `passwordHash String?` (nullable)
  - Add `googleId String? @unique` to User model
  - Add `authProvider String @default("local")` to User model
  - Create `PasswordResetToken` model with id, userId, token (unique), expiresAt, used, createdAt, and relation to User
  - Update `packages/shared/src/types.ts`: add `email: string | null` and `authProvider: string` to User interface
  - Run `prisma db push` to apply schema changes
  - _Requirements: 1, 10_

## Phase 1: Email + Password Recovery (Backend)

- [x] 2. Update registration to accept optional email
  - In `packages/backend/src/validators/schemas.ts`: add `email: z.string().email().optional()` to `registerSchema`
  - In `packages/backend/src/routes/auth.ts` POST /register: extract `email` from req.body, include in user creation
  - Handle unique constraint error on email (return 409)
  - Update login and /me responses to include `email` and `authProvider` fields
  - _Requirements: 1, 10_

- [x] 3. Create profile update endpoint
  - Create validator: `updateProfileSchema` with `email: z.string().email().optional()`
  - Add `PUT /api/auth/profile` route in auth.ts (authenticated)
  - Logic: validate email format, check uniqueness, update user record
  - Return updated user object
  - _Requirements: 2_

- [x] 4. Create email service with Resend
  - Install `resend` package in backend
  - Create `packages/backend/src/lib/email.ts` with Resend client
  - Implement `sendPasswordResetEmail(to, resetUrl)` function
  - Create HTML email template and plain-text fallback
  - Handle missing RESEND_API_KEY gracefully (log warning)
  - _Requirements: 11, 12_

- [x] 5. Create forgot-password endpoint
  - Create validator: `forgotPasswordSchema` with `email: z.string().email()`
  - Add `POST /api/auth/forgot-password` route (public, rate-limited: 3 per 15 min)
  - Logic: find user by email, generate UUID token, store PasswordResetToken, send email
  - Always return 200 (no email enumeration)
  - _Requirements: 3_

- [x] 6. Create reset-password endpoint
  - Create validator: `resetPasswordSchema` with `token: z.string().uuid()` and `password: z.string().min(6).max(100)`
  - Add `POST /api/auth/reset-password` route (public)
  - Logic: find token, check not used and not expired, hash password, update user, mark token used
  - If user was Google-only, update authProvider to "both"
  - _Requirements: 4, 6_

## Phase 1: Email + Password Recovery (Frontend)

- [x] 7. Add translations for all new UI
  - Add all new translation keys to `packages/frontend/src/i18n/translations.ts`
  - Keys for: profile, forgotPassword, resetPassword, google, emailPrompt sections
  - Add types to TranslationKeys interface
  - _Requirements: 9_

- [x] 8. Update AuthContext with new methods
  - Add `loginWithGoogle(credential: string)` method
  - Add `updateProfile(data: { email?: string })` method
  - Update User type usage to include email and authProvider
  - Update register to accept optional email parameter
  - _Requirements: 2, 5, 13_

- [x] 9. Create ForgotPasswordPage
  - Create `packages/frontend/src/pages/ForgotPasswordPage.tsx`
  - Email input form, submit button, success/error states
  - Link back to login
  - Add route `/forgot-password` in App.tsx
  - Add "Forgot password?" link on LoginPage
  - _Requirements: 3_

- [x] 10. Create ResetPasswordPage
  - Create `packages/frontend/src/pages/ResetPasswordPage.tsx`
  - Read token from URL query params
  - New password + confirm password form
  - Submit → POST /auth/reset-password
  - Success → redirect to login with success message
  - Error → show invalid/expired token message
  - Add route `/reset-password` in App.tsx
  - _Requirements: 4_

- [x] 11. Create EmailPromptModal
  - Create `packages/frontend/src/components/EmailPromptModal.tsx`
  - Shows after login if `user.email === null`
  - Email input + Save button + Skip button
  - On save: call updateProfile, dismiss
  - On skip: set sessionStorage flag, dismiss
  - Check sessionStorage `emailPromptDismissed` to prevent re-showing
  - Integrate in DashboardPage (show when user loads dashboard without email)
  - _Requirements: 13_

- [x] 12. Create ProfileSection/Modal
  - Create profile UI (modal or section accessible from navbar)
  - Show current email, allow editing
  - Save button calls PUT /api/auth/profile
  - Show success/error feedback
  - _Requirements: 2_

- [x] 13. Update LoginPage with "Forgot Password" link
  - Add link below the login form: "¿Olvidaste tu contraseña?" / "Forgot your password?"
  - Links to /forgot-password
  - _Requirements: 3_

- [x] 14. Update registration form with optional email field
  - Add email input (optional) to register tab on LoginPage
  - Pass email to register function
  - _Requirements: 1_

## Phase 2: Google Sign-In (Backend)

- [x] 15. Install google-auth-library and create Google auth endpoint
  - Install `google-auth-library` in backend
  - Create `POST /api/auth/google` route in auth.ts
  - Validate GOOGLE_CLIENT_ID env var
  - Logic: verify ID token, extract sub/email/name
  - If user exists with googleId → issue JWT
  - If user exists with same email → link Google, issue JWT
  - If new → create user, issue JWT
  - Auto-generate username from email/name (ensure uniqueness)
  - _Requirements: 5, 6_

## Phase 2: Google Sign-In (Frontend)

- [x] 16. Install @react-oauth/google and add GoogleSignInButton
  - Install `@react-oauth/google` in frontend
  - Wrap app with `GoogleOAuthProvider` in main.tsx (clientId from env)
  - Create GoogleSignInButton component using `GoogleLogin` component
  - On success: call loginWithGoogle in AuthContext
  - On error: show toast
  - _Requirements: 5_

- [x] 17. Add Google button to LoginPage
  - Add separator ("o" / "or") between form and Google button
  - Place GoogleSignInButton below the separator
  - Style consistently with existing design
  - _Requirements: 5_

## Phase 3: PWA Enhancement

- [x] 18. Create PWA manifest and icons
  - Create `packages/frontend/public/manifest.json` with app name, colors, display: standalone
  - Create/generate app icons (192x192, 512x512) in `packages/frontend/public/icons/`
  - Add `<link rel="manifest">` to index.html
  - Add meta tags: theme-color, apple-mobile-web-app-capable, apple-mobile-web-app-status-bar-style, apple-touch-icon
  - _Requirements: 7_

- [x] 19. Create and register Service Worker
  - Create `packages/frontend/public/sw.js` with cache-first strategy for app shell
  - Skip API requests (always network)
  - Cache cleanup on activation (remove old caches)
  - Register service worker in main.tsx on page load
  - _Requirements: 8_

## Phase 4: Environment & Documentation

- [x] 20. Update environment configuration
  - Add RESEND_API_KEY, GOOGLE_CLIENT_ID, FRONTEND_URL to `.env.example`
  - Add VITE_GOOGLE_CLIENT_ID to frontend `.env.example` (for GoogleOAuthProvider)
  - Add environment variables to Vercel project settings (document in README)
  - _Requirements: 11_

- [x] 21. Final verification and build check
  - Run `npx tsc --noEmit` in both backend and frontend
  - Run full test suite
  - Verify all new pages render correctly
  - Test forgot/reset password flow end-to-end
  - Test Google sign-in flow
  - Test PWA installability (manifest validation)
  - Verify email prompt appears for users without email
  - _Requirements: All_
