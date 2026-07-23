# CMS Traffic Analytics Design

## Goal

Add a privacy-conscious traffic analytics area to the existing DAEHO CMS so administrators can see both channel summaries and recent visit details without leaving the CMS. Keep the existing GA4 integration running as an independent professional analytics source.

## Product Scope

The CMS gains a new `/admin/analytics` page with:

- traffic totals for a selected date range;
- daily session and page-view trends;
- channel and source/medium summaries;
- top landing pages;
- recent anonymous visit details;
- channel filters, date filters, and pagination.

The feature records only visitors who have granted analytics consent. It does not attempt to estimate or display traffic from visitors who rejected analytics.

## Architecture

The implementation uses first-party anonymous analytics stored in the existing PostgreSQL database, alongside the existing GA4 integration:

1. The public Next.js site waits for the existing analytics consent state to become `granted`.
2. The browser creates an anonymous session identifier and captures the first-touch attribution for that session.
3. Each unique client-side page view sends a small sanitized payload to the Spring Boot CMS API.
4. Spring Boot validates the payload, classifies the channel again, and upserts the session and page view in PostgreSQL.
5. Authenticated CMS requests read aggregated and paginated data through administrator-only endpoints.
6. GA4 continues receiving its existing consent-gated events. The internal CMS analytics request does not generate an additional GA4 event.

No Google Cloud service-account key or GA4 Data API dependency is required.

## Traffic Definitions

### Session

A session is one continuous anonymous visit. The browser reuses the session identifier while activity continues and creates a new identifier after 30 minutes without a tracked page view.

The CMS label "visits" means sessions, not unique people. The system does not create a long-lived visitor identifier and does not report unique visitors.

### Page View

A page view is one tracked Next.js route state. The combination of session ID and page-view ID is unique, so retries and duplicate client effects cannot count the same page view twice.

### Active Visit

An active visit is a session whose last tracked page view occurred within the previous 30 minutes.

### Average Pages Per Visit

Average pages per visit is total accepted page views divided by total sessions in the selected date range.

## Attribution Rules

Attribution is fixed when the session begins and is not replaced by later internal navigation.

Priority order:

1. Sanitized UTM parameters.
2. Recognized external referrer host.
3. Other external referrer host.
4. Direct access.

The normalized channels are:

| Channel | Matching rule |
| --- | --- |
| `google` | `utm_source=google` or a Google search referrer |
| `naver` | `utm_source=naver`, `utm_source=naver_blog`, or a Naver referrer |
| `instagram` | `utm_source=instagram` or an Instagram referrer |
| `kakao` | `utm_source=kakao` or a Kakao referrer |
| `qr` | `utm_source=qr` |
| `social` | another recognized social referrer or `utm_medium=social` |
| `referral` | another external referrer |
| `direct` | no usable UTM value and no external referrer |
| `other` | a supplied source that does not match the rules above |

`source` and `medium` retain sanitized attribution values for detailed reporting. The CMS displays friendly localized labels for known channels and the normalized source/medium for unknown sources.

## Stored Data

### Analytics Session

Each session stores:

- opaque UUID session ID;
- normalized channel;
- sanitized source, medium, campaign, and content values;
- external referrer hostname only;
- landing page path;
- latest page path;
- locale (`ko` or `en`);
- device class (`desktop`, `tablet`, or `mobile`);
- page-view count;
- session start time;
- latest activity time.

### Analytics Page View

Each page view stores:

- opaque UUID page-view ID;
- parent session ID;
- sanitized page path;
- sanitized page title;
- event time.

Page paths may retain attribution parameters already allowed by `sanitizeAnalyticsUrl`, but must discard form values, engraving content, arbitrary query parameters, and personal information.

### Explicitly Excluded Data

The feature must not store:

- IP addresses;
- raw User-Agent strings;
- full referrer URLs or referrer query strings;
- names, email addresses, telephone numbers, organizations, inquiry text, or engraving content;
- Google Analytics client IDs;
- persistent cross-session visitor identifiers;
- precise geographic location.

## Database Design

Add a Flyway migration that creates:

- `cms_analytics_sessions`;
- `cms_analytics_pageviews`;
- indexes for session start time, latest activity, channel, landing path, and page-view event time.

The page-view table references the session table with `ON DELETE CASCADE`. A unique constraint on the page-view ID provides retry idempotency.

Analytics tables are operational data and are excluded from CMS content export/import. They are also excluded from content-inventory counts.

Records older than 14 months are deleted by a bounded cleanup operation. Cleanup runs at most once per UTC day after a successful analytics write and deletes expired page views before expired sessions.

## Public Collection Flow

The browser collects only after analytics consent is `granted`.

The first accepted page view:

1. Sanitizes the current URL with the existing analytics URL sanitizer.
2. Reads UTM values from the sanitized URL.
3. reduces `document.referrer` to a hostname.
4. Creates the session state with `crypto.randomUUID()`.
5. Stores the anonymous session state in local storage with the latest activity time.
6. Sends the page view with `fetch(..., {keepalive: true})`.

Later page views reuse first-touch attribution until 30 minutes of inactivity. Each route state receives a new page-view UUID. A client-side last-page key prevents duplicate React effects for the same URL.

When consent is withdrawn, the internal session state is removed immediately and no further internal analytics requests are sent.

Collection failures are silent and must not block navigation, forms, or rendering.

## API Design

### Public Endpoint

`POST /api/cms/analytics/page-view`

The endpoint:

- accepts JSON only;
- validates UUIDs, locale, device class, path shape, field lengths, and attribution fields;
- ignores duplicate page-view IDs;
- reclassifies the normalized channel on the server;
- upserts the session and inserts the page view transactionally;
- returns `202 Accepted` for a newly accepted page view;
- returns `200 OK` for an idempotent retry;
- uses the existing public API proxy and CORS boundaries.

The endpoint does not require an administrator session.

### Administrator Summary Endpoint

`GET /api/admin/analytics/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&channel=<channel>`

The endpoint returns:

- total sessions;
- total page views;
- active sessions;
- average pages per session;
- daily sessions and page views;
- channel/source/medium breakdown;
- top landing pages.

It requires the existing CMS administrator authentication.

### Administrator Visits Endpoint

`GET /api/admin/analytics/visits?from=YYYY-MM-DD&to=YYYY-MM-DD&channel=<channel>&page=<number>&pageSize=25`

The endpoint returns newest-first anonymous session rows plus total row and page counts. `pageSize` is restricted to 25, 50, or 100.

## CMS Interface

Add an "Analytics" navigation item and an `/admin/analytics` server-rendered page that follows the existing quiet operational CMS style.

### Filters

- segmented date presets: 7 days, 30 days, 90 days;
- custom start and end date fields;
- channel select;
- pagination for recent visits.

Filters are represented in URL search parameters so the report can be refreshed or bookmarked.

### Summary Area

Four compact metrics:

- visits;
- page views;
- active visits;
- average pages per visit.

### Analysis Area

- daily traffic table or restrained trend visualization;
- channel table with visits, percentage, page views, and pages per visit;
- top landing-page table with visits and leading channel.

### Recent Visit Details

The table shows:

- session start time;
- channel and source/medium;
- campaign when present;
- landing page;
- latest page;
- page-view count;
- locale;
- device class.

Long paths wrap without widening the page. Empty ranges display an explicit empty state. The page is responsive and remains usable in the existing mobile CMS shell.

Admin copy is available through the existing Korean and English administrator locale system.

## Privacy Policy

Update the Korean and English privacy pages to state that, after analytics consent, DAEHO stores anonymous first-party session information for traffic-source and site-usage analysis. The policy names the stored categories, states that IP addresses and contact/form content are excluded, documents the 14-month retention period, and explains that withdrawing analytics consent stops future collection.

## Error Handling And Abuse Resistance

- Invalid payloads return structured `400` validation errors.
- Oversized JSON requests are rejected by the existing server request-size boundary.
- Database failures return `500` without exposing SQL or internal details.
- Collection errors are not surfaced to public-site visitors.
- UUID idempotency prevents duplicate page-view counts from retries.
- Values are length-limited and paths must begin with `/`.
- The write path uses parameterized JDBC statements only.
- Internal traffic cannot be perfectly distinguished without IP processing; no staff exclusion feature is included in this version.

## Verification

### Automated

- Unit-test channel classification for Google, Naver, Instagram, Kakao, QR, referral, direct, and unknown UTM input.
- Unit-test 30-minute session reuse and expiry.
- Unit-test URL and field sanitization.
- Test consent withdrawal clearing internal session state.
- Test public API validation, first insert, session update, and duplicate page-view idempotency.
- Test authenticated summary and visits API contracts.
- Test administrator navigation and analytics-page layout/source expectations.
- Run all Spring Boot tests.
- Run the focused Node tests, full lint, and production Next.js build.

### Production

- Verify no internal analytics request before consent.
- Accept analytics and open a URL with deployment-test UTM values.
- Navigate to a second page and confirm one session with two page views.
- Confirm the CMS channel summary and recent-visit row.
- Confirm a duplicate page-view request does not increase counts.
- Confirm GA4 still receives its existing page view independently.
- Check desktop and mobile CMS layouts for overflow and console errors.

## Deployment

- Push the implementation to `codex/spring-boot-cms-migration`.
- Rebuild `cms-api`, `next`, and `nginx` in the `daeho-prod` Compose project.
- Let Flyway apply the analytics migration during CMS API startup.
- Verify service health, migration success, public tracking, administrator reporting, and existing GA4 collection on `https://daeho.works`.
