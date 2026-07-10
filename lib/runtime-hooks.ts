import { logger } from "@/lib/logger";

const HOOKS_FLAG = "__qms_runtime_hooks_registered__";

type GlobalWithRuntimeHooks = typeof globalThis & {
  [HOOKS_FLAG]?: boolean;
};

export function registerRuntimeHooks(): void {
  const g = globalThis as GlobalWithRuntimeHooks;
  if (g[HOOKS_FLAG]) return;
  g[HOOKS_FLAG] = true;

  process.on("uncaughtException", (error) => {
    logger.error("uncaughtException", error);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("unhandledRejection", reason);
  });

  logger.info("runtime hooks registered");
}
