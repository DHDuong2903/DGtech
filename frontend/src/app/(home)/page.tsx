import { Slideshow } from "../../components/public/home/Slideshow";
import { FeaturedCategories } from "../../components/public/home/FeaturedCategories";
import { FeaturedProducts } from "../../components/public/home/FeaturedProducts";
import { OnSaleProducts } from "../../components/public/home/OnSaleProducts";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Slideshow />

      {/* Featured Categories Section */}
      <FeaturedCategories />

      {/* Featured Products Section */}
      <FeaturedProducts />

      {/* On Sale Products Section */}
      <OnSaleProducts />
    </div>
  );
}
