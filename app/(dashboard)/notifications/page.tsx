import type { Metadata } from "next";
import { Suspense } from "react";
import NotificationsView from "./NotificationsView";

export const metadata: Metadata = { title: "การแจ้งเตือน" };

export default function NotificationsPage() {
  return (
    <Suspense>
      <NotificationsView />
    </Suspense>
  );
}
