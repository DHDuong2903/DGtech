"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";
import { useUserRank } from "@/src/hooks";
import {
  isGoldRank,
  SHOWROOM_GOLD_REQUIRED_TOAST,
  SHOWROOM_SIGN_IN_REQUIRED_TOAST,
} from "@/src/lib/showroomAccess";

export const HomeShowroomBand = () => {
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const { rank } = useUserRank();
  const metadataRankRaw = user?.publicMetadata?.rank;
  const metadataRank =
    typeof metadataRankRaw === "string" && metadataRankRaw.trim().length > 0 ? metadataRankRaw.trim() : null;

  const openShowroom = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!isSignedIn) {
      toast.error(SHOWROOM_SIGN_IN_REQUIRED_TOAST);
      return;
    }
    if (!isGoldRank(rank, metadataRank)) {
      toast.error(SHOWROOM_GOLD_REQUIRED_TOAST);
      return;
    }
    router.push("/showroom-3d");
  };

  return (
    <section className="bg-[#15241C] py-16 text-[#E8F0EA] sm:py-20">
      <div className={cn("mx-auto grid max-w-7xl items-center gap-10 md:grid-cols-2", STOREFRONT_H_PADDING)}>
        <div>
          <p className="text-[11px] font-semibold tracking-[0.22em] text-[#C4A35A] uppercase">Gold showroom</p>
          <h2 className="mt-3 font-serif text-3xl tracking-tight sm:text-5xl">
            Drop a sofa into the room before it drops into your cart.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/70">
            Gold members walk a 3D scene, snap pieces to category slots, tint fabrics, and save the layout. It is a
            buying tool, not a spinning widget.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              type="button"
              size="lg"
              className="bg-[#C4A35A] text-[#15241C] hover:bg-[#d4b56c]"
              onClick={openShowroom}
            >
              Enter showroom
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-[#E8F0EA] hover:bg-white/10 hover:text-white">
              <Link href="/membership">How Gold works</Link>
            </Button>
          </div>
        </div>
        <div className="relative min-h-[280px] overflow-hidden rounded-2xl border border-white/10 bg-[#1C3328] p-6">
          <div className="absolute -right-8 -top-8 size-40 rounded-full bg-[#C45C26]/40 blur-2xl" />
          <div className="absolute bottom-6 left-8 size-32 rounded-full bg-[#C4A35A]/30 blur-2xl" />
          <p className="relative font-serif text-6xl leading-none text-white/15">3D</p>
          <ul className="relative mt-10 space-y-3 text-sm">
            <li className="border-l-2 border-[#C4A35A] pl-3">Slots respect category — a lamp does not sit on a sofa mark.</li>
            <li className="border-l-2 border-[#C45C26] pl-3">Color variants tint the model in the browser.</li>
            <li className="border-l-2 border-white/40 pl-3">Layouts persist so the room is waiting next visit.</li>
          </ul>
        </div>
      </div>
    </section>
  );
};
