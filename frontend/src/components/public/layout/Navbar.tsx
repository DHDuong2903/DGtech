"use client";

import Image from "next/image";
import { Home, LayoutDashboard, LogIn, MapPin, Package, Search, ShoppingCart, Store } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { useAuth } from "@/src/hooks";
import { useCartStore } from "@/src/stores";
import type { Cart } from "@/src/types";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";
import { ThemeToggle } from "@/src/components/ThemeToggle";
import { NavbarCategories } from "@/src/components/public/layout/NavbarCategories";

const navUnderline =
  "group relative inline-flex items-center gap-1.5 text-sm text-foreground/80 transition-colors hover:text-foreground " +
  "after:pointer-events-none after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 " +
  "after:rounded-full after:bg-orange-500 after:transition-transform after:duration-300 after:ease-[cubic-bezier(0.22,1,0.36,1)] " +
  "hover:after:scale-x-100";

function NavLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn(navUnderline, className)}>
      {children}
    </Link>
  );
}

function cartQuantityTotal(cart: Cart) {
  if (!cart.items?.length) return 0;
  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

export const Navbar = () => {
  const router = useRouter();
  const { isAdmin, isLoading } = useAuth();
  const { cart, fetchCart } = useCartStore();
  const { isSignedIn, isLoaded } = useUser();
  const [navSearch, setNavSearch] = useState("");
  const cartQty = cart ? cartQuantityTotal(cart) : 0;

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchCart();
    }
  }, [fetchCart, isLoaded, isSignedIn]);

  const handleNavSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = navSearch.trim();
    if (q) {
      router.push(`/shop?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/shop");
    }
  };

  return (
    <header className="bg-background border-b border-border">
      <div className={cn("mx-auto flex h-16 max-w-7xl items-center", STOREFRONT_H_PADDING)}>
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="DGTech home">
          <Image
            src="/logodg.png"
            alt=""
            width={44}
            height={44}
            className="h-9 w-9 object-contain sm:h-10 sm:w-10"
            priority
          />
          <span className="bg-linear-to-r from-orange-600 to-orange-400 bg-clip-text text-xl font-bold text-transparent sm:text-2xl">
            DGtech
          </span>
        </Link>

        <div className="ml-auto flex items-center justify-end gap-2 md:gap-4">
          <ul className="flex items-center gap-3 md:gap-4">
            <li>
              <NavLink href="/">
                <Home className="h-4 w-4 shrink-0 opacity-80 group-hover:opacity-100" />
                <span className="hidden sm:inline">Home</span>
              </NavLink>
            </li>
            <li>
              <NavLink href="/shop">
                <Store className="h-4 w-4 shrink-0 opacity-80 group-hover:opacity-100" />
                <span className="hidden sm:inline">Shop</span>
              </NavLink>
            </li>
            <NavbarCategories />
            {!isLoading && isAdmin && (
              <li>
                <NavLink href="/admin">
                  <LayoutDashboard className="h-4 w-4 shrink-0 opacity-80 group-hover:opacity-100" />
                  <span className="hidden sm:inline">Admin</span>
                </NavLink>
              </li>
            )}
          </ul>

          <form
            onSubmit={handleNavSearch}
            className="relative hidden w-56 items-center lg:flex xl:w-64"
            role="search"
            aria-label="Search catalog"
          >
            <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              placeholder="Search furniture…"
              className="h-8 pl-8 text-sm"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              aria-label="Search furniture"
            />
          </form>

          {isSignedIn && (
            <NavLink href="/orders">
              <Package className="h-4 w-4 shrink-0 opacity-80 group-hover:opacity-100" />
              <span className="hidden sm:inline">Orders</span>
            </NavLink>
          )}

          <NavLink href="/cart">
            <div className="relative">
              <ShoppingCart className="h-4 w-4 shrink-0 opacity-80 group-hover:opacity-100" />
              {isSignedIn && cartQty > 0 && (
                <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-medium text-white tabular-nums">
                  {cartQty}
                </span>
              )}
            </div>
            <span className="hidden sm:inline">Cart</span>
          </NavLink>

          <ThemeToggle />

          <SignedOut>
            <SignInButton mode="modal">
              <Button type="button" size="sm" className="cursor-pointer">
                <LogIn />
                Sign in
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton>
              <UserButton.MenuItems>
                <UserButton.Action label="manageAccount" />
                <UserButton.Link
                  label="Manage addresses"
                  href="/addresses"
                  labelIcon={<MapPin className="h-4 w-4" aria-hidden />}
                />
                <UserButton.Action label="signOut" />
              </UserButton.MenuItems>
            </UserButton>
          </SignedIn>
        </div>
      </div>
    </header>
  );
};
