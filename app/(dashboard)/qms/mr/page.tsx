
import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ForbiddenError } from "@/errors/customErrors";
import { UserService } from "@/services/userService";
import MrManagementClient from "@/components/qms/MrManagementClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set MR",
};

const userService = new UserService();

export default async function QmsMrPage() {
  let session;
  try {
    session = await requireRole("QMS", "IT", "MR");
  } catch (e) {
    if (e instanceof ForbiddenError) redirect("/unauthorized?reason=insufficient_role");
    throw e;
  }

  const users = await userService.getAllUsers(session.user.accessToken);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <MrManagementClient initialUsers={users} />
    </div>
  );
}
