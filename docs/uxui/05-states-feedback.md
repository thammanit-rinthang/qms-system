# States And Feedback

## 1. Loading

### Standard

- use `Skeleton`
- mirror final layout
- avoid spinner-only blank screens

Design rule example:

```tsx
<div className="space-y-4">
  <Skeleton className="h-10 w-full rounded-xl" />
  <Skeleton className="h-32 w-full rounded-xl" />
</div>
```

Audit guidance:

- table pages should use skeleton rows that resemble the real table
- cards should use skeleton blocks with matching spacing

## 2. Empty State

### Baseline Skill Pattern

```tsx
<div className="flex flex-col items-center justify-center py-16 text-slate-400">
  <IconName className="mb-3 h-10 w-10 opacity-40" />
  <p className="text-sm">ไม่พบข้อมูล</p>
</div>
```

### Shared Rich EmptyState Component

`components/common/EmptyState.tsx` adds:

- floating illustration container
- primary title
- neutral description
- optional CTA

Rules:

1. Empty state must explain what is absent.
2. If the user can act, provide CTA.
3. Keep the layout centered and calm.

## 3. Error State

### Baseline Skill Pattern

```tsx
<div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600">
  {errorMessage}
</div>
```

### Shared Rich ErrorComponent

`components/common/ErrorComponent.tsx` adds:

- prominent icon
- short title
- explanatory message
- optional retry button

Rules:

1. Error state should be actionable when retry is possible.
2. Message must be plain language.
3. Avoid unstyled red text floating alone in the page.

## 4. Confirmation

Use `ConfirmModal` for:

- delete confirm
- cancel confirm
- state transition confirm
- non-trivial irreversible actions

Rules:

- use danger styling only when the action is genuinely destructive
- keep message explicit about impact

## 5. Status Communication

Primary mechanisms:

- `Badge`
- page-level alerts
- contextual prompts
- row highlights when appropriate

Guidance:

- badge color must reflect actual semantic state
- do not invert badge style randomly between modules unless the exception is documented

## 6. Notifications And Attention Patterns

Observed patterns in repo:

- unread left-border highlight in Notifications
- accent bars in Announcements
- contextual inline prompt banners in CAR

Adoption rule:

- use these only when they improve scanning of a repeated list
- document the pattern if adopted as a system standard

## 7. Download Behavior

Non-negotiable rule:

- do not call `window.open(spDownloadUrl)` directly

Use:

- `/api/sharepoint/get-file?itemId=...`
- or module-specific download endpoints such as `/api/document-controls/{id}/download-latest`

Reason:

- SharePoint URLs expire
- app endpoint guarantees fresh URL resolution and centralizes access control

## 8. Retry Patterns

Preferred retry action:

- `Button variant="outline"`

The UI audit specifically flagged screens that had error text without retry affordance.

## 9. Accessibility And Focus

Inherited from shared components:

- focus ring on Button
- focus ring on action buttons
- visible close buttons for overlays

Rules:

1. Do not replace shared controls with raw elements that lose focus behavior.
2. Icon-only actions must have `aria-label`.
3. Close buttons must remain keyboard reachable.

