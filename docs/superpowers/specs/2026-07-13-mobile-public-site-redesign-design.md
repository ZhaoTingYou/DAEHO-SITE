# DAEHO Public Site Mobile Redesign

## Scope

Redesign every public Korean and English page for mobile viewports while preserving the current desktop experience and CMS data contracts.

Included page families:

- Shared header, navigation, footer, loading, and not-found states
- Home and Archive
- Heritage: Achievement, Credibility, Loyalty
- Mastery: Technique, Making, Creations, category pages, product detail, appointment, and bespoke
- News list and detail
- Golf and Golf inquiry
- Contact, Privacy, and Terms

The CMS admin interface and the internal style guide are outside this redesign.

## Design Direction

The mobile site should feel like a compact editorial record of DAEHO craftsmanship. It retains the white background, navy typography, burgundy accents, and existing Korean and English font systems. The redesign removes desktop-only visual weight instead of shrinking desktop layouts into a narrow viewport.

Core content remains available, but mobile may reorder sections and hide purely decorative elements such as oversized background numerals, dense measuring lines, duplicate labels, and nonessential framing.

## Shared Mobile System

### Viewports

- Primary layout target: 375px wide
- Secondary layout target: 430px wide
- Mobile rules apply below the existing desktop/tablet transition unless a component already has a more suitable breakpoint
- No horizontal page scrolling at 320px or wider

### Spacing

- Page side padding: 20px at compact widths and 24px on larger phones
- Section spacing: 72px to 96px depending on content density
- Related text spacing: 12px to 24px
- Tap targets: at least 44px high and wide

### Typography

- Body copy is at least 16px with readable line height
- Hero titles use controlled fixed sizes rather than viewport-width scaling
- Long Korean and English words wrap without clipping
- Existing font families remain unchanged: MaruBuri and Pretendard for Korean; Cormorant Garamond and Inter for English
- Letter spacing remains zero except existing small uppercase labels where the established design requires tracking

### Media

- Images use stable aspect-ratio containers and predictable object positioning
- Hero media uses 70svh to 85svh where it is the primary experience
- Product and evidence images show the subject clearly and avoid overly aggressive mobile crops
- Video controls and poster states remain reachable and readable

### Interaction

- Navigation becomes a full-height mobile menu with clear hierarchy and scrollable content
- Carousels retain visible previous and next controls with swipe-friendly spacing
- Sticky actions must not cover page content, browser safe areas, or accessibility controls
- Hover-only information receives a tap or always-visible mobile equivalent

## Page-Family Redesign

### Shared Header And Footer

- Use a compact header with logo, language control, and menu button
- Present navigation groups as a vertical hierarchy with clear current-page state
- Keep contact actions reachable without crowding the first viewport
- Reflow footer business details into readable single-column groups

### Home

- Keep the brand and hero media as the first signal while revealing the next section
- Simplify hero controls and eliminate hover-transition artifacts on touch devices
- Convert desktop split sections into alternating image-first editorial blocks
- Present statistics, production media, and latest news with consistent mobile rhythm
- Keep news navigation controls reachable without opening oversized overlays

### Archive

- Replace the desktop timeline composition with a vertical year index and focused milestone panel
- Remove oversized decorative year layers on mobile
- Keep milestone images, year labels, and body copy in one reading flow

### Heritage

- Use a consistent mobile hero and section-heading pattern across all three pages
- Reorder image and copy pairs for sequential reading
- Collapse complex diagrams and wide record layouts into vertical summaries
- Preserve evidence and credibility content without dense desktop framing

### Mastery Technique

- Keep Technical Records distinct from Making and Creations
- Stack each record as index, status, image, scope, title, and body
- Remove desktop alternation and horizontal dossier lines on mobile
- Convert standards and evidence data into readable vertical rows

### Mastery Making

- Present the seven stages as a continuous vertical process
- Keep stage numbers visible while removing desktop coordinate decoration
- Ensure each step image and text can be understood without interaction

### Mastery Creations

- Use a compact category navigation and single-column product browsing
- Preserve real product imagery with stable proportions
- Product detail pages prioritize title, primary image, essential metadata, gallery, and inquiry action
- Appointment and bespoke flows use full-width form controls and clear progress without side-by-side fields

### News

- Use a single-column article list with stable portrait media and concise metadata
- Article detail keeps the centered editorial identity but reduces empty vertical space
- Previous and next article navigation remains visible and thumb-friendly

### Golf, Contact, And Forms

- Use single-column forms with labels above controls
- Keep validation messages next to the relevant field
- Prevent fixed actions or external widgets from covering submit controls
- Maintain disabled Golf behavior when the CMS feature flag is off

### Legal Pages

- Use a narrow reading measure, clear heading hierarchy, and compact table/list handling
- Long business terms, addresses, and URLs wrap within the viewport

## Implementation Boundaries

- Prefer responsive changes inside existing components and shared layout primitives
- Create a shared mobile token layer only where it removes repeated values or fixes a cross-page behavior
- Do not change CMS schemas, public API shapes, route paths, SEO metadata, or desktop content order
- Do not replace existing image assets unless a current asset cannot represent the subject correctly on mobile
- Keep desktop styles visually unchanged unless a shared bug requires a narrowly scoped correction

## Verification

- Add regression coverage for shared mobile navigation, stable media frames, and known overflow risks
- Run all existing Node tests, lint, TypeScript checks, and the production build
- Audit every included KO and EN route at 375px and 430px
- Check horizontal overflow, content overlap, clipped text, fixed/sticky obstruction, broken media, and unreachable controls
- Capture representative screenshots for each page family and compare desktop pages for unintended regressions
- Rebuild locally and smoke-test navigation, forms, carousels, and article/product detail transitions

## Deployment

- Commit only source, tests, and approved design documentation
- Leave `output/`, `outputs/`, and `tmp/` untracked
- Push `codex/spring-boot-cms-migration`
- Rebuild production `next` and `nginx` services
- Verify production routes, containers, and public responses without modifying CMS content
