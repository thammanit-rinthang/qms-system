# Messages Folder Rules

This folder owns localization content only.

## i18n Rules

- No hardcoded strings in UI when translations exist.
- Keep translations synchronized between Thai and English.
- Preserve clear key naming and domain grouping.
- Do not place runtime logic here.

## Failure Conditions

- Non-translation content is added.
- Thai and English keys drift out of sync.
