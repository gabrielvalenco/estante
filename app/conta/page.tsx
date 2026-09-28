import type { Metadata } from "next";

import { AccountForm } from "@/components/account-form";

export const metadata: Metadata = { title: "Configurações" };

export default function AccountPage() {
  return (
    <div className="container-page animate-fade-up pt-10 sm:pt-14">
      <AccountForm />
    </div>
  );
}
