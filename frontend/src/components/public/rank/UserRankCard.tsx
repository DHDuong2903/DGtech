"use client";

import { cn } from "@/src/lib/utils";
import type { UserRank } from "@/src/types";
import { formatCurrency, formatNumber } from "@/src/utils/formatUtil";
import { Sparkles } from "lucide-react";

function rankLabel(rank: UserRank["currentRank"] | UserRank["nextRank"]) {
  if (rank === "gold") return "Gold";
  if (rank === "silver") return "Silver";
  return "Bronze";
}

function rankBadgeClass(rank: UserRank["currentRank"] | UserRank["nextRank"]) {
  if (rank === "gold") {
    return "font-normal border-yellow-500/40 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-200";
  }
  if (rank === "silver") {
    return "font-normal border-slate-400/30 bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-200";
  }
  return "font-normal border-orange-700/20 bg-orange-50 text-orange-800 dark:bg-orange-950/30 dark:text-orange-200";
}

function nextRankBenefits(nextRank: UserRank["nextRank"]) {
  if (nextRank === "silver") {
    return [
      "More products become eligible for member discount campaigns.",
      "Voucher privileges improve for your member segment.",
      "Higher chance to unlock free shipping at qualifying order values.",
    ];
  }
  if (nextRank === "gold") {
    return [
      "Stronger discount and voucher value than Silver.",
      "Earlier access to selected promotional campaigns.",
      "Priority access for upcoming advanced member features.",
    ];
  }
  return [];
}

export function UserRankCard({ rank }: { rank: UserRank }) {
  const current = rankLabel(rank.currentRank);
  const next = rank.nextRank ? rankLabel(rank.nextRank) : null;
  const benefits = nextRankBenefits(rank.nextRank);

  return (
    <section className="mb-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Membership Tier</h2>
        <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs", rankBadgeClass(rank.currentRank))}>
          {current}
        </span>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Your membership tier is based on successful order value, adjusted by canceled-order count.
      </p>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress to next tier</span>
          <span>{rank.progressPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-orange-500 transition-[width] duration-300" style={{ width: `${rank.progressPercent}%` }} />
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Current score: <span className="font-semibold text-foreground">{formatNumber(rank.score)}</span>
      </p>

      {next ? (
        <>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            You are getting close to <span className="font-semibold text-foreground">{next}</span>. Add around{" "}
            <span className="font-semibold text-foreground">{formatCurrency(rank.remainingToNext)}</span> in successful orders to reach the next milestone.
          </p>

          <div className="mt-4 rounded-xl border border-orange-200/70 bg-orange-50/80 p-3.5 dark:border-orange-900/50 dark:bg-orange-950/30">
            <p className="text-sm font-semibold text-foreground">What you can expect at {next}:</p>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2 text-foreground/90">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" aria-hidden />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-50/70 p-3 text-sm text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
          You are already at the highest tier. New premium benefits will be prioritized here.
        </div>
      )}
    </section>
  );
}
