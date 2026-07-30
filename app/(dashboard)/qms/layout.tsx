import { requireAuth } from "@/lib/auth";

export default async function QmsLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  return <>{children}</>;
}
