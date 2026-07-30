# QMS Shared Features Status

Updated: 2026-07-03

## Shared Capabilities

| Capability | Status | Notes |
|---|---|---|
| Footer naming / label config | Implemented | QMS central config page and service are active. DAR print, Audit Appointment print, Audit Plan print, and DAR/CAR/KPI/KPI Monthly/Document Control/Audit Appointment exports now read naming from central config. |
| Document number config | Implemented | DAR, CAR, Audit Appointment, Audit Plan, and Document Control use central document-number format config. |
| Approval attachments | Implemented | DAR, CAR, KPI Annual, and KPI Monthly approval/reject flows support attachment upload. |
| Email attachments | Implemented | DAR, CAR, KPI Monthly, Audit, and Announcement mail flows attach SharePoint-backed files where implemented in module flow. |
| Summary export naming | Implemented for active routes | DAR, CAR, KPI Annual, KPI Monthly, Document Control, and Audit Appointment summary exports use config-backed worksheet/file naming. |
| By-id export / print naming | Implemented where surface exists | DAR, Audit Appointment, and Audit Plan print surfaces now use central label/prefix. Other modules still have no standalone print route in the current repo. |

## Module Matrix

| Module | Footer / Naming | Approval Attachments | Summary Export | By-ID / Print Surface | Email Attachments | Status |
|---|---|---|---|---|---|---|
| DAR | Implemented | Implemented | Implemented | Implemented | Implemented | Complete for current repo surface |
| CAR | Implemented on export/config path | Implemented | Implemented | No active print/PDF surface found | Implemented | Complete for current repo surface |
| KPI Annual | Implemented on export/config path | Implemented | Implemented | No active print/PDF surface found | Covered by current mail/export flow | Complete for current repo surface |
| KPI Monthly | Implemented on export/config path | Implemented | Implemented | No active print/PDF surface found | Implemented | Complete for current repo surface |
| Document Control | Implemented | N/A | Implemented | No dedicated print/PDF surface found | N/A | Complete for current repo surface |
| Audit Appointment | Implemented | N/A | Implemented | Config-driven print surface implemented | Implemented in notify/sign flow | Complete for current repo surface |
| Audit Plan | Implemented on numbering/print path | N/A | No active export route found in current repo | Config-driven print surface implemented | Related sign/report flow exists | Complete for current repo surface |
| Auditor | Central config key is used as related naming source for appointment export and audit print sections | N/A | Indirect only | Consumed by audit print sections | Implemented in current mail flow | Complete for current repo surface |
| Announcement | Not part of footer config today | N/A | No export surface | N/A | Implemented | Complete for current repo surface |

## Remaining Real Gaps

- `Audit Plan` still lacks a standalone summary export route even though its print surface is now active.
- `Auditor` is intentionally a related naming source today and still has no independent export route.
- `audit-logs/export` is still a generic IT export and does not use central document naming.
- Some page-level UI labels remain static by design and are not part of the document naming system.

## Verification

- `npx tsc --noEmit`
- `npm run lint`
- `npm run check:api`
- `npm test`
