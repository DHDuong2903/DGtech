"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";
import { usersApi } from "@/src/apis/userApi";
import type { UserRank } from "@/src/types";
import { UserRankCard } from "@/src/components/public/rank/UserRankCard";
import { PageContentLoader } from "@/src/components/ui/page-content-loader";

export default function MembershipPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [rank, setRank] = useState<UserRank | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    let active = true;
    if (!isLoaded || !isSignedIn) return () => void (active = false);

    usersApi
      .getMyRank()
      .then((data) => {
        if (active) setRank(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || loading) {
    return <PageContentLoader className="bg-background" minHeightClass="min-h-[40vh]" />;
  }

  return (
    <div className="bg-background">
      <div className={cn("mx-auto max-w-7xl py-4", STOREFRONT_H_PADDING)}>
        {rank ? (
          <UserRankCard rank={rank} />
        ) : (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Could not load membership data right now. Please try again.
          </div>
        )}
      </div>
    </div>
  );
}
