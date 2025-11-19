import {
  Smartphone,
  Laptop,
  Watch,
  Tablet,
  Camera,
  Volume2,
  Keyboard,
  Mouse,
  Monitor,
  Tag,
  Headphones,
  type LucideIcon,
} from "lucide-react";

// Category Icon Mappings
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  headphone: Headphones,
  tai_nghe: Headphones,
  earphone: Headphones,

  phone: Smartphone,
  điện_thoại: Smartphone,
  mobile: Smartphone,

  laptop: Laptop,
  máy_tính: Laptop,
  computer: Laptop,

  watch: Watch,
  đồng_hồ: Watch,

  tablet: Tablet,
  máy_tính_bảng: Tablet,

  camera: Camera,
  máy_ảnh: Camera,

  speaker: Volume2,
  loa: Volume2,

  keyboard: Keyboard,
  bàn_phím: Keyboard,

  mouse: Mouse,
  chuột: Mouse,

  monitor: Monitor,
  màn_hình: Monitor,

  default: Tag,
} as const;

// Helper function to get icon
export const getCategoryIcon = (categoryName: string): LucideIcon => {
  const normalizedName = categoryName.toLowerCase().replace(/\s+/g, "_");

  // Check for longer/specific matches first to avoid false positives
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (key === "default") continue;
    if (normalizedName.includes(key)) {
      return icon;
    }
  }

  return CATEGORY_ICONS.default;
};
