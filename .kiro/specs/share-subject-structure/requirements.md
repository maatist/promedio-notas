# Requirements Document

## Introduction

This feature allows users to share the structure of a subject (components, grade slots, weights) with other users via a shareable link. The recipient can import the structure into their own period as a new subject, without receiving any grade values. Links are token-based and expire after 7 days.

## Glossary

- **System**: The promedio-notas application (backend and frontend)
- **Share_Token**: A unique, cryptographically random token associated with a subject share link
- **Share_Link**: A URL containing a Share_Token that allows an authenticated recipient to import a subject structure
- **Subject_Structure**: The exportable data of a subject: name, isComposite flag, exemptionGrade, components (name + weightPercentage), and grades (name + weightPercentage + order + date + description) — excluding grade values
- **Owner**: The authenticated user who generates a Share_Link for one of their subjects
- **Recipient**: An authenticated user who uses a Share_Link to import a Subject_Structure
- **Target_Period**: The period chosen by the Recipient into which the imported subject is created

## Requirements

### Requirement 1: Share Link Generation

**User Story:** As an Owner, I want to generate a shareable link for any of my subjects, so that I can share the subject structure with classmates.

#### Acceptance Criteria

1. WHEN the Owner requests a share link for a subject, THE System SHALL generate a unique Share_Token and store it associated with the subject ID, creation timestamp, and expiration timestamp.
2. THE System SHALL set the expiration timestamp to exactly 7 days after the creation timestamp.
3. WHEN the Share_Token is created, THE System SHALL return the full Share_Link URL containing the Share_Token to the Owner.
4. THE System SHALL generate the Share_Token using a cryptographically secure random method with a minimum length of 32 characters.
5. WHEN the Owner requests a share link for a subject that does not belong to the Owner, THE System SHALL return a 404 error response.

### Requirement 2: Share Link Validation

**User Story:** As a Recipient, I want the system to validate share links before importing, so that I only import from valid, non-expired links.

#### Acceptance Criteria

1. WHEN a Recipient accesses a Share_Link, THE System SHALL verify that the Share_Token exists in the database.
2. WHEN a Recipient accesses a Share_Link with a non-existent Share_Token, THE System SHALL return a 404 error indicating the link is invalid.
3. WHEN a Recipient accesses a Share_Link with an expired Share_Token, THE System SHALL return a 410 error indicating the link has expired.
4. WHILE a Share_Token has not expired, THE System SHALL allow the Share_Token to be used multiple times by different Recipients.

### Requirement 3: Authentication Requirement

**User Story:** As the system administrator, I want share links to require authentication, so that only registered users can import subject structures.

#### Acceptance Criteria

1. WHEN an unauthenticated user accesses a Share_Link, THE System SHALL return a 401 error response requiring authentication.
2. WHILE the Recipient is authenticated, THE System SHALL allow the Recipient to preview and import the Subject_Structure.

### Requirement 4: Subject Structure Import

**User Story:** As a Recipient, I want to import a shared subject structure into one of my periods, so that I can reuse the same grading scheme as my classmates.

#### Acceptance Criteria

1. WHEN the Recipient confirms import and selects a Target_Period, THE System SHALL create a new subject in the Target_Period with the same name, isComposite flag, and exemptionGrade as the shared subject.
2. WHEN the imported subject is composite, THE System SHALL create all SubjectComponents with the same name and weightPercentage as the original.
3. THE System SHALL create all Grade slots within each component with the same name, weightPercentage, order, date, and description as the original.
4. THE System SHALL set the value field of all imported Grade slots to null.
5. WHEN the Recipient imports a Subject_Structure, THE System SHALL verify that the Target_Period belongs to the Recipient.
6. IF the Target_Period does not belong to the Recipient, THEN THE System SHALL return a 403 error response.

### Requirement 5: Structure Preview

**User Story:** As a Recipient, I want to preview the subject structure before importing, so that I can confirm it is the correct subject.

#### Acceptance Criteria

1. WHEN the Recipient accesses a valid, non-expired Share_Link, THE System SHALL return a preview of the Subject_Structure including the subject name, isComposite flag, exemptionGrade, component names with weights, and grade slot names with weights.
2. THE System SHALL exclude all grade values from the preview response.

### Requirement 6: Data Isolation

**User Story:** As a user, I want imported subjects to be completely independent from the original, so that changes to one do not affect the other.

#### Acceptance Criteria

1. WHEN a Subject_Structure is imported, THE System SHALL create an independent copy with no database-level relationship to the original subject.
2. WHEN the original subject is modified after sharing, THE System SHALL preserve the imported subject unchanged.
3. WHEN the original subject is deleted, THE System SHALL preserve the imported subject unchanged.

### Requirement 7: Frontend Share Flow

**User Story:** As an Owner, I want a clear UI to generate and copy share links, so that I can easily share with classmates.

#### Acceptance Criteria

1. WHEN the Owner views a subject detail, THE System SHALL display a share button.
2. WHEN the Owner clicks the share button, THE System SHALL generate the Share_Link and display it in a modal dialog with a copy-to-clipboard button.
3. WHEN the Owner copies the link successfully, THE System SHALL display a success toast notification.
4. THE System SHALL display the expiration date of the Share_Link in the share modal.

### Requirement 8: Frontend Import Flow

**User Story:** As a Recipient, I want a guided import flow when I open a share link, so that I can choose where to place the imported subject.

#### Acceptance Criteria

1. WHEN the Recipient opens a Share_Link in the browser, THE System SHALL display the Subject_Structure preview.
2. THE System SHALL display a period selector allowing the Recipient to choose the Target_Period.
3. WHEN the Recipient confirms the import, THE System SHALL create the subject and navigate the Recipient to the Target_Period view.
4. WHEN the import completes successfully, THE System SHALL display a success toast notification.
5. IF the Share_Link is invalid or expired, THEN THE System SHALL display an appropriate error message to the Recipient.

### Requirement 9: Internationalization

**User Story:** As a user, I want all share-related UI text to be available in Spanish and English, so that the feature matches the app's language settings.

#### Acceptance Criteria

1. THE System SHALL provide all share-related UI labels, messages, and error texts in both Spanish and English.
2. WHILE the user has selected a language preference, THE System SHALL display share-related text in the selected language.
