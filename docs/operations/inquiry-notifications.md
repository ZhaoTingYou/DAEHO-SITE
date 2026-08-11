# Inquiry notification operations

The application stores inquiry status changes and immutable rendered notification
jobs before any external request is made. All notification switches are disabled
by default.

## Google Workspace SMTP Relay

1. Reserve and verify the Lightsail static public IP.
2. In Google Workspace Admin, allow that IP for SMTP Relay.
3. Use a sender address in the company domain.
4. Configure the production service:

```dotenv
SMTP_HOST=smtp-relay.gmail.com
SMTP_PORT=587
SMTP_STARTTLS=true
SMTP_STARTTLS_REQUIRED=true
SMTP_AUTH=false
SMTP_FROM=no-reply@company-domain.example
CMS_NOTIFY_TO=inquiries@company-domain.example
```

Do not put credentials in Git or CMS records. If the Workspace policy requires
authentication, supply `SMTP_USER`, `SMTP_PASS`, and set `SMTP_AUTH=true` only in
the server environment.

## SOLAPI Kakao Alimtalk

1. Connect the approved company KakaoTalk Channel to SOLAPI and copy its `pfId`.
2. Create and approve the three Korean templates for `contacted`, `in_progress`,
   and `done`. The external variables are `#{고객명}` and `#{문의번호}`.
3. Copy each approved `KA01TP...` Template ID.
4. After external approval, create a new template version in
   `/admin/notifications`, set its approval status to `approved`, enter the
   SOLAPI Template ID, and activate it. Kakao always uses the Korean template,
   including for inquiries submitted from the English website.
5. Configure only the production service:

```dotenv
SOLAPI_API_BASE_URL=https://api.solapi.com
SOLAPI_API_KEY=
SOLAPI_API_SECRET=
SOLAPI_PF_ID=
```

The client always sends `"disableSms": true`, omits the SMS sender number, and
rejects an unexpected replacement result. Invalid or non-Korean mobile numbers
become `needs_attention` jobs for manual contact. SOLAPI API secrets must only
exist in the production server environment. Production requests are restricted
to the HTTPS `api.solapi.com` endpoint; loopback HTTP is accepted only for local
automated tests.

The CMS reports SOLAPI configuration and successful application test delivery
separately. Kakao cannot be enabled until each of the three approved active
templates has been successfully test-sent from this CMS and final Kakao delivery
has been confirmed. Changing a template ID, version, body, channel, or API
credential invalidates that template's verification. Provider-cutover jobs are
quarantined and cannot be retried as SOLAPI Template IDs.

Verification is checked again while planning and immediately before a Kakao send.
Activating a new Kakao template atomically disables Kakao and quarantines unfinished
Kakao jobs. Each queued Kakao job also stores a non-exported verification fingerprint;
the worker compares it with the delivered template verification before sending. A
changed template, endpoint, or credential therefore cannot bypass the CMS enable gate.

Template verification is deliberately excluded from CMS backups. After a backup
restore, Kakao is disabled, unfinished restored Kakao jobs are quarantined, and
all three active Kakao templates must be tested again before enabling Kakao. A
shared database dispatch lock prevents the restore from racing an in-flight send.
The worker first commits a `processing` claim, then holds a PostgreSQL session lock
for one external send at a time. External I/O is not inside a rollbackable batch.
If the process is interrupted after dispatch, the uncertain `processing` job is
quarantined for manual review instead of being sent again automatically.

## Safe rollout

1. Deploy the database migration and compatible APIs. Leave all CMS switches off.
2. Configure Workspace Relay and use the CMS test-send form.
3. Enable internal email, submit a test inquiry, and confirm arrival within 60 seconds.
4. Enable customer email and test each customer status.
5. Test-send each of the three Korean templates from the CMS and confirm final delivery.
6. Enable Kakao only after all three templates are approved, active, and the
   connection health screen reports verified.

If a provider is unavailable, the CMS status still changes immediately. Review
the inquiry notification timeline for queued attempts, retry times, provider IDs,
and final errors.
