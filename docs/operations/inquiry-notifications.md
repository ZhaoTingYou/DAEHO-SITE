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
exist in the production server environment.

## Safe rollout

1. Deploy the database migration and compatible APIs. Leave all CMS switches off.
2. Configure Workspace Relay and use the CMS test-send form.
3. Enable internal email, submit a test inquiry, and confirm arrival within 60 seconds.
4. Enable customer email and test each customer status.
5. Enable Kakao only after all three Korean templates are externally approved and the
   connection health screen reports ready.

If a provider is unavailable, the CMS status still changes immediately. Review
the inquiry notification timeline for queued attempts, retry times, provider IDs,
and final errors.
