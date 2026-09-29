import type { Metadata } from "next";

import { NotificationsPage } from "@/components/notifications";

export const metadata: Metadata = { title: "Notificações", robots: { index: false } };

export default function Page() {
  return (
    <div className="container-page animate-fade-up pt-10 sm:pt-14">
      <NotificationsPage />
    </div>
  );
}
