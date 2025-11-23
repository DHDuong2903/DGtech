"use client";

import { useState } from "react";
import Image from "next/image";

interface UserAvatarProps {
  clerkId: string;
  username?: string;
  imageUrl?: string;
  size?: number;
}

export const UserAvatar = ({ clerkId, username, imageUrl, size = 48 }: UserAvatarProps) => {
  const [imageError, setImageError] = useState(false);

  // Get initials from username or clerkId
  const getInitials = () => {
    if (username) {
      return username.charAt(0).toUpperCase();
    }
    return clerkId.charAt(0).toUpperCase();
  };

  // Generate a consistent color based on clerkId
  const getColorFromId = (id: string) => {
    const colors = [
      "bg-orange-100 text-orange-600",
      "bg-blue-100 text-blue-600",
      "bg-green-100 text-green-600",
      "bg-purple-100 text-purple-600",
      "bg-pink-100 text-pink-600",
      "bg-indigo-100 text-indigo-600",
    ];

    // Use first character of clerkId to determine color
    const index = id.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // If image URL exists and no error, show image
  if (imageUrl && !imageError) {
    return (
      <div className="shrink-0">
        <Image
          src={imageUrl}
          alt={username || "User"}
          width={size}
          height={size}
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
          onError={() => setImageError(true)}
          unoptimized
        />
      </div>
    );
  }

  // Fallback to initials
  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 ${getColorFromId(clerkId)}`}
      style={{ width: size, height: size }}
    >
      <span className="font-semibold" style={{ fontSize: size / 2.5 }}>
        {getInitials()}
      </span>
    </div>
  );
};
