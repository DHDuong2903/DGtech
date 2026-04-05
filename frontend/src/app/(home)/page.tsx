import { Slideshows } from "../../components/public/home/Slideshows";
import { FeaturedCategories } from "../../components/public/home/FeaturedCategories";
import { FeaturedProducts } from "../../components/public/home/FeaturedProducts";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Slideshows />

      {/* Featured Categories Section */}
      <FeaturedCategories />

      {/* Featured Products Section */}
      <FeaturedProducts />
    </div>
  );
}
