import { MessageCircle } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";

const PROMPTS = [
  "Free ship from how much?",
  "Show oak dining tables",
  "What vouchers can I use?",
];

export const HomeConciergeBand = () => {
  return (
    <section className="bg-[#E7EDE8] py-16 dark:bg-[#1A2420] sm:py-20">
      <div className={cn("mx-auto max-w-7xl", STOREFRONT_H_PADDING)}>
        <div className="grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] text-orange-700 uppercase dark:text-orange-400">
              Shop assistant
            </p>
            <h2 className="mt-2 font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
              Ask the corner widget. It reads the store, not a generic script.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Shipping thresholds, live catalog, membership vouchers, and your own orders — the assistant is grounded
              in DGTech data. It will not invent a returns policy we do not have.
            </p>
          </div>
          <div className="rounded-2xl border border-[#3D5A4C]/20 bg-background p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-medium">
              <MessageCircle className="size-4 text-orange-600" />
              Try asking
            </div>
            <ul className="space-y-2">
              {PROMPTS.map((prompt) => (
                <li
                  key={prompt}
                  className="rounded-xl bg-[#F3EEE6] px-4 py-3 text-sm text-foreground dark:bg-[#24302C]"
                >
                  “{prompt}”
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">Open the chat button at the bottom of any page.</p>
          </div>
        </div>
      </div>
    </section>
  );
};
