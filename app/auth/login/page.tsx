
import { auth } from "@/lib/auth-node";
import { redirect } from "next/navigation";
import { buildAuthCenterLoginUrl } from "@/lib/auth-center-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
};

/** Only allow same-site relative paths to avoid open-redirects. */
function safeCallbackUrl(raw: string | undefined): string {
  if (!raw) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  const safeCb = safeCallbackUrl(callbackUrl);

  if (session?.user) redirect(safeCb);

  redirect(buildAuthCenterLoginUrl({ state: safeCb }));
}
