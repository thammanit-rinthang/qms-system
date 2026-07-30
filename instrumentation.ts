export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerRuntimeHooks } = await import("@/lib/runtime-hooks");
    registerRuntimeHooks();
  }
}
