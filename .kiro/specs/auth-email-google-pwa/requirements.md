# Requirements Document

## Introduction

This feature extends the promedio-notas application with three capabilities: (1) email-based password recovery using Resend, (2) Google OAuth sign-in for streamlined authentication, and (3) Progressive Web App (PWA) enhancements for installability and offline shell caching. These additions improve account security, reduce friction for new users, and enable a native-like experience on mobile devices.

## Glossary

- **System**: The promedio-notas application (backend + frontend)
- **User**: An authenticated person interacting with the application
- **Auth_Service**: The backend authentication module handling login, registration, token issuance, and account management
- **Email_Service**: The backend module responsible for sending transactional emails via Resend
- **Google_Auth_Module**: The backend module responsible for validating Google ID tokens and managing Google-linked accounts
- **Reset_Token**: A unique, time-limited cryptographic token used for password recovery
- **PWA_Shell**: The minimal cached application resources (HTML, CSS, JS, icons) enabling offline loading
- **Service_Worker**: A background script that intercepts network requests and serves cached PWA_Shell resources

## Requirements

### Requirement 1: Email Field on User Accounts

**User Story:** As a user, I want to optionally add an email address to my account, so that I can recover my password if I forget it.

#### Acceptance Criteria

1. THE Auth_Service SHALL accept an optional email field during user registration
2. WHEN a user provides an email, THE Auth_Service SHALL validate that the email conforms to a standard email format (RFC 5322 simplified)
3. WHEN a user provides an email that is already associated with another account, THE Auth_Service SHALL reject the request with a conflict error
4. THE Auth_Service SHALL store the email as a nullable, unique field on the User record

### Requirement 2: Email Management from Profile

**User Story:** As a user, I want to add or change my email from my profile settings, so that I can keep my recovery email up to date.

#### Acceptance Criteria

1. WHEN an authenticated user submits a valid email via the profile endpoint, THE Auth_Service SHALL update the email on the user's account
2. WHEN an authenticated user submits an email already used by another account, THE Auth_Service SHALL reject the request with a conflict error
3. WHEN an authenticated user submits an invalid email format, THE Auth_Service SHALL reject the request with a validation error
4. THE System SHALL display a profile or settings section where the user can view and edit their email address

### Requirement 3: Forgot Password Flow

**User Story:** As a user, I want to request a password reset via email, so that I can regain access to my account if I forget my password.

#### Acceptance Criteria

1. THE System SHALL display a "Forgot Password" link on the login page
2. WHEN a user submits a valid email address on the forgot-password page, THE Auth_Service SHALL generate a Reset_Token with a 1-hour expiration and store it in the database
3. WHEN a Reset_Token is generated, THE Email_Service SHALL send an email containing a reset link to the user's email address
4. WHEN a user submits an email that does not match any account, THE Auth_Service SHALL respond with a success message without revealing whether the email exists
5. IF the Email_Service fails to send the email, THEN THE Auth_Service SHALL log the error and return a generic error to the user

### Requirement 4: Reset Password Flow

**User Story:** As a user, I want to set a new password using the reset link I received, so that I can regain access to my account.

#### Acceptance Criteria

1. WHEN a user navigates to the reset-password page with a valid, unexpired token, THE System SHALL display a form to set a new password
2. WHEN a user submits a new password with a valid token, THE Auth_Service SHALL hash the new password, update the user record, and mark the token as used
3. IF the token is expired, THEN THE Auth_Service SHALL reject the request with an expiration error
4. IF the token has already been used, THEN THE Auth_Service SHALL reject the request with an invalid-token error
5. IF the token does not exist, THEN THE Auth_Service SHALL reject the request with an invalid-token error
6. WHEN a password is successfully reset, THE System SHALL redirect the user to the login page with a success message

### Requirement 5: Google Sign-In

**User Story:** As a user, I want to sign in with my Google account, so that I can access the application without creating a separate username and password.

#### Acceptance Criteria

1. THE System SHALL display a "Sign in with Google" button on the login page
2. WHEN a user clicks the Google sign-in button, THE System SHALL open a Google OAuth popup for authentication
3. WHEN the frontend receives a Google ID token, THE Auth_Service SHALL validate the token using the Google Auth Library
4. WHEN the Google ID token is valid and the email matches an existing user account, THE Auth_Service SHALL link the Google ID to that account and issue a JWT
5. WHEN the Google ID token is valid and no account exists with that email, THE Auth_Service SHALL create a new user account with the Google email and Google ID, and issue a JWT
6. WHEN the Google ID token is invalid or expired, THE Auth_Service SHALL reject the request with an authentication error
7. THE Auth_Service SHALL store the Google ID as a nullable, unique field on the User record
8. WHEN a Google-authenticated user already has a linked account (same googleId), THE Auth_Service SHALL issue a JWT without creating a duplicate account

### Requirement 6: Dual Authentication Support

**User Story:** As a user, I want to have both Google and password authentication linked to my account, so that I can sign in using either method.

#### Acceptance Criteria

1. THE Auth_Service SHALL allow users to have both a passwordHash and a googleId on the same account
2. WHEN a Google-only user sets a password via the profile, THE Auth_Service SHALL store the passwordHash and update the authProvider to "both"
3. WHEN a local user links their Google account, THE Auth_Service SHALL store the googleId and update the authProvider to "both"
4. THE Auth_Service SHALL accept login via username/password for any user with a valid passwordHash, regardless of authProvider value

### Requirement 7: PWA Manifest and Installability

**User Story:** As a user, I want to install the application on my device's home screen, so that I can access it quickly like a native app.

#### Acceptance Criteria

1. THE System SHALL serve a web app manifest file with name, icons, theme_color, background_color, and display set to "standalone"
2. THE System SHALL include iOS-specific meta tags for standalone mode (apple-mobile-web-app-capable, apple-mobile-web-app-status-bar-style)
3. THE System SHALL provide app icons in at least 192x192 and 512x512 pixel sizes
4. WHEN a user triggers "Add to Home Screen" on iOS or Android, THE System SHALL be recognized as an installable PWA

### Requirement 8: Service Worker and Offline Caching

**User Story:** As a user, I want the app shell to load even when I have poor connectivity, so that the application feels fast and reliable.

#### Acceptance Criteria

1. THE System SHALL register a Service_Worker on page load
2. THE Service_Worker SHALL cache the PWA_Shell (HTML, CSS, JS bundles, icons) using a cache-first strategy
3. WHEN the user opens the installed PWA without network connectivity, THE Service_Worker SHALL serve the cached PWA_Shell
4. WHEN a new version of the app is deployed, THE Service_Worker SHALL update the cache with the new assets

### Requirement 9: Internationalization for New UI Elements

**User Story:** As a user, I want all new screens and messages to appear in my chosen language (Spanish or English), so that the experience is consistent.

#### Acceptance Criteria

1. THE System SHALL provide Spanish and English translations for all new UI text (forgot password page, reset password page, profile section, Google sign-in button, PWA install prompt)
2. WHEN the user switches language, THE System SHALL immediately update all visible text including new authentication and profile elements

### Requirement 10: Backwards-Compatible Database Migration

**User Story:** As a developer, I want schema changes to be non-breaking, so that existing users are unaffected by the migration.

#### Acceptance Criteria

1. THE Auth_Service SHALL make the email field nullable so existing users without email remain valid
2. THE Auth_Service SHALL make the passwordHash field nullable so Google-only users can exist without a password
3. THE Auth_Service SHALL make the googleId field nullable so existing local-only users remain valid
4. THE Auth_Service SHALL add an authProvider field with a default value of "local" so existing users are automatically categorized

### Requirement 11: Environment Configuration

**User Story:** As a developer, I want sensitive credentials stored as environment variables, so that secrets are not committed to source control.

#### Acceptance Criteria

1. THE Auth_Service SHALL read the Resend API key from the RESEND_API_KEY environment variable
2. THE Auth_Service SHALL read the Google Client ID from the GOOGLE_CLIENT_ID environment variable
3. IF a required environment variable is missing at startup, THEN THE Auth_Service SHALL log a warning indicating the missing variable
4. THE System SHALL document required environment variables in the .env.example file

### Requirement 12: Password Reset Email Template

**User Story:** As a user, I want the password reset email to be clear and well-formatted, so that I can easily identify the action I need to take.

#### Acceptance Criteria

1. THE Email_Service SHALL send password reset emails using a clean HTML template that includes the application name, a clear call-to-action button with the reset link, and an expiration notice
2. THE Email_Service SHALL include a plain-text fallback for email clients that do not render HTML


### Requirement 13: Email Configuration Prompt After Login

**User Story:** As a user without an email configured, I want to be reminded to add my email after logging in, so that I can set up password recovery before I need it.

#### Acceptance Criteria

1. WHEN a user logs in (via username/password or Google) and their account has no email address set, THE System SHALL display a popup/modal suggesting they configure an email for account recovery
2. THE popup SHALL include a text input to enter the email directly, a "Save" button to submit it, and a "Skip" or dismiss option
3. WHEN the user submits a valid email from the popup, THE System SHALL save it to their account via the profile endpoint and dismiss the popup
4. WHEN the user clicks "Skip" or dismisses the popup, THE System SHALL close the popup and not show it again for the current session
5. THE System SHALL show this popup at most once per login session (not on every page navigation)
6. THE popup SHALL NOT appear for users who already have an email configured
7. THE popup SHALL support both Spanish and English translations
