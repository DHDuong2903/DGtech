import { Slideshows } from "../../components/public/home/Slideshows";
import { FeaturedProducts } from "../../components/public/home/FeaturedProducts";
import { DiscountProducts } from "../../components/public/home/DiscountProducts";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Slideshows />

      <FeaturedProducts />

      <DiscountProducts />
    </div>
  );
}
