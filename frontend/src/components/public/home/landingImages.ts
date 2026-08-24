const LANDING_IMAGES = {
  cabinet: "/landing/cabinet.jpg",
  carpet: "/landing/carpet.jpg",
  chair: "/landing/chair.jpg",
  lamp: "/landing/lamp.jpg",
  shelf: "/landing/shelf.jpg",
  sofa: "/landing/sofa.jpg",
  table: "/landing/table.jpg",
  room: "/landing/room.jpg",
} as const;

const BY_INDEX = [
  LANDING_IMAGES.cabinet,
  LANDING_IMAGES.carpet,
  LANDING_IMAGES.chair,
  LANDING_IMAGES.lamp,
  LANDING_IMAGES.shelf,
  LANDING_IMAGES.sofa,
] as const;

const KEYWORD_MAP: Array<{ test: RegExp; src: string }> = [
  { test: /cabinet|tủ|tu |kitchen|bếp/i, src: LANDING_IMAGES.cabinet },
  { test: /carpet|rug|thảm|tham/i, src: LANDING_IMAGES.carpet },
  { test: /chair|ghế|ghe/i, src: LANDING_IMAGES.chair },
  { test: /lamp|light|đèn|den /i, src: LANDING_IMAGES.lamp },
  { test: /shelf|shelves|kệ|ke /i, src: LANDING_IMAGES.shelf },
  { test: /sofa|couch|ghế sofa/i, src: LANDING_IMAGES.sofa },
  { test: /table|bàn|ban /i, src: LANDING_IMAGES.table },
];

export function landingImageByIndex(index: number): string {
  return BY_INDEX[((index % BY_INDEX.length) + BY_INDEX.length) % BY_INDEX.length];
}

export function landingImageForCategory(name: string, index: number): string {
  const hit = KEYWORD_MAP.find((row) => row.test.test(name));
  return hit?.src ?? landingImageByIndex(index);
}

export function landingImageForProduct(name: string, categoryName: string | undefined, index: number): string {
  const fromProduct = KEYWORD_MAP.find((row) => row.test.test(name));
  if (fromProduct) return fromProduct.src;
  if (categoryName) return landingImageForCategory(categoryName, index);
  return landingImageByIndex(index);
}
