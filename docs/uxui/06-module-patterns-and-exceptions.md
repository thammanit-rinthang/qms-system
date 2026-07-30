# Module Patterns, Exceptions, And Adoption Notes

## 1. Reusable Cross-Module Patterns

The audit identified these as the clearest candidates for reuse across systems:

- `PageHeader`
- `FilterBar`
- `Pagination`
- `ResponsiveFormOverlay`
- `ActionIconButton`
- `ActionPillButton`
- `EmptyState`
- `ErrorComponent`
- shared `Button`, `Badge`, `Card`, `Dialog`, `Sheet`, `Table`, `Input`, `Textarea`, `Skeleton`

Also useful:

- `module-colors.ts` for module-specific visual markers
- `card-premium`, `th-pro`, `card-section-title`, `hover-lift`

## 2. Current Approved Or Conditionally Acceptable Exceptions

These came directly from the audit recommendations and should be documented whenever reused:

### Exception A: Multi-Step Wizard Inside Dialog

Condition:

- acceptable only when the form has 4 or more truly distinct logical steps
- example rationale from Audit Appointment form

Guardrails:

- keep footer actions fixed
- keep step state clear
- do not use nested steps just to compensate for poor information architecture

### Exception B: Desktop-Only Gantt View

Condition:

- acceptable for session-plan style scheduling UI where mobile parity is not practical

Guardrails:

- document that the feature is desktop-oriented
- still provide readable access to supporting data where possible

### Exception C: MR Signature / Complex Signature Dialog

Condition:

- acceptable when the workflow includes signature pad complexity that makes mobile bottom-sheet parity impractical

Guardrails:

- keep the exception narrow
- do not use it as a blanket excuse for all dialogs

## 3. Current Drift Found In This Repo

These are important because another system should not copy them as if they were standard.

### Drift 1: DaisyUI `base-*` Tokens Mixed With Tailwind `slate-*`

Examples flagged:

- `border-base-300`
- `border-base-200`
- `divide-base-200`
- `hover:bg-base-50`

Standard direction:

- normalize to `slate-*` token language where the design system has already moved there

### Drift 2: Missing PageHeader On Some Pages

Flagged:

- KPI list
- KPI monthly
- Announcements
- Notifications

Standard direction:

- all main pages should use `PageHeader`

### Drift 3: Raw `<button>` Instead Of Shared Button

Impact:

- inconsistent focus ring
- inconsistent sizing
- inconsistent keyboard affordance

### Drift 4: Hardcoded Hex Colors Outside Shared Tokens

Flagged in:

- Announcements
- Notifications
- some bespoke headers

Standard direction:

- use `primary` token or shared component variants

### Drift 5: Repeated Local Utility Implementations

Examples:

- repeated `formatDate` helpers
- repeated local `INPUT_CLASS`
- repeated tab logic

Standard direction:

- extract and centralize

## 4. Module-Specific Visual Pattern Notes

### CAR

- inline contextual action prompt is acceptable when immediate response is the main next step
- timeline pattern is useful but should be abstracted before reuse

### DAR

- document-centric review layout is acceptable
- rich attachment pattern is a strong candidate for reuse

### KPI

- dense data visualization patterns such as `OkRatioBar` are useful shared candidates
- if using icon-in-badge style, make it a deliberate system-wide rule

### Audit

- tabbed detail shells are reusable
- appointment/session-plan complexity justifies some richer layouts

### Announcements

- accent bar list items can be reused as a display-board pattern, not as a default CRUD list

### Notifications

- unread border/highlight patterns are acceptable for notification centers
- should not become the default selected-row treatment everywhere

## 5. Adoption Rules For Another Internal System

### What To Copy Directly

- token definitions and semantic palette
- shared UI component variants
- overlay behavior
- page shell structure
- filter/list/pagination pattern
- loading/empty/error states

### What To Productize Before Reuse

- tab component
- date formatting utility
- attachment upload abstraction
- approval timeline abstraction
- module color abstraction

### What Not To Copy Blindly

- raw page-specific custom headers
- ad hoc color bars without documented purpose
- raw buttons
- mixed DaisyUI/Tailwind token language
- module-local imports that should be shared

## 6. Enterprise Rollout Checklist

Before calling another system compliant with this rulebook:

1. Verify page shells use shared container widths.
2. Verify every main page has `PageHeader`.
3. Verify shared Button/Badge/Card/Input components are actually used.
4. Verify mobile forms use bottom sheet.
5. Verify loading/empty/error states exist and are styled.
6. Verify no direct expiring SharePoint URLs are used.
7. Verify there is no uncontrolled mix of `base-*` and `slate-*` token families.
8. Verify exceptions are documented explicitly.

## 7. Recommended Future Packaging

If this is promoted into a multi-app standard, split it into:

- theme tokens package
- shared UI components package
- shared enterprise patterns package
- app-specific module visual maps

That turns the current repo from “good reference implementation” into an actual design system.

