import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";

export const HomeClosingCta = () => {
  return (
    <section className="bg-[#C45C26] py-16 text-white sm:py-20">
      <div className={cn("mx-auto max-w-7xl text-center", STOREFRONT_H_PADDING)}>
        <h2 className="font-serif text-3xl tracking-tight sm:text-5xl">Bring the room home.</h2>
        <p className="mx-auto mt-4 max-w-md text-sm text-white/85">
          Catalog on Shop. Space in the Gold showroom. Answers in the chat. Start with a category or a sofa.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="bg-[#1A1714] text-white hover:bg-black">
            <Link href="/shop">Open the shop</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-white/50 bg-transparent text-white hover:bg-white/15 hover:text-white"
          >
            <Link href="/shop?sort=price-desc">See featured pieces</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
