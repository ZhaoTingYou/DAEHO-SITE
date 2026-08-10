# CMS Multi-User Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the shared CMS password with individual `OWNER` and time-limited `EDITOR` accounts, preserve the owner's current password, enforce server-side capabilities, deploy the change, and create `localoca.master@gmail.com` as a 30-day editor.

**Architecture:** PostgreSQL and Spring Boot own user records, password hashing, bootstrap migration, account state, and session-version validation. Next.js owns signed browser cookies, route/action/API capability checks, role-aware CMS rendering, and the owner-only user-management interface; Spring remains private behind the Next.js BFF and the existing service API key.

**Tech Stack:** PostgreSQL 17, Flyway, Java 17, Spring Boot 4.1, JDBC, Next.js 16.2, React 19.2, TypeScript 5.9, Node.js test runner, Docker Compose, AWS Lightsail.

## Global Constraints

- Owner email is exactly `daehovriano@gmail.com`; the current CMS password must continue to work without exposing its plaintext.
- Editor email is exactly `localoca.master@gmail.com`; the account expires 30 days after creation and requires a password change on first login.
- `EDITOR` can read/write pages, Footer, popup, news, collections, and media, but cannot delete news, collections, or media.
- `EDITOR` cannot access inquiries, inquiry status changes, analytics, notifications, import/export/status operations, user administration, role changes, or account-state changes.
- `OWNER` retains all current CMS capabilities and can create, disable/enable, extend, and reset editor accounts.
- Passwords use PBKDF2-HMAC-SHA256 with 310,000 iterations, 16 random salt bytes, and a 256-bit hash.
- Password policy remains 12–128 characters with lowercase, uppercase, digit, symbol, no outer whitespace, and a value different from the current password.
- Browser sessions remain signed, HTTP-only, `SameSite=Lax`, HTTPS-secure in production, and valid for at most eight hours.
- Disabled, expired, password-changed, and password-reset accounts invalidate old sessions immediately.
- Login errors do not disclose whether an email is unknown, disabled, expired, or using a wrong password.
- Existing `ADMIN_ALLOWED_IPS` behavior and same-origin checks remain unchanged.
- The legacy password hash and endpoints remain usable by the previous application release for rollback, but the new public login never uses them.
- Do not add social login, password-reset email, role editing, user deletion, additional owner creation, or a content audit-log UI.
- Do not add new runtime dependencies.
- All new visible CMS copy must exist in the existing Chinese, Korean, and English administrator locale maps.
- Follow strict TDD: add one failing behavior test, verify the expected failure, implement the smallest behavior, and rerun the focused test before each commit.
- Preserve unrelated user changes in the original worktree; all implementation stays in `.worktrees/cms-multi-user-roles` on `codex/cms-multi-user-roles`.

## File Structure

### Spring Boot

- `backend/cms/src/main/resources/db/migration/V9__admin_users.sql`: additive account table and normalized-email index.
- `backend/cms/src/main/java/com/daeho/cms/service/AdminPasswordHasher.java`: one password-policy and PBKDF2 module used by legacy and per-user authentication.
- `backend/cms/src/main/java/com/daeho/cms/service/AdminUserRecord.java`: immutable stored user record.
- `backend/cms/src/main/java/com/daeho/cms/service/AdminIdentity.java`: password-free authenticated identity returned across the internal boundary.
- `backend/cms/src/main/java/com/daeho/cms/service/AdminUserSummary.java`: password-free owner-management view with status and timestamps.
- `backend/cms/src/main/java/com/daeho/cms/service/AdminUserStore.java`: storage interface for service tests.
- `backend/cms/src/main/java/com/daeho/cms/repository/JdbcAdminUserStore.java`: parameterized JDBC implementation.
- `backend/cms/src/main/java/com/daeho/cms/service/AdminUserBootstrap.java`: one-time owner provisioning from the legacy hash or bootstrap password.
- `backend/cms/src/main/java/com/daeho/cms/service/AdminUserService.java`: login, session validation, own-password change, and owner-only editor lifecycle.
- `backend/cms/src/main/java/com/daeho/cms/controller/AdminUsersController.java`: internal auth and user-management HTTP contracts.
- `backend/cms/src/main/java/com/daeho/cms/config/CmsProperties.java` and `application.yml`: `CMS_OWNER_EMAIL` configuration.

### Next.js

- `lib/cms/admin-authorization-core.mjs` and `.d.ts`: pure roles, capabilities, normalized emails, password-change-only paths, and temporary-password generation.
- `lib/cms/admin-authorization-core.test.mjs`: behavior tests for the complete permission matrix and generated-password policy.
- `lib/cms/admin-session-core.mjs` and `.d.ts`: pure signed-session encoding and decoding.
- `lib/cms/admin-session-core.test.mjs`: tamper, expiry, payload, and role behavior tests.
- `lib/cms/admin-users.ts`: typed internal Spring client for login, validation, password change, and editor management.
- `lib/cms/admin-session.ts`: cookie and live database-session orchestration.
- `lib/cms/auth.ts`: capability-aware BFF authorization while preserving service-key access and same-origin checks.
- `app/admin/actions.ts`: email login, own-password change, and capability checks on existing mutations.
- `app/admin/user-actions.ts`: owner-only create/reset/status/expiration actions.
- `app/admin/(dashboard)/users/page.tsx`: owner user-management page.
- `app/admin/_components/admin-users-manager.tsx`: editor account controls and one-time temporary-password display.
- Existing admin pages, shell, delete controls, and `/api/admin` routes: role-aware rendering and enforcing guards.

## Execution Preflight

Run this before Task 1 in the isolated worktree:

```bash
npm ci
rg --files -0 -g '*.test.mjs' -g '!.next/**' -g '!.worktrees/**' | xargs -0 node --test
cd backend/cms
mvn test
cd ../..
git status --short
```

Expected: dependencies install from `package-lock.json`, existing Node and Spring tests pass, and only the committed design plus this plan differ from `origin/main`. If a baseline failure reproduces before any implementation edit, stop and report it instead of attributing it to the feature.

---

### Task 1: Add The Account Schema And Shared Password Hasher

**Files:**
- Create: `backend/cms/src/main/resources/db/migration/V9__admin_users.sql`
- Create: `backend/cms/src/main/java/com/daeho/cms/service/AdminPasswordHasher.java`
- Create: `backend/cms/src/test/java/com/daeho/cms/service/AdminPasswordHasherTest.java`
- Modify: `backend/cms/src/main/java/com/daeho/cms/service/AdminPasswordService.java`
- Modify: `backend/cms/src/test/java/com/daeho/cms/service/AdminPasswordServiceTest.java`

**Interfaces:**
- Consumes: existing `ValidationFailedException` and legacy hash format from `AdminPasswordService`.
- Produces: `String AdminPasswordHasher.hash(String password)`, `boolean AdminPasswordHasher.verify(String password, String storedHash)`, and `void AdminPasswordHasher.validateReplacement(String currentPassword, String newPassword)`.

- [ ] **Step 1: Write failing password-hasher tests**

Create tests that independently prove the stored value is not plaintext, correct and wrong passwords diverge, malformed hashes return false, and each password-policy boundary is rejected:

```java
@Test
void hashesAndVerifiesWithoutStoringPlaintext() {
  var hasher = new AdminPasswordHasher(new SecureRandom());
  var encoded = hasher.hash("Owner-Passw0rd!");

  assertTrue(encoded.startsWith("pbkdf2_sha256$310000$"));
  assertFalse(encoded.contains("Owner-Passw0rd!"));
  assertTrue(hasher.verify("Owner-Passw0rd!", encoded));
  assertFalse(hasher.verify("Wrong-Passw0rd!", encoded));
}

@Test
void rejectsWeakReplacementPasswords() {
  var hasher = new AdminPasswordHasher(new SecureRandom());

  assertThrows(ValidationFailedException.class,
      () -> hasher.validateReplacement("Owner-Passw0rd!", "short"));
  assertThrows(ValidationFailedException.class,
      () -> hasher.validateReplacement("Owner-Passw0rd!", "owner-passw0rd!"));
  assertThrows(ValidationFailedException.class,
      () -> hasher.validateReplacement("Owner-Passw0rd!", "OWNER-PASSW0RD!"));
  assertThrows(ValidationFailedException.class,
      () -> hasher.validateReplacement("Owner-Passw0rd!", "Owner-Password!"));
  assertThrows(ValidationFailedException.class,
      () -> hasher.validateReplacement("Owner-Passw0rd!", "Owner-Passw0rd1"));
  assertThrows(ValidationFailedException.class,
      () -> hasher.validateReplacement("Owner-Passw0rd!", " Owner-Passw0rd!"));
}
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
cd backend/cms
mvn test -Dtest=AdminPasswordHasherTest,AdminPasswordServiceTest
```

Expected: compilation fails because `AdminPasswordHasher` does not exist and `AdminPasswordService` still owns the private hashing implementation.

- [ ] **Step 3: Implement the focused password component**

Move the existing constants and PBKDF2 code into this exact public surface:

```java
@Component
public class AdminPasswordHasher {
  public AdminPasswordHasher() {
    this(new SecureRandom());
  }

  AdminPasswordHasher(SecureRandom random) {
    this.random = random;
  }

  public String hash(String password) {
    return encodePbkdf2(normalizePassword(password));
  }

  public boolean verify(String password, String storedHash) {
    return verifyEncodedHash(normalizePassword(password), storedHash);
  }

  public void validateReplacement(String currentPassword, String newPassword) {
    validatePolicy(currentPassword, newPassword);
  }
}
```

`hash` accepts the non-empty normalized legacy bootstrap password without applying replacement-policy rules so migration cannot silently change or reject the owner's current credential. `validateReplacement` alone enforces the 12–128 character and character-group policy before new hashes are created. `encodePbkdf2` and `normalizePassword` are private methods implemented by moving the existing logic unchanged.

Inject the hasher into `AdminPasswordService`; preserve the existing bootstrap verification, status version, change-password responses, and error statuses. Update its test constructor to pass a real hasher.

- [ ] **Step 4: Add the additive Flyway migration**

Use the complete schema:

```sql
CREATE TABLE IF NOT EXISTS cms_admin_users (
  id text PRIMARY KEY,
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('OWNER', 'EDITOR')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  expires_at timestamptz,
  must_change_password boolean NOT NULL DEFAULT false,
  session_version bigint NOT NULL DEFAULT 1,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cms_admin_users_email_normalized CHECK (email = lower(btrim(email)))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_admin_users_email_lower
  ON cms_admin_users (lower(email));

CREATE INDEX IF NOT EXISTS idx_cms_admin_users_role_status
  ON cms_admin_users (role, status);
```

- [ ] **Step 5: Verify GREEN and inspect the migration**

Run:

```bash
cd backend/cms
mvn test -Dtest=AdminPasswordHasherTest,AdminPasswordServiceTest
cd ../..
git diff --check
```

Expected: both test classes pass; no whitespace errors; the legacy service behavior remains unchanged.

- [ ] **Step 6: Commit Task 1**

```bash
git add backend/cms/src/main/resources/db/migration/V9__admin_users.sql backend/cms/src/main/java/com/daeho/cms/service/AdminPasswordHasher.java backend/cms/src/main/java/com/daeho/cms/service/AdminPasswordService.java backend/cms/src/test/java/com/daeho/cms/service/AdminPasswordHasherTest.java backend/cms/src/test/java/com/daeho/cms/service/AdminPasswordServiceTest.java
git commit -m "feat: add CMS admin user password foundation"
```

---

### Task 2: Store Users And Bootstrap The Existing Owner

**Files:**
- Create: `backend/cms/src/main/java/com/daeho/cms/service/AdminUserRecord.java`
- Create: `backend/cms/src/main/java/com/daeho/cms/service/AdminIdentity.java`
- Create: `backend/cms/src/main/java/com/daeho/cms/service/AdminUserSummary.java`
- Create: `backend/cms/src/main/java/com/daeho/cms/service/AdminUserStore.java`
- Create: `backend/cms/src/main/java/com/daeho/cms/repository/JdbcAdminUserStore.java`
- Create: `backend/cms/src/main/java/com/daeho/cms/service/AdminUserBootstrap.java`
- Create: `backend/cms/src/test/java/com/daeho/cms/repository/JdbcAdminUserStoreTest.java`
- Create: `backend/cms/src/test/java/com/daeho/cms/service/AdminUserBootstrapTest.java`
- Modify: `backend/cms/src/main/java/com/daeho/cms/config/CmsProperties.java`
- Modify: `backend/cms/src/main/resources/application.yml`
- Modify: `docker-compose.yml`
- Modify: `.env.example`
- Modify: every Java test constructor that instantiates `CmsProperties`

**Interfaces:**
- Consumes: `AdminPasswordHasher`, `AdminPasswordStore`, and `CmsProperties.adminPassword()`.
- Produces: `AdminUserStore`, `AdminUserRecord`, password-free `AdminIdentity` and `AdminUserSummary`, and `void AdminUserBootstrap.ensureOwner()`.

- [ ] **Step 1: Write failing JDBC store tests**

Define the record fields and storage behavior before implementation:

```java
public record AdminUserRecord(
    String id,
    String email,
    String passwordHash,
    String role,
    String status,
    Instant expiresAt,
    boolean mustChangePassword,
    long sessionVersion,
    Instant lastLoginAt,
    Instant createdAt,
    Instant updatedAt
) {}
```

The repository test must record JDBC calls and assert literal normalized inputs for `findByEmail("  OWNER@EXAMPLE.COM ")`, parameterized insertion, password/session-version update, status/session-version update, expiration/session-version update, last-login update, and password-free list mapping. A wrong SQL column name or missing `session_version = session_version + 1` must fail the test.

- [ ] **Step 2: Run the JDBC store test and verify RED**

```bash
cd backend/cms
mvn test -Dtest=JdbcAdminUserStoreTest
```

Expected: compilation fails because the record, store interface, and JDBC store do not exist.

- [ ] **Step 3: Implement the store boundary**

Create this interface and implement every method with parameterized `JdbcTemplate` calls:

```java
public interface AdminUserStore {
  Optional<AdminUserRecord> findByEmail(String email);
  Optional<AdminUserRecord> findById(String id);
  List<AdminUserRecord> listUsers();
  long countOwners();
  long countActiveOwners();
  void create(AdminUserRecord user);
  void updateLastLogin(String id, Instant loggedInAt);
  void updatePassword(String id, String passwordHash, boolean mustChangePassword);
  void updateStatus(String id, String status);
  void updateExpiration(String id, Instant expiresAt);
}
```

`updatePassword`, `updateStatus`, and `updateExpiration` each update `updated_at` and increment `session_version`. `findByEmail` normalizes with `trim().toLowerCase(Locale.ROOT)` before querying. `countOwners()` prevents bootstrap from creating a second owner when an owner record already exists; `countActiveOwners()` supports the defensive last-owner check.

- [ ] **Step 4: Write failing owner-bootstrap tests**

Use memory stores and a literal owner email to cover both migration paths:

```java
@Test
void copiesLegacyHashIntoTheConfiguredOwner() {
  var legacyHash = hasher.hash("Current-Owner-Passw0rd!");
  legacyStore.savePasswordHash(legacyHash);

  bootstrap.ensureOwner();

  var owner = users.findByEmail("daehovriano@gmail.com").orElseThrow();
  assertEquals("OWNER", owner.role());
  assertEquals("active", owner.status());
  assertNull(owner.expiresAt());
  assertFalse(owner.mustChangePassword());
  assertEquals(legacyHash, owner.passwordHash());
}

@Test
void hashesBootstrapPasswordWhenNoLegacyHashExists() {
  bootstrapWithPassword("Current-Owner-Passw0rd!").ensureOwner();

  var owner = users.findByEmail("daehovriano@gmail.com").orElseThrow();
  assertTrue(hasher.verify("Current-Owner-Passw0rd!", owner.passwordHash()));
  assertFalse(owner.passwordHash().contains("Current-Owner-Passw0rd!"));
}
```

Also test idempotency and failure when no owner exists and either `CMS_OWNER_EMAIL` or a usable legacy password is missing.

- [ ] **Step 5: Run the bootstrap tests and verify RED**

```bash
cd backend/cms
mvn test -Dtest=AdminUserBootstrapTest
```

Expected: compilation fails because `AdminUserBootstrap` and `CmsProperties.ownerEmail()` do not exist.

- [ ] **Step 6: Implement bootstrap and configuration**

Add `String ownerEmail` immediately after `String adminPassword` in `CmsProperties`, map it in `application.yml`, and pass it to `cms-api` in Compose:

```yaml
cms:
  admin-password: ${CMS_ADMIN_PASSWORD:}
  owner-email: ${CMS_OWNER_EMAIL:}
```

```yaml
CMS_OWNER_EMAIL: ${CMS_OWNER_EMAIL:-}
```

Add `CMS_OWNER_EMAIL=owner@example.com` to `.env.example` with a comment that production must set it before enabling multi-user login. Update every explicit `new CmsProperties(...)` test call to include the owner-email argument in the same record position.

Implement `AdminUserBootstrap` as an `ApplicationRunner` that calls a package-visible `ensureOwner()` method. It must normalize the configured email, return without modification when any owner already exists, copy the legacy hash when present, otherwise hash `CMS_ADMIN_PASSWORD`, and throw `IllegalStateException` when it cannot create an owner.

- [ ] **Step 7: Verify GREEN**

```bash
cd backend/cms
mvn test -Dtest=JdbcAdminUserStoreTest,AdminUserBootstrapTest,AdminPasswordServiceTest,AdminAuthTest
cd ../..
git diff --check
```

Expected: all focused backend tests pass and all `CmsProperties` constructors compile.

- [ ] **Step 8: Commit Task 2**

```bash
git add .env.example docker-compose.yml backend/cms/src/main/resources/application.yml backend/cms/src/main/java/com/daeho/cms/config/CmsProperties.java backend/cms/src/main/java/com/daeho/cms/service/AdminUserRecord.java backend/cms/src/main/java/com/daeho/cms/service/AdminIdentity.java backend/cms/src/main/java/com/daeho/cms/service/AdminUserSummary.java backend/cms/src/main/java/com/daeho/cms/service/AdminUserStore.java backend/cms/src/main/java/com/daeho/cms/repository/JdbcAdminUserStore.java backend/cms/src/main/java/com/daeho/cms/service/AdminUserBootstrap.java backend/cms/src/test/java
git commit -m "feat: bootstrap owner account from legacy CMS password"
```

---

### Task 3: Implement Backend Login, Session Validation, And Editor Lifecycle

**Files:**
- Create: `backend/cms/src/main/java/com/daeho/cms/service/AdminUserService.java`
- Create: `backend/cms/src/main/java/com/daeho/cms/controller/AdminUsersController.java`
- Create: `backend/cms/src/test/java/com/daeho/cms/service/AdminUserServiceTest.java`
- Create: `backend/cms/src/test/java/com/daeho/cms/controller/AdminUsersControllerTest.java`
- Modify: `backend/cms/src/test/java/com/daeho/cms/controller/CmsHttpContractTest.java`

**Interfaces:**
- Consumes: `AdminUserStore`, `AdminPasswordHasher`, and internal-key `AdminAuth.requireAdmin(HttpServletRequest)`.
- Produces: `authenticate`, `validateSession`, `changeOwnPassword`, `listUsers`, `createEditor`, `resetEditorPassword`, `setEditorStatus`, and `setEditorExpiration` service methods plus the internal HTTP endpoints from the approved spec.

- [ ] **Step 1: Write failing service authentication tests**

Use a memory `AdminUserStore` and fixed `Instant` values. The expected identity shape is:

```java
public record AdminIdentity(
    String id,
    String email,
    String role,
    long sessionVersion,
    Instant expiresAt,
    boolean mustChangePassword
) {}
```

Test normalized-email login, wrong password, unknown email, disabled account, exact expiration boundary, successful last-login update, matching session version, and stale session version. Unknown, disabled, expired, and wrong-password authentication must all throw `ResponseStatusException` with `401` and reason `Invalid email or password.`. For an unknown email, verify the service still performs one password-hash comparison against a fixed valid dummy hash before returning the generic error so timing does not trivially reveal account existence.

- [ ] **Step 2: Run authentication tests and verify RED**

```bash
cd backend/cms
mvn test -Dtest=AdminUserServiceTest
```

Expected: compilation fails because `AdminUserService` does not exist.

- [ ] **Step 3: Implement authentication and own-password change**

Implement these exact entry points:

```java
public AdminIdentity authenticate(String email, String password, Instant now)
public AdminIdentity validateSession(String userId, long sessionVersion, Instant now)
public AdminIdentity changeOwnPassword(
    String userId,
    long sessionVersion,
    String currentPassword,
    String newPassword,
    Instant now
)
```

`authenticate` performs one generic unauthorized branch after record lookup and password verification, then updates last login. `validateSession` rejects missing, disabled, expired, or mismatched-version users. `changeOwnPassword` first validates the live session, verifies the current password, applies password policy, stores the new hash with `mustChangePassword=false`, and returns the identity reloaded with its incremented session version.

- [ ] **Step 4: Write failing editor-lifecycle tests**

Cover literal behavior:

```java
@Test
void ownerCreatesThirtyDayEditorThatMustChangePassword() {
  var created = service.createEditor(
      OWNER_ID,
      1L,
      " LOCALOCA.MASTER@GMAIL.COM ",
      "Temp-Editor-Passw0rd!",
      NOW
  );

  assertEquals("localoca.master@gmail.com", created.email());
  assertEquals("EDITOR", created.role());
  assertEquals(NOW.plus(30, ChronoUnit.DAYS), created.expiresAt());
  assertTrue(created.mustChangePassword());
}
```

Also test duplicate normalized email, editor actor denial, editor reset setting `mustChangePassword=true`, disable/enable, explicit expiration, each session-version increment, owner-target rejection, and last-active-owner protection.

- [ ] **Step 5: Run lifecycle tests and verify RED**

```bash
cd backend/cms
mvn test -Dtest=AdminUserServiceTest
```

Expected: the authentication cases pass but lifecycle cases fail because owner-only methods are absent.

- [ ] **Step 6: Implement owner-only lifecycle methods**

Add exact methods:

```java
public List<AdminUserSummary> listUsers(String actorId, long actorVersion, Instant now)
public AdminUserSummary createEditor(String actorId, long actorVersion, String email, String temporaryPassword, Instant now)
public AdminUserSummary resetEditorPassword(String actorId, long actorVersion, String targetId, String temporaryPassword, Instant now)
public AdminUserSummary setEditorStatus(String actorId, long actorVersion, String targetId, String status, Instant now)
public AdminUserSummary setEditorExpiration(String actorId, long actorVersion, String targetId, Instant expiresAt, Instant now)
```

Every method validates the actor session and role before looking up or mutating the target. `createEditor` fixes the role to `EDITOR`; no method accepts a role input. User-management responses are built from `AdminUserSummary(id, email, role, status, expiresAt, mustChangePassword, sessionVersion, lastLoginAt, createdAt, updatedAt)` and never expose password hashes. Expiration updates reject timestamps that are not strictly in the future. Duplicate normalized-email races map `DuplicateKeyException` to the same structured email validation error as the pre-insert duplicate check.

- [ ] **Step 7: Write failing controller contract tests**

Build standalone `MockMvc` around a mocked service and real `AdminAuth`. Verify:

```java
mvc.perform(post("/api/admin/auth/login")
        .header("x-admin-api-key", ADMIN_KEY)
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"owner@example.com\",\"password\":\"Owner-Passw0rd!\"}"))
    .andExpect(status().isOk())
    .andExpect(jsonPath("$.user.email").value("owner@example.com"))
    .andExpect(jsonPath("$.user.passwordHash").doesNotExist());

mvc.perform(post("/api/admin/users/editors")
        .header("x-admin-api-key", ADMIN_KEY)
        .header("x-admin-user-id", OWNER_ID)
        .header("x-admin-session-version", "1")
        .contentType(MediaType.APPLICATION_JSON)
        .content("{\"email\":\"editor@example.com\",\"temporaryPassword\":\"Temp-Editor-Passw0rd!\"}"))
    .andExpect(status().isCreated())
    .andExpect(jsonPath("$.user.role").value("EDITOR"));
```

Cover login, session validation, own-password change, list, create, reset, status, expiration, missing service key, missing actor headers, generic login error, and service-generated `403` for an editor actor.

- [ ] **Step 8: Implement `AdminUsersController`**

Register these routes exactly:

```text
POST  /api/admin/auth/login
POST  /api/admin/auth/session
POST  /api/admin/auth/change-own-password
GET   /api/admin/users
POST  /api/admin/users/editors
POST  /api/admin/users/{id}/reset-password
PATCH /api/admin/users/{id}/status
PATCH /api/admin/users/{id}/expiration
```

Call `AdminAuth.requireAdmin` first on every endpoint. Parse actor headers only for own-password and user-administration operations. Return `201` for editor creation and structured `400` validation issues for malformed email, password, status, or expiration. Keep legacy auth endpoints in `AdminCmsController` and update its test constructor only as required by the new injected dependencies.

- [ ] **Step 9: Verify GREEN**

```bash
cd backend/cms
mvn test -Dtest=AdminUserServiceTest,AdminUsersControllerTest,CmsHttpContractTest
cd ../..
git diff --check
```

Expected: service and controller tests pass; existing CMS HTTP contracts remain green.

- [ ] **Step 10: Commit Task 3**

```bash
git add backend/cms/src/main/java/com/daeho/cms/service/AdminUserService.java backend/cms/src/main/java/com/daeho/cms/controller/AdminUsersController.java backend/cms/src/test/java/com/daeho/cms/service/AdminUserServiceTest.java backend/cms/src/test/java/com/daeho/cms/controller/AdminUsersControllerTest.java backend/cms/src/test/java/com/daeho/cms/controller/CmsHttpContractTest.java
git commit -m "feat: add CMS user authentication API"
```

---

### Task 4: Add Next.js Roles, Signed Identity Sessions, And Backend Client

**Files:**
- Create: `lib/cms/admin-authorization-core.mjs`
- Create: `lib/cms/admin-authorization-core.d.ts`
- Create: `lib/cms/admin-authorization-core.test.mjs`
- Create: `lib/cms/admin-session-core.mjs`
- Create: `lib/cms/admin-session-core.d.ts`
- Create: `lib/cms/admin-session-core.test.mjs`
- Create: `lib/cms/admin-users.ts`
- Modify: `lib/cms/admin-session.ts`
- Modify: `lib/cms/auth.ts`
- Modify: `next.config.ts`
- Create: `app/admin/forbidden.tsx`
- Modify: `lib/admin-i18n.ts`

**Interfaces:**
- Consumes: Spring `AdminIdentity` JSON and `cmsBackendRequest`.
- Produces: `AdminRole`, `AdminCapability`, `AdminIdentity`, `AdminUserSummary`, `hasAdminCapability`, `generateTemporaryAdminPassword`, `getAdminIdentity`, `assertAdminCapability`, and `requireAdminCapability`.

- [ ] **Step 1: Write failing authorization-core tests**

Use literal expectation tables, not expectations generated from the production map:

```javascript
test('editor receives content-write but never destructive or private capabilities', () => {
  assert.equal(hasAdminCapability('EDITOR', 'content:read'), true);
  assert.equal(hasAdminCapability('EDITOR', 'content:write'), true);
  assert.equal(hasAdminCapability('EDITOR', 'content:delete'), false);
  assert.equal(hasAdminCapability('EDITOR', 'inquiries:read'), false);
  assert.equal(hasAdminCapability('EDITOR', 'analytics:read'), false);
  assert.equal(hasAdminCapability('EDITOR', 'notifications:manage'), false);
  assert.equal(hasAdminCapability('EDITOR', 'system:manage'), false);
  assert.equal(hasAdminCapability('EDITOR', 'users:manage'), false);
  assert.equal(hasAdminCapability('EDITOR', 'account:self'), true);
});

test('temporary passwords satisfy the CMS password policy', () => {
  for (let index = 0; index < 100; index += 1) {
    const password = generateTemporaryAdminPassword();
    assert.ok(password.length >= 20);
    assert.match(password, /[a-z]/);
    assert.match(password, /[A-Z]/);
    assert.match(password, /[0-9]/);
    assert.match(password, /[^A-Za-z0-9]/);
    assert.doesNotMatch(password, /\s/);
  }
});
```

Also prove `OWNER` has every named capability, email normalization is trim-plus-lowercase, and first-login identities allow only account password change, API-session restore, and logout paths.

- [ ] **Step 2: Run authorization tests and verify RED**

```bash
node --test lib/cms/admin-authorization-core.test.mjs
```

Expected: module-not-found failure for `admin-authorization-core.mjs`.

- [ ] **Step 3: Implement the pure authorization core**

Export the capability list from the runtime module and match this exact declaration surface in `admin-authorization-core.d.ts`:

```javascript
export const adminCapabilities = [
  'content:read',
  'content:write',
  'content:delete',
  'inquiries:read',
  'inquiries:write',
  'analytics:read',
  'notifications:manage',
  'system:manage',
  'users:manage',
  'account:self'
];

export function normalizeAdminEmail(value: unknown): string;
export function hasAdminCapability(role: AdminRole, capability: AdminCapability): boolean;
export function isPasswordChangeOnlyPath(pathname: string): boolean;
export function generateTemporaryAdminPassword(): string;
```

`generateTemporaryAdminPassword` uses `randomBytes` and a fixed safe alphabet, explicitly places one character from each policy group, fills to at least 20 characters, and cryptographically shuffles the result.

- [ ] **Step 4: Write failing signed-session tests**

Define a literal identity fixture and verify round-trip, wrong secret, payload tampering, malformed values, and eight-hour expiry:

```javascript
const identity = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'editor@example.com',
  role: 'EDITOR',
  sessionVersion: 3,
  expiresAt: '2026-09-09T00:00:00Z',
  mustChangePassword: true
};

test('signed session preserves the authenticated identity', () => {
  const value = createSignedAdminSession(identity, 'test-secret', Date.parse('2026-08-10T00:00:00Z'));
  assert.deepEqual(
    parseSignedAdminSession(value, 'test-secret', Date.parse('2026-08-10T01:00:00Z')),
    identity
  );
});
```

- [ ] **Step 5: Run session-core tests and verify RED**

```bash
node --test lib/cms/admin-session-core.test.mjs
```

Expected: module-not-found failure for `admin-session-core.mjs`.

- [ ] **Step 6: Implement the session core and typed backend client**

`admin-session-core.mjs` uses base64url JSON plus HMAC-SHA256 and matches this exact declaration surface in `admin-session-core.d.ts`:

```javascript
export function createSignedAdminSession(identity: AdminIdentity, secret: string, issuedAtMs: number): string;
export function parseSignedAdminSession(value: string, secret: string, nowMs: number): AdminIdentity | null;
```

`admin-users.ts` defines the matching TypeScript identity and implements:

```typescript
export type AdminIdentity = {
  id: string;
  email: string;
  role: 'OWNER' | 'EDITOR';
  sessionVersion: number;
  expiresAt: string | null;
  mustChangePassword: boolean;
};

export type AdminUserSummary = AdminIdentity & {
  status: 'active' | 'disabled';
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function authenticateAdmin(email: string, password: string): Promise<AdminIdentity>
export async function validateAdminIdentity(userId: string, sessionVersion: number): Promise<AdminIdentity>
export async function changeOwnAdminPassword(identity: AdminIdentity, currentPassword: string, newPassword: string): Promise<AdminIdentity>
export async function listAdminUsers(identity: AdminIdentity): Promise<AdminUserSummary[]>
export async function createAdminEditor(identity: AdminIdentity, email: string, temporaryPassword: string): Promise<AdminUserSummary>
export async function resetAdminEditorPassword(identity: AdminIdentity, targetId: string, temporaryPassword: string): Promise<AdminUserSummary>
export async function updateAdminEditorStatus(identity: AdminIdentity, targetId: string, status: 'active' | 'disabled'): Promise<AdminUserSummary>
export async function updateAdminEditorExpiration(identity: AdminIdentity, targetId: string, expiresAt: string): Promise<AdminUserSummary>
```

User-management requests send `x-admin-user-id` and `x-admin-session-version` from the validated identity. No client function accepts a role.

- [ ] **Step 7: Rewrite cookie orchestration and capability-aware BFF auth**

`admin-session.ts` exposes:

```typescript
export async function getAdminIdentity(): Promise<AdminIdentity | null>
export async function assertAdminSession(): Promise<AdminIdentity>
export async function assertAdminCapability(capability: AdminCapability): Promise<AdminIdentity>
export async function hasAdminSession(): Promise<boolean>
export async function hasAdminApiCapability(capability: AdminCapability): Promise<boolean>
export async function createAdminSession(identity: AdminIdentity): Promise<void>
export async function restoreAdminApiSession(): Promise<boolean>
export async function clearAdminSession(): Promise<void>
```

Parsing a valid cookie is not sufficient: `getAdminIdentity` calls `validateAdminIdentity` so disabled, expired, and stale-version sessions fail live. Keep the two cookie paths and secure-cookie behavior.

Change `lib/cms/auth.ts` to export:

```typescript
export async function requireAdminCapability(
  request: NextRequest,
  capability: AdminCapability
): Promise<NextResponse | null>
```

The existing service API key remains an owner-equivalent bypass for internal automation. Browser sessions must have the requested capability, and unsafe methods must still pass same-origin validation.

Enable `experimental.authInterrupts` only for the normal server build with `authInterrupts: !isFrontendOnlyBuild`, add a localized `app/admin/forbidden.tsx` boundary with Chinese, Korean, and English title/body/back strings in `lib/admin-i18n.ts`, and have `assertAdminCapability` call Next's `forbidden()` after authentication when the role lacks the requested capability. API guards continue to return JSON `403` responses.

- [ ] **Step 8: Verify GREEN**

```bash
node --test lib/cms/admin-authorization-core.test.mjs lib/cms/admin-session-core.test.mjs
npx tsc --noEmit
git diff --check
```

Expected: all core tests and type checking pass.

- [ ] **Step 9: Commit Task 4**

```bash
git add lib/cms/admin-authorization-core.mjs lib/cms/admin-authorization-core.d.ts lib/cms/admin-authorization-core.test.mjs lib/cms/admin-session-core.mjs lib/cms/admin-session-core.d.ts lib/cms/admin-session-core.test.mjs lib/cms/admin-users.ts lib/cms/admin-session.ts lib/cms/auth.ts next.config.ts app/admin/forbidden.tsx lib/admin-i18n.ts
git commit -m "feat: add role-aware CMS sessions"
```

---

### Task 5: Convert Login And Account Security To Individual Users

**Files:**
- Modify: `app/admin/(auth)/login/page.tsx`
- Modify: `app/admin/(dashboard)/layout.tsx`
- Modify: `app/admin/(dashboard)/account/page.tsx`
- Modify: `app/admin/actions.ts`
- Modify: `app/admin/api-session/route.ts`
- Modify: `lib/admin-i18n.ts`
- Create: `lib/cms/admin-login-core.mjs`
- Create: `lib/cms/admin-login-core.d.ts`
- Create: `lib/cms/admin-login-core.test.mjs`
- Create: `app/api/admin/inquiries/admin-role-session.integration.test.mjs`
- Modify or replace: `app/admin/actions-password.test.mjs`

**Interfaces:**
- Consumes: `authenticateAdmin`, `changeOwnAdminPassword`, `createAdminSession`, `assertAdminSession`, and `isPasswordChangeOnlyPath`.
- Produces: email-and-password login, forced first-password-change flow, and a current-user account page.

- [ ] **Step 1: Write failing login-key and real role-session tests**

First test `normalizeAdminEmail` integration with a pure failed-attempt key helper:

```javascript
test('login attempt key combines normalized email and client IP', () => {
  assert.equal(
    createAdminLoginAttemptKey(' OWNER@EXAMPLE.COM ', '203.0.113.10'),
    'owner@example.com|203.0.113.10'
  );
});
```

Then adapt the existing spawned-Next integration pattern. Run a fake Spring server that implements `/api/admin/auth/session` with a complete owner identity. Use `createSignedAdminSession` to create real UI and API cookies, then request `/admin` and `/admin/account`.

The test proves:

```javascript
assert.equal((await fetchWithCookies('/admin', ownerCookies)).status, 200);
assert.equal((await fetchWithCookies('/admin/account', ownerCookies)).status, 200);
```

Also prove same-origin API-cookie recovery works with the new identity payload and a stale session version is rejected after the fake Spring session endpoint denies it. Spring controller tests from Task 3 remain the automated proof that wrong email/password, unknown, disabled, and expired accounts share the same login response. Task 7 adds direct first-login and editor-capability page denial coverage. The final Docker/browser smoke test exercises the rendered login form and server action without introducing a browser-testing dependency.

- [ ] **Step 2: Run the integration test and verify RED**

```bash
node --test lib/cms/admin-login-core.test.mjs app/api/admin/inquiries/admin-role-session.integration.test.mjs
```

Expected: the helper module is missing and existing API-session recovery cannot validate the new identity payload.

- [ ] **Step 3: Implement email login and forced password change**

Update the form fields:

```tsx
<input name="email" type="email" autoComplete="username" required />
<input name="password" type="password" autoComplete="current-password" required />
```

`admin-login-core.mjs` exports `createAdminLoginAttemptKey(email, ipAddress)` and delegates normalization to `admin-authorization-core.mjs`. `loginAction` normalizes the email, builds the rate-limit key from normalized email plus client IP, calls `authenticateAdmin`, creates both cookies, and redirects to `/admin/account?required=1` when `mustChangePassword` is true or `/admin` otherwise.

`AdminDashboardLayout` obtains the identity once, limits a first-login shell to account and logout navigation, and passes the identity to the shell. Each dashboard page receives its own capability guard in Task 7; that guard redirects `mustChangePassword=true` identities unless the requested capability is `account:self`. The account page displays email and role. `changeAdminPasswordAction` changes only the signed-in user, clears both cookies after success, and retains the existing success redirect ordering outside the backend-error catch.

Update Chinese, Korean, and English strings for email, role names, generic login error, rate limit, current password, new password, confirmation, and required first change.

- [ ] **Step 4: Update API-session recovery**

`POST /admin/api-session` remains same-origin only. It restores the API cookie only when the UI cookie resolves to an active database identity. It cannot upgrade old password-only cookies after the multi-user release.

- [ ] **Step 5: Verify GREEN**

```bash
node --test lib/cms/admin-login-core.test.mjs app/api/admin/inquiries/admin-role-session.integration.test.mjs app/admin/actions-password.test.mjs lib/cms/admin-authorization-core.test.mjs lib/cms/admin-session-core.test.mjs
npx tsc --noEmit
```

Expected: real Next login/session integration passes; the password action keeps correct cleanup and redirect behavior; type checking passes.

- [ ] **Step 6: Commit Task 5**

```bash
git add 'app/admin/(auth)/login/page.tsx' 'app/admin/(dashboard)/layout.tsx' 'app/admin/(dashboard)/account/page.tsx' app/admin/actions.ts app/admin/api-session/route.ts lib/admin-i18n.ts lib/cms/admin-login-core.mjs lib/cms/admin-login-core.d.ts lib/cms/admin-login-core.test.mjs app/api/admin/inquiries/admin-role-session.integration.test.mjs app/admin/actions-password.test.mjs
git commit -m "feat: switch CMS login to individual accounts"
```

---

### Task 6: Add Owner User Management And Role-Aware CMS Navigation

**Files:**
- Create: `app/admin/user-actions.ts`
- Create: `app/admin/(dashboard)/users/page.tsx`
- Create: `app/admin/_components/admin-users-manager.tsx`
- Create: `app/admin/admin-users-manager.test.mjs`
- Create: `lib/cms/admin-user-action-core.mjs`
- Create: `lib/cms/admin-user-action-core.d.ts`
- Modify: `app/admin/_components/admin-shell.tsx`
- Modify: `app/admin/(dashboard)/page.tsx`
- Modify: `lib/admin-i18n.ts`

**Interfaces:**
- Consumes: `assertAdminCapability('users:manage')`, editor lifecycle clients, and `generateTemporaryAdminPassword()`.
- Produces: owner-only create/reset/status/expiration actions and role-filtered navigation/dashboard.

- [ ] **Step 1: Write failing action-state and temporary-secret behavior tests**

Test pure action-state constructors from `lib/cms/admin-user-action-core.mjs`; `user-actions.ts` imports these constructors so tests exercise the same error-secret stripping and success-state behavior without loading the Next server-action runtime. The observable state has this shape:

```typescript
type AdminUserActionState = {
  status: 'idle' | 'success' | 'error';
  messageKey: string;
  temporaryPassword?: string;
  user?: AdminUserSummary;
};
```

Prove that create/reset success includes a temporary password, status/expiration success does not, error state never includes submitted password values, and a fresh idle state cannot recover a previous password.

- [ ] **Step 2: Run the focused test and verify RED**

```bash
node --test app/admin/admin-users-manager.test.mjs lib/cms/admin-authorization-core.test.mjs
```

Expected: module or exported-helper failure because user actions and state do not exist.

- [ ] **Step 3: Implement owner-only actions**

Add:

```typescript
export async function createEditorAction(previous: AdminUserActionState, formData: FormData): Promise<AdminUserActionState>
export async function resetEditorPasswordAction(previous: AdminUserActionState, formData: FormData): Promise<AdminUserActionState>
export async function setEditorStatusAction(previous: AdminUserActionState, formData: FormData): Promise<AdminUserActionState>
export async function setEditorExpirationAction(previous: AdminUserActionState, formData: FormData): Promise<AdminUserActionState>
```

Each action calls `assertAdminCapability('users:manage')` before reading target fields, generates temporary passwords only for create/reset, maps backend validation to localized error keys, revalidates `/admin/users`, and returns the secret only in the action state.

- [ ] **Step 4: Implement `/admin/users` and one-time display**

The server page requires `users:manage`, lists password-free identities, and renders a client manager. The manager provides create editor, reset password, active/disabled toggle, and explicit expiration date. It renders `temporaryPassword` in a selectable read-only field only while the current action state contains it; refresh receives a new idle state.

- [ ] **Step 5: Filter navigation and dashboard by identity**

Pass the validated identity into `AdminShell`. Define navigation items with required capabilities and filter using `hasAdminCapability`. Owners gain `/admin/users`; editors see only overview, news, collections, media, popup, footer, pages, and account.

Change the dashboard so an owner loads the existing inquiries, status, and notification health, while an editor loads only page/news/collection/media inventories. The editor branch must not call restricted repository functions.

- [ ] **Step 6: Add localized copy and verify GREEN**

Add Chinese, Korean, and English strings for users navigation, page title, email, role, active/disabled, expiration, last login, first-login state, create, reset, extend, temporary-password warning, and each success/error state.

Run:

```bash
node --test app/admin/admin-users-manager.test.mjs lib/cms/admin-authorization-core.test.mjs
npx tsc --noEmit
```

Expected: action-state tests pass, capability filtering type-checks, and no password appears outside the immediate success state.

- [ ] **Step 7: Commit Task 6**

```bash
git add app/admin/user-actions.ts 'app/admin/(dashboard)/users/page.tsx' app/admin/_components/admin-users-manager.tsx app/admin/admin-users-manager.test.mjs lib/cms/admin-user-action-core.mjs lib/cms/admin-user-action-core.d.ts app/admin/_components/admin-shell.tsx 'app/admin/(dashboard)/page.tsx' lib/admin-i18n.ts
git commit -m "feat: add CMS editor account management"
```

---

### Task 7: Enforce Capabilities Across Every Existing CMS Boundary

**Files:**
- Modify: `app/admin/actions.ts`
- Modify: restricted pages under `app/admin/(dashboard)/inquiries`, `notifications`, `analytics`, and `export`
- Modify: `app/admin/(dashboard)/export/download/route.ts`
- Modify: delete controls in `app/admin/(dashboard)/news/page.tsx`, `app/admin/(dashboard)/collections/page.tsx`, and `app/admin/(dashboard)/media/page.tsx`
- Modify: all route handlers under `app/api/admin` except `locale`
- Modify: `app/api/admin/inquiries/admin-session-auth.integration.test.mjs`
- Create: `app/api/admin/inquiries/admin-capability-enforcement.integration.test.mjs`

**Interfaces:**
- Consumes: `assertAdminCapability` and `requireAdminCapability`.
- Produces: end-to-end denial of all editor-restricted routes and destructive operations.

- [ ] **Step 1: Write a failing real capability integration test**

Spawn Next against a fake Spring session endpoint as the existing integration test does. Create valid signed owner and editor cookies using `admin-session-core.mjs`. Use literal expected statuses:

```javascript
const cases = [
  ['GET', '/api/admin/pages', 200],
  ['PUT', '/api/admin/pages/home', 200],
  ['GET', '/api/admin/inquiries', 403],
  ['PATCH', '/api/admin/inquiries/test-inquiry', 403],
  ['GET', '/api/admin/notifications/settings', 403],
  ['GET', '/api/admin/status', 403],
  ['GET', '/api/admin/export', 403],
  ['DELETE', '/api/admin/news/news-1', 403],
  ['DELETE', '/api/admin/collections/collection-1', 403],
  ['DELETE', '/api/admin/media/media-1', 403]
];
```

For every denied editor request, assert the fake backend received no content/inquiry/destructive call. Repeat representative restricted and delete cases with owner cookies and expect the existing successful response. Keep cross-site unsafe-request denial coverage.

Add a second editor identity with `mustChangePassword=true`. Its `/admin/account` request succeeds, while `/admin`, `/admin/news`, and `/api/admin/pages` are blocked before content data loads; the page requests redirect to `/admin/account?required=1` and the API request returns `403`.

- [ ] **Step 2: Run the capability integration test and verify RED**

```bash
node --test app/api/admin/inquiries/admin-capability-enforcement.integration.test.mjs
```

Expected: editor restricted and delete requests currently reach the backend or return success because routes only check generic admin session state.

- [ ] **Step 3: Guard existing server actions**

Place guards before parsing inputs or loading sensitive data:

```text
updateInquiryStatusAction -> inquiries:write
saveNewsAction -> content:write
deleteNewsAction -> content:delete
saveCollectionAction -> content:write
deleteCollectionAction -> content:delete
savePageAction -> content:write
saveSitePopupAction -> content:write
uploadMediaAction -> content:write
updateMediaAction -> content:write
deleteMediaAction -> content:delete
```

Do not rely on the dashboard layout because server actions can be invoked directly.

- [ ] **Step 4: Guard restricted pages and downloads**

Require explicit capabilities before repository access:

```text
/admin/inquiries and detail -> inquiries:read
/admin/notifications -> notifications:manage
/admin/analytics -> analytics:read
/admin/export and download -> system:manage
/admin/users -> users:manage
```

Guard every content page with `content:read` before it loads repository data: the overview, news list/editor, collections list/editor, media, popup, footer, pages list, and page editor. Guard the account page with `account:self`. This makes the capability guard redirect first-login identities before direct content-page requests can load data. Remove delete controls for editors by checking `content:delete` on the server and conditionally rendering the forms/buttons.

- [ ] **Step 5: Guard every `/api/admin` handler by method**

Replace generic `requireAdmin` calls with exact capabilities:

```text
pages GET -> content:read; PUT -> content:write
news GET -> content:read; POST/PUT -> content:write; DELETE -> content:delete
collections GET -> content:read; POST/PUT -> content:write; DELETE -> content:delete
media GET -> content:read; POST/PATCH -> content:write; DELETE -> content:delete
inquiries GET -> inquiries:read; preview/PATCH/retry -> inquiries:write
notifications all methods -> notifications:manage
analytics GET -> analytics:read
status/import/export GET or POST -> system:manage
```

Keep the internal service-key bypass and same-origin behavior. `app/api/admin/locale/route.ts` remains unchanged because it only writes the UI-language cookie and already constrains the redirect path.

- [ ] **Step 6: Verify GREEN**

```bash
node --test app/api/admin/inquiries/admin-capability-enforcement.integration.test.mjs app/api/admin/inquiries/admin-session-auth.integration.test.mjs lib/cms/admin-authorization-core.test.mjs lib/cms/admin-session-core.test.mjs
npx tsc --noEmit
git diff --check
```

Expected: editor allowed cases succeed, restricted cases return `403` before backend calls, owner cases preserve current behavior, and cross-site unsafe requests remain denied.

- [ ] **Step 7: Commit Task 7**

```bash
git add app/admin/actions.ts 'app/admin/(dashboard)' app/api/admin lib/cms/auth.ts
git commit -m "feat: enforce CMS role capabilities"
```

---

### Task 8: Run Full Verification, Publish The PR, Deploy, And Create The Editor

**Files:**
- Modify: `README.md`
- Verify unchanged configuration mappings from Task 2: `.env.example`, `docker-compose.yml`, `backend/cms/src/main/resources/application.yml`
- No production content or image records are changed by code deployment.

**Interfaces:**
- Consumes: all previous tasks and the approved deployment design.
- Produces: reviewed main-branch code, a PostgreSQL backup, healthy production containers, migrated owner login, and the live 30-day editor account.

- [ ] **Step 1: Document the operational account model**

Update the README CMS Operations section with the email-plus-password login, required `CMS_OWNER_EMAIL`, fixed `OWNER`/`EDITOR` roles, editor no-delete boundary, 30-day expiration, and owner user-management URL. State that legacy shared-password authentication is retained only for one-release rollback compatibility and is not used by the new login page.

- [ ] **Step 2: Commit the operational documentation**

```bash
git add README.md
git commit -m "docs: describe CMS account operations"
```

- [ ] **Step 3: Re-run the complete Spring suite on the final tree**

```bash
cd backend/cms
mvn test
cd ../..
```

Expected: all Spring tests pass on the complete implementation.

- [ ] **Step 4: Run every Node test**

```bash
rg --files -0 -g '*.test.mjs' -g '!.next/**' -g '!.worktrees/**' | xargs -0 node --test
```

Expected: zero failing Node tests, including both real Next role-session integrations.

- [ ] **Step 5: Run static and production checks**

```bash
npx tsc --noEmit
npm run lint
npm run build
git diff --check origin/main...HEAD
git status --short
```

Expected: type check, lint, and production build exit zero; the worktree contains only intentional committed changes.

- [ ] **Step 6: Validate Flyway on clean and legacy databases**

Start a disposable Compose project with explicit non-production ports and credentials, then inspect the migrated table without printing hashes:

```bash
CMS_TEST_PROJECT=daeho-admin-users-test
POSTGRES_PASSWORD=local-test-password CMS_BACKEND_API_KEY=local-test-admin-key CMS_OWNER_EMAIL=daehovriano@gmail.com CMS_ADMIN_PASSWORD='Local-Owner-Passw0rd!' HTTP_PORT=18080 HTTPS_PORT=18443 docker compose -p "$CMS_TEST_PROJECT" up -d --build postgres cms-api next nginx
docker compose -p "$CMS_TEST_PROJECT" exec -T postgres psql -U daeho -d daeho_cms -c "SELECT email, role, status, expires_at, must_change_password, session_version FROM cms_admin_users ORDER BY email;"
curl --fail --silent --show-error -H 'x-admin-api-key: local-test-admin-key' http://127.0.0.1:18080/api/admin/export | node -e "let body=''; process.stdin.on('data', chunk => body += chunk); process.stdin.on('end', () => { const snapshot = JSON.parse(body); if ('cms_admin_users' in snapshot) process.exit(1); });"
docker compose -p "$CMS_TEST_PROJECT" ps
docker compose -p "$CMS_TEST_PROJECT" down -v
```

Expected: `V9` is applied, the owner exists with no expiration, no hash is printed, CMS export excludes `cms_admin_users`, and all services become healthy.

Then validate the legacy-hash copy path with a second disposable project and a deterministic hash for `Legacy-Owner-Passw0rd!`:

```bash
CMS_LEGACY_PROJECT=daeho-admin-users-legacy-test
POSTGRES_PASSWORD=local-test-password docker compose -p "$CMS_LEGACY_PROJECT" up -d postgres
docker compose -p "$CMS_LEGACY_PROJECT" exec -T postgres psql -U daeho -d daeho_cms -c 'CREATE TABLE IF NOT EXISTS cms_admin_settings (setting_key text PRIMARY KEY, setting_value text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()); INSERT INTO cms_admin_settings (setting_key, setting_value) VALUES ($$admin_password_hash$$, $$pbkdf2_sha256$310000$AAECAwQFBgcICQoLDA0ODw$OB3XCcCWn-Hnj3f4Y5wxss3_vyD037KwwQjbUTp7eX0$$) ON CONFLICT (setting_key) DO UPDATE SET setting_value = excluded.setting_value;'
POSTGRES_PASSWORD=local-test-password CMS_OWNER_EMAIL=daehovriano@gmail.com CMS_ADMIN_PASSWORD='Different-Bootstrap-Passw0rd!' docker compose -p "$CMS_LEGACY_PROJECT" up -d --build cms-api
docker compose -p "$CMS_LEGACY_PROJECT" exec -T postgres psql -U daeho -d daeho_cms -c 'SELECT email, role, password_hash = $$pbkdf2_sha256$310000$AAECAwQFBgcICQoLDA0ODw$OB3XCcCWn-Hnj3f4Y5wxss3_vyD037KwwQjbUTp7eX0$$ AS copied_legacy_hash FROM cms_admin_users;'
docker compose -p "$CMS_LEGACY_PROJECT" down -v
```

Expected: the row reports `copied_legacy_hash = true`; no password hash value is selected or printed.

- [ ] **Step 7: Review, push, and create the pull request**

```bash
git log --oneline origin/main..HEAD
git diff --stat origin/main...HEAD
git push -u origin codex/cms-multi-user-roles
gh pr create --base main --head codex/cms-multi-user-roles --title "Add CMS multi-user roles" --body-file docs/superpowers/specs/2026-08-10-cms-multi-user-roles-design.md
```

Review the PR diff, CI results, permission matrix, and absence of plaintext credentials. Merge only after all required checks are green.

- [ ] **Step 8: Record and back up the production state**

Use read-only checks first:

```bash
ssh -i /Users/tingyouzhao/.ssh/LightsailDefaultKey-ap-northeast-2.pem -o BatchMode=yes ubuntu@15.164.62.44 'cd /home/ubuntu/daeho-site && git status --short --branch && git rev-parse HEAD && sudo docker compose -p daeho-prod ps'
```

Stop if the production checkout has unrelated modifications. Otherwise create and verify a compressed dump at an explicit path:

```bash
ssh -i /Users/tingyouzhao/.ssh/LightsailDefaultKey-ap-northeast-2.pem -o BatchMode=yes ubuntu@15.164.62.44 'cd /home/ubuntu/daeho-site && sudo docker compose -p daeho-prod exec -T postgres sh -lc '\''pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"'\'' | gzip > /home/ubuntu/daeho-pre-admin-users-20260810.sql.gz && gzip -t /home/ubuntu/daeho-pre-admin-users-20260810.sql.gz && test -s /home/ubuntu/daeho-pre-admin-users-20260810.sql.gz'
```

Expected: production is clean, current commit and container state are recorded, and the backup exists and passes gzip integrity.

- [ ] **Step 9: Set owner configuration and deploy the merged commit**

After confirming `.env` does not already contain another owner email, add or mechanically replace the exact value `CMS_OWNER_EMAIL=daehovriano@gmail.com`. Do not print the rest of `.env`.

Then deploy without discarding server changes:

```bash
ssh -i /Users/tingyouzhao/.ssh/LightsailDefaultKey-ap-northeast-2.pem -o BatchMode=yes ubuntu@15.164.62.44 'cd /home/ubuntu/daeho-site && git fetch origin main && git checkout main && git pull --ff-only origin main && sudo docker compose -p daeho-prod up -d --build cms-api next && sudo docker compose -p daeho-prod ps'
```

Expected: `cms-api` applies `V9`, both rebuilt containers stay running, and Nginx continues routing the site.

- [ ] **Step 10: Verify the migrated owner without exposing its hash**

Query only non-secret fields:

```sql
SELECT email, role, status, expires_at, must_change_password, session_version
FROM cms_admin_users
ORDER BY email;
```

Expected owner row:

```text
daehovriano@gmail.com | OWNER | active | null | false | 1
```

Open `/admin/login`, sign in with `daehovriano@gmail.com` and the user's known current password, and verify owner navigation plus `/admin/users`. If the user does not enter the known password during this deployment session, record owner-row/bootstrap verification as complete and explicitly leave interactive owner-login verification pending rather than claiming it passed.

- [ ] **Step 11: Create the live editor and capture the one-time password**

Use the owner-only `/admin/users` form when owner login is available. Otherwise invoke the same internal Spring endpoint from the `next` container using its existing service key and the live owner identity; do not query or print the service key. Generate the temporary password inside the one-off Node process, POST it over the Docker network, and print only the returned non-secret identity plus the temporary password once.

Verify the returned fields:

```text
email = localoca.master@gmail.com
role = EDITOR
status = active
mustChangePassword = true
expiresAt = creation time plus exactly 30 days
```

Do not change the temporary password during verification. Call the internal login endpoint once with the temporary password and confirm it returns `mustChangePassword=true`; then leave the credential unchanged for the contractor.

- [ ] **Step 12: Verify production authorization and public-site health**

With the editor session, confirm allowed content pages load and representative restricted URLs return `403` or the localized forbidden state:

```text
Allowed: /admin/pages, /admin/news, /admin/collections, /admin/media, /admin/popup, /admin/footer, /admin/account
Denied: /admin/inquiries, /admin/notifications, /admin/analytics, /admin/export, /admin/users
```

Confirm delete controls are absent for news, collections, and media. Confirm `https://daeho.works/ko`, `/en`, `/ko/news`, and `/ko/mastery/creations` return successful responses and continue displaying CMS/S3 content.

- [ ] **Step 13: Record the release and hand off credentials**

Record:

- merged PR URL;
- merged and deployed commit hash;
- backup path and integrity result;
- owner migration status;
- editor creation time and exact expiration;
- production permission checks performed;
- container health;
- the temporary password exactly once in the private user response.

Do not put the temporary password in Git, PR text, source files, logs, documentation, or a public Korean message. Tell the user to send it separately to the contractor and to disable or extend the account through `/admin/users` when the 30-day period ends.
