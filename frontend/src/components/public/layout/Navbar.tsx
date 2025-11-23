"use client";

import { ShoppingCart, Package } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useAuth } from "@/src/hooks";
import { useCartStore } from "@/src/stores";

const Navbar = () => {
  const { isAdmin, isLoading } = useAuth();
  const { cart, fetchCart } = useCartStore();
  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    // Chỉ fetch cart khi user đã đăng nhập
    if (isLoaded && isSignedIn) {
      fetchCart();
    }
  }, [fetchCart, isLoaded, isSignedIn]);

  return (
    <div className="px-10 h-18 flex items-center border-b border-gray-200">
      {/* Logo */}
      <Link href="/" className="flex items-end">
        <span className="font-bold text-4xl bg-linear-to-r bg-clip-text from-orange-600 to-orange-400 text-transparent">
          DG
        </span>
        <span className="text-2xl font-medium">tech</span>
      </Link>

      {/* Right navbar */}
      <div className="flex items-center justify-between gap-2 md:gap-6 ml-auto">
        {/* Navigation pages */}
        <ul className="flex items-center space-x-4">
          <Link
            href="/"
            className="text-md border-b-3 border-transparent hover:border-orange-500 cursor-pointer duration-300 transform ease-in-out"
          >
            Trang chủ
          </Link>
          <Link
            href="/shop"
            className="text-md border-b-3 border-transparent hover:border-orange-500 cursor-pointer duration-300 transform ease-in-out"
          >
            Sản phẩm
          </Link>

          {/* Chỉ hiển thị Admin link cho user có role = 'admin' */}
          {!isLoading && isAdmin && (
            <Link
              href="/admin"
              className="text-md border-b-3 border-transparent hover:border-orange-500 cursor-pointer duration-300 transform ease-in-out"
            >
              Admin
            </Link>
          )}
        </ul>
        {/* Search */}
        <div className="items-center hidden lg:block w-80">
          <Input placeholder="Search products" />
        </div>

        {/* Orders - Only show when signed in */}
        {isSignedIn && (
          <Link
            href="/orders"
            className="flex items-center gap-2 border-b-3 border-transparent hover:border-orange-500 cursor-pointer duration-300 transform ease-in-out"
          >
            <Package size={20} />
            <span className="text-md hidden md:inline">Đơn hàng</span>
          </Link>
        )}

        {/* Cart */}
        <Link
          href="/cart"
          className="flex items-center gap-2 border-b-3 border-transparent hover:border-orange-500 cursor-pointer duration-300 transform ease-in-out"
        >
          <div className="relative">
            <ShoppingCart size={20} />
            {isSignedIn && cart?.items && cart.items.length > 0 && (
              <span className="w-4 h-4 rounded-full absolute -top-2 -right-2 bg-orange-500 text-white text-xs flex items-center justify-center">
                {cart.items.length}
              </span>
            )}
          </div>
          <span className="text-md hidden md:inline">Giỏ hàng</span>
        </Link>
        {/* Login */}
        <SignedOut>
          <SignInButton mode="modal">
            <Button className="cursor-pointer">Đăng nhập</Button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </div>
  );
};

export default Navbar;
