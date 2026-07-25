import { Color, Material, Mesh, MeshBasicMaterial, MeshLambertMaterial, MeshPhongMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Object3D } from "three";

const COLOR_LABEL_TO_HEX: Record<string, string> = {
  black: "#1f1f1f",
  white: "#f4f4f5",
  gray: "#9ca3af",
  grey: "#9ca3af",
  blue: "#3b82f6",
  green: "#22c55e",
  brown: "#8b5e3c",
  beige: "#e8d5b7",
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  pink: "#ec4899",
  purple: "#a855f7",
  navy: "#1e3a8a",
  cream: "#f5f0e6",
  ivory: "#fffff0",
  charcoal: "#36454f",
  oak: "#c4a574",
  walnut: "#5d4037",
  natural: "#d2b48c",
};

const BODY_NAME_HINT = /body|fabric|main|seat|cushion|upholstery|frame|wood|surface|color|colour|shell|panel/i;

function normalizeLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

/** Read Color / color from variant attributes only. */
export function getVariantColorLabel(attributes?: Record<string, string> | null): string | null {
  if (!attributes || typeof attributes !== "object") return null;
  const entry = Object.entries(attributes).find(([key]) => normalizeLabel(key) === "color" || normalizeLabel(key) === "colour");
  const value = entry?.[1];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveColorLabelToHex(label: string | null | undefined): string | null {
  if (!label) return null;
  const trimmed = label.trim();
  if (!trimmed) return null;

  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) {
    return trimmed.length === 4
      ? `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
      : trimmed.slice(0, 7);
  }

  if (/^rgb(a)?\(/i.test(trimmed)) {
    try {
      return `#${new Color(trimmed).getHexString()}`;
    } catch {
      return null;
    }
  }

  return COLOR_LABEL_TO_HEX[normalizeLabel(trimmed)] ?? null;
}

export function resolveVariantColorTintHex(attributes?: Record<string, string> | null): string | null {
  return resolveColorLabelToHex(getVariantColorLabel(attributes));
}

export type ProductColorOption = {
  label: string;
  hex: string | null;
};

/** Unique Color values from product variants (Color / colour only). */
export function listProductColorOptions(
  variants?: Array<{ attributes?: Record<string, string> | null; isDefault?: boolean }> | null,
): ProductColorOption[] {
  if (!Array.isArray(variants) || variants.length === 0) return [];

  const seen = new Set<string>();
  const options: ProductColorOption[] = [];

  for (const variant of variants) {
    if (variant?.isDefault) continue;
    const label = getVariantColorLabel(variant.attributes ?? null);
    if (!label) continue;
    const key = normalizeLabel(label);
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({
      label,
      hex: resolveColorLabelToHex(label),
    });
  }

  return options;
}

function isTintableMaterial(material: Material): material is MeshStandardMaterial | MeshPhysicalMaterial | MeshLambertMaterial | MeshPhongMaterial | MeshBasicMaterial {
  return (
    material instanceof MeshStandardMaterial ||
    material instanceof MeshPhysicalMaterial ||
    material instanceof MeshLambertMaterial ||
    material instanceof MeshPhongMaterial ||
    material instanceof MeshBasicMaterial
  );
}

function shouldSkipMesh(mesh: Mesh) {
  const name = mesh.name || "";
  if (/^SLOT_/i.test(name) || /^CAM_/i.test(name)) return true;
  if (/glass|lens|light|bulb|emissive/i.test(name)) return true;
  return false;
}

function meshLooksLikeBody(mesh: Mesh) {
  const meshName = mesh.name || "";
  if (BODY_NAME_HINT.test(meshName)) return true;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return materials.some((mat) => mat?.name && BODY_NAME_HINT.test(mat.name));
}

function tintMaterial(material: Material, tint: Color): Material {
  if (!isTintableMaterial(material)) return material;
  if (material.transparent && material.opacity < 0.35) return material;

  const next = material.clone();
  next.color.copy(tint);
  next.needsUpdate = true;
  return next;
}

/**
 * Recolor a cloned GLB scene from a Color variant hex.
 * Prefers meshes/materials named like body/fabric; otherwise tints all opaque materials.
 */
export function applyVariantColorTintToScene(scene: Object3D, tintHex: string | null | undefined) {
  if (!tintHex) return;

  let tint: Color;
  try {
    tint = new Color(tintHex);
  } catch {
    return;
  }

  const meshes: Mesh[] = [];
  scene.traverse((child) => {
    if (child instanceof Mesh && !shouldSkipMesh(child)) {
      meshes.push(child);
    }
  });

  const preferred = meshes.filter(meshLooksLikeBody);
  const targets = preferred.length > 0 ? preferred : meshes;

  for (const mesh of targets) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const nextMaterials = materials.map((mat) => tintMaterial(mat, tint));
    mesh.material = nextMaterials.length === 1 ? nextMaterials[0] : nextMaterials;
  }
}
