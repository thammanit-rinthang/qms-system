# QMS UX/UI Rulebook

This folder extracts the active UX/UI rules from `qms-system` into reusable documentation for other internal systems.

The rules here are grounded in the live repository sources:

- `app/globals.css`
- `components/ui/*`
- `components/common/*`
- `rules/ui-forms-overlays.md`
- `docs/UI-AUDIT.md`
- `.agents/skills/design-system/SKILL.md`

## File Map

- `01-foundations.md`
  Core design tokens, brand colors, typography, radius, shadows, spacing, motion, and global CSS utilities.
- `02-layout-navigation.md`
  Page containers, headers, breadcrumbs, cards, sidebar/topbar surfaces, and list/detail structure.
- `03-components.md`
  Canonical rules for Button, Badge, Card, Dialog, Sheet, Table, Input, Textarea, Select, Skeleton, Pagination, and shared action buttons.
- `04-forms-overlays.md`
  Form composition, labels, validation, overlay behavior, responsive modal/sheet rules, and submit/footer behavior.
- `05-states-feedback.md`
  Loading, empty, error, confirmation, notification, and attachment/download behavior.
- `06-module-patterns-and-exceptions.md`
  Cross-module reusable patterns, approved/conditional exceptions, drift found by the audit, and rollout guidance for other apps.
- `07-text-card-standard.md`
  Standard Text Card specification (shadow, border, rounded-2xl) with copy-paste implementations for HTML/CSS, Tailwind v3/v4, React/Next.js, and Vue 3.

## How To Use In Another System

1. Read `01-foundations.md`.
2. Read `02-layout-navigation.md`.
3. Read only the component and pattern files relevant to the screen you are building.
4. Treat `06-module-patterns-and-exceptions.md` as the adoption-risk file before claiming full compliance.

## Scope Boundary

This rulebook includes:

- Canonical design-system rules
- Shared component behavior
- Shared enterprise module patterns
- Overlay/mobile behavior
- Known exceptions and current repo drift

This rulebook does not include:

- Business logic rules
- API architecture rules
- Domain workflow approvals

