# Embedded Anonymous Web Live Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the public Telegram deep link with a no-login, in-page text chat whose conversations are routed through one Telegram Forum Topic per website inquiry.

**Architecture:** The browser sends form submissions and text messages over HTTPS and receives team replies over Server-Sent Events with polling fallback. Spring CMS authenticates a 30-day anonymous HttpOnly cookie, stores conversations/messages in PostgreSQL, and bridges mapped Telegram Topics; Next.js renders the fixed-label launcher and embedded chat panel. The existing Telegram Bot remains the internal team transport, while legacy direct-Bot sessions remain readable and closable.

**Tech Stack:** Java 17, Spring Boot 4.1, Spring MVC/SseEmitter, JdbcTemplate, PostgreSQL 17/Flyway, Telegram Bot API, Next.js 16.2, React 19.2, TypeScript 5.9, Framer Motion 12.40, Nginx 1.27, Docker Compose, Node test runner, JUnit 5/Mockito.

**Spec:** `docs/superpowers/specs/2026-09-01-embedded-web-live-chat-design.md`

## Global Constraints

- Customers never need a Telegram account, a DAEHO account, or a third-party chat service.
- Keep the existing configured `@Daeho_Service_bot` as the internal routing Bot; never expose its token or username in public API payloads.
- Text only: no image, file, voice, video, SMS, email, push notification, Redis, Vercel, or new paid service.
- Anonymous access uses an unpredictable 256-bit token in a `Secure`, `HttpOnly`, `SameSite=Lax` cookie; PostgreSQL stores only an HMAC hash.
- Anonymous history expires 30 days after the last customer message, team reply, or close event; page reads and SSE heartbeats do not extend expiry.
- One non-closed conversation per visitor and Bot configuration generation; after close, the next start creates a new inquiry and Topic.
- Same-cookie owner history exposes delivered visitor, team, and system messages for 30 days. Initial inquiry content is the first visitor bubble and follow-ups render on the right; names and contact details never render as bubbles. SSE delivery and unread/read cursors remain team/system-only, and CMS/public configuration never exposes visitor bodies.
- Telegram normal text replies go to the customer; `/note ...` stays internal; `/close` and `/close@Daeho_Service_bot` close the conversation and Topic.
- The launcher is a fixed circle plus a persistent `실시간 상담 / 로그인 없이 바로 문의` label; hover never changes width.
- Desktop opens from the bottom-right in 440ms with content fading after 120ms; mobile opens as a full or near-full bottom sheet; reduced-motion users receive a short fade only.
- All database/external delivery steps are idempotent and recoverable. Delivery-uncertain failures must never automatically create duplicate Topics.
- Preserve existing CMS fields and public inquiry interfaces. Additive migrations must remain compatible with V18 Telegram live-chat data.
- Production remains AWS Docker Compose with Nginx; no Vercel deployment.

---

## File Structure

### Backend files to create

- `backend/cms/src/main/resources/db/migration/V19__embedded_web_live_chat.sql` — additive web visitor, conversation, message, and rate-limit schema.
- `backend/cms/src/main/resources/db/migration/V20__customer_message_history.sql` — adds one idempotent initial visitor row per conversation, backfills existing website conversations, and enforces one initial row with a partial unique index.
- `backend/cms/src/main/java/com/daeho/cms/config/WebLiveChatProperties.java` — session secret, cookie, expiry, limits, allowed origins.
- `backend/cms/src/main/java/com/daeho/cms/security/WebLiveChatTokenCodec.java` — random token issuance and HMAC hashing.
- `backend/cms/src/main/java/com/daeho/cms/service/WebLiveChatInputValidator.java` — typed start/message validation and honeypot/minimum-time checks.
- `backend/cms/src/main/java/com/daeho/cms/repository/WebLiveChatRepository.java` — all web visitor/conversation/message/rate-limit persistence.
- `backend/cms/src/main/java/com/daeho/cms/service/WebLiveChatEventBroker.java` — in-process SseEmitter registration, replay, and publish-after-commit support.
- `backend/cms/src/main/java/com/daeho/cms/service/WebLiveChatService.java` — visitor session, start, message, read, close, recovery, and expiry orchestration.
- `backend/cms/src/main/java/com/daeho/cms/service/WebLiveChatTelegramBridge.java` — mapped Topic replies, `/note`, `/close`, native Topic close, and deduplication.
- `backend/cms/src/main/java/com/daeho/cms/controller/WebLiveChatController.java` — public cookie, HTTP, SSE, and polling contract.
- `backend/cms/src/main/java/com/daeho/cms/service/WebLiveChatCleanupWorker.java` — scheduled 30-day expiry close.
- Matching JUnit tests under `backend/cms/src/test/java/com/daeho/cms/...`.

### Frontend files to create

- `components/site/web-live-chat-core.mjs` and `.d.mts` — pure reducer, validation, visibility, and polling decisions.
- `components/site/web-live-chat-api.ts` — typed same-origin HTTP/EventSource client.
- `components/site/web-live-chat-widget.tsx` — launcher, form, message history, composer, unread state, reconnect, and accessibility.
- `components/site/web-live-chat-core.test.mjs` and `components/site/web-live-chat-widget.test.mjs` — reducer and source-contract tests.

### Existing files to modify

- `database/cms-schema.sql` (canonical SQLite shape mirrors V20), `flyway-migration-history.test.mjs`, `backend/cms/src/main/java/com/daeho/cms/CmsApplication.java`.
- `backend/cms/src/main/java/com/daeho/cms/repository/CmsRepository.java`, `InquiryWorkflowService.java` and their tests.
- `TelegramLiveChatService.java`, `TelegramLiveChatCredentialService.java`, `AdminTelegramLiveChatController.java` and tests.
- `backend/cms/src/main/resources/application.yml`, `docker-compose.yml`, `.env.example`, `docker/nginx/default.conf`, `docker/nginx/https.conf`, `nginx-live-chat-routes.test.mjs`.
- `components/site/site-floating-actions.tsx`, `app/[locale]/(site)/layout.tsx`, `app/globals.css`, `messages/ko.json`, `messages/en.json`.
- `lib/cms/repositories.ts`, `app/admin/_components/telegram-live-chat-editor.tsx`, `app/admin/(dashboard)/live-chat/page.tsx`, `lib/admin-i18n.ts`.

### Public launcher files to remove after replacement

- `components/site/telegram-live-chat-button.tsx`
- `components/site/telegram-live-chat-button-core.mjs`
- `components/site/telegram-live-chat-button-core.d.mts`
- `components/site/telegram-live-chat-button-core.test.mjs`
- `components/site/telegram-live-chat-button.test.mjs`

---

### Task 1: Add the V19 web-chat schema and web inquiry source

**Files:**
- Create: `backend/cms/src/main/resources/db/migration/V19__embedded_web_live_chat.sql`
- Create: `web-live-chat-schema.test.mjs`
- Modify: `database/cms-schema.sql`
- Modify: `flyway-migration-history.test.mjs`
- Modify: `backend/cms/src/main/java/com/daeho/cms/repository/CmsRepository.java`
- Modify: `backend/cms/src/main/java/com/daeho/cms/service/InquiryWorkflowService.java`
- Modify: `backend/cms/src/test/java/com/daeho/cms/service/InquiryWorkflowServiceTest.java`

**Interfaces:**
- Produces: PostgreSQL tables `cms_web_live_chat_visitors`, `cms_web_live_chat_conversations`, `cms_web_live_chat_messages`, `cms_web_live_chat_rate_limits`.
- Produces: `InquiryWorkflowService.createWebLiveChat(Map<String,Object>, Map<String,String>)` returning the existing inquiry map.
- Produces: inquiry source `web_live_chat` and inquiry type `web_live_chat`.

- [ ] **Step 1: Write failing schema-contract tests**

```js
test('V19 defines isolated anonymous visitors, conversations, messages, and rate limits', () => {
  assert.match(v19, /CREATE TABLE IF NOT EXISTS cms_web_live_chat_visitors/);
  assert.match(v19, /token_hash text NOT NULL UNIQUE/);
  assert.match(v19, /CREATE TABLE IF NOT EXISTS cms_web_live_chat_conversations/);
  assert.match(v19, /CREATE UNIQUE INDEX IF NOT EXISTS uq_cms_web_live_chat_open_conversation/);
  assert.match(v19, /CREATE TABLE IF NOT EXISTS cms_web_live_chat_messages/);
  assert.match(v19, /client_message_key text/);
  assert.match(v19, /CREATE TABLE IF NOT EXISTS cms_web_live_chat_rate_limits/);
  assert.match(v19, /'web_live_chat'/);
});
```

- [ ] **Step 2: Run the schema tests and verify the expected failure**

Run: `node --test web-live-chat-schema.test.mjs flyway-migration-history.test.mjs`  
Expected: FAIL because V19 and its required table names do not exist.

- [ ] **Step 3: Implement the additive V19 migration**

Use these exact state and direction constraints:

```sql
ALTER TABLE cms_inquiries DROP CONSTRAINT IF EXISTS cms_inquiries_source_check;
ALTER TABLE cms_inquiries ADD CONSTRAINT cms_inquiries_source_check
  CHECK (source IN ('contact', 'golf', 'telegram', 'web_live_chat'));

CREATE TABLE cms_web_live_chat_visitors (
  id text PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cms_web_live_chat_conversations (
  id text PRIMARY KEY,
  visitor_id text NOT NULL REFERENCES cms_web_live_chat_visitors(id),
  configuration_generation bigint NOT NULL,
  target_chat_id text NOT NULL,
  inquiry_id text REFERENCES cms_inquiries(id) ON DELETE SET NULL,
  locale text NOT NULL CHECK (locale IN ('ko', 'en')),
  state text NOT NULL CHECK (state IN ('opening', 'active', 'needs_attention', 'closed')),
  customer_name text NOT NULL,
  customer_contact text NOT NULL,
  inquiry_content text NOT NULL,
  consent_version text NOT NULL,
  consented_at timestamptz NOT NULL,
  attention_code text NOT NULL DEFAULT '',
  pending_action text NOT NULL DEFAULT ''
    CHECK (pending_action IN ('', 'topic_creation', 'registration_delivery', 'visitor_delivery', 'topic_close')),
  pending_message_id bigint,
  pending_client_message_key text NOT NULL DEFAULT '',
  topic_thread_id bigint,
  topic_root_message_id bigint,
  last_read_team_message_id bigint,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE UNIQUE INDEX uq_cms_web_live_chat_open_conversation
  ON cms_web_live_chat_conversations(visitor_id, configuration_generation)
  WHERE state <> 'closed';

CREATE TABLE cms_web_live_chat_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES cms_web_live_chat_conversations(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('visitor', 'team', 'system')),
  body text NOT NULL,
  delivery_state text NOT NULL CHECK (delivery_state IN ('pending', 'delivered', 'needs_attention')),
  client_message_key text,
  telegram_message_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  UNIQUE (conversation_id, client_message_key),
  UNIQUE (conversation_id, telegram_message_id)
);

CREATE TABLE cms_web_live_chat_rate_limits (
  key_hash text NOT NULL,
  action text NOT NULL,
  window_started_at timestamptz NOT NULL,
  request_count integer NOT NULL CHECK (request_count > 0),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (key_hash, action)
);

CREATE INDEX idx_cms_web_live_chat_visitors_expires
  ON cms_web_live_chat_visitors(expires_at);
CREATE UNIQUE INDEX uq_cms_web_live_chat_topic
  ON cms_web_live_chat_conversations(configuration_generation, target_chat_id, topic_thread_id)
  WHERE topic_thread_id IS NOT NULL;
CREATE INDEX idx_cms_web_live_chat_messages_replay
  ON cms_web_live_chat_messages(conversation_id, id);
CREATE INDEX idx_cms_web_live_chat_rate_limits_expires
  ON cms_web_live_chat_rate_limits(expires_at);
```

Mirror this schema and all four indexes exactly in `database/cms-schema.sql`.

- [ ] **Step 4: Add the web inquiry workflow method and test**

```java
@Transactional
public Map<String, Object> createWebLiveChat(
    Map<String, Object> payload,
    Map<String, String> requestMeta
) {
  return inquiries.createWebLiveChatInquiry(payload, requestMeta);
}
```

The repository method must store `source=web_live_chat`, `inquiryType=web_live_chat`, `pagePath=/live-chat`, and only the conversation ID in `configuration`; do not store the anonymous cookie, token hash, Telegram IDs, or raw IP.

- [ ] **Step 5: Run focused tests**

Run: `node --test web-live-chat-schema.test.mjs flyway-migration-history.test.mjs`  
Run: `cd backend/cms && ./mvnw -q -Dtest=InquiryWorkflowServiceTest test`  
Expected: PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add backend/cms/src/main/resources/db/migration/V19__embedded_web_live_chat.sql \
  database/cms-schema.sql web-live-chat-schema.test.mjs flyway-migration-history.test.mjs \
  backend/cms/src/main/java/com/daeho/cms/repository/CmsRepository.java \
  backend/cms/src/main/java/com/daeho/cms/service/InquiryWorkflowService.java \
  backend/cms/src/test/java/com/daeho/cms/service/InquiryWorkflowServiceTest.java
git commit -m "feat: add embedded live chat persistence"
```

### Task 2: Implement anonymous token, origin, and input security primitives

**Files:**
- Create: `backend/cms/src/main/java/com/daeho/cms/config/WebLiveChatProperties.java`
- Create: `backend/cms/src/main/java/com/daeho/cms/security/WebLiveChatTokenCodec.java`
- Create: `backend/cms/src/main/java/com/daeho/cms/service/WebLiveChatInputValidator.java`
- Create: `backend/cms/src/test/java/com/daeho/cms/security/WebLiveChatTokenCodecTest.java`
- Create: `backend/cms/src/test/java/com/daeho/cms/service/WebLiveChatInputValidatorTest.java`
- Modify: `backend/cms/src/main/java/com/daeho/cms/CmsApplication.java`
- Modify: `backend/cms/src/main/resources/application.yml`

**Interfaces:**
- Produces: `WebLiveChatTokenCodec.IssuedToken(String raw, String hash)`.
- Produces: `IssuedToken issue()`, `String hash(String raw)`, `String ipHash(String normalizedIp)`.
- Produces: `WebLiveChatInputValidator.StartInput` and `MessageInput` records.
- Produces: `validateStart(Map<String,Object>, Duration formAge)` and `validateMessage(Map<String,Object>)` throwing `ValidationFailedException` with stable field paths.

- [ ] **Step 1: Write token-codec tests**

```java
@Test
void issuesUnpredictableTokensAndStoresOnlyStableHmacHashes() {
  var codec = new WebLiveChatTokenCodec(properties("test-session-secret-with-32-bytes-minimum"));
  var first = codec.issue();
  var second = codec.issue();
  assertNotEquals(first.raw(), second.raw());
  assertEquals(first.hash(), codec.hash(first.raw()));
  assertFalse(first.hash().contains(first.raw()));
}
```

Also test that startup/constructor rejects a production secret shorter than 32 characters and that `ipHash` never contains the source IP.

- [ ] **Step 2: Write validation tests**

```java
@Test
void rejectsBotsAndOverlongOrPrematureSubmissions() {
  var result = validator.validateStart(Map.of(
      "locale", "ko", "name", "홍길동", "contact", "01012345678",
      "content", "반지 제작 상담", "consent", true,
      "consentVersion", "2026-09-01", "companyWebsite", "spam.example"
  ), Duration.ofMillis(200));
  assertEquals(List.of("companyWebsite", "formStartedAt"), issuePaths(result));
}
```

Exact limits: name 2–80 characters, contact 5–120, initial content 2–2000, follow-up message 1–2000, client key 20–100, locale only `ko|en`, consent must be true, hidden `companyWebsite` must be blank, form age at least 1200ms and at most 24 hours.

Use these record signatures so controller and service tasks share one contract:

```java
public record StartInput(
    String locale, String name, String contact, String content,
    String consentVersion, String clientMessageKey
) {}

public record MessageInput(String body, String clientMessageKey) {}
```

- [ ] **Step 3: Run focused tests and verify failure**

Run: `cd backend/cms && ./mvnw -q -Dtest=WebLiveChatTokenCodecTest,WebLiveChatInputValidatorTest test`  
Expected: FAIL because the new classes do not exist.

- [ ] **Step 4: Implement the security primitives**

```java
public record WebLiveChatProperties(
    String sessionSecret,
    String cookieName,
    int historyDays,
    String allowedOrigins
) {
  public Set<String> normalizedOrigins() {
    return Arrays.stream(allowedOrigins.split(","))
        .map(String::trim)
        .filter(value -> !value.isBlank())
        .map(value -> URI.create(value).normalize())
        .peek(uri -> {
          if (!Set.of("http", "https").contains(uri.getScheme()) || uri.getHost() == null) {
            throw new IllegalArgumentException("CMS_LIVE_CHAT_ALLOWED_ORIGINS contains an invalid origin.");
          }
        })
        .map(uri -> uri.getScheme() + "://" + uri.getAuthority())
        .collect(Collectors.toUnmodifiableSet());
  }
}
```

Use `SecureRandom`, 32 random bytes, Base64 URL encoding without padding, and `HmacSHA256` with `MessageDigest.isEqual` for any comparison. Do not log raw inputs or token values.

- [ ] **Step 5: Register configuration**

Add `WebLiveChatProperties.class` to `@EnableConfigurationProperties` and these defaults to `application.yml`:

```yaml
  web-live-chat:
    session-secret: ${CMS_LIVE_CHAT_SESSION_SECRET:}
    cookie-name: daeho_live_chat
    history-days: 30
    allowed-origins: ${CMS_LIVE_CHAT_ALLOWED_ORIGINS:https://daeho.works}
```

- [ ] **Step 6: Run focused tests and commit**

Run: `cd backend/cms && ./mvnw -q -Dtest=WebLiveChatTokenCodecTest,WebLiveChatInputValidatorTest test`  
Expected: PASS.

```bash
git add backend/cms/src/main/java/com/daeho/cms/config/WebLiveChatProperties.java \
  backend/cms/src/main/java/com/daeho/cms/security/WebLiveChatTokenCodec.java \
  backend/cms/src/main/java/com/daeho/cms/service/WebLiveChatInputValidator.java \
  backend/cms/src/test/java/com/daeho/cms/security/WebLiveChatTokenCodecTest.java \
  backend/cms/src/test/java/com/daeho/cms/service/WebLiveChatInputValidatorTest.java \
  backend/cms/src/main/java/com/daeho/cms/CmsApplication.java \
  backend/cms/src/main/resources/application.yml
git commit -m "feat: secure anonymous live chat identity"
```

### Task 3: Build the web-chat repository and concurrency contracts

**Files:**
- Create: `backend/cms/src/main/java/com/daeho/cms/repository/WebLiveChatRepository.java`
- Create: `backend/cms/src/test/java/com/daeho/cms/repository/WebLiveChatRepositoryTest.java`

**Interfaces:**
- Produces records: `Visitor`, `Conversation`, `Message`, `SessionView`.
- Produces visitor methods: `createVisitor`, `visitorByTokenHash`, `touchVisitor`, `expireVisitor`.
- Produces conversation methods: `currentConversation`, `conversationForVisitor`, `conversationForTopic`, `claimOpen`, `attachInquiry`, `reserveTopicCreation`, `recordTopic`, `activate`, `close`, `expireStale`.
- Produces message methods: `storeInitialVisitorMessage`, `claimVisitorMessage`, `markVisitorDelivered`, `recordTeamMessage`, `ownerMessagesAfter`, `visibleMessagesAfter`, `markRead`, `unreadCount`.
- Produces guard method: `boolean consumeRateBucket(String keyHash, String action, int limit, Duration window)`.

- [ ] **Step 1: Write repository mapping and concurrency tests**

```java
@Test
void claimOpenUsesThePartialUniqueConstraintToReuseAnActiveConversation() {
  when(jdbc.query(anyString(), any(RowMapper.class), eq("visitor-1"), eq(3L)))
      .thenReturn(List.of(activeConversation()));
  assertEquals("conversation-1", repository.currentConversation("visitor-1", 3L).id());
}

@Test
void streamHistoryFiltersOutVisitorMessagesInSql() {
  repository.visibleMessagesAfter("conversation-1", 40L, 100);
  verify(jdbc).query(argThat(sql -> sql.contains("direction IN ('team', 'system')")),
      any(RowMapper.class), eq("conversation-1"), eq(40L), eq(100));
}
```

Cover Topic lookup by `(configuration_generation,target_chat_id,topic_thread_id)`, idempotent `client_message_key`, idempotent `telegram_message_id`, stale rate-bucket replacement, and compare-and-set delivery state transitions.

- [ ] **Step 2: Run tests and verify failure**

Run: `cd backend/cms && ./mvnw -q -Dtest=WebLiveChatRepositoryTest test`  
Expected: FAIL because the repository does not exist.

- [ ] **Step 3: Implement focused repository methods**

Keep SQL close to the method that owns each transition. Use `INSERT ... ON CONFLICT ... DO NOTHING`, partial unique constraints, and `UPDATE ... WHERE state/pending_action = expected` rather than read-then-write checks.

```java
public record Message(
    long id, String conversationId, String direction, String body,
    String deliveryState, String clientMessageKey, long telegramMessageId,
    Instant createdAt
) {}
```

`ownerMessagesAfter` returns delivered `visitor`, `team`, and `system` rows only after visitor-cookie ownership has selected the conversation. `visibleMessagesAfter` is the SSE replay projection and must never select `visitor`. `recentConversations` for CMS may select counts but must not return token hashes or visitor message bodies.

- [ ] **Step 4: Run repository tests**

Run: `cd backend/cms && ./mvnw -q -Dtest=WebLiveChatRepositoryTest test`  
Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add backend/cms/src/main/java/com/daeho/cms/repository/WebLiveChatRepository.java \
  backend/cms/src/test/java/com/daeho/cms/repository/WebLiveChatRepositoryTest.java
git commit -m "feat: add web live chat repository"
```

### Task 4: Implement conversation creation and visitor-to-team delivery

**Files:**
- Create: `backend/cms/src/main/java/com/daeho/cms/service/WebLiveChatService.java`
- Create: `backend/cms/src/test/java/com/daeho/cms/service/WebLiveChatServiceTest.java`

**Interfaces:**
- Consumes: Task 1 `createWebLiveChat`, Task 2 validation/token primitives, Task 3 repository transitions, existing `TelegramLiveChatCredentialService.Credentials` and `TelegramLiveChatGateway`.
- Produces: `SessionView session(WebLiveChatRepository.Visitor)`, `Conversation start(WebLiveChatRepository.Visitor, StartInput, Map<String,String>)`, `SendResult send(WebLiveChatRepository.Visitor, MessageInput)`, `List<Message> messages(WebLiveChatRepository.Visitor,long)`, `Conversation markRead(WebLiveChatRepository.Visitor,long)`, `Conversation closeFromCms(String)`.
- Consumes the existing `TelegramLiveChatGateway.sendMessage(String token, String chatId, String threadId, String body, Map<String,Object> keyboard, String parseMode)`; no new media API.

Define the service result explicitly:

```java
public record SendResult(long messageId, String status) {}
```

- [ ] **Step 1: Write failing creation/idempotency tests**

```java
@Test
void startCreatesOneInquiryOneTopicAndOneRegistrationCard() {
  when(repository.currentConversation("visitor-1", 3L)).thenReturn(null);
  when(repository.claimOpen(any())).thenReturn(opening());
  when(inquiries.createWebLiveChat(anyMap(), anyMap())).thenReturn(Map.of("id", "inquiry-1"));
  when(gateway.createForumTopic("token", "-1003425727647", "문의 · 홍길동"))
      .thenReturn(701L);
  when(gateway.sendMessage(eq("token"), eq("-1003425727647"), eq("701"),
      contains("🔔 새 실시간 상담"), eq(Map.of()), isNull())).thenReturn(702L);

  var result = service.start(visitor(), validStart(), requestMeta());

  assertEquals("active", result.state());
  verify(inquiries, times(1)).createWebLiveChat(anyMap(), anyMap());
  verify(gateway, times(1)).createForumTopic(anyString(), anyString(), anyString());
}
```

Add tests proving: active start reuses the current conversation; closed start creates a new ID/Topic; Topic timeout marks `topic_creation_uncertain`; retry does not auto-create a second Topic; initial card contains only title/name/contact/content.

- [ ] **Step 2: Write failing visitor-message tests**

```java
@Test
void followUpIsStoredOnceAndDeliveredWithTheCustomerPrefix() {
  when(repository.claimVisitorMessage("conversation-1", "client-key-0000000001", "추가 문의"))
      .thenReturn(pendingVisitorMessage());
  when(gateway.sendMessage("token", "-1003425727647", "701",
      "고객 추가 메시지\n\n추가 문의", Map.of(), null)).thenReturn(703L);

  var result = service.send(visitor(), validMessage());

  assertEquals("sent", result.status());
  verify(repository).markVisitorDelivered(41L, 703L);
}
```

Cover duplicate client key returning the existing sent result and a failed send preserving a retryable draft state.

- [ ] **Step 3: Run focused tests and verify failure**

Run: `cd backend/cms && ./mvnw -q -Dtest=WebLiveChatServiceTest test`  
Expected: FAIL because `WebLiveChatService` is absent.

- [ ] **Step 4: Implement the opening state machine**

Use the exact sequence: claim conversation → create/reuse CMS inquiry → reserve Topic creation → create Topic → record Topic → send registration card → activate. Persist a recovery code before each external call and clear it only after the response mapping is recorded.

```java
private String teamHeader(Conversation c) {
  return """
      🔔 새 실시간 상담

      이름: %s
      연락처: %s
      문의 내용:
      %s
      """.formatted(c.customerName(), c.customerContact(), c.inquiryContent()).trim();
}
```

- [ ] **Step 5: Implement visitor follow-up delivery and reads**

Store the visitor body for audit/delivery and owner reload. `messages()` and `SessionView` use `ownerMessagesAfter`; SSE replay alone uses `visibleMessagesAfter`. Insert the initial inquiry as one delivered visitor row keyed by the start idempotency key.

- [ ] **Step 6: Run focused tests and commit**

Run: `cd backend/cms && ./mvnw -q -Dtest=WebLiveChatServiceTest test`  
Expected: PASS.

```bash
git add backend/cms/src/main/java/com/daeho/cms/service/WebLiveChatService.java \
  backend/cms/src/test/java/com/daeho/cms/service/WebLiveChatServiceTest.java
git commit -m "feat: route web inquiries into Telegram topics"
```

### Task 5: Add SSE replay, public cookie endpoints, limits, and expiry cleanup

**Files:**
- Create: `backend/cms/src/main/java/com/daeho/cms/service/WebLiveChatEventBroker.java`
- Create: `backend/cms/src/main/java/com/daeho/cms/controller/WebLiveChatController.java`
- Create: `backend/cms/src/main/java/com/daeho/cms/service/WebLiveChatCleanupWorker.java`
- Create: `backend/cms/src/test/java/com/daeho/cms/service/WebLiveChatEventBrokerTest.java`
- Create: `backend/cms/src/test/java/com/daeho/cms/controller/WebLiveChatControllerTest.java`
- Create: `backend/cms/src/test/java/com/daeho/cms/service/WebLiveChatCleanupWorkerTest.java`

**Interfaces:**
- Consumes: Tasks 2–4.
- Produces endpoints: `GET /api/live-chat/session`, `POST /api/live-chat/conversations`, `POST /api/live-chat/conversations/current/messages`, `GET /api/live-chat/conversations/current/messages`, `GET /api/live-chat/conversations/current/events`, `POST /api/live-chat/conversations/current/read`.
- Produces SSE events: `message`, `state`, `heartbeat`, each with monotonic message/state event IDs.

- [ ] **Step 1: Write failing controller contract tests**

```java
@Test
void sessionIssuesASecureAnonymousCookieWithoutExposingTheTokenInJson() throws Exception {
  mvc.perform(get("/api/live-chat/session").header("Origin", "https://daeho.works"))
      .andExpect(status().isOk())
      .andExpect(header().string("Set-Cookie", allOf(
          containsString("daeho_live_chat="), containsString("HttpOnly"),
          containsString("Secure"), containsString("SameSite=Lax"))))
      .andExpect(jsonPath("$.token").doesNotExist());
}
```

Add tests for foreign Origin rejection, rate-limit `429`, honeypot `422`, active reuse, conversation ownership, same-cookie history containing delivered visitor/team/system rows, second-cookie denial, visitor suppression from SSE, SSE `text/event-stream`, Last-Event-ID replay, and team-only read idempotency.

- [ ] **Step 2: Write failing broker and cleanup tests**

```java
@Test
void replayAndLivePublishMayOverlapWithoutLosingAnEvent() {
  var emitter = broker.open("conversation-1", 40L, List.of(message(41L)));
  broker.publish("conversation-1", message(42L));
  assertEquals(List.of(41L, 42L), recordedEventIds(emitter));
}
```

Cleanup must close conversations whose `last_activity_at < now() - 30 days`, publish a closed state, and call Topic close best-effort without deleting CMS inquiries.

- [ ] **Step 3: Run focused tests and verify failure**

Run: `cd backend/cms && ./mvnw -q -Dtest=WebLiveChatEventBrokerTest,WebLiveChatControllerTest,WebLiveChatCleanupWorkerTest test`  
Expected: FAIL because the controller/broker/worker do not exist.

- [ ] **Step 4: Implement cookie resolution and public endpoints**

Controller rules:

```java
private static final String COOKIE_PATH = "/api/live-chat";
private static final Duration COOKIE_AGE = Duration.ofDays(30);
```

Read `X-Daeho-Client-IP` first, then the first `X-Forwarded-For` address. Immediately hash it; never persist/log the raw value. On every write, consume the Postgres rate bucket before service work. Use limits: 5 starts/hour per IP hash, 3 starts/hour per visitor, 20 messages/minute per visitor, 60 messages/hour per IP hash.

- [ ] **Step 5: Implement SSE and fallback replay**

Use `SseEmitter(70_000L)`, send a heartbeat every 25 seconds, and complete emitters on timeout/error. Register before replaying stored events; duplicate overlap is safe because browser deduplicates by numeric event ID.

- [ ] **Step 6: Implement cleanup worker**

Use a fixed one-hour schedule and a bounded batch of 100 conversations. Reads and heartbeats must not update `last_activity_at`; customer message, team reply, and close do.

- [ ] **Step 7: Run focused tests and commit**

Run: `cd backend/cms && ./mvnw -q -Dtest=WebLiveChatEventBrokerTest,WebLiveChatControllerTest,WebLiveChatCleanupWorkerTest test`  
Expected: PASS.

```bash
git add backend/cms/src/main/java/com/daeho/cms/service/WebLiveChatEventBroker.java \
  backend/cms/src/main/java/com/daeho/cms/controller/WebLiveChatController.java \
  backend/cms/src/main/java/com/daeho/cms/service/WebLiveChatCleanupWorker.java \
  backend/cms/src/test/java/com/daeho/cms/service/WebLiveChatEventBrokerTest.java \
  backend/cms/src/test/java/com/daeho/cms/controller/WebLiveChatControllerTest.java \
  backend/cms/src/test/java/com/daeho/cms/service/WebLiveChatCleanupWorkerTest.java
git commit -m "feat: expose anonymous live chat API"
```

### Task 6: Bridge Telegram team replies, notes, and close events to web conversations

**Files:**
- Create: `backend/cms/src/main/java/com/daeho/cms/service/WebLiveChatTelegramBridge.java`
- Create: `backend/cms/src/test/java/com/daeho/cms/service/WebLiveChatTelegramBridgeTest.java`
- Modify: `backend/cms/src/main/java/com/daeho/cms/service/TelegramLiveChatService.java`
- Modify: `backend/cms/src/test/java/com/daeho/cms/service/TelegramLiveChatServiceTest.java`

**Interfaces:**
- Consumes: Task 3 Topic mapping, Task 5 broker, current Telegram credentials/gateway.
- Produces: `Optional<TelegramLiveChatService.WebhookResult> handleTeamMessage(Map<String,Object>, Credentials)`.
- Produces: `Optional<WebhookResult> handlePrivateMessage(...)` for new private users, returning a website redirect without creating a session.

- [ ] **Step 1: Write failing bridge tests for normal replies and deduplication**

```java
@Test
void normalTopicTextBecomesOneTeamMessageAndOneBrowserEvent() {
  when(repository.conversationForTopic(3L, "-1003425727647", 701L)).thenReturn(active());
  when(repository.recordTeamMessage("conversation-1", 900L, "확인했습니다."))
      .thenReturn(teamMessage(51L));

  var result = bridge.handleTeamMessage(teamUpdate("확인했습니다.", 900L), credentials());

  assertEquals("web_team_reply_recorded", result.orElseThrow().status());
  verify(broker).publish("conversation-1", teamMessage(51L));
}
```

Repeat the same Telegram message ID and assert no second row/event.

- [ ] **Step 2: Write command and native-close tests**

```java
@Test
void noteStaysInTelegramAndNeverCreatesACustomerMessage() {
  var result = bridge.handleTeamMessage(teamUpdate("/note 견적 확인 필요", 901L), credentials());
  assertEquals("web_internal_note_ignored", result.orElseThrow().status());
  verify(repository, never()).recordTeamMessage(anyString(), anyLong(), anyString());
}
```

Test `/close`, `/close@Daeho_Service_bot`, and a message containing `forum_topic_closed`. Each must close once, publish `state=closed`, and never expose command text.

- [ ] **Step 3: Write private-Bot compatibility tests**

New private users receive one localized website link and do not create Telegram sessions. Existing non-closed legacy Telegram sessions retain their existing forwarding behavior so already-open test/legacy conversations can be closed safely.

- [ ] **Step 4: Run tests and verify failure**

Run: `cd backend/cms && ./mvnw -q -Dtest=WebLiveChatTelegramBridgeTest,TelegramLiveChatServiceTest test`  
Expected: FAIL because the bridge does not exist and the router does not call it.

- [ ] **Step 5: Implement the bridge and route web Topics first**

In `TelegramLiveChatService.handleTeamMessage`, call the web bridge after validating target group/Bot sender and before legacy `sessionForThread`. An empty Optional means “not a web Topic”; then execute the unchanged legacy path.

For normal team messages, accept text only. Ignore service messages except `forum_topic_closed`; ignore edits, Bot messages, General, unmapped Topics, and media captions in this first version.

- [ ] **Step 6: Run focused and full live-chat backend tests**

Run: `cd backend/cms && ./mvnw -q -Dtest='*LiveChat*Test' test`  
Expected: PASS.

- [ ] **Step 7: Commit Task 6**

```bash
git add backend/cms/src/main/java/com/daeho/cms/service/WebLiveChatTelegramBridge.java \
  backend/cms/src/test/java/com/daeho/cms/service/WebLiveChatTelegramBridgeTest.java \
  backend/cms/src/main/java/com/daeho/cms/service/TelegramLiveChatService.java \
  backend/cms/src/test/java/com/daeho/cms/service/TelegramLiveChatServiceTest.java
git commit -m "feat: stream Telegram team replies to web chat"
```

### Task 7: Expose production HTTP/SSE routes and runtime secrets

**Files:**
- Modify: `docker/nginx/default.conf`
- Modify: `docker/nginx/https.conf`
- Modify: `docker-compose.yml`
- Modify: `.env.example`
- Modify: `nginx-live-chat-routes.test.mjs`
- Modify: `docker-compose-upload-dir.test.mjs`

**Interfaces:**
- Consumes: Task 5 public endpoint prefix `/api/live-chat/`.
- Produces: Nginx buffered-off SSE route and normal API proxy routes.
- Produces: `CMS_LIVE_CHAT_SESSION_SECRET` and `CMS_LIVE_CHAT_ALLOWED_ORIGINS` in the CMS container only.

- [ ] **Step 1: Extend failing Nginx/runtime tests**

```js
test('production TLS proxies anonymous live chat and disables SSE buffering', () => {
  assert.match(apexTlsServer, /location = \/api\/live-chat\/conversations\/current\/events/);
  assert.match(apexTlsServer, /proxy_buffering off;/);
  assert.match(apexTlsServer, /proxy_read_timeout 75s;/);
  assert.match(apexTlsServer, /location \/api\/live-chat\//);
  assert.match(compose, /CMS_LIVE_CHAT_SESSION_SECRET/);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test nginx-live-chat-routes.test.mjs docker-compose-upload-dir.test.mjs`  
Expected: FAIL because the web routes and secret are absent.

- [ ] **Step 3: Add exact SSE and general API locations to both configs**

```nginx
location = /api/live-chat/conversations/current/events {
  proxy_pass http://cms_api/api/live-chat/conversations/current/events;
  proxy_http_version 1.1;
  proxy_buffering off;
  proxy_cache off;
  proxy_read_timeout 75s;
  proxy_set_header Connection "";
  add_header X-Accel-Buffering no;
}

location /api/live-chat/ {
  client_max_body_size 16k;
  proxy_pass http://cms_api/api/live-chat/;
  proxy_http_version 1.1;
}
```

Repeat the existing trusted proxy headers and use `$scheme` in local HTTP, `https` in the apex TLS server. Do not expose an admin route.

- [ ] **Step 4: Add runtime env wiring**

```yaml
CMS_LIVE_CHAT_SESSION_SECRET: ${CMS_LIVE_CHAT_SESSION_SECRET:-}
CMS_LIVE_CHAT_ALLOWED_ORIGINS: ${CMS_LIVE_CHAT_ALLOWED_ORIGINS:-https://daeho.works}
```

Do not pass the session secret to the Next container or build args.

- [ ] **Step 5: Run tests and commit**

Run: `node --test nginx-live-chat-routes.test.mjs docker-compose-upload-dir.test.mjs`  
Expected: PASS.

```bash
git add docker/nginx/default.conf docker/nginx/https.conf docker-compose.yml \
  .env.example nginx-live-chat-routes.test.mjs docker-compose-upload-dir.test.mjs
git commit -m "feat: proxy embedded live chat events"
```

### Task 8: Implement the browser state machine and same-origin API client

**Files:**
- Create: `components/site/web-live-chat-core.mjs`
- Create: `components/site/web-live-chat-core.d.mts`
- Create: `components/site/web-live-chat-api.ts`
- Create: `components/site/web-live-chat-core.test.mjs`

**Interfaces:**
- Produces: `createWebLiveChatState()`, `reduceWebLiveChatState(state,event)`, the legacy-named `visibleTeamMessages(messages)` owner-history projection (visitor/team/system), `shouldUsePolling(sseFailures)`, `unreadCount(session)`.
- Produces TypeScript API: `getSession`, `startConversation`, `sendVisitorMessage`, `getMessages`, `markRead`, `connectEvents`.
- Produces view states: `closed_launcher`, `registration`, `waiting`, `active`, `closed`, `temporarily_unavailable`.

- [ ] **Step 1: Write reducer/filter/reconnect tests**

```js
test('owner history retains durable visitor bodies', () => {
  assert.deepEqual(visibleTeamMessages([
    {id: 1, direction: 'visitor', body: 'private follow-up'},
    {id: 2, direction: 'team', body: '팀 답변'},
    {id: 3, direction: 'system', body: 'closed'}
  ]).map((item) => item.id), [1, 2, 3]);
});

test('hover never changes launcher width and click opens the panel', () => {
  const hovered = reduceWebLiveChatState(createWebLiveChatState(), {type: 'hover', active: true});
  assert.equal(hovered.panelOpen, false);
  assert.equal(reduceWebLiveChatState(hovered, {type: 'toggle'}).panelOpen, true);
});
```

Test form draft, authoritative sent visitor bubble, `in_progress` draft/key retention, Last-Event-ID dedupe, team-only unread increment, close state, new conversation reset, SSE retry backoff, and fallback after three consecutive failures.

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test components/site/web-live-chat-core.test.mjs`  
Expected: FAIL because the core module does not exist.

- [ ] **Step 3: Implement the pure reducer**

Keep all network and DOM work outside the `.mjs` core. Use monotonically increasing message IDs and ignore any event ID already present.

- [ ] **Step 4: Implement the API client**

```ts
export type WebLiveChatMessage = {
  id: number;
  direction: 'visitor' | 'team' | 'system';
  body: string;
  createdAt: string;
};

export type WebLiveChatEvent =
  | {type: 'message'; id: number; message: WebLiveChatMessage}
  | {type: 'state'; id: number; state: 'waiting' | 'active' | 'closed'}
  | {type: 'heartbeat'; id: number};

export function connectEvents(
  onEvent: (event: WebLiveChatEvent) => void,
  onFailure: () => void
): () => void {
  const source = new EventSource('/api/live-chat/conversations/current/events', {withCredentials: true});
  // parse known event types only; close and return cleanup
}
```

All fetches use `credentials:'same-origin'`, `Content-Type: application/json`, a generated client message key, and bounded response parsing. Do not place identity/contact in URLs or localStorage.

- [ ] **Step 5: Run tests and TypeScript check**

Run: `node --test components/site/web-live-chat-core.test.mjs`  
Run: `npx tsc --noEmit`  
Expected: PASS.

- [ ] **Step 6: Commit Task 8**

```bash
git add components/site/web-live-chat-core.mjs components/site/web-live-chat-core.d.mts \
  components/site/web-live-chat-api.ts components/site/web-live-chat-core.test.mjs
git commit -m "feat: add browser live chat state and client"
```

### Task 9: Replace the Telegram launcher with the accessible embedded chat UI

**Files:**
- Create: `components/site/web-live-chat-widget.tsx`
- Create: `components/site/web-live-chat-widget.test.mjs`
- Modify: `components/site/site-floating-actions.tsx`
- Modify: `app/[locale]/(site)/layout.tsx`
- Modify: `app/globals.css`
- Modify: `messages/ko.json`
- Modify: `messages/en.json`
- Modify: `lib/cms/repositories.ts`
- Delete: `components/site/telegram-live-chat-button.tsx`
- Delete: `components/site/telegram-live-chat-button-core.mjs`
- Delete: `components/site/telegram-live-chat-button-core.d.mts`
- Delete: `components/site/telegram-live-chat-button-core.test.mjs`
- Delete: `components/site/telegram-live-chat-button.test.mjs`

**Interfaces:**
- Consumes: Task 8 API/core and public `{enabled:boolean}` config.
- Produces: `WebLiveChatWidget({locale,copy,enabled})`.
- Produces public copy key `messages.common.webLiveChat`; removes `telegramLiveChat` from the public component path.

- [ ] **Step 1: Write failing source-contract tests**

```js
test('launcher copy is permanently visible and no Telegram brand reaches customers', () => {
  assert.match(source, /copy\.label/);
  assert.match(source, /copy\.noSignIn/);
  assert.doesNotMatch(source, /telegram|paper plane/i);
  assert.doesNotMatch(source, /onPointerEnter.*width/s);
});

test('widget supports focus, escape, reduced motion, and mobile dialog semantics', () => {
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal/);
  assert.match(source, /Escape/);
  assert.match(source, /useReducedMotion/);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test components/site/web-live-chat-widget.test.mjs`  
Expected: FAIL because the widget does not exist.

- [ ] **Step 3: Implement the fixed-label launcher and morph**

Use a Framer Motion `layout` shell anchored bottom-right. The closed launcher always renders the circle and label; hover only changes transform/shadow.

```tsx
<motion.div
  layout
  transition={{layout: {duration: 0.44, ease: [0.16, 1, 0.3, 1]}}}
  whileHover={panelOpen || reduceMotion ? undefined : {y: -2, scale: 1.03}}
>
```

Fade panel content after `0.12s`; close over `0.30s`. Under reduced motion, use opacity only. Mobile uses `fixed inset-x-0 bottom-0 h-[min(100dvh,...)]`; desktop uses the approved right-bottom panel.

- [ ] **Step 4: Implement the four customer states**

- Registration: name/contact/content/consent and invisible honeypot.
- Waiting: accepted status, 30-day explanation, composer enabled.
- Active: same-cookie owner visitor/team/system history, definitive sent receipt, composer, reconnect indicator, compact shrink-to-content visitor bubbles on the right, team bubbles on the left, and centered neutral system events. Participant bubbles use opposing corner cues, a 78% maximum width, and safe long-text wrapping.
- Closed: read-only history and “new consultation” action.

Render visitor bodies only from owner-authenticated server history, right-aligned. Render team bubbles on the left and keep system/state events centered so they cannot be confused with a participant. Both participant bubbles shrink to content, cap at 78%, wrap unbroken text safely, use opposing small-corner cues, and keep compact vertical rhythm. Never create optimistic synthetic message IDs. Keep an ambiguous or in-progress draft and key in the composer; after definitive success refresh authoritative history and show the durable bubble once.

- [ ] **Step 5: Implement unread/reconnect/accessibility behavior**

Open EventSource only for waiting/active conversations. On close/page hide, close it. After three failures, poll every five seconds and return to SSE on the next panel open. Use `BroadcastChannel('daeho-live-chat')` only to sync read/close hints; server ownership remains authoritative.

Move focus into the dialog after expansion, trap focus while open, restore it to the launcher on close, lock mobile background scroll, announce new team messages with a polite live region, and support Escape.

- [ ] **Step 6: Replace copy and public config**

Korean launcher:

```json
{"label":"실시간 상담","noSignIn":"로그인 없이 바로 문의"}
```

English launcher:

```json
{"label":"Live consultation","noSignIn":"No sign-in required"}
```

Rename `getTelegramLiveChatPublicConfig` to `getWebLiveChatPublicConfig`, return only `enabled`, and remove `botUsername` from the public backend view. Keep Bot username in admin-only settings.

- [ ] **Step 7: Run frontend checks**

Run: `node --test components/site/web-live-chat-core.test.mjs components/site/web-live-chat-widget.test.mjs`  
Run: `npm run lint`  
Run: `npx tsc --noEmit`  
Expected: PASS.

- [ ] **Step 8: Commit Task 9**

```bash
git add components/site app/'[locale]'/'(site)'/layout.tsx app/globals.css \
  messages/ko.json messages/en.json lib/cms/repositories.ts
git commit -m "feat: embed anonymous live chat on the website"
```

### Task 10: Extend CMS visibility and recovery for website conversations

**Files:**
- Modify: `backend/cms/src/main/java/com/daeho/cms/controller/AdminTelegramLiveChatController.java`
- Modify: `backend/cms/src/test/java/com/daeho/cms/service/TelegramLiveChatCredentialServiceTest.java`
- Create: `backend/cms/src/test/java/com/daeho/cms/controller/AdminLiveChatControllerTest.java`
- Modify: `lib/cms/repositories.ts`
- Modify: `app/admin/_components/telegram-live-chat-editor.tsx`
- Modify: `app/admin/(dashboard)/live-chat/page.tsx`
- Modify: `lib/admin-i18n.ts`

**Interfaces:**
- Consumes: Task 3 `recentConversations`, Task 4 close/retry operations.
- Produces a common admin session DTO with `source: 'website' | 'telegram_legacy'`.
- Produces admin actions that dispatch close/retry/reset to the correct source without exposing anonymous credentials.

- [ ] **Step 1: Write failing admin contract tests**

```java
@Test
void adminListDistinguishesWebsiteAndLegacySessionsWithoutCredentialHashes() throws Exception {
  mvc.perform(get("/api/admin/live-chat").header("x-admin-api-key", ADMIN_KEY))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.sessions[0].source").value("website"))
      .andExpect(jsonPath("$.sessions[0].tokenHash").doesNotExist());
}
```

Test website close, registration retry, Topic creation reset, and legacy endpoint compatibility.

- [ ] **Step 2: Run backend contract tests and verify failure**

Run: `cd backend/cms && ./mvnw -q -Dtest=AdminLiveChatControllerTest test`  
Expected: FAIL because website conversations are not included.

- [ ] **Step 3: Implement source-aware DTOs and actions**

Return these stable fields to the Next admin UI:

```ts
type LiveChatAdminSession = {
  id: string;
  source: 'website' | 'telegram_legacy';
  state: 'opening' | 'active' | 'needs_attention' | 'closed';
  customerName: string;
  customerContact: string;
  inquiryContent: string;
  topicThreadId: number | null;
  attentionCode: string;
  createdAt: string;
  updatedAt: string;
};
```

Controller resolution must verify the session source server-side rather than trusting a client-supplied source.

- [ ] **Step 4: Update CMS copy and editor**

Clarify that the configured Bot is the internal team routing Bot and customers use the website. Add source badges, website state labels, unread count, and the existing close/recovery buttons. Never render token hashes, cookie data, raw IP hashes, or customer message audit rows.

- [ ] **Step 5: Run backend/frontend checks**

Run: `cd backend/cms && ./mvnw -q -Dtest=AdminLiveChatControllerTest,TelegramLiveChatCredentialServiceTest test`  
Run: `npm run lint && npx tsc --noEmit`  
Expected: PASS.

- [ ] **Step 6: Commit Task 10**

```bash
git add backend/cms/src/main/java/com/daeho/cms/controller/AdminTelegramLiveChatController.java \
  backend/cms/src/test/java/com/daeho/cms/controller/AdminLiveChatControllerTest.java \
  backend/cms/src/test/java/com/daeho/cms/service/TelegramLiveChatCredentialServiceTest.java \
  lib/cms/repositories.ts app/admin/_components/telegram-live-chat-editor.tsx \
  app/admin/'(dashboard)'/live-chat/page.tsx lib/admin-i18n.ts
git commit -m "feat: manage website live chats in CMS"
```

### Task 11: Full verification, production deployment, and real Telegram smoke test

**Files:**
- Modify only if verification reveals a scoped defect.
- Record verification evidence in the final task response; do not commit secrets, SQL dumps, screenshots containing contact details, or generated test credentials.

**Interfaces:**
- Consumes: all earlier tasks.
- Produces: deployed AWS service, migrated V19/V20 database, healthy SSE/Webhook routes, and one cleaned-up end-to-end test conversation.

- [ ] **Step 1: Run all local automated tests**

```bash
node --test
cd backend/cms && ./mvnw -q test
cd ../../ && npm run lint
npx next typegen
npx tsc --noEmit
npm run build
git diff --check
```

Expected: all Node and Maven tests pass, lint/typecheck/build succeed, and no whitespace errors exist.

- [ ] **Step 2: Verify V19 and V20 on a fresh disposable PostgreSQL volume**

```bash
VERIFY_PROJECT=daeho-web-live-chat-verify
POSTGRES_PASSWORD=verify-only-password \
  docker compose -p "$VERIFY_PROJECT" up -d --build postgres cms-api
docker compose -p "$VERIFY_PROJECT" exec -T postgres \
  psql -U daeho -d daeho_cms -Atc \
  "select version || ':' || success from flyway_schema_history where version in ('19','20') order by installed_rank;"
docker compose -p "$VERIFY_PROJECT" down -v
```

Expected: `19:true` and `20:true`; exercise V20's backfill and partial unique constraint against a real disposable PostgreSQL database, then remove only that disposable project and volume.

- [ ] **Step 3: Verify anonymous ownership and SSE locally**

Using one cookie jar, create a conversation and confirm owner history contains the initial visitor body and a follow-up exactly once. Using a second cookie jar, assert the first conversation is inaccessible. Connect SSE with `curl -N`, confirm visitor rows are not published, inject a mapped team message through a test double/local Telegram base URL, and verify one event only. Repeat the same client key and Telegram update ID to prove idempotency, and verify unread/read advancement is team-only.

- [ ] **Step 4: Commit any verification-only fixes, then push**

```bash
git status --short
git push origin HEAD:main
```

Expected: working tree clean and remote `main` contains the verified head.

- [ ] **Step 5: Preflight AWS and create a targeted database backup**

```bash
ssh -i /Users/tingyouzhao/.ssh/LightsailDefaultKey-ap-northeast-2.pem \
  ubuntu@15.164.62.44 \
  "cd /home/ubuntu/daeho-site && test -z \"\$(git status --porcelain)\" && git rev-parse HEAD && sudo docker compose -p daeho-prod ps"
```

Create `/home/ubuntu/backups/daeho-pre-web-live-chat-20260902.sql.gz` using `pg_dump` inside `daeho-prod-postgres-1`; verify gzip integrity and non-zero size before deployment. Before V20, create and validate a distinct `/home/ubuntu/backups/daeho-pre-customer-message-history-20260902.sql.gz` without overwriting the first backup.

- [ ] **Step 6: Install a production session secret without printing it**

On the AWS host, if `CMS_LIVE_CHAT_SESSION_SECRET` is absent, generate 48 random bytes and append it to the production `.env` with owner-only permissions. Never print the generated value. Preserve all existing Telegram/CMS/AWS environment values.

```bash
umask 077
openssl rand -base64 48 | tr -d '\n' > /tmp/daeho-live-chat-secret
```

Add exactly one secret line without placing the secret in the command arguments, then remove only the temporary secret file:

```bash
cd /home/ubuntu/daeho-site
perl -0pi -e '
  BEGIN {
    open my $fh, "<", "/tmp/daeho-live-chat-secret" or die $!;
    local $/;
    $secret = <$fh>;
    close $fh;
  }
  if ($_ !~ /^CMS_LIVE_CHAT_SESSION_SECRET=/m) {
    $_ .= "\nCMS_LIVE_CHAT_SESSION_SECRET=$secret\n";
  }
' .env
shred -u /tmp/daeho-live-chat-secret
awk -F= '$1 == "CMS_LIVE_CHAT_SESSION_SECRET" { found=1; valid=(length($2) >= 64) } END { exit !(found && valid) }' .env
```

- [ ] **Step 7: Deploy application images and recreate Nginx**

```bash
cd /home/ubuntu/daeho-site
git fetch origin main
git merge --ff-only origin/main
sudo docker compose -p daeho-prod build cms-api next
sudo docker compose -p daeho-prod up -d cms-api next
sudo docker compose -p daeho-prod up -d --force-recreate nginx
sudo docker compose -p daeho-prod exec -T nginx nginx -t
```

Recreating Nginx is mandatory because production bind-mounts one config file and a Git checkout may replace its inode; reload alone can retain the old file.

- [ ] **Step 8: Run production health and migration checks**

Verify:

```text
GET https://daeho.works/ko                                      -> 200
GET https://daeho.works/api/cms/live-chat                      -> 200, enabled true, no botUsername
GET https://daeho.works/api/live-chat/session                  -> 200 + Secure HttpOnly cookie
POST https://daeho.works/api/telegram/live-chat/webhook        -> 401 without secret
Flyway V19 and V20                                             -> true
Telegram getWebhookInfo                                        -> correct URL, zero error
```

Check `cms-api`, `next`, and `nginx` logs since deployment for `error|exception|failed|fatal`; expected no new matches.

- [ ] **Step 9: Run one production end-to-end conversation and clean only its test data**

Submit a clearly named `CODEX E2E 2026-09-02` inquiry through the website UI, record the returned conversation/inquiry IDs, and verify exactly one Topic appears. Confirm the same-cookie owner sees the initial inquiry as one right-aligned visitor bubble; send a follow-up, confirm exactly one additional visitor bubble and a definitive sent state, then hard-refresh and confirm both persist without duplication. Post one human team reply in that Topic and verify browser history/SSE receives it while unread remains team-only. Post `/note` and verify it is absent from browser history. Post `/close` and verify web state becomes closed with one durable system event.

After evidence is captured, remove only the recorded E2E inquiry/conversation rows and close/delete only the recorded E2E Topic. Do not use broad text matching, wildcards, or recursive deletion. Report what was removed and that it was test-only.

- [ ] **Step 10: Final browser QA**

Check 1440px, 1024px, 768px, and 375px:

- fixed B-style label is visible without hover;
- no width jump on hover;
- open/close motion matches 440ms/300ms and reduced motion disables morph;
- form, waiting, active, unread, failed-send, reconnect, closed, and new-conversation states render correctly;
- initial and follow-up visitor messages render right-aligned exactly once after a hard refresh for the owning cookie, while a second cookie cannot access the history;
- visitor/team bubbles shrink to content on their respective right/left sides, cap near 78%, safely wrap long text, use opposing corner cues and compact spacing, while system events remain centered;
- mobile locks background scroll and respects safe-area insets;
- focus, Escape, live announcements, and keyboard tab order work.

- [ ] **Step 11: Report deployment evidence**

Return the deployed commit, backup path/size, test totals, V19/V20 status, service health, public endpoint status, Bot webhook status, E2E result, owner-cookie visitor-history evidence, and any intentional limitations. Never include Bot Token, anonymous cookie, session secret, admin key, database password, or raw customer data.

---

## Plan Self-Review Checklist

- Every spec requirement is assigned to Tasks 1–11.
- Anonymous identity, 30-day expiry, no-login UI, text-only scope, owner-only customer bubbles, SSE/polling, `/note`, `/close`, Topic mapping, CMS recovery, animation, accessibility, anti-spam, cost constraints, and AWS deployment all have explicit tests.
- Public DTOs never expose Bot username, Telegram IDs, token hashes, or IP hashes. Visitor message bodies appear only in same-cookie owner history, never CMS lists, public config, or SSE.
- Type names are consistent: `Visitor`, `Conversation`, `Message`, `SessionView`, `StartInput`, `MessageInput`, `WebLiveChatEvent`.
- No task requires a new paid service or infrastructure dependency.
- V19 and V20 are additive and legacy Telegram sessions remain compatible; V20 backfills one initial visitor row per existing website conversation.
