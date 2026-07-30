
import { requireAuth } from "@/lib/auth";
import { SessionExpiredError } from "@/lib/errors";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let session: Awaited<ReturnType<typeof requireAuth>>;
  try {
    session = await requireAuth();
  } catch (error) {
    if (error instanceof SessionExpiredError) {
      redirect(`/api/auth/signout?callbackUrl=${encodeURIComponent("/auth/login")}`);
    }
    throw error;
  }

  return (
    <DashboardShell
      role={session.user.role}
      name={session.user.name ?? ""}
      email={session.user.email ?? ""}
      image={session.user.image}
    >
      {children}
    </DashboardShell>
  );
}
