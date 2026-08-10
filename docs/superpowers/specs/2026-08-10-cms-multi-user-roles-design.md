# CMS Multi-User Roles Design

## Goal

Replace the single shared CMS administrator password with individual email-and-password accounts while preserving the current owner password. Create a time-limited SEO editor account for `localoca.master@gmail.com` that can manage public content but cannot access inquiries, analytics, notification settings, imports, exports, or user administration.

## Confirmed Accounts

### Owner

- Email: `daehovriano@gmail.com`
- Role: `OWNER`
- Password: the current CMS administrator password
- Expiration: none
- Permissions: full CMS access, including user administration
- First-login password change: not required

The current password remains unknown to the application operator in plaintext. Migration reuses the existing PostgreSQL password hash when one exists. If production still uses the bootstrap `CMS_ADMIN_PASSWORD`, the CMS hashes that value into the owner record during startup. The user does not need to disclose the current password.

### SEO Editor

- Email: `localoca.master@gmail.com`
- Role: `EDITOR`
- Initial password: a cryptographically random temporary password generated after production deployment
- Expiration: 30 days after account creation
- First-login password change: required
- Status: active until manually disabled or expired

The temporary password is shown to the owner once after creation or reset. Only its hash is stored.

## Scope

The feature includes:

- email-and-password CMS login;
- individual `OWNER` and `EDITOR` identities;
- a database-backed user status, expiration, password-change requirement, and session version;
- capability checks on server-rendered CMS routes, server actions, and administrator API proxy routes;
- owner-only editor account creation, disable/enable, expiration extension, and password reset;
- editor self-service password change;
- migration from the existing shared password without changing the owner's password;
- automatic invalidation of sessions after password changes, password resets, account disablement, or expiration.

The feature does not include:

- social login, Google login, magic links, or password-reset email delivery;
- creation of additional owner accounts;
- role changes through the CMS interface;
- permanent deletion of administrator accounts;
- a general-purpose permission editor;
- a full content-change audit-log interface.

## Authorization Model

Permissions are fixed by role rather than stored as user-editable policy rows.

| Area or operation | `OWNER` | `EDITOR` |
| --- | --- | --- |
| Owner dashboard | Allowed | Replaced by content-only dashboard |
| Pages and SEO fields | Read/write | Read/write |
| Footer content | Read/write | Read/write |
| Site popup | Read/write | Read/write |
| News | Create/read/update/delete | Create/read/update; no delete |
| Collections | Create/read/update/delete | Create/read/update; no delete |
| Media | Upload/read/update/delete | Upload/read/update; no delete |
| Own password | Change | Change |
| Inquiries | Allowed | Denied |
| Inquiry status changes | Allowed | Denied |
| Analytics | Allowed | Denied |
| Notification settings and tests | Allowed | Denied |
| CMS import/export/status operations | Allowed | Denied |
| User administration | Allowed | Denied |
| Role, status, or expiration changes | Editor accounts only | Denied |

An editor cannot delete a news item, collection, or media record through a hidden button, a direct URL, a server-action request, or an administrator API proxy request.

The application exposes named capabilities from a small pure authorization module. Route navigation and page rendering use those capabilities for presentation, while every server action and administrator API proxy uses the same capabilities as the enforcing boundary. Hiding a navigation item is never treated as authorization.

## Database Design

Flyway migration `V9__admin_users.sql` creates `cms_admin_users` with:

- `id text PRIMARY KEY`, containing a generated UUID;
- `email text NOT NULL UNIQUE`, stored trimmed and lowercased;
- `password_hash text NOT NULL`;
- `role text NOT NULL`, constrained to `OWNER` or `EDITOR`;
- `status text NOT NULL`, constrained to `active` or `disabled`;
- `expires_at timestamptz`, nullable for the owner and required for editors created through the CMS;
- `must_change_password boolean NOT NULL`;
- `session_version bigint NOT NULL DEFAULT 1`;
- `last_login_at timestamptz`;
- `created_at timestamptz NOT NULL`;
- `updated_at timestamptz NOT NULL`.

Email uniqueness is case-insensitive because every repository entry point normalizes the address before reads and writes. The migration adds a unique index on `lower(email)` as a second database-level guard.

Accounts are never physically deleted by this version. Disabling an account preserves its identity and invalidates its sessions.

## Owner Bootstrap And Legacy Compatibility

Production receives a new required setting:

```text
CMS_OWNER_EMAIL=daehovriano@gmail.com
```

At Spring CMS startup, an owner bootstrap service checks whether an owner exists:

1. If an owner exists, startup does not alter it.
2. If no owner exists and `cms_admin_settings.admin_password_hash` exists, the service copies that hash into a new owner record.
3. If no stored hash exists, the service hashes the configured `CMS_ADMIN_PASSWORD` with the existing PBKDF2 policy and stores it in the owner record.
4. If no owner exists and either the owner email or a usable legacy password is unavailable, production startup fails with a clear configuration error rather than starting with an inaccessible CMS.

The old `cms_admin_settings.admin_password_hash` row and legacy password endpoints remain intact for one release so the previous application version can be restored without a database rollback. The new Next.js login flow never authenticates through those legacy endpoints.

## Password Storage And Validation

All user passwords use the existing PBKDF2-HMAC-SHA256 policy:

- 310,000 iterations;
- 16 random salt bytes;
- 256-bit derived hash;
- encoded format `pbkdf2_sha256$<iterations>$<salt>$<hash>`.

Password validation keeps the current rules:

- 12 to 128 characters;
- at least one lowercase letter;
- at least one uppercase letter;
- at least one number;
- at least one symbol;
- no leading or trailing whitespace;
- a new password must differ from the current password.

Hashing and verification move into a focused password-hasher component shared by legacy bootstrap and per-user authentication. Plaintext passwords are never logged, returned by list endpoints, or stored in PostgreSQL.

## Authentication Flow

### Login

The `/admin/login` form accepts email and password.

1. Next.js normalizes the email and applies the existing failed-login limiter using the normalized email plus client IP.
2. Next.js calls the internal Spring login endpoint with the email and password over the Docker network using the existing internal API key.
3. Spring returns a minimal authenticated identity: user ID, email, role, session version, expiration, and password-change requirement.
4. Next.js stores that identity in the existing signed, HTTP-only administrator cookies. The cookie remains `SameSite=Lax`, secure on HTTPS, and limited to the existing eight-hour lifetime.
5. Spring updates `last_login_at` only after successful password verification.

Login responses use the same public error for an unknown email, wrong password, disabled account, or expired account. This prevents account discovery. Rate-limit responses remain distinct only by retry timing and do not confirm whether an email exists.

### Session Validation

Every protected CMS request validates:

- cookie signature and issued time;
- database user existence;
- active status;
- unexpired `expires_at`;
- matching `session_version`;
- required capability for the requested route or operation.

Password changes, owner resets, disabling an account, and expiration updates increment `session_version`. Existing cookies then fail validation immediately.

Old password-only cookies use a different payload shape and become invalid after deployment. The owner signs in again with `daehovriano@gmail.com` and the current password.

### Required First Password Change

An authenticated editor with `must_change_password=true` can access only:

- the password-change page;
- the password-change server action;
- logout.

All other administrator routes redirect to the password-change page. A successful change stores the new hash, clears `must_change_password`, increments `session_version`, clears the current cookie, and requires a fresh login with the new password.

The shared dashboard layout validates the identity and limits first-login navigation to the account page. Each page then calls the capability guard before loading data; that guard redirects a `must_change_password` identity unless the requested capability is `account:self`. This keeps direct content-page requests blocked without relying on request-path inference inside the shared layout.

## Server Boundaries

Nginx exposes the Next.js application and uploaded media. It does not expose the Spring CMS administrator endpoints directly. Spring continues to accept the internal `CMS_ADMIN_API_KEY` only from the Next.js server-side repository layer.

Next.js is therefore the user-facing authorization boundary:

- the dashboard layout validates the current identity;
- every dashboard route, including content routes, requires its capability before data is fetched;
- every mutation server action requires its capability before parsing or submitting data;
- every `/api/admin` proxy route requires its capability before forwarding the internal service-key request;
- destructive content actions require an owner capability even if a crafted request calls them directly.

Spring remains responsible for authenticating user credentials, storing user state, validating session versions, and applying owner-only rules to user-administration endpoints. This prevents a compromised or incorrect CMS page from promoting an editor or reactivating itself.

## Internal API Design

All endpoints require the existing internal administrator API key and are not called directly by browsers.

### Authentication

- `POST /api/admin/auth/login`
  - input: email and password;
  - output on success: minimal authenticated identity;
  - output on failure: generic unauthorized response.
- `POST /api/admin/auth/session`
  - input: user ID and session version;
  - output: current minimal identity when active and unexpired.
- `POST /api/admin/auth/change-own-password`
  - input: user ID, current password, and new password;
  - increments session version and clears the first-login requirement.

### Owner User Administration

- `GET /api/admin/users`
  - returns identities and operational metadata, never password hashes.
- `POST /api/admin/users/editors`
  - receives the generated temporary password over the private Docker network, hashes it in Spring, and creates an `EDITOR` with a 30-day expiration;
  - rejects duplicate normalized email addresses.
- `POST /api/admin/users/{id}/reset-password`
  - stores the new password hash, requires a first-login change, and increments session version.
- `PATCH /api/admin/users/{id}/status`
  - enables or disables an editor and increments session version.
- `PATCH /api/admin/users/{id}/expiration`
  - updates an editor expiration and increments session version.

Owner identity is passed from the validated Next.js session to these Spring requests and verified as `OWNER` before any user mutation. The API does not support changing roles, deleting users, or editing the bootstrap owner through editor-management endpoints.

## CMS Interface

### Login Page

The login form adds an email field above the existing password field. Existing Chinese, Korean, and English administrator locale maps provide the labels, generic login error, rate-limit message, and password-change notice. The generic login error does not reveal whether the account is unknown, disabled, or expired.

### Role-Aware Shell

The CMS shell receives the validated identity and filters navigation by capability.

Editors see:

- content overview;
- news;
- collections;
- media;
- popup;
- footer;
- pages;
- own account.

Owners retain the current navigation and gain an owner-only users item. Editor dashboards show only public-content inventory and do not load or render inquiry counts, notification health, analytics, import/export, or system configuration.

### Account Page

Both roles can change their own password. The account page displays the current email and role. It does not expose the password hash or allow self-service role, status, email, or expiration changes.

### User Administration Page

`/admin/users` is owner-only and provides:

- editor email, active/disabled state, expiration, last login, and first-login status;
- create editor;
- reset temporary password;
- enable or disable editor;
- extend expiration by choosing an explicit date.

Creation and reset display the generated temporary password once in the submitted-page response. Refreshing or revisiting the page does not reveal it again.

Delete and role-change controls are not present.

## Temporary Password Generation

Next.js generates temporary passwords with `node:crypto` using at least 20 random characters and guarantees the required lowercase, uppercase, numeric, and symbol groups. Passwords are not placed in query strings, logs, cookies, or local storage.

After production verification, the owner-only create flow creates `localoca.master@gmail.com` with an expiration exactly 30 days after creation. The generated password is delivered to the user in the private Codex task for onward delivery to the contractor.

## Error Handling And Security

- Unknown email, wrong password, disabled account, and expired account return the same login error.
- Login attempts remain limited to five failures in 15 minutes, followed by a 15-minute lock, keyed by normalized email and client IP.
- User input is normalized and length-limited before repository access.
- JDBC statements remain parameterized.
- Duplicate email creation returns a structured validation error without changing the existing account.
- An editor user mutation returns `403` even when it reaches Spring through an incorrectly wired Next.js action.
- Disabling or expiring an account invalidates existing sessions through `session_version` and database state checks.
- The owner cannot disable or reset itself through editor-management endpoints.
- The application refuses to disable the last active owner.
- Passwords and hashes are excluded from CMS export/import and all operational logs.
- Existing admin IP allowlist behavior remains unchanged.

## Deployment And Rollback

Development occurs on `codex/cms-multi-user-roles` in an isolated worktree and is merged through a pull request.

Before production deployment:

1. Create a fresh PostgreSQL dump.
2. Add `CMS_OWNER_EMAIL=daehovriano@gmail.com` to the production environment.
3. Record the current deployed commit and container health.

Deployment rebuilds both `cms-api` and `next`; Nginx is rebuilt only if required by the final diff. Flyway applies the additive user-table migration when `cms-api` starts.

The new Spring version retains the legacy password endpoints during the rollout so the existing Next.js container remains compatible until it is replaced. After both containers are healthy, the old password-only login is no longer reachable through the public application.

Rollback restores the previous application commit and containers. Because the legacy password hash remains and the migration is additive, the previous password-only CMS can operate without reversing `V9`. The PostgreSQL dump is reserved for data-corruption recovery rather than routine application rollback.

## Verification

### Automated Backend Tests

- owner bootstrap copies a stored legacy hash;
- owner bootstrap hashes the configured bootstrap password when no stored hash exists;
- startup refuses to leave a production CMS without an owner;
- normalized email login succeeds with the current owner password;
- unknown email and incorrect password fail identically;
- disabled and expired users cannot authenticate;
- successful login updates last-login time;
- editor creation always uses `EDITOR` and a 30-day expiration;
- password reset and status or expiration changes increment session version;
- editor attempts to use user-administration endpoints return `403`;
- owner self-disable and last-owner disable are rejected;
- password hashes and plaintext passwords are absent from response objects.

### Automated Next.js Tests

- capability mapping exactly matches the confirmed permissions table;
- owner and editor navigation differ correctly;
- editor dashboard does not request or render restricted data;
- first-login sessions can reach only account password change and logout;
- server actions reject editor delete, inquiry, analytics, notification, export, and user-management operations;
- protected `/api/admin` proxy routes apply matching capability checks;
- disabled, expired, password-reset, and stale-version sessions fail validation;
- login rate-limit keys include normalized email and client IP;
- temporary passwords satisfy policy and are not placed in URLs;
- administrator copy exists in every supported CMS locale.

### Full Verification

- run all Node tests;
- run TypeScript type checking;
- run ESLint for all changed TypeScript and TSX files;
- run the production Next.js build;
- run all Spring Boot tests;
- run the Docker Compose stack against PostgreSQL and verify Flyway `V9` on a clean database and on a database containing the legacy admin password record.

### Production Verification

- confirm the database backup completed before migration;
- confirm owner login with `daehovriano@gmail.com` and the unchanged current password;
- create `localoca.master@gmail.com` and capture the one-time temporary password;
- confirm the editor is forced to change the temporary password;
- confirm the editor can edit allowed content and upload media;
- confirm direct URLs and direct action requests for restricted areas return a denial;
- confirm editor delete actions are unavailable and rejected server-side;
- confirm the owner can disable and re-enable the editor and that an active editor session is invalidated;
- confirm the owner can reset the editor password and invalidate the prior session;
- confirm public Korean and English pages continue to read CMS content and media;
- confirm all production containers are healthy and record the deployed commit.
