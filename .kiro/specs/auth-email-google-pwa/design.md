# Technical Design: Auth, Email Recovery, Google Sign-In & PWA

## Overview

This design covers three major capabilities added to the promedio-notas application: (1) email-based password recovery, (2) Google OAuth authentication, and (3) PWA enhancements. The implementation follows a phased approach where Phase 1 (email + recovery) establishes the foundation for Phase 2 (Google sign-in), and the PWA enhancement runs in parallel.

## Architecture

### System Context

```
┌─────────────────┐     ┌────────────────────┐     ┌──────────────┐
│  React Frontend │────▶│  Express Backend   │────▶│  PostgreSQL  │
│  (Vercel CDN)   │     │  (Vercel Serverless)│     │  (Neon)      │
└─────────────────┘     └────────────────────┘     └──────────────┘
                              │         │
                              ▼         ▼
                        ┌──────────┐ ┌──────────────┐
                        │  Resend  │ │ Google OAuth │
                        │  (Email) │ │   (Verify)   │
                        └──────────┘ └──────────────┘
```

### Database Schema Changes

```prisma
model User {
  id           String   @id @default(uuid())
  username     String   @unique
  email        String?  @unique
  passwordHash String?  // nullable: Google-only users may not have a password
  googleId     String?  @unique
  authProvider String   @default("local") // "local", "google", "both"
  createdAt    DateTime @default(now())
  periods      Period[]
  resetTokens  PasswordResetToken[]
}

model PasswordResetToken {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Migration notes:**
- `email` is nullable + unique — existing users keep `null`
- `passwordHash` becomes nullable — Google-only users won't have one
- `googleId` is nullable + unique — only set for Google-linked users
- `authProvider` defaults to `"local"` — existing rows auto-categorized
- `PasswordResetToken` is a new table

### Shared Types Updates

```typescript
// packages/shared/src/types.ts
export interface User {
  id: string;
  username: string;
  email: string | null;
  authProvider: string;
  createdAt: Date;
}
```

## API Design

### Phase 1 Endpoints

#### PUT /api/auth/profile
Update the authenticated user's profile (email, password).

**Request:**
```json
{
  "email": "user@example.com"  // optional
}
```

**Responses:**
- `200`: `{ success: true, data: { id, username, email, authProvider, createdAt } }`
- `400`: Invalid email format
- `409`: Email already in use by another account

**Middleware:** `authenticate`

#### POST /api/auth/forgot-password
Request a password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Responses:**
- `200`: `{ success: true, data: { message: "If an account with that email exists, a reset link has been sent." } }` (always 200 to prevent email enumeration)
- `400`: Invalid email format

**Middleware:** None (public), rate-limited (3 requests per 15 min per IP)

**Logic:**
1. Validate email format
2. Find user by email
3. If found: generate UUID token, store in PasswordResetToken with `expiresAt = now + 1hr`
4. Send email via Resend with reset link: `{FRONTEND_URL}/reset-password?token={token}`
5. Always return success (don't reveal if email exists)

#### POST /api/auth/reset-password
Reset password using a valid token.

**Request:**
```json
{
  "token": "uuid-token-here",
  "password": "newPassword123"
}
```

**Responses:**
- `200`: `{ success: true, data: { message: "Password reset successfully" } }`
- `400`: Invalid/expired/used token, or invalid password format
- `400`: Token expired
- `400`: Token already used

**Logic:**
1. Find token in DB, check `used === false` and `expiresAt > now`
2. Hash new password with bcrypt (salt rounds: 10)
3. Update user's `passwordHash`
4. Mark token as `used = true`
5. If user's `authProvider` was "google", update to "both"

### Phase 2 Endpoints

#### POST /api/auth/google
Authenticate with a Google ID token.

**Request:**
```json
{
  "credential": "google-id-token-string"
}
```

**Responses:**
- `200`: `{ success: true, data: { token: "jwt", user: { id, username, email, authProvider, createdAt } } }`
- `401`: Invalid/expired Google token

**Logic:**
1. Verify ID token with `google-auth-library` using `GOOGLE_CLIENT_ID`
2. Extract `sub` (Google user ID), `email`, `name` from payload
3. Check if user exists with this `googleId`:
   - Yes → issue JWT, return user
4. Check if user exists with this `email`:
   - Yes → link Google (set `googleId`, update `authProvider` to "both"), issue JWT
5. Neither exists → create new user:
   - `username`: derive from email (before @) or name, ensure uniqueness
   - `email`: from Google
   - `googleId`: from Google sub
   - `passwordHash`: null
   - `authProvider`: "google"
   - Issue JWT

### Updated Existing Endpoints

#### POST /api/auth/register (updated)
Add optional `email` field to registration.

**Request (updated):**
```json
{
  "username": "user123",
  "password": "password123",
  "email": "optional@example.com"  // NEW: optional
}
```

#### POST /api/auth/login (updated)
Response now includes `email` field in user object.

#### GET /api/auth/me (updated)
Response now includes `email` and `authProvider` fields.

## Frontend Design

### New Pages

#### ForgotPasswordPage (`/forgot-password`)
- Email input field
- Submit button
- Success message after submission
- Link back to login

#### ResetPasswordPage (`/reset-password?token=xxx`)
- New password input
- Confirm password input
- Submit button
- Error message for invalid/expired token
- Success → redirect to login

### New Components

#### EmailPromptModal
Shown once after login if `user.email === null`.
- Text explaining the benefit of adding email
- Email input field
- "Save" button → calls PUT /api/auth/profile
- "Skip" / X button → dismisses for current session
- Uses a sessionStorage flag `emailPromptDismissed` to prevent re-showing

#### ProfileSection (or ProfileModal)
Accessible from navbar (user menu or settings icon).
- Shows current email (or "Not configured")
- Input to add/change email
- Save button

#### GoogleSignInButton
Wrapper around `@react-oauth/google`'s GoogleLogin component.
- Placed on LoginPage below the login form
- Separator text: "or" / "o"
- On success: sends credential to POST /api/auth/google
- On error: shows error toast

### Auth Context Updates

```typescript
interface AuthContextType {
  user: User | null;      // User now includes email, authProvider
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;  // NEW
  updateProfile: (data: { email?: string }) => Promise<void>;  // NEW
  logout: () => void;
}
```

### Routing Updates

```typescript
// New routes
<Route path="/forgot-password" element={<ForgotPasswordPage />} />
<Route path="/reset-password" element={<ResetPasswordPage />} />
```

## PWA Design

### manifest.json (`packages/frontend/public/manifest.json`)

```json
{
  "name": "Promedio Notas",
  "short_name": "Notas",
  "description": "Gestiona tus notas universitarias",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#6366f1",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### index.html meta tags

```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#6366f1" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

### Service Worker (`packages/frontend/public/sw.js`)

Strategy: Cache app shell on install, serve cache-first for static assets, network-first for API calls.

```javascript
const CACHE_NAME = 'promedio-notas-v1';
const SHELL_ASSETS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Skip API requests — always go to network
  if (request.url.includes('/api/')) return;
  
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
```

### Service Worker Registration (in `main.tsx` or `App.tsx`)

```typescript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
```

## Email Service Design

### Resend Integration (`packages/backend/src/lib/email.ts`)

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await resend.emails.send({
    from: 'Promedio Notas <noreply@yourdomain.com>',
    to,
    subject: 'Recupera tu contraseña - Promedio Notas',
    html: getResetEmailHtml(resetUrl),
    text: getResetEmailText(resetUrl),
  });
}
```

### Email Template
Clean HTML with:
- App logo/name header
- Greeting text
- Explanation that a password reset was requested
- CTA button with reset link
- Expiration notice (1 hour)
- Footer with "If you didn't request this, ignore this email"

## New Dependencies

### Backend
- `resend` — Email sending API client
- `google-auth-library` — Google ID token verification

### Frontend
- `@react-oauth/google` — Google Sign-In React components

## Environment Variables

```env
# Email (Resend)
RESEND_API_KEY=re_xxxxx

# Google OAuth
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com

# Frontend URL (for reset links)
FRONTEND_URL=https://promedio-notas.vercel.app
```

## Security Considerations

1. **No email enumeration**: Forgot-password always returns 200 regardless of email existence
2. **Token security**: Reset tokens are UUIDs (128-bit), single-use, expire in 1 hour
3. **Rate limiting**: Forgot-password endpoint rate-limited to prevent abuse
4. **Google token validation**: Server-side verification ensures tokens aren't forged
5. **Password nullable**: Login with password rejected if `passwordHash` is null (Google-only users must use Google)
6. **CORS**: Google OAuth popup handles CORS automatically

## Translations (new keys)

### Spanish (es)
```
profile.title: "Perfil"
profile.email: "Correo electrónico"
profile.emailPlaceholder: "tu@email.com"
profile.save: "Guardar"
profile.emailUpdated: "Correo actualizado"
profile.emailConflict: "Este correo ya está en uso"
forgotPassword.title: "Recuperar contraseña"
forgotPassword.description: "Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña"
forgotPassword.submit: "Enviar enlace"
forgotPassword.success: "Si existe una cuenta con ese correo, recibirás un enlace de recuperación"
forgotPassword.backToLogin: "Volver al inicio de sesión"
resetPassword.title: "Restablecer contraseña"
resetPassword.newPassword: "Nueva contraseña"
resetPassword.confirmPassword: "Confirmar contraseña"
resetPassword.submit: "Restablecer"
resetPassword.success: "Contraseña restablecida correctamente"
resetPassword.invalidToken: "El enlace es inválido o ha expirado"
resetPassword.mismatch: "Las contraseñas no coinciden"
google.signIn: "Iniciar sesión con Google"
google.error: "Error al iniciar sesión con Google"
emailPrompt.title: "Configura tu correo"
emailPrompt.description: "Agrega un correo electrónico para poder recuperar tu contraseña en caso de olvidarla"
emailPrompt.skip: "Ahora no"
emailPrompt.save: "Guardar"
```

### English (en)
```
profile.title: "Profile"
profile.email: "Email"
profile.emailPlaceholder: "you@email.com"
profile.save: "Save"
profile.emailUpdated: "Email updated"
profile.emailConflict: "This email is already in use"
forgotPassword.title: "Forgot password"
forgotPassword.description: "Enter your email and we'll send you a link to reset your password"
forgotPassword.submit: "Send link"
forgotPassword.success: "If an account with that email exists, you'll receive a recovery link"
forgotPassword.backToLogin: "Back to login"
resetPassword.title: "Reset password"
resetPassword.newPassword: "New password"
resetPassword.confirmPassword: "Confirm password"
resetPassword.submit: "Reset"
resetPassword.success: "Password reset successfully"
resetPassword.invalidToken: "This link is invalid or has expired"
resetPassword.mismatch: "Passwords do not match"
google.signIn: "Sign in with Google"
google.error: "Error signing in with Google"
emailPrompt.title: "Set up your email"
emailPrompt.description: "Add an email address so you can recover your password if you forget it"
emailPrompt.skip: "Not now"
emailPrompt.save: "Save"
```

## Requirements Traceability

| Requirement | Components Affected |
|---|---|
| Req 1: Email field | Prisma schema, registerSchema, auth.ts, shared types |
| Req 2: Email management | PUT /auth/profile, ProfileSection component |
| Req 3: Forgot password | POST /auth/forgot-password, ForgotPasswordPage, email.ts |
| Req 4: Reset password | POST /auth/reset-password, ResetPasswordPage |
| Req 5: Google Sign-In | POST /auth/google, GoogleSignInButton, @react-oauth/google |
| Req 6: Dual auth | User model, login logic, profile |
| Req 7: PWA manifest | manifest.json, index.html meta tags, icons |
| Req 8: Service worker | sw.js, registration in main.tsx |
| Req 9: i18n | translations.ts |
| Req 10: Migration | Prisma schema, prisma db push |
| Req 11: Env config | .env.example, backend startup |
| Req 12: Email template | email.ts HTML template |
| Req 13: Email prompt | EmailPromptModal, DashboardPage, AuthContext |
