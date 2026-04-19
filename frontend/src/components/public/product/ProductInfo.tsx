import { formatCurrency, toMoneyNumber } from "@/src/utils";

interface ProductInfoProps {
  name: string;
  price: number;
  compareAtPrice?: number | null;
  description?: string;
}

export const ProductInfo = ({ name, price, compareAtPrice, description }: ProductInfoProps) => {
  const sale = toMoneyNumber(price);
  const list = toMoneyNumber(compareAtPrice);
  const saleOk = Number.isFinite(sale) ? sale : 0;
  const showStrike = Number.isFinite(list) && list > saleOk;

  return (
    <div className="flex flex-col">
      <div>
        <h1 className="text-foreground mb-2 break-words text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
          {name}
        </h1>
      </div>

      <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
        <span className="text-primary text-2xl font-bold tracking-tight sm:text-3xl">
          {formatCurrency(saleOk)}
        </span>
        {showStrike && (
          <span className="text-muted-foreground text-base line-through decoration-muted-foreground/50 sm:text-lg">
            {formatCurrency(list)}
          </span>
        )}
      </div>

      {description && (
        <div className="mt-1">
          <h3 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
            Description
          </h3>
          <p className="text-muted-foreground break-words text-sm leading-relaxed whitespace-pre-wrap">
            {description}
          </p>
        </div>
      )}
    </div>
  );
};
