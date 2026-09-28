import type { Metadata } from "next";
import { Suspense } from "react";

import { SignInForm } from "@/components/sign-in-form";

export const metadata: Metadata = { title: "Entrar" };

export default function SignInPage() {
  return (
    <div className="container-page flex justify-center pt-16 pb-8 sm:pt-24">
      <Suspense>
        <SignInForm />
      </Suspense>
    </div>
  );
}
