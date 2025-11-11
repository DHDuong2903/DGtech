import { HeroSlideshow } from "../../components/public/HeroSlideshow";

export default function Home() {
  return (
    <div className="min-h-screen">
      <HeroSlideshow />
      
      {/* Featured Categories Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
          Danh Mục Sản Phẩm
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Placeholder for categories - will connect to API later */}
          <div className="group cursor-pointer">
            <div className="bg-gray-100 rounded-lg p-8 text-center hover:bg-orange-50 transition-colors">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="font-semibold text-gray-900">Điện Thoại</h3>
            </div>
          </div>
          <div className="group cursor-pointer">
            <div className="bg-gray-100 rounded-lg p-8 text-center hover:bg-orange-50 transition-colors">
              <div className="text-4xl mb-4">💻</div>
              <h3 className="font-semibold text-gray-900">Laptop</h3>
            </div>
          </div>
          <div className="group cursor-pointer">
            <div className="bg-gray-100 rounded-lg p-8 text-center hover:bg-orange-50 transition-colors">
              <div className="text-4xl mb-4">⌚</div>
              <h3 className="font-semibold text-gray-900">Đồng Hồ</h3>
            </div>
          </div>
          <div className="group cursor-pointer">
            <div className="bg-gray-100 rounded-lg p-8 text-center hover:bg-orange-50 transition-colors">
              <div className="text-4xl mb-4">🎧</div>
              <h3 className="font-semibold text-gray-900">Phụ Kiện</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section - Placeholder */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Sản Phẩm Nổi Bật
            </h2>
            <a
              href="/shop"
              className="text-orange-600 hover:text-orange-700 font-semibold"
            >
              Xem tất cả →
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Placeholder - will connect to API later */}
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden group cursor-pointer"
              >
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-400 text-4xl">🖼️</span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
                    Tên Sản Phẩm {i}
                  </h3>
                  <p className="text-orange-600 font-bold">15.990.000 ₫</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
