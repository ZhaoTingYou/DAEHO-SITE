# CMS Traffic Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add consent-gated first-party channel analytics to the existing DAEHO CMS, including aggregate traffic reports and anonymous visit details, while keeping GA4 active independently.

**Architecture:** A focused browser tracker creates 30-minute anonymous sessions only after analytics consent and sends sanitized page views through a same-origin Next.js route to Spring Boot. Spring Boot validates and stores sessions/page views in PostgreSQL, exposes authenticated summary and visit-list APIs, and the server-rendered CMS displays date/channel reports without handling Google credentials.

**Tech Stack:** Next.js App Router, React, TypeScript/JavaScript, Spring Boot 4.1, Java 17, PostgreSQL 17, Flyway, JdbcTemplate, Node test runner, JUnit 5/MockMvc, Tailwind CSS, Docker Compose.

## Global Constraints

- Track only after the existing analytics consent state is `granted`.
- Keep the existing GA4 measurement and event flow independent and unchanged.
- A session expires after 30 minutes without a tracked page view.
- Do not store IP addresses, raw User-Agent strings, full referrer URLs, form content, Google client IDs, persistent visitor IDs, or precise location.
- Retain anonymous analytics records for 14 months.
- Do not include analytics tables in CMS content export/import or content-inventory counts.
- Use `Asia/Seoul` when converting administrator date filters into report boundaries.
- Treat a report date range as sessions whose `started_at` falls inside `[from, to + 1 day)`.
- Preserve all unrelated user changes and untracked `output/`, `outputs/`, and `tmp/` directories.

---

## File Structure

### Browser Collection

- Create `lib/internal-analytics-core.mjs`: pure source classification, URL/referrer sanitization, device classification, and 30-minute session-state decisions.
- Create `lib/internal-analytics-core.d.ts`: TypeScript declarations for the pure module.
- Create `lib/internal-analytics-core.test.mjs`: behavior tests for attribution and session expiry.
- Create `components/analytics/internal-analytics-tracker.tsx`: consent-enabled route tracker and local anonymous session state.
- Create `app/api/cms/analytics/page-view/route.ts`: same-origin proxy to the Spring public collection endpoint.
- Modify `components/analytics/analytics-provider.tsx`: mount the internal tracker only while consent is granted and clear its state when consent is withdrawn.
- Modify `components/analytics/analytics-integration.test.mjs`: assert that consent gates both GA4 and internal analytics.

### Spring Boot Storage And APIs

- Create `backend/cms/src/main/resources/db/migration/V3__traffic_analytics.sql`: analytics tables and indexes.
- Create `backend/cms/src/main/java/com/daeho/cms/repository/TrafficAnalyticsRepository.java`: transactional page-view recording, retention cleanup, summaries, and paginated visit queries.
- Create `backend/cms/src/main/java/com/daeho/cms/service/TrafficAnalyticsService.java`: validation, channel normalization, Seoul date boundaries, and cleanup scheduling.
- Create `backend/cms/src/main/java/com/daeho/cms/controller/PublicAnalyticsController.java`: public collection contract.
- Create `backend/cms/src/main/java/com/daeho/cms/controller/AdminAnalyticsController.java`: authenticated reporting contracts.
- Create `backend/cms/src/test/java/com/daeho/cms/service/TrafficAnalyticsServiceTest.java`: channel and validation tests.
- Create `backend/cms/src/test/java/com/daeho/cms/repository/TrafficAnalyticsRepositoryTest.java`: PostgreSQL repository integration coverage where the existing test environment supports it; otherwise cover SQL behavior through repository mocks and the deployed migration smoke test.
- Modify `backend/cms/src/test/java/com/daeho/cms/controller/CmsHttpContractTest.java`: public and administrator endpoint contracts.

### CMS Reporting

- Modify `lib/cms/repositories.ts`: analytics response types and server-side fetch functions.
- Create `app/admin/(dashboard)/analytics/page.tsx`: filters, metrics, breakdowns, landing pages, and paginated recent visits.
- Create `app/admin/analytics-page.test.mjs`: navigation, filters, metrics, and privacy-field source assertions.
- Modify `app/admin/_components/admin-shell.tsx`: add the Analytics navigation item.
- Modify `lib/admin-i18n.ts`: Chinese, Korean, and English analytics copy.

### Policy And Verification

- Modify `messages/ko.json` and `messages/en.json`: disclose first-party anonymous CMS analytics and 14-month retention.
- Modify `lib/cms/privacy-analytics-source.test.mjs`: enforce the new disclosure and prohibited-data statements.
- Update the production CMS privacy-page content through the authenticated CMS API during deployment, preserving the two legal-page SEO descriptions that the user explicitly asked not to change.
- Create `scripts/verify-traffic-analytics.mjs`: production consent, UTM, route transition, idempotency, and CMS data verification.

---

### Task 1: Pure Attribution And Session Core

**Files:**
- Create: `lib/internal-analytics-core.mjs`
- Create: `lib/internal-analytics-core.d.ts`
- Create: `lib/internal-analytics-core.test.mjs`

**Interfaces:**
- Produces:
  - `classifyTrafficSource(input): TrafficAttribution`
  - `sanitizeReferrerHost(referrer, siteOrigin): string`
  - `classifyDevice(viewportWidth, userAgentDataMobile): TrafficDevice`
  - `resolveSessionState(storedState, nowMs, seed): SessionResolution`
  - `INTERNAL_ANALYTICS_STORAGE_KEY`
  - `INTERNAL_ANALYTICS_SESSION_TIMEOUT_MS`
- Consumed by: `InternalAnalyticsTracker` in Task 4.

- [ ] **Step 1: Write failing attribution and session tests**

```js
test('classifies campaign and referrer traffic with UTM priority', () => {
  assert.deepEqual(
    classifyTrafficSource({
      source: 'instagram',
      medium: 'social',
      campaign: 'always_on',
      content: 'profile_link',
      referrerHost: 'google.com'
    }),
    {
      channel: 'instagram',
      source: 'instagram',
      medium: 'social',
      campaign: 'always_on',
      content: 'profile_link'
    }
  );
  assert.equal(classifyTrafficSource({source: '', medium: '', referrerHost: 'search.naver.com'}).channel, 'naver');
  assert.equal(classifyTrafficSource({source: '', medium: '', referrerHost: ''}).channel, 'direct');
});

test('reuses a session for 30 minutes and rotates it afterwards', () => {
  const stored = {sessionId: '00000000-0000-4000-8000-000000000001', lastActivityAt: 1_000};
  assert.equal(resolveSessionState(stored, 1_000 + 29 * 60_000, seed).isNew, false);
  assert.equal(resolveSessionState(stored, 1_000 + 30 * 60_000 + 1, seed).isNew, true);
});
```

- [ ] **Step 2: Run the tests and confirm the expected failure**

Run:

```bash
node --test lib/internal-analytics-core.test.mjs
```

Expected: FAIL because `internal-analytics-core.mjs` does not exist.

- [ ] **Step 3: Implement the pure module**

The implementation must:

```js
export const INTERNAL_ANALYTICS_STORAGE_KEY = 'daeho_internal_analytics_session_v1';
export const INTERNAL_ANALYTICS_SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export function classifyTrafficSource(input) {
  const source = cleanValue(input.source);
  const medium = cleanValue(input.medium);
  const host = cleanHost(input.referrerHost);
  const candidate = source.toLowerCase();

  const channel =
    candidate === 'google' || isHost(host, 'google.com') ? 'google' :
    candidate === 'naver' || candidate === 'naver_blog' || isHost(host, 'naver.com') ? 'naver' :
    candidate === 'instagram' || isHost(host, 'instagram.com') ? 'instagram' :
    candidate === 'kakao' || isHost(host, 'kakao.com') || isHost(host, 'kakao.co.kr') ? 'kakao' :
    candidate === 'qr' ? 'qr' :
    medium.toLowerCase() === 'social' ? 'social' :
    host ? 'referral' :
    source ? 'other' :
    'direct';

  return {
    channel,
    source: source || (host || '(direct)'),
    medium: medium || (host ? 'referral' : '(none)'),
    campaign: cleanValue(input.campaign),
    content: cleanValue(input.content)
  };
}
```

`sanitizeReferrerHost` must return an empty string for the DAEHO origin, strip `www.`, and never return a path or query. `resolveSessionState` must reject malformed stored values, rotate at `> 30 minutes`, and accept injected IDs through `seed.sessionId` for deterministic tests.

- [ ] **Step 4: Add exact TypeScript declarations**

Declare channels as:

```ts
export type TrafficChannel =
  | 'google'
  | 'naver'
  | 'instagram'
  | 'kakao'
  | 'qr'
  | 'social'
  | 'referral'
  | 'direct'
  | 'other';
```

Declare the input/output signatures used by the tracker without using `any`.

- [ ] **Step 5: Run focused tests**

Run:

```bash
node --test lib/internal-analytics-core.test.mjs lib/analytics-core.test.mjs
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/internal-analytics-core.mjs lib/internal-analytics-core.d.ts lib/internal-analytics-core.test.mjs
git commit -m "Add anonymous traffic attribution core"
```

---

### Task 2: PostgreSQL Schema And Analytics Repository

**Files:**
- Create: `backend/cms/src/main/resources/db/migration/V3__traffic_analytics.sql`
- Create: `backend/cms/src/main/java/com/daeho/cms/repository/TrafficAnalyticsRepository.java`
- Create: `backend/cms/src/test/java/com/daeho/cms/repository/TrafficAnalyticsRepositoryTest.java`

**Interfaces:**
- Produces:
  - `RecordResult recordPageView(Map<String,Object> payload)`
  - `Map<String,Object> summary(OffsetDateTime from, OffsetDateTime to, String channel)`
  - `Map<String,Object> visits(OffsetDateTime from, OffsetDateTime to, String channel, int page, int pageSize)`
  - `int deleteExpired(OffsetDateTime cutoff)`
- Consumed by: `TrafficAnalyticsService` in Task 3.

- [ ] **Step 1: Write the migration**

Create both tables with the following contract:

```sql
CREATE TABLE cms_analytics_sessions (
  session_id uuid PRIMARY KEY,
  channel text NOT NULL,
  source text NOT NULL,
  medium text NOT NULL,
  campaign text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  referrer_host text NOT NULL DEFAULT '',
  landing_path text NOT NULL,
  latest_path text NOT NULL,
  locale text NOT NULL CHECK (locale IN ('ko', 'en')),
  device_class text NOT NULL CHECK (device_class IN ('desktop', 'tablet', 'mobile')),
  page_view_count integer NOT NULL DEFAULT 0 CHECK (page_view_count >= 0),
  started_at timestamptz NOT NULL,
  last_activity_at timestamptz NOT NULL
);

CREATE TABLE cms_analytics_pageviews (
  page_view_id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES cms_analytics_sessions(session_id) ON DELETE CASCADE,
  page_path text NOT NULL,
  page_title text NOT NULL DEFAULT '',
  viewed_at timestamptz NOT NULL
);
```

Add indexes on `started_at`, `last_activity_at`, `(channel, started_at)`, `landing_path`, `(session_id, viewed_at)`, and `viewed_at`.

- [ ] **Step 2: Write repository tests for idempotency and report shape**

The test must assert:

- first page view creates one session and count `1`;
- a second page view updates latest path/count;
- retrying the same page-view UUID returns `inserted=false` without incrementing;
- summary returns totals, daily rows, channel rows, and landing rows;
- visits returns newest-first pagination.

If the project test environment cannot start PostgreSQL, use a mocked `JdbcTemplate` for Java unit coverage and verify the migration in Task 7 against the local and production PostgreSQL containers.

- [ ] **Step 3: Run the repository test and confirm failure**

Run:

```bash
cd backend/cms
./mvnw test -Dtest=TrafficAnalyticsRepositoryTest
```

If `./mvnw` is absent, run:

```bash
cd backend/cms
mvn test -Dtest=TrafficAnalyticsRepositoryTest
```

Expected: FAIL because the repository does not exist.

- [ ] **Step 4: Implement transactional recording**

Use one `@Transactional` method:

```java
public RecordResult recordPageView(Map<String, Object> payload) {
  UUID sessionId = UUID.fromString(payload.get("sessionId").toString());
  UUID pageViewId = UUID.fromString(payload.get("pageViewId").toString());

  jdbc.update("""
      INSERT INTO cms_analytics_sessions (...)
      VALUES (...)
      ON CONFLICT (session_id) DO NOTHING
      """, ...);

  int inserted = jdbc.update("""
      INSERT INTO cms_analytics_pageviews (...)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (page_view_id) DO NOTHING
      """, pageViewId, sessionId, ...);

  if (inserted == 1) {
    jdbc.update("""
        UPDATE cms_analytics_sessions
        SET latest_path = ?, locale = ?, device_class = ?,
            page_view_count = page_view_count + 1,
            last_activity_at = GREATEST(last_activity_at, ?)
        WHERE session_id = ?
        """, ...);
  }
  return new RecordResult(inserted == 1);
}
```

Never overwrite first-touch attribution, landing path, or session start on conflict.

- [ ] **Step 5: Implement report queries**

Use `[from, to)` session boundaries and optional channel:

```sql
WHERE started_at >= ? AND started_at < ?
  AND (? = '' OR channel = ?)
```

Build:

- totals with `COUNT(*)`, `COALESCE(SUM(page_view_count), 0)`, and average;
- active sessions using `last_activity_at >= now() - interval '30 minutes'`;
- daily rows grouped by `(started_at AT TIME ZONE 'Asia/Seoul')::date`;
- channel rows grouped by channel/source/medium;
- landing rows grouped by landing path with a deterministic leading channel;
- visits with `LIMIT ? OFFSET ?`.

- [ ] **Step 6: Implement bounded retention cleanup**

```java
@Transactional
public int deleteExpired(OffsetDateTime cutoff) {
  int pageViews = jdbc.update("DELETE FROM cms_analytics_pageviews WHERE viewed_at < ?", cutoff);
  int sessions = jdbc.update("DELETE FROM cms_analytics_sessions WHERE last_activity_at < ?", cutoff);
  return pageViews + sessions;
}
```

- [ ] **Step 7: Run tests and migration syntax check**

Run:

```bash
cd backend/cms
mvn test -Dtest=TrafficAnalyticsRepositoryTest
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/cms/src/main/resources/db/migration/V3__traffic_analytics.sql \
  backend/cms/src/main/java/com/daeho/cms/repository/TrafficAnalyticsRepository.java \
  backend/cms/src/test/java/com/daeho/cms/repository/TrafficAnalyticsRepositoryTest.java
git commit -m "Add traffic analytics persistence"
```

---

### Task 3: Spring Validation, Collection, And Reporting APIs

**Files:**
- Create: `backend/cms/src/main/java/com/daeho/cms/service/TrafficAnalyticsService.java`
- Create: `backend/cms/src/main/java/com/daeho/cms/controller/PublicAnalyticsController.java`
- Create: `backend/cms/src/main/java/com/daeho/cms/controller/AdminAnalyticsController.java`
- Create: `backend/cms/src/test/java/com/daeho/cms/service/TrafficAnalyticsServiceTest.java`
- Modify: `backend/cms/src/test/java/com/daeho/cms/controller/CmsHttpContractTest.java`

**Interfaces:**
- Consumes: `TrafficAnalyticsRepository` from Task 2.
- Produces:
  - `POST /api/cms/analytics/page-view`
  - `GET /api/admin/analytics/summary`
  - `GET /api/admin/analytics/visits`
- Consumed by: Next.js proxy and CMS repositories in Tasks 4 and 5.

- [ ] **Step 1: Write failing service tests**

Cover:

```java
assertEquals("instagram", service.normalizeChannel(payload("instagram", "social", "google.com")));
assertEquals("naver", service.normalizeChannel(payload("", "", "search.naver.com")));
assertEquals("direct", service.normalizeChannel(payload("", "", "")));
assertThrows(ValidationFailedException.class, () -> service.record(Map.of("sessionId", "not-a-uuid")));
```

Also assert paths must start with `/`, locale/device are allowlisted, fields are length-limited, page size is restricted to `25`, `50`, or `100`, and invalid report dates return validation errors.

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
cd backend/cms
mvn test -Dtest=TrafficAnalyticsServiceTest
```

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement the service**

The service must:

- normalize known channels using the design priority;
- trim and cap source/medium/campaign/content/referrer/title;
- accept only UUID version-agnostic syntax, valid locale/device, and slash-prefixed paths;
- parse report dates in `Asia/Seoul`;
- call `repository.recordPageView`;
- run cleanup at most once per UTC date using `AtomicReference<LocalDate>`;
- use a cutoff of `OffsetDateTime.now(ZoneOffset.UTC).minusMonths(14)`.

Expose immutable result maps to controllers.

- [ ] **Step 4: Add controller contract tests before controllers**

Add mocked `TrafficAnalyticsService` to `CmsHttpContractTest` and assert:

```java
mvc.perform(post("/api/cms/analytics/page-view")
    .contentType(MediaType.APPLICATION_JSON)
    .content(validAnalyticsPayload()))
  .andExpect(status().isAccepted());

mvc.perform(get("/api/admin/analytics/summary?from=2026-07-01&to=2026-07-23")
    .header("x-admin-api-key", ADMIN_KEY))
  .andExpect(status().isOk());

mvc.perform(get("/api/admin/analytics/visits")
    .param("from", "2026-07-01")
    .param("to", "2026-07-23"))
  .andExpect(status().isUnauthorized());
```

Assert duplicate collection returns `200 OK`.

- [ ] **Step 5: Implement focused controllers**

```java
@RestController
@RequestMapping("/api/cms/analytics")
public class PublicAnalyticsController {
  @PostMapping("/page-view")
  public ResponseEntity<Map<String, Object>> pageView(@RequestBody Map<String, Object> body) {
    var result = service.record(body);
    return ResponseEntity.status(result.inserted() ? HttpStatus.ACCEPTED : HttpStatus.OK)
        .body(Map.of("accepted", true, "inserted", result.inserted()));
  }
}
```

`AdminAnalyticsController` must call `auth.requireAdmin(request)` before service methods and use defaults of 30 days, all channels, page `1`, and page size `25`.

- [ ] **Step 6: Run Spring tests**

Run:

```bash
cd backend/cms
mvn test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/cms/src/main/java/com/daeho/cms/service/TrafficAnalyticsService.java \
  backend/cms/src/main/java/com/daeho/cms/controller/PublicAnalyticsController.java \
  backend/cms/src/main/java/com/daeho/cms/controller/AdminAnalyticsController.java \
  backend/cms/src/test/java/com/daeho/cms/service/TrafficAnalyticsServiceTest.java \
  backend/cms/src/test/java/com/daeho/cms/controller/CmsHttpContractTest.java
git commit -m "Expose traffic analytics APIs"
```

---

### Task 4: Consent-Gated Public Tracker And Same-Origin Proxy

**Files:**
- Create: `components/analytics/internal-analytics-tracker.tsx`
- Create: `app/api/cms/analytics/page-view/route.ts`
- Modify: `components/analytics/analytics-provider.tsx`
- Modify: `components/analytics/analytics-integration.test.mjs`

**Interfaces:**
- Consumes: attribution/session core from Task 1 and public Spring endpoint from Task 3.
- Produces: one internal page-view request per accepted route state.

- [ ] **Step 1: Add failing integration source tests**

Assert:

```js
assert.match(provider, /<InternalAnalyticsTracker enabled=/);
assert.match(provider, /clearInternalAnalyticsSession/);
assert.match(tracker, /crypto\\.randomUUID/);
assert.match(tracker, /INTERNAL_ANALYTICS_SESSION_TIMEOUT_MS/);
assert.match(tracker, /\\/api\\/cms\\/analytics\\/page-view/);
assert.match(route, /cmsBackendRequest/);
```

Also assert the tracker receives `enabled={analyticsReady && consent === 'granted'}` and is never mounted for `unknown` or `denied`.

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```bash
node --test components/analytics/analytics-integration.test.mjs
```

Expected: FAIL because the internal tracker and proxy do not exist.

- [ ] **Step 3: Implement the same-origin proxy**

```ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  const response = await cmsBackendRequest<{accepted: boolean; inserted: boolean}>(
    '/api/cms/analytics/page-view',
    {method: 'POST', body}
  );
  return NextResponse.json(response, {status: response.inserted ? 202 : 200});
}
```

Map malformed JSON to `400`; use the existing `CmsBackendError` response conventions and do not forward browser IP/User-Agent headers.

- [ ] **Step 4: Implement the tracker**

Use `usePathname` and `useSearchParams`. On each enabled route:

```ts
const pageKey = `${pagePath}|${document.title}`;
if (lastPageKey.current === pageKey) return;

const resolution = resolveSessionState(readStoredSession(), Date.now(), {
  sessionId: crypto.randomUUID()
});
const pageViewId = crypto.randomUUID();

void fetch('/api/cms/analytics/page-view', {
  method: 'POST',
  headers: {'content-type': 'application/json'},
  keepalive: true,
  body: JSON.stringify({...payload, pageViewId})
}).catch(() => undefined);
```

New sessions capture first-touch attribution and sanitized referrer host. Reused sessions preserve attribution and update only `lastActivityAt`. Store no cross-session identifier.

- [ ] **Step 5: Integrate with consent**

Render:

```tsx
<InternalAnalyticsTracker
  enabled={analyticsReady && consent === 'granted'}
  locale={locale}
/>
```

When consent changes to denied, call `clearInternalAnalyticsSession()` alongside Google cookie deletion.

- [ ] **Step 6: Run browser-core and integration tests**

Run:

```bash
node --test lib/internal-analytics-core.test.mjs components/analytics/analytics-integration.test.mjs
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add components/analytics/internal-analytics-tracker.tsx \
  app/api/cms/analytics/page-view/route.ts \
  components/analytics/analytics-provider.tsx \
  components/analytics/analytics-integration.test.mjs
git commit -m "Track consented anonymous traffic"
```

---

### Task 5: CMS Analytics Data Client And Report Page

**Files:**
- Modify: `lib/cms/repositories.ts`
- Create: `app/admin/(dashboard)/analytics/page.tsx`
- Create: `app/admin/analytics-page.test.mjs`
- Modify: `app/admin/_components/admin-shell.tsx`
- Modify: `lib/admin-i18n.ts`

**Interfaces:**
- Consumes: administrator API endpoints from Task 3.
- Produces: `/admin/analytics`.

- [ ] **Step 1: Write failing CMS source tests**

Assert:

```js
assert.match(shell, /href: '\\/admin\\/analytics'/);
assert.match(page, /getTrafficAnalyticsSummary/);
assert.match(page, /listTrafficAnalyticsVisits/);
assert.match(page, /searchParams/);
assert.match(page, /analytics\\.metricVisits/);
assert.doesNotMatch(page, /ipAddress|userAgent|geolocation/);
```

Also assert the page offers `7`, `30`, and `90` day links, channel filtering, and pagination.

- [ ] **Step 2: Run the source test and confirm failure**

Run:

```bash
node --test app/admin/analytics-page.test.mjs
```

Expected: FAIL because the page does not exist.

- [ ] **Step 3: Add typed repository clients**

Define:

```ts
export type TrafficAnalyticsSummary = {
  totals: {
    sessions: number;
    pageViews: number;
    activeSessions: number;
    averagePagesPerSession: number;
  };
  daily: Array<{date: string; sessions: number; pageViews: number}>;
  channels: Array<{
    channel: string;
    source: string;
    medium: string;
    sessions: number;
    pageViews: number;
    share: number;
  }>;
  landingPages: Array<{path: string; sessions: number; leadingChannel: string}>;
};
```

Add `getTrafficAnalyticsSummary(filters)` and `listTrafficAnalyticsVisits(filters)` that call administrator endpoints with `admin: true`.

- [ ] **Step 4: Add localized CMS copy**

Add `nav.analytics` and complete `analytics.*` keys to `zhMessages`, `koMessages`, and `enMessages`, including:

- page title/description;
- date presets/custom dates;
- metrics;
- channel labels;
- table headings;
- pagination and empty states;
- privacy note stating that only consenting anonymous sessions are shown.

- [ ] **Step 5: Build the server-rendered report**

Parse search parameters with safe defaults:

```ts
const filters = normalizeAnalyticsFilters(await searchParams, nowInSeoul);
const [summary, visits] = await Promise.all([
  getTrafficAnalyticsSummary(filters),
  listTrafficAnalyticsVisits(filters)
]);
```

Render:

- compact four-metric grid;
- restrained daily visualization with stable dimensions;
- channel table;
- landing-page table;
- recent-visit table;
- URL-based preset/channel links;
- GET custom-date form;
- previous/next pagination links.

Use full-width panels rather than nested cards. Keep tables horizontally scrollable on narrow CMS viewports and use `break-words` for paths.

- [ ] **Step 6: Run focused tests**

Run:

```bash
node --test app/admin/analytics-page.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/cms/repositories.ts \
  'app/admin/(dashboard)/analytics/page.tsx' \
  app/admin/analytics-page.test.mjs \
  app/admin/_components/admin-shell.tsx \
  lib/admin-i18n.ts
git commit -m "Add CMS traffic analytics report"
```

---

### Task 6: Privacy Disclosure And Full Automated Verification

**Files:**
- Modify: `messages/ko.json`
- Modify: `messages/en.json`
- Modify: `lib/cms/privacy-analytics-source.test.mjs`
- Create: `scripts/verify-traffic-analytics.mjs`

**Interfaces:**
- Consumes: completed public and CMS analytics feature.
- Produces: enforceable privacy text and production verification script.

- [ ] **Step 1: Strengthen the privacy test before copy changes**

Require Korean and English policy text to include:

- first-party anonymous session analytics;
- channel/source, landing page, device class, and visit time;
- explicit exclusion of IP and form/contact content;
- 14-month retention;
- consent withdrawal stopping both GA4 and internal collection.

Preserve the existing legal-page SEO descriptions unchanged.

- [ ] **Step 2: Run the privacy test and confirm failure**

Run:

```bash
node --test lib/cms/privacy-analytics-source.test.mjs
```

Expected: FAIL because the first-party analytics disclosure is absent.

- [ ] **Step 3: Update Korean and English privacy copy**

Extend Article 10 / the cookies and analytics section. The Korean text must state, in substance:

```text
분석에 동의한 이용자의 익명 세션 ID, 유입 채널·소스, 캠페인 정보,
최초·최근 방문 경로, 방문 시각, 페이지 조회 수, 언어 및 기기 유형을
회사의 CMS 데이터베이스에 최대 14개월 보관합니다.
IP 주소, 원본 User-Agent, 문의·연락처·각인 내용은 방문 분석 기록에 저장하지 않습니다.
```

Add equivalent English text. Do not alter the two legal-page SEO descriptions containing `대호 브리아노` or `(주)대호브리아노`.

- [ ] **Step 4: Create a production verification script**

The Playwright script must:

1. clear site storage/cookies;
2. load a deployment-test UTM URL;
3. assert no GA tag and no internal page-view request before consent;
4. accept analytics;
5. capture one internal request and one GA collect request;
6. navigate to a second route and capture exactly one additional internal page view;
7. log into CMS using externally supplied test credentials or reuse an authenticated browser context without printing the password;
8. verify the test channel appears in summary and recent visits;
9. check desktop/mobile overflow and console errors.

- [ ] **Step 5: Run all automated checks**

Run:

```bash
node --test \
  lib/internal-analytics-core.test.mjs \
  lib/analytics-core.test.mjs \
  components/analytics/analytics-integration.test.mjs \
  app/admin/analytics-page.test.mjs \
  lib/cms/privacy-analytics-source.test.mjs
cd backend/cms && mvn test
cd ../.. && npm run lint
npm run build
```

Expected: all tests pass, lint reports zero errors, and the production build completes.

- [ ] **Step 6: Commit**

```bash
git add messages/ko.json messages/en.json \
  lib/cms/privacy-analytics-source.test.mjs \
  scripts/verify-traffic-analytics.mjs
git commit -m "Document and verify internal traffic analytics"
```

---

### Task 7: Local Migration, AWS Deployment, And Production Acceptance

**Files:**
- No new source files expected.
- Production CMS privacy data changes through authenticated API/controlled database update.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: deployed analytics reporting on `https://daeho.works/admin/analytics`.

- [ ] **Step 1: Rebuild local services**

Run:

```bash
HTTP_PORT=18180 docker compose -p daeho-local up -d --build cms-api next nginx
```

Expected: Flyway applies `V3__traffic_analytics.sql`; all three services are healthy/running.

- [ ] **Step 2: Verify the local migration**

Run a read-only PostgreSQL schema inspection:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('cms_analytics_sessions', 'cms_analytics_pageviews')
ORDER BY table_name;
```

Expected: two rows.

- [ ] **Step 3: Run local browser acceptance**

Use:

```bash
BASE_URL=http://localhost:18180 node scripts/verify-traffic-analytics.mjs
```

Expected:

- zero analytics requests before consent;
- one session and two page views after consent and route navigation;
- correct deployment-test channel/source;
- no horizontal overflow or console errors.

- [ ] **Step 4: Inspect Git state and push**

Run:

```bash
git status --short
git log --oneline -8
git push origin codex/spring-boot-cms-migration
```

Expected: only pre-existing untracked artifact directories remain; push succeeds.

- [ ] **Step 5: Deploy AWS services**

Run:

```bash
KEY='/Users/tingyouzhao/.ssh/LightsailDefaultKey-ap-northeast-2.pem'
ssh -i "$KEY" -o BatchMode=yes ubuntu@15.164.62.44 '
  cd /home/ubuntu/daeho-site
  git fetch origin codex/spring-boot-cms-migration
  git checkout codex/spring-boot-cms-migration
  git reset --hard origin/codex/spring-boot-cms-migration
  sudo docker compose -p daeho-prod up -d --build cms-api next nginx
  sudo docker compose -p daeho-prod ps
'
```

Expected: PostgreSQL remains healthy; `cms-api`, `next`, and `nginx` are running; Flyway migration succeeds.

- [ ] **Step 6: Update production privacy CMS content**

Read the current `privacy` page through the authenticated administrator API, update only the Article 10 analytics body and effective-date content to match `messages/ko.json` and `messages/en.json`, and PUT the complete preserved page payload back. Do not print the administrator API key or change either legal SEO description.

- [ ] **Step 7: Run production acceptance**

Run:

```bash
BASE_URL=https://daeho.works LIVE_GA=1 node scripts/verify-traffic-analytics.mjs
```

Expected:

- internal page-view endpoint returns `202` then `202`;
- GA4 collect returns `204`;
- CMS shows the deployment-test source in both summary and recent visits;
- a replayed page-view ID returns `200` and does not increment;
- public and administrator pages return `200`;
- no console errors or layout overflow.

- [ ] **Step 8: Final operational check**

Confirm:

- `/admin/analytics` defaults to 30 days;
- 7/30/90/custom filters work;
- channel filtering and pagination work;
- no IP/User-Agent/form fields are present in analytics tables or responses;
- analytics tables are absent from CMS export;
- current local, origin, and deployed commit hashes match.

