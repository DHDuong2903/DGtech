import { Slideshows } from "../../components/public/home/Slideshows";
import { FeaturedProducts } from "../../components/public/home/FeaturedProducts";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Slideshows />

      <FeaturedProducts />
    </div>
  );
}
