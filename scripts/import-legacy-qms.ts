import path from "path";
import { LegacyImportService, type ImportModule } from "@/lib/legacy-import-service";

type CliOptions = {
  filePath: string;
  modules?: ImportModule[];
  dryRun: boolean;
  upsert: boolean;
};

function parseModules(value: string) {
  const modules = value
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  const allowed = new Set<ImportModule>(["dar", "car", "kpi", "kpi-monthly"]);
  for (const moduleName of modules) {
    if (!allowed.has(moduleName as ImportModule)) {
      throw new Error(`Unsupported module "${moduleName}"`);
    }
  }

  return modules as ImportModule[];
}

function parseArgs(argv: string[]): CliOptions {
  let filePath = "";
  let modules: ImportModule[] | undefined;
  let dryRun = false;
  let upsert = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--") && !filePath) {
      filePath = arg;
      continue;
    }
    if (arg.startsWith("--file=")) {
      filePath = arg.slice("--file=".length);
      continue;
    }
    if (arg === "--file") {
      filePath = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (arg.startsWith("--modules=")) {
      modules = parseModules(arg.slice("--modules=".length));
      continue;
    }
    if (arg === "--modules") {
      modules = parseModules(argv[index + 1] ?? "");
      index += 1;
      continue;
    }
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--upsert") {
      upsert = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  if (!filePath) {
    throw new Error("Missing required --file <path-to-workbook.xlsx>");
  }

  return {
    filePath: path.resolve(filePath),
    modules,
    dryRun,
    upsert,
  };
}

function printHelp() {
  console.log(`
Usage:
  npm run import:legacy -- --file .\\legacy-import.xlsx [--modules dar,car,kpi,kpi-monthly] [--dry-run] [--upsert]

Options:
  --file       Excel workbook path
  --modules    Comma-separated modules. Default: all modules
  --dry-run    Validate and summarize without writing to database
  --upsert     Update existing records when unique key already exists
  --help       Show this help
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const service = new LegacyImportService();
  const result = await service.importWorkbook(options);

  console.log(`Workbook: ${result.workbook}`);
  console.log(`Mode: ${result.dryRun ? "dry-run" : "write"}`);

  for (const [module, counters] of Object.entries(result.modules)) {
    console.log(
      `${module}: created=${counters.created} updated=${counters.updated} skipped=${counters.skipped} errors=${counters.errors}`
    );
  }

  if (result.errors.length > 0) {
    console.log("\nErrors:");
    for (const error of result.errors) {
      console.log(`- [${error.module}] ${error.sheet} row ${error.row || "-"} key "${error.key || "-"}": ${error.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("\nImport finished without validation errors.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
