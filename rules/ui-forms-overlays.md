# UI Forms And Overlays

## Purpose
This file defines the standard behavior for forms shown in overlays such as dialogs, drawers, and sheets.

## Required Behavior
- Desktop and tablet form overlays must use a centered modal dialog when the task is focused data entry or editing.
- Mobile form overlays must use a bottom sheet, not a centered modal.
- Mobile bottom sheets must open from the bottom, keep a visible drag handle, and reserve space for a sticky action area at the bottom.
- Multi-section create/edit forms should prefer a large desktop dialog width before introducing nested steps.
- Overlay forms must keep their primary and secondary actions fixed in the footer while the form body scrolls.

## Component Rules
- Use Radix `Dialog` for desktop modal forms.
- Use Radix `Sheet` with `side="bottom"` for mobile form overlays.
- Do not render the same create/edit workflow as a centered modal on phones.
- Do not place critical submit/cancel actions inside long scrolling content on mobile.

## UX Notes
- If the form has more than one logical section, increase desktop width first.
- Use one shared form body across desktop and mobile containers where possible so validation and behavior stay identical.
- If supporting both desktop and mobile in one component, switch container by breakpoint while preserving the same form state.
