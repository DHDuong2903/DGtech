import { Slideshow } from "../../components/public/Slideshow";
import { FeaturedCategories } from "../../components/public/FeaturedCategories";
import { FeaturedProducts } from "../../components/public/FeaturedProducts";
import { OnSaleProducts } from "../../components/public/OnSaleProducts";

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
