# Legacy Import

This repo now includes a one-time legacy import flow for `DAR`, `CAR`, `KPI`, and `KPI Monthly`.

## Scope

- Imports one Excel workbook with separate sheets per module.
- Supports `dry-run` validation before writing.
- Supports `upsert` when unique keys already exist.
- Treats imported data as historical snapshot data.
- Does not trigger normal workflow side effects such as email/token generation.

## Commands

Generate a template workbook:

```powershell
npm run import:legacy:template
```

Custom output path:

```powershell
npx tsx scripts/generate-legacy-import-template.ts .\legacy-import-template.xlsx
```

Validate a workbook without writing:

```powershell
npx tsx scripts/import-legacy-qms.ts --file=.\legacy-import.xlsx --dry-run
```

Import all modules:

```powershell
npx tsx scripts/import-legacy-qms.ts --file=.\legacy-import.xlsx
```

Import selected modules only:

```powershell
npx tsx scripts/import-legacy-qms.ts --file=.\legacy-import.xlsx --modules=dar,kpi
```

Update existing records by unique key:

```powershell
npx tsx scripts/import-legacy-qms.ts --file=.\legacy-import.xlsx --upsert
```

## Unique Keys

- `DAR`: `darNo`
- `CAR`: `carNo`
- `KPI`: `department + yearly`
- `KPI Monthly`: `department + yearly + month`

## Sheet Rules

- `DAR`
  One row per DAR item. Repeat `darNo` for the same request.
- `CAR`
  One row per CAR. If `reCar=true`, set `reCarRefNo` to the referenced `carNo`.
- `KPI`
  One row per KPI objective. Repeat `department` and `yearly` for the same KPI.
- `KPI Monthly`
  One row per monthly detail. Repeat rows if one detail has multiple corrective actions.

## Notes

- `KPI Monthly` depends on KPI master/objectives already existing in the database or in the same import run.
- Department and user references are stored as legacy snapshot values when no live Auth Center mapping exists.
- This flow is intended for backfill/migration, not for normal daily transaction entry.
