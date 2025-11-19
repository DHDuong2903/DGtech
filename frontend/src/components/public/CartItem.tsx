"use client";

import { useCartStore } from "../../stores";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { formatCurrency } from "../../utils";

import { CartItem as CartItemType } from "../../types";

interface CartItemProps {
  item: CartItemType;
}

export const CartItem = ({ item }: CartItemProps) => {
  const { loading, updateCartItem, removeFromCart } = useCartStore();

  const handleUpdateQuantity = async (newQuantity: number) => {
    if (newQuantity < 1) return;
    await updateCartItem(item.cartItemId, newQuantity);
  };

  const handleRemoveItem = async () => {
    await removeFromCart(item.cartItemId);
  };

  const subtotal = item.product.price * item.quantity;

  return (
    <div className="flex gap-4 border rounded-lg p-4 md:p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Product Image */}
      <div className="relative w-28 h-28 md:w-36 md:h-36 shrink-0 bg-gray-50 rounded-lg overflow-hidden">
        <Image
          src={item.product.imageUrl || "/images/placeholder.png"}
          alt={item.product.name}
          fill
          className="object-contain p-2"
        />
      </div>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base md:text-lg mb-1 truncate text-gray-900">{item.product.name}</h3>
            <p className="text-orange-600 font-bold text-lg md:text-xl">{formatCurrency(item.product.price)}</p>
          </div>

          {/* Remove Button (Desktop) */}
          <Button
            size="icon"
            variant="ghost"
            className="hidden md:flex h-10 w-10 hover:bg-red-50"
            onClick={handleRemoveItem}
            disabled={loading}
          >
            <Trash2 className="h-5 w-5 text-red-500" />
          </Button>
        </div>

        {/* Quantity Controls & Subtotal */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 font-medium">Số lượng:</span>
            <div className="flex items-center gap-1 border rounded-lg bg-gray-50">
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 hover:bg-gray-100"
                onClick={() => handleUpdateQuantity(item.quantity - 1)}
                disabled={item.quantity <= 1 || loading}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="font-semibold w-10 text-center">{item.quantity}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 hover:bg-gray-100"
                onClick={() => handleUpdateQuantity(item.quantity + 1)}
                disabled={item.quantity >= item.product.stock || loading}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Subtotal */}
          <div className="text-left sm:text-right">
            <p className="text-xs sm:text-sm text-gray-600">Tạm tính</p>
            <p className="font-bold text-lg sm:text-xl text-orange-600">{formatCurrency(subtotal)}</p>
          </div>
        </div>

        {/* Remove Button (Mobile) */}
        <Button
          size="sm"
          variant="ghost"
          className="md:hidden mt-3 text-red-500 hover:bg-red-50 hover:text-red-600"
          onClick={handleRemoveItem}
          disabled={loading}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Xóa sản phẩm
        </Button>
      </div>
    </div>
  );
};
