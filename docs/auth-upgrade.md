# Authentication Upgrade: Invitations, Google, Magic Links, and Admin 2FA

## Summary

Extend the Better Auth implementation into an owner-led authentication and membership system with three supported sign-in methods. Pharmacy owners can create a new business publicly; staff membership is invitation-only.

- Email and password
- Email magic link
- Google OAuth

Administrators must additionally enroll in authenticator-app TOTP two-factor authentication. The application must enforce this second factor regardless of the initial sign-in method.

## Goals

- Keep public owner signup available for creating a new pharmacy.
- Prevent staff from joining an existing pharmacy without an invitation.
- Allow pharmacy administrators to invite staff by email and assign a pharmacy role.
- Allow invited users to authenticate with Google, a magic link, or a password.
- Preserve the existing single-pharmacy `Organization` model and application roles:
  - `ADMIN`
  - `CASHIER`
  - `PHARM_TECH`
  - `DOCTOR`
- Require TOTP for administrators.
- Record security-sensitive membership and authentication events in the audit log.

## Architecture decision

Keep the existing application-owned `Organization` model and `User.organizationId` relationship for this iteration. Do not introduce Better Auth's organization and membership schema yet.

This keeps the upgrade aligned with the current assumption that each user belongs to exactly one pharmacy. Better Auth's organization plugin can be evaluated separately if users eventually need access to multiple pharmacies.

## Infrastructure and configuration

### Transactional email

Select and configure an email provider. Resend is the recommended initial provider; Postmark and Amazon SES are suitable alternatives.

Required environment variables:

```env
RESEND_API_KEY=
EMAIL_FROM="Pharmacy OS <accounts@example.com>"
BETTER_AUTH_URL="https://production-domain.example"
```

Requirements:

- Verify the sender domain.
- Add invitation, magic-link, password-reset, email-verification, and security-notification templates.
- Provide a safe local-development email workflow.
- Avoid revealing whether an email address has an account.
- Use the configured `BETTER_AUTH_URL` when generating links.

### Google OAuth

Create a Google OAuth 2.0 Web Client.

Required environment variables:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Configure local and production origins and callbacks:

```text
http://localhost:3000
https://production-domain.example

http://localhost:3000/api/auth/callback/google
https://production-domain.example/api/auth/callback/google
```

## Invitation model

Add a model similar to the following:

```prisma
model UserInvitation {
  id             String    @id @default(cuid())
  email          String
  organizationId String
  role           UserRole
  tokenHash      String    @unique
  invitedById    String
  expiresAt      DateTime
  acceptedAt     DateTime?
  revokedAt      DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  invitedBy     User         @relation(fields: [invitedById], references: [id], onDelete: Cascade)

  @@index([organizationId, email])
  @@index([email, expiresAt])
}
```

The final relation names may need to be made explicit to avoid ambiguity with other user and organization relations.

## Invitation lifecycle

1. An administrator supplies an email address and selects `ADMIN`, `CASHIER`, `PHARM_TECH`, or `DOCTOR`.
2. The server normalizes the email address.
3. The server generates a cryptographically random invitation token.
4. Only a cryptographic hash of the token is persisted.
5. The recipient receives an email containing an acceptance URL.
6. The invitation page displays the pharmacy name and assigned role.
7. The recipient authenticates using Google, a magic link, or a password.
8. The authenticated email must exactly match the normalized invitation email.
9. The server provisions or activates the user using the invitation's server-owned organization and role.
10. The invitation is atomically marked as accepted.
11. The token cannot be reused.

Reject invitations that are:

- Expired
- Revoked
- Already accepted
- Associated with a different authenticated email
- Missing or invalid

### Invitation management

Administrators must be able to:

- List pending invitations.
- Resend an invitation.
- Revoke an invitation.
- See invitation status and expiration.

Defaults and safeguards:

- Invitations expire after 48 hours.
- Prevent duplicate active invitations for the same pharmacy and email.
- Rate-limit invitation creation and resends.
- Do not accept organization IDs or roles from the recipient.
- Write audit records for creation, resend, revoke, acceptance, and role assignment.

## Authentication methods

### Password

- Keep Better Auth email/password authentication.
- Keep public signup available only for the new-pharmacy owner journey.
- Allow invited users to create a password during onboarding.
- Add forgot-password and password-reset email flows.
- Revoke other sessions following a password reset.
- Allow authenticated users to change their passwords.
- Apply the existing password length and server-side validation rules.

### Magic link

Add Better Auth's magic-link server and client plugins.

Security defaults:

- Do not let a standalone magic link create a new pharmacy or unscoped staff account.
- Permit only active users or emails with valid invitations.
- Use a five- or ten-minute expiration period.
- Use single-use tokens.
- Store token hashes rather than plaintext tokens.
- Rate-limit request and verification endpoints.
- Return generic responses to prevent email enumeration.

### Google

- Add the Google social provider and a login button.
- Do not permit Google OAuth to create an unscoped user.
- Continue only when the Google email belongs to an active user or matches a valid invitation.
- Assign organization and role exclusively from server-owned user or invitation data.
- Support linking Google to an existing account with the same verified email.
- Avoid duplicate users for the same verified email.
- Show an invitation-required page when no active user or invitation exists.

## Administrator two-factor authentication

Add Better Auth's two-factor plugin with:

- TOTP authenticator enrollment.
- QR-code setup.
- Enrollment-code verification.
- Eight single-use backup codes.
- Backup-code regeneration.
- Trusted-device support if appropriate.
- Administrator-assisted recovery with an audit entry.

### Cross-method enforcement

Better Auth's ordinary credential 2FA challenge does not automatically protect OAuth and passwordless sign-ins. Implement an application-level administrator step-up policy:

1. Complete the selected primary authentication method.
2. Determine whether the user is an administrator.
3. Non-administrators continue to the application.
4. Administrators must have a TOTP-verified session.
5. If the session is not verified, redirect to `/two-factor`.
6. Do not expose protected application data until the TOTP challenge succeeds.

This policy must apply equally to password, Google, and magic-link authentication.

Consider requiring fresh TOTP verification before sensitive actions such as:

- Inviting, banning, or deleting users
- Changing user roles
- Resetting another administrator's 2FA
- Changing pharmacy security settings
- Viewing or regenerating recovery information

## User interface work

Update the login experience to offer:

- Continue with password
- Email me a sign-in link
- Continue with Google

Add the following pages and states:

- Invitation acceptance
- Invitation required
- Invalid, expired, accepted, and revoked invitation
- Pending-invitation administration
- Password setup
- Forgot and reset password
- Security settings
- TOTP enrollment
- TOTP challenge
- Backup-code display and download
- 2FA recovery
- Session and device management where supported

## Security requirements

- Normalize emails consistently before comparisons or persistence.
- Store invitation tokens only as hashes.
- Use cryptographically random, single-use, expiring tokens.
- Never accept organization IDs or roles from public client input.
- Validate tenant ownership on every invitation mutation.
- Validate the authenticated email during invitation acceptance.
- Rate-limit login, magic-link, password-reset, invitation, and 2FA endpoints.
- Revoke active sessions for banned or deleted users.
- Revoke appropriate sessions after password or 2FA recovery.
- Audit membership, role, recovery, and administrative security changes.
- Configure explicit callback and redirect URL allowlists.
- Test local, preview, and production callback behavior.
- Avoid logging tokens, passwords, OAuth secrets, backup codes, or email contents.

## Recommended defaults

- Email provider: Resend
- Invitation expiration: 48 hours
- Magic-link expiration: 10 minutes
- Available sign-in methods: password, magic link, and Google
- Administrator TOTP: mandatory
- Backup codes: eight single-use codes
- Session lifetime: seven days
- Administrator recovery: performed by another administrator and audited

## Suggested rollout

### Phase 1: Email foundation and invitations

- Configure transactional email.
- Add the invitation schema and migration.
- Add admin invitation management.
- Add acceptance, password setup, and invalid-invitation states.
- Add audit logging and rate limits.

### Phase 2: Passwordless and Google authentication

- Add magic-link authentication.
- Add Google OAuth.
- Enforce invitation-first provisioning.
- Add secure account linking.
- Add password-reset and verification emails.

### Phase 3: Administrator 2FA

- Add TOTP enrollment and challenges.
- Add backup codes and recovery.
- Enforce administrator step-up across every primary sign-in method.
- Add sensitive-action reauthentication.
- Add security and device-management UI.

## Acceptance criteria

- [ ] A public user can create a new pharmacy and becomes its administrator.
- [ ] A user cannot join an existing pharmacy without an invitation.
- [ ] An administrator can invite an email and choose a pharmacy role.
- [ ] Invitation emails are delivered and expire after the configured period.
- [ ] Only the invited email can accept an invitation.
- [ ] Invitation tokens are hashed, single-use, revocable, and auditable.
- [ ] Expired, revoked, mismatched, and replayed invitations are rejected.
- [ ] Invited users can set a password.
- [ ] Active invited users can request and use a magic link.
- [ ] Invited users can authenticate with Google.
- [ ] Google and magic-link flows cannot select or alter organization or role.
- [ ] Account linking does not create duplicate users for the same verified email.
- [ ] Forgot-password, password reset, and session revocation work.
- [ ] Administrators must enroll in and complete TOTP.
- [ ] Google and magic-link sign-in cannot bypass administrator TOTP.
- [ ] Backup-code and administrator-assisted recovery are tested and audited.
- [ ] Banned and deleted users cannot retain application access.
- [ ] Tenant isolation and role authorization continue to pass.
- [ ] Prisma migration, seed, typecheck, lint, and production build pass.
- [ ] Automated tests cover invitation misuse, token replay, email mismatch, OAuth linking, account duplication, and 2FA bypass attempts.

## Testing plan

At minimum, add automated coverage for:

- Invitation creation by an administrator
- Invitation creation rejected for non-administrators
- Cross-tenant invitation mutation rejected
- Duplicate active invitation handling
- Expired and revoked invitations
- Invitation token replay
- Authenticated email mismatch
- Password onboarding and reset
- Magic-link token expiry and replay
- Google login for an invited email
- Google login without an invitation
- Existing-account Google linking
- Duplicate-account prevention
- Banned and deleted user sessions
- Administrator TOTP enrollment
- Invalid and replayed TOTP codes
- Backup-code consumption
- Google-to-TOTP and magic-link-to-TOTP enforcement
- Administrator recovery audit records

## Out of scope

- Multi-pharmacy membership for one user
- Migration to Better Auth's organization plugin
- SAML SSO
- SCIM provisioning
- SMS authentication
- Phone-number login
