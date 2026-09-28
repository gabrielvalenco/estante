import type { Metadata } from "next";

import { FollowingFeed } from "@/components/following-feed";

export const metadata: Metadata = { title: "Seguindo" };

export default function FollowingPage() {
  return (
    <div className="container-page animate-fade-up pt-10 sm:pt-14">
      <FollowingFeed />
    </div>
  );
}
