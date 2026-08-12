# Contact B2B Direct Phone Notice Design

## Goal

Add a bilingual B2B and corporate-customer direct-phone notice at the top of the Contact form card. The notice must match the desktop Korean navigation text size, display the phone number in the site's brand red, and be editable through the existing CMS.

## Placement and presentation

- Render the notice inside the right-hand Contact form card, before the first form field.
- Keep the notice within the card's existing horizontal padding and separate it from the first field with spacing consistent with the form rhythm.
- Use the existing body font and normal sentence casing.
- Use `14px` text on desktop to match the Korean desktop navigation text identified in the reference image.
- Use `16px` text on mobile for legibility and consistency with the mobile form copy.
- Render the surrounding text in the normal Contact-page text color.
- Render only the direct phone number in the existing brand accent red.

## CMS content model

Add three fields to the Contact page's `main` CMS group for each supported locale:

1. Text before the phone number.
2. Direct phone number.
3. Text after the phone number.

This split guarantees that the phone number remains red while allowing editors to change every visible character without entering markup or maintaining a placeholder token.

Default Korean content:

- Before: `B2B 주문 및 기업 고객은 직통전화 `
- Phone: `010 4325 0369`
- After: `로도 상담하실 수 있습니다.`

Default English content:

- Before: `B2B orders and corporate customers can also reach us directly at `
- Phone: `010 4325 0369`
- After: `.`

The fields will be registered in the CMS page catalog so administrators can edit Korean and English values independently from the Contact page editor. Existing CMS records will inherit the static defaults through the current deep-merge fallback and will persist the fields the next time the page is saved.

## Rendering behavior

The Contact page will pass the three localized values to a small `ContactDirectPhoneNotice` presentation component in `components/forms/contact-direct-phone-notice.tsx`. The component will output the fragments in order and wrap only the phone fragment in the accent-red style.

Empty values remain valid:

- If either surrounding text field is empty, the remaining fragments still render in the correct order.
- If the phone field is empty, no red phone fragment is rendered.
- If all three fields are empty, the notice is omitted so the form does not gain blank vertical space.

The notice is informational text, not a new input and not part of the inquiry submission payload. The phone number will not be made into an interactive link in this change because the requested behavior is visual text and CMS editing only.

## Data and migration impact

- Add the defaults to both locale message files.
- Add the three editable fields to the Contact definition in the CMS page catalog.
- Update the static CMS preview content so frontend-only/static-snapshot behavior mirrors the editable defaults.
- No database schema change is required because page content is stored as locale JSON.
- No inquiry API, validation, analytics, or notification behavior changes.

## Testing and verification

Use test-driven development at the existing source-contract test seam:

1. Add a focused failing test that asserts the bilingual defaults, the three Contact CMS fields, placement before the form, omission when all fragments are empty, and accent styling limited to the phone fragment.
2. Run the focused test and confirm it fails because the notice is not implemented.
3. Implement the smallest rendering and CMS changes that satisfy the test.
4. Re-run the focused test, type checking, the full test suite, linting, and the production build.
5. Verify the Korean and English Contact pages at desktop and mobile widths when the local runtime is available.

## Out of scope

- Changing the Contact form fields or submission behavior.
- Adding click-to-call behavior.
- Introducing rich-text or HTML editing in the CMS.
- Refactoring unrelated Contact-page or CMS code.
