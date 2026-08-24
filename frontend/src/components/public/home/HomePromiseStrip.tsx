import { CreditCard, MapPinned, Truck } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { STOREFRONT_H_PADDING } from "@/src/constant";

const PROMISES = [
  {
    icon: Truck,
    accent: "bg-[#C45C26]",
    title: "Zone shipping",
    body: "Rates by province, standard or express, with a free-ship threshold you can actually quote.",
  },
  {
    icon: CreditCard,
    accent: "bg-[#3D5A4C]",
    title: "COD or VietQR",
    body: "Pay at the door, or transfer with a SePay QR and an order code that matches the webhook.",
  },
  {
    icon: MapPinned,
    accent: "bg-[#1E2A38]",
    title: "Ha Dong showroom",
    body: "Furniture you can sit with in 3D first — then we ship it to the address on file.",
  },
] as const;

export const HomePromiseStrip = () => {
  return (
    <section className="bg-background py-16 sm:py-20">
      <div className={cn("mx-auto max-w-7xl", STOREFRONT_H_PADDING)}>
        <p className="text-[11px] font-semibold tracking-[0.22em] text-orange-600 uppercase">Buying here</p>
        <h2 className="mt-2 font-serif text-3xl tracking-tight sm:text-4xl">Built for how Vietnam actually pays.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {PROMISES.map((item) => (
            <article key={item.title} className="rounded-2xl border border-border bg-card p-6">
              <span className={cn("mb-4 inline-flex size-10 items-center justify-center rounded-lg text-white", item.accent)}>
                <item.icon className="size-5" />
              </span>
              <h3 className="text-lg font-medium">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
