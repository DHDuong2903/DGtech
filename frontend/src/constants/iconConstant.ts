// Category Icon Mappings
export const CATEGORY_ICONS: Record<string, string> = {
  phone: '📱',
  điện_thoại: '📱',
  mobile: '📱',
  
  laptop: '💻',
  máy_tính: '💻',
  computer: '💻',
  
  watch: '⌚',
  đồng_hồ: '⌚',
  
  headphone: '🎧',
  tai_nghe: '🎧',
  earphone: '🎧',
  
  tablet: '📱',
  máy_tính_bảng: '📱',
  
  camera: '📷',
  máy_ảnh: '📷',
  
  speaker: '🔊',
  loa: '🔊',
  
  keyboard: '⌨️',
  bàn_phím: '⌨️',
  
  mouse: '🖱️',
  chuột: '🖱️',
  
  monitor: '🖥️',
  màn_hình: '🖥️',
  
  default: '🏷️',
} as const;

// Helper function to get icon
export const getCategoryIcon = (categoryName: string): string => {
  const normalizedName = categoryName.toLowerCase().replace(/\s+/g, '_');
  
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (normalizedName.includes(key)) {
      return icon;
    }
  }
  
  return CATEGORY_ICONS.default;
};
