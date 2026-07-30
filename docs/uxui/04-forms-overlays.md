# Forms And Overlays

## 1. Overlay Rules

Canonical source:

- `rules/ui-forms-overlays.md`
- `components/common/ResponsiveFormOverlay.tsx`

## 2. Required Overlay Behavior

1. Desktop and tablet form overlays use centered modal dialog for focused create/edit tasks.
2. Mobile form overlays use bottom sheet, not centered modal.
3. Mobile bottom sheets open from the bottom.
4. Mobile bottom sheets keep a visible drag handle.
5. Mobile bottom sheets reserve space for sticky bottom actions.
6. Footer actions remain fixed while the body scrolls.
7. Multi-section create/edit forms increase width before introducing nested steps.

## 3. Component Mapping

| Device / Pattern | Component |
| --- | --- |
| Desktop modal form | Radix `Dialog` |
| Mobile form overlay | Radix `Sheet` with `side="bottom"` |
| Shared responsive container | `ResponsiveFormOverlay` |

## 4. Prohibitions

1. Do not render the same create/edit workflow as a centered modal on phones.
2. Do not place critical submit/cancel actions deep inside long scroll content on mobile.
3. Do not create separate business logic implementations for desktop and mobile form containers when one shared body can be used.

## 5. Form Structure

Standard composition:

1. Header
2. Description if needed
3. Body sections
4. Sticky footer

Desktop header classes used in shared overlay:

- `border-b border-slate-100 px-6 py-4 text-left`

Mobile header classes used in shared overlay:

- `border-b border-slate-100 px-4 pb-4 pt-2 text-left`

Body shell:

- `flex-1 overflow-y-auto px-6 py-6`

Footer shell:

- desktop: `border-t border-slate-100 bg-white px-6 py-4`
- mobile: `border-t border-slate-100 bg-white px-4 py-4`

## 6. Labels And Controls

Rules:

1. Inputs and textareas should have labels.
2. Related fields should be grouped into visual sections.
3. Validation text should appear near the field.
4. Dense enterprise forms may use `text-xs text-slate-500` labels.
5. General-form labels may use `text-sm font-medium text-slate-700`.

## 7. Input Standard

Audit baseline shared input pattern:

```tsx
w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm
transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30
```

Current shared `Input`/`Textarea` implementation adds:

- neutral tinted background before focus
- primary border on focus
- transition colors

Adoption guidance:

- if porting to another system, keep one consistent input formula
- prefer the current shared component implementation over ad hoc clones

## 8. Form Submit Pattern

From the design rule:

- submit button must disable when pending
- submit button must show loading feedback
- cancel button should use `variant="outline"`
- confirm action should sit on the right

Implementation guidance:

1. Keep exactly one dominant submit action.
2. If the form has secondary destructive action, separate it visually from primary submit.
3. If pending, block duplicate submission.

## 9. Multi-Section Forms

Default rule:

- widen the desktop modal first
- avoid nested steps unless the form contains truly distinct logical phases

Examples where nested or multi-step is conditionally acceptable are documented in the exceptions file.

## 10. Shared Form State Across Breakpoints

When supporting both desktop and mobile:

- switch only the container
- preserve the same form state
- preserve the same validation logic
- preserve the same submit/cancel semantics

## 11. Attachment And File Fields

Guideline from repo patterns:

- attachment flows should follow a standardized upload/list/delete pattern
- richer attachment UX from DAR is preferable to bare file inputs when the file flow is central
- if using a simple file input, keep it visually wrapped in standard card/form styling

