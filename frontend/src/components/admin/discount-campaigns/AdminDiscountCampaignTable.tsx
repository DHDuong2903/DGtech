"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { MoreHorizontal, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import type { DiscountCampaign, UserTierOption } from "@/src/types/discountCampaignType";
import { cn } from "@/src/lib/utils";

const TIER_STYLES: Record<UserTierOption, string> = {
  bronze: "font-normal border-orange-700/20 bg-orange-50 text-orange-800 dark:bg-orange-950/30 dark:text-orange-200",
  silver: "font-normal border-slate-400/30 bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-200",
  gold: "font-normal border-yellow-500/40 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-200",
};

const METADATA_PRICING_MODE = "pricingMode";

function campaignPricingMode(c: DiscountCampaign): "PRICE_RULE" | "PRICE_LIST" {
  if (c.pricingMode === "price_list") return "PRICE_LIST";
  if (c.pricingMode === "price_rule") return "PRICE_RULE";
  const m = c.metadata?.[METADATA_PRICING_MODE];
  if (m === "price_list") return "PRICE_LIST";
  if (m === "price_rule") return "PRICE_RULE";
  if (
    c.variantPrices.length > 0 &&
    c.discountValue === 0 &&
    (c.discountKind === "PERCENT" || c.discountKind === null)
  ) {
    return "PRICE_LIST";
  }
  return "PRICE_RULE";
}

function TierBadges({ tiers }: { tiers: UserTierOption[] }) {
  if (!tiers.length) {
    return (
      <Badge variant="outline" className="font-normal">
        All tiers
      </Badge>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {tiers.map((t) => (
        <Badge key={t} variant="outline" className={cn("capitalize", TIER_STYLES[t])}>
          {t}
        </Badge>
      ))}
    </div>
  );
}

function discountLabel(c: DiscountCampaign) {
  if (campaignPricingMode(c) === "PRICE_LIST") {
    const n = c.variantPriceCount ?? c.variantPrices.length;
    return n ? `${n} fixed price${n === 1 ? "" : "s"}` : "Price list";
  }
  if (c.discountKind === "PERCENT") return `${c.discountValue}%`;
  if (c.discountKind === "FIXED_AMOUNT") return `${c.discountValue.toFixed(2)} off`;
  return "";
}

function formatPeriod(startIso: string, endIso: string | null): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "numeric", year: "numeric" };
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return "";
  const startStr = start.toLocaleDateString("vi-VN", opts);
  if (!endIso) return startStr;
  const end = new Date(endIso);
  if (Number.isNaN(end.getTime())) return startStr;
  return `${startStr} - ${end.toLocaleDateString("vi-VN", opts)}`;
}

export function createAdminDiscountCampaignColumns(handlers: {
  onDelete: (row: DiscountCampaign) => void;
  onSetActive: (row: DiscountCampaign) => void;
  onDeactivate: (row: DiscountCampaign) => void;
}): ColumnDef<DiscountCampaign>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: "pricingMode",
      header: "Type",
      cell: ({ row }) => {
        const mode = campaignPricingMode(row.original);
        return (
          <Badge variant="secondary" className="font-mono text-xs font-normal">
            {mode}
          </Badge>
        );
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => <span className="tabular-nums">{row.original.priority}</span>,
    },
    {
      id: "discount",
      header: "Discount",
      cell: ({ row }) => <span>{discountLabel(row.original)}</span>,
    },
    {
      id: "tiers",
      header: "Tiers",
      cell: ({ row }) => <TierBadges tiers={row.original.targetTiers} />,
    },
    {
      id: "period",
      header: "Period",
      cell: ({ row }) => (
        <span className="text-muted-foreground max-w-[240px] text-sm leading-snug">
          {formatPeriod(row.original.startsAt, row.original.endsAt)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) =>
        row.original.isEnabled ? (
          <Badge variant="success" className="font-normal">
            Active
          </Badge>
        ) : (
          <Badge variant="secondary" className="font-normal">
            Inactive
          </Badge>
        ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Open menu">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/admin/discount-campaigns/${c.campaignId}`} className="flex cursor-pointer items-center gap-2">
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                {!c.isEnabled ? (
                  <DropdownMenuItem onClick={() => handlers.onSetActive(c)}>
                    <Power className="h-4 w-4" />
                    Set active
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => handlers.onDeactivate(c)}>
                    <PowerOff className="h-4 w-4" />
                    Deactivate
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => handlers.onDelete(c)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}
