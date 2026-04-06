"use client";

import Link from "next/link";
import { ChevronDown, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { useCategoryStore } from "@/src/stores";
import { cn } from "@/src/lib/utils";

const navUnderline =
  "group relative inline-flex items-center gap-1.5 pb-1 text-sm text-foreground/80 transition-colors hover:text-foreground " +
  "after:pointer-events-none after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 " +
  "after:rounded-full after:bg-orange-500 after:transition-transform after:duration-300 after:ease-[cubic-bezier(0.22,1,0.36,1)] " +
  "hover:after:scale-x-100";

const menuItemClass =
  "relative flex w-full cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none " +
  "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground";

export const NavbarCategories = () => {
  const { categories, loading } = useCategoryStore();
  const [open, setOpen] = useState(false);
  const [hoverMenus, setHoverMenus] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover)");
    const apply = () => setHoverMenus(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <li
      className="relative"
      onMouseEnter={() => hoverMenus && setOpen(true)}
      onMouseLeave={() => hoverMenus && setOpen(false)}
    >
      <button
        type="button"
        className={cn(navUnderline, "cursor-pointer border-0 bg-transparent px-0 font-inherit")}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          if (!hoverMenus) setOpen((v) => !v);
        }}
      >
        <Tag className="h-4 w-4 shrink-0 opacity-80 group-hover:opacity-100" aria-hidden />
        <span className="hidden sm:inline">Categories</span>
        <ChevronDown
          className={cn(
            "hidden h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-200 sm:inline",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 pt-1" role="menu" aria-label="Product categories">
          <div className="min-w-40 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
            {loading ? (
              <div className="text-muted-foreground px-2 py-2 text-sm">Loading…</div>
            ) : categories.length === 0 ? (
              <div className="text-muted-foreground px-2 py-2 text-sm">No categories</div>
            ) : (
              categories.map((category) => (
                <Link
                  key={category.categoryId}
                  href={`/shop?category=${category.categoryId}`}
                  role="menuitem"
                  className={menuItemClass}
                  onClick={() => setOpen(false)}
                >
                  <span className="line-clamp-2 text-left">{category.name}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </li>
  );
};
