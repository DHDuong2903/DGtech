import { cn } from "@/src/lib/utils";

const SWATCHES = [
  { name: "Ink oak", hex: "#2C1810" },
  { name: "Fired clay", hex: "#C45C26" },
  { name: "Sage plaster", hex: "#3D5A4C" },
  { name: "Night slate", hex: "#1E2A38" },
  { name: "Honey timber", hex: "#8A6A3B" },
  { name: "Linen", hex: "#E8E0D4" },
] as const;

export const HomePaletteStrip = () => {
  return (
    <section className="border-y border-border bg-[#F3EEE6] dark:bg-[#161412]" aria-label="Interior palette">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {SWATCHES.map((swatch) => (
          <div key={swatch.name} className="flex items-end gap-3 px-4 py-5 sm:px-5">
            <span
              className="size-10 shrink-0 rounded-sm shadow-inner ring-1 ring-black/10"
              style={{ backgroundColor: swatch.hex }}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">{swatch.hex}</p>
              <p className={cn("truncate text-sm font-medium text-foreground")}>{swatch.name}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
